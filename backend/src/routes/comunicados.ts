import { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil, usuarioDaRequisicao } from "../auth/middleware.js";
import { ErroHttp } from "../erros.js";
import { obterProvedor } from "../ia/provedor.js";
import { limparEstilo } from "../ia/estilo.js";
import { SCHEMA_COMUNICADO, SISTEMA_COMUNICADO } from "../ia/prompts.js";
import { criarComunicadoSchema, idParamSchema, rascunhoComunicadoSchema } from "../schemas.js";

export const comunicadosRouter = Router();

const autor = { select: { nome: true } } as const;

// Todos os perfis leem o mural.
comunicadosRouter.get("/", async (_req, res) => {
  res.json(await prisma.comunicado.findMany({ orderBy: { criadoEm: "desc" }, take: 20, include: { autor } }));
});

/** Rascunho da IA: não grava nada. O síndico revisa e só então publica. */
comunicadosRouter.post("/rascunho", exigirPerfil("sindico"), async (req, res) => {
  const { instrucao } = rascunhoComunicadoSchema.parse(req.body);
  try {
    const bruto = await obterProvedor().gerarJson(SISTEMA_COMUNICADO, `Instrução do síndico: """${instrucao}"""`, SCHEMA_COMUNICADO);
    const r = criarComunicadoSchema.safeParse(bruto);
    if (!r.success) throw new Error("rascunho fora do formato");
    res.json({ ...r.data, titulo: limparEstilo(r.data.titulo), texto: limparEstilo(r.data.texto) });
  } catch (erro) {
    console.error("Falha no rascunho de comunicado:", erro instanceof Error ? erro.message : erro);
    throw new ErroHttp(502, "Não consegui gerar o rascunho agora. Escreva o aviso à mão ou tente de novo.");
  }
});

comunicadosRouter.post("/", exigirPerfil("sindico"), async (req, res) => {
  const d = criarComunicadoSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  res.status(201).json(await prisma.comunicado.create({ data: { ...d, autorId: eu.id }, include: { autor } }));
});

comunicadosRouter.delete("/:id", exigirPerfil("sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  if (!(await prisma.comunicado.findUnique({ where: { id } }))) throw new ErroHttp(404, "Comunicado não encontrado.");
  await prisma.comunicado.delete({ where: { id } });
  res.status(204).end();
});
