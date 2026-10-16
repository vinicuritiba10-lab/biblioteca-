// utils.js — funcoes pequenas de tela usadas em varias paginas.
// (Os calculos de datas, conquistas e planilhas ficam em logica.js.)
(function () {
    // Evita que aspas ou < > num titulo/descricao quebrem o HTML montado com template string
    window.escaparHTML = function (texto) {
        return String(texto ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    };

    window.formatarData = function (data, opcoes) {
        if (!data) return "-";
        if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
            const [ano, mes, dia] = data.split("-");
            return `${dia}/${mes}/${ano}`;
        }
        return new Date(data).toLocaleDateString("pt-BR", opcoes);
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
