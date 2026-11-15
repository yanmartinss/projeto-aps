import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../db.js";
import { ErroHttp } from "../erros.js";
import { lerToken } from "./token.js";

export type PerfilUsuario = "morador" | "funcionario" | "sindico";

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  apartamento: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

/** Exige "Authorization: Bearer <token>" válido. O usuário é relido do banco a cada pedido: conta desativada perde o acesso na hora. */
export const autenticar: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const cabecalho = req.headers.authorization ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  const id = token ? await lerToken(token) : null;
  if (!id) {
    if (!token) console.warn(`401 em ${req.method} ${req.originalUrl.split("?")[0]}: requisição sem token`);
    throw new ErroHttp(401, "Faça login para continuar.");
  }

  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u || !u.ativo) {
    console.warn(`401 em ${req.method} ${req.originalUrl.split("?")[0]}: conta ${u ? "desativada" : "inexistente"} (id ${id})`);
    throw new ErroHttp(401, "Sua sessão não é mais válida. Entre de novo.");
  }

  req.usuario = {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil as PerfilUsuario,
    apartamento: u.apartamento,
  };
  next();
};

/** A checagem de permissão acontece no servidor, não só na tela. */
export function exigirPerfil(...perfis: PerfilUsuario[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      throw new ErroHttp(403, "Você não tem permissão para isso.");
    }
    next();
  };
}

export function usuarioDaRequisicao(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw new ErroHttp(401, "Faça login para continuar.");
  return req.usuario;
}
