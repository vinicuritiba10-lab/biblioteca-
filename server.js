// Ponto de entrada do backend.
// A logica fica separada em pastas:
//   routes/       -> quais URLs existem e quais middlewares cada uma usa
//   controllers/  -> o que cada rota faz
//   services/     -> regras reaproveitadas (e-mail, suspensao, reservas, lembretes)
//   middlewares/  -> verificacoes que rodam antes das rotas
//   models/       -> tabelas do banco (Sequelize)
//   jobs/         -> tarefas automaticas
//   utils/        -> calculos puros (datas, estatisticas, conquistas, CSV)
const express = require("express");
const cors = require("cors");
const path = require("path");

const models = require("./models");
const { executarMigracoes } = require("./models/migracoes");
const rotas = require("./routes");
const logger = require("./middlewares/logger");
const { rotaNaoEncontrada, tratarErros } = require("./middlewares/tratarErros");
const { iniciarAgendador } = require("./jobs/agendador");

const server = express();
const PORTA = process.env.PORT || 3000;

server.use(cors());
server.use(express.urlencoded({ extended: false }));
server.use(express.json());
server.use(logger);

// arquivos do front-end (html, css, js, imagens) vem antes das rotas da API
server.use(express.static(path.join(__dirname, "TR")));

server.use(rotas);
server.use(rotaNaoEncontrada);
server.use(tratarErros);

// sync() cria as tabelas que faltam sem mexer nas existentes.
// Para ajustar colunas automaticamente (cuidado em producao): DB_SYNC_ALTER=true
const opcoesSync = process.env.DB_SYNC_ALTER === "true" ? { alter: true } : {};

async function iniciar() {
    await models.sequelize.sync(opcoesSync);
    await executarMigracoes(models.sequelize, models);
    console.log("Banco de dados sincronizado!");

    server.listen(PORTA, "0.0.0.0", () => {
        console.log(`Servidor rodando na porta ${PORTA}`);
    });
    iniciarAgendador();
}

iniciar().catch(erro => {
    console.error("Erro ao conectar ou sincronizar o banco de dados:", erro);
    process.exit(1);
});
