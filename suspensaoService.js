// Regras de suspensao reaproveitadas por varias rotas e pelo agendador.
const { Op } = require("sequelize");
const { Suspensao } = require("../models");
const { dataLocalISO, somarDiasISO } = require("../utils/datas");

// Suspensao ativa e ainda dentro do prazo (ou null)
function buscarSuspensaoAtiva(usuario_id) {
    return Suspensao.findOne({
        where: {
            usuario_id,
            status: "ativa",
            data_fim: { [Op.gte]: dataLocalISO() }
        }
    });
}

// Qualquer suspensao marcada como ativa, mesmo que a data ja tenha passado
function buscarSuspensaoMarcadaAtiva(usuario_id, transaction) {
    return Suspensao.findOne({ where: { usuario_id, status: "ativa" }, transaction });
}

// Cria uma suspensao de N dias a partir de hoje
function criarSuspensao({ usuario_id, emprestimo_id, motivo, diasAtraso, transaction }) {
    const hoje = dataLocalISO();
    return Suspensao.create({
        usuario_id,
        emprestimo_id: emprestimo_id || null,
        motivo,
        dias_atraso: diasAtraso,
        data_inicio: hoje,
        data_fim: somarDiasISO(hoje, diasAtraso),
        status: "ativa"
    }, { transaction });
}

// Marca como cumpridas as suspensoes cujo prazo ja terminou. Devolve a quantidade.
async function encerrarSuspensoesVencidas() {
    const [quantidade] = await Suspensao.update(
        { status: "cumprida" },
        { where: { status: "ativa", data_fim: { [Op.lt]: dataLocalISO() } } }
    );
    return quantidade;
}

module.exports = {
    buscarSuspensaoAtiva,
    buscarSuspensaoMarcadaAtiva,
    criarSuspensao,
    encerrarSuspensoesVencidas
};
