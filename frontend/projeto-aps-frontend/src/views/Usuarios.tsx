import { useEffect, useState, type FormEvent } from 'react'
import { apiUsuarios } from '../api'
import { dataHora } from '../format'
import { PERFIS, type UsuarioAdmin } from '../types'

export function Usuarios({ meuId }: { meuId: number }) {
  const [lista, setLista] = useState<UsuarioAdmin[] | null>(null)
  const [versao, setVersao] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [criando, setCriando] = useState(false)

  const [trocandoSenha, setTrocandoSenha] = useState<number | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [ocupado, setOcupado] = useState<number | null>(null)

  useEffect(() => {
    let cancelado = false
    apiUsuarios
      .listar()
      .then((l) => {
        if (!cancelado) setLista(l)
      })
      .catch((err) => {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'Não foi possível carregar os usuários.')
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  async function criar(e: FormEvent) {
    e.preventDefault()
    setCriando(true)
    setErro(null)
    setAviso(null)
    try {
      const u = await apiUsuarios.criarFuncionario({ nome: nome.trim(), email: email.trim(), senha })
      setAviso(`Conta criada para ${u.nome}. Passe a senha provisória para ele e peça para guardá-la.`)
      setNome('')
      setEmail('')
      setSenha('')
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
    } finally {
      setCriando(false)
    }
  }

  const [linkGerado, setLinkGerado] = useState<{ id: number; url: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function gerarLink(u: UsuarioAdmin) {
    setOcupado(u.id)
    setErro(null)
    setAviso(null)
    try {
      const { token } = await apiUsuarios.linkRedefinicao(u.id)
      setLinkGerado({ id: u.id, url: `${window.location.origin}${window.location.pathname}#redefinir=${encodeURIComponent(token)}` })
      setCopiado(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar o link.')
    } finally {
      setOcupado(null)
    }
  }

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
    } catch {
      setCopiado(false) // sem permissão de área de transferência: a pessoa copia o texto manualmente
    }
  }

  async function atualizar(id: number, dados: { ativo?: boolean; senha?: string }, sucesso: string) {
    setOcupado(id)
    setErro(null)
    setAviso(null)
    try {
      await apiUsuarios.atualizar(id, dados)
      setAviso(sucesso)
      setTrocandoSenha(null)
      setNovaSenha('')
      setVersao((v) => v + 1)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section className="tela" aria-labelledby="t-usuarios">
      <h1 className="titulo" id="t-usuarios">
        Usuários do sistema
      </h1>
      <p className="lead">
        Crie as contas dos funcionários da portaria e controle quem tem acesso. Moradores criam a própria conta.
      </p>

      <form className="form" onSubmit={criar}>
        <h2 className="subtitulo">Nova conta de funcionário</h2>
        <div className="campo">
          <label htmlFor="u-nome">Nome</label>
          <input id="u-nome" type="text" value={nome} maxLength={80} required onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="u-email">E-mail</label>
          <input id="u-email" type="email" value={email} maxLength={120} required onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="u-senha">Senha provisória</label>
          <input
            id="u-senha"
            type="text"
            value={senha}
            maxLength={72}
            minLength={8}
            autoComplete="off"
            required
            onChange={(e) => setSenha(e.target.value)}
          />
          <p className="ajuda">Pelo menos 8 caracteres. Você passa essa senha ao funcionário.</p>
        </div>
        <div className="linha-acao">
          <button className="botao" type="submit" disabled={criando}>
            {criando ? 'Criando…' : 'Criar conta'}
          </button>
        </div>
      </form>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 24, maxWidth: 640 }}>
          {erro}
        </p>
      )}
      {aviso && (
        <p className="ok" role="status" style={{ marginTop: 24 }}>
          {aviso}
        </p>
      )}

      {lista && (
        <div className="minhas">
          <h2 className="subtitulo">Contas ({lista.length})</h2>
          <ul className="lista">
            {lista.map((u) => {
              const eEu = u.id === meuId
              const protegida = u.perfil === 'sindico' || eEu
              return (
                <li key={u.id} className="item item--reserva">
                  <div className="reserva-linha">
                    <div>
                      <p className="item-titulo">
                        {u.nome}
                        {eEu ? ' (você)' : ''}
                      </p>
                      <p className="item-meta">
                        {u.email}
                        {u.apartamento ? `, apartamento ${u.apartamento}` : ''}
                      </p>
                      <p className="ajuda">Criada em {dataHora(u.criadoEm)}</p>
                      {u.senhaSolicitadaEm && (
                        <p className="pedido-senha">Pediu nova senha em {dataHora(u.senhaSolicitadaEm)}</p>
                      )}
                    </div>
                    <div className="item-lado">
                      <span className="sts" data-s={u.ativo ? 'aprovada' : 'recusada'}>
                        {PERFIS[u.perfil]}, {u.ativo ? 'ativa' : 'desativada'}
                      </span>
                      {!protegida && trocandoSenha !== u.id && (
                        <div className="linha-acao">
                          <button
                            type="button"
                            className="botao botao--sec botao--mini"
                            disabled={ocupado === u.id}
                            onClick={() =>
                              void atualizar(u.id, { ativo: !u.ativo }, u.ativo ? `Conta de ${u.nome} desativada.` : `Conta de ${u.nome} reativada.`)
                            }
                          >
                            {u.ativo ? 'Desativar' : 'Reativar'}
                          </button>
                          <button
                            type="button"
                            className="botao botao--sec botao--mini"
                            disabled={ocupado === u.id}
                            onClick={() => {
                              setTrocandoSenha(u.id)
                              setNovaSenha('')
                            }}
                          >
                            Nova senha
                          </button>
                          {u.ativo && (
                            <button
                              type="button"
                              className={u.senhaSolicitadaEm ? 'botao botao--mini' : 'botao botao--sec botao--mini'}
                              disabled={ocupado === u.id}
                              onClick={() => void gerarLink(u)}
                            >
                              Gerar link de redefinição
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {linkGerado?.id === u.id && (
                    <div className="recusa" role="status">
                      <div className="campo">
                        <label htmlFor={`lk-${u.id}`}>Link para {u.nome} (vale 2 horas, uso único)</label>
                        <input id={`lk-${u.id}`} type="text" readOnly value={linkGerado.url} onFocus={(e) => e.currentTarget.select()} />
                        <p className="ajuda">Envie por mensagem ou entregue pessoalmente. Quem abrir o link escolhe a própria senha.</p>
                      </div>
                      <div className="linha-acao">
                        <button type="button" className="botao botao--mini" onClick={() => void copiar(linkGerado.url)}>
                          {copiado ? 'Copiado' : 'Copiar link'}
                        </button>
                        <button type="button" className="botao botao--sec botao--mini" onClick={() => setLinkGerado(null)}>
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}

                  {trocandoSenha === u.id && (
                    <form
                      className="recusa"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void atualizar(u.id, { senha: novaSenha }, `Senha de ${u.nome} redefinida.`)
                      }}
                    >
                      <div className="campo">
                        <label htmlFor={`ns-${u.id}`}>Nova senha provisória (mín. 8 caracteres)</label>
                        <input
                          id={`ns-${u.id}`}
                          type="text"
                          value={novaSenha}
                          minLength={8}
                          maxLength={72}
                          autoComplete="off"
                          autoFocus
                          required
                          onChange={(e) => setNovaSenha(e.target.value)}
                        />
                      </div>
                      <div className="linha-acao">
                        <button className="botao botao--mini" type="submit" disabled={novaSenha.length < 8 || ocupado === u.id}>
                          Salvar senha
                        </button>
                        <button type="button" className="botao botao--sec botao--mini" onClick={() => setTrocandoSenha(null)}>
                          Voltar
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
