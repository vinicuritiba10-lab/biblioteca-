const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    situacaoEmprestimo,
    foiDevolvidoNoPrazo,
    calcularPontualidade,
    contarPor,
    categoriaMaisFrequente,
    agruparPorMes
} = require("../utils/estatisticas");

const meioDia = dia => new Date(`${dia}T15:00:00Z`); // 12h em Brasilia

test("emprestimo ativo dentro do prazo", () => {
    const s = situacaoEmprestimo({ status: "ativo", data_prevista_devolucao: meioDia("2026-10-18") }, "2026-10-15");
    assert.deepEqual(s, { atrasado: false, diasRestantes: 3, diasAtraso: 0 });
});

test("emprestimo ativo atrasado", () => {
    const s = situacaoEmprestimo({ status: "ativo", data_prevista_devolucao: meioDia("2026-10-10") }, "2026-10-15");
    assert.equal(s.atrasado, true);
    assert.equal(s.diasAtraso, 5);
});

test("emprestimo devolvido nunca conta como atrasado", () => {
    const s = situacaoEmprestimo({ status: "devolvido", data_prevista_devolucao: meioDia("2026-10-01") }, "2026-10-15");
    assert.equal(s.atrasado, false);
});

test("devolucao no prazo, atrasada e ainda nao devolvida", () => {
    const base = { status: "devolvido", data_prevista_devolucao: meioDia("2026-10-10") };
    assert.equal(foiDevolvidoNoPrazo({ ...base, data_devolucao_real: meioDia("2026-10-10") }), true);
    assert.equal(foiDevolvidoNoPrazo({ ...base, data_devolucao_real: meioDia("2026-10-12") }), false);
    assert.equal(foiDevolvidoNoPrazo({ status: "ativo", data_prevista_devolucao: meioDia("2026-10-10") }), null);
});

test("pontualidade considera so os devolvidos", () => {
    const prazo = meioDia("2026-10-10");
    const lista = [
        { status: "devolvido", data_prevista_devolucao: prazo, data_devolucao_real: meioDia("2026-10-09") },
        { status: "devolvido", data_prevista_devolucao: prazo, data_devolucao_real: meioDia("2026-10-10") },
        { status: "devolvido", data_prevista_devolucao: prazo, data_devolucao_real: meioDia("2026-10-11") },
        { status: "ativo", data_prevista_devolucao: prazo }
    ];
    assert.equal(calcularPontualidade(lista), 67);
    assert.equal(calcularPontualidade([]), null);
});

test("contarPor ordena do mais frequente e ignora vazios", () => {
    const r = contarPor(["a", "b", "a", null, "", "c", "a", "b"], x => x);
    assert.deepEqual(r, [{ chave: "a", total: 3 }, { chave: "b", total: 2 }, { chave: "c", total: 1 }]);
});

test("categoria favorita ignora maiusculas", () => {
    assert.equal(categoriaMaisFrequente(["Literatura", "literatura", "historia"]), "literatura");
    assert.equal(categoriaMaisFrequente([]), null);
});

test("agrupar por mes inclui meses vazios e vira o ano", () => {
    const datas = [meioDia("2026-01-05"), meioDia("2026-01-20"), meioDia("2025-11-02"), meioDia("2025-06-01")];
    const meses = agruparPorMes(datas, 3, "2026-01-15");
    assert.deepEqual(meses.map(m => m.mes), ["2025-11", "2025-12", "2026-01"]);
    assert.deepEqual(meses.map(m => m.total), [1, 0, 2]);
    assert.equal(meses[2].rotulo, "jan/26");
});
