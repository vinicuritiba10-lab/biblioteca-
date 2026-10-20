// admin.js - Painel de Administração (Supabase)

if (typeof usuarioAtual === 'undefined') {
    var usuarioAtual = null;
}

let livroEmEdicaoId = null;

document.addEventListener('DOMContentLoaded', async function() {
    const usuarioLogado = localStorage.getItem('usuarioLogado');

    if (!usuarioLogado) {
        showToast('Faça login primeiro!', 'warning');
        window.location.href = '../login/index.html';
        return;
    }

    usuarioAtual = JSON.parse(usuarioLogado);

    if (usuarioAtual.tipo !== 'admin' && usuarioAtual.tipo !== 'bibliotecario') {
        showToast('Acesso negado. Área restrita para administradores.', 'error');
        window.location.href = '../home/home.html';
        return;
    }

    const adminName = document.querySelector('.logo-text');
    if (adminName) {
        const papel = usuarioAtual.tipo === 'admin' ? 'Admin' : 'Bibliotecário';
        adminName.innerHTML = `📚 Libro | ${papel} (${usuarioAtual.nome})`;
    }

    await carregarListaUsuarios();
    await carregarListaLivros();

    const form = document.getElementById('form-adicionar-livro');
    if (form) {
        form.addEventListener('submit', adicionarLivro);
    }

    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', function() {
            localStorage.removeItem('usuarioLogado');
            window.location.href = '../login/index.html';
        });
    }
});

// ========== FUNÇÕES PARA GERENCIAR USUÁRIOS ==========

async function carregarListaUsuarios() {
    const container = document.getElementById('lista-usuarios-admin');
    if (!container) return;

    indicarCarregando(container, '<div class="loading">🔄 Carregando usuários...</div>');

    try {
        const { data: usuarios, error } = await db.rpc('listar_usuarios', {
            p_solicitante_id: usuarioAtual.id
        });

        if (error) throw error;

        if (usuarios.length === 0) {
            container.innerHTML = '<div class="empty-message">📭 Nenhum usuário cadastrado</div>';
            return;
        }

        const totalUsuarios = document.getElementById('total-usuarios');
        if (totalUsuarios) totalUsuarios.textContent = usuarios.length;

        let html = '<div class="tabela-responsive"><table class="tabela-usuarios">';
        html += `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
        `;

        for (const user of usuarios) {
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.nome}</td>
                    <td>${user.email}</td>
                    <td>
                        ${usuarioAtual.tipo === 'admin' && user.tipo !== 'admin' ? `
                        <select class="select-tipo" data-id="${user.id}" onchange="window.alterarTipoUsuario(${user.id}, this.value)">
                            <option value="aluno" ${user.tipo === 'aluno' ? 'selected' : ''}>📖 Aluno</option>
                            <option value="bibliotecario" ${user.tipo === 'bibliotecario' ? 'selected' : ''}>📚 Bibliotecário</option>
                        </select>` : (user.tipo === 'admin' ? '⚙️ Admin' : user.tipo === 'bibliotecario' ? '📚 Bibliotecário' : '📖 Aluno')}
                    </td>
                    <td>
                        <button class="btn-deletar" onclick="window.deletarUsuario(${user.id})" ${user.id === usuarioAtual.id ? 'disabled' : ''}>
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `
            </tbody>
        </table></div>
        <div class="tabela-footer">
            <span>Total: ${usuarios.length} usuários</span>
        </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error-message">❌ Erro ao carregar usuários</div>';
    }
}

window.alterarTipoUsuario = async function(userId, novoTipo) {
    const confirmacao = await showConfirm(`Tem certeza que quer alterar este usuário para ${novoTipo.toUpperCase()}?`, 'Alterar');
    if (!confirmacao) {
        await carregarListaUsuarios();
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
        await carregarListaUsuarios();
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao alterar tipo', 'error');
        await carregarListaUsuarios();
    }
};

window.deletarUsuario = async function(userId) {
    if (userId === usuarioAtual.id) {
        showToast('Você não pode deletar seu próprio usuário!', 'error');
        return;
    }

    const confirmacao = await showConfirm('ATENÇÃO! Deseja realmente excluir este usuário permanentemente?', 'Excluir', 'Cancelar');
    if (!confirmacao) return;

    try {
        const { data, error } = await db.rpc('deletar_usuario', {
            p_solicitante_id: usuarioAtual.id,
            p_usuario_id: userId
        });

        if (error) throw error;

        showToast(data.message, 'success');
        await carregarListaUsuarios();
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao excluir usuário', 'error');
    }
};

// ========== FUNÇÕES PARA GERENCIAR LIVROS ==========

// Livros carregados do banco; a busca e os filtros trabalham em cima desta lista
let acervoAdmin = [];

async function carregarListaLivros() {
    const container = document.getElementById('lista-livros-admin');
    if (!container) return;

    indicarCarregando(container, '<div class="loading">🔄 Carregando livros...</div>');

    try {
        const { data: livros, error } = await db.from('livros').select('*').order('titulo');
        if (error) throw error;

        acervoAdmin = livros;
        const totalLivros = document.getElementById('total-livros');
        if (totalLivros) totalLivros.textContent = livros.length;

        desenharListaLivros();
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error-message">❌ Erro ao carregar livros</div>';
    }
}

// sem acento e em minúsculas, para "historia" achar "História"
function textoParaBusca(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function livroPassaNosFiltros(livro) {
    const termo = textoParaBusca(document.getElementById('busca-acervo')?.value.trim());
    const categoria = document.getElementById('filtro-categoria')?.value || '';
    const situacao = document.getElementById('filtro-situacao')?.value || '';

    if (termo) {
        const onde = textoParaBusca(`${livro.titulo} ${livro.autor} ${livro.editora} ${livro.isbn}`);
        if (!onde.includes(termo)) return false;
    }
    if (categoria && String(livro.categoria || '').toLowerCase() !== categoria) return false;
    if (situacao === 'disponiveis' && !(livro.quantidade_disponivel > 0)) return false;
    if (situacao === 'emprestados' && livro.quantidade_disponivel > 0) return false;
    if (situacao === 'sem-capa' && String(livro.capa_url || '').trim()) return false;
    if (situacao === 'sem-sinopse' && String(livro.descricao || '').trim()) return false;
    return true;
}

function desenharListaLivros() {
    const container = document.getElementById('lista-livros-admin');
    const contagem = document.getElementById('contagem-acervo');
    if (!container) return;

    if (acervoAdmin.length === 0) {
        container.innerHTML = '<div class="empty-message">📭 Nenhum livro cadastrado</div>';
        if (contagem) contagem.textContent = '';
        return;
    }

    const livros = acervoAdmin.filter(livroPassaNosFiltros);
    if (contagem) {
        contagem.textContent = livros.length === acervoAdmin.length
            ? `${acervoAdmin.length} livros no acervo`
            : `Mostrando ${livros.length} de ${acervoAdmin.length} livros`;
    }

    if (livros.length === 0) {
        container.innerHTML = '<div class="empty-message">🔎 Nenhum livro encontrado com esses filtros.</div>';
        return;
    }

    container.innerHTML = '<div class="livros-grid-admin">' + livros.map(livro => {
        const disponivel = livro.quantidade_disponivel > 0;
        const titulo = escaparHTML(livro.titulo);
        const capaImg = livro.capa_url
            ? `<img src="${escaparHTML(livro.capa_url)}" alt="Capa de ${titulo}" class="livro-capa-admin" onerror="this.style.display='none'">`
            : '';
        const categoria = livro.categoria
            ? `${iconeCategoria(livro.categoria)} ${escaparHTML(nomeCategoria(livro.categoria))}`
            : '📌 Sem categoria';
        return `
            <div class="livro-card-admin">
                ${capaImg}
                <div class="livro-header">
                    <h3 class="livro-titulo">📖 ${titulo}</h3>
                    <span class="livro-id">ID: ${livro.id}</span>
                </div>
                <div class="livro-autor">✍️ Autor: ${escaparHTML(livro.autor)}</div>
                <div class="livro-info">
                    <span class="info-badge">${categoria}</span>
                    <span class="info-badge">🏢 ${escaparHTML(livro.editora || 'Sem editora')}</span>
                    <span class="info-badge">📅 ${livro.ano || 'Ano não informado'}</span>
                </div>
                <div class="livro-info">
                    <span class="info-badge">📚 Total: ${livro.quantidade_total}</span>
                    <span class="info-badge ${disponivel ? 'status-disponivel' : 'status-indisponivel'}">
                        ${disponivel ? `✅ Disponível: ${livro.quantidade_disponivel}` : '❌ Indisponível'}
                    </span>
                </div>
                <div class="livro-acoes-admin">
                    <button class="btn-editar" onclick="window.editarLivro(${livro.id})">✏️ Editar</button>
                    ${usuarioAtual.tipo === 'admin' ? `<button class="btn-excluir" onclick="window.excluirLivro(${livro.id})">🗑️ Excluir</button>` : ''}
                </div>
            </div>
        `;
    }).join('') + '</div>';
}

// liga a busca e os filtros (as categorias vêm de TR/categorias.js)
document.addEventListener('DOMContentLoaded', () => {
    const busca = document.getElementById('busca-acervo');
    const categoria = document.getElementById('filtro-categoria');
    const situacao = document.getElementById('filtro-situacao');
    const limpar = document.getElementById('limpar-filtros');
    if (!busca || !categoria || !situacao) return;

    if (window.LIBRO_CATEGORIAS) {
        categoria.insertAdjacentHTML('beforeend', LIBRO_CATEGORIAS
            .map(c => `<option value="${c.chave}">${c.icone} ${c.nome}</option>`).join(''));
    }

    busca.addEventListener('input', desenharListaLivros);
    categoria.addEventListener('change', desenharListaLivros);
    situacao.addEventListener('change', desenharListaLivros);
    if (limpar) {
        limpar.addEventListener('click', () => {
            busca.value = '';
            categoria.value = '';
            situacao.value = '';
            desenharListaLivros();
            busca.focus();
        });
    }
});

async function adicionarLivro(event) {
    event.preventDefault();

    const dados = {
        titulo: document.getElementById('titulo').value,
        autor: document.getElementById('autor').value,
        isbn: document.getElementById('isbn').value,
        editora: document.getElementById('editora').value,
        ano: parseInt(document.getElementById('ano').value) || null,
        categoria: document.getElementById('categoria').value,
        quantidade_total: parseInt(document.getElementById('quantidade_total').value) || 1,
        capa_url: document.getElementById('capa_url').value || null,
        descricao: document.getElementById('texto-da-sinopse').value
    };

    const estaEditando = livroEmEdicaoId !== null;

    try {
        const { data, error } = await db.rpc('salvar_livro', {
            p_solicitante_id: usuarioAtual.id,
            p_livro_id: estaEditando ? livroEmEdicaoId : null,
            p_titulo: dados.titulo,
            p_autor: dados.autor,
            p_isbn: dados.isbn,
            p_editora: dados.editora,
            p_ano: dados.ano,
            p_categoria: dados.categoria,
            p_quantidade_total: dados.quantidade_total,
            p_capa_url: dados.capa_url,
            p_descricao: dados.descricao
        });

        if (error) throw error;

        showToast(estaEditando ? 'Livro atualizado com sucesso!' : 'Livro cadastrado com sucesso!', 'success');
        limparFormulario();
        await carregarListaLivros();
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao salvar livro', 'error');
    }
}

window.excluirLivro = async function(livroId) {
    if (!await showConfirm('Tem certeza que quer excluir este livro permanentemente?', 'Excluir', 'Cancelar')) return;

    try {
        const { data, error } = await db.rpc('excluir_livro', {
            p_solicitante_id: usuarioAtual.id,
            p_livro_id: livroId
        });

        if (error) throw error;

        showToast(data.message, 'success');
        await carregarListaLivros();
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message || 'Erro ao excluir livro', 'error');
    }
};

window.editarLivro = async function(livroId) {
    try {
        const { data: livro, error } = await db.from('livros').select('*').eq('id', livroId).single();

        if (error) throw error;

        document.getElementById('titulo').value = livro.titulo || '';
        document.getElementById('autor').value = livro.autor || '';
        document.getElementById('isbn').value = livro.isbn || '';
        document.getElementById('editora').value = livro.editora || '';
        document.getElementById('ano').value = livro.ano || '';
        document.getElementById('categoria').value = livro.categoria || '';
        document.getElementById('quantidade_total').value = livro.quantidade_total || 1;
        document.getElementById('capa_url').value = livro.capa_url || '';
        if (window.atualizarPreviaCapa) window.atualizarPreviaCapa();

        livroEmEdicaoId = livro.id;
        ativarModoEdicaoNaTela();

        document.getElementById('form-adicionar-livro').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados do livro', 'error');
    }
};

function ativarModoEdicaoNaTela() {
    const titulo = document.querySelector('.form-container h2');
    if (titulo) {
        titulo.innerHTML = '<span>✏️</span> Editando Livro';
    }
    const botaoSalvar = document.querySelector('#form-adicionar-livro .btn-primary');
    if (botaoSalvar) {
        botaoSalvar.innerHTML = '<span>✓</span> Salvar Alterações';
    }
    const botaoLimpar = document.querySelector('#form-adicionar-livro .btn-secondary');
    if (botaoLimpar) {
        botaoLimpar.innerHTML = '<span>✖</span> Cancelar Edição';
    }
}

window.limparFormulario = function() {
    document.getElementById('form-adicionar-livro').reset();
    document.getElementById('quantidade_total').value = '1';

    livroEmEdicaoId = null;

    const titulo = document.querySelector('.form-container h2');
    if (titulo) {
        titulo.innerHTML = '<span>➕</span> Adicionar Novo Livro';
    }
    const botaoSalvar = document.querySelector('#form-adicionar-livro .btn-primary');
    if (botaoSalvar) {
        botaoSalvar.innerHTML = '<span>✓</span> Cadastrar Livro';
    }
    const botaoLimpar = document.querySelector('#form-adicionar-livro .btn-secondary');
    if (botaoLimpar) {
        botaoLimpar.innerHTML = '<span>🗑️</span> Limpar';
    }
    if (window.atualizarPreviaCapa) window.atualizarPreviaCapa();
};

function limparFormulario() {
    window.limparFormulario();
}
