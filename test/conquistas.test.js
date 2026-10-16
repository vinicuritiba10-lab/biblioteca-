const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calcularConquistas, CONQUISTAS } = require("../utils/conquistas");

const zerado = { totalEmprestimos: 0, lidos: 0, devolucoesNoPrazo: 0, categoriasDistintas: 0, avaliacoes: 0, favoritos: 0 };

test("aluno novo nao tem nenhuma conquista", () => {
    const lista = calcularConquistas(zerado);
    assert.equal(lista.length, CONQUISTAS.length);
    assert.ok(lista.every(c => !c.conquistada && c.progresso === 0));
});

test("conquistas liberam ao atingir a meta e o progresso nao passa da meta", () => {
    const lista = calcularConquistas({ ...zerado, totalEmprestimos: 9, lidos: 7, categoriasDistintas: 3 });
    const porId = Object.fromEntries(lista.map(c => [c.id, c]));

    assert.equal(porId["primeira-pagina"].conquistada, true);
    assert.equal(porId["primeira-pagina"].progresso, 1);
    assert.equal(porId["leitor-dedicado"].conquistada, true);
    assert.equal(porId["rato-de-biblioteca"].conquistada, false);
    assert.equal(porId["rato-de-biblioteca"].progresso, 7);
    assert.equal(porId["explorador"].conquistada, true);
});

test("a funcao de medida nao vaza para a resposta da API", () => {
    const [primeira] = calcularConquistas(zerado);
    assert.equal(primeira.medir, undefined);
    assert.ok(primeira.titulo && primeira.descricao && primeira.icone);
});
