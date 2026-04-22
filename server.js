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
    passport.authenticate("google-aluno", { failureRedirect: "http://127.0.0.1:5500/biblioteca--main/TR/login/index.html" }),
    (req, res) => {
        const encoded = encodeURIComponent(JSON.stringify(req.user));
        res.redirect(`http://127.0.0.1:5500/biblioteca--main/TR/home/home.html?usuario=${encoded}`);
    }
);

// ===== ROTAS GOOGLE OAUTH — BIBLIOTECÁRIO =====
server.get("/auth/google/bibliotecario",
    passport.authenticate("google-bibliotecario", { scope: ["profile", "email"] })
);

server.get("/auth/google/bibliotecario/callback",
    passport.authenticate("google-bibliotecario", { failureRedirect: "http://127.0.0.1:5500/biblioteca--main/TR/login-bibliotecario/bibliotecario.html" }),
    (req, res) => {
        const encoded = encodeURIComponent(JSON.stringify(req.user));
        res.redirect(`http://127.0.0.1:5500/biblioteca--main/TR/home/home.html?usuario=${encoded}`);
    }
);

// ===== ROTAS ORIGINAIS =====

// Cadastrar usuários
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

// Adicionar livros
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

server.listen(port, () => {
    console.log(`example app listening on port ${port}`);
});