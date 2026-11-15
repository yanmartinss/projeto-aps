import { extractText, getDocumentProxy } from "unpdf";
import { prisma } from "../db.js";
import { ErroHttp } from "../erros.js";
import { criarEmbedderDoModelo, embedComReserva } from "../ia/embeddings.js";
import { obterProvedor } from "../ia/provedor.js";
import { limparEstilo } from "../ia/estilo.js";
import { SCHEMA_RESPOSTA_REGIMENTO, SISTEMA_REGIMENTO } from "../ia/prompts.js";
import { respostaRegimentoSchema } from "../schemas.js";
import { dividirRegimento } from "./dividir.js";
import { deBytes, paraBytes, similaridade } from "./vetores.js";

const TOP_K = Number(process.env.RAG_TOP_K ?? 4);
/** Abaixo disso o trecho mais parecido é considerado irrelevante e a IA nem é chamada. Calibrar com o regimento de teste. */
const LIMIAR = Number(process.env.RAG_LIMIAR ?? 0.55);
const MAX_TRECHO_NO_PROMPT = 1200;

export const MSG_NAO_ENCONTRADO =
  "Não encontrei isso no regimento. Vale perguntar direto ao síndico.";

export async function lerPdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    throw new ErroHttp(422, "Não consegui ler esse PDF. Confira se o arquivo não está protegido ou corrompido.");
  }
}

function embeddingFalhou(erro: unknown): never {
  if (erro instanceof ErroHttp) throw erro;
  const msg = erro instanceof Error ? erro.message : String(erro);
  console.error("Falha ao gerar embeddings:", msg.slice(0, 200));
  if (/respondeu 429/.test(msg)) {
    throw new ErroHttp(
      503,
      "O limite gratuito do Gemini para busca foi atingido. Espere alguns minutos e envie de novo (o regimento anterior continua valendo), ou use um PDF menor.",
    );
  }
  throw new ErroHttp(502, "O serviço de busca do regimento está indisponível agora. Tente de novo em instantes.");
}

/** Lê, divide e indexa o PDF. Só mexe no banco depois que todos os embeddings foram gerados. */
export async function indexarDocumento(nome: string, buffer: Buffer) {
  const texto = await lerPdf(buffer);
  const trechos = dividirRegimento(texto);
  if (texto.replace(/\s/g, "").length < 200 || trechos.length === 0) {
    throw new ErroHttp(422, "Esse PDF não tem texto selecionável (talvez seja um documento escaneado). Envie uma versão com texto.");
  }

  let vetores: number[][];
  let modelo: string;
  try {
    ({ vetores, modelo } = await embedComReserva(trechos.map((t) => t.texto), "documento"));
  } catch (erro) {
    embeddingFalhou(erro);
  }

  return prisma.$transaction(async (tx) => {
    await tx.trechoRegimento.deleteMany();
    await tx.documentoRegimento.deleteMany();
    const doc = await tx.documentoRegimento.create({ data: { nome, modeloEmbedding: modelo } });
    await tx.trechoRegimento.createMany({
      data: trechos.map((t, i) => ({
        documentoId: doc.id,
        ordem: i,
        artigo: t.artigo,
        texto: t.texto,
        embedding: paraBytes(vetores[i]),
      })),
    });
    return { id: doc.id, nome: doc.nome, nTrechos: trechos.length, modeloEmbedding: doc.modeloEmbedding };
    // O padrão do Prisma (5 s) estoura em regimentos grandes ou com a CPU ocupada pelo Ollama.
  }, { timeout: 60_000, maxWait: 15_000 });
}

/** Refaz os vetores do documento com o modelo de embedding configurado agora. */
export async function reindexarDocumento(id: number) {
  const doc = await prisma.documentoRegimento.findUnique({
    where: { id },
    include: { trechos: { orderBy: { ordem: "asc" } } },
  });
  if (!doc) throw new ErroHttp(404, "Documento não encontrado.");

  let vetores: number[][];
  let modelo: string;
  try {
    ({ vetores, modelo } = await embedComReserva(doc.trechos.map((t) => t.texto), "documento"));
  } catch (erro) {
    embeddingFalhou(erro);
  }

  await prisma.$transaction([
    ...doc.trechos.map((t, i) =>
      prisma.trechoRegimento.update({ where: { id: t.id }, data: { embedding: paraBytes(vetores[i]) } }),
    ),
    prisma.documentoRegimento.update({ where: { id }, data: { modeloEmbedding: modelo } }),
  ]);
  return { id, nTrechos: doc.trechos.length, modeloEmbedding: modelo };
}

export interface FonteResposta {
  id: string;
  artigo: string | null;
  texto: string;
  similaridade: number;
}

export interface RespostaRegimento {
  encontrou: boolean;
  resposta: string;
  fontes: FonteResposta[];
}

const naoEncontrado = (): RespostaRegimento => ({ encontrou: false, resposta: MSG_NAO_ENCONTRADO, fontes: [] });

export async function perguntar(pergunta: string): Promise<RespostaRegimento> {
  const doc = await prisma.documentoRegimento.findFirst({
    orderBy: { criadoEm: "desc" },
    include: { trechos: { orderBy: { ordem: "asc" } } },
  });
  if (!doc) throw new ErroHttp(409, "Ainda não há regimento carregado. Peça ao síndico para enviar o PDF.");

  // A pergunta usa o mesmo modelo com que o regimento foi indexado (principal ou reserva).
  const embedder = criarEmbedderDoModelo(doc.modeloEmbedding);
  if (!embedder) {
    throw new ErroHttp(409, "O índice do regimento foi criado com outro modelo de busca. Peça ao síndico para reindexar.");
  }

  let vetorPergunta: number[];
  try {
    [vetorPergunta] = await embedder.embed([pergunta], "pergunta");
  } catch (erro) {
    embeddingFalhou(erro);
  }

  const ranking = doc.trechos
    .filter((t) => t.embedding)
    .map((t) => ({ trecho: t, score: similaridade(vetorPergunta, deBytes(t.embedding!)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  if (process.env.RAG_DEBUG) {
    console.log(
      `[rag] "${pergunta}" -> ${ranking.map((r) => `${r.trecho.artigo ?? "-"}:${r.score.toFixed(3)}`).join(" ")} (limiar ${LIMIAR})`,
    );
  }
  if (ranking.length === 0 || ranking[0].score < LIMIAR) return naoEncontrado();

  const candidatos = ranking.map((r, i) => ({ id: `T${i + 1}`, ...r }));
  const contexto = candidatos
    .map((c) => `[${c.id}] ${c.trecho.artigo ?? "Trecho"}\n${c.trecho.texto.slice(0, MAX_TRECHO_NO_PROMPT)}`)
    .join("\n\n");

  let bruto: unknown;
  try {
    bruto = await obterProvedor().gerarJson(
      SISTEMA_REGIMENTO,
      `Trechos do regimento:\n\n${contexto}\n\nPergunta do morador: ${pergunta}`,
      SCHEMA_RESPOSTA_REGIMENTO(candidatos.map((c) => c.id)),
    );
  } catch (erro) {
    console.error("Falha ao responder pelo regimento:", erro instanceof Error ? erro.message : erro);
    throw new ErroHttp(502, "A IA não conseguiu responder agora. Tente de novo em instantes.");
  }

  const parsed = respostaRegimentoSchema.safeParse(bruto);
  if (!parsed.success || !parsed.data.encontrou) return naoEncontrado();

  // Só vale citação de trecho que realmente foi enviado ao modelo.
  const ids = new Set(candidatos.map((c) => c.id));
  const citados = [...new Set(parsed.data.fontes)].filter((id) => ids.has(id));
  if (citados.length === 0 || parsed.data.resposta.trim() === "") return naoEncontrado();

  return {
    encontrou: true,
    resposta: limparEstilo(parsed.data.resposta),
    fontes: citados.map((id) => {
      const c = candidatos.find((x) => x.id === id)!;
      return { id, artigo: c.trecho.artigo, texto: c.trecho.texto, similaridade: Number(c.score.toFixed(3)) };
    }),
  };
}
