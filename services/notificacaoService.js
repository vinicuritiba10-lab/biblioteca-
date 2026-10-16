// Lembretes de devolucao. Usado pela rota /notificacoes/verificar e pelo agendador diario.
const { Emprestimo, usuarios, livros } = require("../models");
const { enviarLembreteDevolucao } = require("./email");
const { DIAS_AVISO_VENCIMENTO } = require("../config/regras");
const { dataLocalISO, somarDiasISO, diasEntre } = require("../utils/datas");

async function enviarLembretes() {
    const hoje = dataLocalISO();
    const limite = somarDiasISO(hoje, DIAS_AVISO_VENCIMENTO);

    const ativos = await Emprestimo.findAll({
        where: { status: "ativo" },
        include: [
            { model: usuarios, attributes: ["nome", "email"] },
            { model: livros, attributes: ["titulo"] }
        ]
    });

    // vencem em ate X dias (ou ja venceram)
    const proximosDoVencimento = ativos.filter(emp =>
        emp.usuario && emp.livro && dataLocalISO(emp.data_prevista_devolucao) <= limite
    );

    const resultados = [];
    for (const emp of proximosDoVencimento) {
        const diasRestantes = diasEntre(hoje, dataLocalISO(emp.data_prevista_devolucao));

        const enviado = await enviarLembreteDevolucao(
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
            enviado,
            dias_restantes: diasRestantes
        });
    }

    return resultados;
}

module.exports = { enviarLembretes };
