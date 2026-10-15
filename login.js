const form = document.getElementById("form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("password");

// sugestao de dominio em tempo real, enquanto a pessoa digita
const opcaoDominioLogin = document.getElementById('opcao-dominio-login');
if (opcaoDominioLogin) {
    emailInput.addEventListener('input', function() {
        const valor = emailInput.value.trim();
        const parteLocal = valor.split('@')[0];
        opcaoDominioLogin.value = parteLocal ? parteLocal + "@escola.pr.gov.br" : '';
    });
}

function checkInputEmail() {
    const valorAtual = emailInput.value.trim();
    if (valorAtual && !valorAtual.includes('@')) {
        emailInput.value = valorAtual + "@escola.pr.gov.br";
    }
    if (emailInput.value === "") {
        errorInput(emailInput, "O email é obrigatório.");
        return false;
    }
    emailInput.closest('.form-group').className = "form-group";
    return true;
}

function checkInputPassword() {
    const passwordValue = senhaInput.value;
    if (passwordValue === "") {
        errorInput(senhaInput, "A senha é obrigatória.");
        return false;
    }
    senhaInput.closest('.form-group').className = "form-group";
    return true;
}

function errorInput(input, message) {
    const formItem = input.closest('.form-group');
    const textMessage = formItem.querySelector("a") || document.createElement("a");
    textMessage.innerText = message;
    formItem.className = "form-group error";
}

emailInput.addEventListener("blur", checkInputEmail);
senhaInput.addEventListener("blur", checkInputPassword);

// ── Envio do login (única fonte: submit do form) ──────────────────
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isEmailValid = checkInputEmail();
    const isPassValid = checkInputPassword();
    if (!isEmailValid || !isPassValid) return;

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        const { data, error } = await db.rpc('login_usuario', {
            p_email: email,
            p_senha: senha
        });

        if (error) {
            showToast(error.message || "E-mail ou senha inválidos", "error");
            return;
        }

        localStorage.setItem("usuarioLogado", JSON.stringify(data));
        showToast(`Bem-vindo, ${data.nome}! 👋`, "success", 2000);
        setTimeout(() => { window.location.href = "../home/home.html"; }, 1000);

    } catch (err) {
        console.error("Erro:", err);
        showToast("Erro de conexão com o Supabase", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Entrar";
    }
});
