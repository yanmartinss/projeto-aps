export async function postJson(
  url: string,
  corpo: unknown,
  opcoes: { headers?: Record<string, string>; timeoutMs: number },
) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...opcoes.headers },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(opcoes.timeoutMs),
  });
  if (!resp.ok) {
    const detalhe = (await resp.text()).slice(0, 300);
    throw new Error(`IA respondeu ${resp.status}: ${detalhe}`);
  }
  return resp.json() as Promise<any>;
}
