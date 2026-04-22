// home.js
let usuarioAtual = null;
let categoriaAtual = '';

document.addEventListener('DOMContentLoaded', async function() {

    // Pega usuário do Google OAuth se vier da URL
    const params = new URLSearchParams(window.location.search);
    const usuarioParam = params.get('usuario');
    if (usuarioParam) {
        localStorage.setItem('usuarioLogado', decodeURIComponent(usuarioParam));
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const usuarioLogado = localStorage.getItem('usuarioLogado');

    if (!usuarioLogado) {
        alert('Faça login primeiro!');
        window.location.href = '../login/index.html';
        return;
    }

    usuarioAtual = JSON.parse(usuarioLogado);

    // ===== PREENCHE O DRAWER COM DADOS DO USUÁRIO =====
    configurarDrawer(usuarioAtual);

    // Se for bibliotecário, mostra item de admin no drawer
    if (usuarioAtual.tipo === 'bibliotecario') {
        document.getElementById('drawer-admin-item').style.display = 'block';
        document.getElementById('drawer-admin').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'admin-livros.html';
        });
    }

    carregarCategorias();

    document.getElementById('btn-buscar').addEventListener('click', buscarLivros);
    document.getElementById('pesquisa').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') buscarLivros();
    });

    document.getElementById('btn-inicio').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarInicio();
    });

    document.getElementById('btn-emprestimos').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarMeusEmprestimos();
    });

    document.getElementById('btn-voltar').addEventListener('click', mostrarInicio);
    document.getElementById('btn-voltar-emprestimos').addEventListener('click', mostrarInicio);

    document.getElementById("btn-adicionar-livro").addEventListener("click", function(e) {
        e.preventDefault();
        window.location.href = "../livros/livros.html";
    });
});

// ===== DRAWER: CONFIGURAÇÃO =====
function configurarDrawer(usuario) {
    const primeiroNome = usuario.nome.split(' ')[0];
    const iniciais = usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('');

    // Header do site
    document.getElementById('perfil-nome-header').textContent = `Olá, ${primeiroNome}`;

    // Drawer
    document.getElementById('drawer-avatar').textContent = iniciais;
    document.getElementById('drawer-nome').textContent = usuario.nome;
    document.getElementById('drawer-email').textContent = usuario.email || '—';

    const badge = document.getElementById('drawer-badge');
    badge.textContent = usuario.tipo || 'aluno';
    if (usuario.tipo === 'bibliotecario') badge.classList.add('bibliotecario');

    // Botão para abrir drawer
    document.getElementById('btn-perfil-trigger').addEventListener('click', abrirDrawer);

    // Botão X para fechar
    document.getElementById('drawer-close').addEventListener('click', fecharDrawer);

    // Overlay fecha ao clicar fora
    document.getElementById('drawer-overlay').addEventListener('click', fecharDrawer);

    // ESC fecha drawer
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') fecharDrawer();
    });

    // Links internos do drawer
    document.getElementById('drawer-emprestimos').addEventListener('click', function(e) {
        e.preventDefault();
        fecharDrawer();
        setTimeout(mostrarMeusEmprestimos, 300);
    });

    document.getElementById('drawer-minha-conta').addEventListener('click', function(e) {
        e.preventDefault();
        fecharDrawer();
        // Placeholder para página de conta
        alert('Página de conta em desenvolvimento!');
    });

    document.getElementById('drawer-configuracoes').addEventListener('click', function(e) {
        e.preventDefault();
        fecharDrawer();
        alert('Configurações em desenvolvimento!');
    });

    // Botão sair
    document.getElementById('drawer-sair').addEventListener('click', function() {
        localStorage.removeItem('usuarioLogado');
        window.location.href = '../login/index.html';
    });
}

function abrirDrawer() {
    const drawer = document.getElementById('perfil-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const trigger = document.getElementById('btn-perfil-trigger');

    drawer.classList.add('aberto');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('visivel');
    trigger.classList.add('ativo');
    document.body.style.overflow = 'hidden';
}

function fecharDrawer() {
    const drawer = document.getElementById('perfil-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const trigger = document.getElementById('btn-perfil-trigger');

    drawer.classList.remove('aberto');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visivel');
    trigger.classList.remove('ativo');
    document.body.style.overflow = '';
}

// ===== CATEGORIAS =====
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

    document.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', function() {
            buscarPorCategoria(this.getAttribute('data-categoria'));
        });
    });
}

async function buscarPorCategoria(categoria) {
    categoriaAtual = categoria;
    const nomesCategorias = {
        'literatura': 'Literatura Brasileira', 'ciencias': 'Ciências',
        'economia': 'Economia', 'direito': 'Direito', 'tecnologia': 'Tecnologia',
        'engenharia': 'Engenharia', 'filosofia': 'Filosofia', 'medicina': 'Medicina',
        'historia': 'História', 'culinaria': 'Culinária'
    };

    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'block';
    document.getElementById('livros-titulo').textContent = nomesCategorias[categoria] || categoria;
    document.getElementById('livros-desc').textContent = 'Livros disponíveis na categoria';
    document.getElementById('btn-voltar').style.display = 'inline-block';

    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '<p style="text-align:center;">Carregando livros...</p>';

    try {
        const response = await fetch(`http://localhost:3000/livros/categoria/${categoria}`);
        exibirLivros(await response.json());
    } catch (error) {
        booksGrid.innerHTML = '<p style="text-align:center;">Erro ao carregar livros</p>';
    }
}

async function buscarLivros() {
    const termo = document.getElementById('pesquisa').value.trim();
    if (!termo) { alert('Digite um termo para buscar'); return; }

    document.getElementById('categorias-section').style.display = 'none';
    document.getElementById('livros-section').style.display = 'block';
    document.getElementById('livros-titulo').textContent = 'Resultados da busca';
    document.getElementById('livros-desc').textContent = `Exibindo resultados para: "${termo}"`;
    document.getElementById('btn-voltar').style.display = 'inline-block';

    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '<p style="text-align:center;">Buscando...</p>';

    try {
        const response = await fetch(`http://localhost:3000/livros/buscar/${encodeURIComponent(termo)}`);
        const livros = await response.json();
        livros.length === 0
            ? booksGrid.innerHTML = '<p style="text-align:center;">📭 Nenhum livro encontrado</p>'
            : exibirLivros(livros);
    } catch (error) {
        booksGrid.innerHTML = '<p style="text-align:center;">Erro na busca</p>';
    }
}

function exibirLivros(livros) {
    const cores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];
    const icones = ['📖', '📘', '📙', '📕', '📗', '📓', '📔', '📒'];
    document.getElementById('books-grid').innerHTML = livros.map((livro, i) => `
        <div class="book-card">
            <div class="book-cover ${cores[i % cores.length]}">${icones[i % icones.length]}</div>
            <div class="book-info">
                <h3>${livro.titulo}</h3>
                <p class="author">${livro.autor}</p>
                <span class="status ${livro.quantidade_disponivel > 0 ? 'disponivel' : 'ocupado'}">
                    ${livro.quantidade_disponivel > 0 ? '● Disponível' : '● Emprestado'}
                </span>
                ${livro.quantidade_disponivel > 0
                    ? `<button class="btn-borrow" onclick="solicitarEmprestimo(${livro.id})">Pegar Empréstimo</button>`
                    : `<button class="btn-borrow disabled" disabled>Indisponível</button>`}
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

        emprestimosGrid.innerHTML = emprestimos.map((emp, i) => `
            <div class="book-card">
                <div class="book-cover ${cores[i % cores.length]}">${icones[i % icones.length]}</div>
                <div class="book-info">
                    <h3>${emp.titulo}</h3>
                    <p class="author">${emp.autor}</p>
                    <p><small>Emprestado em: ${new Date(emp.data_emprestimo).toLocaleDateString()}</small></p>
                    <p><small>Devolver até: ${new Date(emp.data_devolucao_prevista).toLocaleDateString()}</small></p>
                    <span class="status ${emp.status === 'ativo' ? 'disponivel' : 'ocupado'}">
                        ${emp.status === 'ativo' ? '● Ativo' : '● Devolvido'}
                    </span>
                    ${emp.status === 'ativo'
                        ? `<button class="btn-borrow" onclick="devolverLivro(${emp.id})">Devolver Livro</button>`
                        : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        emprestimosGrid.innerHTML = '<p style="text-align:center;">Erro ao carregar empréstimos</p>';
    }
}

window.solicitarEmprestimo = async function(livroId) {
    if (!confirm('Deseja pegar este livro emprestado?')) return;
    const dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() + 7);
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
            categoriaAtual ? buscarPorCategoria(categoriaAtual) : buscarLivros();
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
        const response = await fetch(`http://localhost:3000/emprestimos/${emprestimoId}/devolver`, { method: 'PUT' });
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
