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

    // ---------------- capas em lote ----------------
    // Para os livros sem capa (por exemplo, os do acervo inicial), procura no Google Livros
    // pelo título e pelo autor. Só aceita um resultado cujo título combine com o do livro.

    const semAcento = texto => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const tituloPrincipal = texto => semAcento(String(texto || "").split(":")[0]);
    const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));

    function combina(tituloEncontrado, tituloDoLivro) {
        const a = tituloPrincipal(tituloEncontrado), b = tituloPrincipal(tituloDoLivro);
        return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
    }

    async function procurarCapa(livro) {
        const tentativas = [
            `intitle:${livro.titulo} inauthor:${livro.autor}&langRestrict=pt`,
            `intitle:${livro.titulo} inauthor:${livro.autor}`,
            `intitle:${livro.titulo}&langRestrict=pt`
        ];
        for (const consulta of tentativas) {
            const [q, extra] = consulta.split("&");
            const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books${extra ? "&" + extra : ""}`;
            try {
                const resposta = await fetch(url);
                if (!resposta.ok) continue;
                const dados = await resposta.json();
                const info = (dados.items || []).map(item => item.volumeInfo || {})
                    .find(v => v.imageLinks && combina(v.title, livro.titulo));
                if (info) {
                    const capa = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
                    const isbn = (info.industryIdentifiers || []).find(i => i.type === "ISBN_13")
                        || (info.industryIdentifiers || []).find(i => i.type === "ISBN_10");
                    return {
                        capa_url: capa.replace("http://", "https://").replace("&edge=curl", ""),
                        isbn: isbn ? isbn.identifier : null,
                        editora: info.publisher || null
                    };
                }
            } catch (erro) {
                // sem internet ou limite do Google: tenta a próxima forma de busca
            }
            await esperar(200);
        }
        return null;
    }

    async function buscarCapasQueFaltam() {
        const botao = campo("btn-buscar-capas");
        const progresso = campo("progresso-capas");

        const { data: livros, error } = await db.from("livros").select("*").or("capa_url.is.null,capa_url.eq.").order("id");
        if (error) {
            showToast(error.message, "error");
            return;
        }
        if (!livros.length) {
            showToast("Todos os livros já têm capa.", "info");
            return;
        }
        const minutos = Math.max(1, Math.round(livros.length * 0.8 / 60));
        if (!await showConfirm(`Buscar a capa de ${livros.length} livro(s) no Google Livros? Leva cerca de ${minutos} minuto(s). Deixe esta página aberta.`, "Buscar capas", "Agora não")) return;

        botao.disabled = true;
        let encontradas = 0;
        const naoEncontrados = [];

        for (let i = 0; i < livros.length; i++) {
            const livro = livros[i];
            progresso.textContent = `Buscando ${i + 1} de ${livros.length}: ${livro.titulo}`;
            const achado = await procurarCapa(livro);

            if (achado) {
                const { error: erroSalvar } = await db.rpc("salvar_livro", {
                    p_solicitante_id: usuarioAtual.id,
                    p_livro_id: livro.id,
                    p_titulo: livro.titulo,
                    p_autor: livro.autor,
                    p_isbn: livro.isbn || achado.isbn,
                    p_editora: livro.editora || achado.editora,
                    p_ano: livro.ano,
                    p_categoria: livro.categoria,
                    p_quantidade_total: livro.quantidade_total,
                    p_capa_url: achado.capa_url,
                    p_descricao: livro.descricao
                });
                if (!erroSalvar) encontradas++;
                else naoEncontrados.push(livro.titulo);
            } else {
                naoEncontrados.push(livro.titulo);
            }
            await esperar(300);
        }

        botao.disabled = false;
        progresso.textContent = naoEncontrados.length
            ? `${encontradas} capa(s) encontrada(s). Sem capa: ${naoEncontrados.slice(0, 5).join(", ")}${naoEncontrados.length > 5 ? ` e mais ${naoEncontrados.length - 5}` : ""}. Esses dá para completar editando o livro.`
            : `Pronto: ${encontradas} capa(s) encontrada(s).`;
        showToast(`${encontradas} de ${livros.length} capas encontradas`, encontradas ? "success" : "warning", 5000);
        if (typeof carregarListaLivros === "function") carregarListaLivros();
    }

    document.addEventListener("DOMContentLoaded", () => {
        const botaoCapas = campo("btn-buscar-capas");
        if (botaoCapas) botaoCapas.addEventListener("click", buscarCapasQueFaltam);

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
