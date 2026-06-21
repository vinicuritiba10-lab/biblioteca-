// cadastro.js
document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
    const tipo = document.getElementById('tipo').value;
    
    // Validação de senha
    if (senha !== confirmarSenha) {
        alert('❌ As senhas não coincidem!');
        return;
    }
    
    if (senha.length < 4) {
        alert('❌ A senha deve ter pelo menos 4 caracteres');
        return;
    }
    
    // Mostra loading
    const btn = document.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';
    
    try {
        const response = await fetch('/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                tipo: tipo
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ ${data.message}\nFaça login para continuar.`);
            window.location.href = 'index.html';
        } else {
            alert('❌ ' + data.error);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao conectar com o servidor');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Cadastrar';
    }
});