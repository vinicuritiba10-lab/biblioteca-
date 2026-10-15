const { Router } = require("express");
const admin = require("../controllers/adminController");
const { isAdmin, isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

router.get("/usuarios", isAdminOrBibliotecario, admin.listarUsuarios);
router.get("/estatisticas", isAdmin, admin.estatisticas);

module.exports = router;
