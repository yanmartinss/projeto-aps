import { postJson } from "./http.js";
import type { ProvedorLLM } from "./tipos.js";

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
