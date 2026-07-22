const Sequelize = require('sequelize');

const { setDefaultResultOrder } = require('dns');
setDefaultResultOrder('ipv4first');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        },
        family: 4
    },
    logging: false
});

sequelize.authenticate()
    .then(() => console.log('banco de dados conectado com sucesso'))
    .catch(erro => console.log('erro ao conectar banco de dados: ' + erro));

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
};
