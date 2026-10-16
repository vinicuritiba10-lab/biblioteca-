const { enviarLembretes } = require("../services/notificacaoService");

// GET /notificacoes/verificar  (botao "Enviar Lembretes" do bibliotecario)
async function verificar(req, res) {
    const resultados = await enviarLembretes();
    res.json({
        message: `notificacoes processadas: ${resultados.length}`,
        notificacoes: resultados
    });
}

module.exports = { verificar };
