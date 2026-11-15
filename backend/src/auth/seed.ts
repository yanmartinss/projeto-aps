import { readFileSync } from "node:fs";
import { prisma } from "../db.js";
import { hashSenha, verificarSenha } from "./senha.js";

/** O dotenv trata "#" sem aspas como começo de comentário e corta o valor ali. Avisa antes que isso vire um login que "não funciona". */
/** Devolve true (e avisa no log) quando a senha do síndico tem # sem aspas no arquivo informado. */
export function avisarSeSenhaTemCerquilhaSemAspas(caminho = ".env"): boolean {
  try {
    const linha = readFileSync(caminho, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("SINDICO_SENHA="));
    const valor = linha?.slice("SINDICO_SENHA=".length).trim() ?? "";
    if (valor.includes("#") && !/^["']/.test(valor)) {
      console.warn(
        "SINDICO_SENHA contém # sem aspas: o .env corta a senha nesse ponto. Coloque a senha entre aspas duplas (SINDICO_SENHA=\"sua-senha\") e reinicie.",
      );
      return true;
    }
  } catch {
    /* sem .env (variáveis vindas do ambiente): nada a conferir */
  }
  return false;
}

/**
 * A conta do síndico é controlada pelo .env (SINDICO_NOME, SINDICO_EMAIL, SINDICO_SENHA):
 * - se não existe síndico, cria;
 * - se existe e o .env mudou (e-mail, nome ou senha), atualiza a conta no próximo início do servidor.
 * Assim, quem esquecer a senha do síndico só precisa editar o .env e reiniciar.
 * Depois disso, o síndico cria as contas de funcionário pela tela "Usuários".
 */
export async function garantirSindico(): Promise<void> {
  const email = process.env.SINDICO_EMAIL?.trim().toLowerCase();
  const senha = process.env.SINDICO_SENHA;
  const nome = process.env.SINDICO_NOME?.trim() || "Síndico";
  avisarSeSenhaTemCerquilhaSemAspas();
  const existente = await prisma.usuario.findFirst({ where: { perfil: "sindico" }, orderBy: { id: "asc" } });

  if (!email || !senha) {
    if (!existente) {
      console.warn("Não há conta de síndico e SINDICO_EMAIL/SINDICO_SENHA não estão no .env: ninguém conseguirá administrar o sistema.");
    }
    return;
  }
  if (senha.length < 8) {
    console.warn(
      `SINDICO_SENHA tem ${senha.length} caracteres e o mínimo é 8. A conta do síndico ${existente ? "continua com a senha anterior" : "não foi criada"}: edite o .env e reinicie.`,
    );
    return;
  }

  if (!existente) {
    await prisma.usuario.create({
      data: { nome, email, senhaHash: await hashSenha(senha), perfil: "sindico" },
    });
    console.log(`Conta de síndico criada (${email}).`);
    return;
  }

  const mudancas: string[] = [];
  const dados: { nome?: string; email?: string; senhaHash?: string } = {};

  if (existente.nome !== nome) {
    dados.nome = nome;
    mudancas.push("nome");
  }
  if (existente.email !== email) {
    const emUso = await prisma.usuario.findUnique({ where: { email } });
    if (emUso && emUso.id !== existente.id) {
      console.warn(`SINDICO_EMAIL (${email}) já pertence a outra conta. O e-mail do síndico não foi alterado.`);
    } else {
      dados.email = email;
      mudancas.push("e-mail");
    }
  }
  if (!(await verificarSenha(senha, existente.senhaHash))) {
    dados.senhaHash = await hashSenha(senha);
    mudancas.push("senha");
  }

  if (mudancas.length > 0) {
    await prisma.usuario.update({ where: { id: existente.id }, data: dados });
    console.log(`Conta do síndico atualizada a partir do .env (${mudancas.join(", ")}).`);
  }
}
