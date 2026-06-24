const db = require("./db")

const solicitacoes = db.sequelize.define("solicitacoes", {

    usuario_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    livro_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    data_solicitacao: {
        type: db.Sequelize.DATE,
        allowNull: false
    },

    status: {
        type: db.Sequelize.STRING,
        allowNull: false,
        defaultValue: "pendente" // pendente | aprovada | rejeitada
    },

}, {
    timestamps: false,
    tableName: 'solicitacoes'
});

module.exports = solicitacoes;
