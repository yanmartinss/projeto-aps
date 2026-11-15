import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { limparEstilo } from "./estilo.js";

describe("limparEstilo", () => {
  it("troca travessão por vírgula", () => {
    assert.equal(limparEstilo("A água volta às 14h — se der tudo certo."), "A água volta às 14h, se der tudo certo.");
  });

  it("tira negrito e títulos", () => {
    assert.equal(limparEstilo("## Resumo\nHá **3** chamados abertos."), "Resumo\nHá 3 chamados abertos.");
  });

  it("endireita aspas curvas", () => {
    assert.equal(limparEstilo("O “salão” fecha às 23h."), 'O "salão" fecha às 23h.');
  });

  it("remove abertura e fecho de chatbot", () => {
    assert.equal(limparEstilo("Claro! O elevador volta amanhã. Espero que isso ajude!"), "O elevador volta amanhã.");
  });

  it("não mexe em texto normal nem em números", () => {
    const t = "Reunião dia 28/11 às 19h30, apto 304.";
    assert.equal(limparEstilo(t), t);
  });
});
