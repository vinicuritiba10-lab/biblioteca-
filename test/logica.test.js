// Testes do TR/logica.js, o arquivo de calculos usado pelo site publicado.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    dataISO, diasAte, descreverPrazo, calcularConquistas, CONQUISTAS, escaparCelula, gerarCSV
} = require("../TR/logica.js");

const dia = (iso, hora = "12:00") => new Date(`${iso}T${hora}:00`);

test("dataISO usa o dia do aparelho", () => {
    assert.equal(dataISO(dia("2026-10-16")), "2026-10-16");
    assert.equal(dataISO(dia("2026-01-05", "23:59")), "2026-01-05");
});

test("diasAte conta dias de calendario, ignorando a hora", () => {
    const hoje = dia("2026-10-16", "22:00");
    assert.equal(diasAte(dia("2026-10-17", "08:00"), hoje), 1);
    assert.equal(diasAte(dia("2026-10-16", "06:00"), hoje), 0);
    assert.equal(diasAte(dia("2026-10-13"), hoje), -3);
    assert.equal(diasAte(dia("2027-01-02"), dia("2026-12-30")), 3); // vira o ano
});

test("descreverPrazo escolhe texto e cor certos", () => {
    const hoje = dia("2026-10-16");
    assert.deepEqual(descreverPrazo(dia("2026-10-14"), hoje), { dias: -2, texto: "Atrasado há 2 dias", nivel: "erro" });
    assert.equal(descreverPrazo(dia("2026-10-15"), hoje).texto, "Atrasado há 1 dia");
    assert.equal(descreverPrazo(dia("2026-10-16"), hoje).texto, "Vence hoje");
    assert.equal(descreverPrazo(dia("2026-10-17"), hoje).texto, "Vence amanhã");
    assert.equal(descreverPrazo(dia("2026-10-19"), hoje).nivel, "aviso");
    assert.deepEqual(descreverPrazo(dia("2026-10-23"), hoje), { dias: 7, texto: "Faltam 7 dias", nivel: "ok" });
});

test("conquistas a partir do resumo que vem do perfil_usuario", () => {
    const resumo = { totalEmprestimos: 9, lidos: 7, devolucoesNoPrazo: 6, categoriasDistintas: 2, avaliacoes: 3, favoritos: 1 };
    const porId = Object.fromEntries(calcularConquistas(resumo).map(c => [c.id, c]));

    assert.equal(porId["primeira-pagina"].conquistada, true);
    assert.equal(porId["leitor-dedicado"].conquistada, true);
    assert.equal(porId["rato-de-biblioteca"].progresso, 7);
    assert.equal(porId["explorador"].conquistada, false);
    assert.equal(porId["critico-literario"].conquistada, true);
});

test("conquistas aguentam resumo vazio e nao expoem o campo interno", () => {
    const lista = calcularConquistas(null);
    assert.equal(lista.length, CONQUISTAS.length);
    assert.ok(lista.every(c => c.progresso === 0 && !c.conquistada && c.campo === undefined));
});

test("planilha CSV: BOM, separador ; e aspas escapadas", () => {
    assert.equal(escaparCelula('O "Alienista"; volume 1'), '"O ""Alienista""; volume 1"');
    const csv = gerarCSV(
        [{ titulo: "Título", valor: l => l.titulo }, { titulo: "Ano", valor: l => l.ano }],
        [{ titulo: "Dom Casmurro", ano: 1899 }, { titulo: "Os Elementos", ano: null }]
    );
    assert.ok(csv.startsWith("\uFEFF"));
    assert.deepEqual(csv.slice(1).split("\r\n"), ["Título;Ano", "Dom Casmurro;1899", "Os Elementos;"]);
});
