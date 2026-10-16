# Regras de negócio

Os números ficam em [`config/regras.js`](../config/regras.js). Para mudar um prazo, basta alterar lá.

| Regra | Valor |
|---|---|
| Livros emprestados ao mesmo tempo por aluno | 2 |
| Prazo de um empréstimo | 7 dias |
| Renovações por empréstimo | 2, de +7 dias cada |
| Aviso de vencimento | quando faltam até 3 dias |
| Prazo para retirar um livro reservado | 48 horas |
| Suspensão por atraso | o mesmo número de dias do atraso |

## Empréstimo

1. O livro precisa ter exemplar disponível.
2. O aluno não pode estar suspenso.
3. O aluno não pode ter dois exemplares do mesmo título.
4. O aluno não pode passar do limite de 2 livros. Se quiser um terceiro, pode enviar uma **solicitação de empréstimo extra**, que o bibliotecário aprova ou rejeita.
5. O prazo é calculado pelo servidor (o aluno não escolhe a data).
6. Se o aluno tinha reserva desse livro, a reserva é marcada como concluída.

## Renovação

Só é possível renovar quando o empréstimo está ativo, ainda tem renovações, **não está atrasado**, o aluno não está suspenso e **ninguém está esperando na fila** daquele livro (quando não há outro exemplar livre).

## Devolução e suspensão

Na devolução o exemplar volta para o estoque. Se houve atraso, o aluno fica suspenso pelo mesmo número de dias e recebe um e-mail. Enquanto estiver suspenso, não pega livros, não renova e não envia solicitações. As suspensões vencidas são encerradas sozinhas todo dia às 8h.

## Fila de reservas

1. Só dá para reservar um livro que está com todos os exemplares emprestados.
2. Quando um exemplar volta, a reserva mais antiga passa para **disponível** e o aluno recebe um e-mail.
3. O aluno tem 48 horas para retirar. Se não retirar, a reserva **expira** e o próximo da fila é chamado.
4. A verificação roda a cada hora.

## Avaliações

Nota de 1 a 5 estrelas e comentário opcional (até 500 caracteres). Só avalia quem já pegou o livro emprestado. Cada aluno tem uma avaliação por livro e pode editar ou apagar a sua.

## Conquistas

Calculadas a partir do histórico do aluno (ver [`utils/conquistas.js`](../utils/conquistas.js)):

| Conquista | Meta |
|---|---|
| 📗 Primeira página | pegar o primeiro livro |
| 📚 Leitor dedicado | devolver 5 livros |
| 🏛️ Rato de biblioteca | devolver 15 livros |
| ⏰ Sempre no prazo | devolver 5 livros sem atraso |
| 🧭 Explorador | ler livros de 3 categorias diferentes |
| ⭐ Crítico literário | avaliar 3 livros |
| 💛 Lista de desejos | guardar 5 livros em Quero ler |

## Recomendações

O sistema olha as categorias que o aluno mais pegou e sugere livros dessas categorias que ele ainda não leu, com os disponíveis primeiro e depois os mais populares. Quem ainda não pegou nenhum livro vê os mais populares da escola.

## Rotinas automáticas

| Quando | O que faz |
|---|---|
| Todo dia às 8h | encerra suspensões vencidas e envia lembretes de devolução |
| A cada hora | avisa reservas que chegaram e expira as que passaram de 48h |

Para desligar (por exemplo em testes): `CRON_ATIVO=false`.
