import { postJson } from "./http.js";
import type { ProvedorLLM } from "./tipos.js";

const base = "https://generativelanguage.googleapis.com/v1beta/models";

export function criarGemini(): ProvedorLLM {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("GEMINI_API_KEY não configurada no .env");
  const modelo = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? 15000);

  async function chamar(sistema: string, usuario: string, generationConfig: object) {
    const dados = await postJson(
      `${base}/${modelo}:generateContent`,
      {
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: [{ text: usuario }] }],
        generationConfig: { temperature: 0.2, ...generationConfig },
      },
      { headers: { "x-goog-api-key": chave! }, timeoutMs },
    );
    const texto = dados?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("");
    if (!texto) throw new Error("Gemini devolveu resposta vazia");
    return texto as string;
  }

  return {
    nome: `gemini:${modelo}`,
    async gerarJson(sistema, usuario, jsonSchema) {
      const texto = await chamar(sistema, usuario, {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      });
      return JSON.parse(texto);
    },
    gerarTexto: (sistema, usuario) => chamar(sistema, usuario, {}),
  };
}
