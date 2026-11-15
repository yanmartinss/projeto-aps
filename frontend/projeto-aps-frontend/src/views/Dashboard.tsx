import { useEffect, useState } from 'react'
import { apiDashboard } from '../api'
import { CabecalhoTela } from '../components/CabecalhoTela'
import { Indicador } from '../components/Indicador'
import { dataHora, haQuanto, periodoReserva } from '../format'
import { CATEGORIAS, CATEGORIAS_COMUNICADO, STATUS, type Categoria, type DashboardDados, type ResumoDoDia } from '../types'

interface Props {
  nome: string
  aoAbrirOcorrencia: (id: number) => void
  aoIr: (tela: string) => void
}

function saudacao(): string {
  const h = Number(new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function Dashboard({ nome, aoAbrirOcorrencia, aoIr }: Props) {
  const [dados, setDados] = useState<DashboardDados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ResumoDoDia | null>(null)
  const [gerando, setGerando] = useState(false)
  const [atualizar, setAtualizar] = useState(0)

  useEffect(() => {
    let cancelado = false
    apiDashboard
      .dados()
      .then((d) => {
        if (!cancelado) setDados(d)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar o painel.')
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Os números aparecem na hora; o texto da IA chega depois, sem travar a tela.
  useEffect(() => {
    let cancelado = false
    apiDashboard
      .resumo(atualizar > 0)
      .then((r) => {
        if (!cancelado) setResumo(r)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setGerando(false)
      })
    return () => {
      cancelado = true
    }
  }, [atualizar])

  const n = dados?.numeros
  const maxCategoria = Math.max(1, ...(dados?.porCategoria.map((c) => c.total) ?? [1]))

  return (
    <section className="tela tela--larga" aria-labelledby="t-dash">
      <CabecalhoTela id="t-dash" kicker="Visão geral" titulo={`${saudacao()}, ${nome.split(' ')[0]}`} texto="O que está pendente no condomínio hoje." />

      <div className="visao-geral" aria-live="polite">
        <div className="visao-geral-cab">
          <span className="rotulo">Visão geral de hoje</span>
          <span className="etiqueta etiqueta--azul">{resumo ? (resumo.origem === 'ia' ? 'Escrito pela IA' : 'Resumo automático') : 'Preparando'}</span>
          <button
            type="button"
            className="botao botao--sec botao--mini"
            disabled={gerando}
            onClick={() => {
              setGerando(true)
              setAtualizar((v) => v + 1)
            }}
          >
            {gerando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
        {resumo ? (
          <p className="visao-geral-texto">{resumo.texto}</p>
        ) : (
          <p className="aviso">
            <span className="pulso" aria-hidden="true" />
            A IA está lendo os números do dia.
          </p>
        )}
        {resumo && <small className="ajuda">Gerado às {dataHora(resumo.geradoEm)}. Os números vêm direto do sistema.</small>}
      </div>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      {n && (
        <div className="indicadores">
          <Indicador rotulo="Chamados ativos" valor={n.naoResolvidas} nota={`${n.urgentes} urgente${n.urgentes === 1 ? '' : 's'}`} tom={n.urgentes > 0 ? 'alerta' : 'normal'} icone="alerta" aoClicar={() => aoIr('ocorrencias')} />
          <Indicador rotulo="Em execução" valor={n.emExecucao} nota={`${n.emAnalise} em análise`} icone="tarefas" aoClicar={() => aoIr('ocorrencias')} />
          <Indicador rotulo="Reservas pendentes" valor={n.reservasPendentes} nota="Aguardando sua resposta" icone="relogio" aoClicar={() => aoIr('reservas')} />
          <Indicador rotulo="Reservas confirmadas" valor={n.reservasFuturas} nota="Daqui para frente" icone="calendario" aoClicar={() => aoIr('reservas')} />
        </div>
      )}

      {dados && (
        <div className="grade-dash">
          <section className="painel-cartao" aria-labelledby="h-criticas">
            <div className="painel-cabeca">
              <h2 id="h-criticas">Ocorrências críticas</h2>
              <button type="button" className="link" onClick={() => aoIr('ocorrencias')}>
                Ver todas
              </button>
            </div>
            {dados.criticas.length === 0 ? (
              <p className="ajuda">Nenhuma ocorrência urgente em aberto.</p>
            ) : (
              <ul className="linhas">
                {dados.criticas.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => aoAbrirOcorrencia(c.id)}>
                      <strong>{c.resumo}</strong>
                      <small>
                        {c.categoria ? CATEGORIAS[c.categoria as Categoria] : 'Sem categoria'}, {STATUS[c.status].toLowerCase()}, {haQuanto(c.criadaEm)}.{' '}
                        {c.responsavel ? `Responsável: ${c.responsavel}.` : 'Sem responsável.'}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="painel-cartao" aria-labelledby="h-reservas">
            <div className="painel-cabeca">
              <h2 id="h-reservas">Próximas reservas</h2>
              <button type="button" className="link" onClick={() => aoIr('reservas')}>
                Abrir calendário
              </button>
            </div>
            {dados.proximasReservas.length === 0 ? (
              <p className="ajuda">Nenhuma reserva confirmada pela frente.</p>
            ) : (
              <ul className="linhas">
                {dados.proximasReservas.map((r) => (
                  <li key={r.id}>
                    <div>
                      <strong>
                        {r.area}, apartamento {r.apartamento}
                      </strong>
                      <small>{periodoReserva(r.inicio, r.fim)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="painel-cartao" aria-labelledby="h-categorias">
            <div className="painel-cabeca">
              <h2 id="h-categorias">Ocorrências por categoria (30 dias)</h2>
            </div>
            {dados.porCategoria.length === 0 ? (
              <p className="ajuda">Sem ocorrências nos últimos 30 dias.</p>
            ) : (
              <ul className="barras">
                {dados.porCategoria.map((c) => (
                  <li key={c.categoria}>
                    <span>{CATEGORIAS[c.categoria as Categoria] ?? 'Sem categoria'}</span>
                    <span className="barra-trilho" aria-hidden="true">
                      <span className="barra-valor" style={{ width: `${(c.total / maxCategoria) * 100}%` }} />
                    </span>
                    <strong>{c.total}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="painel-cartao" aria-labelledby="h-comunicados">
            <div className="painel-cabeca">
              <h2 id="h-comunicados">Comunicados recentes</h2>
              <button type="button" className="link" onClick={() => aoIr('comunicados')}>
                Novo comunicado
              </button>
            </div>
            {dados.comunicados.length === 0 ? (
              <p className="ajuda">Nenhum comunicado publicado ainda.</p>
            ) : (
              <ul className="linhas">
                {dados.comunicados.map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{c.titulo}</strong>
                      <small>
                        {CATEGORIAS_COMUNICADO[c.categoria]}, {haQuanto(c.criadoEm)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
