const Sequelize = require('sequelize');

const sequelize = new Sequelize(
    process.env.MYSQLDATABASE || "biblioteca",
    process.env.MYSQLUSER || "root",
    process.env.MYSQLPASSWORD || "123456",
    {
        host: process.env.MYSQLHOST || "localhost",
        dialect: "mysql",
        port: process.env.MYSQLPORT || 3306
    }
);

sequelize.authenticate().then(function(){
    console.log("banco de dados conectado com sucesso");
}).catch(function(erro){
    console.log("erro ao conectar banco de dados: " + erro);
});

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
};
