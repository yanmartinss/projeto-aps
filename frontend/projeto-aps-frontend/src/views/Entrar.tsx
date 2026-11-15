import { useState, type FormEvent } from "react";
import { apiAuth, guardarToken } from "../api";
import { FachadaCondominio } from "../components/FachadaCondominio";
import { CONDOMINIO } from "../condominio";
import type { Usuario } from "../types";

type Modo = "entrar" | "cadastrar" | "esqueci" | "redefinir";

/** Link de redefinição entregue pelo síndico: https://.../#redefinir=TOKEN */
function tokenDoEndereco(): string | null {
  const h = window.location.hash;
  return h.startsWith("#redefinir=")
    ? decodeURIComponent(h.slice("#redefinir=".length))
    : null;
}

const TEXTOS: Record<Modo, { titulo: string; texto: string; botao: string }> = {
  entrar: {
    titulo: "Entre para ver seus chamados e reservas",
    texto: "Moradores, funcionários e o síndico entram por aqui.",
    botao: "Entrar",
  },
  cadastrar: {
    titulo: "Crie sua conta de morador",
    texto:
      "Use o e-mail que preferir e o número do seu apartamento. Funcionários recebem o acesso do síndico.",
    botao: "Criar conta",
  },
  esqueci: {
    titulo: "Esqueceu a senha?",
    texto:
      "Digite o e-mail da sua conta. O síndico recebe o pedido e te passa um link para criar uma senha nova.",
    botao: "Pedir nova senha",
  },
  redefinir: {
    titulo: "Escolha uma senha nova",
    texto: "Esse link vale por 2 horas e só pode ser usado uma vez.",
    botao: "Salvar senha",
  },
};

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
function InputSenha({
  id,
  value,
  onChange,
  minLength,
  autoComplete,
  "aria-describedby": descrito,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
  autoComplete: string;
  "aria-describedby"?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="senha-caixa">
      <input
        id={id}
        type={visivel ? "text" : "password"}
        value={value}
        maxLength={72}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-describedby={descrito}
        required
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="senha-olho"
        aria-pressed={visivel}
        aria-controls={id}
        onClick={() => setVisivel((v) => !v)}
      >
        {visivel ? "Ocultar" : "Mostrar"}
        <span className="sr-only"> senha</span>
      </button>
    </div>
  );
}

export function Entrar({
  aoEntrar,
  aviso,
}: {
  aoEntrar: (u: Usuario) => void;
  aviso?: string | null;
}) {
  const [token] = useState(tokenDoEndereco);
  const [modo, setModo] = useState<Modo>(token ? "redefinir" : "entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Cada tela começa limpa: o que foi digitado em "Entrar" não vai para "Criar conta" (e vice-versa).
  function trocar(m: Modo, mensagem: string | null = null) {
    if (m === modo && !mensagem) return;
    setModo(m);
    setNome("");
    setEmail("");
    setApartamento("");
    setSenha("");
    setConfirmacao("");
    setErro(null);
    setInfo(mensagem);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    if ((modo === "cadastrar" || modo === "redefinir") && senha !== confirmacao) {
      setErro("As senhas não são iguais. Digite a mesma senha nos dois campos.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      if (modo === "esqueci") {
        const r = await apiAuth.esqueciSenha(email.trim());
        setInfo(r.mensagem);
      } else if (modo === "redefinir") {
        const r = await apiAuth.redefinirSenha(token ?? "", senha);
        window.history.replaceState(null, "", window.location.pathname);
        trocar("entrar", r.mensagem);
      } else {
        const r =
          modo === "entrar"
            ? await apiAuth.login(email.trim(), senha)
            : await apiAuth.cadastrar({
                nome: nome.trim(),
                email: email.trim(),
                apartamento: apartamento.trim(),
                senha,
              });
        guardarToken(r.token);
        aoEntrar(r.usuario);
      }
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir. Tente de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const t = TEXTOS[modo];
  const comAbas = modo === "entrar" || modo === "cadastrar";
  const mostraEmail = modo !== "redefinir";
  const mostraSenha = modo !== "esqueci";

  return (
    <div className="login">
      <div className="login-imagem">
        <FachadaCondominio />
      </div>

      <header className="login-topo">
        <span className="login-nome">{CONDOMINIO}</span>
        <span className="login-sub">Gestão do condomínio</span>
      </header>

      <main className="login-miolo">
        <section className="login-form" aria-labelledby="t-entrar">
          {comAbas && (
            <div
              className="login-abas"
              role="tablist"
              aria-label="Entrar ou criar conta"
            >
              <button
                type="button"
                role="tab"
                id="aba-entrar"
                aria-selected={modo === "entrar"}
                onClick={() => trocar("entrar")}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                id="aba-cadastrar"
                aria-selected={modo === "cadastrar"}
                onClick={() => trocar("cadastrar")}
              >
                Criar conta
              </button>
            </div>
          )}

          <h1 className="login-titulo" id="t-entrar">
            {t.titulo}
          </h1>
          <p className="login-texto">{t.texto}</p>

          {(aviso || info) && (
            <p className="login-nota" role="status">
              {info ?? aviso}
            </p>
          )}

          <form
            className={
              modo === "cadastrar"
                ? "login-campos login-campos--duplo"
                : "login-campos"
            }
            onSubmit={enviar}
            role={comAbas ? "tabpanel" : undefined}
            aria-labelledby={comAbas ? `aba-${modo}` : undefined}
          >
            {modo === "cadastrar" && (
              <>
                <div className="campo-login">
                  <label htmlFor="nome">Nome completo</label>
                  <input
                    id="nome"
                    type="text"
                    value={nome}
                    maxLength={80}
                    autoComplete="name"
                    required
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="campo-login">
                  <label htmlFor="apto">Apartamento</label>
                  <input
                    id="apto"
                    type="text"
                    value={apartamento}
                    maxLength={20}
                    placeholder="304"
                    required
                    onChange={(e) => setApartamento(e.target.value)}
                  />
                </div>
              </>
            )}
            {mostraEmail && (
              <div
                className={
                  modo === "cadastrar"
                    ? "campo-login campo-login--cheio"
                    : "campo-login"
                }
              >
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  maxLength={120}
                  autoComplete="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            {mostraSenha && (
              <div className="campo-login">
                <label htmlFor="senha">
                  {modo === "redefinir" ? "Senha nova" : "Senha"}
                </label>
                <InputSenha
                  key={modo}
                  id="senha"
                  value={senha}
                  minLength={modo === "entrar" ? undefined : 8}
                  autoComplete={
                    modo === "entrar" ? "current-password" : "new-password"
                  }
                  aria-describedby={
                    modo !== "entrar" ? "dica-senha" : undefined
                  }
                  onChange={setSenha}
                />
                {modo !== "entrar" && (
                  <p className="campo-dica" id="dica-senha">
                    Pelo menos 8 caracteres.
                  </p>
                )}
              </div>
            )}
            {(modo === "cadastrar" || modo === "redefinir") && (
              <div className="campo-login">
                <label htmlFor="confirmacao">Repita a senha</label>
                <InputSenha
                  key={modo}
                  id="confirmacao"
                  value={confirmacao}
                  autoComplete="new-password"
                  onChange={setConfirmacao}
                />
              </div>
            )}

            {erro && (
              <p className="login-erro" role="alert">
                {erro}
              </p>
            )}

            <button className="login-botao" type="submit" disabled={enviando}>
              {enviando ? "Aguarde…" : t.botao}
            </button>

            {modo === "entrar" && (
              <button
                type="button"
                className="login-link"
                onClick={() => trocar("esqueci")}
              >
                Esqueci minha senha
              </button>
            )}
            {(modo === "esqueci" || modo === "redefinir") && (
              <button
                type="button"
                className="login-link"
                onClick={() => {
                  if (modo === "redefinir")
                    window.history.replaceState(
                      null,
                      "",
                      window.location.pathname,
                    );
                  trocar("entrar");
                }}
              >
                Voltar para o login
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
