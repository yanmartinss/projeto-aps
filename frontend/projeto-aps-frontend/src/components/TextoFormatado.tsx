import type { ReactNode } from 'react'

/** Renderiza o texto da IA (negrito com ** e listas com * ou -) sem usar HTML cru. */
function inline(texto: string): ReactNode[] {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((parte, i) =>
      parte.startsWith('**') && parte.endsWith('**') ? (
        <strong key={i}>{parte.slice(2, -2)}</strong>
      ) : (
        parte
      ),
    )
}

export function TextoFormatado({ texto }: { texto: string }) {
  const blocos: ReactNode[] = []
  let itens: string[] = []

  const fecharLista = () => {
    if (itens.length === 0) return
    const copia = itens
    blocos.push(
      <ul key={`ul-${blocos.length}`}>
        {copia.map((t, i) => (
          <li key={i}>{inline(t)}</li>
        ))}
      </ul>,
    )
    itens = []
  }

  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim()
    const item = linha.match(/^[*-]\s+(.*)$/)
    if (item) {
      itens.push(item[1])
      continue
    }
    fecharLista()
    if (linha) blocos.push(<p key={`p-${blocos.length}`}>{inline(linha)}</p>)
  }
  fecharLista()

  return <>{blocos}</>
}
