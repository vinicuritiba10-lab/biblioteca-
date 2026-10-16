# Funções do Supabase (a "API" do Libro)

O site publicado no GitHub Pages não tem servidor próprio. Toda regra de negócio fica em **funções SQL no Supabase**, chamadas pelo front-end com `db.rpc('nome_da_funcao', { parametros })`.

Todas as tabelas têm **RLS ligado** e nenhuma pode ser lida ou alterada direto pelo navegador, exceto a leitura de `livros` (política "livros são públicos para leitura"). O resto passa pelas funções abaixo, que rodam com `SECURITY DEFINER` e conferem quem está pedindo com `eh_bibliotecario` e `eh_admin`.

Cada chamada de função roda numa transação só: se der erro no meio, nada fica pela metade.

**Legenda do perfil:** *todos* = qualquer usuário logado; *biblioteca* = bibliotecário ou admin; *admin* = só admin. Funções marcadas com ★ foram criadas ou melhoradas na versão 2 (`supabase/migracao-v2.sql`).

## Conta e acesso

| Função | Perfil | O que faz |
|---|---|---|
| `cadastrar_usuario(nome, email, senha, tipo)` | todos | Cria a conta com a senha criptografada (bcrypt) |
| `login_usuario(email, senha)` | todos | Confere a senha e devolve os dados do usuário |
| `perfil_usuario(usuario_id)` ★ | todos | Minha Conta: resumo de leitura, próxima devolução, suspensão e histórico |
| `alertas_usuario(usuario_id)` ★ | todos | Avisos do topo: suspensão, atraso, vencendo, reserva que chegou |
| `consultar_suspensao_usuario(usuario_id)` | todos | Se o usuário está suspenso e até quando |
| `listar_usuarios(solicitante_id)` | biblioteca | Todos os usuários |
| `alterar_tipo_usuario(solicitante_id, usuario_id, tipo)` | biblioteca | Muda entre aluno e bibliotecário |
| `deletar_usuario(solicitante_id, usuario_id)` | biblioteca | Exclui (bloqueado se houver histórico) |
| `eh_bibliotecario(usuario_id)`, `eh_admin(usuario_id)` | interno | Verificação de perfil usada pelas outras funções |

## Catálogo e livros

| Função | Perfil | O que faz |
|---|---|---|
| `detalhes_livro(usuario_id, livro_id)` ★ | todos | Ficha completa: estoque, fila, avaliações e a situação do aluno com o livro |
| `destaques_livros(usuario_id)` ★ | todos | Vitrines: recomendados, mais emprestados, bem avaliados e novidades |
| `contagem_categorias()` ★ | todos | Quantos títulos cada categoria tem |
| `salvar_livro(solicitante_id, livro_id, ...)` | biblioteca | Cadastra (livro_id nulo) ou edita um livro |
| `excluir_livro(solicitante_id, livro_id)` | admin | Exclui (bloqueado se houver histórico) |

## Empréstimos

| Função | Perfil | O que faz |
|---|---|---|
| `pegar_emprestado(usuario_id, livro_id)` ★ | todos | Empresta por 7 dias. Bloqueia suspenso, limite de 2, título repetido e exemplar guardado para a fila |
| `renovar_emprestimo(usuario_id, emprestimo_id)` ★ | todos | +7 dias. Não renova atrasado, suspenso ou com alguém na fila |
| `devolver_livro(usuario_id, emprestimo_id)` ★ | todos | Devolve, aplica suspensão se atrasou e chama o próximo da fila |
| `apagar_emprestimo(usuario_id, emprestimo_id)` | todos | Apaga o registro |
| `listar_meus_emprestimos(usuario_id)` ★ | todos | Empréstimos do aluno |
| `emprestar_pelo_balcao(solicitante_id, usuario_id, livro_id)` ★ | biblioteca | Empréstimo presencial, com as mesmas regras do `pegar_emprestado` |
| `listar_meus_emprestimos_admin(solicitante_id)` | biblioteca | Todos os empréstimos (relatórios, balcão e planilha) |
| `listar_lembretes_devolucao(solicitante_id)` | biblioteca | Quem vence em até 3 dias (botão Enviar Lembretes) |

## Reservas e pedidos extras

| Função | Perfil | O que faz |
|---|---|---|
| `reservar_livro(usuario_id, livro_id)` | todos | Entra na fila de um livro sem exemplares livres |
| `cancelar_reserva(usuario_id, reserva_id)` | todos | Cancela (mantém o histórico) |
| `listar_minhas_reservas(usuario_id)` ★ | todos | Reservas ativas e disponíveis do aluno |
| `solicitar_emprestimo_extra(usuario_id, livro_id)` | todos | Pede um livro além do limite |
| `listar_solicitacoes_pendentes(solicitante_id)` | biblioteca | Pedidos esperando resposta |
| `aprovar_solicitacao(...)`, `rejeitar_solicitacao(...)` | biblioteca | Responde o pedido |

## Avaliações e lista "Quero ler"

| Função | Perfil | O que faz |
|---|---|---|
| `avaliar_livro(usuario_id, livro_id, nota, comentario)` ★ | todos | Cria ou atualiza a nota (1 a 5). Só para quem já pegou o livro |
| `apagar_avaliacao(usuario_id, avaliacao_id)` ★ | todos | Apaga a própria (a biblioteca pode apagar qualquer uma) |
| `medias_avaliacoes()` ★ | todos | Média e total de cada livro, para as estrelas do catálogo |
| `listar_favoritos(usuario_id)` ★ | todos | Lista Quero ler |
| `alternar_favorito(usuario_id, livro_id)` ★ | todos | Coloca ou tira da lista |

## Suspensões

| Função | Perfil | O que faz |
|---|---|---|
| `listar_suspensoes(solicitante_id)` | biblioteca | Todas as suspensões |
| `aplicar_suspensao(solicitante_id, usuario_id, emprestimo_id, motivo)` | biblioteca | Suspensão manual |
| `encerrar_suspensao(solicitante_id, suspensao_id)` | biblioteca | Encerra antes do prazo |
| `verificar_suspensoes_vencidas(solicitante_id)` | biblioteca | Encerra as vencidas |

## Painel, relatórios e registros

| Função | Perfil | O que faz |
|---|---|---|
| `painel_biblioteca(solicitante_id)` ★ | biblioteca | Indicadores, gráfico por mês, categorias, rankings e atrasados |
| `obter_estatisticas(solicitante_id)` | biblioteca | Totais do acervo |
| `listar_logs(solicitante_id)` | biblioteca | Últimas 200 ações registradas |
| `exportar_backup(solicitante_id)` | admin | Cópia completa do banco em JSON |
| `registrar_log(usuario_id, acao, detalhes)` | interno | Grava uma ação em `logs_sistema` |

## Funções de apoio ★

| Função | O que faz |
|---|---|
| `libro_hoje()` | A data de hoje no fuso de Brasília (o servidor do Supabase roda em UTC) |
| `libro_data_local(momento)` | O dia, em Brasília, de um horário qualquer |
| `libro_manutencao()` | Arrumação automática: encerra suspensões vencidas, conclui reservas atendidas e expira reservas não retiradas em 48h, chamando o próximo da fila. Roda sozinha sempre que alguém abre a página inicial ou o painel, então não precisa de agendador |

## E-mails

Os e-mails saem pela Edge Function `send-email` do Supabase, que usa o Resend. O front-end chama com `db.functions.invoke('send-email', { body: { to, subject, html } })` (veja `TR/emailHelper.js`) nestes momentos:

- **Suspensão**: logo depois de uma devolução com atraso.
- **Reserva chegou**: logo depois da devolução que liberou o livro para o primeiro da fila.
- **Renovação**: confirmação com a nova data.
- **Lembrete de prazo**: quando a biblioteca clica em "Enviar Lembretes".
