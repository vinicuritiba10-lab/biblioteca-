// emailHelper.js
// Envia e-mails pela Edge Function "send-email" do Supabase (Resend) e monta o HTML deles.
// Precisa do supabaseClient.js carregado antes.
//
// Todos os e-mails usam o mesmo modelo (layoutEmail): faixa com o logo do Libro,
// título, cartão com os dados do livro, botão para abrir o site e rodapé.
// O HTML usa tabelas e estilos na própria tag porque é o que os programas de e-mail entendem.

async function enviarEmail(destinatario, assunto, html) {
    try {
        const { data, error } = await db.functions.invoke('send-email', {
            body: { to: destinatario, subject: assunto, html: html }
        });
        if (error) {
            console.error('Falha ao enviar e-mail:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Falha ao enviar e-mail:', err);
        return false;
    }
}

// ---------------- modelo visual ----------------

const CORES_EMAIL = {
    laranja: '#ec380b',
    roxo: '#764ba2',
    verde: '#1e7a47',
    vermelho: '#c0392b',
    amarelo: '#b86e00',
    texto: '#2d3436',
    suave: '#636e72'
};

// Endereço da pasta TR do site (as páginas ficam em TR/home e TR/login)
function enderecoDoSite() {
    try {
        return new URL('../', window.location.href).href;
    } catch (e) {
        return '';
    }
}

function escaparEmail(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dataEmail(data) {
    if (!data) return '-';
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    return new Date(data).toLocaleDateString('pt-BR');
}

// opcoes: { cor, etiqueta, titulo, nome, paragrafos[], livro, linhas[[rotulo, valor]], botao, nota, resumo }
function layoutEmail(o) {
    const site = enderecoDoSite();
    const cor = o.cor || CORES_EMAIL.roxo;
    const p = texto => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${CORES_EMAIL.texto};">${texto}</p>`;

    const cartao = (o.livro || (o.linhas && o.linhas.length)) ? `
        <tr><td style="padding:4px 32px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-left:4px solid ${cor};border-radius:10px;">
                <tr><td style="padding:16px 20px;">
                    ${o.livro ? `<p style="margin:0 0 8px;font-size:17px;font-weight:bold;color:${CORES_EMAIL.texto};">📖 ${escaparEmail(o.livro)}</p>` : ''}
                    ${(o.linhas || []).map(([rotulo, valor]) => `
                        <p style="margin:0 0 4px;font-size:14px;color:${CORES_EMAIL.suave};">${rotulo}: <b style="color:${CORES_EMAIL.texto};">${valor}</b></p>`).join('')}
                </td></tr>
            </table>
        </td></tr>` : '';

    const botao = o.botao && site ? `
        <tr><td style="padding:20px 32px 4px;">
            <a href="${site}${o.botao.caminho}" style="display:inline-block;background:${CORES_EMAIL.roxo};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:10px;">${o.botao.texto}</a>
        </td></tr>` : '';

    return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f1eef6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escaparEmail(o.resumo || o.titulo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1eef6;padding:28px 12px;">
<tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td bgcolor="${CORES_EMAIL.roxo}" style="background:${CORES_EMAIL.roxo};background-image:linear-gradient(135deg,${CORES_EMAIL.laranja},${CORES_EMAIL.roxo});padding:22px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                ${site ? `<td style="padding-right:12px;"><img src="${site}img/g10.png" width="28" height="38" alt="" style="display:block;border:0;"></td>` : ''}
                <td style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">Libro</td>
            </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 6px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:${cor};">${o.etiqueta}</p>
            <h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;color:${CORES_EMAIL.texto};">${o.titulo}</h1>
            ${p(`Olá, <b>${escaparEmail(o.nome || 'leitor(a)')}</b>!`)}
            ${(o.paragrafos || []).map(p).join('')}
        </td></tr>
        ${cartao}
        ${botao}
        ${o.nota ? `<tr><td style="padding:16px 32px 4px;font-size:13px;line-height:1.6;color:${CORES_EMAIL.suave};">${o.nota}</td></tr>` : ''}
        <tr><td style="padding:24px 32px 0;"></td></tr>
        <tr><td style="background:#f8f9fb;padding:18px 32px;font-size:12px;line-height:1.6;color:#8a8f98;">
            <b style="color:${CORES_EMAIL.suave};">Libro</b>, a biblioteca digital do Colégio Estadual Professor Júlio Szymanski.<br>
            Você recebeu este e-mail porque tem uma conta no Libro.
        </td></tr>
    </table>
</td></tr>
</table>
</body></html>`;
}

// ---------------- e-mails do sistema ----------------

function templateBoasVindas(nome) {
    return layoutEmail({
        cor: CORES_EMAIL.roxo,
        etiqueta: 'Conta criada',
        titulo: 'Bem-vindo(a) ao Libro!',
        resumo: 'Sua conta na biblioteca da escola está pronta.',
        nome,
        paragrafos: ['Sua conta está pronta. Agora você pode pesquisar o acervo, pegar livros emprestados, entrar na fila de reserva e avaliar o que já leu.'],
        linhas: [
            ['Livros ao mesmo tempo', 'até 2'],
            ['Prazo de cada empréstimo', '7 dias'],
            ['Renovações', 'até 2, de mais 7 dias cada']
        ],
        botao: { texto: 'Entrar no Libro', caminho: 'login/index.html' },
        nota: 'Avisamos por e-mail quando um prazo estiver perto de vencer e quando um livro reservado chegar.'
    });
}

function templateLembreteDevolucao(nome, livroTitulo, dataDevolucao, diasRestantes) {
    const vencido = diasRestantes <= 0;
    const titulo = vencido ? 'O prazo deste livro já venceu'
        : diasRestantes === 1 ? 'Seu livro vence amanhã'
        : `Seu livro vence em ${diasRestantes} dias`;
    return layoutEmail({
        cor: vencido ? CORES_EMAIL.vermelho : CORES_EMAIL.amarelo,
        etiqueta: 'Lembrete de devolução',
        titulo,
        nome,
        paragrafos: [vencido
            ? 'Devolva o livro na biblioteca o quanto antes. Cada dia de atraso vira um dia de suspensão da conta.'
            : 'Devolva até a data abaixo ou renove pelo site, se ainda tiver renovações.'],
        livro: livroTitulo,
        linhas: [['Devolver até', dataEmail(dataDevolucao)]],
        botao: { texto: 'Ver meus empréstimos', caminho: 'login/index.html' }
    });
}

function templateRenovacao(nome, livroTitulo, novaData, renovacoesRestantes) {
    return layoutEmail({
        cor: CORES_EMAIL.verde,
        etiqueta: 'Empréstimo renovado',
        titulo: 'Você ganhou mais 7 dias',
        nome,
        paragrafos: ['A renovação deu certo. Confira o novo prazo:'],
        livro: livroTitulo,
        linhas: [
            ['Nova data de devolução', dataEmail(novaData)],
            ['Renovações restantes', escaparEmail(renovacoesRestantes)]
        ],
        botao: { texto: 'Ver meus empréstimos', caminho: 'login/index.html' }
    });
}

function templateSuspensao(nome, livroTitulo, diasAtraso, dataFimSuspensao) {
    return layoutEmail({
        cor: CORES_EMAIL.vermelho,
        etiqueta: 'Conta suspensa',
        titulo: 'Sua conta foi suspensa por atraso',
        nome,
        paragrafos: ['O livro abaixo foi devolvido depois do prazo. Por isso, sua conta fica suspensa pelo mesmo número de dias do atraso.'],
        livro: livroTitulo,
        linhas: [
            ['Dias de atraso', escaparEmail(diasAtraso)],
            ['Conta suspensa até', dataEmail(dataFimSuspensao)]
        ],
        nota: 'Durante a suspensão não é possível pegar livros nem renovar. Depois dessa data, a conta volta ao normal sozinha.'
    });
}

function templateReservaDisponivel(nome, livroTitulo) {
    return layoutEmail({
        cor: CORES_EMAIL.verde,
        etiqueta: 'Reserva disponível',
        titulo: 'Sua reserva chegou!',
        resumo: `"${livroTitulo}" está esperando por você na biblioteca.`,
        nome,
        paragrafos: ['O livro que você reservou voltou para a biblioteca e está guardado para você.'],
        livro: livroTitulo,
        linhas: [['Prazo para retirar', '48 horas']],
        botao: { texto: 'Ver minhas reservas', caminho: 'login/index.html' },
        nota: 'Se não for retirado nesse prazo, a vez passa para o próximo da fila.'
    });
}

// Depois de devolver_livro: avisa quem foi suspenso e quem estava na fila de reserva
function enviarEmailsDaDevolucao(data) {
    if (!data) return;
    if (data.suspensao_criada) {
        enviarEmail(
            data.usuario_email,
            `⚠️ Conta suspensa por atraso - ${data.livro_titulo}`,
            templateSuspensao(data.usuario_nome, data.livro_titulo, data.dias_atraso, data.data_fim_suspensao)
        );
    }
    if (data.reserva_usuario_email) {
        enviarEmail(
            data.reserva_usuario_email,
            `🔖 Sua reserva chegou - ${data.livro_titulo}`,
            templateReservaDisponivel(data.reserva_usuario_nome, data.livro_titulo)
        );
    }
}
