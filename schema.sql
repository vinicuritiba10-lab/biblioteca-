CREATE DATABASE IF NOT EXISTS biblioteca_alexandria;
USE biblioteca_alexandria;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    tipo ENUM('aluno', 'bibliotecario') DEFAULT 'aluno'
);

CREATE TABLE livros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    isbn VARCHAR(20),
    disponivel BOOLEAN DEFAULT TRUE
);

CREATE TABLE emprestimos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    livro_id INT NOT NULL,
    data_emprestimo DATE NOT NULL,
    data_devolucao DATE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (livro_id) REFERENCES livros(id)
);
