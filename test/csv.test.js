const { test } = require("node:test");
const assert = require("node:assert/strict");
const { gerarCSV, escaparCelula } = require("../utils/csv");

test("celulas com ponto e virgula, aspas ou quebra de linha ficam entre aspas", () => {
    assert.equal(escaparCelula("simples"), "simples");
    assert.equal(escaparCelula("a;b"), '"a;b"');
    assert.equal(escaparCelula('O "Alienista"'), '"O ""Alienista"""');
    assert.equal(escaparCelula("linha\nnova"), '"linha\nnova"');
    assert.equal(escaparCelula(null), "");
    assert.equal(escaparCelula(0), "0");
});

test("planilha tem BOM, cabecalho e uma linha por item", () => {
    const csv = gerarCSV(
        [{ titulo: "Título", valor: l => l.titulo }, { titulo: "Ano", valor: l => l.ano }],
        [{ titulo: "Dom Casmurro", ano: 1899 }, { titulo: "Iracema", ano: 1865 }]
    );
    assert.ok(csv.startsWith("\uFEFF"));
    assert.deepEqual(csv.slice(1).split("\r\n"), ["Título;Ano", "Dom Casmurro;1899", "Iracema;1865"]);
});
