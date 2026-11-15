import { STATUS_RESERVA, type StatusReserva as TStatus } from '../types'

export function StatusReserva({ valor }: { valor: TStatus }) {
  return (
    <span className="sts" data-s={valor}>
      {STATUS_RESERVA[valor]}
    </span>
  )
}
