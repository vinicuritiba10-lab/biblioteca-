// Tarefas automaticas que rodam todo dia, sem ninguem precisar clicar:
// - encerra suspensoes cujo prazo acabou
// - envia lembretes de devolucao para quem esta perto do vencimento
// Para desligar (ex.: em testes), defina CRON_ATIVO=false.
const cron = require("node-cron");
const { FUSO_HORARIO } = require("../config/regras");
const { encerrarSuspensoesVencidas } = require("../services/suspensaoService");
const { enviarLembretes } = require("../services/notificacaoService");

const HORARIO_DIARIO = process.env.CRON_HORARIO || "0 8 * * *"; // todo dia as 08:00

async function rotinaDiaria() {
    console.log("⏰ rotina diaria iniciada");
    try {
        const encerradas = await encerrarSuspensoesVencidas();
        console.log(`   suspensoes encerradas: ${encerradas}`);
    } catch (erro) {
        console.error("   erro ao encerrar suspensoes:", erro.message);
    }
    try {
        const lembretes = await enviarLembretes();
        console.log(`   lembretes processados: ${lembretes.length}`);
    } catch (erro) {
        console.error("   erro ao enviar lembretes:", erro.message);
    }
}

function iniciarAgendador() {
    if (process.env.CRON_ATIVO === "false") {
        console.log("agendador desativado (CRON_ATIVO=false)");
        return;
    }
    cron.schedule(HORARIO_DIARIO, rotinaDiaria, { timezone: FUSO_HORARIO });
    console.log(`agendador ativo: rotina diaria em "${HORARIO_DIARIO}" (${FUSO_HORARIO})`);
}

module.exports = { iniciarAgendador, rotinaDiaria };
