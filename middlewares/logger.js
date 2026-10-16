// Mostra no console cada chamada da API com o tempo de resposta.
// Ex.: "PUT /emprestimos/12/devolver 200 48ms". Arquivos estaticos nao aparecem.
// Para desligar: LOG_REQUISICOES=false
const EXTENSOES_ESTATICAS = /\.(html|css|js|png|jpg|jpeg|svg|ico|json|webmanifest|woff2?)$/i;

function logger(req, res, next) {
    if (process.env.LOG_REQUISICOES === "false" || EXTENSOES_ESTATICAS.test(req.path)) {
        return next();
    }

    const inicio = Date.now();
    res.on("finish", () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - inicio}ms`);
    });
    next();
}

module.exports = logger;
