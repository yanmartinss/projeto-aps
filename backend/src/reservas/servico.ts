import { prisma } from "../db.js";
import { STATUS_ATIVOS, validarReserva, type AreaRegra, type ReservaAtiva } from "./regras.js";
import { montarData } from "./tempo.js";

/** A reserva é do dia inteiro: das 8h às 22h, que é também a duração máxima. */
const ABRE_MIN = 8 * 60;
const FECHA_MIN = 22 * 60;

/** Cria as áreas se não existirem e mantém o horário do dia inteiro nas que já existem. */
export async function garantirAreas() {
  const horario = { abre: ABRE_MIN, fecha: FECHA_MIN, duracaoMaxMin: FECHA_MIN - ABRE_MIN };
  for (const nome of ["Salão de festas", "Churrasqueira", "Quadra"]) {
    await prisma.areaComum.upsert({ where: { nome }, update: horario, create: { nome, ...horario } });
  }
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Início e fim da reserva do dia inteiro, conforme o horário da área. */
export function periodoDoDia(data: string, area: { abre: number; fecha: number }): { inicio: Date; fim: Date } {
  return { inicio: montarData(data, hhmm(area.abre)), fim: montarData(data, hhmm(area.fecha)) };
}

export async function carregarAtivas(): Promise<ReservaAtiva[]> {
  const rs = await prisma.reserva.findMany({ where: { status: { in: [...STATUS_ATIVOS] } } });
  return rs.map((r) => ({ id: r.id, areaId: r.areaId, apartamento: r.apartamento, inicio: r.inicio, fim: r.fim }));
}

export function validarPedido(p: {
  area: AreaRegra;
  apartamento: string;
  data: string;
  ativas: ReservaAtiva[];
  ignorarId?: number;
}): string[] {
  const { inicio, fim } = periodoDoDia(p.data, p.area);
  return validarReserva({
    area: p.area,
    apartamento: p.apartamento,
    inicio,
    fim,
    agora: new Date(),
    ativas: p.ativas,
    ignorarId: p.ignorarId,
  });
}
