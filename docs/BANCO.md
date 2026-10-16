# Banco de dados

PostgreSQL hospedado no Supabase. As tabelas são criadas pelo Sequelize ao iniciar o servidor (`sequelize.sync()`), e o arquivo [`schema.sql`](../schema.sql) traz o mesmo modelo em SQL puro.

## Diagrama entidade-relacionamento

O GitHub desenha o diagrama abaixo automaticamente. Para colocar nos slides, use a imagem [diagrama-er.png](diagrama-er.png).

```mermaid
erDiagram
    USUARIOS ||--o{ EMPRESTIMOS : "pega"
    LIVROS   ||--o{ EMPRESTIMOS : "é emprestado em"
    USUARIOS ||--o{ RESERVAS : "faz"
    LIVROS   ||--o{ RESERVAS : "tem fila de"
    USUARIOS ||--o{ SOLICITACOES : "pede extra"
    LIVROS   ||--o{ SOLICITACOES : "é pedido em"
    USUARIOS ||--o{ SUSPENSOES : "recebe"
    EMPRESTIMOS ||--o| SUSPENSOES : "gera"
    USUARIOS ||--o{ AVALIACOES : "escreve"
    LIVROS   ||--o{ AVALIACOES : "recebe"
    USUARIOS ||--o{ FAVORITOS : "guarda"
    LIVROS   ||--o{ FAVORITOS : "é guardado em"

    USUARIOS {
        int id PK
        string nome
        string email
        text senha
        string tipo "aluno | bibliotecario | admin"
    }
    LIVROS {
        int id PK
        string titulo
        string autor
        string isbn
        string editora
        int ano
        string categoria
        int quantidade_total
        int quantidade_disponivel
        text capa_url
        text descricao
    }
    EMPRESTIMOS {
        int id PK
        int usuario_id FK
        int livro_id FK
        timestamptz data_emprestimo
        timestamptz data_prevista_devolucao
        timestamptz data_devolucao_real
        string status "ativo | devolvido"
        int renovacoes_restantes
    }
    RESERVAS {
        int id PK
        int usuario_id FK
        int livro_id FK
        timestamptz data_reserva
        string status "ativa | disponivel | concluida | cancelada | expirada"
        timestamptz data_disponivel
    }
    SOLICITACOES {
        int id PK
        int usuario_id FK
        int livro_id FK
        timestamptz data_solicitacao
        string status "pendente | aprovada | rejeitada"
    }
    SUSPENSOES {
        int id PK
        int usuario_id FK
        int emprestimo_id FK
        string motivo
        int dias_atraso
        date data_inicio
        date data_fim
        string status "ativa | cumprida"
    }
    AVALIACOES {
        int id PK
        int usuario_id FK
        int livro_id FK
        int nota "1 a 5"
        text comentario
        timestamptz data_avaliacao
    }
    FAVORITOS {
        int id PK
        int usuario_id FK
        int livro_id FK
        timestamptz data_adicao
    }
```

## Decisões de modelagem

**Estoque no próprio livro.** Em vez de uma tabela de exemplares, `livros` guarda `quantidade_total` e `quantidade_disponivel`. Para uma biblioteca escolar isso basta e simplifica muito as consultas. Para não haver erro de contagem, toda operação que mexe no estoque (empréstimo, devolução, aprovação de solicitação) roda dentro de uma **transação com trava na linha do livro** (`SELECT ... FOR UPDATE`).

**Status como texto.** O projeto começou em MySQL com `ENUM`. Na migração para PostgreSQL, os campos viraram `VARCHAR` com validação no model do Sequelize (`isIn`), o que é mais simples de alterar depois.

**Histórico preservado.** Reservas e solicitações nunca são apagadas: mudam de status (`cancelada`, `concluida`, `expirada`, `rejeitada`). Assim dá para gerar relatórios do passado.

**Uma avaliação por aluno em cada livro.** Garantido no banco com `UNIQUE (usuario_id, livro_id)`. Se o aluno avaliar de novo, a nota antiga é atualizada.

**Apagar em cascata só onde faz sentido.** Avaliações e favoritos são apagados junto com o livro ou o usuário (`ON DELETE CASCADE`). Empréstimos não: o sistema impede excluir livro ou usuário com empréstimo ativo.

**Datas no fuso de Brasília.** O servidor roda em UTC. As comparações de prazo usam a data no fuso `America/Sao_Paulo` (ver `utils/datas.js`), senão um livro "atrasava" às 21h do último dia.
