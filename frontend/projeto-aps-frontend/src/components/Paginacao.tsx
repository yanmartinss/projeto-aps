interface Props {
  total: number
  porPagina: number
  pagina: number
  aoMudar: (pagina: number) => void
  /** "pedido" / "pedidos": usado no texto "1 a 8 de 21 pedidos". */
  singular?: string
  plural?: string
}

/** Paginação simples: anterior, páginas e próxima. Não aparece quando tudo cabe em uma página. */
export function Paginacao({ total, porPagina, pagina, aoMudar, singular = 'item', plural = 'itens' }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (total <= porPagina) return null
  const de = (pagina - 1) * porPagina + 1
  const ate = Math.min(total, pagina * porPagina)

  // Mostra no máximo 5 números ao redor da página atual.
  const inicio = Math.max(1, Math.min(pagina - 2, paginas - 4))
  const numeros = Array.from({ length: Math.min(5, paginas) }, (_, i) => inicio + i)

  return (
    <nav className="paginacao" aria-label="Paginação">
      <p className="paginacao-info">
        {de} a {ate} de {total} {total === 1 ? singular : plural}
      </p>
      <div className="paginacao-botoes">
        <button type="button" className="botao botao--sec botao--mini" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
          Anterior
        </button>
        {numeros.map((n) => (
          <button
            key={n}
            type="button"
            className={n === pagina ? 'botao botao--mini' : 'botao botao--sec botao--mini'}
            aria-current={n === pagina ? 'page' : undefined}
            aria-label={`Página ${n}`}
            onClick={() => aoMudar(n)}
          >
            {n}
          </button>
        ))}
        <button type="button" className="botao botao--sec botao--mini" disabled={pagina >= paginas} onClick={() => aoMudar(pagina + 1)}>
          Próxima
        </button>
      </div>
    </nav>
  )
}
