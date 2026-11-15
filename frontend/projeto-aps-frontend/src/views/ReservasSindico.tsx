import { useEffect, useState } from 'react'
import { apiReservas } from '../api'
import { AreasComuns } from '../components/AreasComuns'
import { CalendarioReservas } from '../components/CalendarioReservas'
import { Chips } from '../components/Chips'
import { Paginacao } from '../components/Paginacao'
import { StatusReserva } from '../components/StatusReserva'
import { haQuanto, periodoReserva } from '../format'
import type { Area, Reserva, StatusReserva as TStatus } from '../types'

const POR_PAGINA = 8

export function ReservasSindico() {
  const [filtro, setFiltro] = useState<TStatus | undefined>(undefined)
  const [todas, setTodas] = useState<Reserva[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [recusando, setRecusando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [paginaPend, setPaginaPend] = useState(1)
  const [paginaHist, setPaginaHist] = useState(1)

  useEffect(() => {
    let cancelado = false
    apiReservas
      .listar()
      .then((l) => {
        if (!cancelado) {
          setTodas(l)
          setErro(null)
        }
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar as reservas.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  useEffect(() => {
    let cancelado = false
    apiReservas
      .areas()
      .then((a) => {
        if (!cancelado) setAreas(a)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  async function agir(r: Reserva, acao: Parameters<typeof apiReservas.agir>[1]) {
    setOcupado(r.id)
    setErro(null)
    try {
      await apiReservas.agir(r.id, acao)
      setRecusando(null)
      setMotivo('')
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setOcupado(null)
    }
  }

  const lista = todas ?? []
  // Pendentes: a data mais próxima primeiro (é o que vence antes). Histórico: o mais recente primeiro.
  const pendentes = lista.filter((r) => r.status === 'pendente').sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
  const historico = lista
    .filter((r) => r.status !== 'pendente' && (!filtro || r.status === filtro))
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())

  // Se a última página esvaziar (ex.: aprovou o último da página), volta para a anterior.
  const ultimaPend = Math.max(1, Math.ceil(pendentes.length / POR_PAGINA))
  const ultimaHist = Math.max(1, Math.ceil(historico.length / POR_PAGINA))
  const pagPend = Math.min(paginaPend, ultimaPend)
  const pagHist = Math.min(paginaHist, ultimaHist)
  const pendentesDaPagina = pendentes.slice((pagPend - 1) * POR_PAGINA, pagPend * POR_PAGINA)
  const historicoDaPagina = historico.slice((pagHist - 1) * POR_PAGINA, pagHist * POR_PAGINA)

  return (
    <section className="tela tela--larga" aria-labelledby="t-reservas-sindico">
      <h1 className="titulo" id="t-reservas-sindico">
        Reservas das áreas comuns
      </h1>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24 }}>
          {erro}
        </p>
      )}

      {pendentes.length > 0 && (
        <p className="aviso-pendentes" role="status">
          <strong>
            {pendentes.length === 1 ? '1 pedido espera' : `${pendentes.length} pedidos esperam`} sua resposta.
          </strong>{' '}
          <button type="button" className="link" onClick={() => document.getElementById('pedidos-pendentes')?.scrollIntoView({ behavior: 'smooth' })}>
            Ver a lista
          </button>
        </p>
      )}

      <CalendarioReservas reservas={lista} />

      <h2 className="subtitulo" id="pedidos-pendentes" style={{ marginTop: 48 }}>
        Pedidos pendentes {todas !== null && `(${pendentes.length})`}
      </h2>

      {todas !== null && pendentes.length === 0 && !erro && (
        <p className="vazio">Nenhum pedido esperando você. Quando um morador pedir uma reserva, ela aparece aqui.</p>
      )}

      {pendentes.length > 0 && (
        <>
          <div className="tabela-rolagem">
            <table className="tabela tabela-reservas">
              <thead>
                <tr>
                  <th>Espaço</th>
                  <th>Apto</th>
                  <th>Data</th>
                  <th>Pedido</th>
                  <th>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {pendentesDaPagina.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.area.nome}</strong>
                    </td>
                    <td>{r.apartamento}</td>
                    <td>{periodoReserva(r.inicio, r.fim)}</td>
                    <td>{haQuanto(r.criadaEm)}</td>
                    <td>
                      {recusando !== r.id ? (
                        <div className="linha-acao">
                          <button type="button" className="botao botao--aprovar botao--tabela" disabled={ocupado === r.id} onClick={() => void agir(r, { acao: 'aprovar' })}>
                            Aprovar
                          </button>
                          <button
                            type="button"
                            className="botao botao--recusar botao--tabela"
                            disabled={ocupado === r.id}
                            onClick={() => {
                              setRecusando(r.id)
                              setMotivo('')
                            }}
                          >
                            Recusar
                          </button>
                        </div>
                      ) : (
                        <form
                          className="recusa-linha"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void agir(r, { acao: 'recusar', motivo: motivo.trim() })
                          }}
                        >
                          <label className="sr-only" htmlFor={`motivo-${r.id}`}>
                            Motivo da recusa (o morador vai ver)
                          </label>
                          <input
                            id={`motivo-${r.id}`}
                            type="text"
                            value={motivo}
                            maxLength={300}
                            autoFocus
                            placeholder="Motivo da recusa (o morador vai ver)"
                            onChange={(e) => setMotivo(e.target.value)}
                          />
                          <div className="linha-acao">
                            <button className="botao botao--recusar-cheio botao--tabela" type="submit" disabled={motivo.trim().length < 3 || ocupado === r.id}>
                              Confirmar recusa
                            </button>
                            <button type="button" className="botao botao--sec botao--tabela" onClick={() => setRecusando(null)}>
                              Voltar
                            </button>
                          </div>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao total={pendentes.length} porPagina={POR_PAGINA} pagina={pagPend} aoMudar={(p) => { setPaginaPend(p); setRecusando(null) }} singular="pedido" plural="pedidos" />
        </>
      )}

      <h2 className="subtitulo" style={{ marginTop: 48 }}>
        Histórico
      </h2>
      <div className="filtros" style={{ marginTop: 16 }}>
        <Chips<TStatus>
          rotulo="Mostrar"
          valor={filtro}
          onChange={(v) => {
            setFiltro(v)
            setPaginaHist(1)
          }}
          opcoes={[
            { valor: undefined, texto: 'Todas' },
            { valor: 'aprovada', texto: 'Aprovadas' },
            { valor: 'recusada', texto: 'Recusadas' },
            { valor: 'cancelada', texto: 'Canceladas' },
          ]}
        />
      </div>

      {todas !== null && historico.length === 0 && <p className="vazio">Nenhuma reserva decidida com esse filtro.</p>}

      {historico.length > 0 && (
        <>
          <div className="tabela-rolagem">
            <table className="tabela tabela-reservas">
              <thead>
                <tr>
                  <th>Espaço</th>
                  <th>Apto</th>
                  <th>Data</th>
                  <th>Situação</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {historicoDaPagina.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.area.nome}</strong>
                    </td>
                    <td>{r.apartamento}</td>
                    <td>{periodoReserva(r.inicio, r.fim)}</td>
                    <td>
                      <StatusReserva valor={r.status} />
                      {r.status === 'recusada' && r.motivoRecusa && <p className="ajuda">Motivo: {r.motivoRecusa}</p>}
                    </td>
                    <td>
                      {r.status === 'aprovada' && (
                        <button
                          type="button"
                          className="botao botao--sec botao--tabela"
                          disabled={ocupado === r.id}
                          onClick={() => {
                            if (window.confirm('Cancelar esta reserva já aprovada?')) void agir(r, { acao: 'cancelar' })
                          }}
                        >
                          Cancelar reserva
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao total={historico.length} porPagina={POR_PAGINA} pagina={pagHist} aoMudar={setPaginaHist} singular="reserva" plural="reservas" />
        </>
      )}

      <div className="mural">
        <h2 className="subtitulo">Áreas comuns</h2>
        <AreasComuns areas={areas} />
      </div>
    </section>
  )
}
