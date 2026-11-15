import {
  dataLocalISO,
  formatarDataBR,
  formatarHorario,
  formatarMinutos,
  inicioDaSemana,
  inicioDoDia,
  minutosLocais,
} from "./tempo.js";

export interface AreaRegra {
  id: number;
  nome: string;
  /** Minutos desde a meia-noite. */
  abre: number;
  fecha: number;
  duracaoMaxMin: number;
}

export interface ReservaAtiva {
  id: number;
  areaId: number;
  apartamento: string;
  inicio: Date;
  fim: Date;
}

export const STATUS_ATIVOS = ["pendente", "aprovada"] as const;
/** 3 meses, contados em dias para a regra ser igual o ano todo. */
export const ANTECEDENCIA_MAX_DIAS = 90;
const DIA_MS = 86_400_000;

/** Apartamento comparado sem caixa e sem espaços ("304 B" = "304b"). */
export function normalizarApartamento(a: string): string {
  return a.toLowerCase().replace(/\s+/g, "");
}

/**
 * Regras da reserva. Função pura: quem decide é o código, nunca a IA.
 * `ativas` = reservas pendentes ou aprovadas (só estas bloqueiam horário e contam na cota semanal).
 * Devolve a lista de motivos que impedem a reserva (vazia = pode reservar).
 */
export function validarReserva(p: {
  area: AreaRegra;
  apartamento: string;
  inicio: Date;
  fim: Date;
  agora: Date;
  ativas: ReservaAtiva[];
  ignorarId?: number;
}): string[] {
  const { area, inicio, fim, agora } = p;
  const motivos: string[] = [];

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return ["Data ou horário inválido."];
  }
  if (fim.getTime() <= inicio.getTime()) {
    return ["O horário de término precisa ser depois do início."];
  }

  // Só a partir de amanhã (não vale hoje, nem datas passadas) e até 90 dias (3 meses) à frente.
  const hoje0 = inicioDoDia(agora).getTime();
  if (inicio.getTime() < hoje0) {
    motivos.push("Essa data já passou. Escolha um dia a partir de amanhã.");
  } else if (inicio.getTime() < hoje0 + DIA_MS) {
    motivos.push("Não dá para reservar para hoje. Escolha um dia a partir de amanhã.");
  }
  if (inicio.getTime() >= hoje0 + (ANTECEDENCIA_MAX_DIAS + 1) * DIA_MS) {
    motivos.push("Só é possível reservar com até 3 meses de antecedência.");
  }

  if (dataLocalISO(inicio) !== dataLocalISO(fim)) {
    motivos.push("A reserva precisa começar e terminar no mesmo dia.");
  } else if (minutosLocais(inicio) < area.abre || minutosLocais(fim) > area.fecha) {
    motivos.push(`${area.nome} funciona das ${formatarMinutos(area.abre)} às ${formatarMinutos(area.fecha)}.`);
  }

  const duracaoMin = (fim.getTime() - inicio.getTime()) / 60_000;
  if (duracaoMin > area.duracaoMaxMin) {
    motivos.push(`A reserva pode ter no máximo ${formatarMinutos(area.duracaoMaxMin)} de duração.`);
  }

  const outras = p.ativas.filter((r) => r.id !== p.ignorarId);

  const conflito = outras.find(
    (r) => r.areaId === area.id && r.inicio.getTime() < fim.getTime() && r.fim.getTime() > inicio.getTime(),
  );
  if (conflito) {
    motivos.push(
      `${area.nome} já está reservado (ou aguardando aprovação) em ${formatarDataBR(conflito.inicio)}, das ${formatarHorario(conflito.inicio)} às ${formatarHorario(conflito.fim)}.`,
    );
  }

  // Uma reserva ativa por apartamento por semana (segunda a domingo) da data reservada.
  const semanaIni = inicioDaSemana(inicio).getTime();
  const semanaFim = semanaIni + 7 * DIA_MS;
  const apto = normalizarApartamento(p.apartamento);
  const naSemana = outras.find(
    (r) => normalizarApartamento(r.apartamento) === apto && r.inicio.getTime() >= semanaIni && r.inicio.getTime() < semanaFim,
  );
  if (naSemana) {
    motivos.push(`O apartamento ${p.apartamento} já tem uma reserva nessa semana (${formatarDataBR(naSemana.inicio)}).`);
  }

  return motivos;
}
