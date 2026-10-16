const { Favorito, livros, usuarios } = require("../models");
const ErroHttp = require("../utils/ErroHttp");

// GET /usuarios/:id/favoritos
async function listar(req, res) {
    const favoritos = await Favorito.findAll({
        where: { usuario_id: req.params.id },
        include: [{ model: livros }],
        order: [["data_adicao", "DESC"]]
    });
    res.json(favoritos.filter(f => f.livro));
}

// POST /usuarios/:id/favoritos  { livro_id }
async function adicionar(req, res) {
    const usuario_id = parseInt(req.params.id, 10);
    const livro_id = parseInt(req.body.livro_id, 10);

    if (!livro_id) {
        throw new ErroHttp(400, "informe livro_id");
    }

    const [usuario, livro] = await Promise.all([usuarios.findByPk(usuario_id), livros.findByPk(livro_id)]);
    if (!usuario) throw new ErroHttp(404, "usuario nao encontrado");
    if (!livro) throw new ErroHttp(404, "livro nao encontrado");

    const [favorito, criado] = await Favorito.findOrCreate({
        where: { usuario_id, livro_id },
        defaults: { data_adicao: new Date() }
    });

    res.status(criado ? 201 : 200).json({ message: "livro adicionado em Quero ler", favorito });
}

// DELETE /usuarios/:id/favoritos/:livroId
async function remover(req, res) {
    const removidos = await Favorito.destroy({
        where: { usuario_id: req.params.id, livro_id: req.params.livroId }
    });
    if (removidos === 0) {
        throw new ErroHttp(404, "esse livro nao esta na sua lista");
    }
    res.json({ message: "livro removido de Quero ler" });
}

module.exports = { listar, adicionar, remover };
