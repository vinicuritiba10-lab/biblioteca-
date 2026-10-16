const { usuarios, livros, Emprestimo, Avaliacao, Reserva } = require("../models");
const { MESES_NO_PAINEL } = require("../config/regras");
const {
    situacaoEmprestimo,
    calcularPontualidade,
    contarPor,
    agruparPorMes
} = require("../utils/estatisticas");
const { dataLocalISO } = require("../utils/datas");

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

// GET /admin/painel  -> tudo que o painel completo da biblioteca precisa numa chamada
async function painel(req, res) {
    const hoje = dataLocalISO();

    const [emprestimos, totalUsuarios, totalLivros, totalCopias, copiasDisponiveis, avaliacoes, reservasNaFila] =
        await Promise.all([
            Emprestimo.findAll({
                include: [
                    { model: usuarios, attributes: ["id", "nome", "email"] },
                    { model: livros, attributes: ["id", "titulo", "autor", "categoria"] }
                ]
            }),
            usuarios.count(),
            livros.count(),
            livros.sum("quantidade_total"),
            livros.sum("quantidade_disponivel"),
            Avaliacao.findAll({ attributes: ["nota"] }),
            Reserva.count({ where: { status: "ativa" } })
        ]);

    const ativos = emprestimos.filter(e => e.status === "ativo");
    const atrasados = ativos
        .map(e => ({ e, situacao: situacaoEmprestimo(e, hoje) }))
        .filter(x => x.situacao.atrasado)
        .sort((a, b) => b.situacao.diasAtraso - a.situacao.diasAtraso);

    const somaNotas = avaliacoes.reduce((total, a) => total + a.nota, 0);
    const total = totalCopias || 0;
    const disponiveis = Math.max(copiasDisponiveis || 0, 0);

    const topLivros = contarPor(emprestimos.filter(e => e.livro), e => e.livro.id)
        .slice(0, 5)
        .map(({ chave, total }) => {
            const livro = emprestimos.find(e => e.livro && e.livro.id === chave).livro;
            return { id: livro.id, titulo: livro.titulo, autor: livro.autor, total };
        });

    const topLeitores = contarPor(emprestimos.filter(e => e.usuario), e => e.usuario.id)
        .slice(0, 5)
        .map(({ chave, total }) => {
            const usuario = emprestimos.find(e => e.usuario && e.usuario.id === chave).usuario;
            return { id: usuario.id, nome: usuario.nome, total };
        });

    res.json({
        indicadores: {
            total_usuarios: totalUsuarios,
            total_livros: totalLivros,
            total_copias: total,
            copias_disponiveis: disponiveis,
            copias_emprestadas: Math.max(total - disponiveis, 0),
            emprestimos_ativos: ativos.length,
            emprestimos_atrasados: atrasados.length,
            total_emprestimos: emprestimos.length,
            reservas_na_fila: reservasNaFila,
            pontualidade: calcularPontualidade(emprestimos),
            media_avaliacoes: avaliacoes.length ? Math.round((somaNotas / avaliacoes.length) * 10) / 10 : null,
            total_avaliacoes: avaliacoes.length
        },
        emprestimos_por_mes: agruparPorMes(emprestimos.map(e => e.data_emprestimo), MESES_NO_PAINEL, hoje),
        por_categoria: contarPor(emprestimos, e => e.livro?.categoria?.toLowerCase() || "sem categoria")
            .map(({ chave, total }) => ({ categoria: chave, total })),
        top_livros: topLivros,
        top_leitores: topLeitores,
        atrasados: atrasados.map(({ e, situacao }) => ({
            id: e.id,
            usuario: e.usuario ? { id: e.usuario.id, nome: e.usuario.nome, email: e.usuario.email } : null,
            livro: e.livro ? { id: e.livro.id, titulo: e.livro.titulo } : null,
            data_prevista_devolucao: e.data_prevista_devolucao,
            dias_atraso: situacao.diasAtraso
        })),
        gerado_em: new Date()
    });
}

module.exports = { listarUsuarios, estatisticas, painel };
