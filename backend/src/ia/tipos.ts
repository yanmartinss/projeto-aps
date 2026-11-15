/** Contrato mínimo que cada provedor (Gemini, Ollama) implementa. */
export interface ProvedorLLM {
  nome: string;
  /** Gera uma resposta JSON obedecendo ao JSON Schema informado. Devolve o objeto já parseado (ainda não validado). */
  gerarJson(sistema: string, usuario: string, jsonSchema: object): Promise<unknown>;
  /** Gera texto livre. */
  gerarTexto(sistema: string, usuario: string): Promise<string>;
}
