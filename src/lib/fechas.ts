import type { Fecha, TipoDia } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

export function aFecha(d: Date): Fecha {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Interpreta 'YYYY-MM-DD' como fecha local (no UTC). */
export function aDate(f: Fecha): Date {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const hoy = (): Fecha => aFecha(new Date())

export function sumarNaturales(f: Fecha, dias: number): Fecha {
  const d = aDate(f)
  d.setDate(d.getDate() + dias)
  return aFecha(d)
}

export function esInhabil(f: Fecha, inhabiles: ReadonlySet<Fecha>): boolean {
  const dow = aDate(f).getDay()
  return dow === 0 || dow === 6 || inhabiles.has(f)
}

/** Suma días hábiles o naturales; el día base no cuenta. */
export function sumarDias(f: Fecha, dias: number, tipo: TipoDia, inhabiles: ReadonlySet<Fecha>): Fecha {
  if (tipo === 'naturales') return sumarNaturales(f, dias)
  let cur = f
  let restan = dias
  while (restan > 0) {
    cur = sumarNaturales(cur, 1)
    if (!esInhabil(cur, inhabiles)) restan--
  }
  return cur
}

/** Días naturales de a a b (negativo si b es anterior). */
export function diferenciaNaturales(a: Fecha, b: Fecha): number {
  return Math.round((aDate(b).getTime() - aDate(a).getTime()) / 86_400_000)
}

/** Días hábiles de a a b, sin contar a; negativo si b es anterior. */
export function diferenciaHabiles(a: Fecha, b: Fecha, inhabiles: ReadonlySet<Fecha>): number {
  if (a === b) return 0
  const signo = a < b ? 1 : -1
  const [ini, fin] = signo > 0 ? [a, b] : [b, a]
  let n = 0
  for (let cur = sumarNaturales(ini, 1); cur <= fin; cur = sumarNaturales(cur, 1)) {
    if (!esInhabil(cur, inhabiles)) n++
  }
  return n * signo
}

export function ultimoHabilDelMes(anio: number, mes0: number, inhabiles: ReadonlySet<Fecha>): Fecha {
  let cur = aFecha(new Date(anio, mes0 + 1, 0))
  while (esInhabil(cur, inhabiles)) cur = sumarNaturales(cur, -1)
  return cur
}

const fmtCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
const fmtMedia = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtLarga = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtDia = new Intl.DateTimeFormat('es-MX', { weekday: 'short' })

export const fechaCorta = (f: Fecha) => fmtCorta.format(aDate(f)).replace('.', '')
export const fechaMedia = (f: Fecha) => fmtMedia.format(aDate(f)).replace('.', '')
export const fechaLarga = (f: Fecha) => fmtLarga.format(aDate(f))
export const diaSemana = (f: Fecha) => fmtDia.format(aDate(f)).replace('.', '')

const fmtPesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const pesos = (n: number) => fmtPesos.format(n)
