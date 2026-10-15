// Respostas padrao para rota inexistente e para erros nao tratados.

function rotaNaoEncontrada(req, res) {
    res.status(404).json({ error: "rota nao encontrada" });
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
    const status = err.status || 500;
    if (status >= 500) {
        console.error(`erro em ${req.method} ${req.originalUrl}:`, err);
    }
    res.status(status).json({ error: err.message || "erro interno no servidor" });
}

module.exports = { rotaNaoEncontrada, tratarErros };
