import { app } from "./app.js";
import { garantirSindico } from "./auth/seed.js";
import { exigirSegredoConfigurado } from "./auth/token.js";
import { aquecerOllama } from "./ia/ollama.js";
import { garantirAreas } from "./reservas/servico.js";

const porta = Number(process.env.PORT ?? 3333);

exigirSegredoConfigurado(); // não sobe sem JWT_SECRET
await garantirAreas();
await garantirSindico();
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));

// Se o Ollama é o provedor principal ou o de reserva, já deixa o modelo carregado (em segundo plano).
if ([process.env.AI_PROVIDER, process.env.AI_FALLBACK].some((p) => p?.toLowerCase() === "ollama")) {
  void aquecerOllama();
}
