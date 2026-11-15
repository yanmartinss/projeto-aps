import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiBusca } from '../api'
import { dataHora, haQuanto } from '../format'
import { CATEGORIAS, STATUS, STATUS_RESERVA, type ResultadoBusca } from '../types'
import { Icone } from './Icone'

interface Props {
  aoAbrirOcorrencia: (id: number) => void
  aoAbrirReservas: () => void
}

export function BuscaIA({ aoAbrirOcorrencia, aoAbrirReservas }: Props) {
  const [pergunta, setPergunta] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  async function buscar(e: FormEvent) {
    e.preventDefault()
    const p = pergunta.trim()
    if (p.length < 2) return
    setBuscando(true)
    setErro(null)
    setAberto(true)
    try {
      setResultado(await apiBusca.buscar(p))
    } catch (err) {
      setResultado(null)
      setErro(err instanceof Error ? err.message : 'Não foi possível pesquisar.')
    } finally {
      setBuscando(false)
    }
  }

  const total = resultado ? resultado.ocorrencias.length + resultado.reservas.length + resultado.moradores.length : 0

  return (
    <div className="busca" ref={raiz}>
      <form onSubmit={buscar} role="search">
        <label className="sr-only" htmlFor="busca-ia">
          Pesquisar com IA
        </label>
        <span className="busca-icone">
          <Icone nome="busca" tamanho={18} />
        </span>
        <input
          id="busca-ia"
          type="text"
          value={pergunta}
          maxLength={200}
          autoComplete="off"
          placeholder="Pergunte: vazamentos abertos este mês, reservas do apto 101…"
          onChange={(e) => setPergunta(e.target.value)}
          onFocus={() => resultado && setAberto(true)}
        />
      </form>

      {aberto && (
        <div className="busca-painel" role="region" aria-label="Resultados da pesquisa">
          {buscando && (
            <p className="aviso" role="status">
              <span className="pulso" aria-hidden="true" />
              Pesquisando…
            </p>
          )}
          {erro && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}

          {!buscando && resultado && (
            <>
              <p className="busca-entendi">
                <span className="ajuda">{resultado.origem === 'ia' ? 'Entendido pela IA:' : 'Pesquisa por palavras:'}</span>{' '}
                {resultado.etiquetas.map((e) => (
                  <span key={e} className="etiqueta">
                    {e}
                  </span>
                ))}
              </p>
              {total === 0 && <p className="ajuda">Nenhum resultado. Tente outras palavras.</p>}

              {resultado.ocorrencias.length > 0 && (
                <div className="busca-grupo">
                  <h3>Ocorrências ({resultado.ocorrencias.length})</h3>
                  <ul>
                    {resultado.ocorrencias.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setAberto(false)
                            aoAbrirOcorrencia(o.id)
                          }}
                        >
                          <strong>{o.resumo}</strong>
                          <small>
                            {o.categoria ? CATEGORIAS[o.categoria] : 'Sem categoria'}, {STATUS[o.status].toLowerCase()}
                            {o.apartamento ? `, apto ${o.apartamento}` : ''}, {haQuanto(o.criadaEm)}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resultado.reservas.length > 0 && (
                <div className="busca-grupo">
                  <h3>Reservas ({resultado.reservas.length})</h3>
                  <ul>
                    {resultado.reservas.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setAberto(false)
                            aoAbrirReservas()
                          }}
                        >
                          <strong>
                            {r.area}, apartamento {r.apartamento}
                          </strong>
                          <small>
                            {dataHora(r.inicio)}, {STATUS_RESERVA[r.status].toLowerCase()}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resultado.moradores.length > 0 && (
                <div className="busca-grupo">
                  <h3>Moradores ({resultado.moradores.length})</h3>
                  <ul>
                    {resultado.moradores.map((m) => (
                      <li key={m.id}>
                        <div className="busca-linha">
                          <strong>{m.nome}</strong>
                          <small>
                            {m.apartamento ? `apartamento ${m.apartamento}` : 'sem apartamento'}
                            {m.ativo ? '' : ', conta desativada'}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
