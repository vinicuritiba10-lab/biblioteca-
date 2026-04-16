const express = require("express");
const cors = require("cors");
const server = express();
const port = 3000;
const usuarios = require("./models/usuarios");
const livros = require("./models/livros");
const bodyParser = require("body-parser");
 
server.use(cors());
//config bodyparser
server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());

//cadastrar usuarios
server.post("/usuarios", function(req, res){
	usuarios.create({
		nome: req.body.nome,
		email: req.body.email,
		senha: req.body.senha,
		tipo: req.body.tipo,
		


	})//.then(function(){
		//res.send("usuario cadastrado com sucesso");
	//}).catch(function(erro){
		//res.send("erro ao cadastrar usuario" + erro);
	//});
});

//login do usuario
server.post("/login", async (req, res) => {
	try {
		const {email, senha} = req.body;

		const usuario = await usuarios.findOne({
			where: {email: email}
		});

		if (!usuario.email) {
			return res.status(401).json({
				error: "email nao cadastrado"
			}); 
		}

		if (usuario.senha !== senha ) {
			return res.status(401).json({
				error: "senha incorreta"
			});		
		}

		res.json({
			success: true,
			message: "login realizado com sucesso",
			usuario: {
				id: usuario.id,
				nome: usuario.nome,
				email:usuario.email,
				tipo: usuario.tipo
			}
		});
	} catch (error) {
		console.error("erro no login:", error);
		res.status(500).json({
			error: "error interno no servidor"
		});
	}
});

//adicionar livros

server.post("/livros", function(req, res){
	livros.create({
		titulo: req.body.titulo,
		autor: req.body.autor,
		isbn: req.body.isbn,
		editora: req.body.editora,
		ano: req.body.ano,
		categoria: req.body.categoria,
		quantidade_total: req.body.quantidade_total,
		quantidade_disponivel: req.body.quantidade_disponivel
	})
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
