const { Router } = require("express");
const relatorios = require("../controllers/relatoriosController");
const { isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

router.use(isAdminOrBibliotecario);

router.get("/emprestimos/pdf", relatorios.emprestimosPdf);
router.get("/:tipo/csv", relatorios.planilhaCsv);

module.exports = router;
