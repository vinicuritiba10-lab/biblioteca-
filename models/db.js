const Sequelize = require('sequelize');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.DATABASE_URL.includes('supabase')
            ? { require: true, rejectUnauthorized: false }
            : false
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