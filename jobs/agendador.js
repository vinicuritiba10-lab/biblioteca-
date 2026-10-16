// Tarefas automaticas, sem ninguem precisar clicar:
//  - todo dia: encerra suspensoes vencidas e envia lembretes de devolucao
//  - toda hora: avisa reservas que chegaram e expira as que nao foram retiradas
// Para desligar (ex.: em testes), defina CRON_ATIVO=false.
const cron = require("node-cron");
const { FUSO_HORARIO } = require("../config/regras");
const { encerrarSuspensoesVencidas } = require("../services/suspensaoService");
const { enviarLembretes } = require("../services/notificacaoService");
const { processarReservas } = require("../services/reservaService");

const HORARIO_DIARIO = process.env.CRON_HORARIO || "0 8 * * *"; // todo dia as 08:00
const HORARIO_RESERVAS = "15 * * * *";                            // minuto 15 de cada hora

async function executarEtapa(nome, tarefa) {
    try {
        const resultado = await tarefa();
        console.log(`   ${nome}:`, typeof resultado === "object" ? JSON.stringify(resultado) : resultado);
    } catch (erro) {
        console.error(`   erro em ${nome}:`, erro.message);
    }
}

async function rotinaDiaria() {
    console.log("⏰ rotina diaria iniciada");
    await executarEtapa("suspensoes encerradas", encerrarSuspensoesVencidas);
    await executarEtapa("lembretes enviados", async () => (await enviarLembretes()).length);
}

async function rotinaReservas() {
    await executarEtapa("reservas", processarReservas);
}

function iniciarAgendador() {
    if (process.env.CRON_ATIVO === "false") {
        console.log("agendador desativado (CRON_ATIVO=false)");
        return;
    }
    cron.schedule(HORARIO_DIARIO, rotinaDiaria, { timezone: FUSO_HORARIO });
    cron.schedule(HORARIO_RESERVAS, rotinaReservas, { timezone: FUSO_HORARIO });
    console.log(`agendador ativo: rotina diaria em "${HORARIO_DIARIO}" e reservas a cada hora (${FUSO_HORARIO})`);
}

module.exports = { iniciarAgendador, rotinaDiaria, rotinaReservas };
