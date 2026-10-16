// Vitrines da pagina inicial e pagina de detalhes do livro.
// Aqui as consultas sao em SQL direto, para agrupar e ordenar dentro do banco.
const { QueryTypes } = require("sequelize");
const { sequelize, livros, Emprestimo, Reserva, Avaliacao, Favorito, usuarios } = require("../models");
const { LIMITE_VITRINE } = require("../config/regras");
const ErroHttp = require("../utils/ErroHttp");

function consultar(sql, replacements = {}) {
    return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

const SQL_MAIS_EMPRESTADOS = `
    SELECT l.*, COUNT(e.id)::int AS total_emprestimos
    FROM livros l
    JOIN emprestimos e ON e.livro_id = l.id
    GROUP BY l.id
    ORDER BY total_emprestimos DESC, l.titulo ASC
    LIMIT :limite`;

const SQL_BEM_AVALIADOS = `
    SELECT l.*, ROUND(AVG(a.nota)::numeric, 1)::float AS media, COUNT(a.id)::int AS total_avaliacoes
    FROM livros l
    JOIN avaliacoes a ON a.livro_id = l.id
    GROUP BY l.id
    ORDER BY media DESC, total_avaliacoes DESC, l.titulo ASC
    LIMIT :limite`;

const SQL_NOVIDADES = `
    SELECT l.*
    FROM livros l
    ORDER BY l.id DESC
    LIMIT :limite`;

// Livros das categorias que o aluno mais le, que ele ainda nao pegou.
// Disponiveis primeiro, depois os mais populares.
const SQL_RECOMENDADOS = `
    WITH categorias_do_aluno AS (
        SELECT LOWER(l.categoria) AS categoria, COUNT(*) AS peso
        FROM emprestimos e
        JOIN livros l ON l.id = e.livro_id
        WHERE e.usuario_id = :usuario AND l.categoria IS NOT NULL AND l.categoria <> ''
        GROUP BY LOWER(l.categoria)
    ),
    popularidade AS (
        SELECT livro_id, COUNT(*) AS total FROM emprestimos GROUP BY livro_id
    )
    SELECT l.*, COALESCE(p.total, 0)::int AS total_emprestimos
    FROM livros l
    JOIN categorias_do_aluno c ON LOWER(l.categoria) = c.categoria
    LEFT JOIN popularidade p ON p.livro_id = l.id
    WHERE l.id NOT IN (SELECT livro_id FROM emprestimos WHERE usuario_id = :usuario)
    ORDER BY c.peso DESC, (l.quantidade_disponivel > 0) DESC, total_emprestimos DESC, l.titulo ASC
    LIMIT :limite`;

// Sem historico: os mais populares que o aluno ainda nao leu
const SQL_POPULARES_NAO_LIDOS = `
    SELECT l.*, COUNT(e.id)::int AS total_emprestimos
    FROM livros l
    LEFT JOIN emprestimos e ON e.livro_id = l.id
    WHERE l.id NOT IN (SELECT livro_id FROM emprestimos WHERE usuario_id = :usuario)
    GROUP BY l.id
    ORDER BY (l.quantidade_disponivel > 0) DESC, total_emprestimos DESC, l.id DESC
    LIMIT :limite`;

// GET /livros/destaques?usuario_id=3
async function destaques(req, res) {
    const limite = LIMITE_VITRINE;
    const usuarioId = parseInt(req.query.usuario_id, 10);

    const [maisEmprestados, bemAvaliados, novidades] = await Promise.all([
        consultar(SQL_MAIS_EMPRESTADOS, { limite }),
        consultar(SQL_BEM_AVALIADOS, { limite }),
        consultar(SQL_NOVIDADES, { limite })
    ]);

    let recomendados = [];
    let motivo = null;
    if (usuarioId) {
        recomendados = await consultar(SQL_RECOMENDADOS, { usuario: usuarioId, limite });
        motivo = "Com base nas categorias que você mais lê";
        if (recomendados.length === 0) {
            recomendados = await consultar(SQL_POPULARES_NAO_LIDOS, { usuario: usuarioId, limite });
            motivo = "Populares que você ainda não leu";
        }
    }

    res.json({
        recomendados: { motivo, livros: recomendados },
        mais_emprestados: maisEmprestados,
        bem_avaliados: bemAvaliados,
        novidades
    });
}

// GET /livros/categorias  -> quantos titulos cada categoria tem
async function contagemCategorias(req, res) {
    const linhas = await consultar(`
        SELECT LOWER(categoria) AS categoria, COUNT(*)::int AS total
        FROM livros
        WHERE categoria IS NOT NULL AND categoria <> ''
        GROUP BY LOWER(categoria)
        ORDER BY total DESC`);
    res.json(linhas);
}

// GET /livros/:id/detalhes?usuario_id=3
async function detalhes(req, res) {
    const livro = await livros.findByPk(req.params.id);
    if (!livro) {
        throw new ErroHttp(404, "livro nao encontrado");
    }

    const usuarioId = parseInt(req.query.usuario_id, 10) || null;

    const [avaliacoes, filaReservas, totalEmprestimos] = await Promise.all([
        Avaliacao.findAll({
            where: { livro_id: livro.id },
            include: [{ model: usuarios, attributes: ["nome"] }],
            order: [["data_avaliacao", "DESC"]]
        }),
        Reserva.count({ where: { livro_id: livro.id, status: "ativa" } }),
        Emprestimo.count({ where: { livro_id: livro.id } })
    ]);

    const soma = avaliacoes.reduce((total, a) => total + a.nota, 0);
    const distribuicao = [5, 4, 3, 2, 1].map(nota => ({
        nota,
        total: avaliacoes.filter(a => a.nota === nota).length
    }));

    let doUsuario = null;
    if (usuarioId) {
        const [jaPegou, emprestimoAtivo, reserva, favorito] = await Promise.all([
            Emprestimo.count({ where: { livro_id: livro.id, usuario_id: usuarioId } }),
            Emprestimo.findOne({ where: { livro_id: livro.id, usuario_id: usuarioId, status: "ativo" } }),
            Reserva.findOne({ where: { livro_id: livro.id, usuario_id: usuarioId, status: ["ativa", "disponivel"] } }),
            Favorito.count({ where: { livro_id: livro.id, usuario_id: usuarioId } })
        ]);
        const minhaAvaliacao = avaliacoes.find(a => a.usuario_id === usuarioId) || null;

        doUsuario = {
            favorito: favorito > 0,
            pode_avaliar: jaPegou > 0,
            minha_avaliacao: minhaAvaliacao,
            emprestimo_ativo: emprestimoAtivo,
            reserva
        };
    }

    res.json({
        livro,
        total_emprestimos: totalEmprestimos,
        fila_reservas: filaReservas,
        avaliacoes: {
            media: avaliacoes.length ? Math.round((soma / avaliacoes.length) * 10) / 10 : null,
            total: avaliacoes.length,
            distribuicao,
            recentes: avaliacoes.slice(0, 20).map(a => ({
                id: a.id,
                usuario_id: a.usuario_id,
                nome: a.usuario?.nome || "Aluno",
                nota: a.nota,
                comentario: a.comentario,
                data_avaliacao: a.data_avaliacao
            }))
        },
        usuario: doUsuario
    });
}

module.exports = { destaques, contagemCategorias, detalhes };
