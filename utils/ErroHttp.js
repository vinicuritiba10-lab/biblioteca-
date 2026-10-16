// Erro com codigo HTTP. Lancado nos controllers e convertido em resposta
// JSON pelo middleware tratarErros.
class ErroHttp extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.status = status;
    }
}

module.exports = ErroHttp;
