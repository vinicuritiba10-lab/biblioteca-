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
- Cadastro e login de alunos e bibliotecários com e-mail institucional (`@escola.pr.gov.br`)
- Catálogo de livros com busca por título, autor ou categoria, capa e descrição
- Empréstimo com limite de 2 livros simultâneos, sem repetir o mesmo título
- Renovação (até 2 vezes, +7 dias cada) e devolução de empréstimos
- Reserva de livros indisponíveis, com fila por ordem de chegada
- Solicitação de empréstimo extra, aprovada ou rejeitada pelo bibliotecário
- Suspensão automática por atraso (mesmo número de dias do atraso)
- Painel administrativo: livros, usuários, estatísticas e relatório em PDF
- E-mails de lembrete de devolução e de aviso de suspensão
- Rotina diária automática: envia lembretes e encerra suspensões vencidas
- Aplicativo instalável (PWA) com ícone na tela inicial
- Notificações visuais (toast) e tema claro/escuro

## 🏗️ Arquitetura (como o sistema funciona)
O sistema é dividido em três pilares, como pedido pelo professor:

1. **Frontend** (`TR/`): HTML, CSS e JavaScript puro. As telas consultam os dados direto no Supabase (biblioteca `supabase-js` e funções RPC do banco) e usam o servidor Express para recursos como os lembretes por e-mail.
2. **Backend** (`server.js` e pastas abaixo): Node.js + Express. Recebe as requisições, aplica as regras de negócio (limite de empréstimos, prazos, suspensões, reservas) e conversa com o banco pelo Sequelize.
3. **Banco de dados**: PostgreSQL no Supabase, que guarda usuários, livros, empréstimos, reservas, solicitações e suspensões.

### Organização do backend
```
server.js            ponto de entrada: configura o Express e liga o servidor
config/regras.js     limites e prazos (2 livros, 7 dias, 2 renovações...)
routes/              quais URLs existem e quais verificações cada uma usa
controllers/         o que cada rota faz
services/            regras reaproveitadas: e-mail, suspensão, lembretes
middlewares/         verificações antes das rotas (perfil, suspensão, erros)
models/              tabelas do banco (Sequelize) e relacionamentos
jobs/agendador.js    rotina automática diária
utils/               datas no fuso de Brasília e erros HTTP
schema.sql           estrutura das tabelas (documentação)
TR/                  front-end (servido como arquivos estáticos)
```

### Principais rotas da API
| Recurso | Rotas |
|---|---|
| Login e usuários | `POST /login`, `POST /usuarios`, `GET /usuarios`, `PUT /usuarios/:id/tipo`, `DELETE /usuarios/:id` |
| Livros | `GET /livros`, `GET /livros/:id`, `GET /livros/buscar/:termo`, `GET /livros/categoria/:categoria`, `POST /livros`, `PUT /livros/:id`, `DELETE /livros/:id` |
| Empréstimos | `POST /emprestimos`, `GET /emprestimos`, `GET /emprestimos/atrasados`, `GET /usuarios/:id/emprestimos`, `PUT /emprestimos/:id/renovar`, `PUT /emprestimos/:id/devolver`, `DELETE /emprestimos/:id` |
| Reservas | `POST /reservas`, `GET /usuarios/:id/reservas`, `DELETE /reservas/:id` |
| Solicitações extras | `POST /solicitacoes`, `GET /solicitacoes`, `PUT /solicitacoes/:id/aprovar`, `PUT /solicitacoes/:id/rejeitar` |
| Suspensões | `GET /suspensoes`, `POST /suspensoes`, `PUT /suspensoes/:id/encerrar`, `GET /suspensoes/verificar`, `GET /usuarios/:id/suspensao` |
| Administração | `GET /admin/usuarios`, `GET /admin/estatisticas`, `GET /relatorio/emprestimos/pdf`, `GET /notificacoes/verificar` |

## ▶️ Como rodar localmente
1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e os dados de e-mail
3. Rode `npm run dev` (reinicia sozinho ao salvar) ou `npm start`
4. Acesse `http://localhost:3000`

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

## 🗓️ Cronograma
| Semana | Período | Status |
|---|---|---|
| 1 e 2 | até 07/06 | Concluído — modelagem das tabelas, conexão com o banco via Sequelize, rotas principais da API |
| 3 | até 12/06 | Concluído — formulários do front-end (login, cadastro, catálogo, painel admin) consumindo a API real |
| 4 | até 19/06 | Concluído — correção de bugs de integração, deploy em produção no Railway, ajustes de navegação |
| 5 | até 26/06 | Concluído — limite de empréstimos, domínio institucional, PWA, notificações visuais, reservas, relatório em PDF, estatísticas |
| 6 em diante | após 26/06 | Concluído — migração para PostgreSQL/Supabase, suspensões, solicitações extras, rotina diária automática e reorganização do backend em camadas |

## 🔜 Próximos passos
- Senhas criptografadas (bcrypt) e autenticação por token
- Testes automatizados das regras de empréstimo
