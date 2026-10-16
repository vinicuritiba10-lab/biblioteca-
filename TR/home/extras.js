// extras.js — recursos novos da página inicial do Libro
//
// Aluno:      avisos no topo, vitrines (recomendados, populares, bem avaliados, novidades),
//             ficha completa do livro com avaliações, lista "Quero ler" e "Minha Conta"
//             (resumo de leitura, conquistas e histórico).
// Biblioteca: painel completo com gráficos, balcão de atendimento (empréstimo e devolução
//             presencial) e exportação de planilhas.
//
// Tudo vem das funções do Supabase instaladas por supabase/migracao-v2.sql,
// chamadas com rpc() (TR/api.js). Os cálculos puros ficam em TR/logica.js.

(function () {
    "use strict";

    const estado = {
        medias: {},              // livro_id -> { media, total }
        favoritos: new Set(),    // ids dos livros em "Quero ler"
        livroAberto: null,       // id do livro aberto na ficha
        painelAtual: null        // função para recarregar o painel admin aberto
    };

    const CORES_CAPA = ["color-1", "color-2", "color-3", "color-4", "color-5"];
    const ICONES_CAPA = ["📖", "📘", "📙", "📕", "📗", "📓", "📔", "📒"];

    function eu() {
        return (typeof usuarioAtual !== "undefined" && usuarioAtual) || api.usuarioLogado();
    }

    function ehBiblioteca() {
        const u = eu();
        return u && (u.tipo === "bibliotecario" || u.tipo === "admin");
    }

    function capaHTML(livro, indice, classeExtra = "") {
        const icone = ICONES_CAPA[(indice || livro.id || 0) % ICONES_CAPA.length];
        const cor = CORES_CAPA[(indice || livro.id || 0) % CORES_CAPA.length];
        if (livro.capa_url) {
            return `<div class="capa ${cor} ${classeExtra}"><img src="${escaparHTML(livro.capa_url)}" alt="" loading="lazy"
                onerror="this.parentElement.textContent='${icone}'"></div>`;
        }
        return `<div class="capa ${cor} ${classeExtra}" aria-hidden="true">${icone}</div>`;
    }

    function plural(n, singular, pluralTexto) {
        return `${n} ${n === 1 ? singular : pluralTexto}`;
    }

    // =====================================================================
    // INÍCIO
    // =====================================================================

    document.addEventListener("DOMContentLoaded", () => {
        if (!eu()) return;
        criarModalLivro();
        atualizarInicio();
        carregarContagemCategorias();
    });

    async function atualizarInicio() {
        await Promise.allSettled([carregarMedias(), carregarFavoritos()]);
        pintarCards();
        carregarAlertas();
        carregarVitrines();
    }
    window.atualizarInicio = atualizarInicio;

    // ---------------- Avisos no topo ----------------

    async function carregarAlertas() {
        const area = document.getElementById("alertas-area");
        if (!area) return;

        try {
            const alertas = await rpc("alertas_usuario", { p_usuario_id: eu().id });
            area.innerHTML = alertas.map(alerta => `
                <div class="alerta alerta-${alerta.nivel}" role="status">
                    <span class="alerta-icone" aria-hidden="true">${alerta.icone}</span>
                    <p>${escaparHTML(alerta.mensagem)}</p>
                    ${alerta.acao === "emprestimos" ? `<button type="button" onclick="mostrarMeusEmprestimos()">Ver empréstimos</button>` : ""}
                    ${alerta.acao === "reservas" ? `<button type="button" onclick="mostrarMinhasReservas()">Ver reservas</button>` : ""}
                </div>
            `).join("");
        } catch (erro) {
            area.innerHTML = ""; // avisos são um extra: se falhar, a página segue normal
            console.warn("alertas indisponíveis:", erro.message);
        }
    }

    // ---------------- Contagem de títulos por categoria ----------------

    async function carregarContagemCategorias() {
        try {
            const contagem = await rpc("contagem_categorias");
            const porChave = Object.fromEntries(contagem.map(c => [c.categoria, c.total]));
            document.querySelectorAll("[data-contagem]").forEach(el => {
                const total = porChave[el.dataset.contagem] || 0;
                el.textContent = total ? plural(total, "título", "títulos") : "Em breve";
            });
        } catch (erro) {
            console.warn("contagem de categorias indisponível:", erro.message);
        }
    }

    // ---------------- Vitrines ----------------

    async function carregarVitrines() {
        const secao = document.getElementById("vitrines-section");
        if (!secao) return;

        try {
            const dados = await rpc("destaques_livros", { p_usuario_id: eu().id });

            const vitrines = [
                { titulo: "Recomendados para você", descricao: dados.recomendados.motivo, livros: dados.recomendados.livros, tipo: "recomendado" },
                { titulo: "Mais emprestados", descricao: "Os favoritos da escola", livros: dados.mais_emprestados, tipo: "popular" },
                { titulo: "Mais bem avaliados", descricao: "Notas dadas pelos próprios alunos", livros: dados.bem_avaliados, tipo: "avaliado" },
                { titulo: "Chegaram no acervo", descricao: "Os últimos cadastrados pela biblioteca", livros: dados.novidades, tipo: "novo" }
            ].filter(v => v.livros && v.livros.length);

            if (!vitrines.length) {
                secao.innerHTML = "";
                return;
            }

            secao.innerHTML = vitrines.map(v => `
                <div class="vitrine">
                    <div class="vitrine-cabecalho">
                        <div>
                            <h2>${v.titulo}</h2>
                            ${v.descricao ? `<p>${escaparHTML(v.descricao)}</p>` : ""}
                        </div>
                    </div>
                    <div class="vitrine-trilha">
                        ${v.livros.map((livro, i) => cartaoVitrine(livro, i, v.tipo)).join("")}
                    </div>
                </div>
            `).join("") + `
                <div class="vitrine-rodape">
                    <button type="button" class="btn-voltar" onclick="mostrarAcervoCompleto()">Ver todo o acervo</button>
                </div>`;
        } catch (erro) {
            secao.innerHTML = "";
            console.warn("vitrines indisponíveis:", erro.message);
        }
    }

    function cartaoVitrine(livro, indice, tipo) {
        let detalhe = "";
        let classe = "";
        if (tipo === "popular") {
            detalhe = plural(livro.total_emprestimos, "empréstimo", "empréstimos");
            classe = "vitrine-detalhe-neutro";
        } else if (tipo === "avaliado") {
            detalhe = `${desenharEstrelas(livro.media)} ${formatarNota(livro.media)}`;
            classe = "vitrine-detalhe-neutro";
        } else {
            const disponivel = livro.quantidade_disponivel > 0;
            detalhe = disponivel ? "Disponível" : "Todos emprestados";
            classe = disponivel ? "" : "vitrine-detalhe-ocupado";
        }

        return `
            <button type="button" class="vitrine-card" onclick="abrirDetalhesLivro(${livro.id})">
                ${capaHTML(livro, indice)}
                <span class="vitrine-titulo">${escaparHTML(livro.titulo)}</span>
                <span class="vitrine-autor">${escaparHTML(livro.autor)}</span>
                <span class="vitrine-detalhe ${classe}">${detalhe}</span>
            </button>`;
    }

    window.mostrarAcervoCompleto = function () {
        categoriaAtual = "";
        document.getElementById("pesquisa").value = "";
        mostrarSecao("livros-section");
        marcarMenuAtivo(null);
        document.getElementById("btn-voltar").style.display = "inline-block";
        carregarTodosLivros();
    };

    // ---------------- Estrelas e corações nos cards do catálogo ----------------

    async function carregarMedias() {
        try {
            estado.medias = await rpc("medias_avaliacoes");
        } catch (erro) {
            estado.medias = {};
        }
    }

    async function carregarFavoritos() {
        try {
            const lista = await rpc("listar_favoritos", { p_usuario_id: eu().id });
            estado.favoritos = new Set(lista.map(f => Number(f.livro_id)));
        } catch (erro) {
            estado.favoritos = new Set();
        }
    }

    function pintarCards() {
        document.querySelectorAll("[data-nota]").forEach(el => {
            const info = estado.medias[el.dataset.nota];
            el.innerHTML = info
                ? `${desenharEstrelas(info.media)} <span>${formatarNota(info.media)} (${info.total})</span>`
                : `<span class="sem-nota">Sem avaliações</span>`;
        });
        document.querySelectorAll("[data-favorito]").forEach(botao => {
            marcarBotaoFavorito(botao, estado.favoritos.has(Number(botao.dataset.favorito)));
        });
    }
    window.aoExibirLivros = pintarCards;

    function marcarBotaoFavorito(botao, ativo) {
        botao.classList.toggle("ativo", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
        if (botao.classList.contains("btn-favorito")) botao.textContent = ativo ? "♥" : "♡";
        else botao.textContent = ativo ? "♥ Na lista Quero ler" : "♡ Quero ler";
    }

    window.alternarFavorito = async function (livroId, botao) {
        try {
            const resposta = await rpc("alternar_favorito", { p_usuario_id: eu().id, p_livro_id: livroId });
            const ativo = Boolean(resposta.favorito);
            if (ativo) estado.favoritos.add(livroId);
            else estado.favoritos.delete(livroId);
            showToast(ativo ? "Guardado em Quero ler 💛" : "Removido de Quero ler", ativo ? "success" : "info");

            document.querySelectorAll(`[data-favorito="${livroId}"]`).forEach(b => marcarBotaoFavorito(b, ativo));
            if (botao && !botao.dataset.favorito) marcarBotaoFavorito(botao, ativo);
        } catch (erro) {
            showToast(erro.message, "error");
        }
    };

    // =====================================================================
    // FICHA DO LIVRO (modal)
    // =====================================================================

    function criarModalLivro() {
        if (document.getElementById("modal-livro")) return;
        const modal = document.createElement("div");
        modal.id = "modal-livro";
        modal.className = "modal-livro";
        modal.hidden = true;
        modal.innerHTML = `
            <div class="modal-fundo" data-fechar></div>
            <div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="modal-livro-titulo">
                <button type="button" class="modal-fechar" data-fechar aria-label="Fechar">×</button>
                <div id="modal-livro-conteudo" class="modal-conteudo"></div>
            </div>`;
        document.body.appendChild(modal);

        modal.addEventListener("click", e => {
            if (e.target.hasAttribute("data-fechar")) fecharModalLivro();
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && !modal.hidden && !document.getElementById("confirm-modal")) fecharModalLivro();
        });
    }

    let focoAntesDoModal = null;

    function fecharModalLivro() {
        const modal = document.getElementById("modal-livro");
        modal.classList.remove("aberto");
        document.body.classList.remove("modal-aberto");
        setTimeout(() => { modal.hidden = true; }, 200);
        estado.livroAberto = null;
        if (focoAntesDoModal) focoAntesDoModal.focus();
    }
    window.fecharModalLivro = fecharModalLivro;

    window.abrirDetalhesLivro = async function (livroId, foco) {
        const modal = document.getElementById("modal-livro");
        const conteudo = document.getElementById("modal-livro-conteudo");
        focoAntesDoModal = document.activeElement;
        estado.livroAberto = livroId;

        conteudo.innerHTML = `<p class="modal-carregando">Abrindo a ficha do livro...</p>`;
        modal.hidden = false;
        document.body.classList.add("modal-aberto");
        requestAnimationFrame(() => modal.classList.add("aberto"));

        try {
            const dados = await rpc("detalhes_livro", { p_usuario_id: eu().id, p_livro_id: livroId });
            if (estado.livroAberto !== livroId) return; // o aluno já abriu outro livro
            conteudo.innerHTML = fichaHTML(dados);
            ligarFormularioAvaliacao(dados);

            if (foco === "avaliar") {
                const form = conteudo.querySelector(".avaliacao-form");
                if (form) {
                    form.scrollIntoView({ behavior: "smooth", block: "center" });
                    form.querySelector("input")?.focus();
                }
            } else {
                modal.querySelector(".modal-fechar").focus();
            }
        } catch (erro) {
            conteudo.innerHTML = `<p class="modal-carregando">Não foi possível abrir a ficha: ${escaparHTML(erro.message)}</p>`;
        }
    };

    function fichaHTML({ livro, avaliacoes, fila_reservas, total_emprestimos, usuario }) {
        const disponiveis = livro.quantidade_disponivel || 0;
        const total = livro.quantidade_total || 0;
        const percentual = total ? Math.round((disponiveis / total) * 100) : 0;
        const favorito = usuario?.favorito;

        const metadados = [
            ["Editora", livro.editora],
            ["Ano", livro.ano],
            ["ISBN", livro.isbn],
            ["Emprestado", plural(total_emprestimos, "vez", "vezes")]
        ].filter(([, valor]) => valor !== null && valor !== undefined && valor !== "");

        return `
            <div class="ficha">
                <div class="ficha-capa">${capaHTML(livro, livro.id, "capa-grande")}</div>

                <div class="ficha-info">
                    ${livro.categoria ? `<span class="ficha-categoria">${iconeCategoria(livro.categoria)} ${escaparHTML(nomeCategoria(livro.categoria))}</span>` : ""}
                    <h2 id="modal-livro-titulo">${escaparHTML(livro.titulo)}</h2>
                    <p class="ficha-autor">${escaparHTML(livro.autor)}</p>

                    ${avaliacoes.total ? `
                        <p class="ficha-nota">${desenharEstrelas(avaliacoes.media)}
                            <strong>${formatarNota(avaliacoes.media)}</strong>
                            <span>${plural(avaliacoes.total, "avaliação", "avaliações")}</span></p>` : ""}

                    <dl class="ficha-dados">
                        ${metadados.map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${escaparHTML(valor)}</dd></div>`).join("")}
                    </dl>

                    <div class="ficha-estoque">
                        <div class="ficha-estoque-barra"><span style="width:${percentual}%"></span></div>
                        <p>${disponiveis > 0
                            ? `<strong>${disponiveis} de ${total}</strong> exemplares disponíveis`
                            : `Todos os ${total} exemplares estão emprestados`}
                           ${fila_reservas ? ` · ${plural(fila_reservas, "pessoa", "pessoas")} na fila de reserva` : ""}</p>
                    </div>

                    <div class="ficha-acoes">
                        ${acaoPrincipalHTML(livro, usuario)}
                        <button type="button" class="btn-quero-ler ${favorito ? "ativo" : ""}" aria-pressed="${favorito ? "true" : "false"}"
                            onclick="alternarFavorito(${livro.id}, this)">${favorito ? "♥ Na lista Quero ler" : "♡ Quero ler"}</button>
                    </div>
                </div>
            </div>

            <section class="ficha-secao">
                <h3>Sinopse</h3>
                <p class="ficha-sinopse">${livro.descricao ? escaparHTML(livro.descricao) : "A biblioteca ainda não cadastrou uma sinopse para este livro."}</p>
            </section>

            <section class="ficha-secao">
                <h3>Avaliações dos alunos</h3>
                ${avaliacoes.total ? distribuicaoHTML(avaliacoes) : ""}
                ${formularioAvaliacaoHTML(livro, usuario)}
                ${avaliacoes.recentes.length
                    ? `<ul class="avaliacoes-lista">${avaliacoes.recentes.map(avaliacaoItemHTML).join("")}</ul>`
                    : `<p class="texto-suave">Ninguém avaliou este livro ainda.</p>`}
            </section>`;
    }

    function acaoPrincipalHTML(livro, usuario) {
        if (usuario?.emprestimo_ativo) {
            const prazo = descreverPrazo(usuario.emprestimo_ativo.data_prevista_devolucao);
            return `<p class="ficha-situacao ficha-situacao-${prazo.nivel}">📖 Este livro está com você. ${prazo.texto}.</p>`;
        }
        if (usuario?.reserva) {
            return usuario.reserva.status === "disponivel"
                ? `<p class="ficha-situacao ficha-situacao-ok">🔖 Sua reserva chegou! Retire na biblioteca.</p>`
                : `<p class="ficha-situacao">🔖 Você está na fila de reserva deste livro.</p>`;
        }
        if (livro.quantidade_disponivel > 0) {
            return `<button type="button" class="btn-borrow" onclick="pegarPelaFicha(${livro.id})">Pegar emprestado</button>`;
        }
        return `<button type="button" class="btn-borrow btn-reservar" onclick="reservarPelaFicha(${livro.id})">🔖 Entrar na fila de reserva</button>`;
    }

    // usa as mesmas funções do catálogo (Supabase) e depois atualiza a ficha
    window.pegarPelaFicha = async function (livroId) {
        await window.solicitarEmprestimo(livroId);
        if (estado.livroAberto === livroId) abrirDetalhesLivro(livroId);
    };

    window.reservarPelaFicha = async function (livroId) {
        await window.reservarLivro(livroId);
        if (estado.livroAberto === livroId) abrirDetalhesLivro(livroId);
    };

    function distribuicaoHTML(avaliacoes) {
        const maior = Math.max(...avaliacoes.distribuicao.map(d => d.total), 1);
        return `
            <div class="distribuicao">
                <div class="distribuicao-media">
                    <strong>${formatarNota(avaliacoes.media)}</strong>
                    ${desenharEstrelas(avaliacoes.media)}
                    <span>${plural(avaliacoes.total, "avaliação", "avaliações")}</span>
                </div>
                <ul class="distribuicao-barras">
                    ${avaliacoes.distribuicao.map(d => `
                        <li>
                            <span>${d.nota} ★</span>
                            <span class="distribuicao-trilho"><span style="width:${(d.total / maior) * 100}%"></span></span>
                            <span>${d.total}</span>
                        </li>`).join("")}
                </ul>
            </div>`;
    }

    function formularioAvaliacaoHTML(livro, usuario) {
        if (!usuario) return "";
        if (!usuario.pode_avaliar) {
            return `<p class="texto-suave avaliacao-aviso">Pegue este livro emprestado para poder avaliá-lo.</p>`;
        }
        const minha = usuario.minha_avaliacao;
        const nota = minha ? minha.nota : 0;

        return `
            <form class="avaliacao-form" data-livro="${livro.id}">
                <fieldset class="estrelas-input">
                    <legend>${minha ? "Sua avaliação" : "O que você achou?"}</legend>
                    <div class="estrelas-opcoes">
                        ${[5, 4, 3, 2, 1].map(n => `
                            <input type="radio" id="nota-${n}" name="nota" value="${n}" ${n === nota ? "checked" : ""}>
                            <label for="nota-${n}" title="${n} de 5">★<span class="visualmente-oculto">${n} de 5 estrelas</span></label>
                        `).join("")}
                    </div>
                </fieldset>
                <label class="visualmente-oculto" for="avaliacao-comentario">Comentário</label>
                <textarea id="avaliacao-comentario" name="comentario" rows="3" maxlength="500"
                    placeholder="Conte em poucas palavras o que achou (opcional)">${minha?.comentario ? escaparHTML(minha.comentario) : ""}</textarea>
                <div class="avaliacao-form-acoes">
                    <button type="submit" class="btn-borrow">${minha ? "Atualizar avaliação" : "Publicar avaliação"}</button>
                    ${minha ? `<button type="button" class="btn-link btn-link-perigo" data-remover="${minha.id}">Apagar minha avaliação</button>` : ""}
                </div>
            </form>`;
    }

    function avaliacaoItemHTML(a) {
        const primeiroNome = escaparHTML((a.nome || "Aluno").split(" ")[0]);
        return `
            <li class="avaliacao-item">
                <div class="avaliacao-topo">
                    <span class="avatar-mini" aria-hidden="true">${primeiroNome.charAt(0).toUpperCase()}</span>
                    <strong>${primeiroNome}</strong>
                    ${desenharEstrelas(a.nota)}
                    <time>${formatarData(a.data_avaliacao)}</time>
                </div>
                ${a.comentario ? `<p>${escaparHTML(a.comentario)}</p>` : ""}
            </li>`;
    }

    function ligarFormularioAvaliacao({ livro }) {
        const form = document.querySelector(".avaliacao-form");
        if (!form) return;

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const nota = form.querySelector("input[name=nota]:checked")?.value;
            if (!nota) {
                showToast("Escolha de 1 a 5 estrelas", "warning");
                return;
            }
            try {
                const resposta = await rpc("avaliar_livro", {
                    p_usuario_id: eu().id,
                    p_livro_id: livro.id,
                    p_nota: Number(nota),
                    p_comentario: form.comentario.value
                });
                showToast(resposta.message, "success");
                await carregarMedias();
                pintarCards();
                abrirDetalhesLivro(livro.id);
            } catch (erro) {
                showToast(erro.message, "error");
            }
        });

        const botaoRemover = form.querySelector("[data-remover]");
        if (botaoRemover) {
            botaoRemover.addEventListener("click", async () => {
                if (!await showConfirm("Apagar a sua avaliação deste livro?", "Apagar", "Manter")) return;
                try {
                    await rpc("apagar_avaliacao", { p_usuario_id: eu().id, p_avaliacao_id: Number(botaoRemover.dataset.remover) });
                    showToast("Avaliação apagada", "info");
                    await carregarMedias();
                    pintarCards();
                    abrirDetalhesLivro(livro.id);
                } catch (erro) {
                    showToast(erro.message, "error");
                }
            });
        }
    }

    // =====================================================================
    // MINHA CONTA
    // =====================================================================

    window.mostrarMinhaConta = async function (abaInicial = "conquistas") {
        const secao = document.getElementById("conta-section");
        mostrarSecao("conta-section");
        marcarMenuAtivo("btn-conta");
        secao.innerHTML = `<p class="texto-centro">Carregando sua conta...</p>`;

        try {
            const perfil = await rpc("perfil_usuario", { p_usuario_id: eu().id });
            perfil.conquistas = calcularConquistas(perfil.resumo);
            secao.innerHTML = contaHTML(perfil);
            ligarAbas(secao, abaInicial);
        } catch (erro) {
            secao.innerHTML = `<p class="texto-centro">Não foi possível carregar sua conta: ${escaparHTML(erro.message)}</p>`;
        }
    };

    function contaHTML({ usuario, resumo, proxima_devolucao, suspensao, conquistas, historico }) {
        const nomesPerfil = { aluno: "Aluno", bibliotecario: "Bibliotecário", admin: "Administrador" };
        const liberadas = conquistas.filter(c => c.conquistada).length;

        const numeros = [
            { valor: resumo.lidos, rotulo: resumo.lidos === 1 ? "livro lido" : "livros lidos" },
            { valor: resumo.ativos, rotulo: "com você agora" },
            { valor: resumo.pontualidade === null ? "—" : `${resumo.pontualidade}%`, rotulo: "devoluções no prazo" },
            { valor: resumo.categoria_favorita ? `${iconeCategoria(resumo.categoria_favorita)}` : "—",
              rotulo: resumo.categoria_favorita ? `gosta de ${nomeCategoria(resumo.categoria_favorita)}` : "categoria favorita" }
        ];

        let proxima = "";
        if (proxima_devolucao) {
            const prazo = descreverPrazo(proxima_devolucao.data);
            proxima = `
                <div class="conta-proxima conta-proxima-${prazo.nivel}">
                    <span aria-hidden="true">📅</span>
                    <p>Próxima devolução: <strong>${escaparHTML(proxima_devolucao.titulo)}</strong>
                       em ${formatarData(proxima_devolucao.data)} (${prazo.texto.toLowerCase()})</p>
                    <button type="button" onclick="mostrarMeusEmprestimos()">Ver empréstimos</button>
                </div>`;
        }

        return `
            <div class="conta-topo">
                <div class="conta-avatar" aria-hidden="true">${escaparHTML(usuario.nome || "?").charAt(0).toUpperCase()}</div>
                <div class="conta-identidade">
                    <h2>${escaparHTML(usuario.nome)}</h2>
                    <p>${escaparHTML(usuario.email)}</p>
                    <span class="conta-perfil">${nomesPerfil[usuario.tipo] || escaparHTML(usuario.tipo)}</span>
                </div>
                <button type="button" class="btn-voltar" onclick="mostrarInicio()">← Voltar</button>
            </div>

            ${suspensao ? `
                <div class="alerta alerta-erro">
                    <span class="alerta-icone" aria-hidden="true">⛔</span>
                    <p>Conta suspensa até ${formatarData(suspensao.data_fim)}. ${escaparHTML(suspensao.motivo)}.</p>
                </div>` : ""}

            <div class="conta-numeros">
                ${numeros.map(n => `
                    <div class="conta-numero">
                        <strong>${n.valor}</strong>
                        <span>${escaparHTML(n.rotulo)}</span>
                    </div>`).join("")}
            </div>

            ${proxima}

            <div class="abas" role="tablist" aria-label="Minha conta">
                <button type="button" role="tab" data-aba="conquistas">Conquistas <span class="abas-contador">${liberadas}/${conquistas.length}</span></button>
                <button type="button" role="tab" data-aba="historico">Histórico <span class="abas-contador">${historico.length}</span></button>
                <button type="button" role="tab" data-aba="quero-ler">Quero ler <span class="abas-contador">${resumo.favoritos}</span></button>
            </div>

            <div class="aba-painel" role="tabpanel" data-painel="conquistas">
                <div class="conquistas">${conquistas.map(conquistaHTML).join("")}</div>
            </div>

            <div class="aba-painel" role="tabpanel" data-painel="historico" hidden>
                ${historico.length
                    ? `<ul class="historico">${historico.map(historicoItemHTML).join("")}</ul>`
                    : `<p class="texto-centro">Quando você devolver um livro, ele aparece aqui.</p>`}
            </div>

            <div class="aba-painel" role="tabpanel" data-painel="quero-ler" hidden>
                <p class="texto-centro">Carregando sua lista...</p>
            </div>`;
    }

    function conquistaHTML(c) {
        const percentual = Math.round((c.progresso / c.meta) * 100);
        return `
            <div class="conquista ${c.conquistada ? "conquista-liberada" : ""}">
                <span class="conquista-icone" aria-hidden="true">${c.icone}</span>
                <strong>${escaparHTML(c.titulo)}</strong>
                <span class="conquista-descricao">${escaparHTML(c.descricao)}</span>
                ${c.conquistada
                    ? `<span class="conquista-status">Conquistada</span>`
                    : `<span class="conquista-progresso" role="progressbar" aria-valuemin="0" aria-valuemax="${c.meta}" aria-valuenow="${c.progresso}"
                            aria-label="${c.progresso} de ${c.meta}"><span style="width:${percentual}%"></span></span>
                       <span class="conquista-status">${c.progresso} de ${c.meta}</span>`}
            </div>`;
    }

    function historicoItemHTML(item) {
        const livro = item.livro || { titulo: "(livro removido)", autor: "" };
        const prazo = item.no_prazo === false
            ? `<span class="selo selo-atraso">Devolvido com atraso</span>`
            : `<span class="selo selo-ok">No prazo</span>`;
        const nota = item.minha_nota
            ? `<span class="historico-nota">${desenharEstrelas(item.minha_nota)}</span>`
            : (livro.id ? `<button type="button" class="btn-link" onclick="abrirDetalhesLivro(${livro.id}, 'avaliar')">⭐ Avaliar</button>` : "");

        return `
            <li class="historico-item">
                ${capaHTML(livro, livro.id, "capa-mini")}
                <div class="historico-texto">
                    <strong>${escaparHTML(livro.titulo)}</strong>
                    <span>${escaparHTML(livro.autor)}</span>
                    <span class="texto-suave">Devolvido em ${formatarData(item.data_devolucao_real)}</span>
                </div>
                <div class="historico-lateral">${prazo}${nota}</div>
            </li>`;
    }

    function ligarAbas(raiz, abaInicial) {
        const botoes = raiz.querySelectorAll("[data-aba]");

        function ativar(nome) {
            botoes.forEach(b => {
                const ativo = b.dataset.aba === nome;
                b.setAttribute("aria-selected", String(ativo));
                b.tabIndex = ativo ? 0 : -1;
            });
            raiz.querySelectorAll("[data-painel]").forEach(p => { p.hidden = p.dataset.painel !== nome; });
            if (nome === "quero-ler") carregarQueroLer(raiz.querySelector('[data-painel="quero-ler"]'));
        }

        botoes.forEach((botao, i) => {
            botao.addEventListener("click", () => ativar(botao.dataset.aba));
            botao.addEventListener("keydown", e => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const proximo = botoes[(i + (e.key === "ArrowRight" ? 1 : botoes.length - 1)) % botoes.length];
                proximo.focus();
                ativar(proximo.dataset.aba);
            });
        });

        ativar(abaInicial);
    }

    async function carregarQueroLer(painel) {
        try {
            const lista = await rpc("listar_favoritos", { p_usuario_id: eu().id });
            estado.favoritos = new Set(lista.map(f => Number(f.livro_id)));

            if (!lista.length) {
                painel.innerHTML = `<p class="texto-centro">Toque no ♡ de um livro para guardar aqui o que você quer ler depois.</p>`;
                return;
            }

            painel.innerHTML = `
                <div class="vitrine-trilha vitrine-grade">
                    ${lista.map((f, i) => `
                        <div class="quero-ler-item">
                            ${cartaoVitrine(f.livro, i, "novo")}
                            <button type="button" class="btn-link" onclick="removerQueroLer(${f.livro_id})">Remover</button>
                        </div>`).join("")}
                </div>`;
        } catch (erro) {
            painel.innerHTML = `<p class="texto-centro">Não foi possível carregar a lista: ${escaparHTML(erro.message)}</p>`;
        }
    }

    window.removerQueroLer = async function (livroId) {
        await alternarFavorito(livroId);
        mostrarMinhaConta("quero-ler");
    };

    // =====================================================================
    // BIBLIOTECA: PAINEL COMPLETO
    // =====================================================================

    function areaAdmin() {
        const area = document.getElementById("conteudo-area");
        area.scrollIntoView({ behavior: "smooth", block: "start" });
        return area;
    }

    window.mostrarPainelCompleto = async function () {
        const area = areaAdmin();
        estado.painelAtual = mostrarPainelCompleto;
        area.innerHTML = `<div class="admin-panel"><p>Montando o painel...</p></div>`;

        try {
            const p = await rpc("painel_biblioteca", { p_solicitante_id: eu().id });
            area.innerHTML = painelHTML(p);
        } catch (erro) {
            area.innerHTML = `<div class="admin-panel"><p>Não foi possível montar o painel: ${escaparHTML(erro.message)}</p>
                <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button></div>`;
        }
    };

    function painelHTML(p) {
        const ind = p.indicadores;
        const maiorMes = Math.max(...p.emprestimos_por_mes.map(m => m.total), 1);
        const maiorCategoria = Math.max(...p.por_categoria.map(c => c.total), 1);

        const cartoes = [
            { icone: "🔄", valor: ind.emprestimos_ativos, rotulo: "Empréstimos ativos", classe: "stat-icon-emprestimos" },
            { icone: "⚠️", valor: ind.emprestimos_atrasados, rotulo: "Atrasados agora", classe: "stat-icon-atraso" },
            { icone: "⏰", valor: ind.pontualidade === null ? "—" : `${ind.pontualidade}%`, rotulo: "Devoluções no prazo", classe: "stat-icon-disponivel" },
            { icone: "🔖", valor: ind.reservas_na_fila, rotulo: "Reservas na fila", classe: "stat-icon-acervo" },
            { icone: "⭐", valor: ind.media_avaliacoes === null ? "—" : formatarNota(ind.media_avaliacoes), rotulo: `Nota média (${ind.total_avaliacoes})`, classe: "stat-icon-usuarios" },
            { icone: "📚", valor: `${ind.copias_disponiveis}/${ind.total_copias}`, rotulo: "Exemplares na estante", classe: "stat-icon-acervo" }
        ];

        return `
            <div class="admin-panel painel">
                <div class="painel-topo">
                    <div>
                        <h2>📈 Painel da biblioteca</h2>
                        <p class="texto-suave">Atualizado em ${new Date(p.gerado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                           · ${plural(ind.total_emprestimos, "empréstimo registrado", "empréstimos registrados")}</p>
                    </div>
                    <button type="button" onclick="mostrarPainelCompleto()" class="btn-refresh" title="Atualizar agora" aria-label="Atualizar painel">⟳</button>
                </div>

                <div class="stats-cards-grid painel-cartoes">
                    ${cartoes.map(c => `
                        <div class="stat-card-new">
                            <div class="stat-icon ${c.classe}">${c.icone}</div>
                            <div class="stat-texto">
                                <span class="stat-value">${c.valor}</span>
                                <span class="stat-label">${c.rotulo}</span>
                            </div>
                        </div>`).join("")}
                </div>

                <div class="painel-grade">
                    <section class="painel-bloco">
                        <h3>Empréstimos por mês</h3>
                        <div class="grafico-colunas" role="img"
                            aria-label="${p.emprestimos_por_mes.map(m => `${m.rotulo}: ${m.total}`).join(", ")}">
                            ${p.emprestimos_por_mes.map(m => `
                                <div class="grafico-coluna">
                                    <span class="grafico-valor">${m.total}</span>
                                    <span class="grafico-barra" style="height:${Math.max((m.total / maiorMes) * 100, 2)}%"></span>
                                    <span class="grafico-rotulo">${m.rotulo}</span>
                                </div>`).join("")}
                        </div>
                    </section>

                    <section class="painel-bloco">
                        <h3>O que mais se lê</h3>
                        ${p.por_categoria.length ? `
                            <ul class="grafico-linhas">
                                ${p.por_categoria.slice(0, 7).map(c => `
                                    <li>
                                        <span class="grafico-linhas-nome">${iconeCategoria(c.categoria)} ${escaparHTML(nomeCategoria(c.categoria))}</span>
                                        <span class="grafico-linhas-trilho"><span style="width:${(c.total / maiorCategoria) * 100}%"></span></span>
                                        <span class="grafico-linhas-valor">${c.total}</span>
                                    </li>`).join("")}
                            </ul>` : `<p class="texto-suave">Ainda não há empréstimos.</p>`}
                    </section>

                    <section class="painel-bloco">
                        <h3>Livros mais emprestados</h3>
                        ${rankingHTML(p.top_livros, l => `<button type="button" class="btn-link" onclick="abrirDetalhesLivro(${l.id})">${escaparHTML(l.titulo)}</button>
                            <span class="texto-suave">${escaparHTML(l.autor)}</span>`)}
                    </section>

                    <section class="painel-bloco">
                        <h3>Leitores mais ativos</h3>
                        ${rankingHTML(p.top_leitores, u => `<span>${escaparHTML(u.nome)}</span>`)}
                    </section>
                </div>

                <section class="painel-bloco painel-bloco-largo">
                    <h3>Devoluções atrasadas ${p.atrasados.length ? `<span class="abas-contador">${p.atrasados.length}</span>` : ""}</h3>
                    ${p.atrasados.length ? `
                        <div class="tabela-scroll">
                            <table class="tabela-usuarios">
                                <thead><tr><th>Aluno</th><th>Livro</th><th>Prazo</th><th>Atraso</th><th></th></tr></thead>
                                <tbody>
                                    ${p.atrasados.map(a => `
                                        <tr>
                                            <td>${escaparHTML(a.usuario?.nome || "(removido)")}<br><small class="texto-suave">${escaparHTML(a.usuario?.email || "")}</small></td>
                                            <td>${escaparHTML(a.livro?.titulo || "(removido)")}</td>
                                            <td>${formatarData(a.data_prevista_devolucao)}</td>
                                            <td><span class="selo selo-atraso">${plural(a.dias_atraso, "dia", "dias")}</span></td>
                                            <td><button type="button" class="btn-renovar" onclick="receberDevolucao(${a.id})">Receber livro</button></td>
                                        </tr>`).join("")}
                                </tbody>
                            </table>
                        </div>` : `<p class="texto-suave">Nenhum livro atrasado. 🎉</p>`}
                </section>

                <section class="painel-bloco painel-bloco-largo">
                    <h3>Planilhas</h3>
                    <p class="texto-suave">Arquivos .csv que abrem no Excel e no Google Planilhas.</p>
                    <div class="painel-exportar">
                        <button type="button" class="btn-admin" onclick="baixarPlanilha('emprestimos')">📄 Empréstimos</button>
                        <button type="button" class="btn-admin" onclick="baixarPlanilha('livros')">📚 Acervo</button>
                        <button type="button" class="btn-admin" onclick="baixarPlanilha('usuarios')">👥 Usuários</button>
                    </div>
                </section>

                <div class="stats-actions">
                    <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
                </div>
            </div>`;
    }

    function rankingHTML(lista, conteudo) {
        if (!lista.length) return `<p class="texto-suave">Ainda não há dados.</p>`;
        return `
            <ol class="ranking">
                ${lista.map(item => `
                    <li>
                        <span class="ranking-texto">${conteudo(item)}</span>
                        <span class="ranking-total">${item.total}</span>
                    </li>`).join("")}
            </ol>`;
    }

    // Planilhas montadas no próprio navegador com os dados do Supabase
    const PLANILHAS = {
        async emprestimos() {
            const linhas = await rpc("listar_meus_emprestimos_admin", { p_solicitante_id: eu().id });
            return gerarCSV([
                { titulo: "ID", valor: e => e.id },
                { titulo: "Aluno", valor: e => e.usuario?.nome },
                { titulo: "E-mail", valor: e => e.usuario?.email },
                { titulo: "Livro", valor: e => e.livro?.titulo },
                { titulo: "Autor", valor: e => e.livro?.autor },
                { titulo: "Emprestado em", valor: e => formatarData(e.data_emprestimo) },
                { titulo: "Prazo", valor: e => formatarData(e.data_prevista_devolucao) },
                { titulo: "Devolvido em", valor: e => (e.data_devolucao_real ? formatarData(e.data_devolucao_real) : "") },
                { titulo: "Situação", valor: e => situacaoTexto(e) }
            ], linhas);
        },
        async livros() {
            const { data: linhas, error } = await db.from("livros").select("*").order("titulo");
            if (error) throw new Error(error.message);
            return gerarCSV([
                { titulo: "ID", valor: l => l.id },
                { titulo: "Título", valor: l => l.titulo },
                { titulo: "Autor", valor: l => l.autor },
                { titulo: "ISBN", valor: l => l.isbn },
                { titulo: "Editora", valor: l => l.editora },
                { titulo: "Ano", valor: l => l.ano },
                { titulo: "Categoria", valor: l => l.categoria ? nomeCategoria(l.categoria) : "" },
                { titulo: "Exemplares", valor: l => l.quantidade_total },
                { titulo: "Disponíveis", valor: l => l.quantidade_disponivel }
            ], linhas);
        },
        async usuarios() {
            const linhas = await rpc("listar_usuarios", { p_solicitante_id: eu().id });
            const nomesPerfil = { aluno: "Aluno", bibliotecario: "Bibliotecário", admin: "Administrador" };
            return gerarCSV([
                { titulo: "ID", valor: u => u.id },
                { titulo: "Nome", valor: u => u.nome },
                { titulo: "E-mail", valor: u => u.email },
                { titulo: "Perfil", valor: u => nomesPerfil[u.tipo] || u.tipo },
                { titulo: "Cadastrado em", valor: u => (u.created_at ? formatarData(u.created_at) : "") }
            ], linhas);
        }
    };

    function situacaoTexto(emprestimo) {
        if (emprestimo.status === "devolvido") {
            const noPrazo = emprestimo.data_devolucao_real &&
                dataISO(emprestimo.data_devolucao_real) <= dataISO(emprestimo.data_prevista_devolucao);
            return noPrazo ? "Devolvido no prazo" : "Devolvido com atraso";
        }
        return descreverPrazo(emprestimo.data_prevista_devolucao).texto;
    }

    window.baixarPlanilha = async function (tipo) {
        try {
            const conteudo = await PLANILHAS[tipo]();
            api.baixarTexto(conteudo, `libro-${tipo}-${dataISO(new Date())}.csv`);
            showToast("Planilha baixada", "success");
        } catch (erro) {
            showToast(erro.message, "error");
        }
    };

    window.receberDevolucao = async function (emprestimoId) {
        if (!await showConfirm("Confirmar que o livro foi entregue na biblioteca?", "Receber livro")) return;
        try {
            const resposta = await rpc("devolver_livro", { p_usuario_id: eu().id, p_emprestimo_id: emprestimoId });
            const aviso = resposta.suspensao_criada
                ? ` ${resposta.usuario_nome} ficou suspenso(a) por ${resposta.dias_atraso} dia(s).`
                : "";
            showToast(resposta.message + aviso, resposta.suspensao_criada ? "warning" : "success", 5000);
            enviarEmailsDaDevolucao(resposta);
            if (estado.painelAtual) estado.painelAtual();
            if (typeof carregarRelatoriosEmprestimos === "function") carregarRelatoriosEmprestimos();
        } catch (erro) {
            showToast(erro.message, "error");
        }
    };

    // =====================================================================
    // BIBLIOTECA: BALCÃO DE ATENDIMENTO
    // =====================================================================

    window.mostrarBalcao = async function () {
        const area = areaAdmin();
        estado.painelAtual = mostrarBalcao;
        area.innerHTML = `<div class="admin-panel"><p>Abrindo o balcão...</p></div>`;

        try {
            const [usuarios, consultaLivros, emprestimos] = await Promise.all([
                rpc("listar_usuarios", { p_solicitante_id: eu().id }),
                db.from("livros").select("*").order("titulo"),
                rpc("listar_meus_emprestimos_admin", { p_solicitante_id: eu().id })
            ]);
            if (consultaLivros.error) throw new Error(consultaLivros.error.message);
            const livros = consultaLivros.data;
            const ativos = emprestimos.filter(e => e.status === "ativo");
            area.innerHTML = balcaoHTML(usuarios, livros, ativos);
            ligarBalcao(usuarios, livros);
        } catch (erro) {
            area.innerHTML = `<div class="admin-panel"><p>Não foi possível abrir o balcão: ${escaparHTML(erro.message)}</p>
                <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button></div>`;
        }
    };

    function opcaoUsuario(u) { return `${u.nome} — ${u.email}`; }
    function opcaoLivro(l) { return `${l.titulo} — ${l.autor} (#${l.id})`; }

    function balcaoHTML(usuarios, livros, ativos) {
        const disponiveis = livros.filter(l => l.quantidade_disponivel > 0);
        usuarios = usuarios.filter(u => u.tipo === "aluno");
        const ordenados = [...ativos].sort((a, b) => new Date(a.data_prevista_devolucao) - new Date(b.data_prevista_devolucao));

        return `
            <div class="admin-panel balcao">
                <h2>🛎️ Balcão de atendimento</h2>
                <p class="texto-suave">Registre aqui os empréstimos e devoluções feitos pessoalmente na biblioteca.</p>

                <div class="balcao-grade">
                    <form id="balcao-emprestimo" class="painel-bloco balcao-form">
                        <h3>Novo empréstimo</h3>
                        <label for="balcao-aluno">Aluno</label>
                        <input id="balcao-aluno" list="balcao-lista-alunos" placeholder="Digite o nome ou e-mail" autocomplete="off" required>
                        <datalist id="balcao-lista-alunos">
                            ${usuarios.map(u => `<option value="${escaparHTML(opcaoUsuario(u))}"></option>`).join("")}
                        </datalist>

                        <label for="balcao-livro">Livro</label>
                        <input id="balcao-livro" list="balcao-lista-livros" placeholder="Digite o título ou o autor" autocomplete="off" required>
                        <datalist id="balcao-lista-livros">
                            ${disponiveis.map(l => `<option value="${escaparHTML(opcaoLivro(l))}"></option>`).join("")}
                        </datalist>
                        <p class="texto-suave">${plural(usuarios.length, "aluno cadastrado", "alunos cadastrados")} e ${plural(disponiveis.length, "título disponível", "títulos disponíveis")}. Prazo de devolução: 7 dias.</p>

                        <button type="submit" class="btn-borrow">Registrar empréstimo</button>
                    </form>

                    <section class="painel-bloco balcao-devolucoes">
                        <h3>Receber devolução <span class="abas-contador">${ativos.length}</span></h3>
                        <label class="visualmente-oculto" for="balcao-filtro">Filtrar empréstimos</label>
                        <input id="balcao-filtro" type="search" placeholder="Filtrar por aluno ou livro">
                        <ul class="balcao-lista">
                            ${ordenados.length ? ordenados.map(e => {
                                const prazo = descreverPrazo(e.data_prevista_devolucao);
                                const busca = `${e.usuario?.nome || ""} ${e.usuario?.email || ""} ${e.livro?.titulo || ""}`.toLowerCase();
                                return `
                                    <li data-busca="${escaparHTML(busca)}">
                                        <div>
                                            <strong>${escaparHTML(e.livro?.titulo || "(livro removido)")}</strong>
                                            <span>${escaparHTML(e.usuario?.nome || "(aluno removido)")}</span>
                                            <span class="prazo prazo-${prazo.nivel}">${prazo.texto}</span>
                                        </div>
                                        <button type="button" class="btn-renovar" onclick="receberDevolucao(${e.id})">Receber</button>
                                    </li>`;
                            }).join("") : `<li class="texto-suave">Nenhum livro emprestado no momento.</li>`}
                        </ul>
                    </section>
                </div>

                <div class="stats-actions">
                    <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
                </div>
            </div>`;
    }

    function ligarBalcao(usuarios, livros) {
        const porTextoUsuario = new Map(usuarios.map(u => [opcaoUsuario(u), u]));
        const porTextoLivro = new Map(livros.map(l => [opcaoLivro(l), l]));

        document.getElementById("balcao-emprestimo").addEventListener("submit", async e => {
            e.preventDefault();
            const aluno = porTextoUsuario.get(document.getElementById("balcao-aluno").value);
            const livro = porTextoLivro.get(document.getElementById("balcao-livro").value);

            if (!aluno) return showToast("Escolha um aluno da lista", "warning");
            if (!livro) return showToast("Escolha um livro da lista", "warning");

            try {
                const resposta = await rpc("emprestar_pelo_balcao", {
                    p_solicitante_id: eu().id,
                    p_usuario_id: aluno.id,
                    p_livro_id: livro.id
                });
                showToast(resposta.message, "success");
                mostrarBalcao();
                if (typeof carregarRelatoriosEmprestimos === "function") carregarRelatoriosEmprestimos();
            } catch (erro) {
                showToast(erro.message, "error", 5000);
            }
        });

        document.getElementById("balcao-filtro").addEventListener("input", e => {
            const termo = e.target.value.trim().toLowerCase();
            document.querySelectorAll(".balcao-lista li[data-busca]").forEach(li => {
                li.hidden = termo && !li.dataset.busca.includes(termo);
            });
        });
    }

    // mantém o comportamento do botão Fechar existente e esquece o painel aberto
    const fecharOriginal = window.fecharAdminPanel;
    window.fecharAdminPanel = function () {
        estado.painelAtual = null;
        if (typeof fecharOriginal === "function") fecharOriginal();
        else document.getElementById("conteudo-area").innerHTML = "";
    };

    // esconde os botões da biblioteca para quem é aluno (o menu inteiro já fica oculto)
    if (!ehBiblioteca()) {
        window.mostrarPainelCompleto = window.mostrarBalcao = () => showToast("Área exclusiva da biblioteca", "warning");
    }
})();
