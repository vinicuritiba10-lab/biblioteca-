const { Router } = require("express");
const admin = require("../controllers/adminController");
const { isAdmin, isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

router.get("/usuarios", isAdminOrBibliotecario, admin.listarUsuarios);
router.get("/estatisticas", isAdmin, admin.estatisticas);
router.get("/painel", isAdminOrBibliotecario, admin.painel);

module.exports = router;
