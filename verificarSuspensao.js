// Bloqueia a acao se o usuario estiver com a conta suspensa.
const { buscarSuspensaoAtiva } = require("../services/suspensaoService");
const { formatarDataBR } = require("../utils/datas");

async function verificarSuspensao(req, res, next) {
    const usuario_id = req.body?.usuario_id || req.headers["usuario-id"];
    if (!usuario_id) return next(); // sem id: a propria rota trata

    try {
        const suspensaoAtiva = await buscarSuspensaoAtiva(usuario_id);

        if (suspensaoAtiva) {
            return res.status(403).json({
                error: `Sua conta esta suspensa ate ${formatarDataBR(suspensaoAtiva.data_fim)}. Regularize a devolucao do livro em atraso para liberar sua conta.`,
                suspensao: {
                    motivo: suspensaoAtiva.motivo,
                    data_fim: suspensaoAtiva.data_fim
                }
            });
        }
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = verificarSuspensao;
