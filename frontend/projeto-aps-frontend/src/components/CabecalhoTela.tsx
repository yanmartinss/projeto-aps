import type { ReactNode } from 'react'

interface Props {
  /** Linha pequena acima do título, como nos mocks ("Operação / Chamados"). */
  kicker?: string
  titulo: string
  texto?: string
  id: string
  /** Botões à direita do título. */
  acoes?: ReactNode
}

export function CabecalhoTela({ kicker, titulo, texto, id, acoes }: Props) {
  return (
    <header className="cabeca-tela">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="titulo" id={id}>
          {titulo}
        </h1>
        {texto && <p className="lead">{texto}</p>}
      </div>
      {acoes && <div className="cabeca-acoes">{acoes}</div>}
    </header>
  )
}
