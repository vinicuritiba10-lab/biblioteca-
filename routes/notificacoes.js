const { Router } = require("express");
const notificacoes = require("../controllers/notificacoesController");

const router = Router();

router.get("/verificar", notificacoes.verificar);

module.exports = router;
