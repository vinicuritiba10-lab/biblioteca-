// Popula o acervo com classicos de dominio publico para demonstracao.
// Uso: npm run seed
// So insere livros que ainda nao existem (compara titulo + autor), entao pode rodar varias vezes.
const { sequelize, livros } = require("../models");

const ACERVO = [
    { titulo: "Dom Casmurro", autor: "Machado de Assis", ano: 1899, categoria: "literatura", quantidade: 3,
      descricao: "Bentinho, já velho, revisita a juventude e o casamento com Capitu, tentando provar uma traição que talvez só exista na sua cabeça." },
    { titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", ano: 1881, categoria: "literatura", quantidade: 3,
      descricao: "Um defunto narra a própria vida com ironia, expondo a vaidade e a hipocrisia da elite do Rio de Janeiro no século XIX." },
    { titulo: "O Alienista", autor: "Machado de Assis", ano: 1882, categoria: "literatura", quantidade: 2,
      descricao: "O médico Simão Bacamarte cria um hospício em Itaguaí e começa a internar a cidade inteira, até a loucura virar uma questão de ponto de vista." },
    { titulo: "Quincas Borba", autor: "Machado de Assis", ano: 1891, categoria: "literatura", quantidade: 2,
      descricao: "Rubião herda a fortuna do filósofo Quincas Borba e se muda para a corte, onde é explorado por quem finge ser seu amigo." },
    { titulo: "O Cortiço", autor: "Aluísio Azevedo", ano: 1890, categoria: "literatura", quantidade: 2,
      descricao: "A vida coletiva de um cortiço carioca mostra como o ambiente e a ambição moldam as pessoas, num retrato forte do naturalismo." },
    { titulo: "Iracema", autor: "José de Alencar", ano: 1865, categoria: "literatura", quantidade: 2,
      descricao: "A história da indígena tabajara Iracema e do português Martim, uma lenda sobre a origem do Ceará." },
    { titulo: "Senhora", autor: "José de Alencar", ano: 1875, categoria: "literatura", quantidade: 2,
      descricao: "Aurélia fica rica e decide comprar o marido que um dia a trocou por um dote maior. Um romance sobre amor e dinheiro." },
    { titulo: "O Guarani", autor: "José de Alencar", ano: 1857, categoria: "literatura", quantidade: 1,
      descricao: "O indígena Peri dedica a vida a proteger Cecília, filha de um fidalgo português, no interior do Brasil colonial." },
    { titulo: "A Moreninha", autor: "Joaquim Manuel de Macedo", ano: 1844, categoria: "literatura", quantidade: 2,
      descricao: "Uma aposta entre estudantes durante um fim de semana numa ilha vira uma história de amor leve e cheia de surpresas." },
    { titulo: "Memórias de um Sargento de Milícias", autor: "Manuel Antônio de Almeida", ano: 1854, categoria: "literatura", quantidade: 1,
      descricao: "As aventuras do malandro Leonardo no Rio de Janeiro da época de D. João VI, contadas com muito humor." },
    { titulo: "O Ateneu", autor: "Raul Pompeia", ano: 1888, categoria: "literatura", quantidade: 1,
      descricao: "Sérgio relembra os anos num internato rígido, onde aprendeu mais sobre poder e convivência do que sobre as matérias." },
    { titulo: "Triste Fim de Policarpo Quaresma", autor: "Lima Barreto", ano: 1915, categoria: "literatura", quantidade: 2,
      descricao: "Um patriota ingênuo tenta salvar o Brasil com ideias cada vez mais ousadas e acaba esmagado pela realidade política." },
    { titulo: "Macunaíma", autor: "Mário de Andrade", ano: 1928, categoria: "literatura", quantidade: 2,
      descricao: "O herói sem nenhum caráter sai da floresta para São Paulo atrás de um amuleto, numa rapsódia que mistura mitos e modernidade." },
    { titulo: "Os Lusíadas", autor: "Luís de Camões", ano: 1572, categoria: "literatura", quantidade: 1,
      descricao: "Epopeia em versos sobre a viagem de Vasco da Gama às Índias e a história de Portugal." },
    { titulo: "Auto da Barca do Inferno", autor: "Gil Vicente", ano: 1517, categoria: "artes", quantidade: 2,
      descricao: "Peça de teatro em que as almas chegam a um porto e precisam escolher entre a barca do Céu e a do Inferno." },
    { titulo: "Os Sertões", autor: "Euclides da Cunha", ano: 1902, categoria: "historia", quantidade: 1,
      descricao: "Relato da Guerra de Canudos que descreve a terra, o homem sertanejo e o conflito com o exército republicano." },
    { titulo: "A Origem das Espécies", autor: "Charles Darwin", ano: 1859, categoria: "ciencias", quantidade: 1,
      descricao: "A obra que apresentou a teoria da evolução por seleção natural, base da biologia moderna." },
    { titulo: "O Príncipe", autor: "Nicolau Maquiavel", ano: 1532, categoria: "filosofia", quantidade: 1,
      descricao: "Um manual direto sobre como conquistar e manter o poder, que mudou a forma de pensar a política." },
    { titulo: "A República", autor: "Platão", ano: null, categoria: "filosofia", quantidade: 1,
      descricao: "Diálogo em que Sócrates discute o que é a justiça e como seria uma cidade ideal." },
    { titulo: "Os Elementos", autor: "Euclides", ano: null, categoria: "matematica", quantidade: 1,
      descricao: "Tratado que organizou a geometria a partir de definições e axiomas e foi usado no ensino por mais de dois mil anos." }
];

async function popular() {
    await sequelize.sync();

    let inseridos = 0;
    for (const item of ACERVO) {
        const existe = await livros.findOne({ where: { titulo: item.titulo, autor: item.autor } });
        if (existe) continue;

        await livros.create({
            titulo: item.titulo,
            autor: item.autor,
            ano: item.ano,
            categoria: item.categoria,
            descricao: item.descricao,
            quantidade_total: item.quantidade,
            quantidade_disponivel: item.quantidade
        });
        inseridos++;
    }

    console.log(`✅ ${inseridos} livro(s) inserido(s). ${ACERVO.length - inseridos} ja existia(m).`);
}

popular()
    .catch(erro => {
        console.error("❌ erro ao popular o acervo:", erro.message);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
