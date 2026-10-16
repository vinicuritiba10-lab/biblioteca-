// api.js — conversa com o servidor Express do Libro.
// Envia o id do usuario logado no header "usuario-id" e transforma erros em mensagens.
(function () {
    function usuarioLogado() {
        try {
            return JSON.parse(localStorage.getItem("usuarioLogado"));
        } catch (e) {
            return null;
        }
    }

    function montarHeaders(comCorpo) {
        const headers = { Accept: "application/json" };
        const usuario = usuarioLogado();
        if (usuario && usuario.id) headers["usuario-id"] = String(usuario.id);
        if (comCorpo) headers["Content-Type"] = "application/json";
        return headers;
    }

    async function requisicao(metodo, caminho, corpo) {
        let resposta;
        try {
            resposta = await fetch(caminho, {
                method: metodo,
                headers: montarHeaders(corpo !== undefined),
                body: corpo !== undefined ? JSON.stringify(corpo) : undefined
            });
        } catch (e) {
            throw new Error("Sem conexão com o servidor. Verifique sua internet.");
        }

        const tipo = resposta.headers.get("content-type") || "";
        const dados = tipo.includes("application/json") ? await resposta.json() : null;

        if (!resposta.ok) {
            throw new Error((dados && dados.error) || `O servidor respondeu com erro ${resposta.status}.`);
        }
        return dados;
    }

    // Baixa um arquivo (CSV, PDF) de uma rota que precisa do header usuario-id
    async function baixar(caminho, nomeArquivo) {
        const resposta = await fetch(caminho, { headers: montarHeaders(false) });
        if (!resposta.ok) {
            let mensagem = `Erro ${resposta.status} ao baixar o arquivo.`;
            try { mensagem = (await resposta.json()).error || mensagem; } catch (e) { /* resposta sem json */ }
            throw new Error(mensagem);
        }
        const blob = await resposta.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.api = {
        get: caminho => requisicao("GET", caminho),
        post: (caminho, corpo) => requisicao("POST", caminho, corpo || {}),
        put: (caminho, corpo) => requisicao("PUT", caminho, corpo || {}),
        del: caminho => requisicao("DELETE", caminho),
        baixar,
        usuarioLogado
    };
})();
