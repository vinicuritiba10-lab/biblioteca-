const express = require("express");
const cors = require("cors");
const path = require("path");
const server = express();
const port = 3000;
const usuarios = require("./models/usuarios");
const livros = require("./models/livros");
const Emprestimo = require("./models/Emprestimos");
const Reserva = require("./models/Reservas");
const Solicitacao = require("./models/Solicitacoes");
const bodyParser = require("body-parser");
const { enviarlembreteDevolucao } = require("./TR/email/config/email");
const { Op } = require('sequelize');
const { sequelize } = require('./models/db');
const PDFDocument = require('pdfkit');

 
server.use(cors());
//config bodyparser
server.use(bodyParser.urlencoded({extended: false}));
server.use(bodyParser.json());
server.use(express.json());

// serve os arquivos do front-end (html, css, js, imagens) que estao em TR/
server.use(express.static(path.join(__dirname, "TR")));

usuarios.hasMany(Emprestimo, { foreignKey: 'usuario_id' });
Emprestimo.belongsTo(usuarios, { foreignKey: 'usuario_id' });

livros.hasMany(Emprestimo, { foreignKey: 'livro_id' });
Emprestimo.belongsTo(livros, { foreignKey: 'livro_id' });

usuarios.hasMany(Reserva, { foreignKey: 'usuario_id' });
Reserva.belongsTo(usuarios, { foreignKey: 'usuario_id' });

livros.hasMany(Reserva, { foreignKey: 'livro_id' });
Reserva.belongsTo(livros, { foreignKey: 'livro_id' });

usuarios.hasMany(Solicitacao, { foreignKey: 'usuario_id' });
Solicitacao.belongsTo(usuarios, { foreignKey: 'usuario_id' });

livros.hasMany(Solicitacao, { foreignKey: 'livro_id' });
Solicitacao.belongsTo(livros, { foreignKey: 'livro_id' });

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

		//busca todos os emprestimos ativos do usuario
		const emprestimosAtivos = await Emprestimo.findAll({
			where: { usuario_id: usuario_id, status: "ativo" }
		});

		const LIMITE_MAXIMO_EMPRESTIMOS = 2;

		//verifica se ja esta com esse mesmo livro (nunca pode ter 2 copias do mesmo titulo)
		const jaTemEsseLivro = emprestimosAtivos.some(e => e.livro_id === Number(livro_id));
		if (jaTemEsseLivro) {
			return res.status(400).json({
				error: "voce ja esta com um exemplar deste livro emprestado"
			});
		}

		//verifica se atingiu o limite maximo de livros diferentes
		if (emprestimosAtivos.length >= LIMITE_MAXIMO_EMPRESTIMOS) {
			return res.status(400).json({
				error: `voce ja atingiu o limite de ${LIMITE_MAXIMO_EMPRESTIMOS} livros emprestados ao mesmo tempo`
			});
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

		//se alguem tinha reservado esse livro, avisa que ja esta disponivel
		// (pega a reserva mais antiga ainda ativa para esse livro)
		const reservaMaisAntiga = await Reserva.findOne({
			where: { livro_id: emprestimo.livro_id, status: "ativa" },
			order: [['data_reserva', 'ASC']]
		});
		if (reservaMaisAntiga) {
			await reservaMaisAntiga.update({ status: "disponivel" });
		}

		res.json({ message: "livro devolvido com sucesso"});

	}catch (error){
		console.error("erro na devolucao:", error);
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

// ============ RESERVAS DE LIVRO ============

//criar uma reserva (quando o livro esta indisponivel)
server.post("/reservas", async (req, res) => {
	try {
		const { usuario_id, livro_id } = req.body;

		const livro = await livros.findByPk(livro_id);
		if (!livro) {
			return res.status(404).json({ error: "livro nao encontrado" });
		}

		if (livro.quantidade_disponivel > 0) {
			return res.status(400).json({ error: "esse livro ja esta disponivel, nao precisa reservar" });
		}

		//verifica se o usuario ja tem reserva ativa para esse livro
		const reservaExistente = await Reserva.findOne({
			where: { usuario_id: usuario_id, livro_id: livro_id, status: { [Op.in]: ["ativa", "disponivel"] } }
		});
		if (reservaExistente) {
			return res.status(400).json({ error: "voce ja tem uma reserva para esse livro" });
		}

		const novaReserva = await Reserva.create({
			usuario_id: usuario_id,
			livro_id: livro_id,
			data_reserva: new Date(),
			status: "ativa"
		});

		res.status(201).json({ message: "reserva feita com sucesso", reserva: novaReserva });
	} catch (error) {
		console.error("erro ao reservar:", error);
		res.status(500).json({ error: error.message });
	}
});

//listar reservas de um usuario
server.get("/usuarios/:id/reservas", async (req, res) => {
	try {
		const { id } = req.params;

		const reservas = await Reserva.findAll({
			where: { usuario_id: id, status: { [Op.in]: ["ativa", "disponivel"] } },
			include: [{ model: livros, attributes: ['titulo', 'autor', 'capa_url'] }],
			order: [['data_reserva', 'DESC']]
		});

		res.json(reservas);
	} catch (error) {
		console.error("erro ao listar reservas:", error);
		res.status(500).json({ error: error.message });
	}
});

//cancelar uma reserva
server.delete("/reservas/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const reserva = await Reserva.findByPk(id);
		if (!reserva) {
			return res.status(404).json({ error: "reserva nao encontrada" });
		}

		await reserva.update({ status: "cancelada" });
		res.json({ message: "reserva cancelada com sucesso" });
	} catch (error) {
		console.error("erro ao cancelar reserva:", error);
		res.status(500).json({ error: error.message });
	}
});

// ============ SOLICITACAO DE EMPRESTIMO EXTRA ============

//aluno solicita um emprestimo extra (quando ja atingiu o limite de 2 livros)
server.post("/solicitacoes", async (req, res) => {
	try {
		const { usuario_id, livro_id } = req.body;

		const livro = await livros.findByPk(livro_id);
		if (!livro) {
			return res.status(404).json({ error: "livro nao encontrado" });
		}

		//verifica se ja existe solicitacao pendente igual
		const solicitacaoExistente = await Solicitacao.findOne({
			where: { usuario_id: usuario_id, livro_id: livro_id, status: "pendente" }
		});
		if (solicitacaoExistente) {
			return res.status(400).json({ error: "voce ja tem uma solicitacao pendente para esse livro" });
		}

		const novaSolicitacao = await Solicitacao.create({
			usuario_id: usuario_id,
			livro_id: livro_id,
			data_solicitacao: new Date(),
			status: "pendente"
		});

		res.status(201).json({ message: "solicitacao enviada. aguarde a aprovacao do bibliotecario", solicitacao: novaSolicitacao });
	} catch (error) {
		console.error("erro ao solicitar emprestimo extra:", error);
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
            quantidade_total,
            capa_url,
			descricao
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
            quantidade_disponivel: quantidade_total || 1,
            capa_url: capa_url || null,
			descricao: descricao
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

//busca um livro especifico (usado para preencher o formulario de edicao)
server.get("/livros/:id", async (req, res) => {
    try {
        const livro = await livros.findByPk(req.params.id);
        if (!livro) {
            return res.status(404).json({ error: "livro nao encontrado" });
        }
        res.json(livro);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//edita um livro existente (admin e bibliotecario)
server.put("/livros/:id", isAdminOrBibliotecario, async (req, res) => {
    try {
        const livro = await livros.findByPk(req.params.id);
        if (!livro) {
            return res.status(404).json({ error: "livro nao encontrado" });
        }

        const {
            titulo,
            autor,
            isbn,
            editora,
            ano,
            categoria,
            quantidade_total,
            capa_url,
			descricao
        } = req.body;

        if (!titulo || !autor) {
            return res.status(400).json({ error: "Campos obrigatórios: titulo e autor" });
        }

        const novoTotal = parseInt(quantidade_total) || livro.quantidade_total;

        //preserva quantos exemplares estao emprestados, ajustando so a disponibilidade
        const emprestadosAtualmente = livro.quantidade_total - livro.quantidade_disponivel;
        let novaDisponivel = novoTotal - emprestadosAtualmente;
        if (novaDisponivel < 0) novaDisponivel = 0;

        await livro.update({
            titulo: titulo,
            autor: autor,
            isbn: isbn || null,
            editora: editora || null,
            ano: ano || null,
            categoria: categoria || null,
            quantidade_total: novoTotal,
            quantidade_disponivel: novaDisponivel,
            capa_url: capa_url || null,
			descricao: descricao
        });

        res.json({ message: "Livro atualizado com sucesso!", livro: livro });
    } catch (error) {
        console.error("Erro ao editar livro:", error);
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
		let totalCopias = 0;
		for (const livro of todosLivros) {
			totalCopias += (livro.quantidade_total || 0);
			livrosEmprestados += (livro.quantidade_total - livro.quantidade_disponivel);
		}
		const copiasDisponiveis = totalCopias - livrosEmprestados;

		res.json({
			total_usuarios: totalUsuarios,
			total_livros: totalLivros,
			emprestimos_ativos: totalEmprestimos,
			livros_emprestados: livrosEmprestados || 0,
			total_copias: totalCopias,
			copias_disponiveis: copiasDisponiveis < 0 ? 0 : copiasDisponiveis,
			data: new Date() 
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});
//================================================

// ============ GESTAO DE SOLICITACOES (bibliotecario/admin) ============

//lista todas as solicitacoes pendentes
server.get("/solicitacoes", isAdminOrBibliotecario, async (req, res) => {
	try {
		const solicitacoes = await Solicitacao.findAll({
			where: { status: "pendente" },
			include: [
				{ model: usuarios, attributes: ['nome', 'email'] },
				{ model: livros, attributes: ['titulo', 'autor'] }
			],
			order: [['data_solicitacao', 'ASC']]
		});
		res.json(solicitacoes);
	} catch (error) {
		console.error("erro ao listar solicitacoes:", error);
		res.status(500).json({ error: error.message });
	}
});

//aprova uma solicitacao: cria o emprestimo de fato, ignorando o limite normal
server.put("/solicitacoes/:id/aprovar", isAdminOrBibliotecario, async (req, res) => {
	try {
		const { id } = req.params;

		const solicitacao = await Solicitacao.findByPk(id);
		if (!solicitacao) {
			return res.status(404).json({ error: "solicitacao nao encontrada" });
		}
		if (solicitacao.status !== "pendente") {
			return res.status(400).json({ error: "essa solicitacao ja foi respondida" });
		}

		const livro = await livros.findByPk(solicitacao.livro_id);
		if (!livro || livro.quantidade_disponivel <= 0) {
			return res.status(400).json({ error: "livro sem exemplares disponiveis. rejeite a solicitacao" });
		}

		const dataPrevista = new Date();
		dataPrevista.setDate(dataPrevista.getDate() + 7);

		const novoEmprestimo = await Emprestimo.create({
			usuario_id: solicitacao.usuario_id,
			livro_id: solicitacao.livro_id,
			data_emprestimo: new Date(),
			data_prevista_devolucao: dataPrevista,
			status: "ativo"
		});

		await livro.update({ quantidade_disponivel: livro.quantidade_disponivel - 1 });
		await solicitacao.update({ status: "aprovada" });

		res.json({ message: "solicitacao aprovada e emprestimo criado", emprestimo: novoEmprestimo });
	} catch (error) {
		console.error("erro ao aprovar solicitacao:", error);
		res.status(500).json({ error: error.message });
	}
});

//rejeita uma solicitacao
server.put("/solicitacoes/:id/rejeitar", isAdminOrBibliotecario, async (req, res) => {
	try {
		const { id } = req.params;

		const solicitacao = await Solicitacao.findByPk(id);
		if (!solicitacao) {
			return res.status(404).json({ error: "solicitacao nao encontrada" });
		}
		if (solicitacao.status !== "pendente") {
			return res.status(400).json({ error: "essa solicitacao ja foi respondida" });
		}

		await solicitacao.update({ status: "rejeitada" });
		res.json({ message: "solicitacao rejeitada" });
	} catch (error) {
		console.error("erro ao rejeitar solicitacao:", error);
		res.status(500).json({ error: error.message });
	}
});

// ============ RELATORIO EM PDF (bibliotecario/admin) ============

server.get("/relatorio/emprestimos/pdf", isAdminOrBibliotecario, async (req, res) => {
	try {
		const todosEmprestimos = await Emprestimo.findAll({
			include: [
				{ model: usuarios, attributes: ['nome', 'email'] },
				{ model: livros, attributes: ['titulo', 'autor'] }
			],
			order: [['data_emprestimo', 'DESC']]
		});

		const totalUsuarios = await usuarios.count();
		const totalLivros = await livros.count();
		const emprestimosAtivos = await Emprestimo.count({ where: { status: 'ativo' } });

		const doc = new PDFDocument({ margin: 40 });

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', 'attachment; filename="relatorio-emprestimos.pdf"');
		doc.pipe(res);

		doc.fontSize(20).text('Relatório de Empréstimos - Biblioteca Libro', { align: 'center' });
		doc.moveDown();
		doc.fontSize(10).fillColor('#555').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
		doc.moveDown(1.5);

		doc.fillColor('#000').fontSize(13).text('Resumo geral');
		doc.fontSize(11).text(`Total de usuários cadastrados: ${totalUsuarios}`);
		doc.text(`Total de livros no catálogo: ${totalLivros}`);
		doc.text(`Empréstimos ativos no momento: ${emprestimosAtivos}`);
		doc.moveDown(1.5);

		doc.fontSize(13).text('Histórico de empréstimos');
		doc.moveDown(0.5);

		if (todosEmprestimos.length === 0) {
			doc.fontSize(11).text('Nenhum empréstimo registrado ainda.');
		}

		todosEmprestimos.forEach((emp, index) => {
			const nomeUsuario = emp.usuario ? emp.usuario.nome : '(usuário removido)';
			const tituloLivro = emp.livro ? emp.livro.titulo : '(livro removido)';
			const dataEmprestimo = emp.data_emprestimo ? new Date(emp.data_emprestimo).toLocaleDateString('pt-BR') : '-';
			const dataPrevista = emp.data_prevista_devolucao ? new Date(emp.data_prevista_devolucao).toLocaleDateString('pt-BR') : '-';

			doc.fontSize(10).fillColor('#000').text(
				`${index + 1}. ${tituloLivro} — ${nomeUsuario} | Emprestado: ${dataEmprestimo} | Previsto: ${dataPrevista} | Status: ${emp.status}`
			);
		});

		doc.end();
	} catch (error) {
		console.error("erro ao gerar relatorio pdf:", error);
		res.status(500).json({ error: error.message });
	}
});

//================================================
server.get("/", function(req, res){
	res.redirect("/login/index.html");
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

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Banco de dados sincronizado e tabelas criadas!');
    
    // Usa o seu 'server' em vez de 'app'
    server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
      console.log('Servidor rodando com sucesso!');
    });
  })
  .catch(err => {
    console.error('Erro ao conectar ou sincronizar o banco de dados:', err);
  });
