import { criarGemini } from "./gemini.js";
import { criarOllama } from "./ollama.js";
import type { ProvedorLLM } from "./tipos.js";

const fabricas: Record<string, () => ProvedorLLM> = {
  gemini: criarGemini,
  ollama: criarOllama,
};

function criar(nome: string): ProvedorLLM {
  const fabrica = fabricas[nome.toLowerCase()];
  if (!fabrica) throw new Error(`Provedor de IA inválido: "${nome}" (use gemini ou ollama)`);
  return fabrica();
}

/** Tenta o provedor principal; se ele falhar (rede, cota, timeout, 5xx), tenta o de reserva. */
function comFallback(principal: () => ProvedorLLM, reserva: () => ProvedorLLM): ProvedorLLM {
  async function executar<T>(operacao: (p: ProvedorLLM) => Promise<T>): Promise<T> {
    try {
      return await operacao(principal());
    } catch (erroPrincipal) {
      const motivo = erroPrincipal instanceof Error ? erroPrincipal.message.split("\n")[0] : erroPrincipal;
      console.warn(`IA principal falhou (${motivo}). Usando provedor de reserva.`);
      return operacao(reserva());
    }
  }
  return {
    nome: "principal+reserva",
    gerarJson: (s, u, schema) => executar((p) => p.gerarJson(s, u, schema)),
    gerarTexto: (s, u) => executar((p) => p.gerarTexto(s, u)),
  };
}

let cache: ProvedorLLM | undefined;

/**
 * AI_PROVIDER = provedor principal ("gemini" | "ollama").
 * AI_FALLBACK = provedor de reserva opcional (ex.: "ollama").
 * Os provedores são criados sob demanda, então um .env incompleto (ex.: sem chave do Gemini)
 * também cai no provedor de reserva em vez de derrubar a requisição.
 */
export function obterProvedor(): ProvedorLLM {
  if (cache) return cache;
  const principal = process.env.AI_PROVIDER ?? "gemini";
  const reserva = process.env.AI_FALLBACK?.trim();
  cache =
    reserva && reserva.toLowerCase() !== principal.toLowerCase()
      ? comFallback(() => criar(principal), () => criar(reserva))
      : criar(principal);
  return cache;
}
