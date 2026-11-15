import { Router } from "express";
import { prisma } from "../db.js";
import { resumirTurno } from "../ia/servico.js";
import { resumoTurnoSchema } from "../schemas.js";

export const resumoTurnoRouter = Router();

resumoTurnoRouter.post("/", async (req, res) => {
  const { inicio, fim } = resumoTurnoSchema.parse(req.body);
  const ocorrencias = await prisma.ocorrencia.findMany({
    where: { criadaEm: { gte: inicio, lte: fim } },
    orderBy: { criadaEm: "asc" },
  });
  if (ocorrencias.length === 0) {
    return res.json({ total: 0, resumo: "Nenhuma ocorrência registrada neste período." });
  }
  try {
    const resumo = await resumirTurno(ocorrencias);
    res.json({ total: ocorrencias.length, resumo });
  } catch (erro) {
    console.error("Falha no resumo de turno:", erro instanceof Error ? erro.message : erro);
    res.status(502).json({ erro: "Não foi possível gerar o resumo com a IA agora. Tente novamente." });
  }
});
