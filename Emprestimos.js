const db = require("./db");

const Emprestimo = db.sequelize.define("emprestimos", {

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

    data_emprestimo: {
        type: db.Sequelize.DATE,
        allowNull: false,
        defaultValue: db.Sequelize.NOW
    },

    data_prevista_devolucao: {
        type: db.Sequelize.DATE,
        allowNull: false
    },

    data_devolucao_real: {
        type: db.Sequelize.DATE,
        allowNull: true
    },

    // ENUM trocado por STRING para compatibilidade com PostgreSQL
    status: {
        type: db.Sequelize.STRING,
        defaultValue: 'ativo',
        validate: {
            isIn: [['ativo', 'devolvido', 'atrasado']]
        }
    },

    renovacoes_restantes: {
        type: db.Sequelize.INTEGER,
        defaultValue: 2
    },

}, {
    timestamps: false,
    tableName: 'emprestimos'
});

module.exports = Emprestimo;
