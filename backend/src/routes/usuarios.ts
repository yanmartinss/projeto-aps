import { Router } from "express";
import { prisma } from "../db.js";
import { exigirPerfil, usuarioDaRequisicao } from "../auth/middleware.js";
import { hashSenha } from "../auth/senha.js";
import { assinarTokenRedefinicao } from "../auth/token.js";
import { ErroHttp } from "../erros.js";
import { atualizarUsuarioSchema, criarFuncionarioSchema, idParamSchema } from "../schemas.js";

export const usuariosRouter = Router();

// Tudo aqui é do síndico.
usuariosRouter.use(exigirPerfil("sindico"));

const campos = { id: true, nome: true, email: true, perfil: true, apartamento: true, ativo: true, criadoEm: true, senhaSolicitadaEm: true } as const;

/** Gera o link de redefinição (2 h, uso único) para o síndico entregar à pessoa. */
usuariosRouter.post("/:id/link-redefinicao", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
  if (alvo.perfil === "sindico") throw new ErroHttp(403, "A senha do síndico é definida no arquivo .env do servidor.");
  if (!alvo.ativo) throw new ErroHttp(409, "Essa conta está desativada. Reative antes de gerar o link.");
  res.json({ token: await assinarTokenRedefinicao(alvo.id, alvo.senhaHash) });
});

/** Funcionários ativos, para o síndico delegar ocorrências. */
usuariosRouter.get("/funcionarios", async (_req, res) => {
  res.json(await prisma.usuario.findMany({ where: { perfil: "funcionario", ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }));
});

usuariosRouter.get("/", async (_req, res) => {
  res.json(await prisma.usuario.findMany({ select: campos, orderBy: [{ perfil: "asc" }, { nome: "asc" }] }));
});

/** O síndico cria contas de funcionário com uma senha provisória que ele repassa. */
usuariosRouter.post("/", async (req, res) => {
  const d = criarFuncionarioSchema.parse(req.body);
  if (await prisma.usuario.findUnique({ where: { email: d.email } })) {
    throw new ErroHttp(409, "Já existe uma conta com esse e-mail.");
  }
  const u = await prisma.usuario.create({
    data: { nome: d.nome, email: d.email, perfil: "funcionario", senhaHash: await hashSenha(d.senha) },
    select: campos,
  });
  res.status(201).json(u);
});

usuariosRouter.patch("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const d = atualizarUsuarioSchema.parse(req.body);
  const eu = usuarioDaRequisicao(req);

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) throw new ErroHttp(404, "Usuário não encontrado.");
  if (alvo.perfil === "sindico") throw new ErroHttp(403, "A conta do síndico não pode ser alterada por aqui.");
  if (alvo.id === eu.id) throw new ErroHttp(403, "Você não pode alterar a própria conta por aqui.");

  const atualizado = await prisma.usuario.update({
    where: { id },
    data: {
      ...(d.ativo !== undefined ? { ativo: d.ativo } : {}),
      ...(d.senha !== undefined ? { senhaHash: await hashSenha(d.senha), senhaSolicitadaEm: null } : {}),
    },
    select: campos,
  });
  res.json(atualizado);
});
