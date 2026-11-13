import type { CampoConfig, Condicion, CostoPaso, TipoMovimiento, TipoPaso } from '../types'
import type { Alerta } from './motor'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const nombreTipoPaso: Record<TipoPaso, string> = { documento: 'Documento', pago: 'Pago', espera: 'Espera', tarea: 'Tarea' }

export const nombreMovimiento: Record<TipoMovimiento, string> = {
  anticipo: 'Anticipo',
  gasto: 'Gasto a terceros',
  impuesto: 'Impuesto enterado',
  honorario: 'Honorario',
}

/** Cómo se nombra el monto real al registrarlo, según a dónde va el dinero. */
export const etiquetaMonto: Record<TipoMovimiento, string> = {
  anticipo: 'Anticipo recibido',
  gasto: 'Pagado a tercero',
  impuesto: 'Impuesto enterado',
  honorario: 'Honorarios a cargo del cliente',
}

const unidad = (a: Alerta, n: number) => `${n} ${a.tipoDia === 'habiles' ? 'háb.' : n === 1 ? 'día nat.' : 'días nat.'}`

export function textoRestan(a: Alerta): string {
  if (a.restan < 0) return `vencido hace ${unidad(a, -a.restan)}`
  if (a.restan === 0) return 'vence hoy'
  if (a.nivel === 'vencido') return `notaría vencida · ley ${unidad(a, a.restan)}`
  return `en ${unidad(a, a.restan)}`
}

/** Valida el monto de un paso con costo; devuelve el error o el monto (undefined = sin costo). */
export function leerCosto(costo: CostoPaso, monto: string, sinCosto: boolean): { error?: string; monto?: number } {
  if (sinCosto) return {}
  const n = Number(monto)
  if (!(n > 0)) return { error: `Indica el monto de «${costo.concepto}» o marca «Sin costo en este expediente».` }
  return { monto: n }
}

/** Valores posibles de un campo que puede gobernar una condición. */
export const valoresDe = (c: CampoConfig) => (c.tipo === 'sino' ? ['Sí', 'No'] : c.tipo === 'opcion' ? (c.opciones ?? []) : [])
export const condicionable = (c: CampoConfig) => valoresDe(c).length > 0

/** Texto corto de las condiciones de un paso, p. ej. «Acto: Compraventa o Donación». */
export function describirCondiciones(conds: Condicion[] | undefined, campos: CampoConfig[]) {
  return (conds ?? [])
    .map((c) => `${campos.find((x) => x.id === c.campoId)?.nombre ?? 'campo borrado'}: ${c.valores.join(' o ') || 'ninguno'}`)
    .join(' · ')
}

