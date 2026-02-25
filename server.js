const express = require("express");

const server = express();
const port = 3000;

server.get("/", (req, res) =>{
	res.send("tudo funcionando");
});

server.get("/login", (req, res) =>{
	res.send("");
});

server.get("/emprestimos", (req, res) =>{
	res.send("");
});

server.get("/livros", (req, res) =>{
	res.send("");
});

server.get("/devolutivas", (req, res) =>{
	res.send("");
});

server.get("/aluno", (req, res) =>{
	res.send("");
});

server.get("/bibliotecario", (req, res) =>{
	res.send("");
});



server.listen(port, () =>{
	console.log(`example app listening on port ${port}`);
});
