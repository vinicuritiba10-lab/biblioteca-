// isbn.js — preenche o cadastro de livro a partir do ISBN.
// Consulta o Google Livros e, se nao achar, a Open Library (as duas sao gratuitas).
// So preenche os campos que ainda estao vazios, para nao apagar o que foi digitado.
(function () {
    "use strict";

    const campo = id => document.getElementById(id);

    function limparISBN(texto) {
        return String(texto || "").replace(/[^0-9Xx]/g, "").toUpperCase();
    }

    function isbnValido(isbn) {
        return isbn.length === 10 || isbn.length === 13;
    }

    async function buscarGoogle(isbn) {
        const resposta = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
        if (!resposta.ok) return null;
        const dados = await resposta.json();
        const info = dados.items && dados.items[0] && dados.items[0].volumeInfo;
        if (!info) return null;

        const capa = info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail);
        return {
            titulo: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
            autor: (info.authors || []).join(", "),
            editora: info.publisher,
            ano: parseInt(info.publishedDate, 10) || null,
            descricao: info.description,
            capa_url: capa ? capa.replace("http://", "https://").replace("&edge=curl", "") : null
        };
    }

    async function buscarOpenLibrary(isbn) {
        const resposta = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        if (!resposta.ok) return null;
        const dados = await resposta.json();
        const info = dados[`ISBN:${isbn}`];
        if (!info) return null;

        return {
            titulo: info.title,
            autor: (info.authors || []).map(a => a.name).join(", "),
            editora: info.publishers && info.publishers[0] && info.publishers[0].name,
            ano: parseInt(String(info.publish_date || "").match(/\d{4}/), 10) || null,
            descricao: null,
            capa_url: info.cover ? (info.cover.large || info.cover.medium) : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        };
    }

    function preencherSeVazio(id, valor) {
        const input = campo(id);
        if (input && !input.value.trim() && valor) {
            input.value = valor;
            input.classList.add("campo-preenchido");
            setTimeout(() => input.classList.remove("campo-preenchido"), 1600);
            return true;
        }
        return false;
    }

    async function buscarPorISBN() {
        const botao = campo("btn-buscar-isbn");
        const isbn = limparISBN(campo("isbn").value);

        if (!isbnValido(isbn)) {
            showToast("Digite um ISBN com 10 ou 13 números (está no verso do livro, perto do código de barras)", "warning", 5000);
            campo("isbn").focus();
            return;
        }

        botao.disabled = true;
        botao.textContent = "Buscando...";

        try {
            const dados = (await buscarGoogle(isbn).catch(() => null)) || (await buscarOpenLibrary(isbn).catch(() => null));

            if (!dados) {
                showToast("Não encontramos esse ISBN. Preencha os dados manualmente.", "info", 5000);
                return;
            }

            campo("isbn").value = isbn;
            const preenchidos = [
                preencherSeVazio("titulo", dados.titulo),
                preencherSeVazio("autor", dados.autor),
                preencherSeVazio("editora", dados.editora),
                preencherSeVazio("ano", dados.ano),
                preencherSeVazio("texto-da-sinopse", dados.descricao),
                preencherSeVazio("capa_url", dados.capa_url)
            ].filter(Boolean).length;

            atualizarPrevia();
            showToast(preenchidos
                ? `Encontrado: "${dados.titulo}". ${preenchidos} campo(s) preenchido(s) — confira antes de salvar.`
                : "Livro encontrado, mas os campos já estavam preenchidos.", "success", 5000);
        } finally {
            botao.disabled = false;
            botao.textContent = "Buscar dados";
        }
    }

    // mostra a capa ao lado do campo de URL
    function atualizarPrevia() {
        const url = campo("capa_url").value.trim();
        const previa = campo("previa-capa");
        if (!previa) return;
        if (url) {
            previa.innerHTML = `<img src="${url.replace(/"/g, "")}" alt="Prévia da capa" onerror="this.parentElement.innerHTML='Não foi possível carregar essa imagem'">`;
            previa.hidden = false;
        } else {
            previa.innerHTML = "";
            previa.hidden = true;
        }
    }
    window.atualizarPreviaCapa = atualizarPrevia;

    document.addEventListener("DOMContentLoaded", () => {
        const botao = campo("btn-buscar-isbn");
        if (!botao) return;
        botao.addEventListener("click", buscarPorISBN);
        campo("isbn").addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                buscarPorISBN();
            }
        });
        campo("capa_url").addEventListener("input", atualizarPrevia);
    });
})();
