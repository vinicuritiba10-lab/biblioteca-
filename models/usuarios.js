const db = require("./db");

const usuarios = db.sequelize.define("usuarios", {
    nome: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    email: {
        type: db.Sequelize.STRING,
        allowNull: true
    },

    senha: {
        type: db.Sequelize.TEXT,
        allowNull: true
    },

    // aluno | bibliotecario | admin
    tipo: {
        type: db.Sequelize.STRING,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "usuarios"
});

module.exports = usuarios;
