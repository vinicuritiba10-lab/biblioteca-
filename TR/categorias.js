// categorias.js — lista unica de categorias do acervo.
// A pagina inicial e o cadastro de livros usam as mesmas chaves, entao um livro
// cadastrado numa categoria sempre aparece no card dessa categoria.
window.LIBRO_CATEGORIAS = [
    { chave: "literatura", nome: "Literatura", icone: "📚" },
    { chave: "ciencias", nome: "Ciências", icone: "🧬" },
    { chave: "matematica", nome: "Matemática", icone: "📐" },
    { chave: "historia", nome: "História", icone: "🏛️" },
    { chave: "filosofia", nome: "Filosofia", icone: "🎭" },
    { chave: "tecnologia", nome: "Tecnologia", icone: "💻" },
    { chave: "artes", nome: "Artes", icone: "🎨" },
    { chave: "economia", nome: "Economia", icone: "📊" },
    { chave: "direito", nome: "Direito", icone: "⚖️" },
    { chave: "engenharia", nome: "Engenharia", icone: "🛠️" },
    { chave: "medicina", nome: "Medicina", icone: "🏥" },
    { chave: "culinaria", nome: "Culinária", icone: "👨‍🍳" }
];

window.nomeCategoria = function (chave) {
    if (!chave) return "Sem categoria";
    const encontrada = window.LIBRO_CATEGORIAS.find(c => c.chave === String(chave).toLowerCase());
    return encontrada ? encontrada.nome : chave;
};

window.iconeCategoria = function (chave) {
    const encontrada = window.LIBRO_CATEGORIAS.find(c => c.chave === String(chave || "").toLowerCase());
    return encontrada ? encontrada.icone : "📖";
};
