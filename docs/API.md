# API do Libro

Servidor Node.js + Express. Todas as respostas são JSON (exceto PDF e CSV). Em caso de erro, a resposta tem o formato `{ "error": "mensagem" }` com o código HTTP adequado (400, 403, 404, 500).

**Perfil exigido:** as rotas marcadas como *biblioteca* exigem o header `usuario-id` de um bibliotecário ou admin; as marcadas como *admin*, de um admin. No front-end, o arquivo `TR/api.js` envia esse header automaticamente.

## Sistema

| Método | Rota | Descrição |
|---|---|---|
| GET | `/status` | Situação do servidor e do banco (usado para monitorar o deploy) |

## Usuários e login

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/login` | — | `{ email, senha }` → dados do usuário |
| POST | `/usuarios` | — | Cadastro: `{ nome, email, senha, tipo }` |
| GET | `/usuarios` | — | Lista de usuários |
| GET | `/usuarios/:id/perfil` | — | Minha Conta: resumo, conquistas, histórico, próxima devolução |
| GET | `/usuarios/:id/alertas` | — | Avisos: atrasos, vencimentos, reservas que chegaram, suspensão |
| GET | `/usuarios/:id/suspensao` | — | Se o usuário está suspenso e até quando |
| PUT | `/usuarios/:id/tipo` | admin | `{ tipo }` muda o perfil |
| DELETE | `/usuarios/:id` | admin | Exclui (bloqueado se houver empréstimo ativo) |

## Livros

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/livros` | — | Acervo completo |
| GET | `/livros/:id` | — | Um livro |
| GET | `/livros/:id/detalhes?usuario_id=` | — | Ficha completa: estoque, fila, avaliações e situação do aluno |
| GET | `/livros/destaques?usuario_id=` | — | Vitrines: recomendados, mais emprestados, bem avaliados, novidades |
| GET | `/livros/categorias` | — | Quantos títulos cada categoria tem |
| GET | `/livros/buscar/:termo` | — | Busca em título, autor e categoria |
| GET | `/livros/categoria/:categoria` | — | Livros de uma categoria |
| POST | `/livros` | biblioteca | Cadastra |
| PUT | `/livros/:id` | biblioteca | Edita (preserva os exemplares emprestados) |
| DELETE | `/livros/:id` | admin | Exclui (bloqueado se houver empréstimo ativo) |

## Avaliações e lista "Quero ler"

| Método | Rota | Descrição |
|---|---|---|
| GET | `/avaliacoes/medias` | `{ livro_id: { media, total } }` para as estrelas do catálogo |
| POST | `/livros/:id/avaliacoes` | `{ usuario_id, nota, comentario }` cria ou atualiza a avaliação |
| DELETE | `/avaliacoes/:id` | Apaga a própria avaliação (header `usuario-id`) |
| GET | `/usuarios/:id/favoritos` | Lista "Quero ler" |
| POST | `/usuarios/:id/favoritos` | `{ livro_id }` adiciona |
| DELETE | `/usuarios/:id/favoritos/:livroId` | Remove |

## Empréstimos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/emprestimos` | `{ usuario_id, livro_id }`; bloqueia se o aluno estiver suspenso |
| GET | `/emprestimos?status=&usuario_id=` | Lista com filtros opcionais |
| GET | `/emprestimos/atrasados` | Empréstimos ativos com prazo vencido |
| GET | `/usuarios/:id/emprestimos` | Empréstimos de um aluno |
| PUT | `/emprestimos/:id/renovar` | +7 dias, se as regras permitirem |
| PUT | `/emprestimos/:id/devolver` | Devolve; aplica suspensão e chama a fila de reserva |
| DELETE | `/emprestimos/:id` | Apaga o registro (devolve o exemplar se estava ativo) |

## Reservas e solicitações

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/reservas` | — | `{ usuario_id, livro_id }` entra na fila |
| GET | `/usuarios/:id/reservas` | — | Reservas ativas e disponíveis do aluno |
| DELETE | `/reservas/:id` | — | Cancela (mantém o histórico) |
| POST | `/solicitacoes` | — | Pedido de empréstimo além do limite |
| GET | `/solicitacoes` | biblioteca | Pedidos pendentes |
| PUT | `/solicitacoes/:id/aprovar` | biblioteca | Cria o empréstimo |
| PUT | `/solicitacoes/:id/rejeitar` | biblioteca | Rejeita |

## Suspensões

Todas exigem perfil *biblioteca*.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/suspensoes` | Todas as suspensões |
| POST | `/suspensoes` | `{ usuario_id, emprestimo_id, motivo }` aplica manualmente |
| PUT | `/suspensoes/:id/encerrar` | Encerra antes do prazo |
| GET | `/suspensoes/verificar` | Encerra as vencidas (também roda sozinho todo dia) |

## Painel, relatórios e notificações

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/admin/painel` | biblioteca | Indicadores, gráfico por mês, categorias, rankings e atrasados |
| GET | `/admin/estatisticas` | admin | Totais do acervo |
| GET | `/admin/usuarios` | biblioteca | Usuários sem o campo senha |
| GET | `/relatorio/emprestimos/pdf` | biblioteca | Relatório em PDF |
| GET | `/relatorio/:tipo/csv` | biblioteca | Planilha: `emprestimos`, `livros` ou `usuarios` |
| GET | `/notificacoes/verificar` | — | Envia lembretes de devolução agora |

## Exemplo: ficha do livro

`GET /livros/1/detalhes?usuario_id=3`

```json
{
  "livro": { "id": 1, "titulo": "Dom Casmurro", "autor": "Machado de Assis", "quantidade_total": 3, "quantidade_disponivel": 1 },
  "total_emprestimos": 14,
  "fila_reservas": 0,
  "avaliacoes": {
    "media": 4.7,
    "total": 3,
    "distribuicao": [{ "nota": 5, "total": 2 }, { "nota": 4, "total": 1 }],
    "recentes": [{ "nome": "Carlos Lima", "nota": 5, "comentario": "Genial." }]
  },
  "usuario": { "favorito": false, "pode_avaliar": true, "emprestimo_ativo": null, "reserva": null }
}
```
