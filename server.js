require('dotenv').config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const server = express();
const port = 3000;
const usuarios = require("./models/usuarios");
const livros = require("./models/livros");
const Emprestimo = require("./models/emprestimos");
const bodyParser = require("body-parser");

// ===== CONFIG =====
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

server.use(cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true
}));

server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

// ===== ASSOCIAÇÕES =====
usuarios.hasMany(Emprestimo, { foreignKey: 'usuario_id' });
Emprestimo.belongsTo(usuarios, { foreignKey: 'usuario_id' });

livros.hasMany(Emprestimo, { foreignKey: 'livro_id' });
Emprestimo.belongsTo(livros, { foreignKey: 'livro_id' });

// ===== SESSION =====
server.use(session({
    secret: "libro-secret-key",
    resave: false,
    saveUninitialized: false
}));

// ===== PASSPORT =====
server.use(passport.initialize());
server.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Estratégia para ALUNO (qualquer email Google)
passport.use("google-aluno", new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/aluno/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const nome = profile.displayName;

        let usuario = await usuarios.findOne({ where: { email } });

        if (!usuario) {
            usuario = await usuarios.create({
                nome, email,
                senha: "google-oauth",
                tipo: "aluno"
            });
        }

        return done(null, {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        });
    } catch (error) {
        return done(error, null);
    }
}));

// Estratégia para BIBLIOTECÁRIO (só @escola.pr.gov.br)
passport.use("google-bibliotecario", new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/bibliotecario/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const nome = profile.displayName;

        if (!email.endsWith("@escola.pr.gov.br")) {
            return done(null, false);
        }

        let usuario = await usuarios.findOne({ where: { email } });

        if (!usuario) {
            usuario = await usuarios.create({
                nome, email,
                senha: "google-oauth",
                tipo: "bibliotecario"
            });
        }

        return done(null, {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        });
    } catch (error) {
        return done(error, null);
    }
}));

// ===== ROTAS GOOGLE OAUTH — ALUNO =====
server.get("/auth/google/aluno",
    passport.authenticate("google-aluno", { scope: ["profile", "email"] })
);

server.get("/auth/google/aluno/callback",
    passport.authenticate("google-aluno", { failureRedirect: "http://127.0.0.1:5500/TR/login/index.html" }),
    (req, res) => {
        const encoded = encodeURIComponent(JSON.stringify(req.user));
        res.redirect(`http://127.0.0.1:5500/TR/home/home.html?usuario=${encoded}`);
    }
);

// ===== ROTAS GOOGLE OAUTH — BIBLIOTECÁRIO =====
server.get("/auth/google/bibliotecario",
    passport.authenticate("google-bibliotecario", { scope: ["profile", "email"] })
);

server.get("/auth/google/bibliotecario/callback",
    passport.authenticate("google-bibliotecario", { failureRedirect: "http://127.0.0.1:5500/TR/login-bibliotecario/bibliotecario.html" }),
    (req, res) => {
        const encoded = encodeURIComponent(JSON.stringify(req.user));
        res.redirect(`http://127.0.0.1:5500/TR/home/home.html?usuario=${encoded}`);
    }
);

// ===== ROTAS DE USUÁRIOS =====

// Cadastrar usuário
server.post("/usuarios", function(req, res) {
    usuarios.create({
        nome: req.body.nome,
        email: req.body.email,
        senha: req.body.senha,
        tipo: req.body.tipo,
    }).then(function(usuario) {
        res.json({ success: true, usuario });
    }).catch(function(erro) {
        res.status(500).json({ error: "Erro ao cadastrar usuário: " + erro });
    });
});

// Login do usuário
server.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        const usuario = await usuarios.findOne({ where: { email } });

        if (!usuario) {
            return res.status(401).json({ error: "Email não cadastrado" });
        }

        if (usuario.senha !== senha) {
            return res.status(401).json({ error: "Senha incorreta" });
        }

        res.json({
            success: true,
            message: "Login realizado com sucesso",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            }
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// Buscar todos os usuários
server.get("/", function(req, res) {
    usuarios.findAll().then(function(usuarios) {
        res.send({ usuarios });
    }).catch(function(erro) {
        res.send("Erro ao buscar dados: " + erro);
    });
});

server.get("/:nome", function(req, res) {
    usuarios.findAll({ where: { "nome": req.params.nome } }).then(function(usuarios) {
        res.send(usuarios);
    }).catch(function(erro) {
        res.send("Usuário não existe na base de dados: " + erro);
    });
});

server.patch("/atualizar/:id", function(req, res) {
    usuarios.update({
        nome: req.body.nome,
        email: req.body.email,
        senha: req.body.senha,
        tipo: req.body.tipo,
        matricula: req.body.matricula
    }, { where: { "id": req.params.id } }
    ).then(function() {
        res.send("Sucesso ao atualizar os dados do usuário.");
    }).catch(function(erro) {
        res.send("Erro ao atualizar os dados do usuário: " + erro);
    });
});

server.delete("/deletar/:id", function(req, res) {
    usuarios.destroy({ where: { id: req.params.id } }).then(function() {
        res.send("Usuário deletado com sucesso.");
    }).catch(function(erro) {
        res.send("Erro ao deletar usuário: " + erro);
    });
});

// ===== ROTAS DE LIVROS =====

// Adicionar livro
server.post("/livros", function(req, res) {
    livros.create({
        titulo: req.body.titulo,
        autor: req.body.autor,
        isbn: req.body.isbn,
        editora: req.body.editora,
        ano: req.body.ano,
        categoria: req.body.categoria,
        quantidade_total: req.body.quantidade_total,
        quantidade_disponivel: req.body.quantidade_disponivel
    }).then(function(livro) {
        res.json({ success: true, livro });
    }).catch(function(erro) {
        res.status(500).json({ error: "Erro ao adicionar livro: " + erro });
    });
});

// Buscar livros por termo
server.get("/livros/buscar/:termo", async function(req, res) {
    try {
        const { termo } = req.params;
        const { Op } = require("sequelize");

        const livrosEncontrados = await livros.findAll({
            where: {
                [Op.or]: [
                    { titulo: { [Op.like]: `%${termo}%` } },
                    { autor: { [Op.like]: `%${termo}%` } },
                    { categoria: { [Op.like]: `%${termo}%` } }
                ]
            }
        });
        res.json(livrosEncontrados);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar livros: " + error.message });
    }
});

// Buscar livros por categoria
server.get("/livros/categoria/:categoria", async (req, res) => {
    try {
        const { categoria } = req.params;

        const todosLivros = await livros.findAll();

        const livrosFiltrados = todosLivros.filter(livro => {
            const catLivro = livro.categoria ? livro.categoria.toLowerCase() : '';
            const catBusca = categoria.toLowerCase();
            return catLivro === catBusca;
        });

        res.json(livrosFiltrados);
    } catch (error) {
        console.error("Erro na rota /livros/categoria:", error);
        res.status(500).json([]);
    }
});

// ===== ROTAS DE EMPRÉSTIMOS =====

// Criar empréstimo
server.post("/emprestimos", async (req, res) => {
    try {
        const { usuario_id, livro_id, data_devolucao_prevista } = req.body;

        const livro = await livros.findByPk(livro_id);
        if (!livro) {
            return res.status(404).json({ error: "Livro não encontrado" });
        }

        if (livro.quantidade_disponivel <= 0) {
            return res.status(400).json({ error: "Livro não disponível para empréstimo" });
        }

        const usuario = await usuarios.findByPk(usuario_id);
        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const emprestimo = await Emprestimo.create({
            usuario_id,
            livro_id,
            data_emprestimo: new Date(),
            data_prevista_devolucao: data_devolucao_prevista,
            status: "ativo"
        });

        await livro.update({
            quantidade_disponivel: livro.quantidade_disponivel - 1
        });

        res.status(201).json({
            message: "Empréstimo registrado com sucesso",
            emprestimo
        });

    } catch (error) {
        console.error("Erro ao criar empréstimo:", error);
        res.status(500).json({ error: error.message });
    }
});

// Listar empréstimos (para bibliotecário)
server.get("/emprestimos", async (req, res) => {
    try {
        const emprestimos = await Emprestimo.findAll({
            include: [
                { model: usuarios, attributes: ["nome", "email"] },
                { model: livros, attributes: ["titulo", "autor", "isbn"] }
            ]
        });
        res.json(emprestimos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar empréstimos de um usuário específico
server.get("/usuarios/:id/emprestimos", async (req, res) => {
    try {
        const { id } = req.params;

        const emprestimos = await Emprestimo.findAll({
            where: { usuario_id: id },
            include: [
                { model: livros, attributes: ['titulo', 'autor', 'categoria'] }
            ],
            order: [['data_emprestimo', 'DESC']]
        });

        res.json(emprestimos);
    } catch (error) {
        console.error("Erro:", error);
        res.status(500).json({ error: error.message });
    }
});

// Devolver livro
server.put("/emprestimos/:id/devolver", async (req, res) => {
    try {
        const { id } = req.params;

        const emprestimo = await Emprestimo.findByPk(id);
        if (!emprestimo) {
            return res.status(404).json({ error: "Empréstimo não encontrado" });
        }

        if (emprestimo.status === "devolvido") {
            return res.status(400).json({ error: "Livro já foi devolvido" });
        }

        await emprestimo.update({
            data_devolucao_real: new Date(),
            status: "devolvido"
        });

        const livro = await livros.findByPk(emprestimo.livro_id);
        await livro.update({
            quantidade_disponivel: livro.quantidade_disponivel + 1
        });

        res.json({ message: "Livro devolvido com sucesso" });

    } catch (error) {
        console.error("Erro na devolução:", error);
        res.status(500).json({ error: error.message });
    }
});

// Renovar empréstimo
server.put("/emprestimos/:id/renovar", async (req, res) => {
    try {
        const { id } = req.params;

        const emprestimo = await Emprestimo.findByPk(id);
        if (!emprestimo) {
            return res.status(404).json({ error: "Empréstimo não encontrado" });
        }

        if (emprestimo.status !== 'ativo') {
            return res.status(400).json({ error: "Apenas empréstimos ativos podem ser renovados" });
        }

        if (emprestimo.renovacoes_restantes <= 0) {
            return res.status(400).json({ error: "Limite de renovações atingido" });
        }

        const novaData = new Date(emprestimo.data_prevista_devolucao);
        novaData.setDate(novaData.getDate() + 7);

        await emprestimo.update({
            data_prevista_devolucao: novaData,
            renovacoes_restantes: emprestimo.renovacoes_restantes - 1
        });

        res.json({
            message: "Empréstimo renovado com sucesso",
            nova_data_devolucao: novaData,
            renovacoes_restantes: emprestimo.renovacoes_restantes
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verificar empréstimos atrasados
server.get("/emprestimos/atrasados", async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const hoje = new Date();

        const atrasados = await Emprestimo.findAll({
            where: {
                status: 'ativo',
                data_prevista_devolucao: { [Op.lt]: hoje }
            },
            include: [
                { model: usuarios, attributes: ['nome', 'email'] },
                { model: livros, attributes: ['titulo'] }
            ]
        });

        res.json(atrasados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

server.listen(port, () => {
    console.log(`example app listening on port ${port}`);
});