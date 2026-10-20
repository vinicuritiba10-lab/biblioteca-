-- =====================================================================
-- CORREÇÃO DO ACERVO INICIAL (só para quem já rodou a primeira versão
-- do acervo-inicial.sql)
--   1. troca 3 livros da Antiguidade, que ficavam sem ano, por clássicos com data
--   2. corrige o autor da Constituição, do ECA e do livro de receitas
--   3. preenche a editora dos 118 livros (só onde ela está vazia)
-- Supabase > SQL Editor > + > cole > Run. Roda numa transação.
-- =====================================================================

begin;

update livros set titulo = 'O Contrato Social', autor = 'Jean-Jacques Rousseau', ano = 1762,
    descricao = 'Rousseau defende que o poder legítimo nasce de um acordo entre os cidadãos, ideia que inspirou a democracia moderna.'
    where titulo = 'A República' and autor = 'Platão' and ano is null;

update livros set titulo = 'Discurso do Método', autor = 'René Descartes', ano = 1637,
    descricao = 'Descartes propõe duvidar de tudo para chegar a verdades seguras e conclui: penso, logo existo.'
    where titulo = 'Meditações' and autor = 'Marco Aurélio' and ano is null;

update livros set titulo = 'O Teorema do Papagaio', autor = 'Denis Guedj', ano = 1998,
    descricao = 'Um romance em que uma família de Paris recebe a biblioteca de um velho amigo e descobre a história da matemática.'
    where titulo = 'Os Elementos' and autor = 'Euclides' and ano is null;

update livros set autor = 'Congresso Nacional'
    where titulo = 'Estatuto da Criança e do Adolescente' and autor = 'Brasil';

update livros set autor = 'Assembleia Nacional Constituinte'
    where titulo = 'Constituição da República Federativa do Brasil' and autor = 'Brasil';

update livros set autor = 'Companhia Editora Nacional'
    where titulo = 'Dona Benta: Comer Bem' and autor = 'Dona Benta';

update livros l set editora = v.editora
from (values
    ('Dom Casmurro', 'Machado de Assis', 'Ática'),
    ('Memórias Póstumas de Brás Cubas', 'Machado de Assis', 'Ática'),
    ('Quincas Borba', 'Machado de Assis', 'Ática'),
    ('O Alienista', 'Machado de Assis', 'Ática'),
    ('Esaú e Jacó', 'Machado de Assis', 'Ática'),
    ('Helena', 'Machado de Assis', 'Ática'),
    ('O Cortiço', 'Aluísio Azevedo', 'Ática'),
    ('O Mulato', 'Aluísio Azevedo', 'Ática'),
    ('Iracema', 'José de Alencar', 'Ática'),
    ('O Guarani', 'José de Alencar', 'Ática'),
    ('Senhora', 'José de Alencar', 'Ática'),
    ('Lucíola', 'José de Alencar', 'Ática'),
    ('A Moreninha', 'Joaquim Manuel de Macedo', 'Ática'),
    ('Memórias de um Sargento de Milícias', 'Manuel Antônio de Almeida', 'Ática'),
    ('O Ateneu', 'Raul Pompeia', 'Ática'),
    ('Triste Fim de Policarpo Quaresma', 'Lima Barreto', 'Ática'),
    ('Macunaíma', 'Mário de Andrade', 'Principis'),
    ('Vidas Secas', 'Graciliano Ramos', 'Record'),
    ('São Bernardo', 'Graciliano Ramos', 'Record'),
    ('Capitães da Areia', 'Jorge Amado', 'Companhia das Letras'),
    ('Gabriela, Cravo e Canela', 'Jorge Amado', 'Companhia das Letras'),
    ('O Quinze', 'Rachel de Queiroz', 'José Olympio'),
    ('Grande Sertão: Veredas', 'João Guimarães Rosa', 'Companhia das Letras'),
    ('Sagarana', 'João Guimarães Rosa', 'Nova Fronteira'),
    ('A Hora da Estrela', 'Clarice Lispector', 'Rocco'),
    ('Laços de Família', 'Clarice Lispector', 'Rocco'),
    ('Morte e Vida Severina', 'João Cabral de Melo Neto', 'Alfaguara'),
    ('O Tempo e o Vento: O Continente', 'Erico Verissimo', 'Companhia das Letras'),
    ('Menino de Engenho', 'José Lins do Rego', 'José Olympio'),
    ('Fogo Morto', 'José Lins do Rego', 'José Olympio'),
    ('A Escrava Isaura', 'Bernardo Guimarães', 'Ática'),
    ('A Bagaceira', 'José Américo de Almeida', 'José Olympio'),
    ('Quarto de Despejo', 'Carolina Maria de Jesus', 'Ática'),
    ('Marília de Dirceu', 'Tomás Antônio Gonzaga', 'Martin Claret'),
    ('Claro Enigma', 'Carlos Drummond de Andrade', 'Companhia das Letras'),
    ('Os Lusíadas', 'Luís de Camões', 'Martin Claret'),
    ('O Primo Basílio', 'Eça de Queirós', 'Ática'),
    ('A Cidade e as Serras', 'Eça de Queirós', 'Ática'),
    ('Ensaio sobre a Cegueira', 'José Saramago', 'Companhia das Letras'),
    ('Auto da Compadecida', 'Ariano Suassuna', 'Nova Fronteira'),
    ('Auto da Barca do Inferno', 'Gil Vicente', 'Ática'),
    ('O Pagador de Promessas', 'Dias Gomes', 'Bertrand Brasil'),
    ('Romeu e Julieta', 'William Shakespeare', 'L&PM'),
    ('Hamlet', 'William Shakespeare', 'L&PM'),
    ('A História da Arte', 'E. H. Gombrich', 'LTC'),
    ('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Agir'),
    ('O Hobbit', 'J. R. R. Tolkien', 'HarperCollins Brasil'),
    ('O Senhor dos Anéis: A Sociedade do Anel', 'J. R. R. Tolkien', 'HarperCollins Brasil'),
    ('O Senhor dos Anéis: As Duas Torres', 'J. R. R. Tolkien', 'HarperCollins Brasil'),
    ('O Senhor dos Anéis: O Retorno do Rei', 'J. R. R. Tolkien', 'HarperCollins Brasil'),
    ('Harry Potter e a Câmara Secreta', 'J. K. Rowling', 'Rocco'),
    ('Harry Potter e o Prisioneiro de Azkaban', 'J. K. Rowling', 'Rocco'),
    ('As Crônicas de Nárnia: O Leão, a Feiticeira e o Guarda-Roupa', 'C. S. Lewis', 'WMF Martins Fontes'),
    ('Alice no País das Maravilhas', 'Lewis Carroll', 'Zahar'),
    ('Dom Quixote', 'Miguel de Cervantes', 'Penguin-Companhia'),
    ('1984', 'George Orwell', 'Companhia das Letras'),
    ('A Revolução dos Bichos', 'George Orwell', 'Companhia das Letras'),
    ('Admirável Mundo Novo', 'Aldous Huxley', 'Biblioteca Azul'),
    ('Fahrenheit 451', 'Ray Bradbury', 'Biblioteca Azul'),
    ('Orgulho e Preconceito', 'Jane Austen', 'Penguin-Companhia'),
    ('Cem Anos de Solidão', 'Gabriel García Márquez', 'Record'),
    ('O Alquimista', 'Paulo Coelho', 'Paralela'),
    ('Frankenstein', 'Mary Shelley', 'Zahar'),
    ('Vinte Mil Léguas Submarinas', 'Júlio Verne', 'Zahar'),
    ('A Volta ao Mundo em 80 Dias', 'Júlio Verne', 'Zahar'),
    ('Moby Dick', 'Herman Melville', 'Principis'),
    ('O Retrato de Dorian Gray', 'Oscar Wilde', 'Penguin-Companhia'),
    ('O Conde de Monte Cristo', 'Alexandre Dumas', 'Zahar'),
    ('Os Miseráveis', 'Victor Hugo', 'Penguin-Companhia'),
    ('Crime e Castigo', 'Fiódor Dostoiévski', 'Editora 34'),
    ('A Metamorfose', 'Franz Kafka', 'Companhia das Letras'),
    ('O Diário de Anne Frank', 'Anne Frank', 'Record'),
    ('A Menina que Roubava Livros', 'Markus Zusak', 'Intrínseca'),
    ('Jogos Vorazes', 'Suzanne Collins', 'Rocco'),
    ('Percy Jackson e o Ladrão de Raios', 'Rick Riordan', 'Intrínseca'),
    ('Extraordinário', 'R. J. Palacio', 'Intrínseca'),
    ('Diário de um Banana', 'Jeff Kinney', 'VR Editora'),
    ('Reinações de Narizinho', 'Monteiro Lobato', 'Globinho'),
    ('O Menino Maluquinho', 'Ziraldo', 'Melhoramentos'),
    ('Meu Pé de Laranja Lima', 'José Mauro de Vasconcelos', 'Melhoramentos'),
    ('A Droga da Obediência', 'Pedro Bandeira', 'Moderna'),
    ('Uma Breve História do Tempo', 'Stephen Hawking', 'Intrínseca'),
    ('Breves Respostas para as Grandes Questões', 'Stephen Hawking', 'Intrínseca'),
    ('A Origem das Espécies', 'Charles Darwin', 'Martin Claret'),
    ('O Gene Egoísta', 'Richard Dawkins', 'Companhia das Letras'),
    ('Primavera Silenciosa', 'Rachel Carson', 'Gaia'),
    ('O Mundo Assombrado pelos Demônios', 'Carl Sagan', 'Companhia das Letras'),
    ('O Homem que Confundiu sua Mulher com um Chapéu', 'Oliver Sacks', 'Companhia das Letras'),
    ('Mortais', 'Atul Gawande', 'Objetiva'),
    ('Sapiens: Uma Breve História da Humanidade', 'Yuval Noah Harari', 'L&PM'),
    ('Raízes do Brasil', 'Sérgio Buarque de Holanda', 'Companhia das Letras'),
    ('Casa-Grande & Senzala', 'Gilberto Freyre', 'Global'),
    ('1808', 'Laurentino Gomes', 'Planeta'),
    ('O Povo Brasileiro', 'Darcy Ribeiro', 'Companhia das Letras'),
    ('Armas, Germes e Aço', 'Jared Diamond', 'Record'),
    ('Os Sertões', 'Euclides da Cunha', 'Martin Claret'),
    ('O Mundo de Sofia', 'Jostein Gaarder', 'Companhia das Letras'),
    ('O Contrato Social', 'Jean-Jacques Rousseau', 'Martins Fontes'),
    ('O Príncipe', 'Nicolau Maquiavel', 'Penguin-Companhia'),
    ('Discurso do Método', 'René Descartes', 'Martins Fontes'),
    ('Assim Falou Zaratustra', 'Friedrich Nietzsche', 'Companhia das Letras'),
    ('Pedagogia do Oprimido', 'Paulo Freire', 'Paz e Terra'),
    ('O Homem que Calculava', 'Malba Tahan', 'Record'),
    ('O Diabo dos Números', 'Hans Magnus Enzensberger', 'Companhia das Letras'),
    ('O Último Teorema de Fermat', 'Simon Singh', 'Record'),
    ('O Andar do Bêbado', 'Leonard Mlodinow', 'Zahar'),
    ('O Teorema do Papagaio', 'Denis Guedj', 'Companhia das Letras'),
    ('Código Limpo', 'Robert C. Martin', 'Alta Books'),
    ('Algoritmos para Viver', 'Brian Christian e Tom Griffiths', 'Companhia das Letras'),
    ('Os Inovadores', 'Walter Isaacson', 'Companhia das Letras'),
    ('Como as Coisas Funcionam', 'David Macaulay', 'Martins Fontes'),
    ('Pai Rico, Pai Pobre', 'Robert Kiyosaki', 'Alta Books'),
    ('A Riqueza das Nações', 'Adam Smith', 'Martin Claret'),
    ('Rápido e Devagar', 'Daniel Kahneman', 'Objetiva'),
    ('Dos Delitos e das Penas', 'Cesare Beccaria', 'Martin Claret'),
    ('Estatuto da Criança e do Adolescente', 'Congresso Nacional', 'Senado Federal'),
    ('Constituição da República Federativa do Brasil', 'Assembleia Nacional Constituinte', 'Senado Federal'),
    ('Dona Benta: Comer Bem', 'Companhia Editora Nacional', 'Companhia Editora Nacional')
) as v(titulo, autor, editora)
where lower(trim(l.titulo)) = lower(v.titulo)
  and lower(trim(l.autor)) = lower(v.autor)
  and coalesce(trim(l.editora), '') = '';

commit;

-- conferência: livros do acervo ainda sem ano, sem autor ou sem editora (deve voltar vazio,
-- a não ser pelos livros que vocês cadastraram à mão antes)
select id, titulo, autor, editora, ano from livros
where ano is null or coalesce(trim(autor), '') = '' or coalesce(trim(editora), '') = ''
order by id;
