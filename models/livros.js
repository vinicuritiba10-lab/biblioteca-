const db = require ("./db")

const livros = db.sequelize.define("livros", {
    titulo: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    autor: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    isbn: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    editora: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    ano: {
        type: db.Sequelize.INTEGER,
        allowNull: true
    },

    categoria: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    quantidade_total: {
        type: db.Sequelize.INTEGER,
        allowNull: true
    },

    quantidade_disponivel: {
        type: db.Sequelize.INTEGER,
        allowNull: true
    },
});

module.exports = livros;