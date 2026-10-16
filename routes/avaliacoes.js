const { Router } = require("express");
const avaliacoes = require("../controllers/avaliacoesController");

const router = Router();

router.get("/medias", avaliacoes.medias);
router.delete("/:id", avaliacoes.excluir);

module.exports = router;
