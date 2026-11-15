/**
 * Limpeza de estilo, feita em código (não depende de o modelo obedecer ao prompt).
 * Tira os sinais mais comuns de texto de IA: travessões, negrito, aspas curvas, abertura e fecho de chatbot.
 * Não mexe em números, nomes nem no sentido da frase.
 */
export function limparEstilo(texto: string): string {
  let t = texto;

  // negrito e itálico em markdown, títulos "# ..."
  t = t.replace(/\*\*(.+?)\*\*/gs, "$1").replace(/__(.+?)__/gs, "$1").replace(/^#{1,6}\s+/gm, "");

  // aspas e apóstrofos curvos viram retos
  t = t.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'");

  // travessão e meia-risca viram vírgula (ou ponto, se o que vem depois começa uma frase nova)
  t = t.replace(/\s*[—–]\s*/g, ", ").replace(/\s+--\s+/g, ", ");

  // abertura de chatbot na primeira linha: "Claro!", "Com certeza!", "Certo,"
  t = t.replace(/^\s*(claro|certo|com certeza|ótimo|perfeito|olá)[!,.:]\s+/i, "");

  // fecho de chatbot na última frase
  t = t.replace(/\s*(espero (que )?(isso )?(te )?ajude|fico à disposição|qualquer dúvida,? (é só )?(me )?(avisar|chamar|perguntar)|se precisar de (mais )?(algo|alguma coisa),? (é só )?(me )?(avisar|falar|chamar))[^.!?\n]*[.!?]?\s*$/i, "");

  return t.replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim();
}
