// logica.js — calculos puros do Libro (sem tela e sem banco).
// Funciona no navegador (vira funcoes globais) e no Node (para os testes em test/).

(function (raiz, criar) {
    const logica = criar();
    if (typeof module === "object" && module.exports) {
        module.exports = logica;
    } else {
        Object.assign(raiz, logica);
    }
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    // ---------------- datas ----------------

    // YYYY-MM-DD no fuso do aparelho (o aluno esta no Brasil)
    function dataISO(data) {
        const d = new Date(data);
        const mes = String(d.getMonth() + 1).padStart(2, "0");
        const dia = String(d.getDate()).padStart(2, "0");
        return `${d.getFullYear()}-${mes}-${dia}`;
    }

    // Dias de calendario de hoje ate a data (negativo = ja passou)
    function diasAte(data, hoje = new Date()) {
        return Math.round((Date.parse(dataISO(data)) - Date.parse(dataISO(hoje))) / 86400000);
    }

    // Texto amigavel do prazo de um emprestimo ativo
    function descreverPrazo(dataPrevista, hoje = new Date()) {
        const dias = diasAte(dataPrevista, hoje);
        if (dias < 0) return { dias, texto: `Atrasado há ${-dias} dia${dias === -1 ? "" : "s"}`, nivel: "erro" };
        if (dias === 0) return { dias, texto: "Vence hoje", nivel: "aviso" };
        if (dias === 1) return { dias, texto: "Vence amanhã", nivel: "aviso" };
        if (dias <= 3) return { dias, texto: `Vence em ${dias} dias`, nivel: "aviso" };
        return { dias, texto: `Faltam ${dias} dias`, nivel: "ok" };
    }

    // ---------------- conquistas ----------------
    // Cada uma mede um numero do resumo que vem da funcao perfil_usuario do Supabase.

    const CONQUISTAS = [
        { id: "primeira-pagina", icone: "📗", titulo: "Primeira página", descricao: "Pegue seu primeiro livro emprestado", meta: 1, campo: "totalEmprestimos" },
        { id: "leitor-dedicado", icone: "📚", titulo: "Leitor dedicado", descricao: "Devolva 5 livros lidos", meta: 5, campo: "lidos" },
        { id: "rato-de-biblioteca", icone: "🏛️", titulo: "Rato de biblioteca", descricao: "Devolva 15 livros lidos", meta: 15, campo: "lidos" },
        { id: "sempre-no-prazo", icone: "⏰", titulo: "Sempre no prazo", descricao: "Devolva 5 livros sem atraso", meta: 5, campo: "devolucoesNoPrazo" },
        { id: "explorador", icone: "🧭", titulo: "Explorador", descricao: "Leia livros de 3 categorias diferentes", meta: 3, campo: "categoriasDistintas" },
        { id: "critico-literario", icone: "⭐", titulo: "Crítico literário", descricao: "Avalie 3 livros", meta: 3, campo: "avaliacoes" },
        { id: "lista-de-desejos", icone: "💛", titulo: "Lista de desejos", descricao: "Guarde 5 livros em Quero ler", meta: 5, campo: "favoritos" }
    ];

    function calcularConquistas(resumo) {
        return CONQUISTAS.map(({ campo, ...conquista }) => {
            const valor = Number(resumo && resumo[campo]) || 0;
            return {
                ...conquista,
                progresso: Math.min(valor, conquista.meta),
                conquistada: valor >= conquista.meta
            };
        });
    }

    // ---------------- planilhas CSV ----------------
    // Separador ";" e BOM UTF-8: abre certo no Excel e no Google Planilhas em portugues.

    function escaparCelula(valor) {
        if (valor === null || valor === undefined) return "";
        const texto = String(valor);
        return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    }

    // colunas: [{ titulo: "Livro", valor: linha => linha.titulo }]
    function gerarCSV(colunas, linhas) {
        const cabecalho = colunas.map(c => escaparCelula(c.titulo)).join(";");
        const corpo = linhas.map(linha => colunas.map(c => escaparCelula(c.valor(linha))).join(";"));
        return "\uFEFF" + [cabecalho, ...corpo].join("\r\n");
    }

    return { dataISO, diasAte, descreverPrazo, CONQUISTAS, calcularConquistas, escaparCelula, gerarCSV };
});
