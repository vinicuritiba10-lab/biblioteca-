const Sequelize = require('sequelize');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const sequelize = new Sequelize(
    'postgres',
    'postgres',
    process.env.DB_PASS,
    {
        host: 'db.flttbrxdpqmshzkukfnl.supabase.co',
        port: 5432,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    }
);

sequelize.authenticate()
    .then(() => console.log('banco de dados conectado com sucesso'))
    .catch(erro => console.log('erro ao conectar banco de dados: ' + erro));

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
};