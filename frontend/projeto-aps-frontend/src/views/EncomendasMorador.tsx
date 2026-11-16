import { useEffect, useState } from 'react'
import { apiEncomendas } from '../api'
import { CabecalhoTela } from '../components/CabecalhoTela'
import { dataHora, haQuanto } from '../format'
import type { Encomenda } from '../types'

export function EncomendasMorador({ apartamento }: { apartamento: string }) {
  const [itens, setItens] = useState<Encomenda[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    apiEncomendas
      .listar()
      .then((l) => {
        if (!cancelado) setItens(l)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar as encomendas.')
      })
    return () => {
      cancelado = true
    }
  }, [])

  const aguardando = (itens ?? []).filter((e) => e.status === 'aguardando')
  const retiradas = (itens ?? []).filter((e) => e.status === 'retirada').slice(0, 10)

  return (
    <section className="tela" aria-labelledby="t-enc-morador">
      <CabecalhoTela
        id="t-enc-morador"
        kicker={`Apartamento ${apartamento}`}
        titulo="Encomendas"
        texto="O que chegou na portaria para o seu apartamento."
      />

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24 }}>
          {erro}
        </p>
      )}

      {itens !== null && aguardando.length === 0 && !erro && <p className="vazio">Nenhuma encomenda esperando você na portaria.</p>}

      {aguardando.length > 0 && (
        <>
          <p className="aviso-pendentes" role="status" style={{ marginTop: 24 }}>
            <strong>{aguardando.length === 1 ? '1 encomenda espera' : `${aguardando.length} encomendas esperam`} você na portaria.</strong>
          </p>
          <ul className="lista">
            {aguardando.map((e) => (
              <li key={e.id} className="item item--reserva">
                <div className="reserva-linha">
                  <div>
                    <p className="item-titulo">{e.descricao ?? 'Encomenda'}</p>
                    <p className="item-meta">
                      Chegou {haQuanto(e.recebidaEm)} ({dataHora(e.recebidaEm)})
                    </p>
                  </div>
                  <div className="item-lado">
                    <span className="sts" data-s="pendente">
                      Retirar na portaria
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {retiradas.length > 0 && (
        <div className="minhas">
          <h2 className="subtitulo">Já retiradas</h2>
          <ul className="lista">
            {retiradas.map((e) => (
              <li key={e.id} className="item item--reserva">
                <div className="reserva-linha">
                  <div>
                    <p className="item-titulo">{e.descricao ?? 'Encomenda'}</p>
                    <p className="item-meta">Retirada {e.retiradaEm ? dataHora(e.retiradaEm) : ''}</p>
                  </div>
                  <div className="item-lado">
                    <span className="sts" data-s="aprovada">
                      Retirada
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
