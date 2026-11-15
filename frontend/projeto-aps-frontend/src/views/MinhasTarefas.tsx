import { useEffect, useState } from 'react'
import { apiTarefas } from '../api'
import { CabecalhoTela } from '../components/CabecalhoTela'
import { Indicador } from '../components/Indicador'
import { dataCurta, dataHora } from '../format'
import { PRIORIDADES_TAREFA, STATUS_TAREFA, type StatusTarefa, type Tarefa } from '../types'

export function MinhasTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [concluindo, setConcluindo] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [agora] = useState(() => Date.now())

  useEffect(() => {
    let cancelado = false
    apiTarefas
      .minhas()
      .then((l) => {
        if (!cancelado) setTarefas(l)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar suas atividades.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  async function mudar(t: Tarefa, status: StatusTarefa, obs?: string) {
    setOcupado(t.id)
    setErro(null)
    try {
      await apiTarefas.andamento(t.id, { status, ...(obs !== undefined ? { observacao: obs } : {}) })
      setConcluindo(null)
      setObservacao('')
      setVersao((n) => n + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível atualizar.')
    } finally {
      setOcupado(null)
    }
  }

  const atrasada = (t: Tarefa) => t.status !== 'concluida' && !!t.prazo && new Date(t.prazo).getTime() < agora
  const todas = tarefas ?? []
  const abertas = todas.filter((t) => t.status !== 'concluida')
  const concluidas = todas.filter((t) => t.status === 'concluida')

  return (
    <section className="tela tela--larga" aria-labelledby="t-minhas-tarefas">
      <CabecalhoTela
        id="t-minhas-tarefas"
        kicker="Operação / Minha rotina"
        titulo="Minhas atividades"
        texto="O que o síndico pediu para você fazer. Marque como iniciada ou concluída e deixe uma anotação se precisar."
      />

      <div className="indicadores">
        <Indicador rotulo="Para fazer" valor={todas.filter((t) => t.status === 'pendente').length} nota="Ainda não iniciadas" icone="relogio" />
        <Indicador rotulo="Em andamento" valor={todas.filter((t) => t.status === 'em_andamento').length} nota="Você está fazendo" icone="tarefas" />
        <Indicador rotulo="Atrasadas" valor={todas.filter(atrasada).length} nota="Prazo vencido" icone="alerta" tom={todas.some(atrasada) ? 'alerta' : 'normal'} />
        <Indicador rotulo="Concluídas" valor={concluidas.length} nota="No total" icone="calendario" />
      </div>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24 }}>
          {erro}
        </p>
      )}

      {tarefas !== null && abertas.length === 0 && (
        <p className="vazio">Nenhuma atividade esperando você. Quando o síndico atribuir alguma, ela aparece aqui.</p>
      )}

      <ul className="tarefas">
        {abertas.map((t) => (
          <li key={t.id} className={`tarefa tarefa--${t.status}`}>
            <div className="tarefa-corpo">
              <div className="tarefa-tags">
                <span className={`etiqueta prio prio--${t.prioridade}`}>Prioridade {PRIORIDADES_TAREFA[t.prioridade].toLowerCase()}</span>
                <span className="sts" data-s={t.status === 'pendente' ? 'pendente' : 'neutro'}>
                  {STATUS_TAREFA[t.status]}
                </span>
                {atrasada(t) && <span className="sts" data-s="recusada">Atrasada</span>}
              </div>
              <h3>{t.titulo}</h3>
              {t.descricao && <p>{t.descricao}</p>}
              <p className="ajuda">
                Pedido por {t.criadaPor.nome}
                {t.prazo ? `, prazo ${dataCurta(t.prazo)}` : ', sem prazo'}
              </p>
              {t.observacao && <p className="obs"><strong>Sua anotação:</strong> {t.observacao}</p>}

              {concluindo === t.id && (
                <form
                  className="recusa"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void mudar(t, 'concluida', observacao.trim())
                  }}
                >
                  <div className="campo">
                    <label htmlFor={`obs-${t.id}`}>Anotação (opcional)</label>
                    <input id={`obs-${t.id}`} type="text" value={observacao} maxLength={500} autoFocus placeholder="Ex.: Cloro ajustado, piscina liberada." onChange={(e) => setObservacao(e.target.value)} />
                  </div>
                  <div className="linha-acao">
                    <button className="botao botao--mini" type="submit" disabled={ocupado === t.id}>
                      Confirmar conclusão
                    </button>
                    <button type="button" className="botao botao--sec botao--mini" onClick={() => setConcluindo(null)}>
                      Voltar
                    </button>
                  </div>
                </form>
              )}
            </div>
            {concluindo !== t.id && (
              <div className="tarefa-acoes">
                {t.status === 'pendente' && (
                  <button type="button" className="botao botao--sec botao--mini" disabled={ocupado === t.id} onClick={() => void mudar(t, 'em_andamento')}>
                    Iniciar
                  </button>
                )}
                <button
                  type="button"
                  className="botao botao--mini"
                  disabled={ocupado === t.id}
                  onClick={() => {
                    setConcluindo(t.id)
                    setObservacao(t.observacao ?? '')
                  }}
                >
                  Concluir
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {concluidas.length > 0 && (
        <div className="mural">
          <h2 className="subtitulo">Concluídas ({concluidas.length})</h2>
          <ul className="tarefas">
            {concluidas.map((t) => (
              <li key={t.id} className="tarefa tarefa--concluida">
                <div className="tarefa-corpo">
                  <h3>{t.titulo}</h3>
                  <p className="ajuda">Concluída em {t.concluidaEm ? dataHora(t.concluidaEm) : '—'}</p>
                  {t.observacao && <p className="obs"><strong>Sua anotação:</strong> {t.observacao}</p>}
                </div>
                <div className="tarefa-acoes">
                  <button type="button" className="botao botao--sec botao--mini" disabled={ocupado === t.id} onClick={() => void mudar(t, 'pendente')}>
                    Reabrir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
