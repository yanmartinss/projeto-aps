import { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil, usuarioDaRequisicao } from "../auth/middleware.js";
import { ErroHttp } from "../erros.js";
import { montarData } from "../reservas/tempo.js";
import {
  andamentoTarefaSchema,
  atualizarTarefaSchema,
  criarTarefaSchema,
  idParamSchema,
  listarTarefasQuerySchema,
} from "../schemas.js";

export const tarefasRouter = Router();

const incluir = {
  funcionario: { select: { id: true, nome: true } },
  criadaPor: { select: { id: true, nome: true } },
} as const;

const pesoPrioridade: Record<string, number> = { alta: 0, normal: 1, baixa: 2 };

/** Pendentes e em andamento primeiro (as de prazo mais próximo antes, depois a prioridade); concluídas por último. */
function ordenar<T extends { status: string; prazo: Date | null; prioridade: string; criadaEm: Date }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    const ca = a.status === "concluida" ? 1 : 0;
    const cb = b.status === "concluida" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    const pa = a.prazo ? a.prazo.getTime() : Infinity;
    const pb = b.prazo ? b.prazo.getTime() : Infinity;
    if (pa !== pb) return pa - pb;
    const pr = (pesoPrioridade[a.prioridade] ?? 1) - (pesoPrioridade[b.prioridade] ?? 1);
    return pr !== 0 ? pr : b.criadaEm.getTime() - a.criadaEm.getTime();
  });
}

async function exigirFuncionarioAtivo(id: number) {
  const f = await prisma.usuario.findUnique({ where: { id } });
  if (!f || f.perfil !== "funcionario" || !f.ativo) throw new ErroHttp(422, "A atividade precisa ser atribuída a um funcionário ativo.");
}

// ---------- funcionário: as próprias atividades ----------
tarefasRouter.get("/minhas", exigirPerfil("funcionario"), async (req, res) => {
  const eu = usuarioDaRequisicao(req);
  res.json(ordenar(await prisma.tarefa.findMany({ where: { funcionarioId: eu.id }, include: incluir })));
});

/** O funcionário atualiza o andamento e anota uma observação, e só nas atividades dele. */
tarefasRouter.patch("/:id/andamento", exigirPerfil("funcionario"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const d = andamentoTarefaSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  const t = await prisma.tarefa.findUnique({ where: { id } });
  if (!t || t.funcionarioId !== eu.id) throw new ErroHttp(404, "Atividade não encontrada.");
  const atualizada = await prisma.tarefa.update({
    where: { id },
    data: {
      status: d.status,
      ...(d.observacao !== undefined ? { observacao: d.observacao || null } : {}),
      concluidaEm: d.status === "concluida" ? (t.status === "concluida" ? t.concluidaEm : new Date()) : null,
    },
    include: incluir,
  });
  res.json(atualizada);
});

// ---------- síndico: cria, acompanha, edita e apaga ----------
tarefasRouter.get("/", exigirPerfil("sindico"), async (req, res) => {
  const { status, funcionarioId } = listarTarefasQuerySchema.parse(req.query);
  res.json(
    ordenar(
      await prisma.tarefa.findMany({
        where: { ...(status ? { status } : {}), ...(funcionarioId ? { funcionarioId } : {}) },
        include: incluir,
      }),
    ),
  );
});

tarefasRouter.post("/", exigirPerfil("sindico"), async (req, res) => {
  const d = criarTarefaSchema.parse(req.body);
  await exigirFuncionarioAtivo(d.funcionarioId);
  const eu = usuarioDaRequisicao(req);
  const t = await prisma.tarefa.create({
    data: {
      titulo: d.titulo,
      descricao: d.descricao || null,
      prioridade: d.prioridade,
      prazo: d.prazo ? montarData(d.prazo, "23:59") : null,
      funcionarioId: d.funcionarioId,
      criadaPorId: eu.id,
    },
    include: incluir,
  });
  res.status(201).json(t);
});

tarefasRouter.patch("/:id", exigirPerfil("sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const d = atualizarTarefaSchema.parse(req.body);
  const existe = await prisma.tarefa.findUnique({ where: { id } });
  if (!existe) throw new ErroHttp(404, "Atividade não encontrada.");
  if (d.funcionarioId !== undefined) await exigirFuncionarioAtivo(d.funcionarioId);
  const atualizada = await prisma.tarefa.update({
    where: { id },
    data: {
      ...(d.titulo !== undefined ? { titulo: d.titulo } : {}),
      ...(d.descricao !== undefined ? { descricao: d.descricao || null } : {}),
      ...(d.prioridade !== undefined ? { prioridade: d.prioridade } : {}),
      ...(d.funcionarioId !== undefined ? { funcionarioId: d.funcionarioId } : {}),
      ...(d.prazo !== undefined ? { prazo: d.prazo ? montarData(d.prazo, "23:59") : null } : {}),
    },
    include: incluir,
  });
  res.json(atualizada);
});

tarefasRouter.delete("/:id", exigirPerfil("sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  if (!(await prisma.tarefa.findUnique({ where: { id } }))) throw new ErroHttp(404, "Atividade não encontrada.");
  await prisma.tarefa.delete({ where: { id } });
  res.status(204).end();
});
