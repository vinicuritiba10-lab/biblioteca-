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
    
    // Se for bibliotecário, adiciona opção de admin
    if (usuarioAtual.tipo === 'bibliotecario') {
        const navMenu = document.querySelector('.nav-menu');
        const adminLi = document.createElement('li');
        adminLi.innerHTML = '<a href="#" id="btn-admin" class="nav-link">📚 Admin</a>';
        navMenu.insertBefore(adminLi, document.getElementById('btn-sair'));
        
        document.getElementById('btn-admin').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'admin-livros.html'; //<-- fazer
        });

        await carregarTodosLivros();
    }
    
    // Carrega as categorias
    carregarCategorias();
    
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
        window.location.href = "../livros/livros.html";
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
        const response = await fetch(`http://localhost:3000/livros/categoria/${categoria}`);

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
        const response = await fetch(`http://localhost:3000/livros/buscar/${encodeURIComponent(termo)}`);
        
        
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

async function mostrarMeusEmprestimos() {
    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'none';
    document.getElementById('emprestimos-section').style.display = 'block';
    
    const emprestimosGrid = document.getElementById('emprestimos-grid');
    emprestimosGrid.innerHTML = '<p style="text-align:center;">Carregando seus empréstimos...</p>';
    
    try {
        const response = await fetch(`http://localhost:3000/usuarios/${usuarioAtual.id}/emprestimos`);
        const emprestimos = await response.json();
        
        if (emprestimos.length === 0) {
            emprestimosGrid.innerHTML = '<p style="text-align:center;">📭 Você não possui empréstimos ativos</p>';
            return;
        }
        
        const cores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];
        const icones = ['📖', '📘', '📙', '📕', '📗'];
        
        emprestimosGrid.innerHTML = emprestimos.map((emp, index) => `
            <div class="book-card">
                <div class="book-cover ${cores[index % cores.length]}">${icones[index % icones.length]}</div>
                <div class="book-info">
                    <h3>${emp.titulo}</h3>
                    <p class="author">${emp.autor}</p>
                    <p><small>Emprestado em: ${new Date(emp.data_emprestimo).toLocaleDateString()}</small></p>
                    <p><small>Devolver até: ${new Date(emp.data_devolucao_prevista).toLocaleDateString()}</small></p>
                    <span class="status ${emp.status === 'ativo' ? 'disponivel' : 'ocupado'}">
                        ${emp.status === 'ativo' ? '● Ativo' : '● Devolvido'}
                    </span>
                    ${emp.status === 'ativo' ? 
                        `<button class="btn-borrow" onclick="devolverLivro(${emp.id})">Devolver Livro</button>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro:', error);
        emprestimosGrid.innerHTML = '<p style="text-align:center;">Erro ao carregar empréstimos</p>';
    }
}

window.solicitarEmprestimo = async function(livroId) {
    const dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() + 7);
    
    if (!confirm('Deseja pegar este livro emprestado?')) return;
    
    try {
        const response = await fetch('http://localhost:3000/emprestimos', {
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
        const response = await fetch(`http://localhost:3000/emprestimos/${emprestimoId}/devolver`, {
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
    const booksGrid = document.getElementsById("books-grid");
    booksGrid.innerHTML = '<p style="text-align:center;"> carregando livros...</p>';

    try {
        const response = await fetch("http://localhost:3000/livros");
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