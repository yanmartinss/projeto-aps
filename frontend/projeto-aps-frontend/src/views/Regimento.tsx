import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { apiRegimento, type DocumentoRegimento } from '../api'
import { dataHora } from '../format'

export function Regimento() {
  const [docs, setDocs] = useState<DocumentoRegimento[] | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState<null | 'enviando' | 'reindexando' | 'removendo'>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    try {
      setDocs(await apiRegimento.listar())
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar o regimento.')
      setDocs([])
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    apiRegimento
      .listar()
      .then((lista) => {
        if (!cancelado) setDocs(lista)
      })
      .catch((err) => {
        if (cancelado) return
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar o regimento.')
        setDocs([])
      })
    return () => {
      cancelado = true
    }
  }, [])

  async function executar(tipo: 'enviando' | 'reindexando' | 'removendo', acao: () => Promise<string>) {
    setOcupado(tipo)
    setErro(null)
    setAviso(null)
    try {
      setAviso(await acao())
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Algo deu errado.')
    } finally {
      setOcupado(null)
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!arquivo) return
    void executar('enviando', async () => {
      const r = await apiRegimento.enviar(arquivo)
      setArquivo(null)
      if (entrada.current) entrada.current.value = ''
      return `Regimento enviado: ${r.nTrechos} trechos indexados.`
    })
  }

  const ativo = docs?.[0]

  return (
    <section className="tela" aria-labelledby="t-regimento">
      <h1 className="titulo" id="t-regimento">
        Regimento do condomínio
      </h1>
      <p className="lead">
        Envie o PDF do regimento para o assistente poder responder as dúvidas dos moradores. Enviar outro arquivo substitui o atual.
      </p>

      <form className="form" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="pdf">Arquivo PDF (até 10 MB, com texto selecionável)</label>
          <input
            id="pdf"
            ref={entrada}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="linha-acao">
          <button className="botao" type="submit" disabled={!arquivo || ocupado !== null}>
            {ocupado === 'enviando' ? 'Enviando…' : 'Enviar regimento'}
          </button>
          {ocupado === 'enviando' && (
            <p className="aviso" role="status">
              <span className="pulso" aria-hidden="true" />
              Lendo o PDF e indexando os trechos.
            </p>
          )}
        </div>
      </form>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24, maxWidth: 640 }}>
          {erro}
        </p>
      )}
      {aviso && (
        <p className="ajuda" role="status" style={{ marginTop: 24 }}>
          {aviso}
        </p>
      )}

      {docs !== null && !ativo && (
        <p className="vazio">Nenhum regimento carregado ainda. O assistente só responde depois do primeiro envio.</p>
      )}

      {ativo && (
        <div className="recibo" aria-label="Regimento ativo">
          <h2>{ativo.nome}</h2>
          <dl>
            <dt>Enviado em</dt>
            <dd>{dataHora(ativo.criadoEm)}</dd>
            <dt>Trechos</dt>
            <dd>{ativo.nTrechos}</dd>
            <dt>Modelo de busca</dt>
            <dd>{ativo.modeloEmbedding}</dd>
          </dl>
          {ativo.precisaReindexar && (
            <p className="erro" role="status">
              A configuração de busca mudou desde o envio. Reindexe para o assistente voltar a responder.
            </p>
          )}
          <div className="linha-acao">
            <button
              type="button"
              className={ativo.precisaReindexar ? 'botao' : 'botao botao--sec'}
              disabled={ocupado !== null}
              onClick={() =>
                void executar('reindexando', async () => {
                  const r = await apiRegimento.reindexar(ativo.id)
                  return `Reindexado: ${r.nTrechos} trechos.`
                })
              }
            >
              {ocupado === 'reindexando' ? 'Reindexando…' : 'Reindexar'}
            </button>
            <button
              type="button"
              className="botao botao--sec"
              disabled={ocupado !== null}
              onClick={() => {
                if (!window.confirm('Remover o regimento? O assistente deixa de responder até um novo envio.')) return
                void executar('removendo', async () => {
                  await apiRegimento.apagar(ativo.id)
                  return 'Regimento removido.'
                })
              }}
            >
              {ocupado === 'removendo' ? 'Removendo…' : 'Remover'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
