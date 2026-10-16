const { test } = require("node:test");
const assert = require("node:assert/strict");
const { dataLocalISO, somarDiasISO, diasEntre, formatarDataBR, somarDias } = require("../utils/datas");

test("a data local usa o fuso de Brasilia, nao o UTC do servidor", () => {
    // 22h30 em Brasilia do dia 15 ja e dia 16 em UTC
    assert.equal(dataLocalISO(new Date("2026-10-16T01:30:00Z")), "2026-10-15");
    assert.equal(dataLocalISO(new Date("2026-10-16T03:30:00Z")), "2026-10-16");
});

test("somar dias atravessa meses e anos", () => {
    assert.equal(somarDiasISO("2026-12-30", 5), "2027-01-04");
    assert.equal(somarDiasISO("2028-02-28", 1), "2028-02-29"); // ano bissexto
    assert.equal(somarDiasISO("2026-03-01", -1), "2026-02-28");
});

test("dias entre duas datas", () => {
    assert.equal(diasEntre("2026-10-10", "2026-10-15"), 5);
    assert.equal(diasEntre("2026-10-15", "2026-10-10"), -5);
    assert.equal(diasEntre("2026-10-15", "2026-10-15"), 0);
});

test("datas so com dia nao voltam um dia ao formatar", () => {
    assert.equal(formatarDataBR("2026-10-20"), "20/10/2026");
    assert.equal(formatarDataBR(null), "-");
});

test("somarDias nao altera a data original", () => {
    const original = new Date("2026-10-15T12:00:00Z");
    const nova = somarDias(original, 7);
    assert.equal(original.toISOString(), "2026-10-15T12:00:00.000Z");
    assert.equal(dataLocalISO(nova), "2026-10-22");
});
