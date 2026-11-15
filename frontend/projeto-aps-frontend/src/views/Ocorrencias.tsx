import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { CabecalhoTela } from '../components/CabecalhoTela'
import { DetalheOcorrencia } from '../components/DetalheOcorrencia'
import { Indicador } from '../components/Indicador'
import type { NomeIcone } from '../components/Icone'
import { Urgencia } from '../components/Urgencia'
import { haQuanto } from '../format'
import { CATEGORIAS, STATUS, type Indicadores, type OcorrenciaCompleta, type Status } from '../types'

type Visao = 'kanban' | 'lista'
type Filtro = 'todos' | 'urgentes' | 'andamento' | 'concluidos'

const COLUNAS: { status: Status; titulo: string }[] = [
  { status: 'aberta', titulo: 'Abertos e triagem' },
  { status: 'em_analise', titulo: 'Em análise' },
  { status: 'em_execucao', titulo: 'Em execução' },
  { status: 'resolvida', titulo: 'Resolvidos' },
]

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'urgentes', rotulo: 'Urgentes' },
  { id: 'andamento', rotulo: 'Em andamento' },
  { id: 'concluidos', rotulo: 'Concluídos' },
]

function passa(o: OcorrenciaCompleta, f: Filtro, busca: string): boolean {
  if (f === 'urgentes' && !(o.urgencia === 'alta' && o.status !== 'resolvida' && o.status !== 'cancelada')) return false
  if (f === 'andamento' && !(o.status === 'em_analise' || o.status === 'em_execucao')) return false
  if (f === 'concluidos' && o.status !== 'resolvida') return false
  const q = busca.trim().toLowerCase()
  if (!q) return true
  return [o.resumo, o.texto, o.autor?.nome, o.autor?.apartamento, o.responsavel?.nome].some((v) => v?.toLowerCase().includes(q))
}

function Cartao({ o, aoAbrir }: { o: OcorrenciaCompleta; aoAbrir: () => void }) {
  return (
    <button
      type="button"
      className="cartao-kanban"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(o.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={aoAbrir}
    >
      <span className="cartao-kanban-topo">
        <span className="etiqueta" data-cat={o.categoria ?? 'outros'}>{o.categoria ? CATEGORIAS[o.categoria] : 'Sem categoria'}</span>
        <Urgencia valor={o.urgencia} />
      </span>
      <strong className="cartao-kanban-titulo">{o.resumo ?? o.texto}</strong>
      <span className="cartao-kanban-meta">
        {o.autor?.nome ?? 'Não identificado'}
        {o.autor?.apartamento ? `, apto ${o.autor.apartamento}` : ''}
      </span>
      <span className="cartao-kanban-rodape">
        <span>Resp.: {o.responsavel?.nome ?? 'não atribuído'}</span>
        <span>
          {o._count.comentarios > 0 ? `${o._count.comentarios} msg, ` : ''}
          {haQuanto(o.criadaEm)}
        </span>
      </span>
    </button>
  )
}

export function Ocorrencias({ meuId, aberto, aoAbrir }: { meuId: number; aberto: number | null; aoAbrir: (id: number | null) => void }) {
  const [itens, setItens] = useState<OcorrenciaCompleta[] | null>(null)
  const [ind, setInd] = useState<Indicadores | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [visao, setVisao] = useState<Visao>('kanban')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [versao, setVersao] = useState(0)
  const [sobre, setSobre] = useState<Status | null>(null)

  useEffect(() => {
    let cancelado = false
    api
      .quadro()
      .then((r) => {
        if (cancelado) return
        setItens(r.itens)
        setInd(r.indicadores)
        setErro(null)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar as ocorrências.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const visiveis = useMemo(() => (itens ?? []).filter((o) => passa(o, filtro, busca)), [itens, filtro, busca])

  async function mover(id: number, status: Status) {
    const atual = itens?.find((o) => o.id === id)
    if (!atual || atual.status === status) return
    // Move na hora (otimista) e desfaz se o servidor recusar.
    setItens((l) => l?.map((o) => (o.id === id ? { ...o, status } : o)) ?? l)
    try {
      await api.atualizar(id, { status })
      recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível mover a ocorrência.')
      recarregar()
    }
  }

  const cartoes: { chave: string; rotulo: string; valor: number; nota: string; icone: NomeIcone; alerta?: boolean }[] = ind
    ? [
        { chave: 'a', rotulo: 'Abertos e triagem', valor: ind.aberta, nota: ind.urgentes > 0 ? `${ind.urgentes} urgente${ind.urgentes === 1 ? '' : 's'} no total` : 'Nenhuma urgente', icone: 'alerta', alerta: ind.urgentes > 0 },
        { chave: 'b', rotulo: 'Em análise', valor: ind.em_analise, nota: 'Aguardando avaliação', icone: 'lista' },
        { chave: 'c', rotulo: 'Em execução', valor: ind.em_execucao, nota: 'Com responsável no local', icone: 'tarefas' },
        { chave: 'd', rotulo: 'Concluídos no mês', valor: ind.resolvidasNoMes, nota: `${ind.resolvida} resolvidos no total`, icone: 'calendario' },
      ]
    : []

  return (
    <section className="tela tela--larga" aria-labelledby="t-ocorrencias">
      <CabecalhoTela
        id="t-ocorrencias"
        kicker="Operações condominiais / Chamados e manutenção"
        titulo="Gestão de ocorrências"
        texto="Acompanhe e despache os chamados registrados pelos moradores e pela portaria."
      />

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 16 }}>
          {erro}
        </p>
      )}

      <div className="indicadores">
        {cartoes.map((c) => (
          <Indicador key={c.chave} rotulo={c.rotulo} valor={c.valor} nota={c.nota} icone={c.icone} tom={c.alerta ? 'alerta' : 'normal'} />
        ))}
      </div>

      <div className="barra-ferramentas">
        <div className="alternador" role="group" aria-label="Visão">
          <button type="button" aria-pressed={visao === 'kanban'} onClick={() => setVisao('kanban')}>
            Quadro
          </button>
          <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>
            Lista detalhada
          </button>
        </div>
        <div className="grupo" role="group" aria-label="Filtro">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.rotulo}
            </button>
          ))}
        </div>
        <div className="campo-filtro">
          <label className="sr-only" htmlFor="filtro-texto">
            Filtrar ocorrências
          </label>
          <input id="filtro-texto" type="text" value={busca} placeholder="Filtrar por texto, nome ou apartamento" onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      {itens === null && !erro && <p className="aviso" style={{ marginTop: 24 }}>Carregando ocorrências…</p>}

      {itens !== null && visao === 'kanban' && (
        <div className="quadro" aria-label="Quadro de ocorrências">
          {COLUNAS.map((col) => {
            const lista = visiveis.filter((o) => o.status === col.status)
            return (
              <section
                key={col.status}
                className={`coluna${sobre === col.status ? ' coluna--alvo' : ''}`}
                aria-label={col.titulo}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSobre(col.status)
                }}
                onDragLeave={() => setSobre((s) => (s === col.status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault()
                  setSobre(null)
                  const id = Number(e.dataTransfer.getData('text/plain'))
                  if (id) void mover(id, col.status)
                }}
              >
                <header className="coluna-cab">
                  <h2>{col.titulo}</h2>
                  <span className="contador">{lista.length}</span>
                </header>
                <div className="coluna-lista">
                  {lista.map((o) => (
                    <Cartao key={o.id} o={o} aoAbrir={() => aoAbrir(o.id)} />
                  ))}
                  {lista.length === 0 && <p className="ajuda coluna-vazia">Nada por aqui.</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {itens !== null && visao === 'lista' && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Categoria</th>
                <th>Urgência</th>
                <th>Status</th>
                <th>Solicitante</th>
                <th>Responsável</th>
                <th>Aberta</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button type="button" className="link" onClick={() => aoAbrir(o.id)}>
                      {o.resumo ?? o.texto}
                    </button>
                  </td>
                  <td>{o.categoria ? CATEGORIAS[o.categoria] : '—'}</td>
                  <td>
                    <Urgencia valor={o.urgencia} />
                  </td>
                  <td>{STATUS[o.status]}</td>
                  <td>
                    {o.autor?.nome ?? '—'}
                    {o.autor?.apartamento ? `, ${o.autor.apartamento}` : ''}
                  </td>
                  <td>{o.responsavel?.nome ?? '—'}</td>
                  <td>{haQuanto(o.criadaEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visiveis.length === 0 && <p className="vazio">Nenhuma ocorrência com esse filtro.</p>}
        </div>
      )}

      {itens !== null && itens.length === 0 && !erro && (
        <p className="vazio">Quando um morador ou funcionário registrar algo, aparece aqui, já com categoria e urgência.</p>
      )}

      {aberto !== null && (
        <DetalheOcorrencia id={aberto} modo="sindico" meuId={meuId} aoFechar={() => aoAbrir(null)} aoAlterar={recarregar} />
      )}
    </section>
  )
}
