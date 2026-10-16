// GET /status  -> mostra se o servidor e o banco estao funcionando (bom para o deploy)
const { sequelize } = require("../models");
const { version } = require("../package.json");

const iniciadoEm = new Date();

async function status(req, res) {
    let banco = "conectado";
    try {
        await sequelize.authenticate();
    } catch (erro) {
        banco = `erro: ${erro.message}`;
    }

    res.status(banco === "conectado" ? 200 : 503).json({
        status: banco === "conectado" ? "ok" : "com problemas",
        banco,
        versao: version,
        iniciado_em: iniciadoEm,
        tempo_no_ar_minutos: Math.round((Date.now() - iniciadoEm.getTime()) / 60000)
    });
}

module.exports = { status };
