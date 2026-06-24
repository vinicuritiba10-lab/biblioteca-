const db = require("./db")

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

    status: {
        type: db.Sequelize.STRING,
        allowNull: false,
        defaultValue: "ativa" // ativa | disponivel | cancelada
    },

}, {
    timestamps: false,
    tableName: 'reservas'
});

module.exports = reservas;
