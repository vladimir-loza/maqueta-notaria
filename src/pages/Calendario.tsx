import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Boton, Campo, Encabezado, Entrada, Selector } from '../components/ui'
import { aDate, aFecha, esInhabil, fechaCorta, fechaMedia, hoy as hoyF } from '../lib/fechas'
import { alertaRecurrente, nuevoId, vencimientoRecurrente } from '../lib/motor'
import { useAviso, useInhabiles, useStore } from '../store'
import type { Fecha, Recurrente } from '../types'
import { cx } from '../lib/textos'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' })

/** Hoja de agenda mensual: inhábiles tachados, fechas límite circuladas. */
function Mes({ anio, mes0, hoy, inhabiles, fatales }: { anio: number; mes0: number; hoy: Fecha; inhabiles: ReadonlySet<Fecha>; fatales: Map<Fecha, string> }) {
  const primero = new Date(anio, mes0, 1)
  const vacios = (primero.getDay() + 6) % 7
  const total = new Date(anio, mes0 + 1, 0).getDate()
  const titulo = fmtMes.format(primero)
  const fechas = Array.from({ length: total }, (_, i) => aFecha(new Date(anio, mes0, i + 1)))
  return (
    <div className="border border-raya bg-hoja p-4">
      <h3 className="mb-3 font-cond text-lg font-bold">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS.map((d, i) => <span key={i} className={cx('font-cond text-xs font-semibold', i > 4 ? 'text-plumon' : 'text-sub')}>{d}</span>)}
        {Array.from({ length: vacios }, (_, i) => <span key={`v${i}`} />)}
        {fechas.map((f) => {
          const fatal = fatales.get(f)
          return (
            <span
              key={f}
              title={fatal}
              className={cx(
                'flex h-9 items-center justify-center font-cond text-sm font-semibold',
                fatal ? 'mx-auto aspect-square rounded-full border-2 border-plumon text-plumon' : 'rounded-[3px]',
                !fatal && f === hoy && 'bg-marca outline-2 outline-marca-borde',
                !fatal && f !== hoy && esInhabil(f, inhabiles) && 'inhabil text-plumon',
                !fatal && f !== hoy && !esInhabil(f, inhabiles) && 'bg-celda',
              )}
            >
              {aDate(f).getDate()}
              {fatal && <span className="sr-only">: vence {fatal}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function Calendario() {
  const { inhabiles: lista, recurrentes, agregarInhabil, quitarInhabil, guardarRecurrente, eliminarRecurrente } = useStore()
  const avisar = useAviso((s) => s.avisar)
  const inhabiles = useInhabiles()
  const hoy = hoyF()
  const [nueva, setNueva] = useState('')
  const d = aDate(hoy)
  const meses = [0, 1].map((k) => ({ anio: d.getFullYear() + Math.floor((d.getMonth() + k) / 12), mes0: (d.getMonth() + k) % 12 }))
  const fatales = new Map<Fecha, string>()
  for (const m of meses) for (const r of recurrentes) fatales.set(vencimientoRecurrente(r, m.anio, m.mes0, inhabiles), r.nombre)
  const proximos = lista.filter((f) => f >= aFecha(new Date(d.getFullYear(), 0, 1)))

  return (
    <>
      <Encabezado titulo="Calendario y avisos" sub="Días inhábiles para contar plazos y obligaciones que vencen cada mes" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 font-cond text-xl font-bold">Obligaciones mensuales</h2>
            <p className="mb-3 max-w-[70ch] text-sm text-sub">Aparecen en Vencimientos con su fecha límite de cada mes. Al marcarlas enviadas, pasa al mes siguiente.</p>
            <ul className="flex flex-col gap-3">
              {recurrentes.map((r) => <EditorRecurrente key={r.id} r={r} hoy={hoy} inhabiles={inhabiles} onGuardar={guardarRecurrente} onEliminar={() => { eliminarRecurrente(r.id); avisar(`«${r.nombre}» eliminada`, () => guardarRecurrente(r)) }} />)}
            </ul>
            <Boton className="mt-3" onClick={() => guardarRecurrente({ id: nuevoId(), nombre: 'Nueva obligación', descripcion: '', dia: 15, avisoPrevio: 3, atendidos: [] })}>
              <Plus className="h-4 w-4" />Agregar obligación
            </Boton>
          </section>

          <section>
            <h2 className="mb-2 font-cond text-xl font-bold">Días inhábiles</h2>
            <p className="mb-3 max-w-[70ch] text-sm text-sub">Sábados y domingos ya cuentan como inhábiles. Agrega festivos oficiales y días de cierre de la notaría.</p>
            <form className="mb-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (nueva) { agregarInhabil(nueva); setNueva('') } }}>
              <div className="w-44"><Campo etiqueta="Fecha">{(i) => <Entrada id={i} type="date" value={nueva} onChange={(e) => setNueva(e.target.value)} />}</Campo></div>
              <Boton type="submit" variante="primario" disabled={!nueva}>Agregar</Boton>
            </form>
            <ul className="grid grid-cols-2 border border-raya bg-hoja sm:grid-cols-3">
              {proximos.map((f) => (
                <li key={f} className="flex items-center justify-between border-b border-raya-suave px-3 py-2 text-sm">
                  <span className={cx(f < hoy && 'text-sub')}>{fechaMedia(f)}</span>
                  <Boton chico variante="fantasma" aria-label={`Quitar ${fechaMedia(f)}`} onClick={() => { quitarInhabil(f); avisar(`${fechaMedia(f)} ya cuenta como hábil`, () => agregarInhabil(f)) }}><Trash2 className="h-3.5 w-3.5" /></Boton>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          {meses.map((m) => <Mes key={`${m.anio}-${m.mes0}`} {...m} hoy={hoy} inhabiles={inhabiles} fatales={fatales} />)}
        </div>
      </div>
    </>
  )
}

function EditorRecurrente({ r, hoy, inhabiles, onGuardar, onEliminar }: {
  r: Recurrente; hoy: Fecha; inhabiles: ReadonlySet<Fecha>; onGuardar: (r: Recurrente) => void; onEliminar: () => void
}) {
  const sig = alertaRecurrente(r, hoy, inhabiles)
  return (
    <li role="group" aria-label={r.nombre || "Obligación sin nombre"} className="grid gap-3 border border-raya bg-hoja p-4 sm:grid-cols-[minmax(0,1fr)_170px_110px_auto] sm:items-end">
      <div className="sm:col-span-4"><Campo etiqueta="Obligación">{(i) => <Entrada id={i} aria-label={`Obligación: ${r.nombre}`} value={r.nombre} onChange={(e) => onGuardar({ ...r, nombre: e.target.value })} />}</Campo></div>
      <Campo etiqueta="Detalle">{(i) => <Entrada id={i} aria-label={`Detalle de ${r.nombre}`} value={r.descripcion} onChange={(e) => onGuardar({ ...r, descripcion: e.target.value })} />}</Campo>
      <Campo etiqueta="Vence">{(i) => (
        <Selector id={i} aria-label={`Vence ${r.nombre}`} value={String(r.dia)} onChange={(e) => onGuardar({ ...r, dia: e.target.value === 'ultimoHabil' ? 'ultimoHabil' : Number(e.target.value) })}>
          {Array.from({ length: 31 }, (_, k) => <option key={k} value={k + 1}>Día {k + 1}</option>)}
          <option value="ultimoHabil">Último día hábil</option>
        </Selector>
      )}</Campo>
      <Campo etiqueta="Aviso (días)">{(i) => <Entrada id={i} aria-label={`Días de aviso de ${r.nombre}`} type="number" min={0} value={r.avisoPrevio} onChange={(e) => onGuardar({ ...r, avisoPrevio: Number(e.target.value) })} />}</Campo>
      <Boton variante="peligro" aria-label={`Eliminar ${r.nombre}`} onClick={onEliminar}><Trash2 className="h-4 w-4" /></Boton>
      <p className="text-xs text-sub sm:col-span-4">Próxima fecha límite: <span className="font-semibold text-texto">{fechaCorta(sig.vence)}</span>{r.atendidos.length > 0 && ` · enviados: ${r.atendidos.join(', ')}`}</p>
    </li>
  )
}
