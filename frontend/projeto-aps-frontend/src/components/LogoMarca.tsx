/** Marca do portal: um portão em arco com uma folha no vão (o mesmo desenho do favicon). */
export function LogoMarca({ tamanho = 24 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        d="M48 224V112A80 80 0 0 1 208 112V224ZM128 190C96 176 90 134 132 70C168 118 164 168 128 190Z"
      />
    </svg>
  )
}
