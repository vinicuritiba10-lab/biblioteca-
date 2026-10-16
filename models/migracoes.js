// Pequenos ajustes no banco que o sequelize.sync() nao faz sozinho
// (o sync cria tabelas novas, mas nao adiciona colunas em tabelas que ja existem).
// Cada comando e seguro para rodar varias vezes (IF NOT EXISTS).

const estado = {
    reservasComPrazo: true // false se a coluna data_disponivel nao puder ser criada
};

async function executarMigracoes(sequelize, { Reserva }) {
    try {
        await sequelize.query(
            "ALTER TABLE reservas ADD COLUMN IF NOT EXISTS data_disponivel TIMESTAMPTZ NULL"
        );
    } catch (erro) {
        // sem a coluna, o sistema continua funcionando, so sem o prazo de retirada
        console.warn("aviso: nao foi possivel criar reservas.data_disponivel:", erro.message);
        Reserva.removeAttribute("data_disponivel");
        estado.reservasComPrazo = false;
    }
}

module.exports = { executarMigracoes, estado };
