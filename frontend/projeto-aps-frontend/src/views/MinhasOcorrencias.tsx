import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { DetalheOcorrencia } from '../components/DetalheOcorrencia'
import { Urgencia } from '../components/Urgencia'
import { haQuanto } from '../format'
import { CATEGORIAS, STATUS, type OcorrenciaCompleta } from '../types'

export function MinhasOcorrencias({ meuId, abrirRegistrar }: { meuId: number; abrirRegistrar: () => void }) {
  const [itens, setItens] = useState<OcorrenciaCompleta[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState<number | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let cancelado = false
    api
      .minhas()
      .then((l) => {
        if (!cancelado) setItens(l)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return (
    <section className="tela" aria-labelledby="t-minhas">
      <h1 className="titulo titulo--medio" id="t-minhas">
        Minhas ocorrências
      </h1>
      <p className="lead">Acompanhe o andamento dos seus chamados e converse com o síndico por aqui.</p>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24 }}>
          {erro}
        </p>
      )}

      {itens !== null && itens.length === 0 && (
        <p className="vazio">
          Você ainda não registrou nenhuma ocorrência.{' '}
          <button type="button" className="link" onClick={abrirRegistrar}>
            Registrar uma ocorrência
          </button>
        </p>
      )}

      {itens && itens.length > 0 && (
        <ul className="lista lista--cartoes">
          {itens.map((o) => (
            <li key={o.id} className="item">
              <button type="button" className="item-cab" onClick={() => setAberto(o.id)}>
                <span className="item-titulo">{o.resumo ?? o.texto}</span>
                <span className="item-lado">
                  <Urgencia valor={o.urgencia} />
                  <span className="sts" data-s={o.status === 'resolvida' ? 'aprovada' : o.status === 'cancelada' ? 'cancelada' : o.status === 'aberta' ? 'pendente' : 'neutro'}>
                    {STATUS[o.status]}
                  </span>
                </span>
                <span className="item-meta">
                  <span>{o.categoria ? CATEGORIAS[o.categoria] : 'Sem categoria'}</span>
                  <span>{o.responsavel ? `Responsável: ${o.responsavel.nome}` : 'Sem responsável ainda'}</span>
                  <span>{o._count.comentarios === 0 ? 'Sem mensagens' : `${o._count.comentarios} mensagens`}</span>
                  <time dateTime={o.criadaEm}>{haQuanto(o.criadaEm)}</time>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto !== null && <DetalheOcorrencia id={aberto} modo="leitura" meuId={meuId} aoFechar={() => setAberto(null)} aoAlterar={recarregar} />}
    </section>
  )
}
