import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hoy, pesos } from './lib/fechas'
import { bloqueosCierre, buscarPaso, instanciar, nuevoId, puedeCerrar, requisitosPendientes, saldo } from './lib/motor'
import { expedientesSemilla, inhabilesSemilla, recurrentesSemilla, tiposSemilla } from './lib/seed'
import type { Expediente, Fecha, Movimiento, Recurrente, TipoTramite } from './types'

interface Datos {
  tipos: TipoTramite[]
  expedientes: Expediente[]
  recurrentes: Recurrente[]
  inhabiles: Fecha[]
  /** Avisos de acumulado ya atendidos (clave de regla, grupo y tramo). */
  avisosAtendidos: string[]
}

interface Acciones {
  guardarTipo: (t: TipoTramite) => void
  eliminarTipo: (id: string) => void
  abrirExpediente: (tipoId: string, datos: { partes: string; objeto: string; apertura: Fecha; datos: Record<string, string> }) => string
  atenderAviso: (key: string) => void
  completarPaso: (expId: string, pasoId: string, d: { fecha: Fecha; nota?: string; archivo?: string; monto?: number }) => string | undefined
  noSolicitar: (expId: string, pasoId: string) => void
  reabrirPaso: (expId: string, pasoId: string) => void
  agregarMovimiento: (expId: string, m: Omit<Movimiento, 'id'>) => string | undefined
  eliminarMovimiento: (expId: string, movId: string) => string | undefined
  /** Devuelve un expediente a una copia previa (para «Deshacer»). */
  restaurarExpediente: (exp: Expediente) => void
  agregarNota: (expId: string, texto: string) => void
  cerrarExpediente: (expId: string) => string | undefined
  reabrirExpediente: (expId: string) => void
  guardarRecurrente: (r: Recurrente) => void
  eliminarRecurrente: (id: string) => void
  atenderRecurrente: (id: string, periodo: string) => void
  agregarInhabil: (f: Fecha) => void
  quitarInhabil: (f: Fecha) => void
  reiniciar: () => void
}

function semilla(): Datos {
  const tipos = tiposSemilla()
  return { tipos, expedientes: expedientesSemilla(tipos, hoy()), recurrentes: recurrentesSemilla(), inhabiles: inhabilesSemilla(), avisosAtendidos: [] }
}

/**
 * Huella de los datos de ejemplo: si la plantilla, las obligaciones o los inhábiles sembrados cambian,
 * cambia la clave de almacenamiento y el navegador arranca con la siembra nueva. Nadie sube versiones a mano.
 */
function huella(texto: string) {
  let h = 5381
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
const PREFIJO = 'notaria-demo'
const CLAVE = `${PREFIJO}-${huella(JSON.stringify([tiposSemilla(), recurrentesSemilla(), inhabilesSemilla()]))}`

// Datos guardados con una siembra anterior ya no aplican: se descartan.
try {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIJO) && k !== CLAVE) localStorage.removeItem(k)
} catch {
  // Sin almacenamiento disponible no hay nada que limpiar.
}

const nota = (texto: string, fecha: Fecha = hoy()) => ({ id: nuevoId(), fecha, texto })

export const useStore = create<Datos & Acciones>()(
  persist(
    (set, get) => {
      /** Aplica un cambio inmutable a un expediente. */
      const conExp = (expId: string, fn: (e: Expediente) => void) =>
        set((s) => ({
          expedientes: s.expedientes.map((e) => {
            if (e.id !== expId) return e
            const copia = structuredClone(e)
            fn(copia)
            return copia
          }),
        }))

      return {
        ...semilla(),

        guardarTipo: (t) =>
          set((s) => ({ tipos: s.tipos.some((x) => x.id === t.id) ? s.tipos.map((x) => (x.id === t.id ? t : x)) : [...s.tipos, t] })),
        eliminarTipo: (id) => set((s) => ({ tipos: s.tipos.filter((t) => t.id !== id) })),

        abrirExpediente: (tipoId, datos) => {
          const tipo = get().tipos.find((t) => t.id === tipoId)
          if (!tipo) throw new Error('Tipo de trámite inexistente')
          const anio = datos.apertura.slice(0, 4)
          const usados = get().expedientes.filter((e) => e.folio.startsWith(anio)).map((e) => Number(e.folio.split('/')[1]) || 0)
          const folio = `${anio}/${String(Math.max(0, ...usados) + 1).padStart(4, '0')}`
          const exp = instanciar(tipo, { ...datos, folio })
          set((s) => ({ expedientes: [exp, ...s.expedientes] }))
          return exp.id
        },

        completarPaso: (expId, pasoId, d) => {
          const exp = get().expedientes.find((e) => e.id === expId)
          const r = exp && buscarPaso(exp, pasoId)
          if (!exp || !r) return 'Paso no encontrado.'
          const faltan = requisitosPendientes(exp, r.paso)
          if (faltan.length) return `Antes debe quedar resuelto: ${faltan.map((p) => p.nombre).join(', ')}.`
          conExp(expId, (e) => {
            const p = buscarPaso(e, pasoId)!.paso
            p.estado = 'hecho'
            p.fechaHecho = d.fecha
            p.nota = d.nota || undefined
            p.archivo = d.archivo || undefined
            if (p.costo && d.monto) {
              e.movimientos.push({ id: nuevoId(), fecha: d.fecha, tipo: p.costo.tipo, concepto: p.costo.concepto, monto: d.monto, pasoId, comprobante: d.archivo || undefined })
            }
            e.bitacora.push(nota(`${p.nombre}: hecho${d.nota ? `. ${d.nota}` : '.'}`, d.fecha))
          })
        },

        noSolicitar: (expId, pasoId) =>
          conExp(expId, (e) => {
            const p = buscarPaso(e, pasoId)?.paso
            if (!p?.opcional) return
            p.estado = 'noSolicita'
            e.bitacora.push(nota(`${p.nombre}: no se solicita.`))
          }),

        reabrirPaso: (expId, pasoId) =>
          conExp(expId, (e) => {
            const p = buscarPaso(e, pasoId)?.paso
            if (!p) return
            p.estado = 'pendiente'
            p.fechaHecho = undefined
            // El dinero no se borra: cada cargo vigente del paso recibe un contra-asiento.
            const cancelados = new Set(e.movimientos.map((m) => m.cancela).filter(Boolean))
            const vigentes = e.movimientos.filter((m) => m.pasoId === pasoId && !m.cancela && !cancelados.has(m.id))
            for (const m of vigentes) {
              e.movimientos.push({ id: nuevoId(), fecha: hoy(), tipo: m.tipo, concepto: `Cancelación: ${m.concepto}`, monto: -m.monto, pasoId, cancela: m.id })
            }
            const total = vigentes.reduce((t, m) => t + m.monto, 0)
            e.bitacora.push(nota(`${p.nombre}: reabierto.${total ? ` Contra-asiento por ${pesos(total)}.` : ''}`))
          }),

        agregarMovimiento: (expId, m) => {
          if (get().expedientes.find((e) => e.id === expId)?.estatus === 'cerrado') return 'El expediente está cerrado; reábrelo para registrar movimientos.'
          conExp(expId, (e) => {
            e.movimientos.push({ ...m, id: nuevoId() })
            e.bitacora.push(nota(`Movimiento registrado: ${m.concepto}, ${pesos(m.monto)}.`, m.fecha))
          })
        },
        eliminarMovimiento: (expId, movId) => {
          if (get().expedientes.find((e) => e.id === expId)?.estatus === 'cerrado') return 'El expediente está cerrado; reábrelo para eliminar movimientos.'
          conExp(expId, (e) => {
            const m = e.movimientos.find((x) => x.id === movId)
            e.movimientos = e.movimientos.filter((x) => x.id !== movId)
            if (m) e.bitacora.push(nota(`Movimiento eliminado: ${m.concepto}, ${pesos(m.monto)}.`))
          })
        },
        restaurarExpediente: (exp) => set((s) => ({ expedientes: s.expedientes.map((e) => (e.id === exp.id ? exp : e)) })),

        agregarNota: (expId, texto) => conExp(expId, (e) => { e.bitacora.push(nota(texto)) }),

        cerrarExpediente: (expId) => {
          const exp = get().expedientes.find((e) => e.id === expId)
          if (!exp) return 'Expediente no encontrado.'
          const b = bloqueosCierre(exp)
          if (!puedeCerrar(b)) return 'El expediente aún no se puede cerrar.'
          conExp(expId, (e) => {
            e.estatus = 'cerrado'
            e.fechaCierre = hoy()
            const adeudo = -saldo(e.movimientos).saldo
            e.bitacora.push(nota(adeudo > 0 ? `Expediente cerrado con adeudo del cliente de ${pesos(adeudo)}.` : 'Expediente cerrado.'))
          })
        },

        reabrirExpediente: (expId) =>
          conExp(expId, (e) => {
            e.estatus = 'abierto'
            e.fechaCierre = undefined
            e.bitacora.push(nota('Expediente reabierto.'))
          }),

        guardarRecurrente: (r) =>
          set((s) => ({ recurrentes: s.recurrentes.some((x) => x.id === r.id) ? s.recurrentes.map((x) => (x.id === r.id ? r : x)) : [...s.recurrentes, r] })),
        eliminarRecurrente: (id) => set((s) => ({ recurrentes: s.recurrentes.filter((r) => r.id !== id) })),
        atenderRecurrente: (id, periodo) =>
          set((s) => ({ recurrentes: s.recurrentes.map((r) => (r.id === id ? { ...r, atendidos: [...r.atendidos, periodo] } : r)) })),

        atenderAviso: (key) => set((s) => ({ avisosAtendidos: [...s.avisosAtendidos, key] })),

        agregarInhabil: (f) => set((s) => ({ inhabiles: [...new Set([...s.inhabiles, f])].sort() })),
        quitarInhabil: (f) => set((s) => ({ inhabiles: s.inhabiles.filter((x) => x !== f) })),

        reiniciar: () => set(semilla()),
      }
    },
    {
      name: CLAVE,
    },
  ),
)

// La semilla lleva ids aleatorios: se guarda de inmediato para que los enlaces sobrevivan a una recarga.
try {
  if (!localStorage.getItem(CLAVE)) useStore.setState({})
} catch {
  // Sin almacenamiento disponible la demo funciona igual, solo en memoria.
}

/** Conjunto de días inhábiles para los cálculos de plazo. */
export function useInhabiles(): ReadonlySet<Fecha> {
  const lista = useStore((s) => s.inhabiles)
  return useMemo(() => new Set(lista), [lista])
}

/** Aviso efímero (no se guarda): confirma una acción y ofrece deshacerla. */
interface AvisoEstado {
  aviso: { id: number; texto: string; deshacer?: () => void } | null
  avisar: (texto: string, deshacer?: () => void) => void
  cerrarAviso: () => void
}
export const useAviso = create<AvisoEstado>()((set) => ({
  aviso: null,
  avisar: (texto, deshacer) => set({ aviso: { id: Date.now(), texto, deshacer } }),
  cerrarAviso: () => set({ aviso: null }),
}))
