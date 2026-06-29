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

   
    


    
    // Carrega as categorias
    
    
    // Configura eventos
    document.getElementById('btn-buscar').addEventListener('click', buscarLivros);
    document.getElementById('pesquisa').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
           buscarLivros();
        }
    });
    
    document.getElementById('btn-inicio').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarInicio();
    });
    
    document.getElementById('btn-emprestimos').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarMeusEmprestimos();
    });
    
    document.getElementById('btn-sair').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('usuarioLogado');
        window.location.href = '../login/index.html';
    });
    
    document.getElementById("btn-adicionar-livro").addEventListener("click", function(e){
        e.preventDefault();
        window.location.href = "admin-livros.html";
    });

    //remover elemento
    const botaoDelete =  document.getElementById("apagar");
    const elementoParaRemover = document.getElementById("book-card");

    botaoDelete.addEventListener('click', () => {
        elementoParaRemover.remove();
    });



    document.getElementById('btn-voltar').addEventListener('click', mostrarInicio);
    document.getElementById('btn-voltar-emprestimos').addEventListener('click', mostrarInicio);

    // Executa após a página e os livros carregarem
    document.addEventListener('click', function(event) {
    // 1. Verifica se o que foi clicado foi um link de sinopse
    if (event.target.classList.contains('link-sinopse')) {
        event.preventDefault(); // Impede a página de pular para o topo

        const linkClicado = event.target;
        const sinopseTexto = linkClicado.dataset.sinopse;

        // 2. Captura os elementos do balão
        const balao = document.getElementById('notificacao-sinopse');
        const spanTexto = document.getElementById('texto-da-sinopse');

        // 3. Altera o texto e mostra o balão
        spanTexto.textContent = sinopseTexto || "Este livro não possui descrição cadastrada.";
        balao.classList.add('mostrar');
    }
});

// 2. Lógica para fechar o balão ao clicar no 'X'
document.getElementById('fechar-balao').addEventListener('click', () => {
    document.getElementById('notificacao-sinopse').classList.remove('mostrar');
});

});

function carregarCategorias() {
    const categorias = [
        { nome: "Literatura Brasileira", icone: "📚", categoria: "literatura" },
        { nome: "Biologia Celular", icone: "🧬", categoria: "ciencias" },
        { nome: "Economia", icone: "📊", categoria: "economia" },
        { nome: "Direito Civil", icone: "⚖️", categoria: "direito" },
        { nome: "Programação", icone: "💻", categoria: "tecnologia" },
        { nome: "Engenharia", icone: "📐", categoria: "engenharia" },
        { nome: "Filosofia", icone: "🎭", categoria: "filosofia" },
        { nome: "Medicina", icone: "🏥", categoria: "medicina" },
        { nome: "História Universal", icone: "🏛️", categoria: "historia" },
        { nome: "Culinária & Gastronomia", icone: "👨‍🍳", categoria: "culinaria" }
    ];
    
    const grid = document.getElementById('category-grid');
    grid.innerHTML = categorias.map(cat => `
        <div class="cat-card" data-categoria="${cat.categoria}">
            <span>${cat.icone}</span> ${cat.nome}
        </div>
    `).join('');
    
    // Adiciona evento de clique nas categorias
    document.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', function() {
            const categoria = this.getAttribute('data-categoria');
            buscarPorCategoria(categoria);
        });
    });
}

async function buscarPorCategoria(categoria) {
    categoriaAtual = categoria;
    const nomesCategorias = {
        'literatura': 'Literatura Brasileira',
        'ciencias': 'Ciências',
        'economia': 'Economia',
        'direito': 'Direito',
        'tecnologia': 'Tecnologia',
        'engenharia': 'Engenharia',
        'filosofia': '🎭 Filosofia',
        'medicina': 'Medicina',
        'historia': 'História',
        'culinaria': 'Culinária'
    };
    
    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'block';
    document.getElementById('livros-titulo').textContent = `${nomesCategorias[categoria] || categoria}`;
    document.getElementById('livros-desc').textContent = `Livros disponíveis na categoria`;
    document.getElementById('btn-voltar').style.display = 'inline-block';
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '<p style="text-align:center;">Carregando livros...</p>';
   
    try {
        const response = await fetch(`/livros/categoria/${categoria}`);

        if(!response.ok) {
            throw new Error (`HTTP ${response.status}`);
        }
        const livros = await response.json();

        if(!Array.isArray(livros)) {
            console.error("resposta nao e array", livros);
            booksGrid.innerHTML = '<p style="text-align:center;">❌ Erro: Dados inválidos do servidor</p>';
            return;
        }

        //exibirLivros(livros);

        if (livros.length === 0) {
            booksGrid.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <p>📭 Nenhum livro encontrado na categoria "${nomesCategorias[categoria] || categoria}"</p>
                    <p>Você precisa cadastrar livros com esta categoria.</p>
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
    
    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'block';
    document.getElementById('livros-titulo').textContent = `Resultados da busca`;
    document.getElementById('livros-desc').textContent = `Exibindo resultados para: "${termo}"`;
    document.getElementById('btn-voltar').style.display = 'inline-block';
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '<p style="text-align:center;">Buscando...</p>';
    
    try {
        const response = await fetch(`/livros/buscar/${encodeURIComponent(termo)}`);
        
        
        if (!response.ok) {
            throw new Error("erro na busca");
        }

        const livros = await response.json();

        console.log("livros encontrados:", livros);

          if (livros.length === 0) {
            booksGrid.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <p>📭 Nenhum livro encontrado para "${termo}"</p>
                    <p>Tente outro termo ou verifique se já existem livros cadastrados.</p>
                </div>
            `;
        } else {
            exibirLivros(livros);
        }
        
    } catch (error) {
        console.error('Erro na busca:', error);
        booksGrid.innerHTML = '<p style="text-align:center;">❌ Erro ao buscar livros. Verifique se o servidor está rodando.</p>';
    }
}

function exibirLivros(livros) {
    const booksGrid = document.getElementById('books-grid');
    
    const cores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];
    const icones = ['📖', '📘', '📙', '📕', '📗', '📓', '📔', '📒'];

    if(!livros || livros.lenght === 0) {
        booksGrid.innerHTML = '<p style="text-align:center;"> nenhum livro disponivel';
        return;
    }
    
    booksGrid.innerHTML = livros.map((livro, index) => `
        <div class="book-card">
            <div class="book-cover ${cores[index % cores.length]}" ${livro.capa_url ? 'style="padding:0;"' : ''}>
                ${livro.capa_url
                    ? `<img src="${livro.capa_url}" alt="Capa de ${livro.titulo}" class="book-cover-img" onerror="this.parentElement.innerHTML='${icones[index % icones.length]}'">`
                    : icones[index % icones.length]}
            </div>
            <div class="book-info">
                <h3>${livro.titulo}</h3>
                <p class="author">${livro.autor}</p>
                <div class="livro-item">
                    <!-- O link que aciona a notificação -->
                    <a href="#" class="link-sinopse" data-sinopse="${livro.descricao}">
                        📖 ${livro.titulo}
                    </a>
                </div>
                <span class="status ${livro.quantidade_disponivel > 0 ? 'disponivel' : 'ocupado'}">
                    ${livro.quantidade_disponivel > 0 ? '● Disponível' : '● Emprestado'}
                </span>
                ${livro.quantidade_disponivel > 0 ? 
                    `<button class="btn-borrow" onclick="solicitarEmprestimo(${livro.id})">Pegar Empréstimo</button>` : 
                    `<button class="btn-borrow btn-reservar" onclick="reservarLivro(${livro.id})">🔖 Reservar</button>`}
            </div>
        </div>
    `).join('');
}

function mostrarInicio() {
    document.getElementById('categorias-section').style.display = 'block';
    document.getElementById('livros-section').style.display = 'none';
    document.getElementById('emprestimos-section').style.display = 'none';
    const reservasSection = document.getElementById('reservas-section');
    if (reservasSection) reservasSection.style.display = 'none';
    document.getElementById('pesquisa').value = '';
    categoriaAtual = '';
}

//
async function mostrarMeusEmprestimos() {
    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'none';
    document.getElementById('emprestimos-section').style.display = 'block';
    const reservasSection = document.getElementById('reservas-section');
    if (reservasSection) reservasSection.style.display = 'none';
    
    const emprestimosGrid = document.getElementById('emprestimos-grid');
    emprestimosGrid.innerHTML = '<p style="text-align:center;">Carregando seus empréstimos...</p>';
    
    try {
        const response = await fetch(`/usuarios/${usuarioAtual.id}/emprestimos`);
        const emprestimos = await response.json();
        
        if (emprestimos.length === 0) {
            emprestimosGrid.innerHTML = '<p style="text-align:center;">📭 Você não possui empréstimos ativos</p>';
            return;
        }
        
        const cores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];
        const icones = ['📖', '📘', '📙', '📕', '📗'];
        
        emprestimosGrid.innerHTML = emprestimos.map((emp, index) => {
        const dataPrevista = new Date(emp.data_prevista_devolucao);
        const hoje = new Date();
        const podeRenovar = emp.status === 'ativo' && emp.renovacoes_restantes > 0;
        
        return `
            <div class="book-card">
            <div class="book-cover ${cores[index % cores.length]}">${icones[index % icones.length]}</div>
                <div class="book-info">
                    <h3>${emp.livro.titulo}</h3>
                    <p>Autor: ${emp.livro.autor}</p>
                    <p><small>Emprestado em: ${new Date(emp.data_emprestimo).toLocaleDateString()}</small></p>
                    <p><small>Data prevista: ${dataPrevista.toLocaleDateString()}</small></p>
                    <p><small>Renovações restantes: ${emp.renovacoes_restantes}</small></p>
                    <p><small><button onclick="deletarEmprestimo(${emp.id}, this)">Apagar</button></small></p>
                    <span class="status ${emp.status === 'ativo' ? 'disponivel' : 'ocupado'}">
                        ${emp.status === 'ativo' ? '● Ativo' : '● Devolvido'}
                    </span>
                </div>
                <div class="livro-acoes">
                    ${emp.status === 'ativo' ? `
                        ${podeRenovar ? 
                            `<button onclick="renovarEmprestimo(${emp.id})" class="btn-renovar">🔄 Renovar (mais 7 dias)</button>` : 
                            `<button disabled class="btn-renovar disabled">❌ Sem renovações</button>`
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
    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'none';
    document.getElementById('emprestimos-section').style.display = 'none';
    document.getElementById('reservas-section').style.display = 'block';

    const reservasGrid = document.getElementById('reservas-grid');
    reservasGrid.innerHTML = '<p style="text-align:center;">Carregando suas reservas...</p>';

    try {
        const response = await fetch(`/usuarios/${usuarioAtual.id}/reservas`);
        const reservas = await response.json();

        if (!reservas || reservas.length === 0) {
            reservasGrid.innerHTML = '<p style="text-align:center;">📭 Você não possui reservas no momento</p>';
            return;
        }

        reservasGrid.innerHTML = reservas.map((res) => {
            const disponivel = res.status === 'disponivel';
            return `
                <div class="book-card">
                    <div class="book-cover color-2">🔖</div>
                    <div class="book-info">
                        <h3>${res.livro.titulo}</h3>
                        <p>Autor: ${res.livro.autor}</p>
                        <p><small>Reservado em: ${new Date(res.data_reserva).toLocaleDateString()}</small></p>
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
    if (!await showConfirm('Esse livro está indisponível agora. Deseja reservar para quando ele voltar?', 'Reservar')) return;

    try {
        const response = await fetch('/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioAtual.id, livro_id: livroId })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Reserva feita! Você será avisado em Minhas Reservas quando o livro voltar.', 'success');
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        showToast('Erro ao reservar livro', 'error');
    }
};

window.cancelarReserva = async function(reservaId) {
    if (!await showConfirm('Deseja cancelar essa reserva?', 'Cancelar reserva', 'Não')) return;

    try {
        const response = await fetch(`/reservas/${reservaId}`, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            showToast('Reserva cancelada', 'success');
            mostrarMinhasReservas();
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        showToast('Erro ao cancelar reserva', 'error');
    }
};


window.renovarEmprestimo = async function(emprestimoId) {
    if(!await showConfirm('Deseja renovar este empréstimo por mais 7 dias?', 'Renovar')) return;

    try {
        const response = await fetch(`/emprestimos/${emprestimoId}/renovar`,{
            method: 'PUT'
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Empréstimo renovado! Nova data: ${new Date(data.nova_data_devolucao).toLocaleDateString()} — Renovações restantes: ${data.renovacoes_restantes}`, 'success', 5000);
            mostrarMeusEmprestimos(); //recarrega a lista
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        console.error('erro:', error);
        showToast('Erro ao renovar empréstimo', 'error');
    }
};

async function deletarEmprestimo(idEmprestimo, botaoClicado) {
    
    if(!await showConfirm("Tem certeza que deseja apagar este registro de empréstimo?", "Apagar", "Cancelar")){
        return;
    }
    try{
        const response = await fetch(`/emprestimos/${idEmprestimo}`,{
            method: 'DELETE'
        });

        if(response.ok){
            botaoClicado.closest('.book-card').remove();
            showToast("Empréstimo apagado com sucesso!", "success");
        } else {
            showToast("Não foi possível apagar empréstimo no servidor.", "error");
        }
    } catch (error) {
        console.error("erro ao deletar:", error);
        showToast("Erro de conexão ao tentar apagar empréstimo.", "error");
    }
}

window.solicitarEmprestimo = async function(livroId) {
    const dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() + 7);
    
    if (!await showConfirm('Deseja pegar este livro emprestado?', 'Pegar emprestado')) return;
    
    try {
        const response = await fetch('/emprestimos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuarioAtual.id,
                livro_id: livroId,
                data_devolucao_prevista: dataDevolucao.toISOString().split('T')[0]
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Empréstimo realizado! Devolva em até 7 dias.', 'success');
            if (categoriaAtual) {
                buscarPorCategoria(categoriaAtual);
            } else {
                buscarLivros();
            }
        } else if (data.error && data.error.includes('limite')) {
            //usuario atingiu o limite de livros simultaneos: oferece solicitar aprovacao
            if (await showConfirm(`${data.error}. Deseja enviar uma solicitação para o bibliotecário aprovar esse empréstimo extra?`, 'Enviar solicitação')) {
                solicitarEmprestimoExtra(livroId);
            }
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        showToast('Erro ao solicitar empréstimo', 'error');
    }
};

window.solicitarEmprestimoExtra = async function(livroId) {
    try {
        const response = await fetch('/solicitacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioAtual.id, livro_id: livroId })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Solicitação enviada! Aguarde a aprovação do bibliotecário.', 'success');
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        showToast('Erro ao enviar solicitação', 'error');
    }
};

window.devolverLivro = async function(emprestimoId) {
    if (!await showConfirm('Confirmar devolução do livro?', 'Devolver')) return;
    
    try {
        const response = await fetch(`/emprestimos/${emprestimoId}/devolver`, {
            method: 'PUT'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Livro devolvido com sucesso!', 'success');
            mostrarMeusEmprestimos();
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        showToast('Erro ao devolver livro', 'error');
    }
};

async function carregarTodosLivros() {
    const booksGrid = document.getElementById("books-grid");
    booksGrid.innerHTML = '<p style="text-align:center;"> carregando livros...</p>';

    try {
        const response = await fetch("/livros");
        const livros = await response.json();

        if (livros.lenght === 0) {
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

        const resposta = await fetch("/emprestimos");

        if(!resposta.ok) {
            throw new Error("erro ao buscar emprestimos");
        }

        const emprestimos = await resposta.json();
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

//botao enviar lembretes
async function enviarLembretes () {
    const btn = document.getElementById('btn-enviar-lembretes');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
    }

    try {
        const response = await fetch('/notificacoes/verificar');

        const data = await response.json();

        showToast(data.message, 'info', 5000);
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao enviar notificações', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📧 Enviar Lembretes';
        }
    }
}

// Função mostrarGerenciarUsuarios corrigida
async function mostrarGerenciarUsuarios() {
    const conteudo = document.getElementById('conteudo-area');
    
    // VERIFICA SE O ELEMENTO EXISTE
    if (!conteudo) {
        console.error("❌ Elemento 'conteudo-area' não encontrado no HTML!");
        showToast('Erro interno: elemento de conteúdo não encontrado', 'error');
        return;
    }
    
    conteudo.innerHTML = '<p>Carregando usuários...</p>';
    
    try {
        const response = await fetch('/admin/usuarios', {
            headers: { 'usuario-id': usuarioAtual.id }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar');
        }
        
        const usuarios = await response.json();
        
        conteudo.innerHTML = `
            <div class="admin-panel">
                <h2>👥 Gerenciar Usuários</h2>
                <div style="overflow-x: auto;">
                    <table class="tabela-usuarios">
                        <thead>
                            <tr><th>ID</th><th>Nome</th><th>Email</th><th>Tipo</th><th>Ações</th></tr>
                        </thead>
                        <tbody>
                            ${usuarios.map(user => `
                                <tr>
                                    <td>${user.id}</td>
                                    <td>${user.nome}</td>
                                    <td>${user.email}</td>
                                    <td>
                                        <select onchange="alterarTipoUsuario(${user.id}, this.value)">
                                            <option value="aluno" ${user.tipo === 'aluno' ? 'selected' : ''}>📖 Aluno</option>
                                            <option value="bibliotecario" ${user.tipo === 'bibliotecario' ? 'selected' : ''}>📚 Bibliotecário</option>
                                            <option value="admin" ${user.tipo === 'admin' ? 'selected' : ''}>👑 Admin</option>
                                        </select>
                                    </td>
                                    <td><button onclick="deletarUsuario(${user.id})" class="btn-danger">🗑️ Excluir</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <button onclick="fecharAdminPanel()" class="btn-voltar" style="margin-top: 20px;">← Fechar</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Erro:', error);
        conteudo.innerHTML = '<p>❌ Erro ao carregar usuários. Verifique se o backend está rodando.</p>';
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
    
    conteudo.innerHTML = '<div class="stats-loading">Carregando estatísticas...</div>';
    
    try {
        const response = await fetch('/admin/estatisticas', {
            headers: { 'usuario-id': usuarioAtual.id }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }
        
        const stats = await response.json();

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
        conteudo.innerHTML = '<p>❌ Erro ao carregar estatísticas. Verifique se o backend está rodando.</p>';
    }
}

// baixa o relatorio de emprestimos em pdf (usa fetch + blob porque a rota exige cabecalho de autenticacao)
window.baixarRelatorioPDF = async function() {
    try {
        const response = await fetch('/relatorio/emprestimos/pdf', {
            headers: { 'usuario-id': usuarioAtual.id }
        });

        if (!response.ok) {
            showToast('Não foi possível gerar o relatório', 'error');
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'relatorio-emprestimos.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao baixar relatorio:', error);
        showToast('Erro ao baixar relatório em PDF', 'error');
    }
};

// mostra as solicitacoes pendentes de emprestimo extra (bibliotecario/admin)
async function mostrarSolicitacoes() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) return;

    conteudo.innerHTML = '<p>Carregando solicitações...</p>';

    try {
        const response = await fetch('/solicitacoes', {
            headers: { 'usuario-id': usuarioAtual.id }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar solicitações');
        }

        const solicitacoes = await response.json();

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
        const response = await fetch(`/solicitacoes/${id}/${acao}`, {
            method: 'PUT',
            headers: { 'usuario-id': usuarioAtual.id }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            mostrarSolicitacoes();
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        showToast('Erro ao responder solicitação', 'error');
    }
};

// Função para mostrar logs (placeholder)
function mostrarLogs() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) {
        console.error("Elemento 'conteudo-area' não encontrado");
        return;
    }
    
    conteudo.innerHTML = `
        <div class="admin-panel">
            <h2>🔐 Logs do Sistema</h2>
            <p>Funcionalidade em desenvolvimento.</p>
            <p>Em breve: histórico de ações de usuários, empréstimos, etc.</p>
            <button onclick="mostrarGerenciarUsuarios()" class="btn-voltar">← Voltar</button>
        </div>
    `;
}

// Função para mostrar backup (placeholder)
function mostrarBackup() {
    const conteudo = document.getElementById('conteudo-area');
    if (!conteudo) {
        console.error("Elemento 'conteudo-area' não encontrado");
        return;
    }
    
    conteudo.innerHTML = `
        <div class="admin-panel">
            <h2>💾 Backup do Sistema</h2>
            <p>Funcionalidade em desenvolvimento.</p>
            <p>Em breve: exportar dados, backup do banco, etc.</p>
            <button onclick="mostrarGerenciarUsuarios()" class="btn-voltar">← Voltar</button>
        </div>
    `;
}

// ========== FUNÇÕES DE ADMIN  ==========

// Função para alterar tipo de usuário
window.alterarTipoUsuario = async function(userId, novoTipo) {
    console.log("Alterando usuário:", userId, "para:", novoTipo);
    
    if (!await showConfirm(`Tem certeza que quer alterar este usuário para ${novoTipo.toUpperCase()}?`, 'Alterar')) {
        await mostrarGerenciarUsuarios();
        return;
    }
    
    try {
        const response = await fetch(`/usuarios/${userId}/tipo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'usuario-id': usuarioAtual.id
            },
            body: JSON.stringify({ tipo: novoTipo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
            await mostrarGerenciarUsuarios();
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
            await mostrarGerenciarUsuarios();
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
};

// Função para deletar usuário
window.deletarUsuario = async function(userId) {
    console.log("Deletando usuário:", userId);
    
    if (userId === usuarioAtual.id) {
        showToast('Você não pode deletar seu próprio usuário!', 'error');
        return;
    }
    
    if (!await showConfirm('⚠️ ATENÇÃO! Deseja realmente excluir este usuário permanentemente?', 'Excluir', 'Cancelar')) return;
    
    try {
        const response = await fetch(`/usuarios/${userId}`, {
            method: 'DELETE',
            headers: {
                'usuario-id': usuarioAtual.id
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Usuário excluído com sucesso!', 'success');
            await mostrarGerenciarUsuarios();
        } else {
            showToast(data.error || 'Erro desconhecido', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
};

// Função para fechar o painel admin
function fecharAdminPanel() {
    const conteudo = document.getElementById('conteudo-area');
    if (conteudo) {
        conteudo.innerHTML = '';
    }
}
