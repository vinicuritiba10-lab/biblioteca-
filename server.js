const express = require("express");

const server = express();
const port = 3000;
const usuarios = require("./models/usuarios");
const bodyParser = require("body-parser");

//config bodyparser
server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());

server.post("/usuarios", function(req, res){
	usuarios.create({
		nome: req.body.nome,
		email: req.body.email,
		senha: req.body.senha,
		tipo: req.body.tipo,
		matricula: req.body.matricula


	}).then(function(){
		res.send("usuario cadastrado com sucesso");
	}).catch(function(erro){
		res.send("erro ao cadastrar usuario" + erro);
	});
});

server.get("/", function(req, res){
	usuarios.findAll().then(function(usuarios){
		res.send({usuarios: usuarios})
	}).catch(function(erro){
		res.send("erro ao buscar dados" + erro)
	})
});

server.get("/:nome", function(req,res){
	usuarios.findAll({where: {"nome": req.params.nome}}).then(function(usuarios){
		res.send(usuarios);
	}).catch(function(erro){
		res.send("usuario nao existe na base de dados" + erro);
	})
})

server.patch("/atualizar/:id", function(req,res){
	usuarios.update({
		nome: req.body.nome,
		email: req.body.email,
		senha: req.body.senha,
		tipo: req.body.tipo,
		matricula: req.body.matricula},
		{where: {"id": req.params.id}}
	).then(function(){
		res.send("sucesso ao atualizar os dados do produto ");
	}).catch(function(erro){
		res.send("erro ao atualizarr os dados do produto" + erro);
	});
});

server.delete("/deletar/:id",function(req,res){
	usuarios.destroy({where:{id: req.params.id}}).then(function(){
		res.send("usuario deleatado com sucesso")
	}).catch(function(erro){
		res.send("erroa ao deletar usuario" + erro);
	});
});

server.listen(port, () =>{
	console.log(`example app listening on port ${port}`);
});
