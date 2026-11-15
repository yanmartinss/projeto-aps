import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { numerosInventados, resumoPorRegra } from "../dashboard/servico.js";
import { extrairApartamento, extrairPeriodo, inicioDoDia, inicioDoMes, intervaloDoPeriodo, montarData } from "../reservas/tempo.js";

// "Hoje": domingo, 15/11/2026, 12h em Brasília.
const AGORA = montarData("2026-11-15", "12:00");
const iso = (p: Parameters<typeof intervaloDoPeriodo>[0], agora = AGORA) => {
  const { de, ate } = intervaloDoPeriodo(p, agora);
  return [de.toISOString(), ate.toISOString()];
};

describe("períodos em Brasília", () => {
  it("hoje e ontem", () => {
    assert.deepEqual(iso("hoje"), ["2026-11-15T03:00:00.000Z", "2026-11-16T03:00:00.000Z"]);
    assert.deepEqual(iso("ontem"), ["2026-11-14T03:00:00.000Z", "2026-11-15T03:00:00.000Z"]);
  });

  it("semana vai de segunda a domingo (domingo ainda é da semana que começou na segunda anterior)", () => {
    assert.deepEqual(iso("esta_semana"), ["2026-11-09T03:00:00.000Z", "2026-11-16T03:00:00.000Z"]);
    assert.deepEqual(iso("semana_passada"), ["2026-11-02T03:00:00.000Z", "2026-11-09T03:00:00.000Z"]);
  });

  it("mês atual e passado", () => {
    assert.deepEqual(iso("este_mes"), ["2026-11-01T03:00:00.000Z", "2026-12-01T03:00:00.000Z"]);
    assert.deepEqual(iso("mes_passado"), ["2026-10-01T03:00:00.000Z", "2026-11-01T03:00:00.000Z"]);
  });

  it("virada de ano", () => {
    const janeiro = montarData("2027-01-10", "12:00");
    assert.deepEqual(iso("mes_passado", janeiro), ["2026-12-01T03:00:00.000Z", "2027-01-01T03:00:00.000Z"]);
    const dezembro = montarData("2026-12-20", "12:00");
    assert.deepEqual(iso("este_mes", dezembro), ["2026-12-01T03:00:00.000Z", "2027-01-01T03:00:00.000Z"]);
  });

  it("últimos N dias terminam agora", () => {
    const { de, ate } = intervaloDoPeriodo("ultimos_7_dias", AGORA);
    assert.equal(ate.getTime(), AGORA.getTime());
    assert.equal(AGORA.getTime() - de.getTime(), 7 * 86_400_000);
  });

  it("22h30 em Brasília ainda é o mesmo dia (mesmo já sendo o dia seguinte em UTC)", () => {
    const noite = new Date("2026-11-16T01:30:00Z"); // 22h30 de 15/11 em Brasília
    assert.equal(inicioDoDia(noite).toISOString(), "2026-11-15T03:00:00.000Z");
    assert.equal(inicioDoMes(new Date("2026-12-01T01:30:00Z")).toISOString(), "2026-11-01T03:00:00.000Z");
  });
});

describe("extrairPeriodo", () => {
  it("acha o período na pergunta", () => {
    assert.equal(extrairPeriodo("vazamentos abertos este mês"), "este_mes");
    assert.equal(extrairPeriodo("reservas da semana passada"), "semana_passada");
    assert.equal(extrairPeriodo("o que aconteceu ontem"), "ontem");
    assert.equal(extrairPeriodo("ocorrências de hoje"), "hoje");
    assert.equal(extrairPeriodo("nos últimos 30 dias"), "ultimos_30_dias");
    assert.equal(extrairPeriodo("mês passado"), "mes_passado");
  });
  it("sem período, null", () => {
    assert.equal(extrairPeriodo("barulho no bloco B"), null);
  });
});

describe("extrairApartamento", () => {
  it("acha o número do apartamento", () => {
    assert.equal(extrairApartamento("reservas do apartamento 304"), "304");
    assert.equal(extrairApartamento("ocorrências do apto 304 b"), "304b");
    assert.equal(extrairApartamento("ap. 12"), "12");
    assert.equal(extrairApartamento("Apartamento 1501"), "1501");
  });
  it("sem apartamento, null", () => {
    assert.equal(extrairApartamento("barulho às 22 horas"), null);
    assert.equal(extrairApartamento("304"), null);
  });
});

describe("trava de números do resumo da IA", () => {
  const payload = JSON.stringify({ numeros: { naoResolvidas: 7, urgentes: 2 }, criticas: [{ resumo: "Vazamento no bloco 3" }] });
  it("aceita números que existem nos dados", () => {
    assert.deepEqual(numerosInventados("Há 7 ocorrências, 2 urgentes, uma no bloco 3.", payload), []);
  });
  it("aponta número que não existe nos dados", () => {
    assert.deepEqual(numerosInventados("Há 7 ocorrências e 15 reservas.", payload), ["15"]);
  });
});

describe("resumo por regra (plano B)", () => {
  const base = {
    numeros: { naoResolvidas: 1, abertas: 1, emAnalise: 0, emExecucao: 0, urgentes: 1, resolvidasNoMes: 0, reservasPendentes: 1, reservasFuturas: 0 },
    criticas: [{ id: 1, resumo: "Portão travado aberto", categoria: "seguranca", status: "aberta", criadaEm: new Date(), responsavel: null }],
    proximasReservas: [],
    porCategoria: [],
    comunicados: [],
  };
  it("usa o singular e cita a mais antiga urgente", () => {
    const t = resumoPorRegra(base);
    assert.match(t, /Há 1 ocorrência em aberto, 1 urgente/);
    assert.match(t, /1 reserva aguarda/);
    assert.match(t, /Portão travado aberto/);
  });
  it("sem nada em aberto, diz isso", () => {
    const t = resumoPorRegra({ ...base, numeros: { ...base.numeros, naoResolvidas: 0, urgentes: 0, reservasPendentes: 0 }, criticas: [] });
    assert.match(t, /Não há ocorrências em aberto/);
  });
});
