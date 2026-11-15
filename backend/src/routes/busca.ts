import { Router } from "express";
import { exigirPerfil } from "../auth/middleware.js";
import { buscar } from "../busca/servico.js";
import { buscaSchema } from "../schemas.js";

export const buscaRouter = Router();

// Só o síndico pesquisa. A IA devolve filtros; quem consulta o banco é o código.
buscaRouter.post("/", exigirPerfil("sindico"), async (req, res) => {
  const { pergunta } = buscaSchema.parse(req.body);
  res.json(await buscar(pergunta));
});
