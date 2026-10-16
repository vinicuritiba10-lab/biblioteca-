# Roteiro de apresentação para a banca

Tempo sugerido: 10 a 12 minutos de demonstração. A ideia é contar a história de um aluno e de uma bibliotecária usando o sistema, em vez de mostrar tela por tela.

## Antes de apresentar (na véspera)

1. Confira se a `supabase/migracao-v2.sql` já foi instalada: abra o site e veja se aparecem as vitrines e as estrelas nos livros.
2. Cadastre uns 10 livros pelo **ISBN** (o formulário se preenche sozinho e já traz a capa).
3. Crie duas contas: um **aluno** e uma **bibliotecária**. Deixe as duas logadas em navegadores diferentes (ou uma em aba anônima).
4. Com o aluno, pegue 1 livro, devolva 1 livro e avalie esse livro. Assim a Minha Conta já tem histórico e conquistas.
5. Para mostrar a suspensão, deixe um empréstimo atrasado: no **Table Editor** do Supabase, mude a `data_prevista_devolucao` de um empréstimo ativo para alguns dias atrás.
6. Para mostrar a fila de reserva, deixe um livro com todos os exemplares emprestados.
7. Instale o app no celular (PWA) para mostrar no fim.

## Demonstração

**1. O problema (1 min).** Hoje o controle da biblioteca da escola é feito em caderno ou planilha: o aluno não sabe o prazo, a bibliotecária não sabe quem está atrasado e não há fila para livros disputados. Abra a landing page do site para apresentar o Libro.

**2. Login com e-mail da escola (30 s).** Mostre que o cadastro só aceita `@escola.pr.gov.br`.

**3. Página inicial do aluno (2 min).**
- Os avisos no topo ("vence amanhã", "sua reserva chegou").
- As vitrines: recomendados com base no que o aluno lê, mais emprestados e mais bem avaliados.
- A busca por título, autor ou categoria.

**4. Ficha do livro (2 min).** Abra um livro: sinopse, quantos exemplares estão livres, fila de reserva, avaliações dos colegas. Pegue o livro emprestado ali mesmo. Depois tente pegar um terceiro livro e mostre o limite de 2 e o pedido de empréstimo extra.

**5. Minha Conta (1 min).** Livros lidos, pontualidade, categoria favorita, conquistas e histórico.

**6. Bibliotecária: painel (2 min).** Gráfico de empréstimos por mês, o que mais se lê, ranking e a lista de atrasados.

**7. Bibliotecária: balcão (1 min).** Registre um empréstimo presencial e receba a devolução do livro atrasado. Mostre que o aluno foi suspenso automaticamente e recebeu e-mail.

**8. Cadastro pelo ISBN (30 s).** Digite um ISBN real e mostre o formulário se preenchendo sozinho.

**9. Planilhas e PDF (30 s).** Baixe a planilha de empréstimos e abra no Excel.

**10. Celular (30 s).** Mostre o app instalado e o modo escuro.

**11. Bastidores (1 min).** Mostre uma função SQL no Supabase (a `pegar_emprestado` é boa: curta e cheia de regras) e rode `npm test` com os testes passando.

## Perguntas que a banca pode fazer

**Onde fica o back-end, se o site está no GitHub Pages?**
No Supabase. O GitHub Pages só entrega os arquivos da página; as regras (limite, prazos, suspensão, fila) ficam em funções SQL dentro do banco, e o site chama essas funções. Os e-mails saem por uma Edge Function do Supabase, que usa o Resend.

**Por que saíram do Railway?**
O Railway exigia um servidor Node ligado o tempo todo, com custo. Com as regras no Supabase, o site virou arquivos estáticos, hospedados de graça no GitHub Pages. O código do servidor Node continua no repositório como referência.

**Por que colocar regras no banco e não no JavaScript da página?**
Porque o JavaScript roda no navegador do aluno e pode ser alterado por ele. As funções rodam no banco, onde o aluno não mexe. Por isso as tabelas têm RLS ligado: o navegador só consegue ler a lista de livros direto, o resto passa pelas funções.

**Como as senhas são guardadas?**
Com bcrypt, pela extensão pgcrypto do PostgreSQL: o cadastro grava `crypt(senha, gen_salt('bf'))` e o login compara o resultado. A senha original nunca fica salva.

**Qual o ponto fraco de segurança que vocês conhecem?**
Responda com sinceridade: as funções recebem o id do usuário enviado pelo navegador, sem um token que prove quem ele é. A próxima etapa seria usar o Supabase Auth, que gera esse token, e as funções passariam a pegar o usuário do token. Mostrar que vocês conhecem a limitação conta a favor.

**Como evitam que dois alunos peguem o último exemplar ao mesmo tempo?**
Cada chamada de função no PostgreSQL roda numa transação. A verificação do estoque e a baixa acontecem dentro da mesma função, então o banco não deixa o estoque ficar negativo.

**O que acontece com o fuso horário?**
O servidor do Supabase roda em UTC. As funções novas usam `libro_hoje()`, que devolve a data em Brasília, senão um livro "atrasaria" às 21h do último dia.

**Como as tarefas automáticas rodam sem servidor?**
Sempre que alguém abre a página inicial ou o painel, a função `libro_manutencao()` encerra suspensões vencidas e expira reservas não retiradas em 48h. Como a escola usa o sistema todo dia, isso roda várias vezes por dia sem precisar de agendador.

**Como funcionam as recomendações?**
Uma consulta SQL conta as categorias que o aluno mais pegou e sugere livros dessas categorias que ele ainda não leu, com os disponíveis primeiro e depois os mais populares. Não é inteligência artificial; é uma regra simples e explicável.

**Como vocês testaram?**
Testes automatizados com o `node:test` (nativo do Node) para os cálculos do site: prazos, conquistas e planilhas (`TR/logica.js`). As telas foram testadas manualmente no computador e no celular.

**Vocês usaram IA?**
Sim, como copiloto de código, e isso está declarado no README. Explique uma parte que vocês entenderam bem, como a função `pegar_emprestado` ou a regra de suspensão.

**O que fariam com mais tempo?**
Supabase Auth com token, leitor de código de barras pela câmera do celular, notificações push no app e relatório por turma.
