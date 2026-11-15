export function Chips<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: { valor: T | undefined; texto: string }[]
  valor: T | undefined
  onChange: (v: T | undefined) => void
}) {
  return (
    <div className="grupo" role="group" aria-label={rotulo}>
      <span className="rotulo" aria-hidden="true">
        {rotulo}
      </span>
      {opcoes.map((o) => (
        <button
          key={o.texto}
          type="button"
          className="chip"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
        >
          {o.texto}
        </button>
      ))}
    </div>
  )
}
