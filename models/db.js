const Sequelize = require('sequelize');

const sequelize = new Sequelize(
	"biblioteca",
	"root",
	"123456",
	{
		host: "localhost",
		dialect: "mysql",
		port: 3306
	}
	
);

sequelize.authenticate().then((function(){
	console.log("banco de dados conectado com sucesso");
})).catch(function(erro){
	console.log("erro ao conectar no banco de dados: " + erro);
	
});


module.exports = {
	Sequelize: Sequelize,
	sequelize: sequelize
};