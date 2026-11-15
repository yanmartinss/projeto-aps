import { z } from "zod";

export const CATEGORIAS = [
  "barulho",
  "vazamento_manutencao",
  "seguranca",
  "limpeza",
  "entrega_portaria",
  "outros",
] as const;
export const URGENCIAS = ["baixa", "media", "alta"] as const;
export const STATUS = ["aberta", "em_andamento", "resolvida"] as const;
export const PERFIS_AUTOR = ["morador", "funcionario"] as const;

export const criarOcorrenciaSchema = z.object({
  texto: z.string().trim().min(5, "Descreva a ocorrência (mín. 5 caracteres)").max(2000),
  autorPerfil: z.enum(PERFIS_AUTOR),
});

export const atualizarOcorrenciaSchema = z
  .object({
    categoria: z.enum(CATEGORIAS),
    urgencia: z.enum(URGENCIAS),
    resumo: z.string().trim().min(1).max(300),
    status: z.enum(STATUS),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Envie ao menos um campo");

export const listarQuerySchema = z.object({
  urgencia: z.enum(URGENCIAS).optional(),
  status: z.enum(STATUS).optional(),
  categoria: z.enum(CATEGORIAS).optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const classificacaoSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  urgencia: z.enum(URGENCIAS),
  resumo: z.string().trim().min(1).max(300),
});

export const resumoTurnoSchema = z
  .object({ inicio: z.coerce.date(), fim: z.coerce.date() })
  .refine((d) => d.inicio < d.fim, "inicio deve ser anterior a fim");
