import { useEffect, useState } from 'react'
import { servidorNoAr } from '../api'

/** Cartão "Status do sistema" da barra lateral: confere de verdade se o servidor responde. */
export function StatusSistema() {
  const [noAr, setNoAr] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelado = false
    const conferir = () =>
      servidorNoAr().then((ok) => {
        if (!cancelado) setNoAr(ok)
      })
    void conferir()
    const t = setInterval(() => void conferir(), 30_000)
    return () => {
      cancelado = true
      clearInterval(t)
    }
  }, [])

  return (
    <div className="status-sistema" role="status">
      <span className="rotulo">Status do sistema</span>
      <span className="status-linha">
        <i className={`ponto-status ponto-status--${noAr === null ? 'espera' : noAr ? 'ok' : 'erro'}`} />
        {noAr === null ? 'Conferindo…' : noAr ? 'Servidor conectado' : 'Sem conexão com o servidor'}
      </span>
    </div>
  )
}
