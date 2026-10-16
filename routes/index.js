// Junta todas as rotas da API.
const { Router } = require("express");
const usuariosController = require("../controllers/usuariosController");
const statusController = require("../controllers/statusController");

const router = Router();

router.get("/status", statusController.status);
router.post("/login", usuariosController.login);

router.use("/usuarios", require("./usuarios"));
router.use("/livros", require("./livros"));
router.use("/avaliacoes", require("./avaliacoes"));
router.use("/emprestimos", require("./emprestimos"));
router.use("/reservas", require("./reservas"));
router.use("/solicitacoes", require("./solicitacoes"));
router.use("/suspensoes", require("./suspensoes"));
router.use("/admin", require("./admin"));
router.use("/relatorio", require("./relatorios"));
router.use("/notificacoes", require("./notificacoes"));

// sempre por ultimo
router.use(require("./legado"));

module.exports = router;
