import type { Area } from '../types'

function horas(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export function AreasComuns({ areas, aoReservar }: { areas: Area[]; aoReservar?: (id: number) => void }) {
  if (areas.length === 0) return null
  return (
    <ul className="areas">
      {areas.map((a) => (
        <li key={a.id} className="area">
          <h3>{a.nome}</h3>
          <dl>
            <dt>Funcionamento</dt>
            <dd>
              {horas(a.abre)} às {horas(a.fecha)}
            </dd>
            <dt>Duração máxima</dt>
            <dd>{horas(a.duracaoMaxMin)} por reserva</dd>
          </dl>
          {aoReservar && (
            <button type="button" className="botao botao--sec botao--mini" onClick={() => aoReservar(a.id)}>
              Reservar {a.nome.toLowerCase()}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
