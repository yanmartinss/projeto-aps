import { useMemo, useState } from 'react'
import { periodoReserva } from '../format'
import type { Reserva } from '../types'

const FUSO = 'America/Sao_Paulo'
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** "2026-11-21" no fuso de Brasília. */
const chaveDoDia = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: FUSO })

function hora(iso: string): string {
  const [h, m] = new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false }).split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function CalendarioReservas({ reservas }: { reservas: Reserva[] }) {
  const hoje = chaveDoDia(new Date())
  const [ano0, mes0] = hoje.split('-').map(Number)
  const [vista, setVista] = useState({ ano: ano0, mes: mes0 - 1 }) // mes: 0 a 11
  const [selecionado, setSelecionado] = useState<string | null>(hoje)

  const porDia = useMemo(() => {
    const mapa = new Map<string, Reserva[]>()
    for (const r of reservas) {
      if (r.status !== 'pendente' && r.status !== 'aprovada') continue
      const k = chaveDoDia(r.inicio)
      mapa.set(k, [...(mapa.get(k) ?? []), r])
    }
    for (const lista of mapa.values()) lista.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    return mapa
  }, [reservas])

  // Contas de calendário puras (sem fuso): dia da semana do dia 1 e quantidade de dias do mês.
  const primeiro = new Date(Date.UTC(vista.ano, vista.mes, 1)).getUTCDay()
  const total = new Date(Date.UTC(vista.ano, vista.mes + 1, 0)).getUTCDate()
  const celulas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  while (celulas.length % 7 !== 0) celulas.push(null)

  const chave = (dia: number) => `${vista.ano}-${String(vista.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  const nomeBruto = new Date(Date.UTC(vista.ano, vista.mes, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const nomeMes = nomeBruto.charAt(0).toUpperCase() + nomeBruto.slice(1) // só a primeira letra: "Novembro de 2026"

  function mover(delta: number) {
    const d = new Date(Date.UTC(vista.ano, vista.mes + delta, 1))
    setVista({ ano: d.getUTCFullYear(), mes: d.getUTCMonth() })
    setSelecionado(null)
  }

  const doDia = selecionado ? (porDia.get(selecionado) ?? []) : []

  return (
    <div className="calendario">
      <div className="calendario-cab">
        <h2 className="subtitulo">{nomeMes}</h2>
        <div className="linha-acao">
          <button type="button" className="botao botao--sec botao--mini" onClick={() => mover(-1)} aria-label="Mês anterior">
            Anterior
          </button>
          <button
            type="button"
            className="botao botao--sec botao--mini"
            onClick={() => {
              setVista({ ano: ano0, mes: mes0 - 1 })
              setSelecionado(hoje)
            }}
          >
            Hoje
          </button>
          <button type="button" className="botao botao--sec botao--mini" onClick={() => mover(1)} aria-label="Próximo mês">
            Próximo
          </button>
        </div>
      </div>

      <div className="legenda">
        <span>
          <i className="ponto ponto--pendente" /> Pendente
        </span>
        <span>
          <i className="ponto ponto--aprovada" /> Aprovada
        </span>
      </div>

      <div className="cal-grade" role="grid" aria-label={`Calendário de ${nomeMes}`}>
        {DIAS.map((d) => (
          <div key={d} className="cal-dia-semana" role="columnheader">
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`v${i}`} className="cal-celula cal-celula--vazia" role="gridcell" />
          const k = chave(dia)
          const eventos = porDia.get(k) ?? []
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              className={`cal-celula${k === hoje ? ' cal-celula--hoje' : ''}${k === selecionado ? ' cal-celula--sel' : ''}`}
              aria-label={`${dia} de ${nomeMes}, ${eventos.length === 0 ? 'sem reservas' : `${eventos.length} ${eventos.length === 1 ? 'reserva' : 'reservas'}`}`}
              aria-pressed={k === selecionado}
              onClick={() => setSelecionado(k)}
            >
              <span className="cal-num">{dia}</span>
              {eventos.slice(0, 2).map((r) => (
                <span key={r.id} className={`cal-evento cal-evento--${r.status}`}>
                  {hora(r.inicio)} {r.area.nome.split(' ')[0]}
                </span>
              ))}
              {eventos.length > 2 && <span className="cal-mais">+{eventos.length - 2}</span>}
            </button>
          )
        })}
      </div>

      <div className="cal-dia-detalhe" aria-live="polite">
        {selecionado ? (
          doDia.length === 0 ? (
            <p className="ajuda">Nenhuma reserva neste dia.</p>
          ) : (
            <ul className="linhas">
              {doDia.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>
                      {r.area.nome}, apartamento {r.apartamento}
                    </strong>
                    <small>
                      {periodoReserva(r.inicio, r.fim)}, {r.status === 'pendente' ? 'aguardando aprovação' : 'aprovada'}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="ajuda">Escolha um dia para ver as reservas.</p>
        )}
      </div>
    </div>
  )
}
