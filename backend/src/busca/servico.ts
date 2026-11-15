import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../db.js";
import { obterProvedor } from "../ia/provedor.js";
import { SCHEMA_BUSCA, SISTEMA_BUSCA } from "../ia/prompts.js";
import { normalizarApartamento } from "../reservas/regras.js";
import { extrairApartamento, extrairPeriodo, intervaloDoPeriodo, type Periodo } from "../reservas/tempo.js";
import { CATEGORIAS, STATUS, STATUS_RESERVA, URGENCIAS, filtrosBrutosSchema } from "../schemas.js";

export type TipoBusca = "ocorrencias" | "reservas" | "moradores" | "tudo";

export interface Filtros {
  tipo: TipoBusca;
  categoria?: string;
  urgencia?: string;
  statusOcorrencia?: string;
  statusReserva?: string;
  palavras: string[];
  apartamento?: string;
  periodo?: Periodo;
}

const LIMITE = 20;
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PARADAS = new Set(
  "quais quero todas todos sobre desta deste mostre mostrar liste listar ocorrencia ocorrencias reserva reservas morador moradores apartamento apto semana passada passado este esta neste nesta mes hoje ontem foram tinha tenho temos para pelos pelas dessa desse algum alguma abertas abertos urgentes".split(" "),
);

function palavrasChave(texto: string): string[] {
  return [
    ...new Set(
      semAcento(texto)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((p) => p.length >= 4 && !PARADAS.has(p)),
    ),
  ].slice(0, 3);
}

/** Dicionário de palavras: complementa a IA e é o plano B quando ela falha. */
function porPalavras(pergunta: string): Omit<Filtros, "palavras" | "apartamento" | "periodo"> {
  const t = semAcento(pergunta);
  const cat: [string, RegExp][] = [
    ["vazamento_manutencao", /vazament|infiltra|manuten|encanament|elevador|goteira/],
    ["barulho", /barulh|ruido|musica|som alto/],
    ["seguranca", /seguranc|portao|invasa|roubo|furto|camera/],
    ["limpeza", /limpeza|lixo|sujeira/],
    ["entrega_portaria", /entrega|encomenda|pacote/],
  ];
  const categoria = cat.find(([, re]) => re.test(t))?.[0];
  const urgencia = /urgente|critic|grave|emergenc/.test(t) ? "alta" : undefined;
  const statusOcorrencia = /em analise|orcamento/.test(t)
    ? "em_analise"
    : /em execucao|em andamento/.test(t)
      ? "em_execucao"
      : /resolvid|conclu|fechad/.test(t)
        ? "resolvida"
        : /\babert[ao]s?\b|nao resolvid/.test(t)
          ? "aberta"
          : undefined;
  const statusReserva = /pendente|aguardando/.test(t)
    ? "pendente"
    : /aprovad|confirmad/.test(t)
      ? "aprovada"
      : /recusad/.test(t)
        ? "recusada"
        : /cancelad/.test(t)
          ? "cancelada"
          : undefined;
  const tipo: TipoBusca = /reserva|salao|churrasqueira|quadra/.test(t)
    ? "reservas"
    : /\bmorador|\bmoradores|\bquem mora/.test(t)
      ? "moradores"
      : /ocorrencia|chamado|problema|reclama/.test(t) || categoria || urgencia
        ? "ocorrencias"
        : "tudo";
  return { tipo, categoria, urgencia, statusOcorrencia, statusReserva };
}

const valido = <T extends string>(v: string, lista: readonly T[]): T | undefined =>
  lista.includes(v.trim().toLowerCase() as T) ? (v.trim().toLowerCase() as T) : undefined;

/**
 * A IA só traduz a pergunta em filtros; o código valida cada valor, calcula as datas e monta a consulta.
 * Se a IA falhar, vale o dicionário de palavras.
 */
export async function interpretarPergunta(pergunta: string, agora = new Date()): Promise<{ filtros: Filtros; origem: "ia" | "palavras" }> {
  const dic = porPalavras(pergunta);
  let bruto: ReturnType<typeof filtrosBrutosSchema.safeParse> | null = null;
  try {
    bruto = filtrosBrutosSchema.safeParse(await obterProvedor().gerarJson(SISTEMA_BUSCA, `Pergunta do síndico: """${pergunta}"""`, SCHEMA_BUSCA));
  } catch (erro) {
    console.error("Falha na busca por IA:", erro instanceof Error ? erro.message : erro);
  }

  const ia = bruto?.success ? bruto.data : null;
  const tipoIA = ia ? valido(ia.tipo, ["ocorrencias", "reservas", "moradores", "tudo"] as const) : undefined;
  const filtros: Filtros = {
    tipo: tipoIA && tipoIA !== "tudo" ? tipoIA : dic.tipo,
    categoria: (ia && valido(ia.categoria, CATEGORIAS)) || dic.categoria,
    urgencia: (ia && valido(ia.urgencia, URGENCIAS)) || dic.urgencia,
    statusOcorrencia: (ia && valido(ia.status, STATUS)) || dic.statusOcorrencia,
    statusReserva: (ia && valido(ia.status, STATUS_RESERVA)) || dic.statusReserva,
    palavras: ia?.texto ? palavrasChave(ia.texto) : palavrasChave(pergunta),
    // Datas e apartamento: sempre pelo código.
    periodo: extrairPeriodo(pergunta) ?? undefined,
    apartamento: extrairApartamento(pergunta) ?? undefined,
  };
  void agora;
  return { filtros, origem: ia ? "ia" : "palavras" };
}

const rotulos: Record<string, string> = {
  barulho: "barulho",
  vazamento_manutencao: "vazamento e manutenção",
  seguranca: "segurança",
  limpeza: "limpeza",
  entrega_portaria: "entrega e portaria",
  outros: "outros",
  aberta: "abertas",
  em_analise: "em análise",
  em_execucao: "em execução",
  resolvida: "resolvidas",
  pendente: "pendentes",
  aprovada: "aprovadas",
  recusada: "recusadas",
  cancelada: "canceladas",
  hoje: "hoje",
  ontem: "ontem",
  esta_semana: "esta semana",
  semana_passada: "semana passada",
  este_mes: "este mês",
  mes_passado: "mês passado",
  ultimos_7_dias: "últimos 7 dias",
  ultimos_30_dias: "últimos 30 dias",
};

/** Cada filtro vira uma etiqueta legível ("Ocorrências", "categoria: barulho", "este mês"...). */
function etiquetas(f: Filtros, tipos: string[], palavrasUsadas: boolean): string[] {
  const e = [tipos.map((t) => ({ ocorrencias: "ocorrências", reservas: "reservas", moradores: "moradores" })[t]).join(", ")];
  if (f.categoria) e.push(`categoria: ${rotulos[f.categoria]}`);
  if (f.urgencia) e.push(`urgência: ${f.urgencia}`);
  if (f.statusOcorrencia && tipos.includes("ocorrencias")) e.push(`status: ${rotulos[f.statusOcorrencia]}`);
  if (f.statusReserva && tipos.includes("reservas") && !tipos.includes("ocorrencias")) e.push(`status: ${rotulos[f.statusReserva]}`);
  if (f.periodo) e.push(rotulos[f.periodo]);
  if (f.apartamento) e.push(`apartamento ${f.apartamento}`);
  if (palavrasUsadas) e.push(`contém: ${f.palavras.join(", ")}`);
  return e;
}

const mesmoApto = (a: string | null | undefined, alvo: string) => !!a && normalizarApartamento(a) === alvo;

export interface ResultadoBusca {
  origem: "ia" | "palavras";
  etiquetas: string[];
  ocorrencias: { id: number; resumo: string; categoria: string | null; urgencia: string | null; status: string; criadaEm: Date; autor: string | null; apartamento: string | null }[];
  reservas: { id: number; area: string; apartamento: string; inicio: Date; fim: Date; status: string }[];
  moradores: { id: number; nome: string; apartamento: string | null; ativo: boolean }[];
}

export async function buscar(pergunta: string, agora = new Date()): Promise<ResultadoBusca> {
  const { filtros: f, origem } = await interpretarPergunta(pergunta, agora);
  const intervalo = f.periodo ? intervaloDoPeriodo(f.periodo, agora) : undefined;
  const apto = f.apartamento ? normalizarApartamento(f.apartamento) : undefined;
  const filtroOcorrencia = !!(f.categoria || f.urgencia || f.statusOcorrencia);

  // Quais tipos pesquisar: o pedido explícito, ou o que os filtros indicam, ou tudo.
  let tipos: ("ocorrencias" | "reservas" | "moradores")[];
  if (f.tipo !== "tudo") tipos = [f.tipo];
  else if (filtroOcorrencia) tipos = ["ocorrencias"];
  else if (f.statusReserva) tipos = ["reservas"];
  else tipos = ["ocorrencias", "reservas", "moradores"];

  // As palavras só entram na consulta quando não há um filtro mais preciso; a etiqueta mostra só o que foi aplicado.
  const palavrasUsadas =
    f.palavras.length > 0 &&
    ((tipos.includes("ocorrencias") && !filtroOcorrencia && !apto) ||
      (tipos.includes("reservas") && !apto && !f.statusReserva) ||
      tipos.includes("moradores"));
  const out: ResultadoBusca = { origem, etiquetas: etiquetas(f, tipos, palavrasUsadas), ocorrencias: [], reservas: [], moradores: [] };
  const mode = "insensitive" as const;

  if (tipos.includes("ocorrencias")) {
    const where: Prisma.OcorrenciaWhereInput = {
      ...(f.categoria ? { categoria: f.categoria } : {}),
      ...(f.urgencia ? { urgencia: f.urgencia } : {}),
      ...(f.statusOcorrencia ? { status: f.statusOcorrencia } : {}),
      ...(intervalo ? { criadaEm: { gte: intervalo.de, lt: intervalo.ate } } : {}),
      // Palavras só restringem quando não há categoria/urgência/status: evita filtrar duas vezes pela mesma ideia.
      ...(f.palavras.length && !filtroOcorrencia && !apto
        ? { OR: f.palavras.flatMap((p) => [{ texto: { contains: p, mode } }, { resumo: { contains: p, mode } }]) }
        : {}),
    };
    let rows = await prisma.ocorrencia.findMany({
      where,
      include: { autor: { select: { nome: true, apartamento: true } } },
      orderBy: { criadaEm: "desc" },
      take: 100,
    });
    if (apto) rows = rows.filter((r) => mesmoApto(r.autor?.apartamento, apto));
    out.ocorrencias = rows.slice(0, LIMITE).map((r) => ({
      id: r.id,
      resumo: r.resumo ?? r.texto,
      categoria: r.categoria,
      urgencia: r.urgencia,
      status: r.status,
      criadaEm: r.criadaEm,
      autor: r.autor?.nome ?? null,
      apartamento: r.autor?.apartamento ?? null,
    }));
  }

  if (tipos.includes("reservas")) {
    const where: Prisma.ReservaWhereInput = {
      ...(f.statusReserva ? { status: f.statusReserva } : {}),
      ...(intervalo ? { inicio: { gte: intervalo.de, lt: intervalo.ate } } : {}),
      ...(f.palavras.length && !apto && !f.statusReserva ? { OR: f.palavras.map((p) => ({ area: { nome: { contains: p, mode } } })) } : {}),
    };
    let rows = await prisma.reserva.findMany({ where, include: { area: true }, orderBy: { inicio: "desc" }, take: 100 });
    if (apto) rows = rows.filter((r) => mesmoApto(r.apartamento, apto));
    out.reservas = rows.slice(0, LIMITE).map((r) => ({ id: r.id, area: r.area.nome, apartamento: r.apartamento, inicio: r.inicio, fim: r.fim, status: r.status }));
  }

  if (tipos.includes("moradores")) {
    const where: Prisma.UsuarioWhereInput = {
      perfil: "morador",
      ...(f.palavras.length ? { OR: f.palavras.map((p) => ({ nome: { contains: p, mode } })) } : {}),
    };
    let rows = await prisma.usuario.findMany({ where, orderBy: { nome: "asc" }, take: 100 });
    if (apto) rows = rows.filter((r) => mesmoApto(r.apartamento, apto));
    out.moradores = rows.slice(0, LIMITE).map((r) => ({ id: r.id, nome: r.nome, apartamento: r.apartamento, ativo: r.ativo }));
  }

  return out;
}
