const { Op } = require("sequelize");
const { sequelize, livros, Emprestimo } = require("../models");
const ErroHttp = require("../utils/ErroHttp");

function inteiroOuNulo(valor) {
    const numero = parseInt(valor, 10);
    return Number.isNaN(numero) ? null : numero;
}

// GET /livros
async function listar(req, res) {
    const lista = await livros.findAll({ order: [["id", "ASC"]] });
    res.json(lista);
}

// GET /livros/buscar/:termo  (titulo, autor ou categoria, sem diferenciar maiusculas)
async function buscar(req, res) {
    const termo = `%${req.params.termo}%`;

    const encontrados = await livros.findAll({
        where: {
            [Op.or]: [
                { titulo: { [Op.iLike]: termo } },
                { autor: { [Op.iLike]: termo } },
                { categoria: { [Op.iLike]: termo } }
            ]
        },
        order: [["titulo", "ASC"]]
    });

    res.json(encontrados);
}

// GET /livros/categoria/:categoria  (filtro feito no banco, nao mais em memoria)
async function porCategoria(req, res) {
    const categoria = req.params.categoria.toLowerCase();

    const encontrados = await livros.findAll({
        where: sequelize.where(sequelize.fn("lower", sequelize.col("categoria")), categoria),
        order: [["titulo", "ASC"]]
    });

    res.json(encontrados);
}

// GET /livros/:id
async function buscarPorId(req, res) {
    const livro = await livros.findByPk(req.params.id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }
    res.json(livro);
}

// POST /livros  (admin e bibliotecario)
async function cadastrar(req, res) {
    const { titulo, autor, isbn, editora, ano, categoria, quantidade_total, capa_url, descricao } = req.body;

    if (!titulo || !autor) {
        throw new ErroHttp(400, "Campos obrigatórios: titulo e autor");
    }

    const quantidade = inteiroOuNulo(quantidade_total) || 1;
    if (quantidade < 1) {
        throw new ErroHttp(400, "a quantidade deve ser pelo menos 1");
    }

    const novoLivro = await livros.create({
        titulo,
        autor,
        isbn: isbn || null,
        editora: editora || null,
        ano: inteiroOuNulo(ano),
        categoria: categoria || null,
        quantidade_total: quantidade,
        quantidade_disponivel: quantidade,
        capa_url: capa_url || null,
        descricao: descricao || null
    });

    res.status(201).json({ message: "Livro cadastrado com sucesso!", livro: novoLivro });
}

// PUT /livros/:id  (admin e bibliotecario)
async function editar(req, res) {
    const livro = await livros.findByPk(req.params.id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }

    const { titulo, autor, isbn, editora, ano, categoria, quantidade_total, capa_url, descricao } = req.body;

    if (!titulo || !autor) {
        throw new ErroHttp(400, "Campos obrigatórios: titulo e autor");
    }

    const novoTotal = inteiroOuNulo(quantidade_total) || livro.quantidade_total;

    // preserva quantos exemplares estao emprestados, ajustando so a disponibilidade
    const emprestadosAtualmente = livro.quantidade_total - livro.quantidade_disponivel;
    if (novoTotal < emprestadosAtualmente) {
        throw new ErroHttp(400, `existem ${emprestadosAtualmente} exemplares emprestados; o total nao pode ser menor que isso`);
    }

    await livro.update({
        titulo,
        autor,
        isbn: isbn || null,
        editora: editora || null,
        ano: inteiroOuNulo(ano),
        categoria: categoria || null,
        quantidade_total: novoTotal,
        quantidade_disponivel: novoTotal - emprestadosAtualmente,
        capa_url: capa_url || null,
        descricao: descricao || null
    });

    res.json({ message: "Livro atualizado com sucesso!", livro });
}

// DELETE /livros/:id  (admin)
async function excluir(req, res) {
    const livro = await livros.findByPk(req.params.id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }

    const emprestimosAtivos = await Emprestimo.count({ where: { livro_id: livro.id, status: "ativo" } });
    if (emprestimosAtivos > 0) {
        throw new ErroHttp(400, "este livro tem exemplares emprestados. aguarde a devolucao antes de excluir");
    }

    await livro.destroy();
    res.json({ message: "livro excluido permanentemente" });
}

module.exports = { listar, buscar, porCategoria, buscarPorId, cadastrar, editar, excluir };
