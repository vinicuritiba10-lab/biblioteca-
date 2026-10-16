// Gera planilhas CSV que abrem direto no Excel / Google Planilhas em portugues:
// separador ";" e BOM UTF-8 para os acentos aparecerem certos.

function escaparCelula(valor) {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor);
    if (/[";\r\n]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
}

// colunas: [{ titulo: "Livro", valor: linha => linha.titulo }]
function gerarCSV(colunas, linhas) {
    const cabecalho = colunas.map(c => escaparCelula(c.titulo)).join(";");
    const corpo = linhas.map(linha => colunas.map(c => escaparCelula(c.valor(linha))).join(";"));
    return "\uFEFF" + [cabecalho, ...corpo].join("\r\n");
}

module.exports = { gerarCSV, escaparCelula };
