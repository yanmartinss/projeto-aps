import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashSenha, verificarSenha } from "./senha.js";

describe("senha (scrypt)", () => {
  it("aceita a senha certa e recusa a errada", async () => {
    const h = await hashSenha("minha-senha-segura");
    assert.equal(await verificarSenha("minha-senha-segura", h), true);
    assert.equal(await verificarSenha("minha-senha-segurA", h), false);
    assert.equal(await verificarSenha("", h), false);
  });

  it("a mesma senha gera hashes diferentes (cada um tem o seu sal)", async () => {
    const a = await hashSenha("igual-igual-igual");
    const b = await hashSenha("igual-igual-igual");
    assert.notEqual(a, b);
    assert.equal(await verificarSenha("igual-igual-igual", a), true);
    assert.equal(await verificarSenha("igual-igual-igual", b), true);
  });

  it("não guarda a senha em texto e usa o formato esperado", async () => {
    const h = await hashSenha("segredo-de-teste");
    assert.ok(!h.includes("segredo-de-teste"));
    assert.match(h, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("recusa hash malformado em vez de lançar erro", async () => {
    assert.equal(await verificarSenha("x", ""), false);
    assert.equal(await verificarSenha("x", "texto-puro"), false);
    assert.equal(await verificarSenha("x", "bcrypt:aa:bb"), false);
    assert.equal(await verificarSenha("x", "scrypt::"), false);
  });
});
