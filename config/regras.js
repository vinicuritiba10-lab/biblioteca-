// Regras de negocio da biblioteca, centralizadas num lugar so.
// Para mudar um prazo ou limite, altere aqui e o sistema inteiro acompanha.
module.exports = {
    LIMITE_EMPRESTIMOS: 2,              // livros ao mesmo tempo por aluno
    PRAZO_EMPRESTIMO_DIAS: 7,           // prazo padrao de um emprestimo
    DIAS_POR_RENOVACAO: 7,              // quanto cada renovacao adiciona
    MAX_RENOVACOES: 2,                  // renovacoes permitidas por emprestimo
    DIAS_AVISO_VENCIMENTO: 3,           // lembrete enviado quando faltam ate X dias
    PRAZO_RETIRADA_RESERVA_HORAS: 48,   // tempo para retirar um livro reservado que chegou
    LIMITE_VITRINE: 8,                  // livros por vitrine na pagina inicial
    MESES_NO_PAINEL: 6,                 // meses exibidos no grafico do painel
    FUSO_HORARIO: process.env.TZ_APP || "America/Sao_Paulo"
};
