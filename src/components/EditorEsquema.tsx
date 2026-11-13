import { Plus, Trash2 } from 'lucide-react'
import { pesos } from '../lib/fechas'
import { nuevoId } from '../lib/motor'
import type { CampoConfig, Condicion, ReglaAcumulado, TipoCampo } from '../types'
import { condicionable, valoresDe } from '../lib/textos'
import { Boton, Campo, Entrada, Selector } from './ui'

const nombreTipoCampo: Record<TipoCampo, string> = { texto: 'Texto', moneda: 'Monto (MXN)', opcion: 'Lista de opciones', sino: 'Sí / No' }

/** Datos que pide el alta de un expediente de este trámite. */
export function EditorCampos({ campos, onCambio }: { campos: CampoConfig[]; onCambio: (c: CampoConfig[]) => void }) {
  const cambiar = (i: number, parcial: Partial<CampoConfig>) => onCambio(campos.map((c, j) => (j === i ? { ...c, ...parcial } : c)))
  return (
    <section aria-labelledby="titulo-campos" className="flex flex-col gap-3 border border-raya bg-hoja p-4">
      <div>
        <h2 id="titulo-campos" className="font-cond text-[15px] font-semibold">Datos de apertura</h2>
        <p className="text-xs text-sub">Se piden al abrir el expediente. Los de opciones o Sí/No pueden decidir qué pasos aplican.</p>
      </div>
      {campos.length === 0 && <p className="text-xs text-sub">Sin datos adicionales.</p>}
      {campos.map((c, i) => (
        <div key={c.id} role="group" aria-label={`Dato: ${c.nombre || 'sin nombre'}`} className="flex flex-col gap-2 border-t border-raya-suave pt-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><Campo etiqueta="Nombre del dato">{(id) => <Entrada id={id} value={c.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} />}</Campo></div>
            <Boton chico variante="peligro" aria-label={`Quitar dato: ${c.nombre}`} onClick={() => onCambio(campos.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Boton>
          </div>
          <Campo etiqueta="Tipo">{(id) => (
            <Selector id={id} value={c.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value as TipoCampo, opciones: e.target.value === 'opcion' ? (c.opciones ?? []) : undefined })}>
              {Object.entries(nombreTipoCampo).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Selector>
          )}</Campo>
          {c.tipo === 'opcion' && (
            <Campo etiqueta="Opciones" ayuda="Separadas por coma">{(id) => (
              <Entrada id={id} value={(c.opciones ?? []).join(', ')} onChange={(e) => cambiar(i, { opciones: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
            )}</Campo>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-tinta" checked={c.requerido} onChange={(e) => cambiar(i, { requerido: e.target.checked })} />
            Obligatorio al abrir
          </label>
        </div>
      ))}
      <Boton chico variante="fantasma" className="self-start" onClick={() => onCambio([...campos, { id: nuevoId(), nombre: 'Nuevo dato', tipo: 'opcion', opciones: [], requerido: false }])}>
        <Plus className="h-4 w-4" />Agregar dato
      </Boton>
    </section>
  )
}

/** «Aplica cuando»: el paso solo entra a expedientes cuyos datos cumplen todas las condiciones. */
export function EditorCondiciones({ condiciones, campos, onCambio }: { condiciones: Condicion[]; campos: CampoConfig[]; onCambio: (c: Condicion[]) => void }) {
  const usables = campos.filter(condicionable)
  if (!usables.length) return <p className="text-xs text-sub">Para condicionar este paso, agrega un dato de apertura con opciones o Sí/No.</p>
  const alternar = (campo: CampoConfig, valor: string) => {
    const actual = condiciones.find((c) => c.campoId === campo.id)
    const valores = actual ? (actual.valores.includes(valor) ? actual.valores.filter((v) => v !== valor) : [...actual.valores, valor]) : [valor]
    const resto = condiciones.filter((c) => c.campoId !== campo.id)
    onCambio(valores.length ? [...resto, { campoId: campo.id, valores }] : resto)
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Aplica cuando</legend>
      <p className="text-xs text-sub">Sin marcas, el paso aplica siempre. Con marcas en varios datos, deben cumplirse todos.</p>
      {usables.map((campo) => {
        const actual = condiciones.find((c) => c.campoId === campo.id)?.valores ?? []
        return (
          <div key={campo.id} role="group" aria-label={`Aplica cuando ${campo.nombre}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="w-full text-xs font-medium text-sub sm:w-auto">{campo.nombre}:</span>
            {valoresDe(campo).map((v) => (
              <label key={v} className="flex items-center gap-1.5">
                <input type="checkbox" className="h-4 w-4 accent-tinta" checked={actual.includes(v)} onChange={() => alternar(campo, v)} />
                {v}
              </label>
            ))}
          </div>
        )
      })}
    </fieldset>
  )
}

/** Reglas que suman un monto entre expedientes y avisan al rebasar un umbral. */
export function EditorReglas({ reglas, campos, onCambio }: { reglas: ReglaAcumulado[]; campos: CampoConfig[]; onCambio: (r: ReglaAcumulado[]) => void }) {
  const cambiar = (i: number, parcial: Partial<ReglaAcumulado>) => onCambio(reglas.map((r, j) => (j === i ? { ...r, ...parcial } : r)))
  const montos = campos.filter((c) => c.tipo === 'moneda')
  const claves = campos.filter((c) => c.tipo !== 'moneda')
  return (
    <section aria-labelledby="titulo-reglas" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-reglas" className="font-cond text-xl font-bold">Reglas de acumulado</h2>
        <p className="max-w-[70ch] text-sm text-sub">
          Suman un monto entre expedientes que comparten un dato (por ejemplo, el mismo enajenante) y avisan en Vencimientos cada vez que el total rebasa otro múltiplo del umbral.
        </p>
      </div>
      {reglas.map((r, i) => (
        <div key={r.id} role="group" aria-label={`Regla: ${r.nombre}`} className="grid gap-3 border border-raya bg-hoja p-4 lg:grid-cols-2">
          <div className="flex items-end gap-2 lg:col-span-2">
            <div className="min-w-0 flex-1"><Campo etiqueta="Nombre de la regla">{(id) => <Entrada id={id} value={r.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} />}</Campo></div>
            <Boton variante="peligro" aria-label={`Quitar regla: ${r.nombre}`} onClick={() => onCambio(reglas.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Boton>
          </div>
          <Campo etiqueta="Agrupar por">{(id) => (
            <Selector id={id} value={r.campoClave} onChange={(e) => cambiar(i, { campoClave: e.target.value })}>
              <option value="">Elige un dato…</option>
              {claves.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Selector>
          )}</Campo>
          <Campo etiqueta="Sumar">{(id) => (
            <Selector id={id} value={r.campoMonto} onChange={(e) => cambiar(i, { campoMonto: e.target.value })}>
              <option value="">Elige un monto…</option>
              {montos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Selector>
          )}</Campo>
          <Campo etiqueta="Umbral (MXN)" ayuda={r.umbral > 0 ? `Avisa al pasar ${pesos(r.umbral)}, ${pesos(r.umbral * 2)}…` : undefined}>{(id) => (
            <Entrada id={id} type="number" min={0} value={r.umbral} onChange={(e) => cambiar(i, { umbral: Number(e.target.value) })} />
          )}</Campo>
          <div className="lg:col-span-2"><EditorCondiciones condiciones={r.condiciones} campos={campos} onCambio={(c) => cambiar(i, { condiciones: c })} /></div>
        </div>
      ))}
      <Boton className="self-start" onClick={() => onCambio([...reglas, { id: nuevoId(), nombre: 'Nueva regla', campoClave: '', campoMonto: '', umbral: 0, condiciones: [] }])}>
        <Plus className="h-4 w-4" />Agregar regla
      </Boton>
    </section>
  )
}
