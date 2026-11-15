import { useEffect, useState } from 'react'
import { api, apiComunicados, apiReservas } from '../api'
import { Icone, type NomeIcone } from '../components/Icone'
import { CartaoComunicado } from './Comunicados'
import { haQuanto, periodoReserva } from '../format'
import { STATUS, STATUS_RESERVA, type Comunicado, type OcorrenciaCompleta, type Reserva } from '../types'

interface Props {
  nome: string
  apartamento: string
  aoIr: (tela: string) => void
}

const ACOES: { tela: string; rotulo: string; texto: string; icone: NomeIcone }[] = [
  { tela: 'registrar', rotulo: 'Abrir chamado', texto: 'Manutenção ou reclamação', icone: 'alerta' },
  { tela: 'reservas', rotulo: 'Reservar espaço', texto: 'Salão, churrasqueira, quadra', icone: 'calendario' },
  { tela: 'assistente', rotulo: 'Perguntar ao assistente', texto: 'Dúvidas sobre o regimento', icone: 'conversa' },
]

export function InicioMorador({ nome, apartamento, aoIr }: Props) {
  const [comunicados, setComunicados] = useState<Comunicado[] | null>(null)
  const [minhas, setMinhas] = useState<OcorrenciaCompleta[] | null>(null)
  const [reservas, setReservas] = useState<Reserva[] | null>(null)
  const [agora] = useState(() => Date.now()) // fixo durante a visita: render puro

  useEffect(() => {
    let cancelado = false
    apiComunicados.listar().then((l) => !cancelado && setComunicados(l)).catch(() => !cancelado && setComunicados([]))
    api.minhas().then((l) => !cancelado && setMinhas(l)).catch(() => !cancelado && setMinhas([]))
    apiReservas.listar().then((l) => !cancelado && setReservas(l)).catch(() => !cancelado && setReservas([]))
    return () => {
      cancelado = true
    }
  }, [])

  const abertas = (minhas ?? []).filter((o) => o.status !== 'resolvida' && o.status !== 'cancelada')
  const proxima = (reservas ?? [])
    .filter((r) => (r.status === 'aprovada' || r.status === 'pendente') && new Date(r.fim).getTime() > agora)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0]

  return (
    <section className="tela tela--larga" aria-labelledby="t-inicio">
      <h1 className="titulo titulo--medio" id="t-inicio">
        Olá, {nome.split(' ')[0]}
      </h1>
      <p className="lead">
        Apartamento {apartamento}. Chamados, reservas e avisos do síndico ficam aqui.
      </p>

      <div className="acoes-rapidas">
        {ACOES.map((a) => (
          <button key={a.tela} type="button" onClick={() => aoIr(a.tela)}>
            <span className="acao-icone">
              <Icone nome={a.icone} tamanho={22} />
            </span>
            <span>
              <strong>{a.rotulo}</strong>
              <small>{a.texto}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="resumos">
        <section className="painel-cartao" aria-labelledby="h-minhas">
          <div className="painel-cabeca">
            <h2 id="h-minhas">Meus chamados em aberto</h2>
            <button type="button" className="link" onClick={() => aoIr('minhas')}>
              Ver todos
            </button>
          </div>
          {minhas === null ? (
            <p className="ajuda">Carregando…</p>
          ) : abertas.length === 0 ? (
            <p className="ajuda">Nenhum chamado em aberto.</p>
          ) : (
            <>
              <strong className="indicador-valor">{String(abertas.length).padStart(2, '0')}</strong>
              <p className="ajuda">
                Mais recente: {abertas[0].resumo ?? abertas[0].texto} ({STATUS[abertas[0].status].toLowerCase()}, {haQuanto(abertas[0].criadaEm)})
              </p>
            </>
          )}
        </section>

        <section className="painel-cartao" aria-labelledby="h-prox">
          <div className="painel-cabeca">
            <h2 id="h-prox">Minha próxima reserva</h2>
            <button type="button" className="link" onClick={() => aoIr('reservas')}>
              Reservas
            </button>
          </div>
          {reservas === null ? (
            <p className="ajuda">Carregando…</p>
          ) : proxima ? (
            <>
              <strong className="subtitulo">{proxima.area.nome}</strong>
              <p className="ajuda">{periodoReserva(proxima.inicio, proxima.fim)}</p>
              <span className="sts" data-s={proxima.status}>
                {STATUS_RESERVA[proxima.status]}
              </span>
            </>
          ) : (
            <p className="ajuda">Você não tem reservas marcadas.</p>
          )}
        </section>
      </div>

      <div className="mural">
        <h2 className="subtitulo">Mural de comunicados</h2>
        {comunicados === null && <p className="ajuda">Carregando…</p>}
        {comunicados && comunicados.length === 0 && <p className="vazio" style={{ marginTop: 16 }}>Nenhum comunicado por enquanto.</p>}
        {comunicados?.slice(0, 5).map((c) => <CartaoComunicado key={c.id} c={c} />)}
      </div>
    </section>
  )
}
