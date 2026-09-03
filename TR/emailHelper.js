// emailHelper.js
// Função compartilhada pra disparar e-mails via Edge Function do Supabase.
// Precisa do supabaseClient.js carregado antes.

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

function templateLembreteDevolucao(nome, livroTitulo, dataDevolucao, diasRestantes) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4CAF50;">📚 Biblioteca Libro</h2>
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Este é um lembrete sobre o livro que você pegou emprestado:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0;">📖 ${livroTitulo}</h3>
                <p><strong>Data de devolução:</strong> ${new Date(dataDevolucao).toLocaleDateString('pt-BR')}</p>
                <p><strong>Dias restantes:</strong> ${diasRestantes} dia(s)</p>
            </div>
            ${diasRestantes <= 0
                ? `<p style="color: #f44336;"><strong>⚠️ ATENÇÃO: O prazo já expirou! Devolva o livro ou renove o empréstimo.</strong></p>`
                : `<p>Não se esqueça de devolver o livro até a data informada.</p>`}
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Biblioteca Libro — Facilitando seu acesso ao conhecimento</p>
        </div>
    `;
}

function templateSuspensao(nome, livroTitulo, diasAtraso, dataFimSuspensao) {
    const dataFimFormatada = new Date(dataFimSuspensao).toLocaleDateString('pt-BR');
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #e53935;">⚠️ Biblioteca Libro — Suspensão de Conta</h2>
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Informamos que sua conta foi <strong>suspensa temporariamente</strong> devido ao atraso na devolução do livro abaixo:</p>
            <div style="background-color: #fff3f3; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #e53935;">
                <h3 style="margin: 0 0 10px 0;">📖 ${livroTitulo}</h3>
                <p><strong>Dias de atraso:</strong> ${diasAtraso} dia(s)</p>
                <p><strong>Conta suspensa até:</strong> <span style="color: #e53935; font-weight: bold;">${dataFimFormatada}</span></p>
            </div>
            <p>Durante o período de suspensão você <strong>não poderá realizar novos empréstimos</strong>.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Biblioteca Libro — Facilitando seu acesso ao conhecimento</p>
        </div>
    `;
}
