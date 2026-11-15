import { classificacaoSchema } from "../schemas.js";
import { obterProvedor } from "./provedor.js";
import { limparEstilo } from "./estilo.js";
import { SCHEMA_CLASSIFICACAO, SISTEMA_CLASSIFICAR, SISTEMA_RESUMO_TURNO } from "./prompts.js";

/** Classifica um relato. Lança erro se a IA falhar ou devolver algo fora do formato esperado. */
export async function classificar(texto: string) {
  const bruto = await obterProvedor().gerarJson(SISTEMA_CLASSIFICAR, `Relato:\n"""${texto}"""`, SCHEMA_CLASSIFICACAO);
  return classificacaoSchema.parse(bruto);
}

export type LinhaTurno = {
  criadaEm: Date;
  autorPerfil: string;
  texto: string;
  categoria: string | null;
  urgencia: string | null;
  status: string;
};

export async function resumirTurno(ocorrencias: LinhaTurno[]) {
  const linhas = ocorrencias
    .map(
      (o) =>
        `- [${o.criadaEm.toISOString()}] (${o.autorPerfil}, urgência ${o.urgencia ?? "não classificada"}, ${o.status}) ${o.texto}`,
    )
    .join("\n");
  return limparEstilo(await obterProvedor().gerarTexto(SISTEMA_RESUMO_TURNO, `Ocorrências do período:\n${linhas}`));
}
