import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { Urgencia } from '../components/Urgencia'
import { CATEGORIAS, type Ocorrencia } from '../types'

export function Registrar() {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recibo, setRecibo] = useState<Ocorrencia | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const criada = await api.criar(texto.trim())
      setRecibo(criada)
      setTexto('')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  const curto = texto.trim().length < 5

  return (
    <section className="tela" aria-labelledby="t-registrar">
      <h1 className="titulo" id="t-registrar">
        O que aconteceu no condomínio?
      </h1>
      <p className="lead">
        Conte com suas palavras. Quanto mais exato o local e o horário, mais rápido o síndico resolve.
      </p>

      <form className="form" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="relato">Relato</label>
          <textarea
            id="relato"
            value={texto}
            maxLength={2000}
            onChange={(e) => setTexto(e.target.value)}
            aria-describedby="relato-ajuda"
            placeholder="Ex.: Vazamento no teto da garagem do bloco B, molhando os carros."
          />
          <p className="ajuda" id="relato-ajuda">
            Cite o bloco ou apartamento, se souber. Até 2000 caracteres.
          </p>
        </div>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        <div className="linha-acao">
          <button className="botao" type="submit" disabled={enviando || curto}>
            {enviando ? 'Enviando…' : 'Enviar ocorrência'}
          </button>
          {enviando && (
            <p className="aviso" role="status">
              <span className="pulso" aria-hidden="true" />
              Classificando o relato. Pode levar alguns segundos.
            </p>
          )}
        </div>
      </form>

      {recibo && (
        <div className="recibo" role="status">
          <h2>Ocorrência registrada</h2>
          {recibo.classificada ? (
            <dl>
              <dt>Resumo</dt>
              <dd>{recibo.resumo}</dd>
              <dt>Categoria</dt>
              <dd>{recibo.categoria ? CATEGORIAS[recibo.categoria] : '—'}</dd>
              <dt>Urgência</dt>
              <dd>
                <Urgencia valor={recibo.urgencia} />
              </dd>
            </dl>
          ) : (
            <p className="ajuda">
              A classificação automática não funcionou desta vez. O síndico vai revisar o relato
              manualmente.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
