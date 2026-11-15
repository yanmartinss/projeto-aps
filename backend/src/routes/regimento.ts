import express, { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil } from "../auth/middleware.js";
import { ErroHttp } from "../erros.js";
import { modelosUtilizaveis } from "../ia/embeddings.js";
import { idParamSchema, novoDocumentoQuerySchema, perguntaRegimentoSchema } from "../schemas.js";
import { indexarDocumento, perguntar, reindexarDocumento } from "../regimento/servico.js";

export const regimentoRouter = Router();


regimentoRouter.get("/documentos", exigirPerfil("sindico"), async (_req, res) => {
  const docs = await prisma.documentoRegimento.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { trechos: true } } },
  });
  const utilizaveis = modelosUtilizaveis();
  res.json(
    docs.map((d) => ({
      id: d.id,
      nome: d.nome,
      criadoEm: d.criadoEm,
      modeloEmbedding: d.modeloEmbedding,
      nTrechos: d._count.trechos,
      // só precisa reindexar se o índice usa um modelo que este servidor não sabe mais usar
      precisaReindexar: utilizaveis.length > 0 && !utilizaveis.includes(d.modeloEmbedding),
    })),
  );
});

// O PDF chega como corpo bruto (Content-Type: application/pdf), com o nome em ?nome=.
regimentoRouter.post("/documentos", exigirPerfil("sindico"), express.raw({ type: "application/pdf", limit: "10mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new ErroHttp(415, "Envie o arquivo como PDF (Content-Type: application/pdf).");
  }
  if (req.body.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new ErroHttp(415, "Esse arquivo não parece ser um PDF.");
  }
  const { nome } = novoDocumentoQuerySchema.parse(req.query);
  const doc = await indexarDocumento(nome, req.body);
  res.status(201).json(doc);
});

regimentoRouter.post("/documentos/:id/reindexar", exigirPerfil("sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await reindexarDocumento(id));
});

regimentoRouter.delete("/documentos/:id", exigirPerfil("sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const existe = await prisma.documentoRegimento.findUnique({ where: { id } });
  if (!existe) throw new ErroHttp(404, "Documento não encontrado.");
  await prisma.trechoRegimento.deleteMany({ where: { documentoId: id } });
  await prisma.documentoRegimento.delete({ where: { id } });
  res.status(204).end();
});

regimentoRouter.post("/perguntas", async (req, res) => {
  const { pergunta } = perguntaRegimentoSchema.parse(req.body);
  res.json(await perguntar(pergunta));
});
