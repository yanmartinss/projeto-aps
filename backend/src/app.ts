import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ocorrenciasRouter } from "./routes/ocorrencias.js";
import { resumoTurnoRouter } from "./routes/resumoTurno.js";

export const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/saude", (_req, res) => res.json({ ok: true }));
app.use("/ocorrencias", ocorrenciasRouter);
app.use("/resumo-turno", resumoTurnoRouter);

const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: err.issues });
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno" });
};
app.use(tratarErros);
