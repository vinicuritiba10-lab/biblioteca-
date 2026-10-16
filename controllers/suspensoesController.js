const { Suspensao, Emprestimo, usuarios, livros } = require("../models");
const { dataLocalISO, diasEntre } = require("../utils/datas");
const { buscarSuspensaoMarcadaAtiva, criarSuspensao, encerrarSuspensoesVencidas } = require("../services/suspensaoService");
const { enviarEmailSuspensao } = require("../services/email");
const ErroHttp = require("../utils/ErroHttp");

// GET /suspensoes
async function listar(req, res) {
    const suspensoes = await Suspensao.findAll({
        include: [{ model: usuarios, attributes: ["nome", "email"] }],
        order: [["data_inicio", "DESC"]]
    });
    res.json(suspensoes);
}

// POST /suspensoes  (aplicada manualmente pelo bibliotecario)
async function aplicar(req, res) {
    const { usuario_id, emprestimo_id, motivo } = req.body;

    const usuario = await usuarios.findByPk(usuario_id);
    if (!usuario) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }

    const emprestimo = await Emprestimo.findByPk(emprestimo_id, {
        include: [{ model: livros, attributes: ["titulo"] }]
    });
    if (!emprestimo) {
        throw new ErroHttp(404, "emprestimo nao encontrado");
    }
    if (String(emprestimo.usuario_id) !== String(usuario_id)) {
        throw new ErroHttp(400, "esse emprestimo nao pertence a esse usuario");
    }

    if (await buscarSuspensaoMarcadaAtiva(usuario_id)) {
        throw new ErroHttp(400, "este usuario ja possui uma suspensao ativa");
    }

    const diasAtraso = Math.max(1, diasEntre(dataLocalISO(emprestimo.data_prevista_devolucao), dataLocalISO()));
    const tituloLivro = emprestimo.livro?.titulo || "livro";

    const novaSuspensao = await criarSuspensao({
        usuario_id,
        emprestimo_id,
        motivo: motivo || `Devolucao em atraso: ${tituloLivro}`,
        diasAtraso
    });

    const emailEnviado = await enviarEmailSuspensao(
        usuario.email,
        usuario.nome,
        tituloLivro,
        diasAtraso,
        novaSuspensao.data_fim
    );

    res.status(201).json({
        message: `Usuario ${usuario.nome} suspenso por ${diasAtraso} dia(s).`,
        suspensao: novaSuspensao,
        email_enviado: emailEnviado
    });
}

// PUT /suspensoes/:id/encerrar
async function encerrar(req, res) {
    const suspensao = await Suspensao.findByPk(req.params.id, {
        include: [{ model: usuarios, attributes: ["nome"] }]
    });

    if (!suspensao) {
        throw new ErroHttp(404, "suspensao nao encontrada");
    }
    if (suspensao.status === "cumprida") {
        throw new ErroHttp(400, "esta suspensao ja foi encerrada");
    }

    await suspensao.update({ status: "cumprida" });

    res.json({
        message: `Suspensao do usuario ${suspensao.usuario?.nome || suspensao.usuario_id} encerrada manualmente.`
    });
}

// GET /suspensoes/verificar  (tambem roda sozinho todo dia pelo agendador)
async function verificarVencidas(req, res) {
    const encerradas = await encerrarSuspensoesVencidas();
    res.json({
        message: `${encerradas} suspensao(oes) encerrada(s) automaticamente.`,
        encerradas
    });
}

module.exports = { listar, aplicar, encerrar, verificarVencidas };
