const { usuarios, Emprestimo } = require("../models");
const { buscarSuspensaoAtiva } = require("../services/suspensaoService");
const ErroHttp = require("../utils/ErroHttp");

const TIPOS_VALIDOS = ["aluno", "bibliotecario", "admin"];

function dadosPublicos(usuario) {
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo };
}

// POST /usuarios
async function cadastrar(req, res) {
    const nome = req.body.nome?.trim();
    const email = req.body.email?.trim();
    const { senha, tipo } = req.body;

    if (!nome || !email || !senha) {
        throw new ErroHttp(400, "campos obrigatorios: nome, email, senha");
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
        throw new ErroHttp(400, "tipo invalido");
    }

    const usuarioExistente = await usuarios.findOne({ where: { email } });
    if (usuarioExistente) {
        throw new ErroHttp(400, "email ja cadastrado");
    }

    const novoUsuario = await usuarios.create({ nome, email, senha, tipo: tipo || "aluno" });

    res.status(201).json({
        message: "usuario cadastrado com sucesso",
        usuario: dadosPublicos(novoUsuario)
    });
}

// GET /usuarios
async function listar(req, res) {
    const lista = await usuarios.findAll();
    res.json(lista);
}

// POST /login
async function login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        throw new ErroHttp(400, "informe email e senha");
    }

    const usuario = await usuarios.findOne({ where: { email: email.trim() } });

    if (!usuario) {
        throw new ErroHttp(401, "email nao cadastrado");
    }
    if (usuario.senha !== senha) {
        throw new ErroHttp(401, "senha incorreta");
    }

    res.json({
        success: true,
        message: "login realizado com sucesso",
        usuario: dadosPublicos(usuario)
    });
}

// GET /usuarios/:id/suspensao
async function consultarSuspensao(req, res) {
    const suspensaoAtiva = await buscarSuspensaoAtiva(req.params.id);

    if (!suspensaoAtiva) {
        return res.json({ suspenso: false });
    }

    res.json({
        suspenso: true,
        motivo: suspensaoAtiva.motivo,
        dias_atraso: suspensaoAtiva.dias_atraso,
        data_inicio: suspensaoAtiva.data_inicio,
        data_fim: suspensaoAtiva.data_fim
    });
}

// PUT /usuarios/:id/tipo  (admin)
async function alterarTipo(req, res) {
    const { tipo } = req.body;

    if (!TIPOS_VALIDOS.includes(tipo)) {
        throw new ErroHttp(400, "tipo invalido");
    }

    const usuario = await usuarios.findByPk(req.params.id);
    if (!usuario) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }

    await usuario.update({ tipo });

    res.json({
        message: `usuario ${usuario.nome} agora e ${tipo}`,
        usuario: { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo }
    });
}

// DELETE /usuarios/:id  (admin)
async function excluir(req, res) {
    const usuario = await usuarios.findByPk(req.params.id);
    if (!usuario) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }

    const emprestimosAtivos = await Emprestimo.count({
        where: { usuario_id: usuario.id, status: "ativo" }
    });
    if (emprestimosAtivos > 0) {
        throw new ErroHttp(400, "este usuario ainda tem livros emprestados. registre a devolucao antes de excluir");
    }

    await usuario.destroy();
    res.json({ message: "usuario excluido permanentemente" });
}

module.exports = { cadastrar, listar, login, consultarSuspensao, alterarTipo, excluir };
