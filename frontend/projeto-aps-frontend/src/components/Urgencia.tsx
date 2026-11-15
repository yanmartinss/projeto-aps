import { URGENCIAS, type Urgencia as TUrgencia } from '../types'

export function Urgencia({ valor }: { valor: TUrgencia | null }) {
  return (
    <span className="urg" data-u={valor ?? 'nenhuma'}>
      {valor ? `Urgência ${URGENCIAS[valor].toLowerCase()}` : 'Sem classificação'}
    </span>
  )
}
