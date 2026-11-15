import fachada from '../assets/condominio-entrada.jpg'
import { CONDOMINIO } from '../condominio'

/** Foto do condomínio no login. Para trocar, substitua src/assets/condominio-entrada.jpg. */
export function FachadaCondominio() {
  return <img className="fachada-foto" src={fachada} alt={`Entrada do ${CONDOMINIO} ao entardecer`} />
}
