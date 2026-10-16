const { Router } = require("express");
const usuarios = require("../controllers/usuariosController");
const emprestimos = require("../controllers/emprestimosController");
const reservas = require("../controllers/reservasController");
const perfil = require("../controllers/perfilController");
const favoritos = require("../controllers/favoritosController");
const { isAdmin } = require("../middlewares/auth");

const router = Router();

router.post("/", usuarios.cadastrar);
router.get("/", usuarios.listar);

router.get("/:id/perfil", perfil.perfil);
router.get("/:id/alertas", perfil.alertas);
router.get("/:id/suspensao", usuarios.consultarSuspensao);
router.get("/:id/emprestimos", emprestimos.listarDoUsuario);
router.get("/:id/reservas", reservas.listarDoUsuario);

router.get("/:id/favoritos", favoritos.listar);
router.post("/:id/favoritos", favoritos.adicionar);
router.delete("/:id/favoritos/:livroId", favoritos.remover);

router.put("/:id/tipo", isAdmin, usuarios.alterarTipo);
router.delete("/:id", isAdmin, usuarios.excluir);

module.exports = router;
