// Envio de e-mails pelo backend (Gmail via nodemailer).
// Antes ficava em TR/email/config, pasta publica do site; agora fica fora dela.
const nodemailer = require("nodemailer");
const { templateLembreteDevolucao, templateSuspensao } = require("./templatesEmail");

const REMETENTE = process.env.EMAIL_FROM || `"Biblioteca Libro" <${process.env.EMAIL_USER || "vinicuritiba8@gmail.com"}>`;

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    family: 4
});

// Envia e devolve true/false, sem nunca derrubar a requisicao que chamou
async function enviar(destinatario, assunto, html) {
    try {
        await transporter.sendMail({ from: REMETENTE, to: destinatario, subject: assunto, html });
        console.log(`✅ E-mail enviado para: ${destinatario}`);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao enviar e-mail para ${destinatario}:`, error.message);
        return false;
    }
}

function enviarLembreteDevolucao(email, nome, livroTitulo, dataDevolucao, diasRestantes) {
    return enviar(
        email,
        `📚 Lembrete: Prazo de devolução - ${livroTitulo}`,
        templateLembreteDevolucao(nome, livroTitulo, dataDevolucao, diasRestantes)
    );
}

function enviarEmailSuspensao(email, nome, livroTitulo, diasAtraso, dataFimSuspensao) {
    return enviar(
        email,
        `⚠️ Conta suspensa por atraso na devolução - ${livroTitulo}`,
        templateSuspensao(nome, livroTitulo, diasAtraso, dataFimSuspensao)
    );
}

module.exports = { enviarLembreteDevolucao, enviarEmailSuspensao };
