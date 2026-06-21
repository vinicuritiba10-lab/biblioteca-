const express = require("express");
const cors = require("cors");
const server = express();
const PORT = process.env.PORT || 3000;
const usuarios = require("./models/usuarios");
const livros = require("./models/livros");
const Emprestimo = require("./models/Emprestimos");
const bodyParser = require("body-parser");
const { enviarlembreteDevolucao } = require("./TR/email/config/email");
const { Op } = require('sequelize');
const { sequelize } = require('./models/db');

 
server.use(cors());
//config bodyparser
server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());
server.use(express.json());

usuarios.hasMany(Emprestimo, { foreignKey: 'usuario_id' });
Emprestimo.belongsTo(usuarios, { foreignKey: 'usuario_id' });

livros.hasMany(Emprestimo, { foreignKey: 'livro_id' });
Emprestimo.belongsTo(livros, { foreignKey: 'livro_id' });

//cadastrar usuarios
server.post("/usuarios", async (req, res) => {
	try {
		const { nome, email, senha, tipo} = req.body;

		console.log("tentando cadastrar:", {nome, email, tipo});

		//validacao de campos obrigatorios

		if(!nome || !email || !senha) {
			return res.status(400).json({
				error: "campos obrigatorios: nome, email, senha"
			});
		}

		//verifica se email ja existe
		const usuarioExistente = await usuarios.findOne({
			where: { email: email }
		});

		if(usuarioExistente) {
			return res.status(400).json({
				error: "email ja cadastrado"
			});
		}

		//cria o usuario
		const novoUsuario = await usuarios.create({
			nome: nome,
			email: email,
			senha: senha,
			tipo: tipo || 'aluno'
		});

		console.log("usuario cadastrado:", novoUsuario.id);

		res.status(201).json({
			message: "usuario cadastrado com sucesso",
			usuario: {
				id: novoUsuario.id,
				nome: novoUsuario.nome,
				email: novoUsuario.email,
				tipo: novoUsuario.tipo
			}
		});
	} catch (error) {
		console.error("erro ao cadastrar", error);
		res.status(500).json({ error: error.message});
	}
});

server.get("/usuarios", async (req, res) => {
	try {
		const usuariosLista = await usuarios.findAll();
		res.json(usuariosLista);
	} catch (error) {
		console.error("erro:", error);
		res.status(500).json({ error: error.message });
	}
});

//login do usuario
server.post("/login", async (req, res) => {
	try {
		const {email, senha} = req.body;

		const usuario = await usuarios.findOne({
			where: {email: email}
		});

		if (!usuario) {
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

// server.post("/livros-biblio", function(req, res){
//  	livros.create({
//  		titulo: req.body.titulo,
//  		autor: req.body.autor,
//  		isbn: req.body.isbn,
//  		editora: req.body.editora,
//  		ano: req.body.ano,
//  		categoria: req.body.categoria,
//  		quantidade_total: req.body.quantidade_total,
//  		quantidade_disponivel: req.body.quantidade_disponivel
//  	})
// });

//buscar livros
server.get("/livros/buscar/:termo", async function(req, res){
	try{
		const { termo } = req.params;
		const { Op, DATE } = require("sequelize");
		
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

server.get("/livros", async (req, res) => {
	try {
		const livrosLista = await livros.findAll();
		res.json(livrosLista);
	} catch (error) {
		res.status(500).json({ error: "erro ao buscar livros:" + error.message});
	}
});

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
		const{ usuario_id, livro_id, data_devolucao_prevista, } = req.body;

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

//apagar emprestimo

server.delete("/emprestimos/:id", function(req, res){
	Emprestimo.destroy({ where: { id: req.params.id } }).then(function(){
		res.status(200).json({ message: "emprestimo deletado com sucesso"});
	}).catch(function(erro) {
		res.status(500).json({ error: "erro ao deletar emprestimo:" + erro });
	});
	
});

// renovar emprestimo (aluno e bibliotecario)

server.put("/emprestimos/:id/renovar", async (req, res) => {
	try {
		const { id } = req.params;

		//busca o emprestimo
		const emprestimo = await Emprestimo.findByPk(id, {
			include: [
				{ model: usuarios, attributes: ['nome', 'email'] },
				{ model: livros, attributes: ['titulo'] }
			]
		});

		if (!emprestimo) {
			return res.status(404).json({ error: "emprestimo nao encontrado" });
		}

		//verifica se esta ativo
		if(emprestimo.status !== 'ativo') {
			return res.status(400).json({ error: "apenas emprestimos ativos podem ser renovados" });
		}

		//verifica se tem renovacoes disponiveis

		if(emprestimo.renovacoes_restantes <= 0) {
			return res.status(400).json({ error: "limite de renovacoes atingido (maximo 2)" });
		}

		//calcula nova data de devolucao (+7 dias)
		const novaData = new Date(emprestimo.data_prevista_devolucao);
	    novaData.setDate(novaData.getDate() + 7);

		//atualiza o emprestimo

		await emprestimo.update({
			data_prevista_devolucao: novaData,
			renovacoes_restantes: emprestimo.renovacoes_restantes - 1
		});

		//envia email de confirmacao de renovacao
		const emailEnviado = await enviarlembreteDevolucao(
			emprestimo.usuario.email,
			emprestimo.usuario.nome,
			emprestimo.livro.titulo,
			novaData,
			7
		);

		res.json({
			message: "emprestimo renovado com sucesso",
			nova_data_devolucao: novaData,
			renovacoes_restantes: emprestimo.renovacoes_restantes,
			email_enviado: emailEnviado
		});
	} catch (error) {
		console.error("erro na renovacao:", error);
		res.status(500).json({ error: error.message });
	}
		
});

//verificar e enviar lembretes

server.get("/notificacoes/verificar", async (req, res) => {
	try {
		const { Op } = require('sequelize');
		const hoje = new Date();
		const daqui3Dias = new Date();
		daqui3Dias.setDate(hoje.getDate() + 3);

		//busca emprestimos que vencem em ate 3 dias
		const emprestimos = await Emprestimo.findAll({
			where: {
				status: 'ativo',
				data_prevista_devolucao: {
					[Op.lte]: daqui3Dias
				}
			},
			include: [
				{ model: usuarios, attributes: ['nome', 'email'] },
				{ model: livros, attributes: ['titulo'] }
			]
		});


		const resultados = [];

		for (const emp of emprestimos) {
			const dataDevolucao = new Date(emp.data_prevista_devolucao);
			const diasRestantes = Math.ceil((dataDevolucao - hoje) / (1000 * 60 * 60 * 24));

			const enviado = await enviarlembreteDevolucao(
				emp.usuario.email,
				emp.usuario.nome,
				emp.livro.titulo,
				emp.data_prevista_devolucao,
				diasRestantes
			);

			resultados.push({
				usuario: emp.usuario.nome,
				livro: emp.livro.titulo,
				email: emp.usuario.email,
				enviado: enviado,
				dias_restantes: diasRestantes
			});
		}

		res.json({
			message: `notificacoes processadas: ${resultados.length}`,
			notificacoes: resultados
		});
	} catch (error) {
		console.error("erro:", error);
		res.status(500).json({ error: error.message });
	}
});

//midlewares de autenticacao

//midleware para verificar se e admin
function isAdmin(req, res, next){
	//pega o token do header
	const usuarioId = req.headers['usuario-id'];

	if(!usuarioId){
		return res.status(401).json({ error: "usuario nao autenticado" });
	}

	//busca o usuario no banco
	usuarios.findByPk(usuarioId).then(usuario => {
		if(!usuario) {
			return res.status(404).json({ error: "usuario nao encontrado" });
		}

		if (usuario.tipo !== 'admin') {
			return res.status(403).json({ error: "acesso negado. permissao de administrador necessario"});
		}

		req.usuario = usuario;
		next();
	}).catch(error => {
		res.status(500).json({ error: error.message });
	});
}

//midleware para verificar se e admin ou bibliotecario
function isAdminOrBibliotecario(req, res, next) {
	const usuarioId = req.headers['usuario-id'];

	if(!usuarioId) {
		return res.status(401).json({ error: "usuario nao autenticado"});
	}

	usuarios.findByPk(usuarioId).then(usuario => {
		if(!usuario) {
			return res.status(404).json({ error: "usuario nao encontrado" });
		}

		if (usuario.tipo !== 'admin' && usuario.tipo !== 'bibliotecario') {
			return res.status(403).json({ error: "acesso negado. permissao de bibliotecario admin necessaria" });
		}

		req.usuario = usuario;
		next();

	}).catch(error => {
		res.status(500).json({ error: error.message });
	});
}

// =========== ROTAS PROTEGIDAS ===============

//apenas admin e bibliotecario podem cadastrar livros
server.get("/livros", async (req, res) => {
    // Pública - qualquer um pode ver
    try {
        const todosLivros = await livros.findAll();
        res.json(todosLivros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para cadastrar livros (admin e bibliotecario)
server.post("/livros", isAdminOrBibliotecario, async (req, res) => {
    try {
        console.log("Dados recebidos no body:", req.body); // ← DEBUG
        
        const { 
            titulo, 
            autor, 
            isbn, 
            editora, 
            ano, 
            categoria, 
            quantidade_total 
        } = req.body;
        
        // VALIDAÇÃO: verifica se os campos obrigatórios existem
        if (!titulo || !autor) {
            return res.status(400).json({ 
                error: "Campos obrigatórios: titulo e autor" 
            });
        }
        
        const novoLivro = await livros.create({
            titulo: titulo,
            autor: autor,
            isbn: isbn || null,
            editora: editora || null,
            ano: ano || null,
            categoria: categoria || null,
            quantidade_total: quantidade_total || 1,
            quantidade_disponivel: quantidade_total || 1
        });
        
        console.log("Livro criado:", novoLivro.toJSON()); // ← DEBUG
        
        res.status(201).json({ 
            message: "Livro cadastrado com sucesso!",
            livro: novoLivro
        });
        
    } catch (error) {
        console.error("Erro detalhado:", error);
        res.status(500).json({ error: error.message });
    }
});

//apenas admin pode deletar qualquer livro
server.delete("/livros/:id", isAdmin, async (req, res) => {
	try {
		const Nlivro = await livros.findByPk(req.params.id);
		if (!Nlivro) {
			return res.status(404).json({ error: "livro nao encontrado" });
		} 

		await Nlivro.destroy();
		res.json({ message: "livro excluido permanentemente" });
	} catch (error) {
		res.status(500).json({ error: error.message});
	}
});

//apenas admin pode alterar tipo de usuario
server.put("/usuarios/:id/tipo", isAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { tipo } = req.body;

		console.log("recebendo requisicao:");
		console.log("ID do usuario a alterar:", id);
		console.log("novo tipo:", tipo);
		console.log("admin ID:", req.usuario?.id);

		if (!['aluno', 'bibliotecario', 'admin'].includes(tipo)) {
			return res.status(400).json({ error: "tipo invalido" });
		}

		//busca usuario
		const Ousuario = await usuarios.findByPk(id);
		if(!Ousuario) {
			return res.status(404).json({ error: "usuario nao encontrado" });
		}

		console.log("usuario encontrado:", Ousuario.nome, "tipo atual:", Ousuario.tipo);

		await Ousuario.update({ tipo: tipo });
		res.json({ message: `usuario ${Ousuario.nome} agora e ${tipo}`, 
		Ousuario: {
			id: Ousuario.id,
			nome: Ousuario.nome,
			tipo: Ousuario.tipo
		}
	  });
	} catch (error) {
		res.status(500).json({ error: error.message});
	}
});

//apenas admin pode listar todos os usuarios
server.get("/admin/usuarios", isAdmin, async (req, res) => {
	try {
		const Pusuarios = await usuarios.findAll({
			attributes: { exclude: ['senha'] }
		});
		res.json(Pusuarios);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

//delete do admin
server.delete("/usuarios/:id", isAdmin, async (req, res) => {
	try {
		const apUsuario = await usuarios.findByPk(req.params.id);
		if(!apUsuario) {
			return res.status(404).json({ error: "usuario nao encontrado" });
		}

		await apUsuario.destroy();
		res.json({ message: "usuario excluido permanentemente" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

//apenas admin pode ver estatisticas do sistema
server.get("/admin/estatisticas", isAdmin, async (req, res) => {
	try {
		const totalUsuarios = await usuarios.count();
		const totalLivros = await livros.count();
		const totalEmprestimos = await Emprestimo.count({ where: { status: 'ativo' } });
		
		const todosLivros = await livros.findAll();
		let livrosEmprestados = 0;
		for (const livro of todosLivros) {
			livrosEmprestados += (livro.quantidade_total - livro.quantidade_disponivel);
		}

		res.json({
			total_usuarios: totalUsuarios,
			total_livros: totalLivros,
			emprestimos_ativos: totalEmprestimos,
			livros_emprestados: livrosEmprestados || 0,
			data: new Date() 
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});
//================================================
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

// server.listen(port, () =>{
// 	console.log(`example app listening on port ${port}`);
// });

sequelize.sync({ force: true })
  .then(() => {
    console.log('Banco de dados sincronizado e tabelas criadas!');
    
    // Força a porta do Railway. Se não existir (no seu PC), usa 3000.
    const portaFinal = Number(process.env.PORT) || 3000;
    
    // PASSANDO A PORTA COMO NÚMERO E O HOST CORRETO PARA REDES DOCKER
    server.listen(portaFinal, "0.0.0.0", () => {
      console.log(`Servidor iniciado com sucesso na porta: ${portaFinal}`);
    });
  })
  .catch(err => {
    console.error('Erro ao conectar ou sincronizar o banco de dados:', err);
  });