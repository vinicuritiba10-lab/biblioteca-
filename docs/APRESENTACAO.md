# Roteiro de apresentação para a banca

Tempo sugerido: 10 a 12 minutos de demonstração. A ideia é contar a história de um aluno e de uma bibliotecária usando o sistema, em vez de mostrar tela por tela.

## Antes de apresentar (na véspera)

1. Rode `npm run seed` para o acervo ter livros de verdade.
2. Crie duas contas: um **aluno** e uma **bibliotecária**. Deixe as duas logadas em navegadores diferentes (ou uma em aba anônima).
3. Com o aluno, pegue 1 livro, devolva 1 livro e avalie esse livro. Assim a "Minha Conta" já tem histórico e conquistas.
4. Para mostrar a suspensão, deixe um empréstimo atrasado: no painel do Supabase, mude a `data_prevista_devolucao` de um empréstimo ativo para alguns dias atrás.
5. Para mostrar a fila de reserva, deixe um livro com todos os exemplares emprestados.
6. Abra `/status` no navegador e confira se aparece `"status": "ok"`.
7. Instale o app no celular (PWA) para mostrar no fim.

## Demonstração

**1. O problema (1 min).** Hoje o controle da biblioteca da escola é feito em caderno ou planilha: o aluno não sabe o prazo, a bibliotecária não sabe quem está atrasado e não há fila para livros disputados.

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

**11. Bastidores (1 min).** Mostre a organização do backend (`routes`, `controllers`, `services`) e rode `npm test` com os 18 testes passando.

## Perguntas que a banca pode fazer

**Por que PostgreSQL e não MySQL?**
Começamos em MySQL. Migramos para PostgreSQL no Supabase porque ele oferece banco gerenciado com plano gratuito, painel para ver as tabelas e funções no próprio banco. O Sequelize facilitou a troca, porque quase todo o código é independente do banco.

**Como vocês evitam que dois alunos peguem o último exemplar ao mesmo tempo?**
O empréstimo roda numa transação que trava a linha do livro (`SELECT ... FOR UPDATE`). O segundo aluno espera o primeiro terminar e, quando chega a vez dele, o estoque já está zerado.

**O que acontece se o servidor estiver em outro fuso horário?**
O Railway roda em UTC. Todas as comparações de prazo usam a data no fuso de Brasília (`utils/datas.js`), e isso tem teste automatizado.

**Como funcionam as recomendações?**
Uma consulta SQL conta as categorias que o aluno mais pegou e sugere livros dessas categorias que ele ainda não leu, com os disponíveis primeiro e depois os mais populares. Não é inteligência artificial; é uma regra simples e explicável.

**Como as tarefas automáticas rodam?**
Com `node-cron` dentro do próprio servidor: todo dia às 8h (lembretes e suspensões) e a cada hora (fila de reservas).

**Como vocês testaram?**
Testes automatizados com o `node:test` (nativo do Node, sem biblioteca extra) para as partes de cálculo: datas, prazos, pontualidade, conquistas e planilhas. As telas foram testadas manualmente em computador e celular.

**Como as senhas são guardadas?**
Responda com sinceridade: hoje a senha é comparada diretamente, sem criptografia, e a identificação do usuário nas rotas usa um header simples. A próxima etapa é usar `bcrypt` para as senhas e autenticação por token (JWT ou Supabase Auth). Mostrar que vocês conhecem a limitação conta a favor.

**Vocês usaram IA?**
Sim, como copiloto de código, e isso está declarado no README. Explique uma parte que vocês entenderam bem, como a transação do empréstimo ou a regra de suspensão.

**O que fariam com mais tempo?**
Segurança (senhas e token), leitor de código de barras pela câmera do celular, notificações push no app e relatório por turma.
