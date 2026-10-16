// utils.js — funcoes pequenas usadas em varias telas.
(function () {
    // Evita que aspas ou < > num titulo/descricao quebrem o HTML montado com template string
    window.escaparHTML = function (texto) {
        return String(texto ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    };

    // Data no formato YYYY-MM-DD no fuso do aparelho (o aluno esta no Brasil)
    function dataISO(data) {
        return new Date(data).toLocaleDateString("en-CA");
    }

    // Dias de calendario de hoje ate a data (negativo = ja passou)
    window.diasAte = function (data) {
        const hoje = Date.parse(dataISO(new Date()));
        const alvo = Date.parse(dataISO(data));
        return Math.round((alvo - hoje) / 86400000);
    };

    window.formatarData = function (data, opcoes) {
        if (!data) return "-";
        if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
            const [ano, mes, dia] = data.split("-");
            return `${dia}/${mes}/${ano}`;
        }
        return new Date(data).toLocaleDateString("pt-BR", opcoes);
    };

    // Texto amigavel do prazo de um emprestimo ativo
    window.descreverPrazo = function (dataPrevista) {
        const dias = window.diasAte(dataPrevista);
        if (dias < 0) return { dias, texto: `Atrasado há ${-dias} dia${dias === -1 ? "" : "s"}`, nivel: "erro" };
        if (dias === 0) return { dias, texto: "Vence hoje", nivel: "aviso" };
        if (dias === 1) return { dias, texto: "Vence amanhã", nivel: "aviso" };
        if (dias <= 3) return { dias, texto: `Vence em ${dias} dias`, nivel: "aviso" };
        return { dias, texto: `Faltam ${dias} dias`, nivel: "ok" };
    };

    // Estrelas de 0 a 5 (ex.: 4,3 -> ★★★★☆)
    window.desenharEstrelas = function (media) {
        const cheias = Math.round(Number(media) || 0);
        return `<span class="estrelas" aria-hidden="true">${"★".repeat(cheias)}<span class="estrelas-vazias">${"★".repeat(5 - cheias)}</span></span>`;
    };

    window.formatarNota = function (media) {
        return Number(media).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
})();
