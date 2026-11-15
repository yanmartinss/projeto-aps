import { useEffect, useRef } from 'react'

interface Props {
  titulo: string
  texto: string
  confirmar: string
  cancelar: string
  aoConfirmar: () => void
  aoCancelar: () => void
}

/** Pergunta antes de uma ação que o usuário pode não querer (ex.: sair). Esc e clique fora cancelam. */
export function Confirmacao({ titulo, texto, confirmar, cancelar, aoConfirmar, aoCancelar }: Props) {
  const botaoCancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // O foco começa em "cancelar": apertar Enter sem querer não faz a ação.
    botaoCancelar.current?.focus()
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aoCancelar])

  return (
    <>
      <div className="dialogo-veu" onClick={aoCancelar} aria-hidden="true" />
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dlg-titulo" aria-describedby="dlg-texto">
        <h2 id="dlg-titulo">{titulo}</h2>
        <p id="dlg-texto">{texto}</p>
        <div className="dialogo-acoes">
          <button type="button" ref={botaoCancelar} className="botao botao--sec" onClick={aoCancelar}>
            {cancelar}
          </button>
          <button type="button" className="botao" onClick={aoConfirmar}>
            {confirmar}
          </button>
        </div>
      </div>
    </>
  )
}
