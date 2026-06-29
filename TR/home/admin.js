// admin.js - Painel de Administração

// Verifica se já foi declarado para não duplicar
if (typeof usuarioAtual === 'undefined') {
    var usuarioAtual = null;
}

// guarda o id do livro sendo editado (null = formulario esta em modo "cadastrar")
let livroEmEdicaoId = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Verifica se usuário está logado
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    
    if (!usuarioLogado) {
        showToast('Faça login primeiro!', 'warning');
        window.location.href = '../login/index.html';
        return;
    }
    
    usuarioAtual = JSON.parse(usuarioLogado);
    
    // Verifica se é admin
    if (usuarioAtual.tipo !== 'admin' && usuarioAtual.tipo !== 'bibliotecario') {
        showToast('Acesso negado. Área restrita para administradores.', 'error');
        window.location.href = '../home/home.html';
        return;
    }
    
    // Mostra nome do usuário e seu papel real no header
    const adminName = document.querySelector('.logo-text');
    if (adminName) {
        const papel = usuarioAtual.tipo === 'admin' ? 'Admin' : 'Bibliotecário';
        adminName.innerHTML = `📚 Libro | ${papel} (${usuarioAtual.nome})`;
    }
    
    // Carrega as listas
    await carregarListaUsuarios();
    await carregarListaLivros();
    
    // Configura o formulário de adicionar livro
    const form = document.getElementById('form-adicionar-livro');
    if (form) {
        form.addEventListener('submit', adicionarLivro);
    }
    
    // Botão de sair
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
        const response = await fetch('/admin/usuarios', {
            headers: { 'usuario-id': usuarioAtual.id }
        });
        
        if (!response.ok) throw new Error('Erro ao carregar usuários');
        
        const usuarios = await response.json();
        
        if (usuarios.length === 0) {
            container.innerHTML = '<div class="empty-message">📭 Nenhum usuário cadastrado</div>';
            return;
        }
        
        // Atualiza o contador
        const totalUsuarios = document.getElementById('total-usuarios');
        if (totalUsuarios) totalUsuarios.textContent = usuarios.length;
        
        // Monta a tabela
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
                            <option value="admin" ${user.tipo === 'admin' ? 'selected' : ''}>👑 Admin</option>
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

// Função para alterar tipo de usuário - EXPORTA PARA O WINDOW
window.alterarTipoUsuario = async function(userId, novoTipo) {
    console.log("Alterando usuário:", userId, "para:", novoTipo);
    
    const confirmacao = await showConfirm(`Tem certeza que quer alterar este usuário para ${novoTipo.toUpperCase()}?`, 'Alterar');
    if (!confirmacao) {
        await carregarListaUsuarios();
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
            await carregarListaUsuarios();
        } else {
            showToast(data.error || 'Erro ao alterar tipo', 'error');
            await carregarListaUsuarios();
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão com o servidor', 'error');
        await carregarListaUsuarios();
    }
};

// Função para deletar usuário - EXPORTA PARA O WINDOW
window.deletarUsuario = async function(userId) {
    console.log("Deletando usuário:", userId);
    
    if (userId === usuarioAtual.id) {
        showToast('Você não pode deletar seu próprio usuário!', 'error');
        return;
    }
    
    const confirmacao = await showConfirm('ATENÇÃO! Deseja realmente excluir este usuário permanentemente?', 'Excluir', 'Cancelar');
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
            showToast('Usuário excluído com sucesso!', 'success');
            await carregarListaUsuarios();
        } else {
            showToast(data.error || 'Erro ao excluir usuário', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
};

// ========== FUNÇÕES PARA GERENCIAR LIVROS ==========

async function carregarListaLivros() {
    const container = document.getElementById('lista-livros-admin');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">🔄 Carregando livros...</div>';
    
    try {
        const response = await fetch('/livros');
        
        if (!response.ok) throw new Error('Erro ao carregar livros');
        
        const livros = await response.json();
        
        if (livros.length === 0) {
            container.innerHTML = '<div class="empty-message">📭 Nenhum livro cadastrado</div>';
            return;
        }
        
        // Atualiza o contador
        const totalLivros = document.getElementById('total-livros');
        if (totalLivros) totalLivros.textContent = livros.length;
        
        // Monta os cards de livros
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
    
    const livro = {
        titulo: document.getElementById('titulo').value,      // ← Nome correto do campo
        autor: document.getElementById('autor').value,        // ← Nome correto do campo
        isbn: document.getElementById('isbn').value,
        editora: document.getElementById('editora').value,
        ano: parseInt(document.getElementById('ano').value) || null,
        categoria: document.getElementById('categoria').value,
        quantidade_total: parseInt(document.getElementById('quantidade_total').value) || 1,
        capa_url: document.getElementById('capa_url').value || null,
        descricao: document.getElementById('texto-da-sinopse').value
    };

    const estaEditando = livroEmEdicaoId !== null;
    const url = estaEditando ? `/livros/${livroEmEdicaoId}` : '/livros';
    const metodo = estaEditando ? 'PUT' : 'POST';
    
    console.log("Enviando livro:", livro, "| editando:", estaEditando); // ← DEBUG
    
    try {
        const response = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'usuario-id': usuarioAtual.id
            },
            body: JSON.stringify(livro)
        });
        
        const data = await response.json();
        console.log("Resposta:", data); // ← DEBUG
        
        if (response.ok) {
            showToast(estaEditando ? 'Livro atualizado com sucesso!' : 'Livro cadastrado com sucesso!', 'success');
            limparFormulario();
            // Recarrega a lista
            await carregarListaLivros();
        } else {
            showToast(data.error || 'Erro ao salvar livro', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão com o servidor', 'error');
    }
}

window.excluirLivro = async function(livroId) {
    if (!await showConfirm('Tem certeza que quer excluir este livro permanentemente?', 'Excluir', 'Cancelar')) return;
    
    try {
        const response = await fetch(`/livros/${livroId}`, {
            method: 'DELETE',
            headers: { 'usuario-id': usuarioAtual.id }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Livro excluído com sucesso!', 'success');
            await carregarListaLivros();
        } else {
            showToast(data.error || 'Erro ao excluir livro', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir livro', 'error');
    }
};

// busca os dados do livro e preenche o formulario para edicao
window.editarLivro = async function(livroId) {
    try {
        const response = await fetch(`/livros/${livroId}`, {
            headers: { 'usuario-id': usuarioAtual.id }
        });
        const livro = await response.json();

        if (!response.ok) {
            showToast(livro.error || 'Erro ao buscar livro', 'error');
            return;
        }

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

        // leva o usuario at o formulario, ja que a lista fica mais abaixo na pagina
        document.getElementById('form-adicionar-livro').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados do livro', 'error');
    }
};

// ajusta os textos da tela para o modo de edicao
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

// limpa o formulario e volta para o modo "cadastrar novo livro"
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
