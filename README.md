# 📚 Libro — Sistema de biblioteca para escolas estaduais

## 🚀 Sobre o Projeto
Sistema para facilitar a vida dos alunos e dos profissionais das bibliotecas escolares:
- fácil visualização de empréstimos e devoluções
- organização de prazos e renovações
- controle de reservas, suspensões e relatórios

## 🛠️ Tecnologias
- HTML5, CSS3 e JavaScript puro (front-end)
- Node.js + Express 5 (back-end)
- Sequelize (ORM)
- PostgreSQL hospedado no **Supabase**
- Railway (hospedagem do servidor)
- Nodemailer (e-mails) · PDFKit (relatórios) · node-cron (rotina diária)

## 📌 Funcionalidades

**Para o aluno**
- Cadastro e login com e-mail institucional (`@escola.pr.gov.br`)
- Catálogo com busca por título, autor ou categoria (também pelo nome com acento, como "História")
- Ficha completa do livro: sinopse, exemplares livres, fila de reserva e avaliações dos colegas
- Empréstimo com limite de 2 livros, renovação (até 2 vezes, +7 dias) e prazo visível ("vence amanhã", "atrasado há 2 dias")
- Fila de reserva: quando o livro volta, o aluno recebe e-mail e tem 48h para retirar
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
- Relatório em PDF e planilhas CSV (empréstimos, acervo e usuários) que abrem no Excel
- Suspensão automática por atraso, com e-mail para o aluno

**Geral**
- Rotinas automáticas: lembretes e suspensões todo dia às 8h; fila de reservas a cada hora
- Aplicativo instalável (PWA), tema claro/escuro e layout para celular
- 18 testes automatizados (`npm test`)

## 🏗️ Arquitetura (como o sistema funciona)
O sistema é dividido em três pilares, como pedido pelo professor:

1. **Frontend** (`TR/`): HTML, CSS e JavaScript puro. As telas consultam os dados direto no Supabase (biblioteca `supabase-js` e funções RPC do banco) e usam o servidor Express para recursos como os lembretes por e-mail.
2. **Backend** (`server.js` e pastas abaixo): Node.js + Express. Recebe as requisições, aplica as regras de negócio (limite de empréstimos, prazos, suspensões, reservas) e conversa com o banco pelo Sequelize.
3. **Banco de dados**: PostgreSQL no Supabase, que guarda usuários, livros, empréstimos, reservas, solicitações, suspensões, avaliações e a lista "Quero ler". Veja o diagrama em [docs/BANCO.md](docs/BANCO.md).

### Organização do backend
```
server.js            ponto de entrada: configura o Express e liga o servidor
config/regras.js     limites e prazos (2 livros, 7 dias, 2 renovações, 48h de reserva...)
routes/              quais URLs existem e quais verificações cada uma usa
controllers/         o que cada rota faz
services/            regras reaproveitadas: e-mail, suspensão, fila de reservas, lembretes
middlewares/         verificações antes das rotas (perfil, suspensão, log, erros)
models/              tabelas do banco (Sequelize), relacionamentos e migrações
jobs/agendador.js    rotinas automáticas (diária e de hora em hora)
utils/               cálculos puros: datas, estatísticas, conquistas, CSV
test/                testes automatizados (node:test)
scripts/seed.js      popula o acervo com clássicos para demonstração
docs/                API, banco de dados, regras de negócio e roteiro da apresentação
schema.sql           estrutura das tabelas em SQL
TR/                  front-end (servido como arquivos estáticos)
TR/home/extras.js    ficha do livro, avaliações, vitrines, Minha Conta, painel e balcão
TR/home/isbn.js      busca de dados do livro pelo ISBN
```

### API
São cerca de 50 rotas, organizadas por recurso (usuários, livros, empréstimos, reservas, avaliações, suspensões, painel e relatórios). A lista completa, com quem pode acessar cada uma, está em [docs/API.md](docs/API.md).

## 📚 Documentação
- [docs/API.md](docs/API.md): todas as rotas
- [docs/BANCO.md](docs/BANCO.md): diagrama entidade-relacionamento e decisões de modelagem
- [docs/REGRAS-DE-NEGOCIO.md](docs/REGRAS-DE-NEGOCIO.md): limites, prazos, suspensão, fila de reservas e conquistas
- [docs/APRESENTACAO.md](docs/APRESENTACAO.md): roteiro de demonstração e perguntas prováveis da banca

## ▶️ Como rodar localmente
1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e os dados de e-mail
3. (Opcional) Popule o acervo com clássicos: `npm run seed`
4. Rode `npm run dev` (reinicia sozinho ao salvar) ou `npm start`
5. Acesse `http://localhost:3000` e confira `http://localhost:3000/status`

| Comando | O que faz |
|---|---|
| `npm start` | inicia o servidor |
| `npm run dev` | inicia com reinício automático (nodemon) |
| `npm test` | roda os testes automatizados |
| `npm run seed` | cadastra 20 livros de domínio público para demonstração |

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
| Reserva "disponível" ficava parada para sempre | Não havia prazo para retirar o livro | Prazo de 48h, e-mail de aviso e passagem automática para o próximo da fila |

## 🗓️ Cronograma
| Semana | Período | Status |
|---|---|---|
| 1 e 2 | até 07/06 | Concluído — modelagem das tabelas, conexão com o banco via Sequelize, rotas principais da API |
| 3 | até 12/06 | Concluído — formulários do front-end (login, cadastro, catálogo, painel admin) consumindo a API real |
| 4 | até 19/06 | Concluído — correção de bugs de integração, deploy em produção no Railway, ajustes de navegação |
| 5 | até 26/06 | Concluído — limite de empréstimos, domínio institucional, PWA, notificações visuais, reservas, relatório em PDF, estatísticas |
| 6 em diante | após 26/06 | Concluído — migração para PostgreSQL/Supabase, suspensões, solicitações extras, rotina diária automática e reorganização do backend em camadas |
| Versão 2.0 | — | Concluído — ficha do livro, avaliações, Quero ler, recomendações, Minha Conta com conquistas, painel com gráficos, balcão de atendimento, cadastro por ISBN, planilhas, fila de reserva com prazo, testes automatizados e documentação |

## 🔜 Próximos passos
- Senhas criptografadas (bcrypt) e autenticação por token (JWT ou Supabase Auth)
- Leitura do código de barras do livro pela câmera do celular
- Notificações push no aplicativo
- Relatórios por turma
