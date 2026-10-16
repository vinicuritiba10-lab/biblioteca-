// Precisa ser registrado por ULTIMO: "/:nome" captura qualquer caminho de um nivel.
const { Router } = require("express");
const legado = require("../controllers/legadoController");

const router = Router();

router.get("/", legado.inicio);
router.patch("/atualizar/:id", legado.atualizar);
router.delete("/deletar/:id", legado.deletar);
router.get("/:nome", legado.buscarPorNome);

module.exports = router;
