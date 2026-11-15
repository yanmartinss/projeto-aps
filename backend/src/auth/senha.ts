import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (senha: string, salt: Buffer, tamanho: number) => Promise<Buffer>;
const TAMANHO = 64;

/** scrypt (já vem no Node): "scrypt:<sal em hex>:<hash em hex>". Cada senha tem o seu sal. */
export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, TAMANHO);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}

export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const [algoritmo, salHex, hashHex] = armazenado.split(":");
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = await scrypt(senha, Buffer.from(salHex, "hex"), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

let hashFalso: Promise<string> | undefined;

/** Gasta o mesmo tempo de uma verificação real quando o e-mail não existe, para o login não revelar quais e-mails têm conta. */
export async function gastarTempoDeVerificacao(senha: string): Promise<void> {
  hashFalso ??= hashSenha("senha-falsa-para-igualar-tempo");
  await verificarSenha(senha, await hashFalso);
}
