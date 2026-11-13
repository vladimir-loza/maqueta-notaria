import { aDate, diaSemana, esInhabil, fechaCorta, sumarNaturales } from '../lib/fechas'
import type { PlazoCalculado } from '../lib/motor'
import type { Fecha } from '../types'
import { cx } from '../lib/textos'
import { Marca } from './ui'

/** Un módulo columna-día para todas las reglas: cada celda mide lo mismo en toda la app. */
export const CELDA = 22
export const HUECO = 2

const rango = (inicio: Fecha, dias: number) => Array.from({ length: dias }, (_, i) => sumarNaturales(inicio, i))

export function ReglaEncabezado({ inicio, dias, hoy, inhabiles }: { inicio: Fecha; dias: number; hoy: Fecha; inhabiles: ReadonlySet<Fecha> }) {
  return (
    <div className="flex" style={{ gap: HUECO }} aria-hidden>
      {rango(inicio, dias).map((f) => (
        <span
          key={f}
          style={{ width: CELDA }}
          className={cx('text-center font-cond text-[11px] font-semibold uppercase', f === hoy ? 'text-texto' : esInhabil(f, inhabiles) ? 'text-plumon' : 'text-sub')}
        >
          {diaSemana(f).charAt(0)}
        </span>
      ))}
    </div>
  )
}

/**
 * Celdas que cubren hoy y cada fecha límite con dos días de margen;
 * los tramos largos entre ellas se comprimen en una celda «…» (null).
 */
function celdasAjustadas(hoy: Fecha, claves: Fecha[]): (Fecha | null)[] {
  const dias = new Set<Fecha>()
  for (const k of [hoy, ...claves]) for (let d = -2; d <= 2; d++) dias.add(sumarNaturales(k, d))
  const orden = [...dias].sort()
  const out: (Fecha | null)[] = []
  orden.forEach((f, i) => {
    const prev = orden[i - 1]
    if (prev) {
      let hueco = sumarNaturales(prev, 1)
      const faltan: Fecha[] = []
      while (hueco < f) { faltan.push(hueco); hueco = sumarNaturales(hueco, 1) }
      if (faltan.length > 2) out.push(null)
      else out.push(...faltan)
    }
    out.push(f)
  })
  return out
}

interface Props {
  /** Ventana fija (alineada entre filas). Sin ella, la tira se ajusta a hoy y a las fechas límite. */
  inicio?: Fecha
  dias?: number
  hoy: Fecha
  inhabiles: ReadonlySet<Fecha>
  notaria?: PlazoCalculado
  ley?: PlazoCalculado
  /** Fecha fatal sin distinguir notaría/ley (obligaciones recurrentes). */
  fatal?: PlazoCalculado
  /** Cuando la fila ya dice la fecha en texto, la tira no se anuncia. */
  decorativa?: boolean
  /** Fechas que deben caber; filas que comparten claves quedan alineadas. */
  claves?: Fecha[]
}

/**
 * Regla de días: la tira de la agenda. Hoy en marcatextos, inhábiles tachados en rojo,
 * el plazo de la notaría subrayado en tinta y la fecha de ley circulada con plumón.
 */
export function Regla({ inicio, dias, hoy, inhabiles, notaria, ley, fatal, decorativa, claves }: Props) {
  const plazos = [notaria, ley, fatal].filter((p): p is PlazoCalculado => !!p)
  const celdas = inicio && dias ? rango(inicio, dias) : celdasAjustadas(hoy, claves ?? plazos.map((p) => p.vence))
  const fechas = celdas.filter((f): f is Fecha => !!f)
  const fin = fechas.at(-1)!
  const desde = plazos.map((p) => p.desde).sort()[0]
  const hasta = plazos.map((p) => p.vence).sort().at(-1)
  const primeraFatal = plazos.map((p) => p.vence).sort()[0]
  const circuladas = new Set([ley?.vence, fatal?.vence].filter(Boolean))
  const fuera = plazos.filter((p) => p.vence > fin).map((p) => p.vence).sort()[0]
  const antes = plazos.filter((p) => p.vence < fechas[0]).map((p) => p.vence).sort()[0]

  const resumen = [
    notaria && `Plazo notaría: ${fechaCorta(notaria.vence)}`,
    ley && `Plazo de ley: ${fechaCorta(ley.vence)}`,
    fatal && `Fecha límite: ${fechaCorta(fatal.vence)}`,
    antes && `venció el ${fechaCorta(antes)}, antes de esta ventana`,
  ].filter(Boolean).join('. ')

  return (
    <div className="flex items-center" {...(decorativa ? { 'aria-hidden': true } : { role: 'img', 'aria-label': resumen || 'Sin plazo corriendo' })}>
      <div className="flex" style={{ gap: HUECO }}>
        {celdas.map((f, i) => {
          if (!f) return <span key={`salto-${i}`} style={{ width: CELDA, height: 26 }} className="flex items-end justify-center pb-[3px] font-cond text-sm leading-none text-sub">…</span>
          const inh = esInhabil(f, inhabiles)
          const esHoy = f === hoy
          const circulo = circuladas.has(f)
          const subrayado = notaria?.vence === f
          const corre = !!desde && !!hasta && f > desde && f <= hasta
          const vencido = !!primeraFatal && f > primeraFatal && f < hoy && !!hasta && f > hasta
          return (
            <span
              key={f}
              style={{ width: CELDA, height: 26 }}
              className={cx(
                'flex items-end justify-center pb-[3px] font-cond text-[11px] leading-none font-semibold',
                circulo ? 'rounded-full border-2 border-plumon bg-hoja text-plumon' : 'rounded-[3px]',
                !circulo && esHoy && 'bg-marca text-texto outline-2 outline-marca-borde',
                !circulo && !esHoy && inh && 'inhabil text-plumon',
                !circulo && !esHoy && !inh && vencido && 'bg-plumon-claro text-plumon-hondo',
                !circulo && !esHoy && !inh && !vencido && corre && 'bg-tinta-clara text-tinta-hondo',
                !circulo && !esHoy && !inh && !vencido && !corre && 'bg-celda text-sub',
                subrayado && 'shadow-[inset_0_-4px_0_var(--color-tinta)]',
                i === 0 && antes && 'shadow-[inset_3px_0_0_var(--color-plumon)]',
              )}
            >
              {aDate(f).getDate()}
            </span>
          )
        })}
      </div>
      {fuera && <span className="ml-2 font-cond text-xs font-semibold whitespace-nowrap text-sub">→ {fechaCorta(fuera)}</span>}
    </div>
  )
}

export function LeyendaRegla({ estados = true }: { estados?: boolean }) {
  const item = 'flex items-center gap-1.5'
  const sw = 'inline-block h-3.5 w-3.5 rounded-[3px]'
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-sub">
      <span className={item}><i className={cx(sw, 'bg-marca')} />Hoy</span>
      <span className={item}><i className={cx(sw, 'bg-tinta-clara')} />Plazo corriendo</span>
      <span className={item}><i className={cx(sw, 'bg-celda shadow-[inset_0_-4px_0_var(--color-tinta)]')} />Vence plazo notaría</span>
      <span className={item}><i className={cx(sw, 'rounded-full border-2 border-plumon')} />Vence plazo de ley / fecha límite</span>
      <span className={item}><i className={cx(sw, 'bg-plumon-claro')} />Días de atraso</span>
      <span className={item}><i className={cx(sw, 'inhabil')} />Inhábil</span>
      {estados && (
        <>
          <span className={item}><Marca estado="pendiente" className="h-3.5 w-3.5" />Pendiente</span>
          <span className={item}><Marca estado="hecho" className="h-3.5 w-3.5" />Hecho</span>
          <span className={item}><Marca estado="noSolicita" className="h-3.5 w-3.5" />No se solicita</span>
        </>
      )}
    </div>
  )
}
