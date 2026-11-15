import { useState, type ReactNode } from 'react'
import { PERFIS, type Usuario } from '../types'
import { Confirmacao } from './Confirmacao'
import { Icone, type NomeIcone } from './Icone'
import { LogoMarca } from './LogoMarca'
import { Notificacoes } from './Notificacoes'
import { StatusSistema } from './StatusSistema'

export interface ItemMenu {
  id: string
  rotulo: string
  icone: NomeIcone
  /** Título do grupo no menu lateral ("Operação", "Administração"). */
  grupo?: string
}

interface Props {
  usuario: Usuario
  itens: ItemMenu[]
  ativo: string
  aoIr: (id: string) => void
  aoSair: () => void
  /** "lateral" para síndico e funcionário; "topo" para o morador. */
  modo: 'lateral' | 'topo'
  condominio: string
  /** Campo de busca (só o síndico). */
  busca?: ReactNode
  children: ReactNode
}

function Marca() {
  return (
    <span className="marca-app">
      <span className="marca-icone" aria-hidden="true">
        <LogoMarca tamanho={30} />
      </span>
      <span className="marca-texto">
        <strong>Condomínio</strong>
        <small>Gestão e ocorrências</small>
      </span>
    </span>
  )
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export function Casca({ usuario, itens, ativo, aoIr, aoSair, modo, condominio, busca, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  function ir(id: string) {
    setMenuAberto(false)
    aoIr(id)
  }

  const botao = (i: ItemMenu) => (
    <button key={i.id} type="button" className="nav-item" aria-current={ativo === i.id ? 'page' : undefined} onClick={() => ir(i.id)}>
      <Icone nome={i.icone} />
      <span>{i.rotulo}</span>
    </button>
  )

  // Itens agrupados, na ordem em que aparecem.
  const grupos: { titulo?: string; itens: ItemMenu[] }[] = []
  for (const i of itens) {
    const g = grupos.at(-1)
    if (g && g.titulo === i.grupo) g.itens.push(i)
    else grupos.push({ titulo: i.grupo, itens: [i] })
  }

  return (
    <div className={`casca casca--${modo}`}>
      {modo === 'lateral' && (
        <aside className={`lateral${menuAberto ? ' lateral--aberta' : ''}`} aria-label="Menu principal">
          <div className="lateral-topo">
            <Marca />
          </div>
          <nav className="nav-lateral">
            {grupos.map((g, idx) => (
              <div key={g.titulo ?? idx} className="nav-grupo">
                {g.titulo && <p className="nav-grupo-titulo">{g.titulo}</p>}
                {g.itens.map(botao)}
              </div>
            ))}
          </nav>
          <div className="lateral-rodape">
            <StatusSistema />
          </div>
        </aside>
      )}

      <div className="casca-direita">
        <header className="barra">
          {modo === 'lateral' ? (
            <button type="button" className="menu-btn" aria-label="Abrir menu" onClick={() => setMenuAberto((v) => !v)}>
              <Icone nome="menu" />
            </button>
          ) : (
            <Marca />
          )}
          <span className="condominio" title="Condomínio">
            <Icone nome="predio" tamanho={16} />
            <span>
              {condominio}
              {usuario.apartamento ? `, apto ${usuario.apartamento}` : ''}
            </span>
          </span>
          {modo === 'topo' && (
            <nav className="nav-topo" aria-label="Menu principal">
              {itens.map(botao)}
            </nav>
          )}
          <div className="barra-meio">{busca}</div>
          <div className="barra-usuario">
            <Notificacoes aoIr={ir} />
            <span className="avatar" aria-hidden="true">
              {iniciais(usuario.nome)}
            </span>
            <span className="quem">
              <strong>{usuario.nome}</strong>
              <small>{PERFIS[usuario.perfil]}</small>
            </span>
            <button type="button" className="botao botao--sec botao--mini" onClick={() => setConfirmandoSaida(true)}>
              Sair
            </button>
          </div>
        </header>

        <main className="conteudo">{children}</main>
      </div>

      {menuAberto && <div className="veu" onClick={() => setMenuAberto(false)} aria-hidden="true" />}

      {confirmandoSaida && (
        <Confirmacao
          titulo="Sair do sistema?"
          texto="Você vai precisar entrar de novo com e-mail e senha para voltar."
          confirmar="Sim, sair"
          cancelar="Continuar logado"
          aoConfirmar={() => {
            setConfirmandoSaida(false)
            aoSair()
          }}
          aoCancelar={() => setConfirmandoSaida(false)}
        />
      )}
    </div>
  )
}
