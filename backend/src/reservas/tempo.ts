/**
 * Fuso de Brasília fixo em UTC-3 (o Brasil não usa horário de verão desde 2019).
 * As datas são guardadas em UTC; "hora local" é sempre a de Brasília.
 */
const OFFSET_MIN = -180;
const MIN_MS = 60_000;

/** Desloca o instante para que os getters UTC devolvam a hora local. */
function local(d: Date): Date {
  return new Date(d.getTime() + OFFSET_MIN * MIN_MS);
}

export function dataLocalISO(d: Date): string {
  return local(d).toISOString().slice(0, 10);
}

export function minutosLocais(d: Date): number {
  const l = local(d);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
}

/** "2026-11-21" + "19:00" (hora de Brasília) -> instante UTC. */
export function montarData(data: string, hhmm: string): Date {
  return new Date(`${data}T${hhmm}:00-03:00`);
}

/** Segunda-feira 00:00 (Brasília) da semana da data informada. */
export function inicioDaSemana(d: Date): Date {
  const l = local(d);
  const diasDesdeSegunda = (l.getUTCDay() + 6) % 7;
  const segunda = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() - diasDesdeSegunda);
  return new Date(segunda - OFFSET_MIN * MIN_MS);
}

const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function diaDaSemana(d: Date): string {
  return DIAS_SEMANA[local(d).getUTCDay()];
}

export function formatarMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function formatarHorario(d: Date): string {
  return formatarMinutos(minutosLocais(d));
}

export function formatarDataBR(d: Date): string {
  const [a, m, dia] = dataLocalISO(d).split("-");
  return `${dia}/${m}/${a}`;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const NOMES_DIA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function dataUTC(ano: number, mes: number, dia: number): Date | null {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? d : null;
}

/**
 * Resolve como o morador se refere ao dia ("hoje", "amanha", "domingo", "28", "28/11") para AAAA-MM-DD.
 * A IA só classifica a expressão; a conta da data é feita aqui, para não depender de aritmética do modelo.
 * Nome de dia da semana = próxima ocorrência futura (se for o mesmo dia de hoje, o da semana que vem).
 * Devolve "" se não reconhecer.
 */
export function resolverDia(expressao: string, agora: Date): string {
  const e = semAcento(expressao).replace(/^dia\s+/, "").replace(/-feira$/, "");
  const [ano, mes, dia] = dataLocalISO(agora).split("-").map(Number);
  const hoje = Date.UTC(ano, mes - 1, dia);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  if (e === "hoje") return iso(hoje);
  if (e === "amanha") return iso(hoje + 86_400_000);
  if (e === "depois de amanha") return iso(hoje + 2 * 86_400_000);

  const alvoSemana = NOMES_DIA.indexOf(e);
  if (alvoSemana >= 0) {
    const atual = new Date(hoje).getUTCDay();
    const falta = ((alvoSemana - atual + 7) % 7) || 7;
    return iso(hoje + falta * 86_400_000);
  }

  const dm = e.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    for (const a of [ano, ano + 1]) {
      const cand = dataUTC(a, m, d);
      if (cand && cand.getTime() >= hoje) return iso(cand.getTime());
    }
    return "";
  }

  const soDia = e.match(/^(\d{1,2})$/);
  if (soDia) {
    const d = Number(soDia[1]);
    for (let i = 0; i < 3; i++) {
      const real = new Date(Date.UTC(ano, mes - 1 + i, 1)); // normaliza mês > 12 e vira o ano
      const c2 = dataUTC(real.getUTCFullYear(), real.getUTCMonth() + 1, d);
      if (c2 && c2.getTime() >= hoje) return iso(c2.getTime());
    }
  }
  return "";
}

/**
 * Procura a expressão do dia direto no texto do morador (sem IA).
 * Devolve a expressão se houver exatamente uma ("domingo", "amanha", "28", "28/11"), ou null se não houver
 * nenhuma ou se houver mais de uma (ambíguo: aí vale o que a IA entendeu).
 */
export function extrairDia(texto: string): string | null {
  const t = semAcento(texto);
  const achadas = new Set<string>();

  if (/\bdepois de amanha\b/.test(t)) achadas.add("depois de amanha");
  else if (/\bamanha\b/.test(t)) achadas.add("amanha");
  if (/\bhoje\b/.test(t)) achadas.add("hoje");

  for (const m of t.matchAll(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\b/g)) achadas.add(m[1]);

  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)) achadas.add(`${m[1]}/${m[2]}`);
  for (const m of t.matchAll(/\bdia (\d{1,2})\b(?!\s*\/)/g)) achadas.add(m[1]);

  return achadas.size === 1 ? [...achadas][0] : null;
}

/** Primeiro instante do mês (dia 1, 00:00 em Brasília) do instante informado. */
export function inicioDoMes(d: Date): Date {
  const l = local(d);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), 1) - OFFSET_MIN * MIN_MS);
}

/** Meia-noite (Brasília) do dia do instante informado. */
export function inicioDoDia(d: Date): Date {
  const l = local(d);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) - OFFSET_MIN * MIN_MS);
}

function mesDeslocado(d: Date, meses: number): Date {
  const l = local(d);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth() + meses, 1) - OFFSET_MIN * MIN_MS);
}

export const PERIODOS = [
  "hoje",
  "ontem",
  "esta_semana",
  "semana_passada",
  "este_mes",
  "mes_passado",
  "ultimos_7_dias",
  "ultimos_30_dias",
] as const;
export type Periodo = (typeof PERIODOS)[number];

/** Intervalo [de, ate) de um período em Brasília. A IA nunca calcula datas: só o código. */
export function intervaloDoPeriodo(p: Periodo, agora: Date): { de: Date; ate: Date } {
  const DIA = 86_400_000;
  const hoje0 = inicioDoDia(agora);
  switch (p) {
    case "hoje":
      return { de: hoje0, ate: new Date(hoje0.getTime() + DIA) };
    case "ontem":
      return { de: new Date(hoje0.getTime() - DIA), ate: hoje0 };
    case "esta_semana": {
      const ini = inicioDaSemana(agora);
      return { de: ini, ate: new Date(ini.getTime() + 7 * DIA) };
    }
    case "semana_passada": {
      const ini = inicioDaSemana(agora);
      return { de: new Date(ini.getTime() - 7 * DIA), ate: ini };
    }
    case "este_mes":
      return { de: inicioDoMes(agora), ate: mesDeslocado(agora, 1) };
    case "mes_passado":
      return { de: mesDeslocado(agora, -1), ate: inicioDoMes(agora) };
    case "ultimos_7_dias":
      return { de: new Date(agora.getTime() - 7 * DIA), ate: agora };
    case "ultimos_30_dias":
      return { de: new Date(agora.getTime() - 30 * DIA), ate: agora };
  }
}

/** Acha a expressão de período na pergunta, sem IA. As mais específicas vêm primeiro. */
export function extrairPeriodo(texto: string): Periodo | null {
  const t = semAcento(texto);
  const regras: [RegExp, Periodo][] = [
    [/semana passada/, "semana_passada"],
    [/mes passado/, "mes_passado"],
    [/ultimos 7 dias|ultima semana/, "ultimos_7_dias"],
    [/ultimos 30 dias|ultimo mes/, "ultimos_30_dias"],
    [/(esta|nesta|essa) semana/, "esta_semana"],
    [/(este|neste|esse) mes|\bdo mes\b/, "este_mes"],
    [/\bontem\b/, "ontem"],
    [/\bhoje\b/, "hoje"],
  ];
  return regras.find(([re]) => re.test(t))?.[1] ?? null;
}

/** "apartamento 304", "apto 304 b", "ap. 12" -> "304", "304b", "12" (sem espaços, minúsculo). */
export function extrairApartamento(texto: string): string | null {
  const m = semAcento(texto).match(/\b(?:apartamento|apto|apt|ap)\.?\s*(?:n[o]?\s*)?(\d{1,4})\s?([a-z])?\b/);
  return m ? `${m[1]}${m[2] ?? ""}` : null;
}
