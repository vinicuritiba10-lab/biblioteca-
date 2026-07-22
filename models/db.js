const Sequelize = require('sequelize');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const sequelize = new Sequelize(
    'postgres',           // nome do banco
    'postgres',           // usuário
    process.env.DB_PASS,  // só a senha
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