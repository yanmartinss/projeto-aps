import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const DURACAO = process.env.JWT_DURACAO ?? "8h";

function segredo(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja backend/.env.example.");
  }
  return new TextEncoder().encode(s);
}

/** Falha cedo, na inicialização do servidor, se o segredo não estiver configurado. */
export function exigirSegredoConfigurado(): void {
  segredo();
}

export async function assinarToken(usuarioId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(usuarioId))
    .setIssuedAt()
    .setExpirationTime(DURACAO)
    .sign(segredo());
}

const DURACAO_REDEFINICAO = "2h";

/** Impressão digital da senha atual: o link deixa de valer assim que a senha muda (uso único). */
export function marcaDaSenha(senhaHash: string): string {
  return createHash("sha256").update(senhaHash).digest("hex").slice(0, 16);
}

/** Link de redefinição: vale 2 horas e só enquanto a senha for a mesma de quando foi gerado. */
export async function assinarTokenRedefinicao(usuarioId: number, senhaHash: string): Promise<string> {
  return new SignJWT({ uso: "redefinir", m: marcaDaSenha(senhaHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(usuarioId))
    .setIssuedAt()
    .setExpirationTime(DURACAO_REDEFINICAO)
    .sign(segredo());
}

/** Devolve { id, marca } se for um token de redefinição válido; senão, null. */
export async function lerTokenRedefinicao(token: string): Promise<{ id: number; marca: string } | null> {
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (payload.uso !== "redefinir" || typeof payload.m !== "string" || !Number.isInteger(id) || id <= 0) return null;
    return { id, marca: payload.m };
  } catch {
    return null;
  }
}

/** Devolve o id do usuário se o token for válido e não tiver expirado; senão, null. */
export async function lerToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    if (payload.uso !== undefined) return null; // link de redefinição não serve como sessão
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (erro) {
    // Só o código do erro (expirou, assinatura inválida...), nunca o token.
    console.warn(`Token recusado: ${(erro as { code?: string }).code ?? "erro desconhecido"}`);
    return null;
  }
}
