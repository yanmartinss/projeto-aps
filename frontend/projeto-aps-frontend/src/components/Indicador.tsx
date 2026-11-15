import { Icone, type NomeIcone } from './Icone'

interface Props {
  rotulo: string
  valor: number
  nota: string
  icone: NomeIcone
  /** "alerta" pinta a nota de vermelho (ex.: há urgentes). */
  tom?: 'normal' | 'alerta'
  aoClicar?: () => void
}

/** Cartão de número do painel, no estilo dos mocks: rótulo, valor grande, nota e um ícone no canto. */
export function Indicador({ rotulo, valor, nota, icone, tom = 'normal', aoClicar }: Props) {
  const conteudo = (
    <>
      <span className="indicador-topo">
        <span className="rotulo">{rotulo}</span>
        <span className="indicador-icone">
          <Icone nome={icone} tamanho={18} />
        </span>
      </span>
      <strong className="indicador-valor">{String(valor).padStart(2, '0')}</strong>
      <small className={tom === 'alerta' ? 'texto-alerta' : undefined}>{nota}</small>
    </>
  )
  return aoClicar ? (
    <button type="button" className="indicador indicador--botao" onClick={aoClicar}>
      {conteudo}
    </button>
  ) : (
    <div className="indicador">{conteudo}</div>
  )
}
