const { Router } = require("express");
const relatorios = require("../controllers/relatoriosController");
const { isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

router.get("/emprestimos/pdf", isAdminOrBibliotecario, relatorios.emprestimosPdf);

module.exports = router;
