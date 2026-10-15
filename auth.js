// Verificacao de perfil (admin / bibliotecario) pelo header "usuario-id".
const { usuarios } = require("../models");

function exigirTipo(tiposPermitidos, mensagemNegado) {
    return async function (req, res, next) {
        const usuarioId = req.headers["usuario-id"];

        if (!usuarioId) {
            return res.status(401).json({ error: "usuario nao autenticado" });
        }

        try {
            const usuario = await usuarios.findByPk(usuarioId);
            if (!usuario) {
                return res.status(404).json({ error: "usuario nao encontrado" });
            }
            if (!tiposPermitidos.includes(usuario.tipo)) {
                return res.status(403).json({ error: mensagemNegado });
            }
            req.usuario = usuario;
            next();
        } catch (error) {
            next(error);
        }
    };
}

const isAdmin = exigirTipo(["admin"], "acesso negado. permissao de administrador necessaria");
const isAdminOrBibliotecario = exigirTipo(["admin", "bibliotecario"], "acesso negado. permissao de bibliotecario ou admin necessaria");

module.exports = { isAdmin, isAdminOrBibliotecario };
