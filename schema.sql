-- Estrutura do banco (PostgreSQL / Supabase), igual aos models do Sequelize.
-- O servidor ja cria as tabelas que faltam ao iniciar (sequelize.sync),
-- entao este arquivo serve como documentacao e para criar o banco na mao.
-- Obs.: as funcoes RPC usadas pelo front-end ficam no painel do Supabase.

CREATE TABLE IF NOT EXISTS usuarios (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(255),
    email   VARCHAR(255),
    senha   TEXT,
    tipo    VARCHAR(255)          -- aluno | bibliotecario | admin
);

CREATE TABLE IF NOT EXISTS livros (
    id                     SERIAL PRIMARY KEY,
    titulo                 VARCHAR(255),
    autor                  VARCHAR(255),
    isbn                   VARCHAR(255),
    editora                VARCHAR(255),
    ano                    INTEGER,
    categoria              VARCHAR(255),
    quantidade_total       INTEGER,
    quantidade_disponivel  INTEGER,
    capa_url               TEXT,
    descricao              TEXT
);

CREATE TABLE IF NOT EXISTS emprestimos (
    id                       SERIAL PRIMARY KEY,
    usuario_id               INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE NO ACTION,
    livro_id                 INTEGER NOT NULL REFERENCES livros(id)   ON DELETE NO ACTION,
    data_emprestimo          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_prevista_devolucao  TIMESTAMPTZ NOT NULL,
    data_devolucao_real      TIMESTAMPTZ,
    status                   VARCHAR(255) DEFAULT 'ativo',   -- ativo | devolvido | atrasado
    renovacoes_restantes     INTEGER DEFAULT 2
);

CREATE TABLE IF NOT EXISTS reservas (
    id            SERIAL PRIMARY KEY,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
    livro_id      INTEGER NOT NULL REFERENCES livros(id),
    data_reserva  TIMESTAMPTZ NOT NULL,
    status           VARCHAR(255) NOT NULL DEFAULT 'ativa',  -- ativa | disponivel | concluida | cancelada | expirada
    data_disponivel  TIMESTAMPTZ                             -- quando o livro chegou (conta o prazo de retirada)
);

CREATE TABLE IF NOT EXISTS solicitacoes (
    id                SERIAL PRIMARY KEY,
    usuario_id        INTEGER NOT NULL REFERENCES usuarios(id),
    livro_id          INTEGER NOT NULL REFERENCES livros(id),
    data_solicitacao  TIMESTAMPTZ NOT NULL,
    status            VARCHAR(255) NOT NULL DEFAULT 'pendente'   -- pendente | aprovada | rejeitada
);

CREATE TABLE IF NOT EXISTS suspensoes (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
    emprestimo_id  INTEGER REFERENCES emprestimos(id) ON DELETE SET NULL,
    motivo         VARCHAR(255) NOT NULL DEFAULT 'Devolucao em atraso',
    dias_atraso    INTEGER NOT NULL DEFAULT 0,
    data_inicio    DATE NOT NULL,
    data_fim       DATE NOT NULL,
    status         VARCHAR(255) DEFAULT 'ativa'   -- ativa | cumprida
);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    livro_id        INTEGER NOT NULL REFERENCES livros(id)   ON DELETE CASCADE,
    nota            INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario      TEXT,
    data_avaliacao  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, livro_id)              -- uma avaliacao por aluno em cada livro
);

CREATE TABLE IF NOT EXISTS favoritos (           -- lista "Quero ler"
    id           SERIAL PRIMARY KEY,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    livro_id     INTEGER NOT NULL REFERENCES livros(id)   ON DELETE CASCADE,
    data_adicao  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, livro_id)
);
