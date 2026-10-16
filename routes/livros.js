const { Router } = require("express");
const livros = require("../controllers/livrosController");
const destaques = require("../controllers/destaquesController");
const avaliacoes = require("../controllers/avaliacoesController");
const { isAdmin, isAdminOrBibliotecario } = require("../middlewares/auth");

const router = Router();

// rotas com caminho fixo antes de "/:id"
router.get("/", livros.listar);
router.get("/destaques", destaques.destaques);
router.get("/categorias", destaques.contagemCategorias);
router.get("/buscar/:termo", livros.buscar);
router.get("/categoria/:categoria", livros.porCategoria);
router.get("/:id", livros.buscarPorId);
router.get("/:id/detalhes", destaques.detalhes);
router.post("/:id/avaliacoes", avaliacoes.salvar);

router.post("/", isAdminOrBibliotecario, livros.cadastrar);
router.put("/:id", isAdminOrBibliotecario, livros.editar);
router.delete("/:id", isAdmin, livros.excluir);

module.exports = router;
