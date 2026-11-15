/** Erro com status HTTP e mensagem pronta para o usuário final. `extras` entra no corpo da resposta. */
export class ErroHttp extends Error {
  status: number
  extras?: Record<string, unknown>
  constructor(status: number, mensagem: string, extras?: Record<string, unknown>) {
    super(mensagem)
    this.status = status
    this.extras = extras
  }
}
