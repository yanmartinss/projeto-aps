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
export const STATUS = ["aberta", "em_analise", "em_execucao", "resolvida", "cancelada"] as const;
/** Status que já não estão "em aberto" (não entram nas contagens de pendências). */
export const STATUS_ENCERRADOS = ["resolvida", "cancelada"];
export const PERFIS_AUTOR = ["morador", "funcionario"] as const;

export const criarOcorrenciaSchema = z.object({
  texto: z.string().trim().min(5, "Descreva a ocorrência (mín. 5 caracteres)").max(2000),
});

export const atualizarOcorrenciaSchema = z
  .object({
    categoria: z.enum(CATEGORIAS),
    urgencia: z.enum(URGENCIAS),
    resumo: z.string().trim().min(1).max(300),
    status: z.enum(STATUS),
    responsavelId: z.number().int().positive().nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Envie ao menos um campo");

export const cancelarOcorrenciaSchema = z.object({
  motivo: z.string().trim().min(3, "Diga em poucas palavras por que está cancelando").max(300),
});

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

export const perguntaRegimentoSchema = z.object({
  pergunta: z.string().trim().min(3, "Escreva sua pergunta").max(500),
});

export const respostaRegimentoSchema = z.object({
  encontrou: z.boolean(),
  resposta: z.string(),
  fontes: z.array(z.string()),
});

export const novoDocumentoQuerySchema = z.object({
  nome: z.string().trim().min(1).max(120).default("regimento.pdf"),
});

// ---------- reservas ----------
export const STATUS_RESERVA = ["pendente", "aprovada", "recusada", "cancelada"] as const;

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

// A reserva é do dia inteiro: o horário (abertura a fechamento da área) é montado no servidor.
export const validarReservaSchema = z.object({
  areaId: z.coerce.number().int().positive("Escolha a área"),
  data: dataSchema,
});

export const criarReservaSchema = validarReservaSchema.extend({
  textoOriginal: z.string().trim().max(500).optional(),
});

export const listarReservasQuerySchema = z.object({
  status: z.enum(STATUS_RESERVA).optional(),
});

export const acaoReservaSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("aprovar") }),
  z.object({ acao: z.literal("cancelar") }),
  z.object({ acao: z.literal("recusar"), motivo: z.string().trim().min(3, "Explique o motivo da recusa").max(300) }),
]);

// ---------- contas ----------
const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(120);
// 72 é o limite usual de senha (compatível com outros sistemas); o mínimo de 8 evita as mais óbvias.
const senhaSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72, "A senha pode ter no máximo 72 caracteres");

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, "Informe a senha").max(72),
});

export const cadastroMoradorSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  email: emailSchema,
  apartamento: z.string().trim().min(1, "Informe o apartamento").max(20),
  senha: senhaSchema,
});

export const esqueciSenhaSchema = z.object({ email: emailSchema });

export const redefinirSenhaSchema = z.object({
  token: z.string().min(20).max(1000),
  senha: senhaSchema,
});

export const criarFuncionarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(80),
  email: emailSchema,
  senha: senhaSchema,
});

export const atualizarUsuarioSchema = z
  .object({ ativo: z.boolean(), senha: senhaSchema })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Envie ao menos um campo");

export const comentarioSchema = z.object({
  texto: z.string().trim().min(1, "Escreva a mensagem").max(1000, "A mensagem pode ter no máximo 1000 caracteres"),
});

// ---------- comunicados e busca ----------
export const CATEGORIAS_COMUNICADO = ["urgente", "convocacao", "aviso"] as const;

export const criarComunicadoSchema = z.object({
  titulo: z.string().trim().min(3, "Escreva o título").max(120),
  texto: z.string().trim().min(10, "Escreva o texto do aviso").max(2000),
  categoria: z.enum(CATEGORIAS_COMUNICADO),
});

export const rascunhoComunicadoSchema = z.object({
  instrucao: z.string().trim().min(5, "Descreva o que o aviso deve dizer").max(300),
});

export const buscaSchema = z.object({
  pergunta: z.string().trim().min(2, "Escreva o que procura").max(200),
});

/** Saída bruta da IA ao traduzir a pergunta em filtros. Strings vazias = não soube dizer. */
export const filtrosBrutosSchema = z.object({
  tipo: z.string(),
  categoria: z.string(),
  urgencia: z.string(),
  status: z.string(),
  texto: z.string(),
});

// ---------- atividades dos funcionários ----------
export const STATUS_TAREFA = ["pendente", "em_andamento", "concluida"] as const;
export const PRIORIDADES_TAREFA = ["baixa", "normal", "alta"] as const;

const prazoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Prazo inválido");

export const criarTarefaSchema = z.object({
  titulo: z.string().trim().min(3, "Escreva o título da atividade").max(120),
  descricao: z.string().trim().max(1000).optional(),
  prioridade: z.enum(PRIORIDADES_TAREFA).default("normal"),
  prazo: prazoSchema.optional(),
  funcionarioId: z.number().int().positive("Escolha o funcionário"),
});

export const atualizarTarefaSchema = z
  .object({
    titulo: z.string().trim().min(3).max(120),
    descricao: z.string().trim().max(1000),
    prioridade: z.enum(PRIORIDADES_TAREFA),
    prazo: prazoSchema.nullable(),
    funcionarioId: z.number().int().positive(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Envie ao menos um campo");

export const andamentoTarefaSchema = z.object({
  status: z.enum(STATUS_TAREFA),
  observacao: z.string().trim().max(500).optional(),
});

export const listarTarefasQuerySchema = z.object({
  status: z.enum(STATUS_TAREFA).optional(),
  funcionarioId: z.coerce.number().int().positive().optional(),
});

// ---------- encomendas ----------
export const STATUS_ENCOMENDA = ["aguardando", "retirada"] as const;

export const criarEncomendaSchema = z.object({
  apartamento: z.string().trim().min(1, "Informe o apartamento").max(20),
  descricao: z.string().trim().max(200).optional(),
});

export const listarEncomendasQuerySchema = z.object({
  status: z.enum(STATUS_ENCOMENDA).optional(),
});
