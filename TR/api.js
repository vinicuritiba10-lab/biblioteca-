// api.js — chamadas ao Supabase usadas pelas telas novas.
// Precisa do supabaseClient.js carregado antes (ele cria a variavel "db").
(function () {
    function usuarioLogado() {
        try {
            return JSON.parse(localStorage.getItem("usuarioLogado"));
        } catch (e) {
            return null;
        }
    }

    // Chama uma funcao do banco e devolve os dados, ou lanca um erro com a mensagem dela
    async function rpc(nome, parametros) {
        let resposta;
        try {
            resposta = await db.rpc(nome, parametros || {});
        } catch (e) {
            throw new Error("Sem conexão com o servidor. Verifique sua internet.");
        }
        if (resposta.error) {
            const mensagem = resposta.error.message || "Erro ao falar com o banco de dados.";
            // funcao ainda nao instalada no Supabase (migracao-v2.sql nao rodou)
            if (/Could not find the function|function .* does not exist/i.test(mensagem)) {
                throw new Error("Este recurso ainda não foi instalado no banco (rode supabase/migracao-v2.sql).");
            }
            throw new Error(mensagem);
        }
        return resposta.data;
    }

    // Faz o navegador baixar um texto como arquivo (planilhas CSV)
    function baixarTexto(conteudo, nomeArquivo, tipo) {
        const blob = new Blob([conteudo], { type: tipo || "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.rpc = rpc;
    window.api = { rpc, baixarTexto, usuarioLogado };
})();
