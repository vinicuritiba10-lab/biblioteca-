// Conquistas (medalhas) do aluno. Cada uma mede um numero do historico de leitura
// e e liberada quando atinge a meta. Calculo puro, sem banco.

const CONQUISTAS = [
    {
        id: "primeira-pagina",
        icone: "📗",
        titulo: "Primeira página",
        descricao: "Pegue seu primeiro livro emprestado",
        meta: 1,
        medir: s => s.totalEmprestimos
    },
    {
        id: "leitor-dedicado",
        icone: "📚",
        titulo: "Leitor dedicado",
        descricao: "Devolva 5 livros lidos",
        meta: 5,
        medir: s => s.lidos
    },
    {
        id: "rato-de-biblioteca",
        icone: "🏛️",
        titulo: "Rato de biblioteca",
        descricao: "Devolva 15 livros lidos",
        meta: 15,
        medir: s => s.lidos
    },
    {
        id: "sempre-no-prazo",
        icone: "⏰",
        titulo: "Sempre no prazo",
        descricao: "Devolva 5 livros sem atraso",
        meta: 5,
        medir: s => s.devolucoesNoPrazo
    },
    {
        id: "explorador",
        icone: "🧭",
        titulo: "Explorador",
        descricao: "Leia livros de 3 categorias diferentes",
        meta: 3,
        medir: s => s.categoriasDistintas
    },
    {
        id: "critico-literario",
        icone: "⭐",
        titulo: "Crítico literário",
        descricao: "Avalie 3 livros",
        meta: 3,
        medir: s => s.avaliacoes
    },
    {
        id: "lista-de-desejos",
        icone: "💛",
        titulo: "Lista de desejos",
        descricao: "Guarde 5 livros em Quero ler",
        meta: 5,
        medir: s => s.favoritos
    }
];

// resumo: { totalEmprestimos, lidos, devolucoesNoPrazo, categoriasDistintas, avaliacoes, favoritos }
function calcularConquistas(resumo) {
    return CONQUISTAS.map(({ medir, ...conquista }) => {
        const valor = Number(medir(resumo)) || 0;
        return {
            ...conquista,
            progresso: Math.min(valor, conquista.meta),
            conquistada: valor >= conquista.meta
        };
    });
}

module.exports = { CONQUISTAS, calcularConquistas };
