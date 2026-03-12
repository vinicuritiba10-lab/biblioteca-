CREATE TABLE usuarios 
( 
 id (PK) INT INT,  
 nome VARCHAR(100) INT,  
 email VARCHAR(100) UNIQUE INT,  
 senha VARCHAR(255) INT,  
 tipo ENUM('aluno', 'bibliotecario') INT,  
 matricula VARCHAR(20) (nullable) INT,  
 created_at TIMESTAMP INT,  
 idlivros INT,  
 idmulta INT,  
); 

CREATE TABLE livros 
( 
 id (PK) INT INT,  
 titulo VARCHAR(200) INT,  
 autor VARCHAR(100 INT,  
 isbn VARCHAR(20) UNIQUE INT,  
 editora VARCHAR(100) INT,  
 ano INT INT,  
 categoria VARCHAR(50) INT,  
 quantidade_total INT DEFAULT 1 INT,  
 quantidade_disponivel INT DEFAULT 1 INT,  
); 

CREATE TABLE devolutivas 
( 
 id (PK) INT INT,  
 emprestimo_id (FK) UNIQUE INT,  
 data_devolucao (DATE) INT,  
 condicao_livro ENUM('otimo', 'bom', 'regular', 'ruim') INT,  
 observacoes TEXT INT,  
); 

CREATE TABLE emprestimos 
( 
 id (PK) INT INT,  
 usuario_id (FK) INT,  
 livro_id (FK) INT,  
 data_emprestimo DATE INT,  
 data_prevista_devolucao DATE INT,  
 data_devolucao_real DATE (nullable) INT,  
 status ENUM('ativo', 'devolvido', 'atrasado') INT,  
 renovacoes_restantes INT DEFAULT 2 INT,  
); 

CREATE TABLE renovaçao 
( 
 emprestimo_id (FK) INT,  
 data_renovacao DATE INT,  
 nova_data_prevista DATE INT,  
 idemprestimos INT,  
); 

CREATE TABLE multa 
( 
 multa_id (PK) INT INT,  
 devolucao_id (FK) UNIQUE INT,  
 valor_decimal(5,2) INT,  
 data_geracao DATE INT,  
 status ENUM('"pendente", "pago") INT,  
); 

CREATE TABLE fazem 
( 
 idusuarios INT PRIMARY KEY,  
 idrenovaçao INT PRIMARY KEY,  
 iddevolutivas INT PRIMARY KEY,  
); 

ALTER TABLE usuarios ADD FOREIGN KEY(idlivros) REFERENCES livros (idlivros)
ALTER TABLE usuarios ADD FOREIGN KEY(idmulta) REFERENCES multa (idmulta)
ALTER TABLE renovaçao ADD FOREIGN KEY(idemprestimos) REFERENCES emprestimos (idemprestimos)
ALTER TABLE fazem ADD FOREIGN KEY(idusuarios) REFERENCES usuarios (idusuarios)
ALTER TABLE fazem ADD FOREIGN KEY(idrenovaçao) REFERENCES renovaçao (idrenovaçao)
ALTER TABLE fazem ADD FOREIGN KEY(iddevolutivas) REFERENCES devolutivas (iddevolutivas)
