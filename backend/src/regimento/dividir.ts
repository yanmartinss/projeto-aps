export interface TrechoBruto {
  /** "Art. 18" quando o trecho começa num artigo; null em preâmbulo ou divisão por tamanho. */
  artigo: string | null;
  texto: string;
}

const TAMANHO_MAX = 1200;
const MARCADOR = /(?:^|\n)[ \t]*(Art(?:igo)?\.?[ \t]*(\d+)[ \t]*[º°o]?)(?=[ \t.\-–:)]|$)/gi;

/** Janelas de tamanho fixo com sobreposição, quebrando de preferência em fim de frase ou de linha. */
export function janelas(texto: string, tamanho = 900, sobreposicao = 150): string[] {
  const t = texto.trim();
  const saida: string[] = [];
  let inicio = 0;
  while (inicio < t.length) {
    let fim = Math.min(inicio + tamanho, t.length);
    if (fim < t.length) {
      const janela = t.slice(inicio, fim);
      const corte = Math.max(janela.lastIndexOf("\n"), janela.lastIndexOf(". "));
      if (corte > tamanho * 0.5) fim = inicio + corte + 1;
    }
    const pedaco = t.slice(inicio, fim).trim();
    if (pedaco.length >= 30) saida.push(pedaco);
    if (fim >= t.length) break;
    inicio = Math.max(fim - sobreposicao, inicio + 1);
  }
  return saida;
}

/** Remove títulos de capítulo/seção que ficam colados no fim do artigo anterior (linhas sem letra minúscula). */
function tirarTitulosDoFim(texto: string): string {
  const linhas = texto.split("\n");
  while (linhas.length > 1 && !/[a-zà-ú]/.test(linhas[linhas.length - 1])) linhas.pop();
  return linhas.join("\n").trim();
}

export function dividirRegimento(bruto: string): TrechoBruto[] {
  const t = bruto
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const marcas = [...t.matchAll(MARCADOR)].map((m) => ({
    posicao: (m.index ?? 0) + m[0].indexOf(m[1]),
    artigo: `Art. ${m[2]}`,
  }));

  if (marcas.length < 2) return janelas(t).map((texto) => ({ artigo: null, texto }));

  const saida: TrechoBruto[] = [];
  const preambulo = t.slice(0, marcas[0].posicao).trim();
  if (preambulo.length >= 200) for (const texto of janelas(preambulo)) saida.push({ artigo: null, texto });

  marcas.forEach((m, i) => {
    const fim = i + 1 < marcas.length ? marcas[i + 1].posicao : t.length;
    const corpo = tirarTitulosDoFim(t.slice(m.posicao, fim));
    if (corpo.length < 30) return;
    const partes = corpo.length > TAMANHO_MAX ? janelas(corpo, 1000, 120) : [corpo];
    for (const texto of partes) saida.push({ artigo: m.artigo, texto });
  });

  return saida;
}
