const PDFDocument = require("pdfkit");
const { Emprestimo, usuarios, livros } = require("../models");
const { formatarDataBR, formatarDataHoraBR } = require("../utils/datas");

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

module.exports = { emprestimosPdf };
