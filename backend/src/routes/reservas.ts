import { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil, usuarioDaRequisicao } from "../auth/middleware.js";
import { ErroHttp } from "../erros.js";
import { validarReserva } from "../reservas/regras.js";
import { carregarAtivas, periodoDoDia, validarPedido } from "../reservas/servico.js";
import {
  acaoReservaSchema,
  criarReservaSchema,
  idParamSchema,
  listarReservasQuerySchema,
  validarReservaSchema,
} from "../schemas.js";

export const reservasRouter = Router();

// Chave da trava (advisory lock) que serializa a criação de reservas.
const TRAVA_RESERVAS = 7101;

async function acharArea(id: number) {
  const area = await prisma.areaComum.findUnique({ where: { id } });
  if (!area) throw new ErroHttp(404, "Área não encontrada.");
  return area;
}

/** O apartamento vem sempre da conta do morador, nunca do que o cliente envia. */
function apartamentoDoMorador(req: Parameters<typeof usuarioDaRequisicao>[0]): string {
  const apto = usuarioDaRequisicao(req).apartamento;
  if (!apto) throw new ErroHttp(409, "Sua conta não tem apartamento cadastrado. Fale com o síndico.");
  return apto;
}

reservasRouter.get("/areas", async (_req, res) => {
  res.json(await prisma.areaComum.findMany({ orderBy: { id: "asc" } }));
});

/** Confere as regras sem gravar (usado ao vivo enquanto o morador ajusta o cartão). */
reservasRouter.post("/validar", exigirPerfil("morador"), async (req, res) => {
  const d = validarReservaSchema.parse(req.body);
  const area = await acharArea(d.areaId);
  const motivos = validarPedido({ area, ...d, apartamento: apartamentoDoMorador(req), ativas: await carregarAtivas() });
  res.json({ ok: motivos.length === 0, motivos });
});

reservasRouter.post("/", exigirPerfil("morador"), async (req, res) => {
  const d = criarReservaSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  const apartamento = apartamentoDoMorador(req);
  const area = await acharArea(d.areaId);

  // Validar e gravar na mesma transação, com uma trava: no Postgres duas transações simultâneas
  // poderiam passar juntas pela checagem de conflito e gravar o mesmo horário.
  const reserva = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(${TRAVA_RESERVAS})) AS t`;
    const ativas = (await tx.reserva.findMany({ where: { status: { in: ["pendente", "aprovada"] } } })).map((r) => ({
      id: r.id,
      areaId: r.areaId,
      apartamento: r.apartamento,
      inicio: r.inicio,
      fim: r.fim,
    }));
    const motivos = validarPedido({ area, ...d, apartamento, ativas });
    if (motivos.length > 0) throw new ErroHttp(422, "Essa reserva não é permitida.", { motivos });
    return tx.reserva.create({
      data: {
        areaId: area.id,
        usuarioId: eu.id,
        apartamento,
        ...periodoDoDia(d.data, area),
        textoOriginal: d.textoOriginal,
      },
      include: { area: true },
    });
  });
  res.status(201).json(reserva);
});

/** Síndico vê todas; morador só as próprias. */
reservasRouter.get("/", exigirPerfil("morador", "sindico"), async (req, res) => {
  const { status } = listarReservasQuerySchema.parse(req.query);
  const eu = usuarioDaRequisicao(req);
  res.json(
    await prisma.reserva.findMany({
      where: { ...(status ? { status } : {}), ...(eu.perfil === "morador" ? { usuarioId: eu.id } : {}) },
      include: { area: true },
      orderBy: { inicio: "asc" },
    }),
  );
});

reservasRouter.patch("/:id", exigirPerfil("morador", "sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const acao = acaoReservaSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);

  // Aprovar e recusar são do síndico. O morador só cancela, e só o próprio pedido.
  if ((acao.acao === "aprovar" || acao.acao === "recusar") && eu.perfil !== "sindico") {
    throw new ErroHttp(403, "Só o síndico pode aprovar ou recusar reservas.");
  }

  const reserva = await prisma.reserva.findUnique({ where: { id }, include: { area: true } });
  if (!reserva) throw new ErroHttp(404, "Reserva não encontrada.");

  if (acao.acao === "cancelar" && eu.perfil === "morador") {
    if (reserva.usuarioId !== eu.id) throw new ErroHttp(404, "Reserva não encontrada.");
    if (reserva.status !== "pendente") throw new ErroHttp(409, "Só dá para cancelar um pedido que ainda está pendente. Fale com o síndico.");
  }

  if (acao.acao === "aprovar") {
    if (reserva.status !== "pendente") throw new ErroHttp(409, "Só dá para aprovar uma reserva pendente.");
    const motivos = validarReserva({
      area: reserva.area,
      apartamento: reserva.apartamento,
      inicio: reserva.inicio,
      fim: reserva.fim,
      agora: new Date(),
      ativas: await carregarAtivas(),
      ignorarId: reserva.id,
    });
    if (motivos.length > 0) throw new ErroHttp(409, "Não dá mais para aprovar essa reserva.", { motivos });
    res.json(await prisma.reserva.update({ where: { id }, data: { status: "aprovada" }, include: { area: true } }));
    return;
  }

  if (acao.acao === "recusar") {
    if (reserva.status !== "pendente") throw new ErroHttp(409, "Só dá para recusar uma reserva pendente.");
    res.json(
      await prisma.reserva.update({
        where: { id },
        data: { status: "recusada", motivoRecusa: acao.motivo },
        include: { area: true },
      }),
    );
    return;
  }

  if (reserva.status !== "pendente" && reserva.status !== "aprovada") {
    throw new ErroHttp(409, "Essa reserva já foi encerrada.");
  }
  res.json(await prisma.reserva.update({ where: { id }, data: { status: "cancelada" }, include: { area: true } }));
});
