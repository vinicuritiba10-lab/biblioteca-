// cadastro.js
const DOMINIO_ESCOLA = "@escola.pr.gov.br";
const campoEmail = document.getElementById('email');
const sugestaoBox = document.getElementById('email-sugestao');
const sugestaoTexto = document.getElementById('email-sugestao-texto');

campoEmail.addEventListener('input', function() {
    const valor = this.value.trim();
    const parteLocal = valor.split('@')[0];
    const sugestaoCompleta = parteLocal + DOMINIO_ESCOLA;
    if (parteLocal && valor.toLowerCase() !== sugestaoCompleta.toLowerCase()) {
        sugestaoTexto.textContent = sugestaoCompleta;
        sugestaoBox.style.display = 'block';
    } else {
        sugestaoBox.style.display = 'none';
    }
});

sugestaoBox.addEventListener('click', function() {
    campoEmail.value = sugestaoTexto.textContent;
    sugestaoBox.style.display = 'none';
    const campoSenha = document.getElementById('senha');
    if (campoSenha) campoSenha.focus();
});

campoEmail.addEventListener('keydown', function(e) {
    if ((e.key === 'Tab' || e.key === ' ') && sugestaoBox.style.display !== 'none') {
        e.preventDefault();
        campoEmail.value = sugestaoTexto.textContent;
        sugestaoBox.style.display = 'none';
        const campoSenha = document.getElementById('senha');
        if (campoSenha) campoSenha.focus();
    }
});

campoEmail.addEventListener('blur', function() {
    const valor = this.value.trim();
    if (valor && !valor.toLowerCase().endsWith(DOMINIO_ESCOLA)) {
        const parteLocal = valor.split('@')[0];
        if (parteLocal) campoEmail.value = parteLocal + DOMINIO_ESCOLA;
    }
    setTimeout(() => { sugestaoBox.style.display = 'none'; }, 200);
});

// ── Envio do cadastro (agora direto pro Supabase) ─────────────────
document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
    const tipo = document.getElementById('tipo').value;

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
        const { data, error } = await db.rpc('cadastrar_usuario', {
            p_nome: nome,
            p_email: email,
            p_senha: senha,
            p_tipo: tipo
        });

        if (error) {
            showToast(error.message || 'Erro ao cadastrar', 'error');
            return;
        }

        showToast('Cadastro realizado — Faça login para continuar.', 'success', 4000);
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);

    } catch (err) {
        console.error('Erro:', err);
        showToast('Erro de conexão com o Supabase', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cadastrar';
    }
});
