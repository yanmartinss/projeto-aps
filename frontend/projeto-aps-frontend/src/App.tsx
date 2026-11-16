import { useCallback, useEffect, useState } from 'react'
import { apiAuth, definirAoExpirarSessao, lerToken, limparToken } from './api'
import { BuscaIA } from './components/BuscaIA'
import { Casca, type ItemMenu } from './components/Casca'
import { Assistente } from './views/Assistente'
import { Comunicados } from './views/Comunicados'
import { Dashboard } from './views/Dashboard'
import { CONDOMINIO } from './condominio'
import { EncomendasFuncionario } from './views/EncomendasFuncionario'
import { EncomendasMorador } from './views/EncomendasMorador'
import { Entrar } from './views/Entrar'
import { InicioMorador } from './views/InicioMorador'
import { MinhasOcorrencias } from './views/MinhasOcorrencias'
import { Ocorrencias } from './views/Ocorrencias'
import { Regimento } from './views/Regimento'
import { MinhasTarefas } from './views/MinhasTarefas'
import { Registrar } from './views/Registrar'
import { ReservasMorador } from './views/ReservasMorador'
import { ReservasSindico } from './views/ReservasSindico'
import { ResumoTurno } from './views/ResumoTurno'
import { TarefasSindico } from './views/TarefasSindico'
import { Usuarios } from './views/Usuarios'
import type { Perfil, Usuario } from './types'


const MENUS: Record<Perfil, ItemMenu[]> = {
  sindico: [
    { id: 'dashboard', rotulo: 'Dashboard', icone: 'painel', grupo: 'Operação' },
    { id: 'ocorrencias', rotulo: 'Ocorrências', icone: 'alerta', grupo: 'Operação' },
    { id: 'reservas', rotulo: 'Reservas', icone: 'calendario', grupo: 'Operação' },
    { id: 'tarefas', rotulo: 'Atividades', icone: 'tarefas', grupo: 'Operação' },
    { id: 'comunicados', rotulo: 'Comunicados', icone: 'comunicado', grupo: 'Operação' },
    { id: 'turno', rotulo: 'Passagem de turno', icone: 'relogio', grupo: 'Operação' },
    { id: 'assistente', rotulo: 'Assistente', icone: 'conversa', grupo: 'Operação' },
    { id: 'regimento', rotulo: 'Regimento', icone: 'livro', grupo: 'Administração' },
    { id: 'usuarios', rotulo: 'Usuários', icone: 'usuarios', grupo: 'Administração' },
  ],
  morador: [
    { id: 'inicio', rotulo: 'Início', icone: 'casa' },
    { id: 'registrar', rotulo: 'Registrar ocorrência', icone: 'mais' },
    { id: 'minhas', rotulo: 'Minhas ocorrências', icone: 'lista' },
    { id: 'reservas', rotulo: 'Reservas', icone: 'calendario' },
    { id: 'encomendas', rotulo: 'Encomendas', icone: 'pacote' },
    { id: 'assistente', rotulo: 'Assistente', icone: 'conversa' },
  ],
  funcionario: [
    { id: 'tarefas', rotulo: 'Minhas atividades', icone: 'tarefas', grupo: 'Operação' },
    { id: 'encomendas', rotulo: 'Encomendas', icone: 'pacote', grupo: 'Operação' },
    { id: 'registrar', rotulo: 'Registrar ocorrência', icone: 'mais', grupo: 'Operação' },
    { id: 'minhas', rotulo: 'Minhas ocorrências', icone: 'lista', grupo: 'Operação' },
    { id: 'comunicados', rotulo: 'Comunicados', icone: 'comunicado', grupo: 'Operação' },
    { id: 'turno', rotulo: 'Passagem de turno', icone: 'relogio', grupo: 'Operação' },
    { id: 'assistente', rotulo: 'Assistente', icone: 'conversa', grupo: 'Operação' },
  ],
}

/** A tela ativa fica no endereço (#ocorrencias, #reservas...), então recarregar a página mantém onde você estava. */
function telaInicial(p: Perfil): string {
  const h = window.location.hash.slice(1)
  return MENUS[p].find((i) => i.id === h)?.id ?? MENUS[p][0].id
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  // Se há um token guardado, confirma com o servidor antes de mostrar qualquer tela.
  const [verificando, setVerificando] = useState(() => lerToken() !== null && !window.location.hash.startsWith('#redefinir='))
  const [tela, setTelaEstado] = useState<string>('')
  const [avisoSessao, setAvisoSessao] = useState<string | null>(null)
  const [ocorrenciaAberta, setOcorrenciaAberta] = useState<number | null>(null)

  const aoEntrar = useCallback((u: Usuario) => {
    setAvisoSessao(null)
    setUsuario(u)
    setTelaEstado(telaInicial(u.perfil))
  }, [])

  const sair = useCallback(() => {
    limparToken()
    setUsuario(null)
    setAvisoSessao(null)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  // O servidor recusou o token (venceu, ou a conta foi desativada): volta para o login.
  useEffect(() => {
    definirAoExpirarSessao(() => {
      setUsuario(null)
      setAvisoSessao('Sua sessão terminou. Entre de novo para continuar.')
    })
    return () => definirAoExpirarSessao(null)
  }, [])

  useEffect(() => {
    if (!verificando) return
    let cancelado = false
    apiAuth
      .eu()
      .then(({ usuario: u }) => {
        if (cancelado) return
        setUsuario(u)
        setTelaEstado(telaInicial(u.perfil))
      })
      // Só o 401 apaga o token (e quem faz isso é o api.ts). Servidor fora do ar ou lento não deve deslogar.
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setVerificando(false)
      })
    return () => {
      cancelado = true
    }
  }, [verificando])

  const irPara = useCallback((t: string) => {
    setOcorrenciaAberta(null) // ao trocar de tela, o painel de detalhe fecha
    setTelaEstado(t)
    window.history.replaceState(null, '', `#${t}`)
  }, [])

  const abrirNaTela = useCallback(
    (id: number) => {
      irPara('ocorrencias')
      setOcorrenciaAberta(id)
    },
    [irPara],
  )

  if (verificando) {
    return (
      <div className="app">
        <p className="aviso" role="status" style={{ paddingTop: 48 }}>
          <span className="pulso" aria-hidden="true" />
          Carregando…
        </p>
      </div>
    )
  }

  if (!usuario) return <Entrar aoEntrar={aoEntrar} aviso={avisoSessao} />

  const itens = MENUS[usuario.perfil]
  const telaAtual = itens.some((i) => i.id === tela) ? tela : itens[0].id
  const souSindico = usuario.perfil === 'sindico'

  return (
    <Casca
      usuario={usuario}
      itens={itens}
      ativo={telaAtual}
      aoIr={irPara}
      aoSair={sair}
      modo={usuario.perfil === 'morador' ? 'topo' : 'lateral'}
      condominio={CONDOMINIO}
      busca={souSindico ? <BuscaIA aoAbrirOcorrencia={abrirNaTela} aoAbrirReservas={() => irPara('reservas')} /> : undefined}
    >
      {telaAtual === 'dashboard' && <Dashboard nome={usuario.nome} aoAbrirOcorrencia={abrirNaTela} aoIr={irPara} />}
      {telaAtual === 'ocorrencias' && <Ocorrencias meuId={usuario.id} aberto={ocorrenciaAberta} aoAbrir={setOcorrenciaAberta} />}
      {telaAtual === 'inicio' && <InicioMorador nome={usuario.nome} apartamento={usuario.apartamento ?? ''} aoIr={irPara} />}
      {telaAtual === 'registrar' && <Registrar />}
      {telaAtual === 'minhas' && <MinhasOcorrencias meuId={usuario.id} abrirRegistrar={() => irPara('registrar')} />}
      {telaAtual === 'reservas' && (souSindico ? <ReservasSindico /> : <ReservasMorador apartamento={usuario.apartamento ?? ''} />)}
      {telaAtual === 'tarefas' && (souSindico ? <TarefasSindico /> : <MinhasTarefas />)}
      {telaAtual === 'encomendas' && (usuario.perfil === 'morador' ? <EncomendasMorador apartamento={usuario.apartamento ?? ''} /> : <EncomendasFuncionario meuId={usuario.id} />)}
      {telaAtual === 'comunicados' && <Comunicados souSindico={souSindico} />}
      {telaAtual === 'turno' && <ResumoTurno />}
      {telaAtual === 'regimento' && <Regimento />}
      {telaAtual === 'usuarios' && <Usuarios meuId={usuario.id} />}
      {telaAtual === 'assistente' && <Assistente />}
    </Casca>
  )
}
