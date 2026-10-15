const { Router } = require("express");
const suspensoes = require("../controllers/suspensoesController");
const { isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

router.use(isAdminOrBibliotecario); // todas as rotas daqui sao da biblioteca

router.get("/", suspensoes.listar);
router.post("/", suspensoes.aplicar);
router.get("/verificar", suspensoes.verificarVencidas);
router.put("/:id/encerrar", suspensoes.encerrar);

module.exports = router;
