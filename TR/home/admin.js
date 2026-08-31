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

    container.innerHTML = '<div class="loading">🔄 Carregando usuários...</div>';

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
                        <select class="select-tipo" data-id="${user.id}" onchange="window.alterarTipoUsuario(${user.id}, this.value)">
                            <option value="aluno" ${user.tipo === 'aluno' ? 'selected' : ''}>📖 Aluno</option>
                            <option value="bibliotecario" ${user.tipo === 'bibliotecario' ? 'selected' : ''}>📚 Bibliotecário</option>
                        </select>
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

async function carregarListaLivros() {
    const container = document.getElementById('lista-livros-admin');
    if (!container) return;

    container.innerHTML = '<div class="loading">🔄 Carregando livros...</div>';

    try {
        const { data: livros, error } = await db.from('livros').select('*').order('id');

        if (error) throw error;

        if (livros.length === 0) {
            container.innerHTML = '<div class="empty-message">📭 Nenhum livro cadastrado</div>';
            return;
        }

        const totalLivros = document.getElementById('total-livros');
        if (totalLivros) totalLivros.textContent = livros.length;

        let html = '<div class="livros-grid-admin">';

        for (const livro of livros) {
            const disponivel = livro.quantidade_disponivel > 0;
            const capaImg = livro.capa_url
                ? `<img src="${livro.capa_url}" alt="Capa de ${livro.titulo}" class="livro-capa-admin" onerror="this.style.display='none'">`
                : '';
            html += `
                <div class="livro-card-admin">
                    ${capaImg}
                    <div class="livro-header">
                        <h3 class="livro-titulo">📖 ${livro.titulo}</h3>
                        <span class="livro-id">ID: ${livro.id}</span>
                    </div>
                    <div class="livro-autor">✍️ Autor: ${livro.autor}</div>
                    <div class="livro-info">
                        <span class="info-badge">📌 ${livro.categoria || 'Sem categoria'}</span>
                        <span class="info-badge">🏢 ${livro.editora || 'Sem editora'}</span>
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
        }

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error-message">❌ Erro ao carregar livros</div>';
    }
}

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
};

function limparFormulario() {
    window.limparFormulario();
}
