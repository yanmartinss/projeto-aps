import { Router } from "express";
import { exigirPerfil } from "../auth/middleware.js";
import { numerosEListas, resumoDoDia } from "../dashboard/servico.js";

export const dashboardRouter = Router();

dashboardRouter.use(exigirPerfil("sindico"));

/** Números e listas, sem IA: carrega na hora. */
dashboardRouter.get("/", async (_req, res) => {
  res.json(await numerosEListas());
});

/** Texto da IA em cima dos números (pode demorar): o front busca separado e mostra quando chegar. */
dashboardRouter.get("/resumo", async (req, res) => {
  res.json(await resumoDoDia(req.query.atualizar === "1"));
});
