const rel = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export function haQuanto(iso: string): string {
  const seg = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seg)
  if (abs < 60) return 'agora há pouco'
  if (abs < 3600) return rel.format(Math.round(seg / 60), 'minute')
  if (abs < 86400) return rel.format(Math.round(seg / 3600), 'hour')
  return rel.format(Math.round(seg / 86400), 'day')
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Valor para <input type="datetime-local"> no fuso do usuário. */
export function paraInputLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const FUSO = 'America/Sao_Paulo'

function hora(d: Date): string {
  const [h, m] = d
    .toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false })
    .split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/** "sáb., 21/11, das 19h às 23h" no fuso de Brasília. */
export function periodoReserva(inicioISO: string, fimISO: string): string {
  const ini = new Date(inicioISO)
  const dia = ini.toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'short', day: '2-digit', month: '2-digit' })
  return `${dia}, das ${hora(ini)} às ${hora(new Date(fimISO))}`
}

/** "20/11" no fuso de Brasília. */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
}

/** "2026-11-20" (hoje + n dias) no fuso de Brasília, para campos de data. */
export function dataIsoDaqui(dias: number, base = Date.now()): string {
  return new Date(base + dias * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/** "2026-11-24" -> "24/11/2026" */
export function isoParaBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** Aceita só dígitos e põe as barras sozinho: "24112026" -> "24/11/2026". */
export function mascararData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** "24/11/2026" -> "2026-11-24"; vazio se a data não existir (ex.: 31/02/2026) ou estiver incompleta. */
export function brParaIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br)
  if (!m) return ''
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  const real = d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
  return real ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

/** Date -> "24/11/2026 18:30" no fuso do navegador. */
export function dataHoraBr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Só dígitos, com as barras, o espaço e os dois-pontos postos sozinhos: "241120261830" -> "24/11/2026 18:30". */
export function mascararDataHora(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 12)
  const data = mascararData(d.slice(0, 8))
  if (d.length <= 8) return data
  const h = d.slice(8)
  return `${data} ${h.length <= 2 ? h : `${h.slice(0, 2)}:${h.slice(2)}`}`
}

/** "24/11/2026 18:30" -> Date (fuso do navegador); null se estiver incompleto ou não existir. */
export function brParaDataHora(br: string): Date | null {
  const m = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})$/.exec(br)
  if (!m) return null
  const iso = brParaIso(m[1])
  const [h, min] = [Number(m[2]), Number(m[3])]
  if (!iso || h > 23 || min > 59) return null
  const [a, mes, dia] = iso.split('-').map(Number)
  return new Date(a, mes - 1, dia, h, min)
}
