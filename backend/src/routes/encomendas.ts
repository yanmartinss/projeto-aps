import { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil, usuarioDaRequisicao } from "../auth/middleware.js";
import { ErroHttp } from "../erros.js";
import { normalizarApartamento } from "../reservas/regras.js";
import { criarEncomendaSchema, idParamSchema, listarEncomendasQuerySchema } from "../schemas.js";

export const encomendasRouter = Router();

const incluir = { registradaPor: { select: { id: true, nome: true } } } as const;

/** Funcionário (e síndico) vê todas; o morador só as do apartamento da própria conta. */
encomendasRouter.get("/", exigirPerfil("morador", "funcionario", "sindico"), async (req, res) => {
  const { status } = listarEncomendasQuerySchema.parse(req.query);
  const eu = usuarioDaRequisicao(req);
  if (eu.perfil === "morador" && !eu.apartamento) return res.json([]);
  const itens = await prisma.encomenda.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(eu.perfil === "morador" ? { apartamentoChave: normalizarApartamento(eu.apartamento!) } : {}),
    },
    include: incluir,
    orderBy: { recebidaEm: "desc" },
  });
  res.json(itens);
});

/** A portaria registra a chegada. Avisa se ainda não há morador cadastrado naquele apartamento. */
encomendasRouter.post("/", exigirPerfil("funcionario", "sindico"), async (req, res) => {
  const d = criarEncomendaSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  const chave = normalizarApartamento(d.apartamento);
  const moradores = (await prisma.usuario.findMany({ where: { perfil: "morador", ativo: true }, select: { apartamento: true } })).filter(
    (m) => m.apartamento && normalizarApartamento(m.apartamento) === chave,
  ).length;
  const e = await prisma.encomenda.create({
    data: { apartamento: d.apartamento, apartamentoChave: chave, descricao: d.descricao || null, registradaPorId: eu.id },
    include: incluir,
  });
  res.status(201).json({ ...e, moradoresNoApartamento: moradores });
});

/** Marca como retirada (o morador veio buscar). */
encomendasRouter.patch("/:id/retirar", exigirPerfil("funcionario", "sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const e = await prisma.encomenda.findUnique({ where: { id } });
  if (!e) throw new ErroHttp(404, "Encomenda não encontrada.");
  if (e.status === "retirada") throw new ErroHttp(409, "Essa encomenda já foi retirada.");
  res.json(await prisma.encomenda.update({ where: { id }, data: { status: "retirada", retiradaEm: new Date() }, include: incluir }));
});

/** Registro feito por engano: só quem registrou (ou o síndico) apaga, e só enquanto aguarda retirada. */
encomendasRouter.delete("/:id", exigirPerfil("funcionario", "sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const eu = usuarioDaRequisicao(req);
  const e = await prisma.encomenda.findUnique({ where: { id } });
  if (!e) throw new ErroHttp(404, "Encomenda não encontrada.");
  if (eu.perfil !== "sindico" && e.registradaPorId !== eu.id) throw new ErroHttp(403, "Só quem registrou a encomenda pode apagá-la.");
  if (e.status !== "aguardando") throw new ErroHttp(409, "Essa encomenda já foi retirada e fica no histórico.");
  await prisma.encomenda.delete({ where: { id } });
  res.status(204).end();
});