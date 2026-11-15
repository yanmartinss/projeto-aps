import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import dotenv from "dotenv";
import { avisarSeSenhaTemCerquilhaSemAspas } from "./seed.js";

function envTemporario(conteudo: string): string {
  const pasta = mkdtempSync(join(tmpdir(), "env-teste-"));
  const arquivo = join(pasta, ".env");
  writeFileSync(arquivo, conteudo);
  return arquivo;
}

describe("senha do síndico com # no .env", () => {
  it("o dotenv corta a senha no # quando não há aspas (é o motivo do aviso)", () => {
    const lido = dotenv.parse("SINDICO_SENHA=abcdefgh#12\n");
    assert.equal(lido.SINDICO_SENHA, "abcdefgh");
  });

  it("entre aspas, o dotenv mantém a senha inteira", () => {
    assert.equal(dotenv.parse('SINDICO_SENHA="abcdefgh#12"\n').SINDICO_SENHA, "abcdefgh#12");
    assert.equal(dotenv.parse("SINDICO_SENHA='abcdefgh#12'\n").SINDICO_SENHA, "abcdefgh#12");
  });

  it("avisa quando há # sem aspas", () => {
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(envTemporario("PORT=3333\nSINDICO_SENHA=abcdefgh#12\n")), true);
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(envTemporario("SINDICO_SENHA=abcdefgh#12\r\nPORT=1\r\n")), true);
  });

  it("não avisa quando a senha está entre aspas ou não tem #", () => {
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(envTemporario('SINDICO_SENHA="abcdefgh#12"\n')), false);
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(envTemporario("SINDICO_SENHA='abcdefgh#12'\n")), false);
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(envTemporario("SINDICO_SENHA=abcdefgh12\n")), false);
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(envTemporario("PORT=3333\n")), false);
  });

  it("sem arquivo .env, não quebra", () => {
    assert.equal(avisarSeSenhaTemCerquilhaSemAspas(join(tmpdir(), "nao-existe", ".env")), false);
  });
});
