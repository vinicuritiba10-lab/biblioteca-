# Projeto de biblioteca para alunos de escola estaduais

## 🚀 Sobre o Projeto
Sistema para facilitar a vida dos alunos e profissionais das bibliotecas escolares:
- facil visualizaçao de emprestimos e devolutivas
- organizaçao de prazos e renovaçao

## 🛠️ Tecnologias
- HTML5
- CSS3
- JavaScript
- Node.js
- MySql

## 📌 Funcionalidades Atuais
- Cadastro e login de alunos e bibliotecários, restrito a e-mails institucionais (`@escola.pr.gov.br`)
- Catálogo de livros com busca por título, autor ou categoria, e capa de cada livro
- Empréstimo de livros pelo aluno, com limite de 2 livros simultâneos e sem permitir duplicar o mesmo título
- Renovação e devolução de empréstimos, com controle de renovações restantes
- Painel administrativo para bibliotecário/admin: cadastrar livros, gerenciar usuários, ver estatísticas
- Envio automático de e-mail de lembrete antes do vencimento do empréstimo
- Aplicativo instalável (PWA): funciona como app no celular, com ícone na tela inicial
- Notificações visuais (toast) no lugar dos alertas padrão do navegador

## 🏗️ Arquitetura (como o sistema funciona)
O sistema é dividido em três pilares, como pedido pelo professor:

1. **Frontend** (HTML/CSS/JavaScript puro): telas de login, cadastro, catálogo de livros e painel administrativo. Cada ação do usuário (login, pegar livro emprestado, cadastrar livro) dispara uma requisição HTTP (`fetch`) para o backend.
2. **Backend** (Node.js + Express): recebe as requisições do frontend nas rotas (`/login`, `/usuarios`, `/livros`, `/emprestimos`, etc.), aplica as regras de negócio (ex: limite de empréstimos, validação de domínio de e-mail) e conversa com o banco de dados através do Sequelize (ORM).
3. **Banco de dados** (MySQL, hospedado no Railway): armazena usuários, livros e empréstimos de forma persistente, para que nenhuma informação se perca quando o servidor reinicia.

O backend e o banco de dados ficam hospedados no **Railway**, que conecta os dois automaticamente via variáveis de ambiente.

## 🤖 Uso de IA como copiloto de código
Utilizamos o **Claude (Anthropic)** como copiloto de código durante o desenvolvimento, principalmente para revisar e corrigir erros de sintaxe e de modelagem do banco de dados, ajustar regras de negócio no backend (como limite de empréstimos e validação de e-mail institucional) e apoiar o diagnóstico de falhas no deploy em produção. As alterações sugeridas foram revisadas e aplicadas manualmente pela equipe antes de cada atualização.

## 🐞 Problemas técnicos enfrentados e resolvidos
| Problema | Causa | Solução |
|---|---|---|
| Site não abria no domínio do Railway (502) | Servidor escutava na porta 8080 (definida pelo Railway), mas o domínio público estava configurado para a porta 3000 | Ajuste da porta de destino do domínio nas configurações de rede do Railway |
| Front-end não funcionava fora do `localhost` | URLs como `http://localhost:3000` estavam fixas no código JavaScript do front-end | Troca para caminhos relativos (`/login`, `/livros`, etc.), que funcionam em qualquer ambiente |
| Páginas com erro de "usuário não encontrado" ao navegar | Rota genérica `/:nome` capturava qualquer URL antes dos arquivos estáticos | Arquivos estáticos passaram a ser servidos antes das rotas de API, e a rota raiz foi ajustada para redirecionar corretamente |
| Erros estranhos ao cadastrar/listar livros | O modelo `livros` estava configurado para usar a tabela `usuarios` no banco | Correção do `tableName` no modelo |
| App mostrava versão antiga mesmo após atualização | Service Worker do PWA mantinha em cache a versão antiga dos arquivos | Estratégia de cache trocada para "buscar sempre a versão mais nova primeiro" |
| Zoom acidental e cabeçalho desalinhado no celular | Tag de viewport duplicada/incorreta e falta de estilos responsivos | Padronização da viewport e adição de regras de CSS para telas pequenas |

## 🗓️ Cronograma
| Semana | Período | Status |
|---|---|---|
| 1 e 2 | até 07/06 | Concluído — modelagem das tabelas (usuários, livros, empréstimos), conexão com o banco MySQL via Sequelize, criação das rotas principais da API |
| 3 | até 12/06 | Concluído — formulários do front-end (login, cadastro, catálogo, painel admin) consumindo a API real |
| 4 | até 19/06 | Concluído — correção de bugs de integração, deploy em produção no Railway, ajustes de fluxo de navegação |
| 5 | até 26/06 | Em execução — novas regras de negócio (limite de empréstimos, domínio institucional), PWA, notificações visuais; pendente: relatório em PDF, reserva de livros, painel de estatísticas |
