import { Router } from "express";
import { prisma } from "../db.js";
import { classificar } from "../ia/servico.js";
import {
  atualizarOcorrenciaSchema,
  criarOcorrenciaSchema,
  idParamSchema,
  listarQuerySchema,
} from "../schemas.js";

export const ocorrenciasRouter = Router();

const pesoUrgencia = { alta: 0, media: 1, baixa: 2 } as const;

ocorrenciasRouter.post("/", async (req, res) => {
  const data = criarOcorrenciaSchema.parse(req.body);
  // Se a IA falhar (rede, chave, formato inválido), salva mesmo assim como "não classificada".
  let classificacao: Awaited<ReturnType<typeof classificar>> | undefined;
  try {
    classificacao = await classificar(data.texto);
  } catch (erro) {
    console.error("Falha na classificação por IA:", erro instanceof Error ? erro.message : erro);
  }
  const ocorrencia = await prisma.ocorrencia.create({
    data: { ...data, ...classificacao, classificada: classificacao !== undefined },
  });
  res.status(201).json(ocorrencia);
});

ocorrenciasRouter.get("/", async (req, res) => {
  const filtros = listarQuerySchema.parse(req.query);
  const lista = await prisma.ocorrencia.findMany({
    where: filtros,
    orderBy: { criadaEm: "desc" },
  });
  lista.sort(
    (a, b) =>
      (pesoUrgencia[a.urgencia as keyof typeof pesoUrgencia] ?? 3) -
      (pesoUrgencia[b.urgencia as keyof typeof pesoUrgencia] ?? 3),
  );
  res.json(lista);
});

ocorrenciasRouter.patch("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = atualizarOcorrenciaSchema.parse(req.body);
  const existe = await prisma.ocorrencia.findUnique({ where: { id } });
  if (!existe) return res.status(404).json({ erro: "Ocorrência não encontrada" });
  const atualizada = await prisma.ocorrencia.update({ where: { id }, data });
  res.json(atualizada);
});
