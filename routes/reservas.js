const { Router } = require("express");
const reservas = require("../controllers/reservasController");

const router = Router();

router.post("/", reservas.criar);
router.delete("/:id", reservas.cancelar);

module.exports = router;
