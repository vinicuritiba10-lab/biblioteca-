// Fila de reservas: quando um exemplar volta, a reserva mais antiga e avisada
// e tem um prazo para retirar o livro. Se nao retirar, a vez passa adiante.
const { Op } = require("sequelize");
const { Reserva, livros, usuarios } = require("../models");
const { estado } = require("../models/migracoes");
const { PRAZO_RETIRADA_RESERVA_HORAS } = require("../config/regras");
const { enviarEmailReservaDisponivel } = require("./email");

const UMA_HORA_MS = 60 * 60 * 1000;

function dadosDisponivel() {
    return estado.reservasComPrazo
        ? { status: "disponivel", data_disponivel: new Date() }
        : { status: "disponivel" };
}

// Marca a reserva mais antiga (status "ativa") de um livro como disponivel.
// Devolve a reserva promovida (ou null). Pode rodar dentro de uma transacao.
async function promoverProximaReserva(livro_id, transaction) {
    const proxima = await Reserva.findOne({
        where: { livro_id, status: "ativa" },
        order: [["data_reserva", "ASC"]],
        transaction
    });
    if (!proxima) return null;

    await proxima.update(dadosDisponivel(), { transaction });
    return proxima;
}

// Envia o e-mail "sua reserva chegou" (fora de transacao)
async function avisarReservaDisponivel(reserva) {
    const [usuario, livro] = await Promise.all([
        usuarios.findByPk(reserva.usuario_id, { attributes: ["nome", "email"] }),
        livros.findByPk(reserva.livro_id, { attributes: ["titulo"] })
    ]);
    if (!usuario || !livro) return false;
    return enviarEmailReservaDisponivel(usuario.email, usuario.nome, livro.titulo, PRAZO_RETIRADA_RESERVA_HORAS);
}

// Rotina periodica:
// 1) reservas que viraram "disponivel" sem data (ex.: devolucao feita pelo Supabase)
//    recebem a data de agora e o aluno e avisado por e-mail;
// 2) reservas disponiveis ha mais tempo que o prazo expiram e o proximo da fila e chamado.
async function processarReservas() {
    const resultado = { avisadas: 0, expiradas: 0, promovidas: 0 };
    if (!estado.reservasComPrazo) return resultado;

    const semData = await Reserva.findAll({ where: { status: "disponivel", data_disponivel: null } });
    for (const reserva of semData) {
        await reserva.update({ data_disponivel: new Date() });
        if (await avisarReservaDisponivel(reserva)) resultado.avisadas++;
    }

    const limite = new Date(Date.now() - PRAZO_RETIRADA_RESERVA_HORAS * UMA_HORA_MS);
    const vencidas = await Reserva.findAll({
        where: { status: "disponivel", data_disponivel: { [Op.lt]: limite } }
    });

    for (const reserva of vencidas) {
        await reserva.update({ status: "expirada" });
        resultado.expiradas++;

        const livro = await livros.findByPk(reserva.livro_id, { attributes: ["id", "quantidade_disponivel"] });
        if (livro && livro.quantidade_disponivel > 0) {
            const proxima = await promoverProximaReserva(livro.id);
            if (proxima) {
                resultado.promovidas++;
                await avisarReservaDisponivel(proxima);
            }
        }
    }

    return resultado;
}

module.exports = { promoverProximaReserva, avisarReservaDisponivel, processarReservas };
