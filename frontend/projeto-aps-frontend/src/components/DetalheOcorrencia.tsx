import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, apiUsuarios } from '../api'
import { dataHora, haQuanto } from '../format'
import {
  CATEGORIAS,
  PERFIS,
  STATUS,
  URGENCIAS,
  type Categoria,
  type OcorrenciaDetalhe,
  type Status,
  type Urgencia as TUrgencia,
} from '../types'
import { Icone } from './Icone'
import { Urgencia } from './Urgencia'

interface Props {
  id: number
  /** "sindico" edita e decide; "leitura" (autor ou responsável) só lê e conversa. */
  modo: 'sindico' | 'leitura'
  meuId: number
  aoFechar: () => void
  aoAlterar: () => void
}

export function DetalheOcorrencia({ id, modo, meuId, aoFechar, aoAlterar }: Props) {
  const [d, setD] = useState<OcorrenciaDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [funcionarios, setFuncionarios] = useState<{ id: number; nome: string }[]>([])
  const [status, setStatus] = useState<Status>('aberta')
  const [responsavel, setResponsavel] = useState<string>('')
  const [resumo, setResumo] = useState('')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [urgencia, setUrgencia] = useState<TUrgencia | ''>('')
  const [ocupado, setOcupado] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const fimConversa = useRef<HTMLDivElement>(null)

  const aplicar = useCallback((det: OcorrenciaDetalhe) => {
    setD(det)
    setStatus(det.status)
    setResponsavel(det.responsavelId ? String(det.responsavelId) : '')
    setResumo(det.resumo ?? '')
    setCategoria(det.categoria ?? '')
    setUrgencia(det.urgencia ?? '')
  }, [])

  useEffect(() => {
    let cancelado = false
    api
      .detalhe(id)
      .then((det) => {
        if (!cancelado) aplicar(det)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível abrir a ocorrência.')
      })
    return () => {
      cancelado = true
    }
  }, [id, aplicar])

  useEffect(() => {
    if (modo !== 'sindico') return
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
  }, [modo])

  useEffect(() => {
    fimConversa.current?.scrollIntoView({ block: 'end' })
  }, [d?.comentarios.length])

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aoFechar])

  async function recarregar() {
    aplicar(await api.detalhe(id))
    aoAlterar()
  }

  async function salvar(dados: Parameters<typeof api.atualizar>[1], sucesso: string) {
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      await api.atualizar(id, dados)
      await recarregar()
      setAviso(sucesso)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  async function cancelar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      await api.cancelar(id, motivo.trim())
      setCancelando(false)
      setMotivo('')
      await recarregar()
      setAviso('Ocorrência cancelada. O síndico vê o motivo na conversa.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível cancelar.')
    } finally {
      setOcupado(false)
    }
  }
  async function enviar(e: FormEvent) {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    setErro(null)
    try {
      await api.comentar(id, t)
      setTexto('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="gaveta-veu" onClick={aoFechar} aria-hidden="true" />
      <aside className="gaveta" role="dialog" aria-modal="true" aria-label="Detalhe da ocorrência">
        <div className="gaveta-topo">
          <span className="gaveta-num">{d ? `#${String(d.id).padStart(4, '0')}` : 'Carregando'}</span>
          <button type="button" className="icone-btn" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>

        {erro && !d && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        {d && (
          <div className="gaveta-corpo">
            <div className="gaveta-cab">
              <Urgencia valor={d.urgencia} />
              <h2>{d.resumo ?? d.texto}</h2>
              <p className="gaveta-tags">
                <span className="etiqueta">{d.categoria ? CATEGORIAS[d.categoria] : 'Sem categoria'}</span>
                <span className="etiqueta etiqueta--azul">{STATUS[d.status]}</span>
              </p>
            </div>

            <div className="gaveta-pessoas">
              <div>
                <span className="rotulo">Solicitante</span>
                <p>{d.autor?.nome ?? 'Não identificado'}</p>
                <small>{d.autor?.apartamento ? `Apartamento ${d.autor.apartamento}` : d.autor ? PERFIS[d.autor.perfil] : ''}</small>
              </div>
              <div>
                <span className="rotulo">Responsável</span>
                <p>{d.responsavel?.nome ?? 'Não atribuído'}</p>
                <small>Aberta {haQuanto(d.criadaEm)}</small>
              </div>
            </div>

            <div className="relato">
              <span className="rotulo">Descrição do chamado</span>
              <p>{d.texto}</p>
            </div>

            <section aria-label="Conversa" className="conversa">
              <h3 className="rotulo">
                Histórico e diálogo ({d.comentarios.length} {d.comentarios.length === 1 ? 'mensagem' : 'mensagens'})
              </h3>
              <ul className="mensagens">
                {d.comentarios.map((c) => (
                  <li key={c.id} className={`mensagem${c.autor.id === meuId ? ' mensagem--minha' : ''}`}>
                    <div className="mensagem-cab">
                      <strong>
                        {c.autor.nome} ({PERFIS[c.autor.perfil]})
                      </strong>
                      <time dateTime={c.criadoEm}>{dataHora(c.criadoEm)}</time>
                    </div>
                    <p>{c.texto}</p>
                  </li>
                ))}
                {d.comentarios.length === 0 && <li className="ajuda">Ainda não há mensagens. Escreva a primeira abaixo.</li>}
              </ul>
              <div ref={fimConversa} />
              <form className="resposta" onSubmit={enviar}>
                <label className="sr-only" htmlFor="msg">
                  Mensagem
                </label>
                <input
                  id="msg"
                  type="text"
                  value={texto}
                  maxLength={1000}
                  autoComplete="off"
                  placeholder={
                    modo === 'sindico'
                      ? d.autor
                        ? `Escrever para ${d.autor.nome.split(' ')[0]} (${PERFIS[d.autor.perfil].toLowerCase()})…`
                        : 'Escreva uma mensagem…'
                      : 'Escreva uma mensagem para o síndico…'
                  }
                  onChange={(e) => setTexto(e.target.value)}
                />
                <button className="botao" type="submit" disabled={enviando || texto.trim() === ''}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
              </form>
            </section>

            {erro && (
              <p className="erro" role="alert">
                {erro}
              </p>
            )}
            {aviso && (
              <p className="ok" role="status">
                {aviso}
              </p>
            )}

            {modo === 'leitura' && d.autor?.id === meuId && d.autor.perfil === 'funcionario' && (d.status === 'aberta' || d.status === 'em_analise') && (
              <section className="acoes-gaveta" aria-label="Cancelar ocorrência">
                {!cancelando ? (
                  <button type="button" className="botao botao--sec botao--mini" onClick={() => setCancelando(true)}>
                    Cancelar ocorrência
                  </button>
                ) : (
                  <form onSubmit={cancelar}>
                    <div className="campo">
                      <label htmlFor="g-motivo">Por que está cancelando?</label>
                      <input id="g-motivo" type="text" value={motivo} maxLength={300} autoFocus required minLength={3} onChange={(e) => setMotivo(e.target.value)} />
                      <p className="ajuda">Foi registrada por engano ou já se resolveu? O síndico vê o motivo na conversa.</p>
                    </div>
                    <div className="linha-acao">
                      <button type="submit" className="botao botao--mini" disabled={ocupado || motivo.trim().length < 3}>
                        {ocupado ? 'Cancelando…' : 'Confirmar cancelamento'}
                      </button>
                      <button type="button" className="botao botao--sec botao--mini" disabled={ocupado} onClick={() => setCancelando(false)}>
                        Voltar
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
            {modo === 'sindico' && (
              <section className="acoes-gaveta" aria-label="Ações do síndico">
                <div className="campo">
                  <label htmlFor="g-status">Atualizar status</label>
                  <div className="linha-acao">
                    <select id="g-status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                      {Object.entries(STATUS).map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="botao botao--mini"
                      disabled={ocupado || status === d.status}
                      onClick={() => void salvar({ status }, 'Status atualizado.')}
                    >
                      Atualizar status
                    </button>
                  </div>
                </div>

                <div className="campo">
                  <label htmlFor="g-resp">Delegar para</label>
                  <div className="linha-acao">
                    <select id="g-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                      <option value="">Sem responsável</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="botao botao--sec botao--mini"
                      disabled={ocupado || responsavel === (d.responsavelId ? String(d.responsavelId) : '')}
                      onClick={() =>
                        void salvar({ responsavelId: responsavel ? Number(responsavel) : null }, responsavel ? 'Ocorrência delegada.' : 'Responsável removido.')
                      }
                    >
                      Delegar
                    </button>
                  </div>
                  {funcionarios.length === 0 && <p className="ajuda">Não há funcionários ativos. Crie contas na tela "Usuários".</p>}
                </div>

                <details className="classificacao">
                  <summary>Corrigir resumo, categoria e urgência</summary>
                  <div className="campo">
                    <label htmlFor="g-resumo">Resumo</label>
                    <input id="g-resumo" type="text" value={resumo} maxLength={300} onChange={(e) => setResumo(e.target.value)} />
                  </div>
                  <div className="edicao">
                    <div className="campo">
                      <label htmlFor="g-cat">Categoria</label>
                      <select id="g-cat" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | '')}>
                        {categoria === '' && <option value="">Escolha…</option>}
                        {Object.entries(CATEGORIAS).map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="campo">
                      <label htmlFor="g-urg">Urgência</label>
                      <select id="g-urg" value={urgencia} onChange={(e) => setUrgencia(e.target.value as TUrgencia | '')}>
                        {urgencia === '' && <option value="">Escolha…</option>}
                        {Object.entries(URGENCIAS).map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="botao botao--sec botao--mini"
                    disabled={ocupado}
                    onClick={() =>
                      void salvar(
                        {
                          ...(resumo.trim() ? { resumo: resumo.trim() } : {}),
                          ...(categoria ? { categoria } : {}),
                          ...(urgencia ? { urgencia } : {}),
                        },
                        'Classificação salva.',
                      )
                    }
                  >
                    Salvar correções
                  </button>
                </details>
              </section>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
