const { sequelize, Solicitacao, Emprestimo, livros, usuarios } = require("../models");
const { PRAZO_EMPRESTIMO_DIAS, MAX_RENOVACOES } = require("../config/regras");
const { somarDias } = require("../utils/datas");
const ErroHttp = require("../utils/ErroHttp");

// POST /solicitacoes  (aluno pede emprestimo extra alem do limite)
async function criar(req, res) {
    const { usuario_id, livro_id } = req.body;

    if (!usuario_id || !livro_id) {
        throw new ErroHttp(400, "informe usuario_id e livro_id");
    }

    const livro = await livros.findByPk(livro_id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }

    const solicitacaoExistente = await Solicitacao.findOne({
        where: { usuario_id, livro_id, status: "pendente" }
    });
    if (solicitacaoExistente) {
        throw new ErroHttp(400, "voce ja tem uma solicitacao pendente para esse livro");
    }

    const novaSolicitacao = await Solicitacao.create({
        usuario_id,
        livro_id,
        data_solicitacao: new Date(),
        status: "pendente"
    });

    res.status(201).json({
        message: "solicitacao enviada. aguarde a aprovacao do bibliotecario",
        solicitacao: novaSolicitacao
    });
}

// GET /solicitacoes  (pendentes, mais antigas primeiro)
async function listarPendentes(req, res) {
    const solicitacoes = await Solicitacao.findAll({
        where: { status: "pendente" },
        include: [
            { model: usuarios, attributes: ["nome", "email"] },
            { model: livros, attributes: ["titulo", "autor"] }
        ],
        order: [["data_solicitacao", "ASC"]]
    });
    res.json(solicitacoes);
}

async function buscarPendente(id, transaction) {
    const solicitacao = await Solicitacao.findByPk(id, { transaction, lock: transaction?.LOCK.UPDATE });
    if (!solicitacao) {
        throw new ErroHttp(404, "solicitacao nao encontrada");
    }
    if (solicitacao.status !== "pendente") {
        throw new ErroHttp(400, "essa solicitacao ja foi respondida");
    }
    return solicitacao;
}

// PUT /solicitacoes/:id/aprovar  (cria o emprestimo ignorando o limite normal)
async function aprovar(req, res) {
    const novoEmprestimo = await sequelize.transaction(async (t) => {
        const solicitacao = await buscarPendente(req.params.id, t);

        const livro = await livros.findByPk(solicitacao.livro_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!livro || livro.quantidade_disponivel <= 0) {
            throw new ErroHttp(400, "livro sem exemplares disponiveis. rejeite a solicitacao");
        }

        const jaTemEsseLivro = await Emprestimo.findOne({
            where: { usuario_id: solicitacao.usuario_id, livro_id: solicitacao.livro_id, status: "ativo" },
            transaction: t
        });
        if (jaTemEsseLivro) {
            throw new ErroHttp(400, "o aluno ja esta com um exemplar deste livro");
        }

        const emprestimo = await Emprestimo.create({
            usuario_id: solicitacao.usuario_id,
            livro_id: solicitacao.livro_id,
            data_emprestimo: new Date(),
            data_prevista_devolucao: somarDias(new Date(), PRAZO_EMPRESTIMO_DIAS),
            status: "ativo",
            renovacoes_restantes: MAX_RENOVACOES
        }, { transaction: t });

        await livro.decrement("quantidade_disponivel", { by: 1, transaction: t });
        await solicitacao.update({ status: "aprovada" }, { transaction: t });

        return emprestimo;
    });

    res.json({ message: "solicitacao aprovada e emprestimo criado", emprestimo: novoEmprestimo });
}

// PUT /solicitacoes/:id/rejeitar
async function rejeitar(req, res) {
    const solicitacao = await buscarPendente(req.params.id);
    await solicitacao.update({ status: "rejeitada" });
    res.json({ message: "solicitacao rejeitada" });
}

module.exports = { criar, listarPendentes, aprovar, rejeitar };
