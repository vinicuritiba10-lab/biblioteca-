const { Router } = require("express");
const emprestimos = require("../controllers/emprestimosController");
const verificarSuspensao = require("../middlewares/verificarSuspensao");

const router = Router();

router.post("/", verificarSuspensao, emprestimos.criar);
router.get("/", emprestimos.listar);
router.get("/atrasados", emprestimos.listarAtrasados);
router.put("/:id/devolver", emprestimos.devolver);
router.put("/:id/renovar", emprestimos.renovar);
router.delete("/:id", emprestimos.excluir);

module.exports = router;
