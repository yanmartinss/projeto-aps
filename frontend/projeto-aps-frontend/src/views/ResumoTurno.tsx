import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { TextoFormatado } from '../components/TextoFormatado'
import { brParaDataHora, dataHora, dataHoraBr, mascararDataHora } from '../format'

function ultimasHoras(h: number): [Date, Date] {
  const fim = new Date()
  return [new Date(fim.getTime() - h * 3600_000), fim]
}

function desdeMeiaNoite(): [Date, Date] {
  const fim = new Date()
  const ini = new Date(fim)
  ini.setHours(0, 0, 0, 0)
  return [ini, fim]
}

interface Resultado {
  total: number
  resumo: string
  de: string
  ate: string
}

export function ResumoTurno() {
  const [[ini0, fim0]] = useState(() => ultimasHoras(8))
  const [inicio, setInicio] = useState(dataHoraBr(ini0))
  const [fim, setFim] = useState(dataHoraBr(fim0))
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  function aplicar([a, b]: [Date, Date]) {
    setInicio(dataHoraBr(a))
    setFim(dataHoraBr(b))
  }

  async function gerar(e: FormEvent) {
    e.preventDefault()
    const de = brParaDataHora(inicio)
    const ate = brParaDataHora(fim)
    if (!de || !ate) {
      setErro('Digite início e fim no formato dd/mm/aaaa hh:mm, por exemplo 24/11/2026 18:30.')
      return
    }
    if (!(de < ate)) {
      setErro('O início precisa ser anterior ao fim do período.')
      return
    }
    setGerando(true)
    setErro(null)
    try {
      const r = await api.resumirTurno(de, ate)
      setResultado({ ...r, de: de.toISOString(), ate: ate.toISOString() })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar o resumo.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <section className="tela" aria-labelledby="t-turno">
      <h1 className="titulo" id="t-turno">
        Passagem de turno
      </h1>
      <p className="lead">Escolha o período e gere um relatório do que aconteceu e do que ficou pendente.</p>

      <form className="periodo" onSubmit={gerar}>
        <div className="atalhos" role="group" aria-label="Períodos prontos">
          <button type="button" className="chip" onClick={() => aplicar(ultimasHoras(8))}>
            Últimas 8 horas
          </button>
          <button type="button" className="chip" onClick={() => aplicar(ultimasHoras(24))}>
            Últimas 24 horas
          </button>
          <button type="button" className="chip" onClick={() => aplicar(desdeMeiaNoite())}>
            Hoje
          </button>
        </div>
        <div className="periodo-campos">
          <div className="campo">
            <label htmlFor="ini">Início</label>
            <input id="ini" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa hh:mm" maxLength={16} value={inicio} onChange={(e) => setInicio(mascararDataHora(e.target.value))} required />
          </div>
          <div className="campo">
            <label htmlFor="fim">Fim</label>
            <input id="fim" type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa hh:mm" maxLength={16} value={fim} onChange={(e) => setFim(mascararDataHora(e.target.value))} required />
          </div>
        </div>

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}

        <div className="linha-acao">
          <button className="botao" type="submit" disabled={gerando}>
            {gerando ? 'Gerando…' : 'Gerar resumo'}
          </button>
          {gerando && (
            <p className="aviso" role="status">
              <span className="pulso" aria-hidden="true" />
              Lendo as ocorrências do período.
            </p>
          )}
        </div>
      </form>

      {resultado && (
        <article className="relatorio" aria-label="Resumo do turno">
          <p className="relatorio-cab">
            {resultado.total} {resultado.total === 1 ? 'ocorrência' : 'ocorrências'} entre {dataHora(resultado.de)} e{' '}
            {dataHora(resultado.ate)}
          </p>
          <TextoFormatado texto={resultado.resumo} />
        </article>
      )}
    </section>
  )
}
