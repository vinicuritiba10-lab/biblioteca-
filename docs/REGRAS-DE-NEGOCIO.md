# Regras de negócio

As regras ficam nas funções SQL do Supabase (veja [FUNCOES-SUPABASE.md](FUNCOES-SUPABASE.md)), então valem igual para quem usa o site no computador, no celular ou no balcão.

| Regra | Valor |
|---|---|
| Livros emprestados ao mesmo tempo por aluno | 2 |
| Prazo de um empréstimo | 7 dias |
| Renovações por empréstimo | 2, de +7 dias cada |
| Aviso de vencimento | quando faltam até 3 dias |
| Prazo para retirar um livro reservado | 3 dias |
| Suspensão por atraso | o mesmo número de dias do atraso |

## Empréstimo

1. O livro precisa ter exemplar disponível, e o exemplar não pode estar guardado para quem está na frente da fila de reserva.
2. O aluno não pode estar suspenso.
3. O aluno não pode ter dois exemplares do mesmo título.
4. O aluno não pode passar do limite de 2 livros. Se quiser um terceiro, pode enviar uma **solicitação de empréstimo extra**, que o bibliotecário aprova ou rejeita.
5. O prazo é calculado pelo banco (o aluno não escolhe a data).
6. Se o aluno tinha reserva desse livro, a reserva é marcada como concluída.

## Renovação

Só é possível renovar quando o empréstimo está ativo, ainda tem renovações, **não está atrasado**, o aluno não está suspenso e **ninguém está esperando na fila** daquele livro (quando não há outro exemplar livre).

## Devolução e suspensão

Na devolução o exemplar volta para o estoque. Se houve atraso, o aluno fica suspenso pelo mesmo número de dias e recebe um e-mail. Enquanto estiver suspenso, não pega livros e não renova. As suspensões vencidas são encerradas sozinhas (veja "Rotinas automáticas").

## Fila de reservas

1. Só dá para reservar quando não há exemplar livre. Exemplares guardados para outras reservas não contam como livres.
2. Ao reservar, o aluno recebe um e-mail de confirmação com a sua posição na fila.
3. Quando um exemplar fica livre (devolução, reserva vencida ou cancelada, exemplar novo), a reserva mais antiga passa para **disponível**, o exemplar fica guardado para esse aluno e ele recebe um e-mail e um aviso na página inicial.
4. O aluno tem 3 dias para retirar (o prazo cobre o fim de semana). Se não retirar, a reserva **expira** e o próximo da fila é chamado.
5. O catálogo e a ficha do livro mostram para todos quantos exemplares estão guardados, até quando e o tamanho da fila, sem mostrar quem reservou. Quem está na fila vê a própria posição.
6. Quando o aluno pega o livro reservado, a reserva é marcada como concluída. Ele pode sair da fila a qualquer momento.

Quando a fila anda pela arrumação automática, o banco marca o e-mail como pendente, e o site da biblioteca o envia ao ser aberto. Só a biblioteca envia esses e-mails, para que o endereço de um aluno não passe pelo navegador de outro.

## Avaliações

Nota de 1 a 5 estrelas e comentário opcional (até 500 caracteres). Só avalia quem já pegou o livro emprestado. Cada aluno tem uma avaliação por livro e pode editar ou apagar a sua. O bibliotecário e o administrador podem remover avaliações ofensivas, e cada remoção fica registrada nos logs.

## Conquistas

Calculadas a partir do histórico do aluno (ver [`TR/logica.js`](../TR/logica.js), a partir do resumo que a função `perfil_usuario` devolve):

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

O site não tem servidor ligado o tempo todo, então as rotinas rodam **quando alguém usa o sistema**. Sempre que um aluno abre a página inicial, ou a biblioteca abre o painel, a função `libro_manutencao()` faz a arrumação:

- encerra as suspensões que já venceram;
- marca como concluídas as reservas de quem já pegou o livro;
- expira as reservas não retiradas em 3 dias e chama o próximo da fila sempre que sobra exemplar livre.

Como a escola usa o sistema todo dia, isso acontece várias vezes por dia, sem precisar de agendador.

Os **lembretes de prazo por e-mail** são enviados quando a biblioteca clica em "Enviar Lembretes". Eles vão para todos que vencem em até 3 dias. O aviso na página inicial do aluno aparece sozinho, sem precisar do clique.
