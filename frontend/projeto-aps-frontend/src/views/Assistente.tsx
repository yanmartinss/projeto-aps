import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiRegimento, type Fonte } from '../api'

type Mensagem =
  | { id: number; tipo: 'usuario'; texto: string }
  | { id: number; tipo: 'assistente'; texto: string; encontrou: boolean; fontes: Fonte[] }
  | { id: number; tipo: 'erro'; texto: string }

const EXEMPLOS = [
  'Posso ter cachorro grande?',
  'Até que horas posso fazer barulho?',
  'Qual o horário de mudança?',
]

function rotuloFonte(f: Fonte): string {
  return f.artigo ?? 'Trecho do regimento'
}

export function Assistente() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const proximoId = useRef(1)

  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' })
  }, [mensagens, carregando])

  async function enviar(texto: string) {
    const limpo = texto.trim()
    if (limpo.length < 3 || carregando) return
    setMensagens((m) => [...m, { id: proximoId.current++, tipo: 'usuario', texto: limpo }])
    setPergunta('')
    setCarregando(true)
    try {
      const r = await apiRegimento.perguntar(limpo)
      setMensagens((m) => [
        ...m,
        { id: proximoId.current++, tipo: 'assistente', texto: r.resposta, encontrou: r.encontrou, fontes: r.fontes },
      ])
    } catch (err) {
      setMensagens((m) => [
        ...m,
        { id: proximoId.current++, tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível responder.' },
      ])
    } finally {
      setCarregando(false)
    }
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    void enviar(pergunta)
  }

  return (
    <section className="tela" aria-labelledby="t-assistente">
      <h1 className="titulo" id="t-assistente">
        Tire dúvidas sobre o regimento
      </h1>
      <p className="lead">
        Pergunte com suas palavras. A resposta vem do regimento do condomínio, sempre com o artigo de onde saiu.
      </p>

      <div className="chat" aria-live="polite">
        {mensagens.length === 0 && (
          <div className="exemplos">
            <p className="ajuda">Experimente perguntar:</p>
            <div className="atalhos">
              {EXEMPLOS.map((e) => (
                <button key={e} type="button" className="chip" onClick={() => void enviar(e)} disabled={carregando}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m) =>
          m.tipo === 'usuario' ? (
            <p key={m.id} className="balao balao--usuario">
              {m.texto}
            </p>
          ) : m.tipo === 'erro' ? (
            <p key={m.id} className="erro" role="alert">
              {m.texto}
            </p>
          ) : (
            <div key={m.id} className={`balao balao--assistente${m.encontrou ? '' : ' balao--vazio'}`}>
              <p>{m.texto}</p>
              {m.fontes.length > 0 && (
                <ul className="fontes">
                  {m.fontes.map((f) => (
                    <li key={f.id}>
                      <details>
                        <summary>Fonte: {rotuloFonte(f)}</summary>
                        <blockquote>{f.texto}</blockquote>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}

        {carregando && (
          <p className="aviso" role="status">
            <span className="pulso" aria-hidden="true" />
            Procurando no regimento. Pode levar alguns segundos.
          </p>
        )}
        <div ref={fim} />
      </div>

      <form className="chat-form" onSubmit={aoEnviar}>
        <label className="sr-only" htmlFor="pergunta">
          Sua pergunta
        </label>
        <input
          id="pergunta"
          type="text"
          value={pergunta}
          maxLength={500}
          autoComplete="off"
          placeholder="Ex.: Posso fazer obra no sábado?"
          onChange={(e) => setPergunta(e.target.value)}
        />
        <button className="botao" type="submit" disabled={carregando || pergunta.trim().length < 3}>
          Perguntar
        </button>
      </form>
    </section>
  )
}
