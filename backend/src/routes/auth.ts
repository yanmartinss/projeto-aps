import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../db.js";
import { autenticar, usuarioDaRequisicao } from "../auth/middleware.js";
import { gastarTempoDeVerificacao, hashSenha, verificarSenha } from "../auth/senha.js";
import { assinarToken, lerTokenRedefinicao, marcaDaSenha } from "../auth/token.js";
import { ErroHttp } from "../erros.js";
import { cadastroMoradorSchema, esqueciSenhaSchema, loginSchema, redefinirSenhaSchema } from "../schemas.js";

export const authRouter = Router();

// Limita tentativas por IP para dificultar adivinhação de senha e criação de contas em massa.
const limitar = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new ErroHttp(429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.")),
});

function publico(u: { id: number; nome: string; email: string; perfil: string; apartamento: string | null }) {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, apartamento: u.apartamento };
}

/** Cadastro aberto só para morador. Síndico e funcionário nunca se cadastram sozinhos. */
authRouter.post("/cadastro", limitar, async (req, res) => {
  const d = cadastroMoradorSchema.parse(req.body);
  if (await prisma.usuario.findUnique({ where: { email: d.email } })) {
    throw new ErroHttp(409, "Já existe uma conta com esse e-mail. Tente entrar.");
  }
  const u = await prisma.usuario.create({
    data: { nome: d.nome, email: d.email, apartamento: d.apartamento, perfil: "morador", senhaHash: await hashSenha(d.senha) },
  });
  res.status(201).json({ token: await assinarToken(u.id), usuario: publico(u) });
});

authRouter.post("/login", limitar, async (req, res) => {
  const d = loginSchema.parse(req.body);
  const u = await prisma.usuario.findUnique({ where: { email: d.email } });

  if (!u) {
    await gastarTempoDeVerificacao(d.senha);
    throw new ErroHttp(401, "E-mail ou senha incorretos.");
  }
  if (!(await verificarSenha(d.senha, u.senhaHash))) throw new ErroHttp(401, "E-mail ou senha incorretos.");
  if (!u.ativo) throw new ErroHttp(403, "Essa conta foi desativada. Fale com o síndico.");

  res.json({ token: await assinarToken(u.id), usuario: publico(u) });
});

/**
 * "Esqueci minha senha". Não há envio de e-mail neste projeto: o pedido aparece para o síndico,
 * que gera um link e entrega à pessoa. A resposta é sempre a mesma, exista a conta ou não,
 * para ninguém descobrir quais e-mails estão cadastrados.
 */
authRouter.post("/esqueci-senha", limitar, async (req, res) => {
  const d = esqueciSenhaSchema.parse(req.body);
  await prisma.usuario.updateMany({
    where: { email: d.email, ativo: true, perfil: { not: "sindico" } },
    data: { senhaSolicitadaEm: new Date() },
  });
  res.status(202).json({ mensagem: "Pedido enviado. O síndico vai gerar um link para você criar uma nova senha." });
});

authRouter.post("/redefinir-senha", limitar, async (req, res) => {
  const d = redefinirSenhaSchema.parse(req.body);
  const lido = await lerTokenRedefinicao(d.token);
  const u = lido ? await prisma.usuario.findUnique({ where: { id: lido.id } }) : null;
  if (!lido || !u || !u.ativo || u.perfil === "sindico" || marcaDaSenha(u.senhaHash) !== lido.marca) {
    throw new ErroHttp(400, "Esse link não vale mais. Peça um novo ao síndico.");
  }
  await prisma.usuario.update({ where: { id: u.id }, data: { senhaHash: await hashSenha(d.senha), senhaSolicitadaEm: null } });
  res.json({ mensagem: "Senha alterada. Já pode entrar." });
});

/** Quem sou eu: o front usa para validar o token guardado quando a página abre. */
authRouter.get("/eu", autenticar, (req, res) => {
  res.json({ usuario: publico(usuarioDaRequisicao(req)) });
});
