import { useEffect, useState, type FormEvent } from 'react'
import { apiEncomendas } from '../api'
import { CabecalhoTela } from '../components/CabecalhoTela'
import { Chips } from '../components/Chips'
import { Paginacao } from '../components/Paginacao'
import { dataHora, haQuanto } from '../format'
import type { Encomenda, StatusEncomenda } from '../types'

const POR_PAGINA = 10

export function EncomendasFuncionario({ meuId }: { meuId: number }) {
  const [itens, setItens] = useState<Encomenda[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; alerta: boolean } | null>(null)
  const [versao, setVersao] = useState(0)
  const [filtro, setFiltro] = useState<StatusEncomenda | undefined>('aguardando')
  const [pagina, setPagina] = useState(1)

  const [apartamento, setApartamento] = useState('')
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ocupado, setOcupado] = useState<number | null>(null)

  useEffect(() => {
    let cancelado = false
    apiEncomendas
      .listar()
      .then((l) => {
        if (!cancelado) {
          setItens(l)
          setErro(null)
        }
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar as encomendas.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  async function registrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await apiEncomendas.criar({ apartamento: apartamento.trim(), descricao: descricao.trim() || undefined })
      setAviso(
        r.moradoresNoApartamento === 0
          ? { texto: `Encomenda registrada para o apartamento ${r.apartamento}, mas ainda não há morador cadastrado lá. Quem criar a conta nesse apartamento vai ver o aviso.`, alerta: true }
          : { texto: `Encomenda registrada para o apartamento ${r.apartamento}. O morador já recebe o aviso.`, alerta: false },
      )
      setApartamento('')
      setDescricao('')
      setFiltro('aguardando')
      setPagina(1)
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar a encomenda.')
    } finally {
      setEnviando(false)
    }
  }

  async function agir(e: Encomenda, acao: 'retirar' | 'apagar') {
    if (acao === 'apagar' && !window.confirm(`Apagar o registro da encomenda do apartamento ${e.apartamento}?`)) return
    setOcupado(e.id)
    setErro(null)
    setAviso(null)
    try {
      if (acao === 'retirar') await apiEncomendas.retirar(e.id)
      else await apiEncomendas.apagar(e.id)
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir.')
    } finally {
      setOcupado(null)
    }
  }

  const todas = itens ?? []
  const aguardando = todas.filter((e) => e.status === 'aguardando').length
  const lista = todas.filter((e) => !filtro || e.status === filtro)
  const ultima = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const pag = Math.min(pagina, ultima)
  const daPagina = lista.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  return (
    <section className="tela tela--larga" aria-labelledby="t-encomendas">
      <CabecalhoTela
        id="t-encomendas"
        kicker="Portaria"
        titulo="Encomendas"
        texto="Registre o que chegou e para qual apartamento. O morador desse apartamento vê o aviso na hora."
      />

      <form className="form form-encomenda" onSubmit={registrar}>
        <h2 className="subtitulo">Registrar encomenda que chegou</h2>
        <div className="grade-encomenda">
          <div className="campo">
            <label htmlFor="enc-apto">Apartamento</label>
            <input id="enc-apto" type="text" value={apartamento} maxLength={20} placeholder="304" required onChange={(e) => setApartamento(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="enc-desc">O que chegou (opcional)</label>
            <input id="enc-desc" type="text" value={descricao} maxLength={200} placeholder="Ex.: caixa média da Shopee, envelope dos Correios" onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <div className="linha-acao">
          <button className="botao" type="submit" disabled={enviando || apartamento.trim() === ''}>
            {enviando ? 'Registrando…' : 'Registrar encomenda'}
          </button>
        </div>
      </form>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24 }}>
          {erro}
        </p>
      )}
      {aviso && (
        <p className={aviso.alerta ? 'nota' : 'ok'} role="status" style={{ marginTop: 24 }}>
          {aviso.texto}
        </p>
      )}

      <h2 className="subtitulo" style={{ marginTop: 40 }}>
        Na portaria {itens !== null && `(${aguardando} aguardando retirada)`}
      </h2>
      <div className="filtros" style={{ marginTop: 16 }}>
        <Chips<StatusEncomenda>
          rotulo="Mostrar"
          valor={filtro}
          onChange={(v) => {
            setFiltro(v)
            setPagina(1)
          }}
          opcoes={[
            { valor: 'aguardando', texto: 'Aguardando retirada' },
            { valor: 'retirada', texto: 'Retiradas' },
            { valor: undefined, texto: 'Todas' },
          ]}
        />
      </div>

      {itens !== null && lista.length === 0 && !erro && (
        <p className="vazio">{filtro === 'aguardando' ? 'Nenhuma encomenda esperando retirada.' : 'Nenhuma encomenda com esse filtro.'}</p>
      )}

      {lista.length > 0 && (
        <>
          <div className="tabela-rolagem">
            <table className="tabela tabela-reservas">
              <thead>
                <tr>
                  <th>Apto</th>
                  <th>O que chegou</th>
                  <th>Chegou</th>
                  <th>Registrada por</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {daPagina.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.apartamento}</strong>
                    </td>
                    <td>{e.descricao ?? <span className="ajuda">Sem descrição</span>}</td>
                    <td>
                      {dataHora(e.recebidaEm)}
                      <p className="ajuda">{haQuanto(e.recebidaEm)}</p>
                    </td>
                    <td>{e.registradaPor.nome}</td>
                    <td>
                      {e.status === 'aguardando' ? (
                        <div className="linha-acao">
                          <button type="button" className="botao botao--aprovar botao--tabela" disabled={ocupado === e.id} onClick={() => void agir(e, 'retirar')}>
                            Marcar como retirada
                          </button>
                          {e.registradaPor.id === meuId && (
                            <button type="button" className="botao botao--sec botao--tabela" disabled={ocupado === e.id} onClick={() => void agir(e, 'apagar')}>
                              Apagar
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="sts" data-s="aprovada">
                          Retirada {e.retiradaEm ? dataHora(e.retiradaEm) : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao total={lista.length} porPagina={POR_PAGINA} pagina={pag} aoMudar={setPagina} singular="encomenda" plural="encomendas" />
        </>
      )}
    </section>
  )
}
