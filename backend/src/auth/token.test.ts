import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
const { assinarToken, assinarTokenRedefinicao, lerToken, lerTokenRedefinicao, marcaDaSenha } = await import("./token.js");

describe("link de redefinição de senha", () => {
  it("a marca muda quando a senha muda (link de uso único)", () => {
    assert.notEqual(marcaDaSenha("hash-antigo"), marcaDaSenha("hash-novo"));
    assert.equal(marcaDaSenha("mesmo"), marcaDaSenha("mesmo"));
  });

  it("o token de redefinição devolve o usuário e a marca", async () => {
    const t = await assinarTokenRedefinicao(7, "hash-atual");
    assert.deepEqual(await lerTokenRedefinicao(t), { id: 7, marca: marcaDaSenha("hash-atual") });
  });

  it("o token de redefinição NÃO serve como sessão", async () => {
    assert.equal(await lerToken(await assinarTokenRedefinicao(7, "hash-atual")), null);
  });

  it("o token de sessão NÃO serve como link de redefinição", async () => {
    assert.equal(await lerTokenRedefinicao(await assinarToken(7)), null);
  });

  it("lixo é recusado", async () => {
    assert.equal(await lerTokenRedefinicao("isso-nao-e-um-token"), null);
  });
});
