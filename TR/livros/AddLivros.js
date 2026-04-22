const livroInput = document.getElementById("livro");
const tituloInput = document.getElementById("titulo");
const autorInput = document.getElementById("autor");
const isbnInput = document.getElementById("isbn");
const editoraInput = document.getElementById("editora");
const anoInput = document.getElementById("ano");
const categoriaInput = document.getElementById("categoria");
const quantidade_totalInput = document.getElementById("quantidade_total");
const quantidade_disponivelInput = document.getElementById("quantidade_disponivel");

tituloInput.addEventListener("blur", checkInputTitulo);
autorInput.addEventListener("blur", checkInputAutor);
isbnInput.addEventListener("blur", checkInputIsbn);
editoraInput.addEventListener("blur", checkInputEditora);
anoInput.addEventListener("blur", checkInputAno);
categoriaInput.addEventListener("blur", checkInputCategoria);
quantidade_totalInput.addEventListener("blur", checkInputQuantTotal);
quantidade_disponivelInput.addEventListener("blur", checkInputQuantDispo);

function checkInputTitulo(){
    const tituloValue = tituloInput.value;
    if(tituloValue === "") {
        errorInput(tituloInput, "o nome é obrigatorio");
        return false;
    } else {
        const formLivro = tituloInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputAutor(){
    const autorValue = autorInput.value;
    if(autorValue === "") {
        errorInput(autorInput, "o nome é obrigatorio");
        return false;
    } else {
        const formLivro = autorInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputIsbn(){
    const isbnValue = isbnInput.value;
    if(isbnValue === "") {
        errorInput(isbnInput, "o isbn e obrigatorio");
        return false;
    } else {
        const formLivro = isbnInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputEditora(){
    const editoraValue = editoraInput.value;
    if(editoraValue === "") {
        errorInput(editoraInput, "a editora e obrigatorio");
        return false;
    } else {
        const formLivro = editoraInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputAno(){
    const anoValue = anoInput.value;
    if(anoValue === "") {
        errorInput(anoInput, "o ano e obrigatorio");
        return false;
    } else {
        const formLivro = anoInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputCategoria(){
    const categoriaValue = categoriaInput.value;
    if(categoriaValue === "") {
        errorInput(categoriaInput, "a categoria e obrigatorio");
        return false;
    } else {
        const formLivro = categoriaInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputQuantTotal(){
    const quantidade_totalValue = quantidade_totalInput.value;
    if(quantidade_totalValue === "") {
        errorInput(quantidade_totalInput, "a quantidade total e obrigatorio");
        return false;
    } else {
        const formLivro = quantidade_totalInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function checkInputQuantDispo(){
    const quantidade_disponivelValue = quantidade_disponivelInput.value;
    if(quantidade_disponivelValue === "") {
        errorInput(quantidade_disponivelInput, "a quantidade disponivel e obrigatorio");
        return false;
    } else {
        const formLivro = quantidade_disponivelInput.parentElement;
        formLivro.className = "form-livro";
        return true;
    }
}

function errorInput(input, message) {
    const formLivro = input.parentElement;
    const textMessage = formLivro.querySelector("a") || document.createElement("a");
    textMessage.innerText = message;
    formLivro.className = "form-livro error";
}

livroInput.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isTituloValid = checkInputTitulo();
    const isAutorValid = checkInputAutor();
    const isIsbnValid = checkInputIsbn();
    const isEditoraValid = checkInputEditora();
    const isAnoValid = checkInputAno();
    const isCategoriaValid = checkInputCategoria();
    const isQuantidadeTotalValid = checkInputQuantTotal();
    const isQuantidadeDisponivelsValid = checkInputQuantDispo();

    if (!isTituloValid || !isAutorValid || !isIsbnValid || !isEditoraValid || !isAnoValid || !isCategoriaValid || !isQuantidadeTotalValid || !isQuantidadeDisponivelsValid) {
        return;
    }

    const titulo = tituloInput.value;
    const autor = autorInput.value;
    const isbn = isbnInput.value;
    const editora = editoraInput.value;
    const ano = anoInput.value;
    const categoria = categoriaInput.value;
    const quantidade_total = quantidade_totalInput.value;
    const quantidade_disponivel = quantidade_disponivelInput.value;

    try {
        const response = await fetch("http://localhost:3000/livros", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ titulo, autor, isbn, editora, ano, categoria, quantidade_total, quantidade_disponivel })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Livro adicionado com sucesso!");
            window.location.href = "../home/home.html";
        } else {
            alert(data.error || "Erro ao enviar livro");
        }

    } catch (error) {
        console.error("Erro:", error);
        alert("Erro de conexão com o servidor");
    }
});