import { Trash2 } from 'lucide-react'
import { Fragment, useRef, useState } from 'react'
import { fechaMedia, hoy, pesos } from '../lib/fechas'
import { saldo } from '../lib/motor'
import type { CostoPaso, Movimiento, TipoMovimiento } from '../types'
import { cx, etiquetaMonto, nombreMovimiento } from '../lib/textos'
import { Adjuntar, Boton, Campo, Entrada, Selector } from './ui'

/** Saldo cliente = anticipos − (gastos a terceros + impuestos enterados + honorarios). */
export function ResumenSaldo({ movimientos }: { movimientos: Movimiento[] }) {
  const s = saldo(movimientos)
  const celda = 'flex flex-col gap-0.5 px-4 py-3'
  const etiqueta = 'text-xs font-medium text-sub'
  const cifra = 'font-cond text-xl font-semibold'
  return (
    <div className="grid grid-cols-2 border border-raya bg-hoja sm:grid-cols-5">
      <div className={celda}><span className={etiqueta}>Anticipos</span><span className={cifra}>{pesos(s.anticipos)}</span></div>
      <div className={celda}><span className={etiqueta}>− Gastos a terceros</span><span className={cifra}>{pesos(s.gastos)}</span></div>
      <div className={celda}><span className={etiqueta}>− Impuestos enterados</span><span className={cifra}>{pesos(s.impuestos)}</span></div>
      <div className={celda}><span className={etiqueta}>− Honorarios</span><span className={cifra}>{pesos(s.honorarios)}</span></div>
      <div className={cx(celda, 'border-t border-raya sm:border-t-0 sm:border-l', s.saldo < 0 ? 'bg-plumon-claro' : s.saldo > 0 ? 'bg-verde-claro' : 'bg-hoja')}>
        <span className={etiqueta}>= Saldo cliente</span>
        <span className={cx(cifra, s.saldo < 0 ? 'text-plumon-hondo' : s.saldo > 0 ? 'text-verde-hondo' : 'text-texto')}>{pesos(s.saldo)}</span>
        {s.saldo < 0 && <span className="text-xs text-plumon-hondo">Falta cobrar al cliente</span>}
      </div>
    </div>
  )
}

/** Efecto en el saldo del cliente: anticipos abonan, lo demás carga; un contra-asiento (monto negativo) invierte la columna. */
const efecto = (m: Movimiento) => (m.tipo === 'anticipo' ? m.monto : -m.monto)

export function TablaMovimientos({ movimientos, onEliminar, extra, puedeEliminar, saldoCorrido, saldoSin }: {
  movimientos: (Movimiento & { etiqueta?: React.ReactNode })[]
  onEliminar?: (m: Movimiento) => void
  /** Filas que admiten borrado (p. ej. no las de expedientes cerrados). */
  puedeEliminar?: (m: Movimiento) => boolean
  extra?: string
  /** Con un solo expediente: orden cronológico con columna de saldo. */
  saldoCorrido?: boolean
  /** Saldo del expediente si se quitara este movimiento (para confirmar el borrado). */
  saldoSin?: (m: Movimiento) => number
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const caja = useRef<HTMLDivElement>(null)
  const ordenados = [...movimientos].sort((a, b) => (saldoCorrido ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)))
  // Saldo tras cada movimiento, en el orden mostrado.
  const saldos = ordenados.reduce<number[]>((acc, m, i) => [...acc, (acc[i - 1] ?? 0) + efecto(m)], [])
  const columnas = 6 + (extra ? 1 : 0) + (saldoCorrido ? 1 : 0) + (onEliminar ? 1 : 0)
  return (
    <div ref={caja} tabIndex={-1} className="overflow-x-auto border border-raya bg-hoja outline-none">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">Movimientos de la cuenta corriente</caption>
        <thead>
          <tr className="border-b border-raya text-left text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-sub uppercase">
            <th className="py-2.5 pr-3 pl-4">Fecha</th>
            {extra && <th className="px-3 py-2.5">{extra}</th>}
            <th className="px-3 py-2.5">Concepto</th>
            <th className="px-3 py-2.5">Tipo</th>
            <th className="px-3 py-2.5">Comprobante</th>
            <th className="px-3 py-2.5 text-right">Cargo</th>
            <th className="px-3 py-2.5 text-right">Abono</th>
            {saldoCorrido && <th className="px-3 py-2.5 text-right">Saldo</th>}
            {onEliminar && <th className="relative w-16 pr-4"><span className="sr-only">Acciones</span></th>}
          </tr>
        </thead>
        <tbody>
          {ordenados.length === 0 && (
            <tr><td colSpan={columnas} className="px-4 py-6 text-sub">Sin movimientos todavía. Los pasos con costo los registran al completarse.</td></tr>
          )}
          {ordenados.map((m, i) => {
            const e = efecto(m)
            const acumulado = saldos[i]
            const contra = !!m.cancela
            // Los cargos de un paso solo se cancelan reabriendo el paso: así el expediente y la cuenta no se contradicen.
            const dePaso = !!m.pasoId
            const borrable = !dePaso && (puedeEliminar?.(m) ?? true)
            return (
              <Fragment key={m.id}>
                <tr className={cx('border-b border-raya-suave last:border-0', contra && 'text-sub')}>
                  <td className="py-2.5 pr-3 pl-4 whitespace-nowrap">{fechaMedia(m.fecha)}</td>
                  {extra && <td className="px-3 py-2.5">{m.etiqueta}</td>}
                  <td className="px-3 py-2.5">
                    {m.concepto}
                    {contra && <span className="ml-2 rounded bg-celda px-1.5 py-0.5 text-xs">contra-asiento</span>}
                  </td>
                  <td className="px-3 py-2.5 text-sub">{nombreMovimiento[m.tipo]}</td>
                  <td className="px-3 py-2.5 text-sub">{m.comprobante ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{e < 0 ? pesos(-e) : ''}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-verde-hondo">{e > 0 ? pesos(e) : ''}</td>
                  {saldoCorrido && <td className={cx('px-3 py-2.5 text-right font-medium whitespace-nowrap', acumulado < 0 && 'text-plumon')}>{pesos(acumulado)}</td>}
                  {onEliminar && (
                    <td className="pr-4 text-right">
                      {borrable ? (
                        <Boton chico variante="fantasma" className="hover:bg-plumon-claro! hover:text-plumon-hondo!" aria-expanded={confirmando === m.id}
                          aria-label={`Eliminar movimiento: ${m.concepto}, ${fechaMedia(m.fecha)}, ${pesos(m.monto)}`}
                          onClick={() => setConfirmando(confirmando === m.id ? null : m.id)}><Trash2 className="h-3.5 w-3.5" /></Boton>
                      ) : dePaso ? (
                        <span title="Viene de un paso: se cancela reabriendo el paso" className="text-xs whitespace-nowrap text-sub">de paso</span>
                      ) : null}
                    </td>
                  )}
                </tr>
                {confirmando === m.id && onEliminar && (
                  <tr className="border-b border-raya-suave bg-plumon-claro/50">
                    <td colSpan={columnas} className="px-4 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-2 text-sm" onKeyDown={(ev) => { if (ev.key === 'Escape') setConfirmando(null) }}>
                        <span>¿Eliminar «{m.concepto}»?{saldoSin && <> El saldo quedará en <strong>{pesos(saldoSin(m))}</strong>.</>}</span>
                        <Boton chico variante="peligro" autoFocus onClick={() => { setConfirmando(null); onEliminar(m); requestAnimationFrame(() => caja.current?.focus()) }}>Eliminar</Boton>
                        <Boton chico onClick={() => setConfirmando(null)}>Cancelar</Boton>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Alta manual de un movimiento. Sin destino elegido no se envía; el motivo siempre se dice. */
export function FormMovimiento({ onGuardar, children, faltaDestino, saldoActual }: {
  onGuardar: (m: Omit<Movimiento, 'id'>) => void
  children?: React.ReactNode
  /** Mensaje cuando falta elegir expediente (vista global). */
  faltaDestino?: string
  /** Saldo actual del expediente destino, para anticipar el resultado. */
  saldoActual?: number
}) {
  const [fecha, setFecha] = useState(hoy())
  const [tipo, setTipo] = useState<TipoMovimiento | ''>('')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [comprobante, setComprobante] = useState('')
  const [error, setError] = useState('')
  const formulario = useRef<HTMLFormElement>(null)
  const n = Number(monto)
  const resultado = saldoActual !== undefined && tipo && n > 0 ? saldoActual + (tipo === 'anticipo' ? n : -n) : undefined

  return (
    <form
      ref={formulario}
      noValidate
      className="flex flex-col gap-3 border border-raya bg-hoja p-4"
      onSubmit={(e) => {
        e.preventDefault()
        const faltan = [faltaDestino, !tipo && 'elige el tipo', !concepto.trim() && 'escribe el concepto', !(n > 0) && 'el monto debe ser mayor que 0'].filter(Boolean)
        if (faltan.length) return setError(`Para registrar: ${faltan.join(', ')}.`)
        onGuardar({ fecha, tipo: tipo as TipoMovimiento, concepto: concepto.trim(), monto: n, comprobante: comprobante || undefined })
        setConcepto(''); setMonto(''); setComprobante(''); setTipo(''); setError('')
        requestAnimationFrame(() => formulario.current?.querySelector<HTMLInputElement>('[data-concepto]')?.focus())
      }}
    >
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-36"><Campo etiqueta="Fecha">{(id) => <Entrada id={id} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />}</Campo></div>
        <div className="w-44">
          <Campo etiqueta="Tipo">{(id) => (
            <Selector id={id} value={tipo} onChange={(e) => { setTipo(e.target.value as TipoMovimiento); setError('') }}>
              <option value="">Elige el tipo…</option>
              {Object.entries(nombreMovimiento).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Selector>
          )}</Campo>
        </div>
        <div className="min-w-48 flex-1"><Campo etiqueta="Concepto">{(id) => <Entrada id={id} data-concepto value={concepto} onChange={(e) => { setConcepto(e.target.value); setError('') }} placeholder="Ej. Avalúo comercial" />}</Campo></div>
        <div className="w-36"><Campo etiqueta="Monto (MXN)">{(id) => <Entrada id={id} type="number" min="0" step="0.01" value={monto} onChange={(e) => { setMonto(e.target.value); setError('') }} />}</Campo></div>
        <Adjuntar etiqueta="Comprobante" archivo={comprobante} onArchivo={setComprobante} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" variante="primario">Registrar movimiento</Boton>
        {resultado !== undefined && (
          <span className={cx('text-sm', resultado < 0 ? 'text-plumon-hondo' : 'text-sub')}>El saldo quedará en {pesos(resultado)}</span>
        )}
        {error && <p role="alert" className="text-sm text-plumon-hondo">{error}</p>}
      </div>
    </form>
  )
}

/**
 * Monto real de un paso con costo. Arranca con el estimado ya escrito (y seleccionado);
 * para no cargar nada hay que decirlo, así ningún cargo se pierde por omisión.
 */
export function CampoCosto({ id, costo, monto, onMonto, sinCosto, onSinCosto, error }: {
  id: string
  costo: CostoPaso
  monto: string
  onMonto: (v: string) => void
  sinCosto: boolean
  onSinCosto: (v: boolean) => void
  error: string
}) {
  return (
    <div className="w-56">
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-sub">{etiquetaMonto[costo.tipo]} (MXN)</label>
      <Entrada id={id} type="number" min="0" step="0.01" autoFocus disabled={sinCosto} value={sinCosto ? '' : monto}
        onFocus={(e) => e.currentTarget.select()}
        aria-invalid={!!error} aria-describedby={`${id}-est${error ? ` ${id}-error` : ''}`}
        onChange={(e) => onMonto(e.target.value)} />
      <p id={`${id}-est`} className="mt-1 text-xs text-sub">
        {costo.concepto}{costo.monto > 0 && ` · estimado ${pesos(costo.monto)}`}
      </p>
      <label className="mt-1 flex items-center gap-1.5 text-xs text-sub">
        <input type="checkbox" className="h-3.5 w-3.5 accent-tinta" checked={sinCosto} onChange={(e) => onSinCosto(e.target.checked)} />
        Sin costo en este expediente
      </label>
    </div>
  )
}

