import { useEffect, useMemo, useState } from 'react'
import { apiReservas, type DadosReserva } from '../api'
import { AreasComuns } from '../components/AreasComuns'
import { StatusReserva } from '../components/StatusReserva'
import { brParaIso, mascararData, periodoReserva } from '../format'
import type { Area, Reserva } from '../types'

interface Cartao {
  areaId: number | ''
  data: string
  /** O que a pessoa digitou (dd/MM/aaaa); `data` guarda a versão aaaa-MM-dd que vai para o servidor. */
  dataTexto: string
}

interface Validacao {
  chave: string
  ok: boolean
  motivos: string[]
}

export function ReservasMorador({ apartamento }: { apartamento: string }) {
  const [areas, setAreas] = useState<Area[]>([])
  const [cartao, setCartao] = useState<Cartao | null>(null)
  const [validacao, setValidacao] = useState<Validacao | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [minhas, setMinhas] = useState<Reserva[] | null>(null)
  const [versao, setVersao] = useState(0)

  const apto = apartamento

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

  // "Minhas reservas": recarrega depois de cada ação. O servidor já devolve só as do próprio morador.
  useEffect(() => {
    let cancelado = false
    const t = setTimeout(() => {
      apiReservas
        .listar()
        .then((l) => {
          if (!cancelado) setMinhas(l)
        })
        .catch(() => {
          if (!cancelado) setMinhas([])
        })
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [versao])

  const completo = !!cartao && cartao.areaId !== '' && !!cartao.data
  const dados: DadosReserva | null = useMemo(
    () =>
      completo && cartao && cartao.areaId !== ''
        ? { areaId: cartao.areaId, data: cartao.data }
        : null,
    [completo, cartao],
  )
  const chave = dados ? JSON.stringify(dados) : ''

  // Confere as regras ao vivo (no servidor) enquanto o morador ajusta o cartão.
  useEffect(() => {
    if (!dados) return
    let cancelado = false
    const t = setTimeout(() => {
      apiReservas
        .validar(dados)
        .then((v) => {
          if (!cancelado) setValidacao({ chave, ok: v.ok, motivos: v.motivos })
        })
        .catch((err) => {
          if (!cancelado)
            setValidacao({ chave, ok: false, motivos: [err instanceof Error ? err.message : 'Não foi possível conferir.'] })
        })
    }, 350)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [dados, chave])

  const validacaoAtual = validacao && validacao.chave === chave ? validacao : null

  function reservarEspaco(areaId: number) {
    setErro(null)
    setAviso(null)
    setCartao({ areaId, data: '', dataTexto: '' })
  }

  function preencherManual() {
    setErro(null)
    setAviso(null)
    setCartao({ areaId: '', data: '', dataTexto: '' })
  }

  async function pedir() {
    if (!dados || !cartao) return
    setEnviando(true)
    setErro(null)
    try {
      await apiReservas.criar(dados)
      setAviso('Pedido enviado. O síndico vai analisar e você acompanha o resultado em "Minhas reservas".')
      setCartao(null)
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.')
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar(r: Reserva) {
    if (!window.confirm('Cancelar este pedido de reserva?')) return
    setErro(null)
    try {
      await apiReservas.agir(r.id, { acao: 'cancelar' })
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível cancelar.')
    }
  }

  function campo<K extends keyof Cartao>(k: K, v: Cartao[K]) {
    setCartao((c) => (c ? { ...c, [k]: v } : c))
  }

  return (
    <section className="tela" aria-labelledby="t-reservas">
      <h1 className="titulo" id="t-reservas">
        Reserve uma área comum
      </h1>
      <p className="lead">
        Escolha o espaço e a data. A reserva vale o dia inteiro, das 8h às 22h, e o síndico aprova o pedido.
      </p>

      <div className="mural" style={{ marginTop: 32 }}>
        <h2 className="subtitulo">Espaços disponíveis</h2>
        <AreasComuns areas={areas} aoReservar={reservarEspaco} />
      </div>

      <div className="linha-acao" style={{ marginTop: 24 }}>
        <button type="button" className="botao" onClick={preencherManual}>
          Nova reserva
        </button>
      </div>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24, maxWidth: 640 }}>
          {erro}
        </p>
      )}
      {aviso && (
        <p className="ok" role="status" style={{ marginTop: 24 }}>
          {aviso}
        </p>
      )}

      {cartao && (
        <div className="recibo cartao-reserva" aria-label="Confirmar reserva">
          <h2>Escolha a data</h2>
          <div className="edicao">
            <div className="campo campo--cheio">
              <label htmlFor="c-area">Área</label>
              <select
                id="c-area"
                value={cartao.areaId}
                onChange={(e) => campo('areaId', e.target.value === '' ? '' : Number(e.target.value))}
              >
                {cartao.areaId === '' && <option value="">Escolha…</option>}
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="c-data">Data</label>
              <input
                id="c-data"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                maxLength={10}
                value={cartao.dataTexto}
                aria-describedby="c-data-ajuda"
                aria-invalid={cartao.dataTexto.length === 10 && cartao.data === ''}
                onChange={(e) => {
                  const texto = mascararData(e.target.value)
                  setCartao((c) => (c ? { ...c, dataTexto: texto, data: brParaIso(texto) } : c))
                }}
              />
              <p className="ajuda" id="c-data-ajuda">
                {cartao.dataTexto.length === 10 && cartao.data === '' ? 'Essa data não existe. Use dia/mês/ano, por exemplo 24/11/2026.' : 'Dia/mês/ano, por exemplo 24/11/2026.'}
              </p>
            </div>
          </div>

          {!completo && <p className="ajuda">Escolha a área e o dia para conferir as regras. A reserva vale o dia inteiro, das 8h às 22h.</p>}
          {completo && !validacaoAtual && (
            <p className="aviso" role="status">
              <span className="pulso" aria-hidden="true" />
              Conferindo as regras.
            </p>
          )}
          {validacaoAtual && validacaoAtual.ok && (
            <p className="ok" role="status">
              Tudo certo: o dia está livre e dentro das regras.
            </p>
          )}
          {validacaoAtual && !validacaoAtual.ok && (
            <ul className="erro lista-motivos" role="alert">
              {validacaoAtual.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <div className="linha-acao">
            <button
              type="button"
              className="botao"
              disabled={enviando || !validacaoAtual?.ok}
              onClick={() => void pedir()}
            >
              {enviando ? 'Enviando…' : 'Pedir reserva'}
            </button>
            <button type="button" className="botao botao--sec" onClick={() => setCartao(null)} disabled={enviando}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {minhas !== null && (
        <div className="minhas">
          <h2 className="subtitulo">Minhas reservas (apartamento {apto})</h2>
          {minhas.length === 0 ? (
            <p className="vazio" style={{ marginTop: 16 }}>
              Você ainda não pediu nenhuma reserva.
            </p>
          ) : (
            <ul className="lista">
              {minhas.map((r) => (
                <li key={r.id} className="item item--reserva">
                  <div className="reserva-linha">
                    <div>
                      <p className="item-titulo">{r.area.nome}</p>
                      <p className="item-meta">{periodoReserva(r.inicio, r.fim)}</p>
                      {r.status === 'recusada' && r.motivoRecusa && (
                        <p className="ajuda">Motivo da recusa: {r.motivoRecusa}</p>
                      )}
                    </div>
                    <div className="item-lado">
                      <StatusReserva valor={r.status} />
                      {r.status === 'pendente' && (
                        <button type="button" className="botao botao--sec botao--mini" onClick={() => void cancelar(r)}>
                          Cancelar pedido
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
