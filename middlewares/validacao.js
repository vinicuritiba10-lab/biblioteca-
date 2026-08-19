// middlewares/validacao.js
// Valida e sanitiza os dados de entrada para evitar dados maliciosos

function validarCadastro(req, res, next) {
    const { nome, email, senha, tipo } = req.body;

    // campos obrigatorios
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Campos obrigatorios: nome, email e senha.' });
    }

    // nome: minimo 3 caracteres
    if (nome.trim().length < 3) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres.' });
    }

    // email: formato valido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'E-mail invalido.' });
    }

    // senha: minimo 6 caracteres
    if (senha.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
    }

    // tipo: apenas valores permitidos
    const tiposPermitidos = ['aluno', 'bibliotecario', 'admin'];
    if (tipo && !tiposPermitidos.includes(tipo)) {
        return res.status(400).json({ error: 'Tipo invalido.' });
    }

    // sanitiza os campos (remove espacos extras)
    req.body.nome  = nome.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.senha = senha.trim();

    next();
}

//function validarLogin(req, res, next) {
    //const { email, senha } = req.body;

    //if (!email || !senha) {
        //return res.status(400).json({ error: 'E-mail e senha sao obrigatorios.' });
    //}

    //const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    //if (!emailRegex.test(email)) {
        //return res.status(400).json({ error: 'E-mail invalido.' });
    //}

    //req.body.email = email.trim().toLowerCase();

    //next();
//}

module.exports = { validarCadastro, validarLogin };
