const { Op } = require("sequelize");
const { Reserva, livros, usuarios } = require("../models");
const ErroHttp = require("../utils/ErroHttp");

// POST /reservas  (so quando o livro esta indisponivel)
async function criar(req, res) {
    const { usuario_id, livro_id } = req.body;

    if (!usuario_id || !livro_id) {
        throw new ErroHttp(400, "informe usuario_id e livro_id");
    }

    const livro = await livros.findByPk(livro_id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }
    if (livro.quantidade_disponivel > 0) {
        throw new ErroHttp(400, "esse livro ja esta disponivel, nao precisa reservar");
    }

    const usuario = await usuarios.findByPk(usuario_id);
    if (!usuario) {
        throw new ErroHttp(404, "usuario nao encontrado");
    }

    const reservaExistente = await Reserva.findOne({
        where: { usuario_id, livro_id, status: { [Op.in]: ["ativa", "disponivel"] } }
    });
    if (reservaExistente) {
        throw new ErroHttp(400, "voce ja tem uma reserva para esse livro");
    }

    const novaReserva = await Reserva.create({
        usuario_id,
        livro_id,
        data_reserva: new Date(),
        status: "ativa"
    });

    res.status(201).json({ message: "reserva feita com sucesso", reserva: novaReserva });
}

// GET /usuarios/:id/reservas
async function listarDoUsuario(req, res) {
    const reservas = await Reserva.findAll({
        where: { usuario_id: req.params.id, status: { [Op.in]: ["ativa", "disponivel"] } },
        include: [{ model: livros, attributes: ["titulo", "autor", "capa_url"] }],
        order: [["data_reserva", "DESC"]]
    });
    res.json(reservas);
}

// DELETE /reservas/:id  (cancela, mantendo o historico)
async function cancelar(req, res) {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) {
        throw new ErroHttp(404, "reserva nao encontrada");
    }
    if (reserva.status === "cancelada" || reserva.status === "concluida") {
        throw new ErroHttp(400, "essa reserva ja foi encerrada");
    }

    await reserva.update({ status: "cancelada" });
    res.json({ message: "reserva cancelada com sucesso" });
}

module.exports = { criar, listarDoUsuario, cancelar };
