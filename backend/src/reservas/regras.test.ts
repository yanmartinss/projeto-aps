import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validarReserva, type AreaRegra, type ReservaAtiva } from "./regras.js";
import { extrairDia, inicioDaSemana, minutosLocais, montarData, resolverDia } from "./tempo.js";

// "Hoje" fixo: domingo, 15/11/2026, 12h em Brasília.
const AGORA = montarData("2026-11-15", "12:00");
const SALAO: AreaRegra = { id: 1, nome: "Salão de festas", abre: 8 * 60, fecha: 23 * 60, duracaoMaxMin: 4 * 60 };
const CHURRAS: AreaRegra = { id: 2, nome: "Churrasqueira", abre: 8 * 60, fecha: 23 * 60, duracaoMaxMin: 4 * 60 };

function pedir(data: string, ini: string, fim: string, extra: { area?: AreaRegra; apto?: string; ativas?: ReservaAtiva[]; ignorarId?: number } = {}) {
  return validarReserva({
    area: extra.area ?? SALAO,
    apartamento: extra.apto ?? "101",
    inicio: montarData(data, ini),
    fim: montarData(data, fim),
    agora: AGORA,
    ativas: extra.ativas ?? [],
    ignorarId: extra.ignorarId,
  });
}

const ativa = (id: number, areaId: number, apto: string, data: string, ini: string, fim: string): ReservaAtiva => ({
  id,
  areaId,
  apartamento: apto,
  inicio: montarData(data, ini),
  fim: montarData(data, fim),
});

describe("validarReserva", () => {
  it("aceita um pedido dentro de todas as regras", () => {
    assert.deepEqual(pedir("2026-11-21", "19:00", "23:00"), []);
  });

  it("aceita terminar exatamente na hora de fechar e começar exatamente na de abrir", () => {
    assert.deepEqual(pedir("2026-11-21", "08:00", "12:00"), []);
    assert.deepEqual(pedir("2026-11-22", "19:00", "23:00"), []);
  });

  it("recusa mais de 4 horas", () => {
    const m = pedir("2026-11-21", "18:00", "23:00");
    assert.equal(m.length, 1);
    assert.match(m[0], /no máximo 4h/);
  });

  it("recusa fora do horário de funcionamento", () => {
    assert.match(pedir("2026-11-21", "07:00", "10:00")[0], /funciona das 8h às 23h/);
    assert.match(pedir("2026-11-21", "21:00", "23:30")[0], /funciona das 8h às 23h/);
  });

  it("recusa datas passadas e também hoje: só a partir de amanhã", () => {
    assert.match(pedir("2026-11-10", "19:00", "22:00")[0], /já passou/);
    assert.match(pedir("2026-11-15", "09:00", "11:00")[0], /a partir de amanhã/);
    assert.match(pedir("2026-11-15", "19:00", "22:00")[0], /a partir de amanhã/);
    assert.deepEqual(pedir("2026-11-16", "08:00", "10:00"), []);
  });

  it("recusa mais de 3 meses (90 dias) de antecedência", () => {
    assert.deepEqual(pedir("2027-02-13", "19:00", "22:00"), []); // hoje + 90 dias
    assert.match(pedir("2027-02-14", "19:00", "22:00")[0], /3 meses/);
    assert.match(pedir("2027-06-01", "19:00", "22:00")[0], /3 meses/);
  });

  it("recusa término antes ou igual ao início", () => {
    assert.match(pedir("2026-11-21", "20:00", "19:00")[0], /depois do início/);
    assert.match(pedir("2026-11-21", "20:00", "20:00")[0], /depois do início/);
  });

  it("recusa reserva que atravessa a meia-noite", () => {
    const m = validarReserva({
      area: SALAO,
      apartamento: "101",
      inicio: montarData("2026-11-21", "22:00"),
      fim: montarData("2026-11-22", "02:00"),
      agora: AGORA,
      ativas: [],
    });
    assert.ok(m.some((x) => /mesmo dia/.test(x)));
  });

  it("recusa conflito de horário na mesma área, com reserva pendente ou aprovada", () => {
    const ativas = [ativa(10, 1, "202", "2026-11-21", "20:00", "22:00")];
    assert.match(pedir("2026-11-21", "19:00", "23:00", { ativas })[0], /já está reservado/);
    assert.match(pedir("2026-11-21", "21:00", "23:00", { ativas })[0], /já está reservado/);
  });

  it("permite horários colados e outras áreas no mesmo horário", () => {
    const ativas = [ativa(10, 1, "202", "2026-11-21", "20:00", "22:00")];
    assert.deepEqual(pedir("2026-11-21", "16:00", "20:00", { ativas }), []);
    assert.deepEqual(pedir("2026-11-21", "22:00", "23:00", { ativas }), []);
    assert.deepEqual(pedir("2026-11-21", "20:00", "22:00", { area: CHURRAS, ativas }), []);
  });

  it("limita a uma reserva por apartamento por semana (segunda a domingo)", () => {
    const ativas = [ativa(10, 1, "304", "2026-11-18", "19:00", "22:00")]; // quarta
    assert.match(pedir("2026-11-21", "19:00", "22:00", { apto: "304", ativas })[0], /já tem uma reserva nessa semana/);
    assert.match(pedir("2026-11-22", "09:00", "11:00", { apto: "304", ativas })[0], /já tem uma reserva nessa semana/); // domingo da mesma semana
    assert.deepEqual(pedir("2026-11-23", "19:00", "22:00", { apto: "304", ativas }), []); // segunda seguinte
  });

  it("não conta a cota semanal de outro apartamento e ignora diferença de caixa e espaço", () => {
    const ativas = [ativa(10, 1, "304 B", "2026-11-18", "19:00", "22:00")];
    assert.deepEqual(pedir("2026-11-21", "09:00", "11:00", { apto: "305", ativas }), []);
    assert.equal(pedir("2026-11-21", "09:00", "11:00", { apto: "304b", ativas }).length, 1);
  });

  it("ignora a própria reserva ao rechecar (ex.: na aprovação)", () => {
    const ativas = [ativa(10, 1, "304", "2026-11-21", "19:00", "22:00")];
    assert.deepEqual(pedir("2026-11-21", "19:00", "22:00", { apto: "304", ativas, ignorarId: 10 }), []);
  });

  it("acumula todos os motivos que se aplicam", () => {
    const m = pedir("2026-11-10", "06:00", "12:00");
    assert.ok(m.length >= 3);
  });
});

describe("tempo (fuso de Brasília)", () => {
  it("converte hora local para UTC e de volta", () => {
    const d = montarData("2026-11-21", "19:00");
    assert.equal(d.toISOString(), "2026-11-21T22:00:00.000Z");
    assert.equal(minutosLocais(d), 19 * 60);
  });

  it("o fim do dia local (23h) não vira o dia seguinte", () => {
    assert.equal(minutosLocais(montarData("2026-11-21", "23:00")), 23 * 60);
  });

  it("segunda-feira da semana, inclusive para domingo à noite", () => {
    assert.equal(inicioDaSemana(montarData("2026-11-22", "23:00")).toISOString(), "2026-11-16T03:00:00.000Z");
    assert.equal(inicioDaSemana(montarData("2026-11-16", "00:30")).toISOString(), "2026-11-16T03:00:00.000Z");
    assert.equal(inicioDaSemana(montarData("2026-11-23", "08:00")).toISOString(), "2026-11-23T03:00:00.000Z");
  });
});

describe("resolverDia (o código calcula a data; a IA só diz como o morador se refere ao dia)", () => {
  // Hoje: domingo, 15/11/2026.
  const r = (e: string) => resolverDia(e, AGORA);

  it("hoje e amanhã", () => {
    assert.equal(r("hoje"), "2026-11-15");
    assert.equal(r("amanhã"), "2026-11-16");
    assert.equal(r("amanha"), "2026-11-16");
  });

  it("dia da semana é a próxima ocorrência futura; o mesmo dia de hoje vira o da semana que vem", () => {
    assert.equal(r("domingo"), "2026-11-22");
    assert.equal(r("segunda"), "2026-11-16");
    assert.equal(r("segunda-feira"), "2026-11-16");
    assert.equal(r("terça"), "2026-11-17");
    assert.equal(r("sábado"), "2026-11-21");
  });

  it("dia do mês vai para este mês ou, se já passou, para o próximo", () => {
    assert.equal(r("28"), "2026-11-28");
    assert.equal(r("dia 28"), "2026-11-28");
    assert.equal(r("15"), "2026-11-15");
    assert.equal(r("10"), "2026-12-10");
  });

  it("dia 31 pula meses sem dia 31, e a virada do ano funciona", () => {
    assert.equal(r("31"), "2026-12-31");
    assert.equal(resolverDia("31", montarData("2026-12-31", "12:00")), "2026-12-31");
    assert.equal(resolverDia("5", montarData("2026-12-20", "12:00")), "2027-01-05");
    assert.equal(resolverDia("31", montarData("2027-01-31", "12:00")), "2027-01-31");
    assert.equal(resolverDia("31", montarData("2027-02-01", "12:00")), "2027-03-31");
  });

  it("DD/MM usa este ano ou o próximo", () => {
    assert.equal(r("28/11"), "2026-11-28");
    assert.equal(r("01/01"), "2027-01-01");
    assert.equal(r("30/02"), "");
  });

  it("expressão desconhecida ou vazia dá vazio", () => {
    assert.equal(r(""), "");
    assert.equal(r("banana"), "");
    assert.equal(r("32"), "");
  });
});

describe("extrairDia (procura o dia no texto, sem IA)", () => {
  it("acha uma expressão clara", () => {
    assert.equal(extrairDia("Quero a churrasqueira no domingo das 10h às 12h"), "domingo");
    assert.equal(extrairDia("salão sábado à noite"), "sabado");
    assert.equal(extrairDia("quadra segunda-feira de manhã"), "segunda");
    assert.equal(extrairDia("quero amanhã das 14h às 18h"), "amanha");
    assert.equal(extrairDia("quero depois de amanhã"), "depois de amanha");
    assert.equal(extrairDia("churrasqueira dia 28 das 12h às 16h"), "28");
    assert.equal(extrairDia("salão no dia 28/11"), "28/11");
    assert.equal(extrairDia("salão 05/12 à tarde"), "05/12");
  });

  it("devolve null se não houver ou houver mais de uma (ambíguo)", () => {
    assert.equal(extrairDia("quero reservar um espaço"), null);
    assert.equal(extrairDia("sábado ou domingo, tanto faz"), null);
    assert.equal(extrairDia("das 10h às 12h"), null);
  });

  it("a hora não é confundida com dia do mês", () => {
    assert.equal(extrairDia("quadra das 9 às 11"), null);
    assert.equal(extrairDia("quadra sexta das 9 às 11"), "sexta");
  });
});
