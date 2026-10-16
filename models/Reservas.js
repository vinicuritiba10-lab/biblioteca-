const db = require("./db");

const reservas = db.sequelize.define("reservas", {

    usuario_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    livro_id: {
        type: db.Sequelize.INTEGER,
        allowNull: false
    },

    data_reserva: {
        type: db.Sequelize.DATE,
        allowNull: false
    },

    // ativa | disponivel | concluida | cancelada | expirada
    status: {
        type: db.Sequelize.STRING,
        allowNull: false,
        defaultValue: "ativa"
    },

    // quando o livro ficou disponivel para o aluno retirar (conta o prazo de retirada).
    // Coluna adicionada pela migracao em models/migracoes.js
    data_disponivel: {
        type: db.Sequelize.DATE,
        allowNull: true
    }

}, {
    timestamps: false,
    tableName: "reservas"
});

module.exports = reservas;
