
const form = document.getElementById("form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("password"); 
const nomeInput = document.getElementById("nome");
const tipoInput = document.getElementById("tipo");

tipoInput.addEventListener("blur", checkInputTipo);
nomeInput.addEventListener("blur", checkInputNome);
emailInput.addEventListener("blur", checkInputEmail);
senhaInput.addEventListener("blur", checkInputPassword);


function checkInputNome() {
    const nomeValue = nomeInput.value;
    if (nomeValue === "") {
        errorInput(nomeInput, "O nome é obrigatório.");
        return false;
    } else {
        const formItem = nomeInput.parentElement;
        formItem.className = "form-group";
        return true;
    }
}

function checkInputEmail() {
    const emailValue = emailInput.value;
    if (emailValue === "") {
        errorInput(emailInput, "O email é obrigatório.");
        return false;
    } else {
        const formItem = emailInput.parentElement;
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
    const formItem = tipoInput.parentElement;
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
        const formItem = senhaInput.parentElement;
        formItem.className = "form-group";
        return true;
    }
}

function errorInput(input, message) {
    const formItem = input.parentElement;
    const textMessage = formItem.querySelector("a") || document.createElement("a");
    textMessage.innerText = message;
    formItem.className = "form-group error";
}


form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isTipoValid = checkInputTipo();
    const isNomeValid = checkInputNome();
    const isEmailValid = checkInputEmail();
    const isPassValid = checkInputPassword();

    if (!isNomeValid || !isEmailValid || !isPassValid || !isTipoValid) {
        return;
    }

    const tipo = tipoInput.value;
    const nome = nomeInput.value;
    const email = emailInput.value;
    const senha = senhaInput.value;

    try {
        const response = await fetch("http://localhost:3000/usuarios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, senha, nome, tipo })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));
            alert("Login realizado com sucesso!");
            window.location.href = "dashboard.html";
        } else {
            alert(data.error || "Erro ao fazer login");
        }

    } catch (error) {
        console.error("Erro:", error);
        alert("Erro de conexão com o servidor");
    }
});
