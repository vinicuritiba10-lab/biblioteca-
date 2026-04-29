CREATE DATABASE IF NOT EXISTS biblioteca;
USE biblioteca;


CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('aluno', 'bibliotecario') NOT NULL,
    matricula VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE livros (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    editora VARCHAR(100),
    ano INT,
    categoria VARCHAR(50),
    quantidade_total INT DEFAULT 1,
    quantidade_disponivel INT DEFAULT 1
);


CREATE TABLE emprestimos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    livro_id INT NOT NULL,
    data_emprestimo DATE NOT NULL,
    data_prevista_devolucao DATE NOT NULL,
    data_devolucao_real DATE NULL,
    status ENUM('ativo', 'devolvido', 'atrasado') DEFAULT 'ativo',
    renovacoes_restantes INT DEFAULT 2,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (livro_id) REFERENCES livros(id)
);


CREATE TABLE renovacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emprestimo_id INT NOT NULL,
    data_renovacao DATE NOT NULL,
    nova_data_prevista DATE NOT NULL,
    FOREIGN KEY (emprestimo_id) REFERENCES emprestimos(id)
);

)
CREATE TABLE devolucoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emprestimo_id INT UNIQUE NOT NULL,
    data_devolucao DATE NOT NULL,
    condicao_livro ENUM('otimo', 'bom', 'regular', 'ruim') DEFAULT 'bom',
    observacoes TEXT,
    FOREIGN KEY (emprestimo_id) REFERENCES emprestimos(id)
);


CREATE TABLE multas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    devolucao_id INT UNIQUE NOT NULL,
    valor DECIMAL(5,2) NOT NULL,
    data_geracao DATE NOT NULL,
    status ENUM('pendente', 'pago') DEFAULT 'pendente',
    FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id)
);
