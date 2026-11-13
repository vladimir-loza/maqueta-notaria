import { useState } from 'react'
import { nuevoId } from '../lib/motor'
import { nombreMovimiento, nombreTipoPaso } from '../lib/textos'
import type { PasoConfig, TipoDia, TipoMovimiento, TipoPaso } from '../types'
import { Boton, Campo, Entrada, Selector } from './ui'

/** Paso extra para un expediente: lo mínimo (nombre, tipo, plazo y costo); el resto se hereda del motor. */
export function AltaPaso({ onGuardar, onCancelar }: { onGuardar: (p: PasoConfig) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoPaso>('documento')
  const [dias, setDias] = useState('')
  const [tipoDia, setTipoDia] = useState<TipoDia>('habiles')
  const [deLey, setDeLey] = useState(false)
  const [monto, setMonto] = useState('')
  const [tipoMov, setTipoMov] = useState<TipoMovimiento>('gasto')
  const [error, setError] = useState('')
  const n = Number(dias)
  return (
    <form
      noValidate
      onKeyDown={(e) => e.key === 'Escape' && onCancelar()}
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombre.trim()) return setError('Escribe el nombre del paso.')
        if (dias && !(n >= 1)) return setError('El plazo debe ser de al menos 1 día, o déjalo vacío.')
        const plazo = n >= 1 ? { dias: n, tipoDia, origen: 'inicioEtapa' as const } : undefined
        onGuardar({
          id: nuevoId(),
          nombre: nombre.trim(),
          tipo,
          opcional: true,
          avisoPrevio: 1,
          requiere: [],
          plazoNotaria: deLey ? undefined : plazo,
          plazoLey: deLey ? plazo : undefined,
          costo: Number(monto) > 0 ? { concepto: nombre.trim(), monto: Number(monto), tipo: tipoMov } : undefined,
        })
      }}
      className="flex flex-wrap items-start gap-3 border-t border-raya-suave bg-fila px-4 py-3"
    >
      <div className="min-w-56 flex-1"><Campo etiqueta="Nombre del paso">{(id) => <Entrada id={id} autoFocus value={nombre} onChange={(e) => { setNombre(e.target.value); setError('') }} />}</Campo></div>
      <div className="w-36">
        <Campo etiqueta="Tipo">{(id) => (
          <Selector id={id} value={tipo} onChange={(e) => setTipo(e.target.value as TipoPaso)}>
            {Object.entries(nombreTipoPaso).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selector>
        )}</Campo>
      </div>
      <div className="w-24"><Campo etiqueta="Plazo (días)" ayuda="Opcional">{(id) => <Entrada id={id} type="number" min={1} value={dias} onChange={(e) => { setDias(e.target.value); setError('') }} />}</Campo></div>
      <div className="w-32">
        <Campo etiqueta="Cuenta">{(id) => (
          <Selector id={id} value={tipoDia} onChange={(e) => setTipoDia(e.target.value as TipoDia)}>
            <option value="habiles">Hábiles</option><option value="naturales">Naturales</option>
          </Selector>
        )}</Campo>
        <label className="mt-1 flex items-center gap-1.5 text-xs text-sub">
          <input type="checkbox" className="h-3.5 w-3.5 accent-tinta" checked={deLey} onChange={(e) => setDeLey(e.target.checked)} />Es plazo de ley
        </label>
      </div>
      <div className="w-32"><Campo etiqueta="Costo (MXN)" ayuda="Opcional">{(id) => <Entrada id={id} type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />}</Campo></div>
      {Number(monto) > 0 && (
        <div className="w-44">
          <Campo etiqueta="Va a la cuenta como">{(id) => (
            <Selector id={id} value={tipoMov} onChange={(e) => setTipoMov(e.target.value as TipoMovimiento)}>
              {Object.entries(nombreMovimiento).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Selector>
          )}</Campo>
        </div>
      )}
      <div className="flex gap-2 pt-[22px]">
        <Boton type="submit" variante="primario">Agregar paso</Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </div>
      {error && <p role="alert" className="w-full text-sm text-plumon-hondo">{error}</p>}
    </form>
  )
}
