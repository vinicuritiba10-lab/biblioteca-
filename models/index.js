// Junta todos os models e define os relacionamentos entre eles.
// Os controllers importam daqui: const { livros, Emprestimo } = require("../models");
const { sequelize, Sequelize } = require("./db");
const usuarios = require("./usuarios");
const livros = require("./livros");
const Emprestimo = require("./Emprestimos");
const Reserva = require("./Reservas");
const Solicitacao = require("./Solicitacoes");
const Suspensao = require("./Suspensoes");
const Avaliacao = require("./Avaliacoes");
const Favorito = require("./Favoritos");

usuarios.hasMany(Emprestimo, { foreignKey: "usuario_id" });
Emprestimo.belongsTo(usuarios, { foreignKey: "usuario_id" });

livros.hasMany(Emprestimo, { foreignKey: "livro_id" });
Emprestimo.belongsTo(livros, { foreignKey: "livro_id" });

usuarios.hasMany(Reserva, { foreignKey: "usuario_id" });
Reserva.belongsTo(usuarios, { foreignKey: "usuario_id" });

livros.hasMany(Reserva, { foreignKey: "livro_id" });
Reserva.belongsTo(livros, { foreignKey: "livro_id" });

usuarios.hasMany(Solicitacao, { foreignKey: "usuario_id" });
Solicitacao.belongsTo(usuarios, { foreignKey: "usuario_id" });

livros.hasMany(Solicitacao, { foreignKey: "livro_id" });
Solicitacao.belongsTo(livros, { foreignKey: "livro_id" });

usuarios.hasMany(Suspensao, { foreignKey: "usuario_id" });
Suspensao.belongsTo(usuarios, { foreignKey: "usuario_id" });

Emprestimo.hasOne(Suspensao, { foreignKey: "emprestimo_id" });
Suspensao.belongsTo(Emprestimo, { foreignKey: "emprestimo_id" });

usuarios.hasMany(Avaliacao, { foreignKey: "usuario_id", onDelete: "CASCADE" });
Avaliacao.belongsTo(usuarios, { foreignKey: "usuario_id" });

livros.hasMany(Avaliacao, { foreignKey: "livro_id", onDelete: "CASCADE" });
Avaliacao.belongsTo(livros, { foreignKey: "livro_id" });

usuarios.hasMany(Favorito, { foreignKey: "usuario_id", onDelete: "CASCADE" });
Favorito.belongsTo(usuarios, { foreignKey: "usuario_id" });

livros.hasMany(Favorito, { foreignKey: "livro_id", onDelete: "CASCADE" });
Favorito.belongsTo(livros, { foreignKey: "livro_id" });

module.exports = {
    sequelize,
    Sequelize,
    usuarios,
    livros,
    Emprestimo,
    Reserva,
    Solicitacao,
    Suspensao,
    Avaliacao,
    Favorito
};
