// home.js
let usuarioAtual = null;
let categoriaAtual = '';

document.addEventListener('DOMContentLoaded', async function() {
    // Verifica se usuário está logado
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    
    if (!usuarioLogado) {
        showToast('Faça login primeiro!', 'warning');
        window.location.href = '../login/index.html';
        return;
    }
    
    usuarioAtual = JSON.parse(usuarioLogado);
    
    // Mostra nome do usuário no menu (opcional)
    const contaBtn = document.getElementById('btn-conta');
    if (contaBtn) {
        contaBtn.textContent = `Olá, ${usuarioAtual.nome.split(' ')[0]}`;
    }

    await carregarCategorias();
    await carregarTodosLivros();
    configurarEventos();
    
    // Se for bibliotecário, mostra botão de adicionar livro
    if (usuarioAtual.tipo === 'bibliotecario') {
        const btnAdmin = document.getElementById('btn-adicionar-livro');
        if(btnAdmin) {
            btnAdmin.style.display = 'block';
        }
    }

    // Relatório de empréstimos: visível para bibliotecário E admin
    if (usuarioAtual.tipo === 'bibliotecario' || usuarioAtual.tipo === 'admin') {
        const relatoriosSection = document.getElementById('relatorios-section');
        if (relatoriosSection) {
            relatoriosSection.style.display = 'block';
            await carregarRelatoriosEmprestimos();
        }

        const btnSuspensoes = document.getElementById('btn-suspensoes');
        if (btnSuspensoes) {
            btnSuspensoes.style.display = 'inline-flex';
        }
    }

    // Adicionar botão para bibliotecário
    if (usuarioAtual.tipo === 'bibliotecario') {
        const btnContainer = document.getElementById('lembretes');
        if (btnContainer) {
            btnContainer.innerHTML = '<button id="btn-enviar-lembretes" class="btn-notificacao">📧 Enviar Lembretes</button>';
            document.getElementById('btn-enviar-lembretes').addEventListener('click', enviarLembretes);
        }
    }
   
    //se for bibliotecario ou admin, mostra menu de administracao
    if (usuarioAtual.tipo === 'admin' || usuarioAtual.tipo === 'bibliotecario') {
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) {
            adminMenu.style.display = 'block';
        }

        //se for admin, mostra opcoes extras
        if (usuarioAtual.tipo === 'admin') {
            const adminExtra = document.getElementById('admin-extra');
            if (adminExtra) {
                adminExtra.style.display = 'block';
            }
        }

    }

   
    


    
    document.getElementById("btn-adicionar-livro").addEventListener("click", function(e){
        e.preventDefault();
        window.location.href = "admin-livros.html";
    });
});

function carregarCategorias() {
    const grid = document.getElementById('category-grid');
    grid.innerHTML = LIBRO_CATEGORIAS.map(cat => `
        <button type="button" class="cat-card" data-categoria="${cat.chave}">
            <span>${cat.icone}</span> ${cat.nome}
            <small class="cat-contagem" data-contagem="${cat.chave}"></small>
        </button>
    `).join('');

    document.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', function() {
            buscarPorCategoria(this.getAttribute('data-categoria'));
        });
    });
}

// Mostra so as secoes pedidas e esconde as outras
const SECOES_DA_PAGINA = ['alertas-area', 'categorias-section', 'vitrines-section', 'livros-section',
    'emprestimos-section', 'reservas-section', 'conta-section'];
const SECOES_DO_INICIO = ['alertas-area', 'categorias-section', 'vitrines-section'];

function mostrarSecao(...ids) {
    SECOES_DA_PAGINA.forEach(id => {
        const secao = document.getElementById(id);
        if (secao) secao.style.display = ids.includes(id) ? '' : 'none';
    });
}
window.mostrarSecao = mostrarSecao;

function marcarMenuAtivo(idBotao) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('ativo', link.id === idBotao);
    });
}
window.marcarMenuAtivo = marcarMenuAtivo;

// Recarrega a lista que esta na tela (categoria, busca ou acervo completo)
function recarregarListagemAtual() {
    const termo = document.getElementById('pesquisa').value.trim();
    if (categoriaAtual) {
        buscarPorCategoria(categoriaAtual);
    } else if (termo) {
        buscarLivros();
    } else {
        carregarTodosLivros();
    }
}

async function buscarPorCategoria(categoria) {
    categoriaAtual = categoria;

    mostrarSecao('livros-section');
    marcarMenuAtivo(null);
    document.getElementById('livros-titulo').textContent = `${iconeCategoria(categoria)} ${nomeCategoria(categoria)}`;
    document.getElementById('livros-desc').textContent = `Livros da categoria ${nomeCategoria(categoria)}`;
    document.getElementById('btn-voltar').style.display = 'inline-block';
    
    const booksGrid = document.getElementById('books-grid');
    indicarCarregando(booksGrid, '<p style="text-align:center;">Carregando livros...</p>');
   
    try {
        const { data: livros, error } = await db
            .from('livros')
            .select('*')
            .eq('categoria', categoria)
            .order('id');

        if (error) throw error;

        if (livros.length === 0) {
            booksGrid.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <p>📭 Ainda não há livros em ${nomeCategoria(categoria)}.</p>
                    <p>Assim que a biblioteca cadastrar, eles aparecem aqui.</p>
                </div>
            `;
        } else {
            exibirLivros(livros);
        }
    } catch (error) {
        console.error('Erro:', error);
        booksGrid.innerHTML = '<p style="text-align:center;">Erro ao carregar livros</p>';
    }
}

async function buscarLivros() {
    const termo = document.getElementById('pesquisa').value.trim();
    
    if (!termo) {
        showToast('Digite um termo para buscar', 'warning');
        return;
    }
    
    categoriaAtual = '';
    mostrarSecao('livros-section');
    marcarMenuAtivo(null);
    document.getElementById('livros-titulo').textContent = `Resultados da busca`;
    document.getElementById('livros-desc').textContent = `Exibindo resultados para: "${termo}"`;
    document.getElementById('btn-voltar').style.display = 'inline-block';
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '<p style="text-align:center;">Buscando...</p>';
    
    try {
        const termoBusca = termo.replace(/[%,()]/g, '');
        // "História" tambem encontra a categoria "historia" (sem acento)
        const semAcento = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const categoriaPeloNome = LIBRO_CATEGORIAS.find(c => semAcento(c.nome) === semAcento(termoBusca));
        const filtros = [
            `titulo.ilike.%${termoBusca}%`,
            `autor.ilike.%${termoBusca}%`,
            `categoria.ilike.%${termoBusca}%`
        ];
        if (categoriaPeloNome) filtros.push(`categoria.eq.${categoriaPeloNome.chave}`);

        const { data: livros, error } = await db
            .from('livros')
            .select('*')
            .or(filtros.join(','))
            .order('id');

        if (error) throw error;

          if (livros.length === 0) {
            booksGrid.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <p>📭 Nenhum livro encontrado para "${escaparHTML(termo)}"</p>
                    <p>Tente o nome do autor, parte do título ou uma categoria.</p>
                </div>
            `;
        } else {
            exibirLivros(livros);
        }
        
    } catch (error) {
        console.error('Erro na busca:', error);
        booksGrid.innerHTML = '<p style="text-align:center;">❌ Erro ao buscar livros. Tente novamente em instantes.</p>';
    }
}

function exibirLivros(livros) {
    const booksGrid = document.getElementById('books-grid');
    
    const cores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];
    const icones = ['📖', '📘', '📙', '📕', '📗', '📓', '📔', '📒'];

    if(!livros || livros.length === 0) {
        booksGrid.innerHTML = '<p style="text-align:center;">📭 Nenhum livro disponível</p>';
        return;
    }
    
    booksGrid.innerHTML = livros.map((livro, index) => {
        const disponivel = livro.quantidade_disponivel > 0;
        const titulo = escaparHTML(livro.titulo);
        return `
        <div class="book-card" data-livro-id="${livro.id}" data-disponivel="${livro.quantidade_disponivel}">
            <button type="button" class="btn-favorito" data-favorito="${livro.id}"
                onclick="alternarFavorito(${livro.id}, this)" aria-label="Guardar ${titulo} em Quero ler" aria-pressed="false">♡</button>
            <div class="book-cover ${cores[index % cores.length]}" ${livro.capa_url ? 'style="padding:0;"' : ''}
                onclick="abrirDetalhesLivro(${livro.id})">
                ${livro.capa_url
                    ? `<img src="${escaparHTML(livro.capa_url)}" alt="Capa de ${titulo}" class="book-cover-img" loading="lazy" onerror="this.parentElement.innerHTML='${icones[index % icones.length]}'">`
                    : icones[index % icones.length]}
            </div>
            <div class="book-info">
                <h3>${titulo}</h3>
                <p class="author">${escaparHTML(livro.autor)}</p>
                <div class="nota-livro" data-nota="${livro.id}"></div>
                <span class="status ${disponivel ? 'disponivel' : 'ocupado'}">
                    ${disponivel ? `● Disponível (${livro.quantidade_disponivel})` : '● Todos emprestados'}
                </span>
                <div class="book-card-acoes">
                    <button type="button" class="btn-detalhes" onclick="abrirDetalhesLivro(${livro.id})">Ver detalhes</button>
                    ${disponivel
                        ? `<button class="btn-borrow" onclick="solicitarEmprestimo(${livro.id})">Pegar emprestado</button>`
                        : `<button class="btn-borrow btn-reservar" onclick="reservarLivro(${livro.id})">🔖 Reservar</button>`}
                </div>
            </div>
        </div>
    `;
    }).join('');

    if (window.aoExibirLivros) window.aoExibirLivros();
}

function mostrarInicio() {
    mostrarSecao(...SECOES_DO_INICIO);
    marcarMenuAtivo('btn-inicio');
    document.getElementById('pesquisa').value = '';
    categoriaAtual = '';
    if (window.atualizarInicio) window.atualizarInicio();
}

//
async function mostrarMeusEmprestimos() {
    mostrarSecao('emprestimos-section');
    marcarMenuAtivo('btn-emprestimos');
    
    const emprestimosGrid = document.getElementById('emprestimos-grid');
    indicarCarregando(emprestimosGrid, '<p style="text-align:center;">Carregando seus empréstimos...</p>');
    
    try {
        const { data: emprestimos, error } = await db.rpc('listar_meus_emprestimos', {
            p_usuario_id: usuarioAtual.id
        });

        if (error) throw error;
        
        if (emprestimos.length === 0) {
            emprestimosGrid.innerHTML = '<p style="text-align:center;">📭 Você não possui empréstimos ativos</p>';
            return;
        }
        
        const cores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];
        const icones = ['📖', '📘', '📙', '📕', '📗'];
        
        emprestimosGrid.innerHTML = emprestimos.map((emp, index) => {
        const dataPrevista = new Date(emp.data_prevista_devolucao);
        const ativo = emp.status === 'ativo';
        const prazo = ativo ? descreverPrazo(emp.data_prevista_devolucao) : null;
        const podeRenovar = ativo && emp.renovacoes_restantes > 0 && prazo.dias >= 0;
        const livroId = emp.livro_id || emp.livro?.id;
        
        return `
            <div class="book-card">
            <div class="book-cover ${cores[index % cores.length]}" ${emp.livro.capa_url ? 'style="padding:0;"' : ''}>
                ${emp.livro.capa_url
                    ? `<img src="${emp.livro.capa_url}" alt="Capa de ${emp.livro.titulo}" class="book-cover-img" onerror="this.parentElement.innerHTML='${icones[index % icones.length]}'">`
                    : icones[index % icones.length]}
            </div>
                <div class="book-info">
                    <h3>${emp.livro.titulo}</h3>
                    <p>Autor: ${emp.livro.autor}</p>
                    <p><small>Emprestado em: ${new Date(emp.data_emprestimo).toLocaleDateString('pt-BR')}</small></p>
                    <p><small>Data prevista: ${dataPrevista.toLocaleDateString('pt-BR')}</small></p>
                    <p><small>Renovações restantes: ${emp.renovacoes_restantes}</small></p>
                    ${prazo ? `<p class="prazo prazo-${prazo.nivel}">${prazo.texto}</p>` : ''}
                    <span class="status ${ativo ? 'disponivel' : 'ocupado'}">
                        ${ativo ? '● Ativo' : '● Devolvido'}
                    </span>
                    <p class="emprestimo-links">
                        ${livroId ? `<button type="button" class="btn-link" onclick="abrirDetalhesLivro(${livroId}, 'avaliar')">⭐ Avaliar</button>` : ''}
                        <button type="button" class="btn-link btn-link-perigo" onclick="deletarEmprestimo(${emp.id}, this)">Apagar registro</button>
                    </p>
                </div>
                <div class="livro-acoes">
                    ${emp.status === 'ativo' ? `
                        ${podeRenovar ? 
                            `<button onclick="renovarEmprestimo(${emp.id})" class="btn-renovar">🔄 Renovar (mais 7 dias)</button>` : 
                            `<button disabled class="btn-renovar disabled">${prazo.dias < 0 ? '⚠️ Atrasado: devolva o livro' : '❌ Sem renovações'}</button>`
                        }
                        <button onclick="devolverLivro(${emp.id})" class="btn-devolver">📚 Devolver</button>
                    ` : ''}
                </div>
            </div>
        `;
       }).join('');
        
        
    } catch (error) {
        console.error('Erro:', error);
        emprestimosGrid.innerHTML = '<p style="text-align:center;">❌ Erro ao carregar empréstimos</p>';
    }

    
}

// funcao mostrar minhas reservas
async function mostrarMinhasReservas() {
    mostrarSecao('reservas-section');
    marcarMenuAtivo('btn-reservas');

    const reservasGrid = document.getElementById('reservas-grid');
    indicarCarregando(reservasGrid, '<p style="text-align:center;">Carregando suas reservas...</p>');

    try {
        const { data: reservas, error } = await db.rpc('listar_minhas_reservas', {
            p_usuario_id: usuarioAtual.id
        });

        if (error) throw error;

        if (!reservas || reservas.length === 0) {
            reservasGrid.innerHTML = '<p style="text-align:center;">📭 Você não possui reservas no momento</p>';
            return;
        }

        reservasGrid.innerHTML = reservas.map((res) => {
            const disponivel = res.status === 'disponivel';
            return `
                <div class="book-card">
                    <div class="book-cover color-2" ${res.livro.capa_url ? 'style="padding:0;"' : ''}>
                        ${res.livro.capa_url
                            ? `<img src="${res.livro.capa_url}" alt="Capa de ${res.livro.titulo}" class="book-cover-img" onerror="this.parentElement.innerHTML='🔖'">`
                            : '🔖'}
                    </div>
                    <div class="book-info">
                        <h3>${res.livro.titulo}</h3>
                        <p>Autor: ${res.livro.autor}</p>
                        <p><small>Reservado em: ${new Date(res.data_reserva).toLocaleDateString('pt-BR')}</small></p>
                        <span class="status ${disponivel ? 'disponivel' : 'ocupado'}">
                            ${disponivel ? '● Disponível para retirada' : '● Aguardando devolução'}
                        </span>
                        <div class="livro-acoes">
                            <button onclick="cancelarReserva(${res.id})" class="btn-devolver">✖ Cancelar reserva</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro:', error);
        reservasGrid.innerHTML = '<p style="text-align:center;">❌ Erro ao carregar reservas</p>';
    }
}

window.reservarLivro = async function(livroId) {
    if (!await showConfirm('Esse livro não tem exemplar livre agora. Deseja entrar na fila de reserva? Avisamos por e-mail quando chegar a sua vez.', 'Reservar')) return;

    try {
        const { data, error } = await db.rpc('reservar_livro', {
            p_usuario_id: usuarioAtual.id,
            p_livro_id: livroId
        });

        if (error) throw error;

        showToast(data.message, 'success', 5000);
        if (data.usuario_email) {
            enviarEmail(data.usuario_email, `🔖 Reserva confirmada - ${data.livro_titulo}`,
                templateReservaConfirmada(data.usuario_nome, data.livro_titulo, data.posicao));
        }
        if (window.atualizarInicio) window.atualizarInicio();
    } catch (error) {
        showToast(error.message || 'Erro ao reservar livro', 'error');
    }
};

window.cancelarReserva = async function(reservaId) {
    if (!await showConfirm('Deseja cancelar essa reserva?', 'Cancelar reserva', 'Não')) return;

    try {
        const { data, error } = await db.rpc('cancelar_reserva', {
            p_usuario_id: usuarioAtual.id,
            p_reserva_id: reservaId
        });

        if (error) throw error;

        showToast(data.message, 'success');
        mostrarMinhasReservas();
    } catch (error) {
        showToast(error.message || 'Erro ao cancelar reserva', 'error');
    }
};


window.renovarEmprestimo = async function(emprestimoId) {
    if(!await showConfirm('Deseja renovar este empréstimo por mais 7 dias?', 'Renovar')) return;

    try {
        const { data, error } = await db.rpc('renovar_emprestimo', {
            p_usuario_id: usuarioAtual.id,
            p_emprestimo_id: emprestimoId
        });

        if (error) throw error;

        showToast(`Empréstimo renovado! Nova data: ${new Date(data.nova_data_devolucao).toLocaleDateString('pt-BR')} — Renovações restantes: ${data.renovacoes_restantes}`, 'success', 5000);

        enviarEmail(
            data.usuario_email,
            `🔄 Empréstimo renovado - ${data.livro_titulo}`,
            templateRenovacao(data.usuario_nome, data.livro_titulo, data.nova_data_devolucao, data.renovacoes_restantes)
        );

        mostrarMeusEmprestimos();
    } catch (error) {
        console.error('erro:', error);
        showToast(error.message || 'Erro ao renovar empréstimo', 'error');
    }
};

async function deletarEmprestimo(idEmprestimo, botaoClicado) {

    if(!await showConfirm("Tem certeza que deseja apagar este registro de empréstimo?", "Apagar", "Cancelar")){
        return;
    }
    try{
        const { error } = await db.rpc('apagar_emprestimo', {
            p_usuario_id: usuarioAtual.id,
            p_emprestimo_id: idEmprestimo
        });

        if (error) throw error;

        botaoClicado.closest('.book-card').remove();
        showToast("Empréstimo apagado com sucesso!", "success");
    } catch (error) {
        console.error("erro ao deletar:", error);
        showToast(error.message || "Erro ao apagar empréstimo.", "error");
    }
}

window.solicitarEmprestimo = async function(livroId) {
    if (!await showConfirm('Deseja pegar este livro emprestado?', 'Pegar emprestado')) return;

    try {
        const { data, error } = await db.rpc('pegar_emprestado', {
            p_usuario_id: usuarioAtual.id,
            p_livro_id: livroId
        });

        if (error) throw error;

        showToast(data.message, 'success');
        recarregarListagemAtual();
        if (window.atualizarInicio) window.atualizarInicio();
    } catch (error) {
        if (error.message && error.message.includes('limite')) {
            if (await showConfirm(`${error.message}. Deseja enviar uma solicitação para o bibliotecário aprovar esse empréstimo extra?`, 'Enviar solicitação')) {
                solicitarEmprestimoExtra(livroId);
            }
        } else {
            showToast(error.message || 'Erro ao solicitar empréstimo', 'error');
        }
    }
};

window.solicitarEmprestimoExtra = async function(livroId) {
    try {
        const { data, error } = await db.rpc('solicitar_emprestimo_extra', {
            p_usuario_id: usuarioAtual.id,
            p_livro_id: livroId
        });

        if (error) throw error;

        showToast(data.message, 'success');
    } catch (error) {
        showToast(error.message || 'Erro ao enviar solicitação', 'error');
    }
};

window.devolverLivro = async function(emprestimoId) {
    if (!await showConfirm('Confirmar devolução do livro?', 'Devolver')) return;

    try {
        const { data, error } = await db.rpc('devolver_livro', {
            p_usuario_id: usuarioAtual.id,
            p_emprestimo_id: emprestimoId
        });

        if (error) throw error;

        showToast(data.message, 'success');
        enviarEmailsDaDevolucao(data);

        mostrarMeusEmprestimos();
    } catch (error) {
        showToast(error.message || 'Erro ao devolver livro', 'error');
    }
};

async function carregarTodosLivros() {
    const booksGrid = document.getElementById("books-grid");
    indicarCarregando(booksGrid, '<p style="text-align:center;">Carregando livros...</p>');
    document.getElementById('livros-titulo').textContent = 'Acervo completo';
    document.getElementById('livros-desc').textContent = 'Todos os livros da biblioteca';

    try {
        const { data: livros, error } = await db.from('livros').select('*').order('id');

        if (error) throw error;

        if (livros.length === 0) {
            booksGrid.innerHTML = '<p style="text-align:center;">📭 Nenhum livro cadastrado ainda.</p>';
        } else {
            exibirLivros(livros);
        }

      
    } catch (error) {
        console.error("erro:", error);
        booksGrid.innerHTML = '<p style="text-align:center;">❌ Erro ao carregar livros</p>';
    }
}

async function carregarRelatoriosEmprestimos() {
    try {

        const { data: emprestimos, error } = await db.rpc('listar_meus_emprestimos_admin', {
            p_solicitante_id: usuarioAtual.id
        });

        if (error) throw error;

        const tabelaBody = document.querySelector("#tabela-emprestimos tbody");

        if (!tabelaBody) {
            console.warn("tabela de emprestimos nao encontrada no HTML");
            return;
        }

        tabelaBody.innerHTML = "";

        if (emprestimos.length === 0) {
            tabelaBody.innerHTML = '<tr><td colspan="4" class="tabela-vazia">📭 Nenhum empréstimo encontrado</td></tr>';
            return;
        }

        emprestimos.forEach(emp => {
            const linha = document.createElement("tr");
            const nomeUsuario = emp.usuario?.nome || emp.usuarios?.nome || 'sem nome';
            const tituloLivro = emp.livro?.titulo || emp.livros?.titulo || 'sem titulo';
            const isbnLivro = emp.livro?.isbn || emp.livros?.isbn || 'sem isbn';
            const status = emp.status || 'ativo';

            linha.innerHTML = `
                <td>${nomeUsuario}</td>
                <td>${tituloLivro}</td>
                <td>${isbnLivro}</td>
                <td><span class="status-badge status-${status}">${status}</span></td>
            `;
                
            tabelaBody.appendChild(linha);

        });

    } catch (error) {
        console.error("erro ao carregar relatorio:", error);
        const tabelaBody = document.querySelector("#tabela-emprestimos tbody");
        if (tabelaBody) {
            tabelaBody.innerHTML = '<tr><td colspan="4" class="tabela-vazia">❌ Erro ao carregar empréstimos</td></tr>'
        }
    }
           
}

// ========== FUNÇÃO CONFIGURAR EVENTOS ==========
function configurarEventos() {
    // Botão de busca
    const btnBuscar = document.getElementById('btn-buscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarLivros);
    }
    
    // Campo de pesquisa (tecla Enter)
    const pesquisa = document.getElementById('pesquisa');
    if (pesquisa) {
        pesquisa.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarLivros();
            }
        });
    }
    
    // Botão Início
    const btnInicio = document.getElementById('btn-inicio');
    if (btnInicio) {
        btnInicio.addEventListener('click', function(e) {
            e.preventDefault();
            mostrarInicio();
        });
    }
    
    // Botão Meus Empréstimos
    const btnEmprestimos = document.getElementById('btn-emprestimos');
    if (btnEmprestimos) {
        btnEmprestimos.addEventListener('click', function(e) {
            e.preventDefault();
            mostrarMeusEmprestimos();
        });
    }

    // Botão Minhas Reservas
    const btnReservas = document.getElementById('btn-reservas');
    if (btnReservas) {
        btnReservas.addEventListener('click', function(e) {
            e.preventDefault();
            mostrarMinhasReservas();
        });
    }
    
    // Botão Minha Conta
    const btnConta = document.getElementById('btn-conta');
    if (btnConta) {
        btnConta.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.mostrarMinhaConta) window.mostrarMinhaConta();
        });
    }

    // Botão Sair
    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('usuarioLogado');
            window.location.href = '../login/index.html';
        });
    }
    
    // Botões Voltar
    const btnVoltar = document.getElementById('btn-voltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', mostrarInicio);
    }
    
    const btnVoltarEmprestimos = document.getElementById('btn-voltar-emprestimos');
    if (btnVoltarEmprestimos) {
        btnVoltarEmprestimos.addEventListener('click', mostrarInicio);
    }

    const btnVoltarReservas = document.getElementById('btn-voltar-reservas');
    if (btnVoltarReservas) {
        btnVoltarReservas.addEventListener('click', mostrarInicio);
    }
}

//botao enviar lembretes: busca no Supabase quem vence em ate 3 dias e manda os e-mails
async function enviarLembretes () {
    const btn = document.getElementById('btn-enviar-lembretes');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
    }

    try {
        const lembretes = await rpc('listar_lembretes_devolucao', { p_solicitante_id: usuarioAtual.id });

        if (!lembretes.length) {
            showToast('Nenhum empréstimo vencendo nos próximos 3 dias.', 'info');
            return;
        }

        const resultados = await Promise.all(lembretes.map(item => enviarEmail(
            item.usuario_email,
            `📚 Lembrete: Prazo de devolução - ${item.livro_titulo}`,
            templateLembreteDevolucao(item.usuario_nome, item.livro_titulo, item.data_prevista_devolucao, Math.max(item.dias_restantes, 0))
        )));

        const enviados = resultados.filter(Boolean).length;
        showToast(`${enviados} de ${lembretes.length} lembrete(s) enviado(s) por e-mail.`, enviados ? 'success' : 'warning', 5000);
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao enviar lembretes', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📧 Enviar Lembretes';
        }
    }
}

// Função mostrarGerenciarUsuarios corrigida
// Gerenciar usuários: lista com busca, perfil e exclusão
let buscaUsuarios = '';

async function mostrarGerenciarUsuarios() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) return;

    indicarCarregando(conteudo, '<div class="admin-panel"><h2>👥 Gerenciar Usuários</h2><p>Carregando usuários...</p></div>');

    try {
        const { data: usuarios, error } = await db.rpc('listar_usuarios', {
            p_solicitante_id: usuarioAtual.id
        });
        if (error) throw error;

        const nomesPerfil = {
            aluno: ['aluno', 'alunos'],
            bibliotecario: ['bibliotecário', 'bibliotecários'],
            admin: ['admin', 'admins']
        };
        const contagem = ['aluno', 'bibliotecario', 'admin']
            .map(tipo => ({ tipo, total: usuarios.filter(u => u.tipo === tipo).length }))
            .filter(c => c.total > 0)
            .map(c => `${c.total} ${nomesPerfil[c.tipo][c.total === 1 ? 0 : 1]}`)
            .join(', ');

        conteudo.innerHTML = `
            <div class="admin-panel usuarios-painel">
                <div class="painel-cabecalho">
                    <div>
                        <h2>👥 Gerenciar Usuários</h2>
                        <p class="texto-suave">${usuarios.length} cadastrados: ${contagem}</p>
                    </div>
                    <label class="visualmente-oculto" for="busca-usuarios">Buscar usuário</label>
                    <input id="busca-usuarios" class="campo-busca" type="search" placeholder="Buscar por nome ou e-mail" value="${escaparHTML(buscaUsuarios)}">
                </div>
                <div class="tabela-scroll">
                    <table class="tabela-usuarios">
                        <thead>
                            <tr><th>Usuário</th><th>ID</th><th>Perfil</th><th>Cadastro</th><th><span class="visualmente-oculto">Ações</span></th></tr>
                        </thead>
                        <tbody>
                            ${usuarios.map(user => `
                                <tr data-busca="${escaparHTML(`${user.nome} ${user.email}`.toLowerCase())}">
                                    <td>
                                        <div class="usuario-celula">
                                            <span class="usuario-avatar" aria-hidden="true">${escaparHTML((user.nome || '?').charAt(0).toUpperCase())}</span>
                                            <div>
                                                <strong>${escaparHTML(user.nome)}${user.id === usuarioAtual.id ? ' <span class="selo-voce">você</span>' : ''}</strong>
                                                <span class="texto-suave">${escaparHTML(user.email)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="texto-suave">#${user.id}</td>
                                    <td>
                                        ${user.tipo === 'admin'
                                            ? '<span class="selo-perfil selo-perfil-admin" title="Só pode ser alterado direto no banco de dados">Admin</span>'
                                            : usuarioAtual.tipo !== 'admin'
                                            ? `<span class="selo-perfil">${user.tipo === 'bibliotecario' ? 'Bibliotecário' : 'Aluno'}</span>`
                                            : `<label class="visualmente-oculto" for="perfil-${user.id}">Perfil de ${escaparHTML(user.nome)}</label>
                                               <select id="perfil-${user.id}" class="select-tipo" onchange="alterarTipoUsuario(${user.id}, this.value)">
                                                    <option value="aluno" ${user.tipo === 'aluno' ? 'selected' : ''}>Aluno</option>
                                                    <option value="bibliotecario" ${user.tipo === 'bibliotecario' ? 'selected' : ''}>Bibliotecário</option>
                                               </select>`}
                                    </td>
                                    <td class="texto-suave">${user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td class="celula-acoes">
                                        ${usuarioAtual.tipo === 'admin' && user.id !== usuarioAtual.id
                                            ? `<button type="button" onclick="deletarUsuario(${user.id})" class="btn-excluir-linha">Excluir</button>`
                                            : ''}
                                    </td>
                                </tr>
                            `).join('')}
                            <tr class="linha-vazia" hidden><td colspan="5">Nenhum usuário encontrado para essa busca.</td></tr>
                        </tbody>
                    </table>
                </div>
                <button onclick="fecharAdminPanel()" class="btn-voltar" style="margin-top: 20px;">← Fechar</button>
            </div>
        `;

        const campoBusca = document.getElementById('busca-usuarios');
        const filtrar = () => {
            buscaUsuarios = campoBusca.value;
            const termo = buscaUsuarios.trim().toLowerCase();
            let visiveis = 0;
            conteudo.querySelectorAll('tr[data-busca]').forEach(linha => {
                linha.hidden = termo !== '' && !linha.dataset.busca.includes(termo);
                if (!linha.hidden) visiveis++;
            });
            conteudo.querySelector('.linha-vazia').hidden = visiveis > 0;
        };
        campoBusca.addEventListener('input', filtrar);
        filtrar();
    } catch (error) {
        console.error('Erro:', error);
        conteudo.innerHTML = `<div class="admin-panel"><h2>👥 Gerenciar Usuários</h2><p>❌ ${escaparHTML(error.message || 'Erro ao carregar usuários.')}</p>
            <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button></div>`;
    }
}

// Função para fechar o painel admin
function fecharAdminPanel() {
    const conteudo = document.getElementById('conteudo-area');
    if (conteudo) {
        conteudo.innerHTML = '';
    }
}

// Painel de estatísticas — construído do zero
async function mostrarEstatisticas() {
    const conteudo = document.getElementById('conteudo-area');
    
    if (!conteudo) {
        console.error("❌ Elemento 'conteudo-area' não encontrado!");
        return;
    }
    
    indicarCarregando(conteudo, '<div class="stats-loading">Carregando estatísticas...</div>');
    
    try {
        const { data: stats, error } = await db.rpc('obter_estatisticas', {
            p_solicitante_id: usuarioAtual.id
        });

        if (error) throw error;

        const totalCopias = stats.total_copias || 0;
        const copiasEmprestadas = stats.livros_emprestados || 0;
        const copiasDisponiveis = stats.copias_disponiveis ?? Math.max(totalCopias - copiasEmprestadas, 0);
        const utilizacao = totalCopias > 0 ? Math.round((copiasEmprestadas / totalCopias) * 100) : 0;

        // matemática do anel de progresso (SVG)
        const raio = 52;
        const circunferencia = 2 * Math.PI * raio;
        const offset = circunferencia * (1 - utilizacao / 100);

        const dataFormatada = stats.data
            ? new Date(stats.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '-';

        conteudo.innerHTML = `
            <div class="stats-dashboard">
                <div class="stats-header">
                    <div>
                        <h2>📊 Visão Geral da Biblioteca</h2>
                        <p class="stats-timestamp">Atualizado em ${dataFormatada}</p>
                    </div>
                    <button onclick="mostrarEstatisticas()" class="btn-refresh" title="Atualizar agora">⟳</button>
                </div>

                <div class="stats-hero">
                    <div class="stats-gauge">
                        <svg viewBox="0 0 120 120" class="gauge-svg">
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ec380b" />
                                    <stop offset="100%" stop-color="#764ba2" />
                                </linearGradient>
                            </defs>
                            <circle class="gauge-track" cx="60" cy="60" r="${raio}"></circle>
                            <circle class="gauge-fill" cx="60" cy="60" r="${raio}"
                                stroke-dasharray="${circunferencia}"
                                stroke-dashoffset="${circunferencia}"
                                data-offset="${offset}"></circle>
                        </svg>
                        <div class="gauge-center">
                            <span class="gauge-number">${utilizacao}%</span>
                            <span class="gauge-label">em uso</span>
                        </div>
                    </div>
                    <div class="stats-hero-text">
                        <h3>Taxa de utilização do acervo</h3>
                        <p>${copiasEmprestadas} de ${totalCopias} exemplares físicos estão emprestados agora.</p>
                        <div class="stats-composicao">
                            <div class="composicao-barra">
                                <div class="composicao-emprestado" style="width: ${utilizacao}%;"></div>
                            </div>
                            <div class="composicao-legenda">
                                <span><i class="bolinha bolinha-emprestado"></i> Emprestados (${copiasEmprestadas})</span>
                                <span><i class="bolinha bolinha-disponivel"></i> Disponíveis (${copiasDisponiveis})</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="stats-cards-grid">
                    <div class="stat-card-new">
                        <div class="stat-icon stat-icon-usuarios">👥</div>
                        <div class="stat-texto">
                            <span class="stat-value">${stats.total_usuarios}</span>
                            <span class="stat-label">Usuários cadastrados</span>
                        </div>
                    </div>
                    <div class="stat-card-new">
                        <div class="stat-icon stat-icon-acervo">📚</div>
                        <div class="stat-texto">
                            <span class="stat-value">${stats.total_livros}</span>
                            <span class="stat-label">Títulos no acervo</span>
                        </div>
                    </div>
                    <div class="stat-card-new">
                        <div class="stat-icon stat-icon-emprestimos">🔄</div>
                        <div class="stat-texto">
                            <span class="stat-value">${stats.emprestimos_ativos}</span>
                            <span class="stat-label">Empréstimos ativos</span>
                        </div>
                    </div>
                    <div class="stat-card-new">
                        <div class="stat-icon stat-icon-disponivel">✅</div>
                        <div class="stat-texto">
                            <span class="stat-value">${copiasDisponiveis}</span>
                            <span class="stat-label">Exemplares disponíveis</span>
                        </div>
                    </div>
                </div>

                <div class="stats-actions">
                    <button onclick="baixarRelatorioPDF()" class="btn-admin">📄 Baixar relatório em PDF</button>
                    <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
                </div>
            </div>
        `;

        // anima o anel de progresso depois de inserir no DOM
        requestAnimationFrame(() => {
            const aro = conteudo.querySelector('.gauge-fill');
            if (aro) {
                aro.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)';
                aro.style.strokeDashoffset = aro.dataset.offset;
            }
        });
        
    } catch (error) {
        console.error('Erro:', error);
        conteudo.innerHTML = '<p>❌ Erro ao carregar estatísticas. Tente novamente em instantes.</p>';
    }
}

// gera o relatorio de emprestimos em pdf direto no navegador (jsPDF + AutoTable)
window.baixarRelatorioPDF = async function() {
    try {
        const { data: emprestimos, error } = await db.rpc('listar_meus_emprestimos_admin', {
            p_solicitante_id: usuarioAtual.id
        });
        if (error) throw error;

        const { data: stats, error: statsError } = await db.rpc('obter_estatisticas', {
            p_solicitante_id: usuarioAtual.id
        });
        if (statsError) throw statsError;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const corPrimaria = [30, 58, 95];      // azul escuro
        const corAcento = [212, 165, 32];      // dourado
        const larguraPagina = doc.internal.pageSize.getWidth();

        // ---- Cabeçalho ----
        doc.setFillColor(...corPrimaria);
        doc.rect(0, 0, larguraPagina, 90, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('📚 Libro', 40, 40);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        doc.text('Relatório de Empréstimos', 40, 62);
        doc.setFontSize(9);
        doc.setTextColor(220, 220, 220);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 40, 78);

        // ---- Cartões de resumo ----
        const cartoes = [
            { titulo: 'Usuários', valor: stats.total_usuarios },
            { titulo: 'Livros no catálogo', valor: stats.total_livros },
            { titulo: 'Empréstimos ativos', valor: stats.emprestimos_ativos },
            { titulo: 'Cópias disponíveis', valor: stats.copias_disponiveis }
        ];
        const margemCartao = 40;
        const espacoCartao = 12;
        const larguraCartao = (larguraPagina - margemCartao * 2 - espacoCartao * 3) / 4;
        const yCartao = 112;

        cartoes.forEach((c, i) => {
            const x = margemCartao + i * (larguraCartao + espacoCartao);
            doc.setDrawColor(...corAcento);
            doc.setFillColor(248, 246, 240);
            doc.roundedRect(x, yCartao, larguraCartao, 54, 6, 6, 'FD');
            doc.setTextColor(...corPrimaria);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(String(c.valor), x + larguraCartao / 2, yCartao + 26, { align: 'center' });
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(90, 90, 90);
            doc.text(c.titulo, x + larguraCartao / 2, yCartao + 42, { align: 'center' });
        });

        // ---- Tabela de histórico ----
        const linhas = emprestimos.map((emp, i) => [
            i + 1,
            emp.livro?.titulo || '(livro removido)',
            emp.usuario?.nome || '(usuário removido)',
            emp.data_emprestimo ? new Date(emp.data_emprestimo).toLocaleDateString('pt-BR') : '-',
            emp.data_prevista_devolucao ? new Date(emp.data_prevista_devolucao).toLocaleDateString('pt-BR') : '-',
            emp.status === 'ativo' ? 'Ativo' : emp.status === 'devolvido' ? 'Devolvido' : 'Atrasado'
        ]);

        doc.autoTable({
            startY: yCartao + 74,
            head: [['#', 'Livro', 'Usuário', 'Emprestado em', 'Previsto', 'Status']],
            body: linhas.length ? linhas : [['-', 'Nenhum empréstimo registrado ainda.', '-', '-', '-', '-']],
            theme: 'striped',
            headStyles: { fillColor: corPrimaria, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 9, cellPadding: 6 },
            columnStyles: { 0: { cellWidth: 24, halign: 'center' } },
            margin: { left: 40, right: 40 },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 5) {
                    if (data.cell.raw === 'Atrasado') data.cell.styles.textColor = [180, 40, 40];
                    if (data.cell.raw === 'Ativo') data.cell.styles.textColor = [30, 120, 60];
                }
            }
        });

        doc.save('relatorio-emprestimos.pdf');
        showToast('Relatório gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar relatorio:', error);
        showToast(error.message || 'Erro ao gerar relatório em PDF', 'error');
    }
};

// mostra as solicitacoes pendentes de emprestimo extra (bibliotecario/admin)
async function mostrarSolicitacoes() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) return;

    indicarCarregando(conteudo, '<p>Carregando solicitações...</p>');

    try {
        const { data: solicitacoes, error } = await db.rpc('listar_solicitacoes_pendentes', {
            p_solicitante_id: usuarioAtual.id
        });

        if (error) throw error;

        if (solicitacoes.length === 0) {
            conteudo.innerHTML = `
                <div class="admin-panel">
                    <h2>📋 Solicitações de Empréstimo Extra</h2>
                    <p>📭 Nenhuma solicitação pendente no momento.</p>
                    <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
                </div>
            `;
            return;
        }

        const listaHtml = solicitacoes.map(sol => `
            <div class="solicitacao-card">
                <p><strong>${sol.usuario.nome}</strong> (${sol.usuario.email})</p>
                <p>📖 ${sol.livro.titulo} — ${sol.livro.autor}</p>
                <p><small>Solicitado em: ${new Date(sol.data_solicitacao).toLocaleString()}</small></p>
                <div class="livro-acoes">
                    <button onclick="responderSolicitacao(${sol.id}, 'aprovar')" class="btn-renovar">✅ Aprovar</button>
                    <button onclick="responderSolicitacao(${sol.id}, 'rejeitar')" class="btn-devolver">✖ Rejeitar</button>
                </div>
            </div>
        `).join('');

        conteudo.innerHTML = `
            <div class="admin-panel">
                <h2>📋 Solicitações de Empréstimo Extra</h2>
                ${listaHtml}
                <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
            </div>
        `;

    } catch (error) {
        console.error('Erro:', error);
        conteudo.innerHTML = '<p>❌ Erro ao carregar solicitações.</p>';
    }
}

window.responderSolicitacao = async function(id, acao) {
    if (!await showConfirm(acao === 'aprovar' ? 'Aprovar essa solicitação?' : 'Rejeitar essa solicitação?', acao === 'aprovar' ? 'Aprovar' : 'Rejeitar')) return;

    try {
        const funcao = acao === 'aprovar' ? 'aprovar_solicitacao' : 'rejeitar_solicitacao';
        const { data, error } = await db.rpc(funcao, {
            p_solicitante_id: usuarioAtual.id,
            p_solicitacao_id: id
        });

        if (error) throw error;

        showToast(data.message, 'success');
        mostrarSolicitacoes();
    } catch (error) {
        showToast(error.message || 'Erro ao responder solicitação', 'error');
    }
};

// Função para mostrar logs do sistema
// Logs do sistema: linha do tempo agrupada por dia, com filtro por tipo e busca
async function mostrarLogs() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) return;

    indicarCarregando(conteudo, '<div class="admin-panel"><h2>🔐 Logs do Sistema</h2><p>Carregando...</p></div>');

    try {
        const { data: logs, error } = await db.rpc('listar_logs', {
            p_solicitante_id: usuarioAtual.id
        });
        if (error) throw error;

        logs.forEach(log => { log.categoria = categoriaDoLog(log.acao); });

        const categoriasPresentes = CATEGORIAS_LOG
            .map(c => ({ ...c, total: logs.filter(l => l.categoria.id === c.id).length }))
            .filter(c => c.total > 0);
        const outros = logs.filter(l => l.categoria.id === 'outros').length;
        if (outros) categoriasPresentes.push({ id: 'outros', nome: 'Outros', icone: '📝', total: outros });

        conteudo.innerHTML = `
            <div class="admin-panel logs-painel">
                <div class="painel-cabecalho">
                    <div>
                        <h2>🔐 Logs do Sistema</h2>
                        <p class="texto-suave">Últimas ${logs.length} ações registradas</p>
                    </div>
                    <div class="logs-controles">
                        <label class="visualmente-oculto" for="periodo-logs">Período</label>
                        <select id="periodo-logs" class="select-tipo">
                            <option value="hoje">Hoje</option>
                            <option value="7" selected>Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="todos">Tudo</option>
                        </select>
                        <label class="visualmente-oculto" for="busca-logs">Buscar nos logs</label>
                        <input id="busca-logs" class="campo-busca" type="search" placeholder="Buscar por usuário, ação ou detalhe">
                    </div>
                </div>

                <div class="logs-filtros" role="group" aria-label="Filtrar por tipo de ação">
                    <button type="button" class="logs-filtro" data-categoria="todas" aria-pressed="true">Todas <span>${logs.length}</span></button>
                    ${categoriasPresentes.map(c => `
                        <button type="button" class="logs-filtro" data-categoria="${c.id}" aria-pressed="false">${c.icone} ${c.nome} <span>${c.total}</span></button>
                    `).join('')}
                </div>

                <p id="logs-contagem" class="texto-suave logs-contagem"></p>
                <div id="logs-lista" class="logs-lista" tabindex="0" aria-label="Lista de ações registradas"></div>

                <button onclick="fecharAdminPanel()" class="btn-voltar" style="margin-top: 20px;">← Fechar</button>
            </div>
        `;

        let categoriaEscolhida = 'todas';
        const campoBusca = document.getElementById('busca-logs');
        const campoPeriodo = document.getElementById('periodo-logs');

        // "hoje" = só hoje; "7"/"30" = últimos dias; "todos" = sem limite
        const dentroDoPeriodo = log => {
            const periodo = campoPeriodo.value;
            if (periodo === 'todos') return true;
            const dias = diasAte(log.created_at);
            return periodo === 'hoje' ? dias === 0 : dias >= -Number(periodo);
        };

        const desenhar = () => {
            // os números de cada categoria acompanham o período escolhido
            const doPeriodo = logs.filter(dentroDoPeriodo);
            conteudo.querySelectorAll('.logs-filtro').forEach(botao => {
                const cat = botao.dataset.categoria;
                botao.querySelector('span').textContent = cat === 'todas'
                    ? doPeriodo.length
                    : doPeriodo.filter(l => l.categoria.id === cat).length;
            });

            const termo = campoBusca.value.trim().toLowerCase();
            const filtrados = doPeriodo.filter(log =>
                (categoriaEscolhida === 'todas' || log.categoria.id === categoriaEscolhida) &&
                (termo === '' || `${log.usuario_nome || ''} ${log.acao || ''} ${log.detalhes || ''}`.toLowerCase().includes(termo))
            );

            document.getElementById('logs-contagem').textContent =
                `Mostrando ${filtrados.length} de ${logs.length} ações`;

            const lista = document.getElementById('logs-lista');
            lista.scrollTop = 0;
            if (!filtrados.length) {
                lista.innerHTML = `<p class="logs-vazio">${logs.length ? 'Nenhuma ação encontrada nesse período ou filtro.' : '📭 Nenhum log registrado ainda.'}</p>`;
                return;
            }

            lista.innerHTML = agruparPorDia(filtrados, log => log.created_at).map(grupo => `
                <section class="logs-dia">
                    <h3>${grupo.rotulo} <span>${grupo.itens.length}</span></h3>
                    <ol class="logs-itens">
                        ${grupo.itens.map(log => {
                            const quando = new Date(log.created_at);
                            return `
                                <li class="log-item log-${log.categoria.id}">
                                    <span class="log-icone" aria-hidden="true">${log.categoria.icone}</span>
                                    <div class="log-texto">
                                        <p class="log-acao">${escaparHTML(log.acao)}</p>
                                        <p class="log-detalhe"><strong>${escaparHTML(log.usuario_nome || '(desconhecido)')}</strong>${log.detalhes ? ` <span>${escaparHTML(log.detalhes)}</span>` : ''}</p>
                                    </div>
                                    <time datetime="${quando.toISOString()}" title="${quando.toLocaleString('pt-BR')}">${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                </li>`;
                        }).join('')}
                    </ol>
                </section>
            `).join('');
        };

        conteudo.querySelectorAll('.logs-filtro').forEach(botao => {
            botao.addEventListener('click', () => {
                categoriaEscolhida = botao.dataset.categoria;
                conteudo.querySelectorAll('.logs-filtro').forEach(b => b.setAttribute('aria-pressed', String(b === botao)));
                desenhar();
            });
        });
        campoBusca.addEventListener('input', desenhar);
        campoPeriodo.addEventListener('change', desenhar);
        desenhar();
    } catch (error) {
        conteudo.innerHTML = `
            <div class="admin-panel">
                <h2>🔐 Logs do Sistema</h2>
                <p>❌ ${escaparHTML(error.message || 'Erro ao carregar logs.')}</p>
                <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
            </div>
        `;
    }
}

// Função para exportar backup completo do banco (JSON)
async function mostrarBackup() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) {
        console.error("Elemento 'conteudo-area' não encontrado");
        return;
    }

    conteudo.innerHTML = `
        <div class="admin-panel">
            <h2>💾 Backup do Sistema</h2>
            <p>Gera um arquivo .json com todos os dados atuais do banco (usuários, livros, empréstimos, reservas, solicitações e suspensões).</p>
            <button onclick="baixarBackup()" class="btn-admin">⬇️ Baixar Backup Agora</button>
            <button onclick="fecharAdminPanel()" class="btn-voltar" style="margin-left: 10px;">← Fechar</button>
        </div>
    `;
}

window.baixarBackup = async function() {
    try {
        const { data, error } = await db.rpc('exportar_backup', {
            p_solicitante_id: usuarioAtual.id
        });

        if (error) throw error;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-libro-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        showToast('Backup baixado com sucesso!', 'success');
    } catch (error) {
        showToast(error.message || 'Erro ao gerar backup (apenas administradores podem exportar)', 'error');
    }
};

// ========== FUNÇÕES DE ADMIN  ==========

// Função para alterar tipo de usuário
window.alterarTipoUsuario = async function(userId, novoTipo) {
    if (!await showConfirm(`Tem certeza que quer alterar este usuário para ${novoTipo.toUpperCase()}?`, 'Alterar')) {
        await mostrarGerenciarUsuarios();
        return;
    }

    try {
        const { data, error } = await db.rpc('alterar_tipo_usuario', {
            p_solicitante_id: usuarioAtual.id,
            p_usuario_id: userId,
            p_novo_tipo: novoTipo
        });

        if (error) throw error;

        showToast(data.message, 'success');
        await mostrarGerenciarUsuarios();
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao alterar tipo', 'error');
        await mostrarGerenciarUsuarios();
    }
};

// Função para deletar usuário
window.deletarUsuario = async function(userId) {
    if (userId === usuarioAtual.id) {
        showToast('Você não pode deletar seu próprio usuário!', 'error');
        return;
    }

    if (!await showConfirm('⚠️ ATENÇÃO! Deseja realmente excluir este usuário permanentemente?', 'Excluir', 'Cancelar')) return;

    try {
        const { data, error } = await db.rpc('deletar_usuario', {
            p_solicitante_id: usuarioAtual.id,
            p_usuario_id: userId
        });

        if (error) throw error;

        showToast(data.message, 'success');
        await mostrarGerenciarUsuarios();
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao excluir usuário', 'error');
    }
};

// Função para fechar o painel admin
function fecharAdminPanel() {
    const conteudo = document.getElementById('conteudo-area');
    if (conteudo) {
        conteudo.innerHTML = '';
    }
}
