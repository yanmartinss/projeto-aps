import { prisma } from "../db.js";
import { STATUS_ENCERRADOS } from "../schemas.js";
import { obterProvedor } from "../ia/provedor.js";
import { limparEstilo } from "../ia/estilo.js";
import { SISTEMA_RESUMO_DIA } from "../ia/prompts.js";
import { inicioDoMes } from "../reservas/tempo.js";

const DIA = 86_400_000;
const VALIDADE_RESUMO_MS = 10 * 60 * 1000;

export async function numerosEListas(agora = new Date()) {
  const [porStatus, urgentes, resolvidasNoMes, reservasPendentes, reservasFuturas, criticasRaw, proximas, porCategoriaRaw, comunicados] = await Promise.all([
    prisma.ocorrencia.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ocorrencia.count({ where: { urgencia: "alta", status: { notIn: STATUS_ENCERRADOS } } }),
    prisma.ocorrencia.count({ where: { resolvidaEm: { gte: inicioDoMes(agora) } } }),
    prisma.reserva.count({ where: { status: "pendente" } }),
    prisma.reserva.count({ where: { status: "aprovada", inicio: { gte: agora } } }),
    prisma.ocorrencia.findMany({
      where: { urgencia: "alta", status: { notIn: STATUS_ENCERRADOS } },
      include: { responsavel: { select: { nome: true } } },
      orderBy: { criadaEm: "asc" },
      take: 5,
    }),
    prisma.reserva.findMany({ where: { status: "aprovada", inicio: { gte: agora } }, include: { area: true }, orderBy: { inicio: "asc" }, take: 5 }),
    prisma.ocorrencia.groupBy({ by: ["categoria"], where: { criadaEm: { gte: new Date(agora.getTime() - 30 * DIA) } }, _count: { _all: true } }),
    prisma.comunicado.findMany({ orderBy: { criadoEm: "desc" }, take: 3, include: { autor: { select: { nome: true } } } }),
  ]);
  const conta = (s: string) => porStatus.find((p) => p.status === s)?._count._all ?? 0;

  return {
    numeros: {
      naoResolvidas: conta("aberta") + conta("em_analise") + conta("em_execucao"),
      abertas: conta("aberta"),
      emAnalise: conta("em_analise"),
      emExecucao: conta("em_execucao"),
      urgentes,
      resolvidasNoMes,
      reservasPendentes,
      reservasFuturas,
    },
    criticas: criticasRaw.map((o) => ({
      id: o.id,
      resumo: (o.resumo ?? o.texto).slice(0, 140),
      categoria: o.categoria,
      status: o.status,
      criadaEm: o.criadaEm,
      responsavel: o.responsavel?.nome ?? null,
    })),
    proximasReservas: proximas.map((r) => ({ id: r.id, area: r.area.nome, apartamento: r.apartamento, inicio: r.inicio, fim: r.fim })),
    porCategoria: porCategoriaRaw.map((c) => ({ categoria: c.categoria ?? "sem_categoria", total: c._count._all })).sort((a, b) => b.total - a.total),
    comunicados: comunicados.map((c) => ({ id: c.id, titulo: c.titulo, categoria: c.categoria, criadoEm: c.criadoEm, autor: c.autor.nome })),
  };
}

type Dados = Awaited<ReturnType<typeof numerosEListas>>;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Texto montado por regra com os mesmos números: é o plano B quando a IA falha ou erra. */
export function resumoPorRegra(d: Dados): string {
  const n = d.numeros;
  const partes: string[] = [];
  if (n.naoResolvidas === 0) partes.push("Não há ocorrências em aberto no momento.");
  else {
    partes.push(
      `Há ${plural(n.naoResolvidas, "ocorrência em aberto", "ocorrências em aberto")}, ${plural(n.urgentes, "urgente", "urgentes")}${n.emExecucao > 0 ? `, com ${n.emExecucao} em execução` : ""}.`,
    );
  }
  if (n.reservasPendentes > 0) partes.push(`${plural(n.reservasPendentes, "reserva aguarda", "reservas aguardam")} a sua resposta.`);
  if (n.resolvidasNoMes > 0) partes.push(`${plural(n.resolvidasNoMes, "ocorrência foi resolvida", "ocorrências foram resolvidas")} neste mês.`);
  if (d.criticas.length > 0) partes.push(`Comece pela mais antiga das urgentes: "${d.criticas[0].resumo}".`);
  else if (n.reservasPendentes > 0) partes.push("Comece respondendo às reservas pendentes.");
  return partes.join(" ");
}

/** Todo número do texto da IA precisa existir nos dados enviados; se aparecer um que não existe, o texto é descartado. */
export function numerosInventados(texto: string, payload: string): string[] {
  const permitidos = new Set(payload.match(/\d+/g) ?? []);
  return (texto.match(/\d+/g) ?? []).filter((n) => !permitidos.has(n));
}

export interface ResumoDoDia {
  texto: string;
  origem: "ia" | "regra";
  geradoEm: Date;
}

let cache: (ResumoDoDia & { chave: string }) | null = null;

/** A IA só redige em cima de números calculados pelo código. Sem nomes de moradores nem apartamentos no que é enviado. */
export async function resumoDoDia(forcar: boolean, agora = new Date()): Promise<ResumoDoDia> {
  const d = await numerosEListas(agora);
  const entrada = { numeros: d.numeros, criticas: d.criticas.map((c) => ({ resumo: c.resumo, status: c.status, categoria: c.categoria })) };
  const payload = JSON.stringify(entrada);
  const chave = payload;

  if (!forcar && cache && cache.chave === chave && agora.getTime() - cache.geradoEm.getTime() < VALIDADE_RESUMO_MS) {
    return { texto: cache.texto, origem: cache.origem, geradoEm: cache.geradoEm };
  }

  const regra = resumoPorRegra(d);
  let resultado: ResumoDoDia = { texto: regra, origem: "regra", geradoEm: agora };
  try {
    const texto = limparEstilo(await obterProvedor().gerarTexto(SISTEMA_RESUMO_DIA, payload));
    const inventados = numerosInventados(texto, payload);
    if (texto.length >= 20 && texto.length <= 700 && inventados.length === 0) resultado = { texto, origem: "ia", geradoEm: agora };
    else if (inventados.length > 0) console.warn(`Resumo da IA descartado: números fora dos dados (${inventados.join(", ")}).`);
  } catch (erro) {
    console.error("Falha no resumo do dia por IA:", erro instanceof Error ? erro.message : erro);
  }
  cache = { ...resultado, chave };
  return resultado;
}
