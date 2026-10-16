const PDFDocument = require("pdfkit");
const { Emprestimo, usuarios, livros } = require("../models");
const { formatarDataBR, formatarDataHoraBR, dataLocalISO } = require("../utils/datas");
const { gerarCSV } = require("../utils/csv");
const { situacaoEmprestimo, foiDevolvidoNoPrazo } = require("../utils/estatisticas");
const ErroHttp = require("../utils/ErroHttp");

// GET /relatorio/emprestimos/pdf
async function emprestimosPdf(req, res) {
    // busca tudo antes de comecar a escrever o PDF: se o banco falhar,
    // ainda da para responder com erro JSON
    const [todosEmprestimos, totalUsuarios, totalLivros, emprestimosAtivos] = await Promise.all([
        Emprestimo.findAll({
            include: [
                { model: usuarios, attributes: ["nome", "email"] },
                { model: livros, attributes: ["titulo", "autor"] }
            ],
            order: [["data_emprestimo", "DESC"]]
        }),
        usuarios.count(),
        livros.count(),
        Emprestimo.count({ where: { status: "ativo" } })
    ]);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="relatorio-emprestimos.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text("Relatório de Empréstimos - Biblioteca Libro", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#555").text(`Gerado em: ${formatarDataHoraBR()}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(13).text("Resumo geral");
    doc.fontSize(11).text(`Total de usuários cadastrados: ${totalUsuarios}`);
    doc.text(`Total de livros no catálogo: ${totalLivros}`);
    doc.text(`Empréstimos ativos no momento: ${emprestimosAtivos}`);
    doc.moveDown(1.5);

    doc.fontSize(13).text("Histórico de empréstimos");
    doc.moveDown(0.5);

    if (todosEmprestimos.length === 0) {
        doc.fontSize(11).text("Nenhum empréstimo registrado ainda.");
    }

    todosEmprestimos.forEach((emp, index) => {
        const nomeUsuario = emp.usuario ? emp.usuario.nome : "(usuário removido)";
        const tituloLivro = emp.livro ? emp.livro.titulo : "(livro removido)";

        doc.fontSize(10).fillColor("#000").text(
            `${index + 1}. ${tituloLivro} — ${nomeUsuario} | ` +
            `Emprestado: ${formatarDataBR(emp.data_emprestimo)} | ` +
            `Previsto: ${formatarDataBR(emp.data_prevista_devolucao)} | ` +
            `Status: ${emp.status}`
        );
    });

    doc.end();
}

// ---------- Planilhas CSV (abrem no Excel / Google Planilhas) ----------

function situacaoTexto(emprestimo, hoje) {
    if (emprestimo.status === "devolvido") {
        const noPrazo = foiDevolvidoNoPrazo(emprestimo);
        return noPrazo === false ? "Devolvido com atraso" : "Devolvido no prazo";
    }
    const { atrasado, diasAtraso, diasRestantes } = situacaoEmprestimo(emprestimo, hoje);
    return atrasado ? `Atrasado (${diasAtraso} dia(s))` : `No prazo (faltam ${diasRestantes} dia(s))`;
}

const PLANILHAS = {
    async emprestimos() {
        const hoje = dataLocalISO();
        const linhas = await Emprestimo.findAll({
            include: [
                { model: usuarios, attributes: ["nome", "email"] },
                { model: livros, attributes: ["titulo", "autor", "categoria"] }
            ],
            order: [["data_emprestimo", "DESC"]]
        });
        return gerarCSV([
            { titulo: "ID", valor: e => e.id },
            { titulo: "Aluno", valor: e => e.usuario?.nome || "(removido)" },
            { titulo: "E-mail", valor: e => e.usuario?.email || "" },
            { titulo: "Livro", valor: e => e.livro?.titulo || "(removido)" },
            { titulo: "Autor", valor: e => e.livro?.autor || "" },
            { titulo: "Categoria", valor: e => e.livro?.categoria || "" },
            { titulo: "Emprestado em", valor: e => formatarDataBR(e.data_emprestimo) },
            { titulo: "Prazo", valor: e => formatarDataBR(e.data_prevista_devolucao) },
            { titulo: "Devolvido em", valor: e => (e.data_devolucao_real ? formatarDataBR(e.data_devolucao_real) : "") },
            { titulo: "Renovações restantes", valor: e => e.renovacoes_restantes },
            { titulo: "Situação", valor: e => situacaoTexto(e, hoje) }
        ], linhas);
    },

    async livros() {
        const linhas = await livros.findAll({ order: [["titulo", "ASC"]] });
        return gerarCSV([
            { titulo: "ID", valor: l => l.id },
            { titulo: "Título", valor: l => l.titulo },
            { titulo: "Autor", valor: l => l.autor },
            { titulo: "ISBN", valor: l => l.isbn },
            { titulo: "Editora", valor: l => l.editora },
            { titulo: "Ano", valor: l => l.ano },
            { titulo: "Categoria", valor: l => l.categoria },
            { titulo: "Exemplares", valor: l => l.quantidade_total },
            { titulo: "Disponíveis", valor: l => l.quantidade_disponivel }
        ], linhas);
    },

    async usuarios() {
        const linhas = await usuarios.findAll({ attributes: ["id", "nome", "email", "tipo"], order: [["nome", "ASC"]] });
        return gerarCSV([
            { titulo: "ID", valor: u => u.id },
            { titulo: "Nome", valor: u => u.nome },
            { titulo: "E-mail", valor: u => u.email },
            { titulo: "Perfil", valor: u => u.tipo }
        ], linhas);
    }
};

// GET /relatorio/:tipo/csv   (tipo = emprestimos | livros | usuarios)
async function planilhaCsv(req, res) {
    const gerar = PLANILHAS[req.params.tipo];
    if (!gerar) {
        throw new ErroHttp(404, "planilha inexistente. use emprestimos, livros ou usuarios");
    }

    const conteudo = await gerar();
    const nomeArquivo = `libro-${req.params.tipo}-${dataLocalISO()}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
    res.send(conteudo);
}

module.exports = { emprestimosPdf, planilhaCsv };
