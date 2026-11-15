import { useEffect, useRef, useState } from 'react'
import { apiNotificacoes } from '../api'
import type { Aviso } from '../types'
import { Icone } from './Icone'

/** O sino da barra superior: mostra o que está esperando pela pessoa (calculado no servidor). */
export function Notificacoes({ aoIr }: { aoIr: (tela: string) => void }) {
  const [dados, setDados] = useState<{ total: number; avisos: Aviso[] } | null>(null)
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  // Carrega ao abrir e atualiza a cada minuto.
  useEffect(() => {
    let cancelado = false
    const carregar = () =>
      apiNotificacoes
        .listar()
        .then((d) => {
          if (!cancelado) setDados(d)
        })
        .catch(() => {})
    void carregar()
    const t = setInterval(() => void carregar(), 60_000)
    return () => {
      cancelado = true
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  const total = dados?.total ?? 0

  return (
    <div className="sino" ref={raiz}>
      <button
        type="button"
        className="icone-btn sino-btn"
        aria-label={total > 0 ? `Notificações: ${total} pendente${total === 1 ? '' : 's'}` : 'Notificações'}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <Icone nome="sino" />
        {total > 0 && <span className="sino-ponto" aria-hidden="true" />}
      </button>

      {aberto && (
        <div className="sino-painel" role="region" aria-label="Notificações">
          <h3>Pendências</h3>
          {dados && dados.avisos.length > 0 ? (
            <ul>
              {dados.avisos.map((a) => (
                <li key={a.texto}>
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false)
                      aoIr(a.tela)
                    }}
                  >
                    {a.texto}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ajuda">Nada pendente por enquanto.</p>
          )}
        </div>
      )}
    </div>
  )
}
