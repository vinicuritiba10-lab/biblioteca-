const express = require("express");
const cors = require("cors");
const server = express();
const port = 3000;
const usuarios = require("./models/usuarios");
const livros = require("./models/livros");
const Emprestimo = require("./models/emprestimos");
const bodyParser = require("body-parser");
 
server.use(cors());
//config bodyparser
server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());

usuarios.hasMany(Emprestimo, { foreignKey: 'usuario_id' });
Emprestimo.belongsTo(usuarios, { foreignKey: 'usuario_id' });

livros.hasMany(Emprestimo, { foreignKey: 'livro_id' });
Emprestimo.belongsTo(livros, { foreignKey: 'livro_id' });

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

//buscar livros
server.get("/livros/buscar/:termo", async function(req, res){
	try{
		const { termo } = req.params;
		const { Op } = require("sequelize");
		
		const livrosEncontrados = await livros.findAll({
			where: {
				[Op.or]: [
					{ titulo: { [Op.like]: `%${termo}%`} },
					{ autor: { [Op.like]: `%${termo}%`} },
					{ categoria: { [Op.like]: `%${termo}%`} }
				]
			}
		});
	res.json(livrosEncontrados);
	} catch (error) {
		res.status(500).json({error: "erro ao buscar livros: " + error.message});
	}
});

//listar livros

//server.get("/livros", async (req, res) => {
	//try {
		//const livros = await livros.findAll();
		//res.json(livros);
	//} catch (error) {
		//res.status(500).json({ error: "erro ao buscar livros:" + error.message});
	//}
//});

//livros nas categorias
server.get("/livros/categoria/:categoria", async (req, res) => {
	try {
		const {categoria} = req.params;

		console.log("buscando categoria", categoria);

		const todosLivros = await livros.findAll();

		console.log("total de livros:", todosLivros.length);

		const livrosFiltrados = todosLivros.filter(livro => {

			const catLivro = livro.categoria ? livro.categoria.toLowerCase() : '';
			const catBusca = categoria.toLowerCase();
			return catLivro === catBusca;
		});

		console.log("encontrados", livrosFiltrados.length);

		res.json(livrosFiltrados);
	} catch (error) {

		console.log("❌ ERRO na rota /livros/categoria/:categoria:", error);
		res.status(500).json([]);
	}
});

//acesso emprestimos

server.post("/emprestimos", async (req, res) => {
	try{
		const{ usuario_id, livro_id, data_devolucao_prevista } = req.body;

		//verifica se livro existe

		const livro = await livros.findByPk(livro_id);
		if(!livro) {
			return res.status(404).json({ error: "livro nao encontrado" });
		}

		//verifica se tem disponivel
		if (livro.quantidade_disponivel <= 0) {
			return res.status(400).json({ error: "livro nao disponivel para emprestimo"});
		}

		//verifica se o usuario existe

		const usuario = await usuarios.findByPk(usuario_id);
		if(!usuario){
			return res.status(404).json({ error: "usuario nao encontrado"});
		}

		//cria o emprestimo
		const emprestimo = await Emprestimo.create({
			usuario_id: usuario_id,
			livro_id: livro_id,
			data_emprestimo: new Date(),
			data_prevista_devolucao: data_devolucao_prevista,
			status: "ativo"
		});

		//diminui a quantidade de livros
		await livro.update({
			quantidade_disponivel: livro.quantidade_disponivel -1
		});

		res.status(201).json({
			message: "emprestimos registrado com sucesso",
			emprestimo: emprestimo
		});

	} catch(error) {
		console.error("erro ao crias emprestimo:", error);
		res.status(500).json({ error: error.message});
	}
	
});

//lista os emprestimo para bibliotecario
server.get("/emprestimos", async (req, res) => {
	try {
		const emprestimos = await Emprestimo.findAll({
			include: [
				{model: usuarios, attributes: ["nome", "email"] },
				{model: livros, attributes: ["titulo", "autor", "isbn"]}
			]
		});
		res.json(emprestimos);
	}catch (error){
		res.status(500).json({error: error.message});
	}
	
});

//lista emprestimos de um usuario especifico

server.get("/usuarios/:id/emprestimos", async (req, res) => {
	try {
		const { id } = req.params;

		const emprestimos = await Emprestimo.findAll({
			where: { usuario_id: id},
			include: [
				{ model: livros, attributes: ['titulo', 'autor', 'categoria'] }
			],
			order: [['data_emprestimo', 'DESC']]
		});

		res.json(emprestimos);
	} catch (error) {
		console.error("erro:", error);
		res.status(500).json({ error: error.message });
	}
	
});

//criar um novo emprestimo

server.post("/emprestimos", async (req, res) => {
	try {
		const { usuario_id, livro_id, data_devolucao_prevista } = req.body;

		const livro = await livros.findByPk(livro_id);
		if (!livro) {
			return res.status(404).json({ error: "livro nao disponivel"});
		}

		const emprestimo = await Emprestimo.create({
			usuario_id: usuario_id,
			livro_id: livro_id,
			data_emprestimo: new Date(),
			data_prevista_devolucao: data_devolucao_prevista,
			status: 'ativo'
		});

		await livro.update({
			quantidade_disponivel: livro.quantidade_disponivel - 1
		});

		res.status(201).json({
			message: "emprestimo realizado",
			emprestimo: emprestimo
		});
	} catch (error) {
		console.error("erro:", error);
		res.status(500).json({ error: error.message });
	}
	
});

//devolve um livro

server.put("/emprestimos/:id/devolver", async (req, res) => {
	try {
		const { id } = req.params;

		const emprestimo = await Emprestimo.findByPk(id);
		if(!emprestimo) {
			return res.status(404).json({ error: "empresatimo nao encontrado" });
		}

		if (emprestimo.status === "devolvido") {
			return res.status(400).json({ error: "livro ja foi devolvido" });
		}

		//atualiza o emprestimo
		await emprestimo.update({
			data_devolucao_real: new Date(),
			status: "devolvido"
		});

		//aumenta quantidade disponivel do livro
		const livro = await livros.findByPk(emprestimo.livro_id);
		await livro.update({
			quantidade_disponivel: livro.quantidade_disponivel + 1
		});

		res.json({ message: "livro devolvido com sucesso"});

	}catch (error){
		console.error("erro na devolucao:", error);
		res.status(500).json({ error: error.message});
	}
	
});

//renovar emprestimo

server.put("/emprestimos/:id/renovar", async (req, res) => {
	try {
		const { id } = req.params;

		const emprestimo = await Emprestimo.findByPk(id);
		if(!emprestimo) {
			return res.status(404).json({ error: "emprestimos nao encontrados"});
		}

		if (emprestimo.status !== 'ativo') {
			return res.status(400).json({ error: "apenas emprestimos ativos podem ser renovados"});
		}

		if (emprestimo.renovacoes_restantes <= 0) {
			return res.status(400).json({ error: "nao e possivel renovar. limite de renovacoes atingido"});
		}

		//calcula nova data de devolacao +7dias

		const novaData = new Date(emprestimo.data_prevista_devolucao);
		novaData.setDate(novaData.getDate() + 7);

		await emprestimo.update({
			data_prevista_devolucao: novaData,
			renovacoes_restantes: emprestimo.renovacoes_restantes - 1
		});

		res.json({
			message: "emprestimo renovado com sucesso",
			nova_data_devolucao: novaData,
			renovacoes_restantes: emprestimo.renovacoes_restantes
		});

	} catch (error) {
		res.status(500).json({ error: error.message});
	}
	
});

//verifica emprestimos atrasados

server.get("/emprestimos/atrasados", async (req, res) => {
	try {
		const { Op } = require('sequelize');
		const hoje = new Date();

		const atrasados = await Emprestimo.findAll({
			where: {
				status: 'ativo',
				data_prevista_devolucao: { [Op.lt]: hoje }
			},
			include: [
				{ model: usuarios, attributes: ['nome', 'email'] },
				{ model: livros, attributes: ['titulo'] }
			]
		});

		res.json(atrasados);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
	
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
