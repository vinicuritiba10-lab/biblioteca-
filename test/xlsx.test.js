// Testes do TR/xlsx.js, o gerador das planilhas do Excel com a marca do Libro.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { gerarPlanilhaLibro, letraColuna, dataExcel, crc32 } = require("../TR/xlsx.js");

const texto = bytes => Buffer.from(bytes).toString("latin1");

test("letras das colunas do Excel", () => {
    assert.equal(letraColuna(0), "A");
    assert.equal(letraColuna(25), "Z");
    assert.equal(letraColuna(26), "AA");
    assert.equal(letraColuna(27), "AB");
});

test("datas viram o número de dias que o Excel usa", () => {
    assert.equal(dataExcel(new Date(2000, 0, 1, 15, 30)), 36526);
    assert.equal(dataExcel(new Date(2026, 9, 16)), 46311);
    assert.equal(dataExcel("data inválida"), null);
});

test("crc32 confere com o valor padrão de verificação", () => {
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xCBF43926);
});

test("a planilha é um zip com os arquivos do Excel, o logo e o texto escapado", () => {
    const bytes = gerarPlanilhaLibro({
        titulo: "Libro: Acervo",
        subtitulo: "teste",
        aba: "Acervo",
        colunas: [
            { titulo: "Título", valor: l => l.titulo },
            { titulo: "Ano", valor: l => l.ano, tipo: "numero" },
            { titulo: "Cadastro", valor: l => l.data, tipo: "data" }
        ],
        linhas: [{ titulo: "Memórias & <Contos>", ano: 1899, data: new Date(2026, 9, 16) }],
        logo: { bytes: new Uint8Array([137, 80, 78, 71]), largura: 35, altura: 48 }
    });
    const conteudo = texto(bytes);

    assert.equal(conteudo.slice(0, 4), "PK\u0003\u0004");
    for (const arquivo of ["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/drawings/drawing1.xml", "xl/media/image1.png"]) {
        assert.ok(conteudo.includes(arquivo), arquivo);
    }
    assert.ok(conteudo.includes("Mem\u00c3\u00b3rias &amp; &lt;Contos&gt;"), "texto escapado em UTF-8");
    assert.ok(conteudo.includes("<v>46311</v>"), "data como número do Excel");
    assert.ok(conteudo.includes('<autoFilter ref="A4:C5"/>'), "filtro no cabeçalho");
});

test("sem logo, a planilha não leva desenho", () => {
    const bytes = gerarPlanilhaLibro({ titulo: "X", aba: "X", colunas: [{ titulo: "A", valor: l => l.a }], linhas: [] });
    assert.ok(!texto(bytes).includes("drawing1.xml"));
});
