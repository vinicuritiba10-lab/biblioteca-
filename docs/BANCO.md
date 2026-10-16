# Banco de dados

PostgreSQL hospedado no Supabase. As regras ficam em funções SQL no próprio banco (lista em [FUNCOES-SUPABASE.md](FUNCOES-SUPABASE.md)), e as tabelas novas da versão 2 são criadas por [`supabase/migracao-v2.sql`](../supabase/migracao-v2.sql).

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
    USUARIOS ||--o{ LOGS_SISTEMA : "gera"

    USUARIOS {
        bigint id PK
        string nome
        string email
        text senha "bcrypt"
        string tipo "aluno | bibliotecario | admin"
        timestamptz created_at
    }
    LIVROS {
        bigint id PK
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
        bigint id PK
        bigint usuario_id FK
        bigint livro_id FK
        timestamptz data_emprestimo
        timestamptz data_prevista_devolucao
        timestamptz data_devolucao_real
        string status "ativo | devolvido"
        int renovacoes_restantes
    }
    RESERVAS {
        bigint id PK
        bigint usuario_id FK
        bigint livro_id FK
        timestamptz data_reserva
        string status "ativa | disponivel | concluida | cancelada | expirada"
        timestamptz data_disponivel
    }
    SOLICITACOES {
        bigint id PK
        bigint usuario_id FK
        bigint livro_id FK
        timestamptz data_solicitacao
        string status "pendente | aprovada | rejeitada"
    }
    SUSPENSOES {
        bigint id PK
        bigint usuario_id FK
        bigint emprestimo_id FK
        string motivo
        int dias_atraso
        date data_inicio
        date data_fim
        string status "ativa | cumprida"
    }
    LOGS_SISTEMA {
        bigint id PK
        bigint usuario_id FK
        text usuario_nome
        text acao
        text detalhes
        timestamptz created_at
    }
    AVALIACOES {
        bigint id PK
        bigint usuario_id FK
        bigint livro_id FK
        int nota "1 a 5"
        text comentario
        timestamptz data_avaliacao
    }
    FAVORITOS {
        bigint id PK
        bigint usuario_id FK
        bigint livro_id FK
        timestamptz data_adicao
    }
```

## Decisões de modelagem

**Regras no banco, não no navegador.** Limite de empréstimos, prazos, suspensão e fila de reserva estão em funções SQL. Assim, ninguém burla uma regra mexendo no JavaScript da página, e o site pode ser só arquivos estáticos no GitHub Pages.

**RLS ligado em todas as tabelas.** O navegador só consegue ler a tabela `livros` direto. Todo o resto passa pelas funções, que conferem o perfil de quem pede (`eh_bibliotecario`, `eh_admin`).

**Senhas com bcrypt.** O cadastro guarda a senha com `crypt(senha, gen_salt('bf'))`, da extensão pgcrypto, e o login compara com `crypt(senha_digitada, senha_guardada)`. A senha original nunca fica salva.

**Estoque no próprio livro.** Em vez de uma tabela de exemplares, `livros` guarda `quantidade_total` e `quantidade_disponivel`. Para uma biblioteca escolar isso basta e simplifica as consultas. Cada função roda numa transação só, então o empréstimo e a baixa no estoque acontecem juntos ou não acontecem.

**Histórico preservado.** Reservas e solicitações nunca são apagadas, só mudam de status (`cancelada`, `concluida`, `expirada`, `rejeitada`). As ações importantes ficam registradas em `logs_sistema`.

**Uma avaliação por aluno em cada livro.** Garantido no banco com `UNIQUE (usuario_id, livro_id)`. Se o aluno avaliar de novo, a nota é atualizada (`on conflict do update`).

**Apagar em cascata só onde faz sentido.** Avaliações e favoritos somem junto com o livro ou o usuário (`on delete cascade`). Empréstimos e reservas não, então o banco impede excluir quem tem histórico.

**Datas no fuso de Brasília.** O servidor do Supabase roda em UTC. As funções novas usam `libro_hoje()`, senão um livro "atrasaria" às 21h do último dia.
