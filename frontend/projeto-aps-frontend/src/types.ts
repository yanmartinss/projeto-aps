export type Perfil = 'morador' | 'funcionario' | 'sindico'
export type Categoria =
  | 'barulho'
  | 'vazamento_manutencao'
  | 'seguranca'
  | 'limpeza'
  | 'entrega_portaria'
  | 'outros'
export type Urgencia = 'baixa' | 'media' | 'alta'
export type Status = 'aberta' | 'em_analise' | 'em_execucao' | 'resolvida' | 'cancelada'

export interface Ocorrencia {
  id: number
  texto: string
  autorPerfil: 'morador' | 'funcionario'
  categoria: Categoria | null
  urgencia: Urgencia | null
  resumo: string | null
  status: Status
  classificada: boolean
  criadaEm: string
  atualizadaEm: string
  resolvidaEm: string | null
  autorId: number | null
  responsavelId: number | null
}

export const PERFIS: Record<Perfil, string> = {
  morador: 'Morador',
  funcionario: 'Funcionário',
  sindico: 'Síndico',
}

export const CATEGORIAS: Record<Categoria, string> = {
  barulho: 'Barulho',
  vazamento_manutencao: 'Vazamento e manutenção',
  seguranca: 'Segurança',
  limpeza: 'Limpeza',
  entrega_portaria: 'Entrega e portaria',
  outros: 'Outros',
}

export const URGENCIAS: Record<Urgencia, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

export const STATUS: Record<Status, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  em_execucao: 'Em execução',
  resolvida: 'Resolvida',
  cancelada: 'Cancelada',
}

export type StatusReserva = 'pendente' | 'aprovada' | 'recusada' | 'cancelada'

export interface Area {
  id: number
  nome: string
  abre: number
  fecha: number
  duracaoMaxMin: number
}

export interface Reserva {
  id: number
  areaId: number
  area: Area
  apartamento: string
  inicio: string
  fim: string
  status: StatusReserva
  textoOriginal: string | null
  motivoRecusa: string | null
  criadaEm: string
}

export const STATUS_RESERVA: Record<StatusReserva, string> = {
  pendente: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
}

export interface Usuario {
  id: number
  nome: string
  email: string
  perfil: Perfil
  apartamento: string | null
}

export interface UsuarioAdmin extends Usuario {
  ativo: boolean
  criadoEm: string
  senhaSolicitadaEm: string | null
}

export interface OcorrenciaCompleta extends Ocorrencia {
  autor: { id: number; nome: string; apartamento: string | null; perfil: Perfil } | null
  responsavel: { id: number; nome: string } | null
  _count: { comentarios: number }
}

export interface Comentario {
  id: number
  texto: string
  criadoEm: string
  autor: { id: number; nome: string; perfil: Perfil }
}

export interface OcorrenciaDetalhe extends OcorrenciaCompleta {
  comentarios: Comentario[]
}

export interface Indicadores {
  aberta: number
  em_analise: number
  em_execucao: number
  resolvida: number
  cancelada: number
  urgentes: number
  resolvidasNoMes: number
}

export type CategoriaComunicado = 'urgente' | 'convocacao' | 'aviso'

export const CATEGORIAS_COMUNICADO: Record<CategoriaComunicado, string> = {
  urgente: 'Urgente',
  convocacao: 'Convocação',
  aviso: 'Aviso',
}

export interface Comunicado {
  id: number
  titulo: string
  texto: string
  categoria: CategoriaComunicado
  criadoEm: string
  autor: { nome: string }
}

export interface DashboardDados {
  numeros: {
    naoResolvidas: number
    abertas: number
    emAnalise: number
    emExecucao: number
    urgentes: number
    resolvidasNoMes: number
    reservasPendentes: number
    reservasFuturas: number
  }
  criticas: { id: number; resumo: string; categoria: Categoria | null; status: Status; criadaEm: string; responsavel: string | null }[]
  proximasReservas: { id: number; area: string; apartamento: string; inicio: string; fim: string }[]
  porCategoria: { categoria: string; total: number }[]
  comunicados: { id: number; titulo: string; categoria: CategoriaComunicado; criadoEm: string; autor: string }[]
}

export interface ResumoDoDia {
  texto: string
  origem: 'ia' | 'regra'
  geradoEm: string
}

export interface ResultadoBusca {
  origem: 'ia' | 'palavras'
  etiquetas: string[]
  ocorrencias: { id: number; resumo: string; categoria: Categoria | null; urgencia: Urgencia | null; status: Status; criadaEm: string; autor: string | null; apartamento: string | null }[]
  reservas: { id: number; area: string; apartamento: string; inicio: string; fim: string; status: StatusReserva }[]
  moradores: { id: number; nome: string; apartamento: string | null; ativo: boolean }[]
}

export type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida'
export type PrioridadeTarefa = 'baixa' | 'normal' | 'alta'

export const STATUS_TAREFA: Record<StatusTarefa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

export const PRIORIDADES_TAREFA: Record<PrioridadeTarefa, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
}

export interface Tarefa {
  id: number
  titulo: string
  descricao: string | null
  prioridade: PrioridadeTarefa
  status: StatusTarefa
  prazo: string | null
  concluidaEm: string | null
  observacao: string | null
  funcionario: { id: number; nome: string }
  criadaPor: { id: number; nome: string }
  criadaEm: string
}

export interface Aviso {
  tela: string
  quantidade: number
  texto: string
}

export type StatusEncomenda = 'aguardando' | 'retirada'

export interface Encomenda {
  id: number
  apartamento: string
  descricao: string | null
  status: StatusEncomenda
  recebidaEm: string
  retiradaEm: string | null
  registradaPor: { id: number; nome: string }
  /** Só vem na resposta de quem registra: quantos moradores cadastrados há nesse apartamento. */
  moradoresNoApartamento?: number
}
