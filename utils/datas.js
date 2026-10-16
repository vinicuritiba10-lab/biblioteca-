// Funcoes de data que respeitam o fuso de Brasilia.
// O servidor (Railway) roda em UTC; sem isso, depois das 21h a data "pulava" um dia.
const { FUSO_HORARIO } = require("../config/regras");

const UM_DIA_MS = 1000 * 60 * 60 * 24;

// Retorna a data no formato YYYY-MM-DD no fuso da escola
function dataLocalISO(data = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: FUSO_HORARIO,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(data));
}

function partesISO(iso) {
    const [ano, mes, dia] = iso.split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia);
}

// Soma dias a uma data YYYY-MM-DD e devolve outra YYYY-MM-DD
function somarDiasISO(iso, dias) {
    return new Date(partesISO(iso) + dias * UM_DIA_MS).toISOString().slice(0, 10);
}

// Soma dias a um objeto Date (mantem o horario)
function somarDias(data, dias) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    return nova;
}

// Quantidade de dias de calendario entre duas datas YYYY-MM-DD (fim - inicio)
function diasEntre(inicioISO, fimISO) {
    return Math.round((partesISO(fimISO) - partesISO(inicioISO)) / UM_DIA_MS);
}

// Formata para dd/mm/aaaa. Datas so com dia (YYYY-MM-DD) sao tratadas
// sem conversao de fuso, para nao aparecerem um dia antes.
function formatarDataBR(data) {
    if (!data) return "-";
    if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano}`;
    }
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO });
}

function formatarDataHoraBR(data = new Date()) {
    return new Date(data).toLocaleString("pt-BR", { timeZone: FUSO_HORARIO });
}

module.exports = {
    dataLocalISO,
    somarDiasISO,
    somarDias,
    diasEntre,
    formatarDataBR,
    formatarDataHoraBR
};
