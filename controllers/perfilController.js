// "Minha Conta": resumo de leitura, conquistas, historico e alertas do aluno.
const { usuarios, livros, Emprestimo, Reserva, Avaliacao, Favorito } = require("../models");
const { buscarSuspensaoAtiva } = require("../services/suspensaoService");
const { calcularConquistas } = require("../utils/conquistas");
const { DIAS_AVISO_VENCIMENTO, PRAZO_RETIRADA_RESERVA_HORAS } = require("../config/regras");
const {
    situacaoEmprestimo,
    foiDevolvidoNoPrazo,
    calcularPontualidade,
    categoriaMaisFrequente
} = require("../utils/estatisticas");
const { dataLocalISO, formatarDataBR } = require("../utils/datas");
const ErroHttp = require("../utils/ErroHttp");

const ATRIBUTOS_LIVRO = ["id", "titulo", "autor", "categoria", "capa_url"];

// GET /usuarios/:id/perfil
async function perfil(req, res) {
    const usuario = await usuarios.findByPk(req.params.id, { attributes: { exclude: ["senha"] } });
    if (!usuario) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }

    const [emprestimos, avaliacoes, totalFavoritos, suspensao] = await Promise.all([
        Emprestimo.findAll({
            where: { usuario_id: usuario.id },
            include: [{ model: livros, attributes: ATRIBUTOS_LIVRO }],
            order: [["data_emprestimo", "DESC"]]
        }),
        Avaliacao.findAll({ where: { usuario_id: usuario.id }, attributes: ["livro_id", "nota"] }),
        Favorito.count({ where: { usuario_id: usuario.id } }),
        buscarSuspensaoAtiva(usuario.id)
    ]);

    const hoje = dataLocalISO();
    const notaPorLivro = new Map(avaliacoes.map(a => [a.livro_id, a.nota]));

    const ativos = emprestimos.filter(e => e.status === "ativo");
    const devolvidos = emprestimos.filter(e => e.status === "devolvido");
    const atrasados = ativos.filter(e => situacaoEmprestimo(e, hoje).atrasado);
    const categorias = emprestimos.map(e => e.livro?.categoria).filter(Boolean);

    const proxima = ativos
        .map(e => ({ emprestimo: e, ...situacaoEmprestimo(e, hoje) }))
        .sort((a, b) => a.diasRestantes - b.diasRestantes)[0];

    const resumo = {
        totalEmprestimos: emprestimos.length,
        lidos: devolvidos.length,
        ativos: ativos.length,
        atrasados: atrasados.length,
        devolucoesNoPrazo: devolvidos.filter(e => foiDevolvidoNoPrazo(e) === true).length,
        categoriasDistintas: new Set(categorias.map(c => c.toLowerCase())).size,
        avaliacoes: avaliacoes.length,
        favoritos: totalFavoritos
    };

    res.json({
        usuario,
        resumo: {
            ...resumo,
            pontualidade: calcularPontualidade(emprestimos),
            categoria_favorita: categoriaMaisFrequente(categorias)
        },
        proxima_devolucao: proxima ? {
            emprestimo_id: proxima.emprestimo.id,
            titulo: proxima.emprestimo.livro?.titulo || "livro",
            data: proxima.emprestimo.data_prevista_devolucao,
            dias_restantes: proxima.diasRestantes
        } : null,
        suspensao: suspensao ? {
            motivo: suspensao.motivo,
            data_fim: suspensao.data_fim
        } : null,
        conquistas: calcularConquistas(resumo),
        historico: devolvidos.map(e => ({
            id: e.id,
            livro: e.livro,
            data_emprestimo: e.data_emprestimo,
            data_prevista_devolucao: e.data_prevista_devolucao,
            data_devolucao_real: e.data_devolucao_real,
            no_prazo: foiDevolvidoNoPrazo(e),
            minha_nota: e.livro ? notaPorLivro.get(e.livro.id) || null : null
        }))
    });
}

// GET /usuarios/:id/alertas  -> avisos para o topo da pagina inicial
async function alertas(req, res) {
    const usuarioId = req.params.id;
    const hoje = dataLocalISO();

    const [ativos, reservasDisponiveis, suspensao] = await Promise.all([
        Emprestimo.findAll({
            where: { usuario_id: usuarioId, status: "ativo" },
            include: [{ model: livros, attributes: ["titulo"] }]
        }),
        Reserva.findAll({
            where: { usuario_id: usuarioId, status: "disponivel" },
            include: [{ model: livros, attributes: ["titulo"] }]
        }),
        buscarSuspensaoAtiva(usuarioId)
    ]);

    const lista = [];

    if (suspensao) {
        lista.push({
            tipo: "suspensao",
            nivel: "erro",
            icone: "⛔",
            mensagem: `Sua conta está suspensa até ${formatarDataBR(suspensao.data_fim)}. Nesse período não é possível pegar livros.`
        });
    }

    for (const emp of ativos) {
        const { atrasado, diasAtraso, diasRestantes } = situacaoEmprestimo(emp, hoje);
        const titulo = emp.livro?.titulo || "um livro";

        if (atrasado) {
            lista.push({
                tipo: "atraso",
                nivel: "erro",
                icone: "⚠️",
                mensagem: `"${titulo}" está atrasado há ${diasAtraso} dia(s). Devolva na biblioteca para evitar suspensão.`,
                acao: "emprestimos"
            });
        } else if (diasRestantes <= DIAS_AVISO_VENCIMENTO) {
            const quando = diasRestantes === 0 ? "hoje" : diasRestantes === 1 ? "amanhã" : `em ${diasRestantes} dias`;
            lista.push({
                tipo: "vencendo",
                nivel: "aviso",
                icone: "⏳",
                mensagem: `"${titulo}" vence ${quando}. Renove ou devolva a tempo.`,
                acao: "emprestimos"
            });
        }
    }

    for (const reserva of reservasDisponiveis) {
        const prazo = reserva.data_disponivel
            ? ` Retire até ${formatarDataBR(new Date(new Date(reserva.data_disponivel).getTime() + PRAZO_RETIRADA_RESERVA_HORAS * 3600000))}.`
            : "";
        lista.push({
            tipo: "reserva",
            nivel: "sucesso",
            icone: "🔖",
            mensagem: `Sua reserva de "${reserva.livro?.titulo || "um livro"}" chegou!${prazo}`,
            acao: "reservas"
        });
    }

    res.json(lista);
}

module.exports = { perfil, alertas };
