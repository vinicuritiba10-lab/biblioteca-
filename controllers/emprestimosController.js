const { Op } = require("sequelize");
const { sequelize, Emprestimo, livros, usuarios, Reserva } = require("../models");
const { LIMITE_EMPRESTIMOS, PRAZO_EMPRESTIMO_DIAS, DIAS_POR_RENOVACAO, MAX_RENOVACOES } = require("../config/regras");
const { dataLocalISO, somarDias, diasEntre, formatarDataBR } = require("../utils/datas");
const { buscarSuspensaoAtiva, buscarSuspensaoMarcadaAtiva, criarSuspensao } = require("../services/suspensaoService");
const { enviarLembreteDevolucao, enviarEmailSuspensao } = require("../services/email");
const { promoverProximaReserva, avisarReservaDisponivel } = require("../services/reservaService");
const ErroHttp = require("../utils/ErroHttp");

function estaAtrasado(emprestimo) {
    return dataLocalISO(emprestimo.data_prevista_devolucao) < dataLocalISO();
}

// POST /emprestimos
// Tudo dentro de uma transacao com trava no livro: assim dois alunos nao
// conseguem pegar o ultimo exemplar ao mesmo tempo.
async function criar(req, res) {
    const { usuario_id, livro_id } = req.body;

    if (!usuario_id || !livro_id) {
        throw new ErroHttp(400, "informe usuario_id e livro_id");
    }

    const emprestimo = await sequelize.transaction(async (t) => {
        const livro = await livros.findByPk(livro_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!livro) {
            throw new ErroHttp(404, "livro nao encontrado");
        }
        if (livro.quantidade_disponivel <= 0) {
            throw new ErroHttp(400, "livro nao disponivel para emprestimo");
        }

        const usuario = await usuarios.findByPk(usuario_id, { transaction: t });
        if (!usuario) {
            throw new ErroHttp(404, "usuario nao encontrado");
        }

        const emprestimosAtivos = await Emprestimo.findAll({
            where: { usuario_id, status: "ativo" },
            transaction: t
        });

        // nunca pode ter 2 copias do mesmo titulo
        if (emprestimosAtivos.some(e => e.livro_id === Number(livro_id))) {
            throw new ErroHttp(400, "voce ja esta com um exemplar deste livro emprestado");
        }
        if (emprestimosAtivos.length >= LIMITE_EMPRESTIMOS) {
            throw new ErroHttp(400, `voce ja atingiu o limite de ${LIMITE_EMPRESTIMOS} livros emprestados ao mesmo tempo`);
        }

        // o prazo e calculado pelo servidor, nao enviado pelo cliente
        const novo = await Emprestimo.create({
            usuario_id,
            livro_id,
            data_emprestimo: new Date(),
            data_prevista_devolucao: somarDias(new Date(), PRAZO_EMPRESTIMO_DIAS),
            status: "ativo",
            renovacoes_restantes: MAX_RENOVACOES
        }, { transaction: t });

        await livro.decrement("quantidade_disponivel", { by: 1, transaction: t });

        // se o aluno tinha reserva desse livro, ela foi atendida
        await Reserva.update(
            { status: "concluida" },
            { where: { usuario_id, livro_id, status: { [Op.in]: ["ativa", "disponivel"] } }, transaction: t }
        );

        return novo;
    });

    res.status(201).json({ message: "emprestimo registrado com sucesso", emprestimo });
}

// GET /emprestimos  (filtros opcionais: ?status=ativo&usuario_id=3)
async function listar(req, res) {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.usuario_id) where.usuario_id = req.query.usuario_id;

    const emprestimos = await Emprestimo.findAll({
        where,
        include: [
            { model: usuarios, attributes: ["nome", "email"] },
            { model: livros, attributes: ["titulo", "autor", "isbn"] }
        ],
        order: [["data_emprestimo", "DESC"]]
    });
    res.json(emprestimos);
}

// GET /usuarios/:id/emprestimos
async function listarDoUsuario(req, res) {
    const emprestimos = await Emprestimo.findAll({
        where: { usuario_id: req.params.id },
        include: [{ model: livros, attributes: ["titulo", "autor", "categoria"] }],
        order: [["data_emprestimo", "DESC"]]
    });
    res.json(emprestimos);
}

// GET /emprestimos/atrasados
async function listarAtrasados(req, res) {
    const ativos = await Emprestimo.findAll({
        where: { status: "ativo" },
        include: [
            { model: usuarios, attributes: ["nome", "email"] },
            { model: livros, attributes: ["titulo"] }
        ],
        order: [["data_prevista_devolucao", "ASC"]]
    });
    res.json(ativos.filter(estaAtrasado));
}

// PUT /emprestimos/:id/devolver
async function devolver(req, res) {
    const hoje = dataLocalISO();
    let suspensaoCriada = null;
    let reservaPromovida = null;

    const emprestimo = await sequelize.transaction(async (t) => {
        const emp = await Emprestimo.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!emp) {
            throw new ErroHttp(404, "emprestimo nao encontrado");
        }
        if (emp.status === "devolvido") {
            throw new ErroHttp(400, "livro ja foi devolvido");
        }

        await emp.update({ data_devolucao_real: new Date(), status: "devolvido" }, { transaction: t });

        const livro = await livros.findByPk(emp.livro_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (livro) {
            await livro.increment("quantidade_disponivel", { by: 1, transaction: t });
        }

        // devolucao em atraso: suspende pelo mesmo numero de dias
        const diasAtraso = diasEntre(dataLocalISO(emp.data_prevista_devolucao), hoje);
        if (diasAtraso > 0) {
            const jaSuspenso = await buscarSuspensaoMarcadaAtiva(emp.usuario_id, t);
            if (!jaSuspenso) {
                suspensaoCriada = await criarSuspensao({
                    usuario_id: emp.usuario_id,
                    emprestimo_id: emp.id,
                    motivo: `Devolucao em atraso: ${livro?.titulo || "livro"}`,
                    diasAtraso,
                    transaction: t
                });
                suspensaoCriada.livroTitulo = livro?.titulo || "livro";
            }
        }

        // avisa a reserva mais antiga desse livro que ele esta disponivel
        reservaPromovida = await promoverProximaReserva(emp.livro_id, t);

        return emp;
    });

    if (reservaPromovida) {
        await avisarReservaDisponivel(reservaPromovida);
    }

    // e-mail so depois de tudo salvo no banco
    if (suspensaoCriada) {
        const usuario = await usuarios.findByPk(emprestimo.usuario_id);
        if (usuario) {
            await enviarEmailSuspensao(
                usuario.email,
                usuario.nome,
                suspensaoCriada.livroTitulo,
                suspensaoCriada.dias_atraso,
                suspensaoCriada.data_fim
            );
        }
    }

    res.json({
        message: suspensaoCriada
            ? `livro devolvido com ${suspensaoCriada.dias_atraso} dia(s) de atraso. conta suspensa ate ${formatarDataBR(suspensaoCriada.data_fim)}`
            : "livro devolvido com sucesso",
        suspensao_criada: Boolean(suspensaoCriada)
    });
}

// PUT /emprestimos/:id/renovar
async function renovar(req, res) {
    const emprestimo = await Emprestimo.findByPk(req.params.id, {
        include: [
            { model: usuarios, attributes: ["nome", "email"] },
            { model: livros, attributes: ["titulo", "quantidade_disponivel"] }
        ]
    });

    if (!emprestimo) {
        throw new ErroHttp(404, "emprestimo nao encontrado");
    }
    if (emprestimo.status !== "ativo") {
        throw new ErroHttp(400, "apenas emprestimos ativos podem ser renovados");
    }
    if (emprestimo.renovacoes_restantes <= 0) {
        throw new ErroHttp(400, `limite de renovacoes atingido (maximo ${MAX_RENOVACOES})`);
    }
    if (estaAtrasado(emprestimo)) {
        throw new ErroHttp(400, "emprestimo em atraso nao pode ser renovado. devolva o livro na biblioteca");
    }
    if (await buscarSuspensaoAtiva(emprestimo.usuario_id)) {
        throw new ErroHttp(403, "sua conta esta suspensa e nao pode renovar emprestimos");
    }

    // se nao ha exemplar livre e alguem esta na fila de reserva, nao renova
    if (emprestimo.livro && emprestimo.livro.quantidade_disponivel <= 0) {
        const reservaDeOutro = await Reserva.findOne({
            where: {
                livro_id: emprestimo.livro_id,
                status: "ativa",
                usuario_id: { [Op.ne]: emprestimo.usuario_id }
            }
        });
        if (reservaDeOutro) {
            throw new ErroHttp(400, "outro aluno reservou este livro, por isso nao e possivel renovar");
        }
    }

    const novaData = somarDias(emprestimo.data_prevista_devolucao, DIAS_POR_RENOVACAO);

    await emprestimo.update({
        data_prevista_devolucao: novaData,
        renovacoes_restantes: emprestimo.renovacoes_restantes - 1
    });

    const emailEnviado = emprestimo.usuario && emprestimo.livro
        ? await enviarLembreteDevolucao(
            emprestimo.usuario.email,
            emprestimo.usuario.nome,
            emprestimo.livro.titulo,
            novaData,
            diasEntre(dataLocalISO(), dataLocalISO(novaData))
        )
        : false;

    res.json({
        message: "emprestimo renovado com sucesso",
        nova_data_devolucao: novaData,
        renovacoes_restantes: emprestimo.renovacoes_restantes,
        email_enviado: emailEnviado
    });
}

// DELETE /emprestimos/:id
// Se o emprestimo ainda estava ativo, o exemplar volta para o estoque.
async function excluir(req, res) {
    await sequelize.transaction(async (t) => {
        const emprestimo = await Emprestimo.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!emprestimo) {
            throw new ErroHttp(404, "emprestimo nao encontrado");
        }

        if (emprestimo.status !== "devolvido") {
            await livros.increment("quantidade_disponivel", {
                by: 1,
                where: { id: emprestimo.livro_id },
                transaction: t
            });
        }

        await emprestimo.destroy({ transaction: t });
    });

    res.json({ message: "emprestimo deletado com sucesso" });
}

module.exports = { criar, listar, listarDoUsuario, listarAtrasados, devolver, renovar, excluir };
