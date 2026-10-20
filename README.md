# 📚 Libro — Sistema de biblioteca para escolas estaduais

## 🚀 Sobre o Projeto
Sistema para facilitar a vida dos alunos e dos profissionais das bibliotecas escolares:
- fácil visualização de empréstimos e devoluções
- organização de prazos e renovações
- controle de reservas, suspensões e relatórios

## 🛠️ Tecnologias
- HTML5, CSS3 e JavaScript puro, publicado no **GitHub Pages**
- **Supabase**: banco PostgreSQL, regras em funções SQL e Edge Function de e-mail
- **Resend** para enviar os e-mails
- pgcrypto (bcrypt) para guardar as senhas
- PWA: o site pode ser instalado no celular como aplicativo
- `node:test` para os testes automatizados

## 📌 Funcionalidades

**Para o aluno**
- Cadastro e login com e-mail institucional (`@escola.pr.gov.br`)
- Catálogo com busca por título, autor ou categoria (também pelo nome com acento, como "História")
- Ficha completa do livro: sinopse, exemplares livres, fila de reserva e avaliações dos colegas
- Empréstimo com limite de 2 livros, renovação (até 2 vezes, +7 dias) e prazo visível ("vence amanhã", "atrasado há 2 dias")
- Fila de reserva com e-mail de confirmação e posição na fila; quando chega a vez, o aluno recebe e-mail e tem 3 dias para retirar
- Pedido de empréstimo extra quando atinge o limite
- Avaliação de 1 a 5 estrelas com comentário (só para quem já pegou o livro)
- Lista "Quero ler"
- Avisos no topo da página: livro vencendo, atrasado, reserva que chegou, conta suspensa
- Vitrines: recomendados para você, mais emprestados, mais bem avaliados e novidades
- Minha Conta: livros lidos, pontualidade, categoria favorita, histórico e 7 conquistas

**Para a biblioteca**
- Painel completo: empréstimos por mês, categorias mais lidas, ranking de livros e leitores, lista de atrasados
- Balcão de atendimento para registrar empréstimos e devoluções presenciais
- Cadastro de livro pelo ISBN (preenche título, autor, editora, ano, sinopse e capa sozinho)
- Gestão de usuários, solicitações e suspensões
- Relatório em PDF e planilhas do Excel com a marca do Libro (empréstimos, acervo e usuários)
- Suspensão automática por atraso, com e-mail para o aluno

**Geral**
- Arrumação automática (suspensões vencidas e fila de reservas) sempre que alguém usa o sistema
- Aplicativo instalável (PWA), tema claro/escuro e layout para celular
- Landing page de apresentação na raiz do site
- 32 testes automatizados (`npm test`)

## 🏗️ Arquitetura (como o sistema funciona)
O sistema é dividido em três pilares, como pedido pelo professor:

1. **Frontend** (`TR/` e a landing `index.html`): HTML, CSS e JavaScript puro, hospedado no GitHub Pages. As telas chamam as funções do banco com `db.rpc(...)`.
2. **Backend**: as regras de negócio (limite de empréstimos, prazos, suspensões, fila de reservas, avaliações) ficam em **funções SQL no Supabase**, com RLS ligado em todas as tabelas. Os e-mails saem por uma **Edge Function** do Supabase, que usa o Resend.
3. **Banco de dados**: PostgreSQL no Supabase, com 9 tabelas. Veja o diagrama em [docs/BANCO.md](docs/BANCO.md).

O site não precisa de servidor próprio: o GitHub Pages entrega os arquivos e o Supabase faz o resto.

### Organização das pastas
```
index.html            landing page (página inicial do site)
TR/                   o sistema: login, página do aluno, painel da biblioteca
TR/logica.js          cálculos puros: prazos, conquistas e planilhas (testados)
TR/api.js             chamada às funções do Supabase (rpc)
TR/emailHelper.js     e-mails pela Edge Function send-email (Resend)
TR/home/extras.js     ficha do livro, avaliações, vitrines, Minha Conta, painel e balcão
TR/home/isbn.js       cadastro de livro pelo ISBN
supabase/             migracao-v2.sql (instala a versão 2) e desfazer-v2.sql
test/                 testes automatizados (npm test)
docs/                 funções do banco, diagrama, regras e roteiro da apresentação
```

Na raiz também está o código do **servidor Node (Express)** da época do Railway (`server.js`, `routes/`, `controllers/` etc.). O site publicado não usa esse servidor; ele fica no repositório como referência. Detalhes em [docs/API-SERVIDOR-NODE.md](docs/API-SERVIDOR-NODE.md).

## 📚 Documentação
- [docs/FUNCOES-SUPABASE.md](docs/FUNCOES-SUPABASE.md): todas as funções do banco, quem pode usar cada uma e quando os e-mails saem
- [docs/BANCO.md](docs/BANCO.md): diagrama entidade-relacionamento e decisões de modelagem
- [docs/REGRAS-DE-NEGOCIO.md](docs/REGRAS-DE-NEGOCIO.md): limites, prazos, suspensão, fila de reservas e conquistas
- [docs/APRESENTACAO.md](docs/APRESENTACAO.md): roteiro de demonstração e perguntas prováveis da banca

## ▶️ Instalar a versão 2 no Supabase
1. No Supabase, abra **SQL Editor** e clique no **+** para criar uma consulta nova.
2. Cole todo o conteúdo de [`supabase/migracao-v2.sql`](supabase/migracao-v2.sql) e clique em **Run**.
3. Deve aparecer `Libro v2 instalado`. Se der erro, nada foi alterado (o script roda numa transação).

Para voltar as funções antigas, rode [`supabase/desfazer-v2.sql`](supabase/desfazer-v2.sql) do mesmo jeito.

Depois, rode também [`supabase/migracao-v3.sql`](supabase/migracao-v3.sql): com ela, toda conta nova é de aluno e só o administrador promove bibliotecários. Para desfazer: [`supabase/desfazer-v3.sql`](supabase/desfazer-v3.sql).

Em seguida, [`supabase/migracao-v4.sql`](supabase/migracao-v4.sql): reservas com prazo de 3 dias, fila visível, e-mails de reserva e moderação de avaliações. Para desfazer: [`supabase/desfazer-v4.sql`](supabase/desfazer-v4.sql).

Para começar com um acervo de exemplo, rode [`supabase/acervo-inicial.sql`](supabase/acervo-inicial.sql) (118 livros, sem duplicar os que já existem). Se já rodou a primeira versão dele, rode [`supabase/acervo-correcao.sql`](supabase/acervo-correcao.sql). As capas e os ISBNs são preenchidos editando cada livro; em Gerenciar Livros, o filtro "Sem capa" mostra quais faltam.

## ▶️ Como rodar e testar
- **Site:** qualquer servidor de arquivos estáticos serve. Exemplo: `npx serve .` e abra o endereço que aparecer. No GitHub Pages, basta enviar os arquivos.
- **Testes:** `npm install` uma vez e depois `npm test`.

## 🤖 Uso de IA como copiloto de código
Utilizamos o **Claude (Anthropic)** como copiloto de código durante o desenvolvimento, principalmente para revisar e corrigir erros de sintaxe e de modelagem do banco de dados, ajustar regras de negócio no backend (como limite de empréstimos e validação de e-mail institucional), reorganizar o backend em camadas e apoiar o diagnóstico de falhas no deploy em produção. As alterações sugeridas foram revisadas e aplicadas manualmente pela equipe antes de cada atualização.

## 🐞 Problemas técnicos enfrentados e resolvidos
| Problema | Causa | Solução |
|---|---|---|
| Site não abria no domínio do Railway (502) | Servidor escutava na porta 8080 (definida pelo Railway), mas o domínio público estava configurado para a porta 3000 | Ajuste da porta de destino do domínio nas configurações de rede do Railway |
| Front-end não funcionava fora do `localhost` | URLs como `http://localhost:3000` estavam fixas no código JavaScript do front-end | Troca para caminhos relativos (`/login`, `/livros`, etc.), que funcionam em qualquer ambiente |
| Páginas com erro de "usuário não encontrado" ao navegar | Rota genérica `/:nome` capturava qualquer URL antes dos arquivos estáticos | Arquivos estáticos passaram a ser servidos antes das rotas de API, e a rota genérica ficou por último |
| Erros estranhos ao cadastrar/listar livros | O modelo `livros` estava configurado para usar a tabela `usuarios` no banco | Correção do `tableName` no modelo |
| App mostrava versão antiga mesmo após atualização | Service Worker do PWA mantinha em cache a versão antiga dos arquivos | Estratégia de cache trocada para "buscar sempre a versão mais nova primeiro" |
| Zoom acidental e cabeçalho desalinhado no celular | Tag de viewport duplicada/incorreta e falta de estilos responsivos | Padronização da viewport e adição de regras de CSS para telas pequenas |
| `ENUM` não funcionava após a migração do MySQL | PostgreSQL trata `ENUM` de forma diferente | Troca por `STRING` com validação no model |
| Datas de suspensão e atraso "pulando" um dia à noite | O servidor roda em UTC e o Brasil está em UTC-3 | Funções de data que usam o fuso `America/Sao_Paulo` |
| Dois alunos podiam pegar o último exemplar ao mesmo tempo | Leitura e baixa do estoque eram feitas separadamente | Empréstimo, devolução e aprovação feitos dentro de uma transação com trava no livro |
| `server.js` com mais de 1.300 linhas, difícil de manter | Todas as rotas num único arquivo | Separação em `routes/`, `controllers/`, `services/` e `middlewares/` |
| Livros de Matemática e Artes nunca apareciam na página inicial | O cadastro e a página inicial usavam listas de categorias diferentes | Lista única em `TR/categorias.js` usada pelas duas telas |
| A busca rodava duas vezes a cada clique | Os eventos dos botões eram registrados duas vezes | Remoção do registro duplicado |
| Sinopse aparecia como "null" ou quebrava a página | Texto inserido no HTML sem tratar aspas e valores vazios | Ficha do livro nova, com o texto tratado antes de exibir |
| Menu saía da tela em notebooks | Cabeçalho largo demais entre 900px e 1440px | Versão compacta do cabeçalho nessa faixa de largura |
| Reserva "disponível" ficava parada para sempre | Não havia prazo para retirar o livro | Prazo para retirar (hoje, 3 dias), e-mail de aviso e passagem automática para o próximo da fila |
| Custo de manter um servidor ligado no Railway | O Express precisava rodar 24 horas | Regras movidas para funções SQL no Supabase e site publicado de graça no GitHub Pages |
| Botão "Enviar Lembretes" parou de funcionar | Ele ainda chamava o servidor do Railway | Passou a usar a função `listar_lembretes_devolucao` do Supabase |
| App instalado não funcionava no GitHub Pages | Caminhos começando com `/` apontavam para fora da pasta do projeto | Caminhos relativos no service worker e no manifesto |
| Aluno suspenso conseguia pegar livro | A função de empréstimo não conferia suspensões | Verificação de suspensão dentro do `pegar_emprestado` |
| Qualquer pessoa podia se cadastrar como bibliotecário | O cadastro deixava escolher o perfil e o banco aceitava | Toda conta nova é de aluno, e só o administrador promove bibliotecários (no banco, não só na tela) |
| Aluno não conseguia pegar nem reservar um livro | Quando o exemplar livre estava guardado para outra reserva, o banco dizia que o livro estava disponível, mas não deixava pegar | A reserva passou a desconsiderar exemplares guardados, e o catálogo mostra "Guardado para reserva" |
| Planilhas sem identidade visual | O formato CSV não guarda cores nem imagens | Planilhas do Excel (.xlsx) geradas no navegador, com logo, cores e filtros |

## 🗓️ Cronograma
| Semana | Período | Status |
|---|---|---|
| 1 e 2 | até 07/06 | Concluído — modelagem das tabelas, conexão com o banco via Sequelize, rotas principais da API |
| 3 | até 12/06 | Concluído — formulários do front-end (login, cadastro, catálogo, painel admin) consumindo a API real |
| 4 | até 19/06 | Concluído — correção de bugs de integração, deploy em produção no Railway, ajustes de navegação |
| 5 | até 26/06 | Concluído — limite de empréstimos, domínio institucional, PWA, notificações visuais, reservas, relatório em PDF, estatísticas |
| 6 em diante | após 26/06 | Concluído — migração para PostgreSQL/Supabase, suspensões, solicitações extras, rotina diária automática e reorganização do backend em camadas |
| Versão 2.0 | — | Concluído — ficha do livro, avaliações, Quero ler, recomendações, Minha Conta com conquistas, painel com gráficos, balcão de atendimento, cadastro por ISBN, planilhas, fila de reserva com prazo, landing page, testes automatizados e documentação, tudo rodando no Supabase |

## 🔜 Próximos passos
- Login pelo Supabase Auth, com token, para as funções saberem com certeza quem está chamando
- Leitura do código de barras do livro pela câmera do celular
- Notificações push no aplicativo
- Relatórios por turma
