const { QueryTypes } = require("sequelize");
const { sequelize, Avaliacao, Emprestimo, livros } = require("../models");
const ErroHttp = require("../utils/ErroHttp");

const TAMANHO_MAXIMO_COMENTARIO = 500;

// GET /avaliacoes/medias  -> { [livro_id]: { media, total } } para as estrelas nos cards
async function medias(req, res) {
    const linhas = await sequelize.query(`
        SELECT livro_id, ROUND(AVG(nota)::numeric, 1)::float AS media, COUNT(*)::int AS total
        FROM avaliacoes
        GROUP BY livro_id`, { type: QueryTypes.SELECT });

    const mapa = {};
    for (const linha of linhas) {
        mapa[linha.livro_id] = { media: linha.media, total: linha.total };
    }
    res.json(mapa);
}

// POST /livros/:id/avaliacoes  { usuario_id, nota, comentario }
// Cria ou atualiza a avaliacao do aluno. So avalia quem ja pegou o livro.
async function salvar(req, res) {
    const livro_id = parseInt(req.params.id, 10);
    const usuario_id = parseInt(req.body.usuario_id, 10);
    const nota = parseInt(req.body.nota, 10);
    const comentario = (req.body.comentario || "").trim().slice(0, TAMANHO_MAXIMO_COMENTARIO) || null;

    if (!usuario_id) {
        throw new ErroHttp(400, "informe usuario_id");
    }
    if (!(nota >= 1 && nota <= 5)) {
        throw new ErroHttp(400, "a nota deve ser de 1 a 5");
    }

    const livro = await livros.findByPk(livro_id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }

    const jaPegou = await Emprestimo.count({ where: { usuario_id, livro_id } });
    if (jaPegou === 0) {
        throw new ErroHttp(403, "voce so pode avaliar livros que ja pegou emprestado");
    }

    const existente = await Avaliacao.findOne({ where: { usuario_id, livro_id } });
    if (existente) {
        await existente.update({ nota, comentario, data_avaliacao: new Date() });
        return res.json({ message: "avaliacao atualizada", avaliacao: existente });
    }

    const avaliacao = await Avaliacao.create({ usuario_id, livro_id, nota, comentario });
    res.status(201).json({ message: "obrigado pela avaliacao!", avaliacao });
}

// DELETE /avaliacoes/:id  (o proprio aluno, informado no header usuario-id, ou a biblioteca)
async function excluir(req, res) {
    const avaliacao = await Avaliacao.findByPk(req.params.id);
    if (!avaliacao) {
        throw new ErroHttp(404, "avaliacao nao encontrada");
    }

    const solicitante = String(req.headers["usuario-id"] || req.body?.usuario_id || "");
    if (solicitante !== String(avaliacao.usuario_id)) {
        throw new ErroHttp(403, "voce so pode apagar a sua propria avaliacao");
    }

    await avaliacao.destroy();
    res.json({ message: "avaliacao removida" });
}

module.exports = { medias, salvar, excluir };
