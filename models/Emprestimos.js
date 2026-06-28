const db = require("./db");

const Emprestimo = db.sequelize.define("emprestimos", {
    // O Sequelize cria o ID automático, mas se quiser deixar explícito:
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    
    usuario_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false // Obrigatório, conforme seu SQL
    },

    livro_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false // Obrigatório
    },

    data_emprestimo: {
        type: db.Sequelize.DATE,
        allowNull: false,
        defaultValue: db.Sequelize.NOW // Sugestão: preenche com a data atual
    },

    data_prevista_devolucao: {
        type: db.Sequelize.DATE,
        allowNull: false
    },

    data_devolucao_real: {
        type: db.Sequelize.DATE,
        allowNull: true // Pode ser nulo até o livro ser devolvido
    },

    status: {
        type: db.Sequelize.ENUM('ativo', 'devolvido', 'atrasado'),
        defaultValue: 'ativo'
    },

    renovacoes_restantes: {
        type: db.Sequelize.INTEGER,
        defaultValue: 2
    },

}, {
    timestamps: false,
    tablename: 'emprestimos'

});


module.exports = Emprestimo;
