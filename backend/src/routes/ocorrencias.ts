import { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil, usuarioDaRequisicao, type UsuarioAutenticado } from "../auth/middleware.js";
import { ErroHttp } from "../erros.js";
import { classificar } from "../ia/servico.js";
import { inicioDoMes } from "../reservas/tempo.js";
import {
  STATUS_ENCERRADOS,
  atualizarOcorrenciaSchema,
  cancelarOcorrenciaSchema,
  comentarioSchema,
  criarOcorrenciaSchema,
  idParamSchema,
  listarQuerySchema,
} from "../schemas.js";

export const ocorrenciasRouter = Router();

const pesoUrgencia = { alta: 0, media: 1, baixa: 2 } as const;

const incluirPessoas = {
  autor: { select: { id: true, nome: true, apartamento: true, perfil: true } },
  responsavel: { select: { id: true, nome: true } },
  _count: { select: { comentarios: true } },
} as const;

/** O síndico vê tudo; os demais só as que registraram ou que foram delegadas a eles. */
function podeVer(u: UsuarioAutenticado, o: { autorId: number | null; responsavelId: number | null }): boolean {
  return u.perfil === "sindico" || o.autorId === u.id || o.responsavelId === u.id;
}

// Morador e funcionário registram; o autor vem da conta, não do que o cliente envia.
ocorrenciasRouter.post("/", exigirPerfil("morador", "funcionario"), async (req, res) => {
  const { texto } = criarOcorrenciaSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  // Se a IA falhar (rede, chave, formato inválido), salva mesmo assim como "não classificada".
  let classificacao: Awaited<ReturnType<typeof classificar>> | undefined;
  try {
    classificacao = await classificar(texto);
  } catch (erro) {
    console.error("Falha na classificação por IA:", erro instanceof Error ? erro.message : erro);
  }
  const ocorrencia = await prisma.ocorrencia.create({
    data: {
      texto,
      autorPerfil: eu.perfil,
      autorId: eu.id,
      ...classificacao,
      classificada: classificacao !== undefined,
    },
  });
  res.status(201).json(ocorrencia);
});

// Kanban e indicadores: só o síndico.
ocorrenciasRouter.get("/", exigirPerfil("sindico"), async (req, res) => {
  const filtros = listarQuerySchema.parse(req.query);
  const itens = await prisma.ocorrencia.findMany({
    where: filtros,
    include: incluirPessoas,
    orderBy: { criadaEm: "desc" },
  });
  itens.sort(
    (a, b) =>
      (pesoUrgencia[a.urgencia as keyof typeof pesoUrgencia] ?? 3) -
      (pesoUrgencia[b.urgencia as keyof typeof pesoUrgencia] ?? 3),
  );

  // Os indicadores não dependem do filtro aplicado à lista.
  const [porStatus, urgentes, resolvidasNoMes] = await Promise.all([
    prisma.ocorrencia.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ocorrencia.count({ where: { urgencia: "alta", status: { notIn: STATUS_ENCERRADOS } } }),
    prisma.ocorrencia.count({ where: { resolvidaEm: { gte: inicioDoMes(new Date()) } } }),
  ]);
  const conta = (s: string) => porStatus.find((p) => p.status === s)?._count._all ?? 0;
  res.json({
    itens,
    indicadores: {
      aberta: conta("aberta"),
      em_analise: conta("em_analise"),
      em_execucao: conta("em_execucao"),
      resolvida: conta("resolvida"),
      cancelada: conta("cancelada"),
      urgentes,
      resolvidasNoMes,
    },
  });
});

// "Minhas ocorrências": as que eu registrei e as que foram delegadas a mim.
ocorrenciasRouter.get("/minhas", async (req, res) => {
  const eu = usuarioDaRequisicao(req);
  res.json(
    await prisma.ocorrencia.findMany({
      where: { OR: [{ autorId: eu.id }, { responsavelId: eu.id }] },
      include: incluirPessoas,
      orderBy: { criadaEm: "desc" },
    }),
  );
});

ocorrenciasRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const eu = usuarioDaRequisicao(req);
  const o = await prisma.ocorrencia.findUnique({
    where: { id },
    include: {
      ...incluirPessoas,
      comentarios: {
        orderBy: { criadoEm: "asc" },
        include: { autor: { select: { id: true, nome: true, perfil: true } } },
      },
    },
  });
  // Quem não pode ver recebe 404, para nem confirmar que a ocorrência existe.
  if (!o || !podeVer(eu, o)) throw new ErroHttp(404, "Ocorrência não encontrada.");
  res.json(o);
});

ocorrenciasRouter.patch("/:id", exigirPerfil("sindico"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = atualizarOcorrenciaSchema.parse(req.body);
  const existe = await prisma.ocorrencia.findUnique({ where: { id } });
  if (!existe) throw new ErroHttp(404, "Ocorrência não encontrada.");

  if (data.responsavelId) {
    const f = await prisma.usuario.findUnique({ where: { id: data.responsavelId } });
    if (!f || f.perfil !== "funcionario" || !f.ativo) {
      throw new ErroHttp(422, "O responsável precisa ser um funcionário ativo.");
    }
  }

  // Data de conclusão: marca ao resolver e apaga se a ocorrência for reaberta.
  let resolvidaEm: Date | null | undefined;
  if (data.status !== undefined) {
    if (data.status === "resolvida" && existe.status !== "resolvida") resolvidaEm = new Date();
    else if (data.status !== "resolvida") resolvidaEm = null;
  }

  const atualizada = await prisma.ocorrencia.update({
    where: { id },
    data: { ...data, ...(resolvidaEm !== undefined ? { resolvidaEm } : {}) },
    include: incluirPessoas,
  });
  res.json(atualizada);
});

/**
 * O funcionário cancela uma ocorrência que ele mesmo registrou, enquanto o síndico ainda não começou a executar.
 * Fica registrado na conversa (com o motivo) para o síndico ver. Não apaga nada.
 */
ocorrenciasRouter.post("/:id/cancelar", exigirPerfil("funcionario"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { motivo } = cancelarOcorrenciaSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  const o = await prisma.ocorrencia.findUnique({ where: { id } });
  if (!o || o.autorId !== eu.id) throw new ErroHttp(404, "Ocorrência não encontrada.");
  if (o.status === "cancelada") throw new ErroHttp(409, "Essa ocorrência já foi cancelada.");
  if (o.status !== "aberta" && o.status !== "em_analise") {
    throw new ErroHttp(409, "Essa ocorrência já está em execução ou resolvida. Fale com o síndico para encerrá-la.");
  }
  const [atualizada] = await prisma.$transaction([
    prisma.ocorrencia.update({ where: { id }, data: { status: "cancelada", resolvidaEm: null }, include: incluirPessoas }),
    prisma.comentarioOcorrencia.create({ data: { ocorrenciaId: id, autorId: eu.id, texto: `Ocorrência cancelada por ${eu.nome}. Motivo: ${motivo}` } }),
  ]);
  res.json(atualizada);
});
ocorrenciasRouter.post("/:id/comentarios", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { texto } = comentarioSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);
  const o = await prisma.ocorrencia.findUnique({ where: { id } });
  if (!o || !podeVer(eu, o)) throw new ErroHttp(404, "Ocorrência não encontrada.");
  const c = await prisma.comentarioOcorrencia.create({
    data: { ocorrenciaId: id, autorId: eu.id, texto },
    include: { autor: { select: { id: true, nome: true, perfil: true } } },
  });
  res.status(201).json(c);
});
