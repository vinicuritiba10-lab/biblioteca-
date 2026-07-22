const db = require("./db");

const Suspensao = db.sequelize.define("suspensoes", {

    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    usuario_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    emprestimo_id: {
        type: db.Sequelize.INTEGER,
        allowNull: true
    },

    motivo: {
        type: db.Sequelize.STRING(255),
        allowNull: false,
        defaultValue: "Devolucao em atraso"
    },

    dias_atraso: {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    data_inicio: {
        type: db.Sequelize.DATEONLY,
        allowNull: false
    },

    data_fim: {
        type: db.Sequelize.DATEONLY,
        allowNull: false
    },

    // ENUM trocado por STRING para compatibilidade com PostgreSQL
    status: {
        type: db.Sequelize.STRING,
        defaultValue: "ativa",
        validate: {
            isIn: [["ativa", "cumprida"]]
        }
    }

}, {
    timestamps: false,
    tableName: "suspensoes"
});

module.exports = Suspensao;
