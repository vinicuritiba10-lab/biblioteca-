// config 
const nodemailer = require('nodemailer');

//configuracao de transporte (usando gmail)

const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
        user: 'vinicuritiba8@gmail.com',
        pass: 'jxth qrlo jswj vlem'
    }
});

//funcao para enviar lembrete de devolucao

async function enviarlembreteDevolucao(email, nome, livroTitulo, dataDevolucao, diasRestantes) {
    try {
        const info = await transporter.sendMail({
            from: '"Biblioteca Libro" <vinicuritiba8@gmail.com>',
            to: email,
            subject:  `📚 Lembrete: Prazo de devolução - ${livroTitulo}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4CAF50;">📚 Biblioteca Libro</h2>
                    
                    <p>Olá, <strong>${nome}</strong>!</p>
                    
                    <p>Este é um lembrete sobre o livro que você pegou emprestado:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin: 0 0 10px 0;">📖 ${livroTitulo}</h3>
                        <p><strong>Data de devolução:</strong> ${new Date(dataDevolucao).toLocaleDateString()}</p>
                        <p><strong>Dias restantes:</strong> ${diasRestantes} dia(s)</p>
                    </div>
                    
                    ${diasRestantes <= 0 ? 
                        `<p style="color: #f44336;"><strong>⚠️ ATENÇÃO: O prazo já expirou! Devolva o livro ou renove o empréstimo.</strong></p>` :
                        `<p>Não se esqueça de devolver o livro até a data informada. Você pode <a href="/home.html" style="color: #4CAF50;">renovar o empréstimo</a> pelo sistema.</p>`
                    }
                    
                    <hr style="margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">Biblioteca Libro - Facilitando seu acesso ao conhecimento</p>
                </div>
            `
        });

        console.log(`✅ Email enviado para: ${email}`);
        return true;

    } catch (error) {
        console.error(`❌ Erro ao enviar email para ${email}:`, error.message);
        return false;
    }
}

module.exports = { enviarlembreteDevolucao };