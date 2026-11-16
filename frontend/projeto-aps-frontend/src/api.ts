import type {
  Area,
  Categoria,
  CategoriaComunicado,
  Comentario,
  Comunicado,
  Encomenda,
  DashboardDados,
  Indicadores,
  Ocorrencia,
  OcorrenciaCompleta,
  OcorrenciaDetalhe,
  Reserva,
  ResultadoBusca,
  ResumoDoDia,
  Status,
  StatusEncomenda,
  StatusReserva,
  StatusTarefa,
  PrioridadeTarefa,
  Tarefa,
  Aviso,
  Urgencia,
  Usuario,
  UsuarioAdmin,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

const CHAVE_TOKEN = 'aps.token'

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function guardarToken(token: string) {
  try {
    localStorage.setItem(CHAVE_TOKEN, token)
  } catch {
    /* sem armazenamento: a sessão dura só até recarregar a página */
  }
}

export function limparToken() {
  try {
    localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    /* ignora */
  }
}

let aoExpirarSessao: (() => void) | null = null

/** O App registra aqui o que fazer quando o servidor recusa o token (expirou, conta desativada...). */
export function definirAoExpirarSessao(fn: (() => void) | null) {
  aoExpirarSessao = fn
}

async function pedir<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = lerToken()
  let resp: Response
  try {
    resp = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error('Não foi possível falar com o servidor. Confira se a API está rodando.')
  }
  const corpo = await resp.json().catch(() => ({}))
  // 401 com sessão ativa = token vencido ou conta desativada: volta para o login. (No login errado não há token ainda.)
  if (resp.status === 401 && token) {
    limparToken()
    aoExpirarSessao?.()
  }
  if (!resp.ok) {
    const detalhe = Array.isArray(corpo.detalhes) ? corpo.detalhes[0]?.message : undefined
    const motivos = Array.isArray(corpo.motivos) ? corpo.motivos.join(' ') : undefined
    throw new Error(motivos ?? detalhe ?? corpo.erro ?? 'Algo deu errado. Tente de novo.')
  }
  return corpo as T
}

export const api = {
  /** Quadro do síndico: todas as ocorrências e os indicadores. */
  quadro() {
    return pedir<{ itens: OcorrenciaCompleta[]; indicadores: Indicadores }>('/ocorrencias')
  },
  minhas() {
    return pedir<OcorrenciaCompleta[]>('/ocorrencias/minhas')
  },
  detalhe(id: number) {
    return pedir<OcorrenciaDetalhe>(`/ocorrencias/${id}`)
  },
  comentar(id: number, texto: string) {
    return pedir<Comentario>(`/ocorrencias/${id}/comentarios`, { method: 'POST', body: JSON.stringify({ texto }) })
  },
  cancelar(id: number, motivo: string) {
    return pedir<Ocorrencia>(`/ocorrencias/${id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) })
  },
  criar(texto: string) {
    return pedir<Ocorrencia>('/ocorrencias', {
      method: 'POST',
      body: JSON.stringify({ texto }),
    })
  },
  atualizar(
    id: number,
    dados: Partial<{ categoria: Categoria; urgencia: Urgencia; resumo: string; status: Status; responsavelId: number | null }>,
  ) {
    return pedir<OcorrenciaCompleta>(`/ocorrencias/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    })
  },
  resumirTurno(inicio: Date, fim: Date) {
    return pedir<{ total: number; resumo: string }>('/resumo-turno', {
      method: 'POST',
      body: JSON.stringify({ inicio: inicio.toISOString(), fim: fim.toISOString() }),
    })
  },
}

export interface Fonte {
  id: string
  artigo: string | null
  texto: string
  similaridade: number
}

export interface RespostaRegimento {
  encontrou: boolean
  resposta: string
  fontes: Fonte[]
}

export interface DocumentoRegimento {
  id: number
  nome: string
  criadoEm: string
  modeloEmbedding: string
  nTrechos: number
  precisaReindexar: boolean
}

export const apiRegimento = {
  perguntar(pergunta: string) {
    return pedir<RespostaRegimento>('/regimento/perguntas', {
      method: 'POST',
      body: JSON.stringify({ pergunta }),
    })
  },
  listar() {
    return pedir<DocumentoRegimento[]>('/regimento/documentos')
  },
  enviar(arquivo: File) {
    return pedir<{ id: number; nome: string; nTrechos: number }>(
      `/regimento/documentos?nome=${encodeURIComponent(arquivo.name)}`,
      { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: arquivo },
    )
  },
  reindexar(id: number) {
    return pedir<{ id: number; nTrechos: number }>(`/regimento/documentos/${id}/reindexar`, { method: 'POST' })
  },
  apagar(id: number) {
    return pedir<Record<string, never>>(`/regimento/documentos/${id}`, { method: 'DELETE' })
  },
}

export interface DadosReserva {
  areaId: number
  data: string
}

export const apiReservas = {
  areas() {
    return pedir<Area[]>('/reservas/areas')
  },
  validar(dados: DadosReserva) {
    return pedir<{ ok: boolean; motivos: string[] }>('/reservas/validar', {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  },
  criar(dados: DadosReserva & { textoOriginal?: string }) {
    return pedir<Reserva>('/reservas', { method: 'POST', body: JSON.stringify(dados) })
  },
  listar(filtros: { status?: StatusReserva } = {}) {
    const params = new URLSearchParams()
    if (filtros.status) params.set('status', filtros.status)
    const q = params.toString()
    return pedir<Reserva[]>(`/reservas${q ? `?${q}` : ''}`)
  },
  agir(id: number, acao: { acao: 'aprovar' } | { acao: 'cancelar' } | { acao: 'recusar'; motivo: string }) {
    return pedir<Reserva>(`/reservas/${id}`, { method: 'PATCH', body: JSON.stringify(acao) })
  },
}

export const apiAuth = {
  login(email: string, senha: string) {
    return pedir<{ token: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    })
  },
  cadastrar(dados: { nome: string; email: string; apartamento: string; senha: string }) {
    return pedir<{ token: string; usuario: Usuario }>('/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify(dados),
    })
  },
  eu() {
    return pedir<{ usuario: Usuario }>('/auth/eu')
  },
  esqueciSenha(email: string) {
    return pedir<{ mensagem: string }>('/auth/esqueci-senha', { method: 'POST', body: JSON.stringify({ email }) })
  },
  redefinirSenha(token: string, senha: string) {
    return pedir<{ mensagem: string }>('/auth/redefinir-senha', { method: 'POST', body: JSON.stringify({ token, senha }) })
  },
}

export const apiUsuarios = {
  listar() {
    return pedir<UsuarioAdmin[]>('/usuarios')
  },
  funcionarios() {
    return pedir<{ id: number; nome: string }[]>('/usuarios/funcionarios')
  },
  criarFuncionario(dados: { nome: string; email: string; senha: string }) {
    return pedir<UsuarioAdmin>('/usuarios', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(id: number, dados: { ativo?: boolean; senha?: string }) {
    return pedir<UsuarioAdmin>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(dados) })
  },
  linkRedefinicao(id: number) {
    return pedir<{ token: string }>(`/usuarios/${id}/link-redefinicao`, { method: 'POST' })
  },
}

export const apiDashboard = {
  dados() {
    return pedir<DashboardDados>('/dashboard')
  },
  resumo(atualizar = false) {
    return pedir<ResumoDoDia>(`/dashboard/resumo${atualizar ? '?atualizar=1' : ''}`)
  },
}

export const apiComunicados = {
  listar() {
    return pedir<Comunicado[]>('/comunicados')
  },
  rascunho(instrucao: string) {
    return pedir<{ titulo: string; texto: string; categoria: CategoriaComunicado }>('/comunicados/rascunho', {
      method: 'POST',
      body: JSON.stringify({ instrucao }),
    })
  },
  publicar(dados: { titulo: string; texto: string; categoria: CategoriaComunicado }) {
    return pedir<Comunicado>('/comunicados', { method: 'POST', body: JSON.stringify(dados) })
  },
  apagar(id: number) {
    return pedir<Record<string, never>>(`/comunicados/${id}`, { method: 'DELETE' })
  },
}

export const apiBusca = {
  buscar(pergunta: string) {
    return pedir<ResultadoBusca>('/busca', { method: 'POST', body: JSON.stringify({ pergunta }) })
  },
}

export const apiTarefas = {
  todas(filtros: { status?: StatusTarefa; funcionarioId?: number } = {}) {
    const params = new URLSearchParams()
    if (filtros.status) params.set('status', filtros.status)
    if (filtros.funcionarioId) params.set('funcionarioId', String(filtros.funcionarioId))
    const q = params.toString()
    return pedir<Tarefa[]>(`/tarefas${q ? `?${q}` : ''}`)
  },
  minhas() {
    return pedir<Tarefa[]>('/tarefas/minhas')
  },
  criar(dados: { titulo: string; descricao?: string; prioridade: PrioridadeTarefa; prazo?: string; funcionarioId: number }) {
    return pedir<Tarefa>('/tarefas', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(
    id: number,
    dados: Partial<{ titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string | null; funcionarioId: number }>,
  ) {
    return pedir<Tarefa>(`/tarefas/${id}`, { method: 'PATCH', body: JSON.stringify(dados) })
  },
  andamento(id: number, dados: { status: StatusTarefa; observacao?: string }) {
    return pedir<Tarefa>(`/tarefas/${id}/andamento`, { method: 'PATCH', body: JSON.stringify(dados) })
  },
  apagar(id: number) {
    return pedir<Record<string, never>>(`/tarefas/${id}`, { method: 'DELETE' })
  },
}

export const apiNotificacoes = {
  listar() {
    return pedir<{ total: number; avisos: Aviso[] }>('/notificacoes')
  },
}

/** Confere se o servidor responde (usado no cartão "Status do sistema"). */
export async function servidorNoAr(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/saude`)
    return r.ok
  } catch {
    return false
  }
}

export const apiEncomendas = {
  /** O servidor já filtra: morador recebe só as do apartamento dele; a portaria recebe todas. */
  listar(status?: StatusEncomenda) {
    return pedir<Encomenda[]>(`/encomendas${status ? `?status=${status}` : ''}`)
  },
  criar(dados: { apartamento: string; descricao?: string }) {
    return pedir<Encomenda>('/encomendas', { method: 'POST', body: JSON.stringify(dados) })
  },
  retirar(id: number) {
    return pedir<Encomenda>(`/encomendas/${id}/retirar`, { method: 'PATCH' })
  },
  apagar(id: number) {
    return pedir<Record<string, never>>(`/encomendas/${id}`, { method: 'DELETE' })
  },
}
