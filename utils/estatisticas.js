// Calculos puros (sem banco) usados no perfil do aluno e no painel da biblioteca.
// Por serem puros, sao cobertos pelos testes em test/estatisticas.test.js.
const { dataLocalISO, diasEntre } = require("./datas");

const NOMES_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Situacao de um emprestimo em relacao ao prazo
function situacaoEmprestimo(emprestimo, hoje = dataLocalISO()) {
    const prevista = dataLocalISO(emprestimo.data_prevista_devolucao);
    const diasRestantes = diasEntre(hoje, prevista);
    const atrasado = emprestimo.status === "ativo" && diasRestantes < 0;
    return {
        atrasado,
        diasRestantes,
        diasAtraso: atrasado ? -diasRestantes : 0
    };
}

// true = devolvido ate o prazo; false = com atraso; null = ainda nao devolvido
function foiDevolvidoNoPrazo(emprestimo) {
    if (emprestimo.status !== "devolvido" || !emprestimo.data_devolucao_real) return null;
    return dataLocalISO(emprestimo.data_devolucao_real) <= dataLocalISO(emprestimo.data_prevista_devolucao);
}

// Percentual de devolucoes feitas no prazo (null se ainda nao ha devolucoes)
function calcularPontualidade(emprestimos) {
    const avaliados = emprestimos.map(foiDevolvidoNoPrazo).filter(r => r !== null);
    if (avaliados.length === 0) return null;
    const noPrazo = avaliados.filter(Boolean).length;
    return Math.round((noPrazo / avaliados.length) * 100);
}

// Conta ocorrencias e devolve [{ chave, total }] do mais frequente para o menos
function contarPor(lista, obterChave) {
    const contagem = new Map();
    for (const item of lista) {
        const chave = obterChave(item);
        if (chave === null || chave === undefined || chave === "") continue;
        contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }
    return [...contagem.entries()]
        .map(([chave, total]) => ({ chave, total }))
        .sort((a, b) => b.total - a.total || String(a.chave).localeCompare(String(b.chave)));
}

function categoriaMaisFrequente(categorias) {
    const ranking = contarPor(categorias, c => (c ? String(c).toLowerCase() : null));
    return ranking.length ? ranking[0].chave : null;
}

// Agrupa datas pelos ultimos N meses (inclui o mes atual), mesmo os meses sem nada
function agruparPorMes(datas, quantidadeMeses, hoje = dataLocalISO()) {
    const [anoAtual, mesAtual] = hoje.split("-").map(Number);
    const meses = [];

    for (let i = quantidadeMeses - 1; i >= 0; i--) {
        const indice = (anoAtual * 12 + (mesAtual - 1)) - i;
        const ano = Math.floor(indice / 12);
        const mes = indice % 12;
        meses.push({
            mes: `${ano}-${String(mes + 1).padStart(2, "0")}`,
            rotulo: `${NOMES_MESES[mes]}/${String(ano).slice(2)}`,
            total: 0
        });
    }

    const porChave = new Map(meses.map(m => [m.mes, m]));
    for (const data of datas) {
        if (!data) continue;
        const chave = dataLocalISO(data).slice(0, 7);
        if (porChave.has(chave)) porChave.get(chave).total++;
    }

    return meses;
}

module.exports = {
    situacaoEmprestimo,
    foiDevolvidoNoPrazo,
    calcularPontualidade,
    contarPor,
    categoriaMaisFrequente,
    agruparPorMes
};
