// Modelos HTML dos e-mails enviados pelo backend.
const { formatarDataBR } = require("../utils/datas");

const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

const rodape = `
    <hr style="margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">Biblioteca Libro — Facilitando seu acesso ao conhecimento</p>
`;

function templateLembreteDevolucao(nome, livroTitulo, dataDevolucao, diasRestantes) {
    // link absoluto: links relativos nao funcionam dentro de um e-mail
    const linkRenovar = APP_URL
        ? ` Você pode <a href="${APP_URL}/home/home.html" style="color: #4CAF50;">renovar o empréstimo</a> pelo sistema.`
        : "";

    const aviso = diasRestantes <= 0
        ? `<p style="color: #f44336;"><strong>⚠️ ATENÇÃO: O prazo já expirou! Devolva o livro o quanto antes.</strong></p>`
        : `<p>Não se esqueça de devolver o livro até a data informada.${linkRenovar}</p>`;

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4CAF50;">📚 Biblioteca Libro</h2>
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Este é um lembrete sobre o livro que você pegou emprestado:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0;">📖 ${livroTitulo}</h3>
                <p><strong>Data de devolução:</strong> ${formatarDataBR(dataDevolucao)}</p>
                <p><strong>Dias restantes:</strong> ${Math.max(diasRestantes, 0)} dia(s)</p>
            </div>
            ${aviso}
            ${rodape}
        </div>
    `;
}

function templateSuspensao(nome, livroTitulo, diasAtraso, dataFimSuspensao) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #e53935;">⚠️ Biblioteca Libro — Suspensão de Conta</h2>
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Informamos que sua conta foi <strong>suspensa temporariamente</strong> devido ao atraso na devolução do livro abaixo:</p>
            <div style="background-color: #fff3f3; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #e53935;">
                <h3 style="margin: 0 0 10px 0;">📖 ${livroTitulo}</h3>
                <p><strong>Dias de atraso:</strong> ${diasAtraso} dia(s)</p>
                <p><strong>Conta suspensa até:</strong> <span style="color: #e53935; font-weight: bold;">${formatarDataBR(dataFimSuspensao)}</span></p>
            </div>
            <p>Durante o período de suspensão você <strong>não poderá realizar novos empréstimos</strong>.</p>
            ${rodape}
        </div>
    `;
}

module.exports = { templateLembreteDevolucao, templateSuspensao };
