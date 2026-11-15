import { useEffect, useState, type FormEvent } from 'react'
import { apiComunicados } from '../api'
import { haQuanto } from '../format'
import { CATEGORIAS_COMUNICADO, type CategoriaComunicado, type Comunicado } from '../types'

export function CartaoComunicado({ c, aoApagar }: { c: Comunicado; aoApagar?: () => void }) {
  return (
    <article className="comunicado" data-c={c.categoria}>
      <header>
        <span className="etiqueta etiqueta--c">{CATEGORIAS_COMUNICADO[c.categoria]}</span>
        <small>
          {c.autor.nome}, {haQuanto(c.criadoEm)}
        </small>
      </header>
      <h3>{c.titulo}</h3>
      <p>{c.texto}</p>
      {aoApagar && (
        <button type="button" className="botao botao--sec botao--mini" onClick={aoApagar}>
          Apagar
        </button>
      )}
    </article>
  )
}

export function Comunicados({ souSindico }: { souSindico: boolean }) {
  const [lista, setLista] = useState<Comunicado[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  const [instrucao, setInstrucao] = useState('')
  const [gerando, setGerando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState<CategoriaComunicado>('aviso')
  const [rascunhoIA, setRascunhoIA] = useState(false)
  const [publicando, setPublicando] = useState(false)

  useEffect(() => {
    let cancelado = false
    apiComunicados
      .listar()
      .then((l) => {
        if (!cancelado) setLista(l)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar os comunicados.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  async function gerarRascunho(e: FormEvent) {
    e.preventDefault()
    setGerando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await apiComunicados.rascunho(instrucao.trim())
      setTitulo(r.titulo)
      setTexto(r.texto)
      setCategoria(r.categoria)
      setRascunhoIA(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar o rascunho.')
    } finally {
      setGerando(false)
    }
  }

  async function publicar(e: FormEvent) {
    e.preventDefault()
    setPublicando(true)
    setErro(null)
    setAviso(null)
    try {
      await apiComunicados.publicar({ titulo: titulo.trim(), texto: texto.trim(), categoria })
      setAviso('Comunicado publicado. Os moradores já veem no mural.')
      setTitulo('')
      setTexto('')
      setInstrucao('')
      setRascunhoIA(false)
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível publicar.')
    } finally {
      setPublicando(false)
    }
  }

  async function apagar(c: Comunicado) {
    if (!window.confirm(`Apagar o comunicado "${c.titulo}"?`)) return
    try {
      await apiComunicados.apagar(c.id)
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível apagar.')
    }
  }

  const faltaPreencher = texto.includes('[informar')

  return (
    <section className="tela" aria-labelledby="t-comunicados">
      <h1 className="titulo titulo--medio" id="t-comunicados">
        {souSindico ? 'Comunicados' : 'Mural de comunicados'}
      </h1>
      <p className="lead">
        {souSindico
          ? 'Publique avisos para os moradores. A IA pode escrever o primeiro rascunho a partir de uma frase sua.'
          : 'Avisos oficiais do síndico para os moradores.'}
      </p>

      {souSindico && (
        <div className="duas-colunas">
          <form className="form" onSubmit={gerarRascunho}>
            <h2 className="subtitulo">Rascunho com IA</h2>
            <div className="campo">
              <label htmlFor="instrucao">O que o aviso deve dizer?</label>
              <input
                id="instrucao"
                type="text"
                value={instrucao}
                maxLength={300}
                placeholder="Ex.: água cortada na sexta, das 9h às 14h, por manutenção da caixa d'água"
                onChange={(e) => setInstrucao(e.target.value)}
              />
            </div>
            <div className="linha-acao">
              <button className="botao botao--sec" type="submit" disabled={gerando || instrucao.trim().length < 5}>
                {gerando ? 'Escrevendo…' : 'Gerar rascunho'}
              </button>
              {gerando && (
                <p className="aviso" role="status">
                  <span className="pulso" aria-hidden="true" />
                  A IA está escrevendo o aviso.
                </p>
              )}
            </div>
          </form>

          <form className="form" onSubmit={publicar}>
            <h2 className="subtitulo">Novo comunicado</h2>
            {rascunhoIA && <p className="nota">Rascunho escrito pela IA. Leia e corrija antes de publicar.</p>}
            {faltaPreencher && <p className="erro">O rascunho tem trechos entre colchetes para você completar.</p>}
            <div className="campo">
              <label htmlFor="c-titulo">Título</label>
              <input id="c-titulo" type="text" value={titulo} maxLength={120} required onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="c-texto">Texto</label>
              <textarea id="c-texto" value={texto} maxLength={2000} required style={{ minHeight: 120 }} onChange={(e) => setTexto(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="c-cat">Tipo</label>
              <select id="c-cat" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaComunicado)}>
                {Object.entries(CATEGORIAS_COMUNICADO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="linha-acao">
              <button className="botao" type="submit" disabled={publicando || faltaPreencher || titulo.trim().length < 3 || texto.trim().length < 10}>
                {publicando ? 'Publicando…' : 'Publicar comunicado'}
              </button>
            </div>
          </form>
        </div>
      )}

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

      <div className="mural">
        <h2 className="subtitulo">{souSindico ? 'Publicados' : 'Avisos recentes'}</h2>
        {lista && lista.length === 0 && <p className="vazio" style={{ marginTop: 16 }}>Nenhum comunicado publicado até agora.</p>}
        {lista?.map((c) => <CartaoComunicado key={c.id} c={c} aoApagar={souSindico ? () => void apagar(c) : undefined} />)}
      </div>
    </section>
  )
}
