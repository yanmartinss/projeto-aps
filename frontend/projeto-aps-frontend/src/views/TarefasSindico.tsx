import { useEffect, useState, type FormEvent } from 'react'
import { apiTarefas, apiUsuarios } from '../api'
import { CabecalhoTela } from '../components/CabecalhoTela'
import { Chips } from '../components/Chips'
import { Indicador } from '../components/Indicador'
import { brParaIso, dataCurta, isoParaBr, mascararData } from '../format'
import { PRIORIDADES_TAREFA, STATUS_TAREFA, type PrioridadeTarefa, type StatusTarefa, type Tarefa } from '../types'

interface Valores {
  titulo: string
  descricao: string
  funcionarioId: string
  prioridade: PrioridadeTarefa
  prazo: string
}

/** Prazo digitado em dd/mm/aaaa -> aaaa-mm-dd. Vazio = sem prazo (null). Data que não existe vira erro. */
function prazoIso(texto: string): string | null {
  if (!texto.trim()) return null
  const iso = brParaIso(texto)
  if (!iso) throw new Error('Prazo inválido. Use dia/mês/ano, por exemplo 24/11/2026.')
  return iso
}

const VAZIO: Valores = { titulo: '', descricao: '', funcionarioId: '', prioridade: 'normal', prazo: '' }

function FormTarefa({
  funcionarios,
  inicial = VAZIO,
  rotuloBotao,
  aoSalvar,
  aoCancelar,
}: {
  funcionarios: { id: number; nome: string }[]
  inicial?: Valores
  rotuloBotao: string
  aoSalvar: (v: Valores) => Promise<void>
  aoCancelar?: () => void
}) {
  const [v, setV] = useState<Valores>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const campo = <K extends keyof Valores>(k: K, valor: Valores[K]) => setV((x) => ({ ...x, [k]: valor }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await aoSalvar(v)
      if (inicial === VAZIO) setV(VAZIO)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const sufixo = inicial === VAZIO ? 'novo' : 'edit'
  return (
    <form className="form-tarefa" onSubmit={enviar}>
      <div className="campo campo--cheio">
        <label htmlFor={`t-titulo-${sufixo}`}>O que precisa ser feito?</label>
        <input id={`t-titulo-${sufixo}`} type="text" value={v.titulo} maxLength={120} required placeholder="Ex.: Limpar a piscina e conferir o cloro" onChange={(e) => campo('titulo', e.target.value)} />
      </div>
      <div className="campo campo--cheio">
        <label htmlFor={`t-desc-${sufixo}`}>Detalhes (opcional)</label>
        <textarea id={`t-desc-${sufixo}`} value={v.descricao} maxLength={1000} style={{ minHeight: 72 }} onChange={(e) => campo('descricao', e.target.value)} />
      </div>
      <div className="grade-tarefa">
        <div className="campo">
          <label htmlFor={`t-func-${sufixo}`}>Funcionário</label>
          <select id={`t-func-${sufixo}`} value={v.funcionarioId} required onChange={(e) => campo('funcionarioId', e.target.value)}>
            <option value="">Escolha…</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor={`t-prio-${sufixo}`}>Prioridade</label>
          <select id={`t-prio-${sufixo}`} value={v.prioridade} onChange={(e) => campo('prioridade', e.target.value as PrioridadeTarefa)}>
            {Object.entries(PRIORIDADES_TAREFA).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor={`t-prazo-${sufixo}`}>Prazo (opcional)</label>
          <input id={`t-prazo-${sufixo}`} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" maxLength={10} value={v.prazo} onChange={(e) => campo('prazo', mascararData(e.target.value))} />
        </div>
      </div>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <div className="linha-acao">
        <button className="botao" type="submit" disabled={salvando || v.titulo.trim().length < 3 || !v.funcionarioId}>
          {salvando ? 'Salvando…' : rotuloBotao}
        </button>
        {aoCancelar && (
          <button type="button" className="botao botao--sec" onClick={aoCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export function TarefasSindico() {
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [funcionarios, setFuncionarios] = useState<{ id: number; nome: string }[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | undefined>(undefined)
  const [filtroFunc, setFiltroFunc] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [agora] = useState(() => Date.now())

  useEffect(() => {
    let cancelado = false
    apiTarefas
      .todas()
      .then((l) => {
        if (!cancelado) setTarefas(l)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar as atividades.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  useEffect(() => {
    let cancelado = false
    apiUsuarios
      .funcionarios()
      .then((f) => {
        if (!cancelado) setFuncionarios(f)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  const atrasada = (t: Tarefa) => t.status !== 'concluida' && !!t.prazo && new Date(t.prazo).getTime() < agora
  const lista = (tarefas ?? []).filter((t) => (!filtroStatus || t.status === filtroStatus) && (!filtroFunc || String(t.funcionario.id) === filtroFunc))
  const todas = tarefas ?? []

  async function criar(v: Valores) {
    await apiTarefas.criar({
      titulo: v.titulo.trim(),
      descricao: v.descricao.trim() || undefined,
      prioridade: v.prioridade,
      prazo: prazoIso(v.prazo) ?? undefined,
      funcionarioId: Number(v.funcionarioId),
    })
    setAviso('Atividade atribuída. O funcionário já vê na lista dele.')
    setVersao((n) => n + 1)
  }

  async function salvarEdicao(id: number, v: Valores) {
    await apiTarefas.atualizar(id, {
      titulo: v.titulo.trim(),
      descricao: v.descricao.trim(),
      prioridade: v.prioridade,
      prazo: prazoIso(v.prazo),
      funcionarioId: Number(v.funcionarioId),
    })
    setEditando(null)
    setAviso('Atividade atualizada.')
    setVersao((n) => n + 1)
  }

  async function apagar(t: Tarefa) {
    if (!window.confirm(`Apagar a atividade "${t.titulo}"?`)) return
    setErro(null)
    try {
      await apiTarefas.apagar(t.id)
      setAviso('Atividade apagada.')
      setVersao((n) => n + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível apagar.')
    }
  }

  return (
    <section className="tela tela--larga" aria-labelledby="t-tarefas">
      <CabecalhoTela
        id="t-tarefas"
        kicker="Operação / Equipe"
        titulo="Atividades da equipe"
        texto="Defina o que cada funcionário precisa fazer. Ele vê a atividade na própria lista e atualiza o andamento por lá."
      />

      <div className="indicadores">
        <Indicador rotulo="Pendentes" valor={todas.filter((t) => t.status === 'pendente').length} nota="Ainda não iniciadas" icone="relogio" />
        <Indicador rotulo="Em andamento" valor={todas.filter((t) => t.status === 'em_andamento').length} nota="Sendo feitas agora" icone="tarefas" />
        <Indicador rotulo="Atrasadas" valor={todas.filter(atrasada).length} nota="Prazo vencido" icone="alerta" tom={todas.some(atrasada) ? 'alerta' : 'normal'} />
        <Indicador rotulo="Concluídas" valor={todas.filter((t) => t.status === 'concluida').length} nota="No total" icone="calendario" />
      </div>

      <div className="painel-cartao" style={{ marginTop: 24 }}>
        <div className="painel-cabeca">
          <h2>Nova atividade</h2>
        </div>
        {funcionarios.length === 0 ? (
          <p className="ajuda">Ainda não há funcionários ativos. Crie as contas na tela "Usuários".</p>
        ) : (
          <FormTarefa funcionarios={funcionarios} rotuloBotao="Atribuir atividade" aoSalvar={criar} />
        )}
      </div>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24 }}>
          {erro}
        </p>
      )}
      {aviso && (
        <p className="ok" role="status" style={{ marginTop: 24 }}>
          {aviso}
        </p>
      )}

      <div className="barra-ferramentas">
        <Chips<StatusTarefa>
          rotulo="Status"
          valor={filtroStatus}
          onChange={setFiltroStatus}
          opcoes={[
            { valor: undefined, texto: 'Todas' },
            { valor: 'pendente', texto: 'Pendentes' },
            { valor: 'em_andamento', texto: 'Em andamento' },
            { valor: 'concluida', texto: 'Concluídas' },
          ]}
        />
        <div className="campo-filtro">
          <label className="sr-only" htmlFor="f-func">
            Filtrar por funcionário
          </label>
          <select id="f-func" value={filtroFunc} onChange={(e) => setFiltroFunc(e.target.value)}>
            <option value="">Todos os funcionários</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tarefas !== null && lista.length === 0 && <p className="vazio">Nenhuma atividade com esse filtro.</p>}

      <ul className="tarefas">
        {lista.map((t) => (
          <li key={t.id} className={`tarefa tarefa--${t.status}`}>
            {editando === t.id ? (
              <FormTarefa
                funcionarios={funcionarios}
                rotuloBotao="Salvar alterações"
                inicial={{
                  titulo: t.titulo,
                  descricao: t.descricao ?? '',
                  funcionarioId: String(t.funcionario.id),
                  prioridade: t.prioridade,
                  prazo: t.prazo ? isoParaBr(new Date(t.prazo).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })) : '',
                }}
                aoSalvar={(v) => salvarEdicao(t.id, v)}
                aoCancelar={() => setEditando(null)}
              />
            ) : (
              <>
                <div className="tarefa-corpo">
                  <div className="tarefa-tags">
                    <span className={`etiqueta prio prio--${t.prioridade}`}>Prioridade {PRIORIDADES_TAREFA[t.prioridade].toLowerCase()}</span>
                    <span className="sts" data-s={t.status === 'concluida' ? 'aprovada' : t.status === 'pendente' ? 'pendente' : 'neutro'}>
                      {STATUS_TAREFA[t.status]}
                    </span>
                    {atrasada(t) && <span className="sts" data-s="recusada">Atrasada</span>}
                  </div>
                  <h3>{t.titulo}</h3>
                  {t.descricao && <p>{t.descricao}</p>}
                  <p className="ajuda">
                    Para <strong>{t.funcionario.nome}</strong>
                    {t.prazo ? `, prazo ${dataCurta(t.prazo)}` : ', sem prazo'}
                  </p>
                  {t.observacao && (
                    <p className="obs">
                      <strong>Anotação de {t.funcionario.nome}:</strong> {t.observacao}
                    </p>
                  )}
                </div>
                <div className="tarefa-acoes">
                  <button type="button" className="botao botao--sec botao--mini" onClick={() => setEditando(t.id)}>
                    Editar
                  </button>
                  <button type="button" className="botao botao--sec botao--mini" onClick={() => void apagar(t)}>
                    Apagar
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
