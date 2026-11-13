import type { CampoConfig } from '../types'
import { Campo, Entrada, Selector } from './ui'

/** Captura de un dato de apertura según su tipo; todos se guardan como texto. */
export function CampoDato({ campo, valor, onValor, invalido }: { campo: CampoConfig; valor: string; onValor: (v: string) => void; invalido?: boolean }) {
  const etiqueta = campo.requerido ? `${campo.nombre} *` : campo.nombre
  return (
    <Campo etiqueta={etiqueta} ayuda={campo.ayuda}>{(id) =>
      campo.tipo === 'opcion' ? (
        <Selector id={id} data-dato={campo.id} value={valor} aria-invalid={invalido} onChange={(e) => onValor(e.target.value)}>
          <option value="">Elige…</option>
          {(campo.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </Selector>
      ) : campo.tipo === 'sino' ? (
        <Selector id={id} data-dato={campo.id} value={valor} aria-invalid={invalido} onChange={(e) => onValor(e.target.value)}>
          <option value="">Elige…</option>
          <option value="Sí">Sí</option>
          <option value="No">No</option>
        </Selector>
      ) : (
        <Entrada id={id} data-dato={campo.id} type={campo.tipo === 'moneda' ? 'number' : 'text'} min={campo.tipo === 'moneda' ? 0 : undefined} step={campo.tipo === 'moneda' ? '0.01' : undefined}
          value={valor} aria-invalid={invalido} onChange={(e) => onValor(e.target.value)} />
      )
    }</Campo>
  )
}
