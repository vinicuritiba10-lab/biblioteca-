const db = require("./db");

// Lista "Quero ler" de cada aluno.
const Favorito = db.sequelize.define("favoritos", {
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

    data_adicao: {
        type: db.Sequelize.DATE,
        allowNull: false,
        defaultValue: db.Sequelize.NOW
    }
}, {
    timestamps: false,
    tableName: "favoritos",
    indexes: [{ unique: true, fields: ["usuario_id", "livro_id"] }]
});

module.exports = Favorito;
