import { ErroHttp } from "../erros.js";
import { postJson } from "./http.js";

export type TipoTexto = "documento" | "pergunta";

/** Gera vetores normalizados. Vetores de modelos diferentes não se comparam: o índice guarda qual modelo usou. */
export interface Embedder {
  /** Identificador gravado no índice, ex.: "gemini:gemini-embedding-001:768". */
  modelo: string;
  embed(textos: string[], tipo: TipoTexto): Promise<number[][]>;
}

function normalizar(v: number[]): number[] {
  const norma = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / norma);
}

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Uma nova tentativa em falhas passageiras (cota por minuto, 5xx). */
async function comRetentativa<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : "";
    if (/respondeu (429|5\d\d)|timeout|aborted/i.test(msg)) {
      await esperar(2000);
      return fn();
    }
    throw erro;
  }
}

function criarGeminiEmbedder(): Embedder {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroHttp(503, "Chave do Gemini não configurada (GEMINI_API_KEY) para gerar embeddings.");
  const modelo = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
  const dim = Number(process.env.EMBEDDING_DIM ?? 768);
  const timeoutMs = Number(process.env.EMBEDDING_TIMEOUT_MS ?? 30000);
  const base = "https://generativelanguage.googleapis.com/v1beta/models";

  return {
    modelo: `gemini:${modelo}:${dim}`,
    async embed(textos, tipo) {
      const saida: number[][] = [];
      for (const lote of emLotes(textos, 50)) {
        const dados = await comRetentativa(() =>
          postJson(
            `${base}/${modelo}:batchEmbedContents`,
            {
              requests: lote.map((texto) => ({
                model: `models/${modelo}`,
                content: { parts: [{ text: texto }] },
                taskType: tipo === "documento" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
                outputDimensionality: dim,
              })),
            },
            { headers: { "x-goog-api-key": chave }, timeoutMs },
          ),
        );
        const vetores = dados?.embeddings as { values: number[] }[] | undefined;
        if (!vetores || vetores.length !== lote.length) throw new Error("Gemini devolveu embeddings incompletos");
        saida.push(...vetores.map((v) => normalizar(v.values)));
      }
      return saida;
    },
  };
}

function criarOllamaEmbedder(): Embedder {
  const url = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const modelo = process.env.OLLAMA_EMBEDDING_MODEL ?? "bge-m3";
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 120000);

  return {
    modelo: `ollama:${modelo}`,
    async embed(textos) {
      const saida: number[][] = [];
      for (const lote of emLotes(textos, 16)) {
        const dados = await postJson(`${url}/api/embed`, { model: modelo, input: lote }, { timeoutMs });
        const vetores = dados?.embeddings as number[][] | undefined;
        if (!vetores || vetores.length !== lote.length) throw new Error("Ollama devolveu embeddings incompletos");
        saida.push(...vetores.map(normalizar));
      }
      return saida;
    },
  };
}

function criarPorNome(escolhido: string): Embedder {
  if (escolhido === "gemini") return criarGeminiEmbedder();
  if (escolhido === "ollama") return criarOllamaEmbedder();
  throw new ErroHttp(500, `Provedor de embeddings inválido: "${escolhido}" (use gemini ou ollama)`);
}

/** EMBEDDING_PROVIDER = "gemini" (padrão) ou "ollama". */
export function criarEmbedder(): Embedder {
  return criarPorNome((process.env.EMBEDDING_PROVIDER ?? "gemini").toLowerCase());
}

/**
 * Embedder de reserva, usado só quando o principal falha (ex.: cota grátis do Gemini acabou).
 * EMBEDDING_FALLBACK = "ollama" (padrão quando o principal é o Gemini), "gemini" ou "nenhum".
 */
export function criarEmbedderReserva(): Embedder | null {
  const principal = (process.env.EMBEDDING_PROVIDER ?? "gemini").toLowerCase();
  const reserva = (process.env.EMBEDDING_FALLBACK ?? (principal === "gemini" ? "ollama" : "nenhum")).toLowerCase();
  if (reserva === "nenhum" || reserva === principal) return null;
  try {
    return criarPorNome(reserva);
  } catch {
    return null;
  }
}

/** Modelos que este servidor sabe usar agora (principal + reserva). */
export function modelosUtilizaveis(): string[] {
  const lista: string[] = [];
  for (const criar of [criarEmbedder, criarEmbedderReserva]) {
    try {
      const e = criar();
      if (e) lista.push(e.modelo);
    } catch {
      /* provedor sem configuração (ex.: sem chave) */
    }
  }
  return lista;
}

/**
 * Vetores só se comparam com vetores do mesmo modelo: a pergunta precisa usar o modelo com que o
 * documento foi indexado, seja ele o principal ou o de reserva.
 */
export function criarEmbedderDoModelo(modelo: string): Embedder | null {
  for (const criar of [criarEmbedder, criarEmbedderReserva]) {
    try {
      const e = criar();
      if (e && e.modelo === modelo) return e;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

/** Gera vetores com o embedder principal; se falhar, tenta o de reserva. Devolve também qual modelo foi usado. */
export async function embedComReserva(textos: string[], tipo: TipoTexto): Promise<{ vetores: number[][]; modelo: string }> {
  const principal = criarEmbedder();
  try {
    return { vetores: await principal.embed(textos, tipo), modelo: principal.modelo };
  } catch (erroPrincipal) {
    const reserva = criarEmbedderReserva();
    if (!reserva) throw erroPrincipal;
    console.warn(`Embeddings: ${principal.modelo} falhou, usando ${reserva.modelo}.`);
    try {
      return { vetores: await reserva.embed(textos, tipo), modelo: reserva.modelo };
    } catch (erroReserva) {
      console.error("Embeddings: a reserva também falhou:", erroReserva instanceof Error ? erroReserva.message.slice(0, 200) : erroReserva);
      throw erroPrincipal; // a mensagem útil ao usuário é a do principal (ex.: limite do Gemini)
    }
  }
}
