// Rotas antigas, mantidas para nao quebrar nada que ainda as use.
const { usuarios } = require("../models");
const ErroHttp = require("../utils/ErroHttp");

// GET /
function inicio(req, res) {
    res.redirect("/login/index.html");
}

// GET /:nome
async function buscarPorNome(req, res) {
    const encontrados = await usuarios.findAll({ where: { nome: req.params.nome } });
    res.json(encontrados);
}

// PATCH /atualizar/:id  (so altera os campos que vierem no body)
async function atualizar(req, res) {
    const campos = {};
    for (const campo of ["nome", "email", "senha", "tipo"]) {
        if (req.body[campo] !== undefined) campos[campo] = req.body[campo];
    }
    if (Object.keys(campos).length === 0) {
        throw new ErroHttp(400, "nenhum campo para atualizar");
    }

    const [alterados] = await usuarios.update(campos, { where: { id: req.params.id } });
    if (alterados === 0) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }
    res.json({ message: "sucesso ao atualizar os dados do usuario" });
}

// DELETE /deletar/:id
async function deletar(req, res) {
    const removidos = await usuarios.destroy({ where: { id: req.params.id } });
    if (removidos === 0) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }
    res.json({ message: "usuario deletado com sucesso" });
}

module.exports = { inicio, buscarPorNome, atualizar, deletar };
