const { Router } = require("express");
const solicitacoes = require("../controllers/solicitacoesController");
const verificarSuspensao = require("../middlewares/verificarSuspensao");
const { isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

router.post("/", verificarSuspensao, solicitacoes.criar);
router.get("/", isAdminOrBibliotecario, solicitacoes.listarPendentes);
router.put("/:id/aprovar", isAdminOrBibliotecario, solicitacoes.aprovar);
router.put("/:id/rejeitar", isAdminOrBibliotecario, solicitacoes.rejeitar);

module.exports = router;
