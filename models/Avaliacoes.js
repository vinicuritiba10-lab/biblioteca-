const db = require("./db");

// Nota de 1 a 5 (e comentario opcional) que um aluno da a um livro que ja pegou.
// Cada aluno tem no maximo uma avaliacao por livro.
const Avaliacao = db.sequelize.define("avaliacoes", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    usuario_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    livro_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    nota: {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },

    comentario: {
        type: db.Sequelize.TEXT,
        allowNull: true
    },

    data_avaliacao: {
        type: db.Sequelize.DATE,
        allowNull: false,
        defaultValue: db.Sequelize.NOW
    }
}, {
    timestamps: false,
    tableName: "avaliacoes",
    indexes: [{ unique: true, fields: ["usuario_id", "livro_id"] }]
});

module.exports = Avaliacao;
