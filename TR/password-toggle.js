// password-toggle.js — botão de "olho" para mostrar/ocultar senha
// Uso: envolva o <input type="password"> num <div class="campo-senha">
// e adicione um botão com onclick="alternarSenha(this)" dentro do mesmo div.

const LIBRO_ICONE_OLHO_ABERTO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const LIBRO_ICONE_OLHO_FECHADO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 4.22-5.06"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function alternarSenha(botao) {
    const wrapper = botao.closest('.campo-senha');
    const input = wrapper ? wrapper.querySelector('input') : null;
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        botao.innerHTML = LIBRO_ICONE_OLHO_FECHADO;
        botao.setAttribute('aria-label', 'Ocultar senha');
    } else {
        input.type = 'password';
        botao.innerHTML = LIBRO_ICONE_OLHO_ABERTO;
        botao.setAttribute('aria-label', 'Mostrar senha');
    }
}
