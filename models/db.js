const sequelize = new Sequelize(
	"biblioteca",
	"root",
	"",
	{
			host: "localhost",
			dialect: "mysql"
	}
	
);

sequelize.authenticate().then((function(){
		console.log("banco de dados conectado com sucesso");
})).catch(function(erro){
		console.log("banco de dados conectado com sucesso" + erro);
	
});


module.exports = {
		Sequelize: Sequelize
		sequelize: sequelize
}
