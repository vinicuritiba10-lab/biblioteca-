
const form = document.getElementById("form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("password"); 
const nomeInput = document.getElementById("nome");
const tipoInput = document.getElementById("tipo");

tipoInput.addEventListener("blur", checkInputTipo);
nomeInput.addEventListener("blur", checkInputNome);
emailInput.addEventListener("blur", checkInputEmail);
senhaInput.addEventListener("blur", checkInputPassword);

// sugestao de dominio em tempo real, enquanto a pessoa digita
const opcaoDominioLogin = document.getElementById('opcao-dominio-login');
if (opcaoDominioLogin) {
    emailInput.addEventListener('input', function() {
        const valor = emailInput.value.trim();
        const parteLocal = valor.split('@')[0];
        if (parteLocal) {
            opcaoDominioLogin.value = parteLocal + "@escola.pr.gov.br";
        } else {
            opcaoDominioLogin.value = '';
        }
    });
}


function checkInputNome() {
    const nomeValue = nomeInput.value;
    if (nomeValue === "") {
        errorInput(nomeInput, "O nome é obrigatório.");
        return false;
    } else {
        const formItem = nomeInput.closest('.form-group');
        formItem.className = "form-group";
        return true;
    }
}

function checkInputEmail() {
    // completa o dominio da escola so se a pessoa ainda nao digitou nenhum @
    // (no login nao forcamos o dominio, pra nao quebrar contas antigas de teste)
    const valorAtual = emailInput.value.trim();
    if (valorAtual && !valorAtual.includes('@')) {
        emailInput.value = valorAtual + "@escola.pr.gov.br";
    }

    const emailValue = emailInput.value;
    if (emailValue === "") {
        errorInput(emailInput, "O email é obrigatório.");
        return false;
    } else {
        const formItem = emailInput.closest('.form-group');
        formItem.className = "form-group";
        return true;
    }
}

function checkInputTipo(){
  const tipoValue = tipoInput.value;
  if(tipoValue === ""){
    errorInput(tipoInput, "O tipo de conta é obrigatorio.");
    return false;

  } else {
    const formItem = tipoInput.closest('.form-group');
    formItem.className = "form-group";
    return true;
  }
}

function checkInputPassword() {
    const passwordValue = senhaInput.value;
    if (passwordValue === "") {
        errorInput(senhaInput, "A senha é obrigatória.");
        return false;
    } else if (passwordValue.length < 8) {
        errorInput(senhaInput, "A senha precisa ter no mínimo 8 caracteres.");
        return false;
    } else {
        const formItem = senhaInput.closest('.form-group');
        formItem.className = "form-group";
        return true;
    }
}

function errorInput(input, message) {
    const formItem = input.closest('.form-group');
    const textMessage = formItem.querySelector("a") || document.createElement("a");
    textMessage.innerText = message;
    formItem.className = "form-group error";
}


//acessar home apos login
document.getElementById("btn-login").addEventListener("click", async function(e){
    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("password").value;
    

    if (!email || !senha) {
        showToast("Preencha todos os campos", "warning");
        return;
    }

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        const response = await fetch("/login",{
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        });

        const data = await response.json();

        if(response.ok && data.success) {
            localStorage.setItem("usuarioLogado", JSON.stringify(data.usuario));
            
            showToast(`Bem-vindo, ${data.usuario.nome}! 👋`, "success", 2500);

            window.location.href = "../home/home.html";
        } else {

            showToast(data.error || "Erro ao fazer login", "error");
        }

    } catch (error) {
        console.error("erro:", error);
        showToast("Erro de conexão com o servidor", "error");

    } finally {
        btn.disabled = false;
        btn.textContent = "entrar";
    }

    
});
