// theme-toggle.js — alterna entre modo claro e escuro, salvando a escolha

function libroAlternarTema() {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', novo);
    try {
        localStorage.setItem('libro-tema', novo);
    } catch (e) {
        // localStorage pode falhar em modo privado; nao quebra a troca de tema
    }
    libroAtualizarIconeTema();
    libroAtualizarMetaThemeColor(novo);
}

function libroAtualizarMetaThemeColor(tema) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', tema === 'dark' ? '#14151e' : '#e8491d');
    }
}

function libroAtualizarIconeTema() {
    const atual = document.documentElement.getAttribute('data-theme');
    document.querySelectorAll('.btn-tema').forEach(function(botao) {
        botao.innerHTML = atual === 'dark'
            ? '☀️'
            : '🌙';
        botao.setAttribute('aria-label', atual === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
        botao.setAttribute('title', atual === 'dark' ? 'Modo claro' : 'Modo escuro');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    libroAtualizarIconeTema();
    libroAtualizarMetaThemeColor(document.documentElement.getAttribute('data-theme'));
});
