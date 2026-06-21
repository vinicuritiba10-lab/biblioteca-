// home.js
let usuarioAtual = null;
let categoriaAtual = '';

document.addEventListener('DOMContentLoaded', async function() {
    // Verifica se usuário está logado
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    
    if (!usuarioLogado) {
        alert('Faça login primeiro!');
        window.location.href = 'login.html';
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
    
    // Se for bibliotecário, adiciona opção de admin
    if (usuarioAtual.tipo === 'bibliotecario') {
        const btnAdmin = document.getElementById('btn-adicionar-livro');

        if(btnAdmin) {
            btnAdmin.style.display = 'block';
        }

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
            btnContainer.innerHTML += '<button id="btn-enviar-lembretes" class="btn-notificacao">📧 Enviar Lembretes</button>';
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
        window.location.href = '/index.html';
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
        alert('Digite um termo para buscar');
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
            <div class="book-cover ${cores[index % cores.length]}">${icones[index % icones.length]}</div>
            <div class="book-info">
                <h3>${livro.titulo}</h3>
                <p class="author">${livro.autor}</p>
                <span class="status ${livro.quantidade_disponivel > 0 ? 'disponivel' : 'ocupado'}">
                    ${livro.quantidade_disponivel > 0 ? '● Disponível' : '● Emprestado'}
                </span>
                ${livro.quantidade_disponivel > 0 ? 
                    `<button class="btn-borrow" onclick="solicitarEmprestimo(${livro.id})">Pegar Empréstimo</button>` : 
                    `<button class="btn-borrow disabled" disabled>Indisponível</button>`}
            </div>
        </div>
    `).join('');
}

function mostrarInicio() {
    document.getElementById('categorias-section').style.display = 'block';
    document.getElementById('livros-section').style.display = 'none';
    document.getElementById('emprestimos-section').style.display = 'none';
    document.getElementById('pesquisa').value = '';
    categoriaAtual = '';
}

//
async function mostrarMeusEmprestimos() {
    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'none';
    document.getElementById('emprestimos-section').style.display = 'block';
    
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

// funcao renovar emprestimo
window.renovarEmprestimo = async function(emprestimoId) {
    if(!confirm('deseja renovar este emprestimo por mais 7 dias?')) return;

    try {
        const response = await fetch(`/emprestimos/${emprestimoId}/renovar`,{
            method: 'PUT'
        });

        const data = await response.json();

        if (response.ok) {
            alert(`✅ Empréstimo renovado!\n📅 Nova data: ${new Date(data.nova_data_devolucao).toLocaleDateString()}\n🔄 Renovações restantes: ${data.renovacoes_restantes}`);
            mostrarMeusEmprestimos(); //recarrega a lista
        } else {
            alert('❌' + data.error);
        }
    } catch (error) {
        console.error('erro:', error);
        alert('erro ao renovar emprestimo');
    }
};

async function deletarEmprestimo(idEmprestimo, botaoClicado) {
    
    if(!confirm("tem certeza que deseja apagar este registro de emprestimo?")){
        return;
    }
    try{
        const response = await fetch(`/emprestimos/${idEmprestimo}`,{
            method: 'DELETE'
        });

        if(response.ok){
            botaoClicado.closest('.book-card').remove();
            alert("Emprestimo apagado com sucesso!");
        } else {
            alert("Nao foi possivel apagar emprestimo no servidor.");
        }
    } catch (error) {
        console.error("erro ao deletar:", error);
        alert("erro de conexao ao tentar apagar emprestimo.");
    }
}

window.solicitarEmprestimo = async function(livroId) {
    const dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() + 7);
    
    if (!confirm('Deseja pegar este livro emprestado?')) return;
    
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
            alert('✅ Empréstimo realizado! Devolva em até 7 dias.');
            if (categoriaAtual) {
                buscarPorCategoria(categoriaAtual);
            } else {
                buscarLivros();
            }
        } else {
            alert('❌ ' + data.error);
        }
    } catch (error) {
        alert('Erro ao solicitar empréstimo');
    }
};

window.devolverLivro = async function(emprestimoId) {
    if (!confirm('Confirmar devolução do livro?')) return;
    
    try {
        const response = await fetch(`/emprestimos/${emprestimoId}/devolver`, {
            method: 'PUT'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ Livro devolvido com sucesso!');
            mostrarMeusEmprestimos();
        } else {
            alert('❌ ' + data.error);
        }
    } catch (error) {
        alert('Erro ao devolver livro');
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

        if(emprestimos.lenght === 0) {
            tabelaBody.innerHTML = '<tr><tdcolspna="3">Nenhum emprestimo encontrado</td></tr>';
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
                <td class="status-${status}">${status}</td>

            `;
                
            tabelaBody.appendChild(linha);

        });

    } catch (error) {
        console.error("erro ao carregar relatorio:", error);
        const tabelaBody = document.querySelector("#tabela-emprestimos tbody");
        if (tabelaBody) {
            tabelaBody.innerHTML = '<tr><td colspan="3">Erro ao carregar emprestimos</td></tr>'
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
    
    // Botão Sair
    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('usuarioLogado');
            window.location.href = '../login/index.html';
        });
    }
    
    // Botão Adicionar Livro
    const btnAdicionar = document.getElementById("btn-adicionar-livro");
    if (btnAdicionar) {
        btnAdicionar.addEventListener("click", function(e) {
            e.preventDefault();
            window.location.href = "../livros/livros.html";
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

        alert(`📧 ${data.message}\nNotificações enviadas para ${data.notificacoes.filter(n => n.enviado).length} empréstimos`);
        
    } catch (error) {
        console.error('Erro:', error);
        alert('erro ao enviar notificacoes');
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
        alert("Erro: elemento de conteúdo não encontrado. Adicione <div id='conteudo-area'> no HTML.");
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

// Função mostrarEstatisticas corrigida
async function mostrarEstatisticas() {
    const conteudo = document.getElementById('conteudo-area');
    
    if (!conteudo) {
        console.error("❌ Elemento 'conteudo-area' não encontrado!");
        return;
    }
    
    conteudo.innerHTML = '<p>Carregando estatísticas...</p>';
    
    try {
        const response = await fetch('/admin/estatisticas', {
            headers: { 'usuario-id': usuarioAtual.id }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }
        
        const stats = await response.json();
        
        conteudo.innerHTML = `
            <div class="admin-panel">
                <h2>📊 Estatísticas do Sistema</h2>
                <div class="stats-grid">
                    <div class="stat-card">👥 Total Usuários: <strong>${stats.total_usuarios}</strong></div>
                    <div class="stat-card">📚 Total Livros: <strong>${stats.total_livros}</strong></div>
                    <div class="stat-card">🔄 Empréstimos Ativos: <strong>${stats.emprestimos_ativos}</strong></div>
                    <div class="stat-card">📖 Livros Emprestados: <strong>${stats.livros_emprestados}</strong></div>
                </div>
                <p><small>📅 Última atualização: ${new Date(stats.data).toLocaleString()}</small></p>
                <button onclick="fecharAdminPanel()" class="btn-voltar">← Fechar</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Erro:', error);
        conteudo.innerHTML = '<p>❌ Erro ao carregar estatísticas. Verifique se o backend está rodando.</p>';
    }
}

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
    
    const confirmacao = confirm(`⚠️ Tem certeza que quer alterar este usuário para ${novoTipo.toUpperCase()}?`);
    if (!confirmacao) {
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
            alert(`✅ ${data.message}`);
            await mostrarGerenciarUsuarios();
        } else {
            alert(`❌ ${data.error || 'Erro ao alterar tipo'}`);
            await mostrarGerenciarUsuarios();
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro de conexão com o servidor');
    }
};

// Função para deletar usuário
window.deletarUsuario = async function(userId) {
    console.log("Deletando usuário:", userId);
    
    if (userId === usuarioAtual.id) {
        alert('❌ Você não pode deletar seu próprio usuário!');
        return;
    }
    
    const confirmacao = confirm('⚠️ ATENÇÃO! Deseja realmente excluir este usuário permanentemente?');
    if (!confirmacao) return;
    
    try {
        const response = await fetch(`/usuarios/${userId}`, {
            method: 'DELETE',
            headers: {
                'usuario-id': usuarioAtual.id
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ Usuário excluído com sucesso!');
            await mostrarGerenciarUsuarios();
        } else {
            alert(`❌ ${data.error || 'Erro ao excluir usuário'}`);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro de conexão com o servidor');
    }
};

// Função para fechar o painel admin
function fecharAdminPanel() {
    const conteudo = document.getElementById('conteudo-area');
    if (conteudo) {
        conteudo.innerHTML = '';
    }
}