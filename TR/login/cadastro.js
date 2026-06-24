// cadastro.js

const DOMINIO_ESCOLA = "@escola.pr.gov.br";
const campoEmail = document.getElementById('email');
const sugestaoBox = document.getElementById('email-sugestao');
const sugestaoTexto = document.getElementById('email-sugestao-texto');

// ── Sugestão visual enquanto digita ──────────────────────────────
campoEmail.addEventListener('input', function() {
    const valor = this.value.trim();
    if (valor && !valor.includes('@')) {
        sugestaoTexto.textContent = valor + DOMINIO_ESCOLA;
        sugestaoBox.style.display = 'block';
    } else {
        sugestaoBox.style.display = 'none';
    }
});

// Toque/clique na sugestão aplica o email completo
sugestaoBox.addEventListener('click', function() {
    campoEmail.value = sugestaoTexto.textContent;
    sugestaoBox.style.display = 'none';
    // Passa o foco direto pra senha
    const campoSenha = document.getElementById('senha');
    if (campoSenha) campoSenha.focus();
});

// Tab também completa
campoEmail.addEventListener('keydown', function(e) {
    if ((e.key === 'Tab' || e.key === ' ') && sugestaoBox.style.display !== 'none') {
        e.preventDefault();
        campoEmail.value = sugestaoTexto.textContent;
        sugestaoBox.style.display = 'none';
        const campoSenha = document.getElementById('senha');
        if (campoSenha) campoSenha.focus();
    }
});

// Fecha a sugestão se o usuário já digitou @ manualmente
campoEmail.addEventListener('blur', function() {
    const valor = this.value.trim();
    // Se saiu do campo sem @ e a sugestão ainda está visível, aplica
    if (valor && !valor.includes('@')) {
        campoEmail.value = valor + DOMINIO_ESCOLA;
    }
    setTimeout(() => { sugestaoBox.style.display = 'none'; }, 200);
});

// ── Envio do formulário ──────────────────────────────────────────
document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
    const tipo = document.getElementById('tipo').value;

    // Bloqueia cadastro com email fora do domínio da escola
    if (!email.toLowerCase().endsWith(DOMINIO_ESCOLA)) {
        showToast(`Use seu e-mail institucional terminado em ${DOMINIO_ESCOLA}`, 'warning');
        return;
    }

    if (senha !== confirmarSenha) {
        showToast('As senhas não coincidem!', 'error');
        return;
    }

    if (senha.length < 4) {
        showToast('A senha deve ter pelo menos 4 caracteres', 'warning');
        return;
    }

    const btn = document.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    try {
        const response = await fetch('/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, tipo })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message + ' — Faça login para continuar.', 'success', 4000);
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } else {
            showToast(data.error || 'Erro ao cadastrar', 'error');
        }

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cadastrar';
    }
});
