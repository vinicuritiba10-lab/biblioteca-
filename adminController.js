const { usuarios, livros, Emprestimo } = require("../models");

// GET /admin/usuarios
async function listarUsuarios(req, res) {
    const lista = await usuarios.findAll({
        attributes: { exclude: ["senha"] },
        order: [["nome", "ASC"]]
    });
    res.json(lista);
}

// GET /admin/estatisticas  (somas feitas direto no banco)
async function estatisticas(req, res) {
    const [totalUsuarios, totalLivros, emprestimosAtivos, totalCopias, copiasDisponiveis] = await Promise.all([
        usuarios.count(),
        livros.count(),
        Emprestimo.count({ where: { status: "ativo" } }),
        livros.sum("quantidade_total"),
        livros.sum("quantidade_disponivel")
    ]);

    const total = totalCopias || 0;
    const disponiveis = Math.max(copiasDisponiveis || 0, 0);

    res.json({
        total_usuarios: totalUsuarios,
        total_livros: totalLivros,
        emprestimos_ativos: emprestimosAtivos,
        livros_emprestados: Math.max(total - disponiveis, 0),
        total_copias: total,
        copias_disponiveis: disponiveis,
        data: new Date()
    });
}

module.exports = { listarUsuarios, estatisticas };
