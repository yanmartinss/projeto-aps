import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ErroHttp } from "./erros.js";
import { autenticar } from "./auth/middleware.js";
import { authRouter } from "./routes/auth.js";
import { buscaRouter } from "./routes/busca.js";
import { comunicadosRouter } from "./routes/comunicados.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { notificacoesRouter } from "./routes/notificacoes.js";
import { tarefasRouter } from "./routes/tarefas.js";
import { ocorrenciasRouter } from "./routes/ocorrencias.js";
import { regimentoRouter } from "./routes/regimento.js";
import { reservasRouter } from "./routes/reservas.js";
import { resumoTurnoRouter } from "./routes/resumoTurno.js";
import { usuariosRouter } from "./routes/usuarios.js";

export const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/saude", (_req, res) => res.json({ ok: true }));
// Público: saúde e login/cadastro. Todo o resto exige token; as permissões por perfil ficam em cada rota.
app.use("/auth", authRouter);
app.use("/ocorrencias", autenticar, ocorrenciasRouter);
app.use("/resumo-turno", autenticar, resumoTurnoRouter);
app.use("/regimento", autenticar, regimentoRouter);
app.use("/reservas", autenticar, reservasRouter);
app.use("/usuarios", autenticar, usuariosRouter);
app.use("/dashboard", autenticar, dashboardRouter);
app.use("/comunicados", autenticar, comunicadosRouter);
app.use("/busca", autenticar, buscaRouter);
app.use("/tarefas", autenticar, tarefasRouter);
app.use("/notificacoes", autenticar, notificacoesRouter);

const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: err.issues });
  }
  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ erro: err.message, ...err.extras });
  }
  // Corpo grande demais (express.raw/json lançam erros com status próprio).
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ erro: err.status === 413 ? "Arquivo grande demais (máximo 10 MB)." : "Requisição inválida" });
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno" });
};
app.use(tratarErros);
