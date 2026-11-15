import { postJson } from "./http.js";
import type { ProvedorLLM } from "./tipos.js";

/** Mantém o modelo carregado na memória entre pedidos (o padrão do Ollama descarrega após 5 min). */
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE ?? "30m";

/** Carrega o modelo em segundo plano ao iniciar o servidor, para o primeiro uso do fallback não esperar a carga. */
export async function aquecerOllama(): Promise<void> {
  const url = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const modelo = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
  try {
    await postJson(`${url}/api/generate`, { model: modelo, prompt: "", keep_alive: KEEP_ALIVE }, { timeoutMs: 180000 });
    console.log(`Ollama aquecido (${modelo}).`);
  } catch {
    console.log("Ollama indisponível no aquecimento; o fallback só funcionará quando ele estiver no ar.");
  }
}

export function criarOllama(): ProvedorLLM {
  const url = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const modelo = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 120000);

  async function chamar(sistema: string, usuario: string, format?: object) {
    const dados = await postJson(
      `${url}/api/chat`,
      {
        model: modelo,
        stream: false,
        keep_alive: KEEP_ALIVE,
        ...(format ? { format } : {}),
        options: { temperature: 0 },
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: usuario },
        ],
      },
      { timeoutMs },
    );
    const texto = dados?.message?.content;
    if (!texto) throw new Error("Ollama devolveu resposta vazia");
    return texto as string;
  }

  return {
    nome: `ollama:${modelo}`,
    async gerarJson(sistema, usuario, jsonSchema) {
      return JSON.parse(await chamar(sistema, usuario, jsonSchema));
    },
    gerarTexto: (sistema, usuario) => chamar(sistema, usuario),
  };
}
