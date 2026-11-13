import type {
  Condicion,
  Expediente,
  Fecha,
  Movimiento,
  PasoInst,
  Plazo,
  Recurrente,
  ReglaAcumulado,
  TipoDia,
  TipoTramite,
} from '../types'
import {
  aDate,
  aFecha,
  diferenciaHabiles,
  diferenciaNaturales,
  sumarDias,
  ultimoHabilDelMes,
} from './fechas'

export const nuevoId = () => Math.random().toString(36).slice(2, 10)

/** ¿El paso aplica a un expediente con estos datos? */
export function cumple(condiciones: Condicion[] | undefined, datos: Record<string, string>) {
  return !condiciones?.length || condiciones.every((c) => c.valores.includes(datos[c.campoId] ?? ''))
}

export function instanciar(
  tipo: TipoTramite,
  datos: { folio: string; partes: string; objeto: string; apertura: Fecha; datos: Record<string, string> },
): Expediente {
  // Solo entran los pasos cuyas condiciones cumple el expediente; las etapas que quedan vacías se omiten.
  const etapas = tipo.etapas
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      inicia: e.inicia,
      pasos: e.pasos.filter((p) => cumple(p.condiciones, datos.datos)).map((p) => ({ ...structuredClone(p), estado: 'pendiente' as const })),
    }))
    .filter((e) => e.pasos.length)
  const resumen = tipo.campos.filter((c) => datos.datos[c.id]).map((c) => `${c.nombre}: ${datos.datos[c.id]}`).join('; ')
  return {
    id: nuevoId(),
    ...datos,
    campos: structuredClone(tipo.campos),
    tipoId: tipo.id,
    tipoNombre: tipo.nombre,
    estatus: 'abierto',
    etapas,
    movimientos: [],
    bitacora: [{ id: nuevoId(), fecha: datos.apertura, texto: `Expediente abierto como ${tipo.nombre}.${resumen ? ` ${resumen}.` : ''}` }],
  }
}

export const resuelto = (p: PasoInst) => p.estado !== 'pendiente'

export function buscarPaso(exp: Expediente, pasoId: string) {
  for (const [ei, e] of exp.etapas.entries()) {
    const paso = e.pasos.find((p) => p.id === pasoId)
    if (paso) return { paso, etapaIdx: ei }
  }
  return undefined
}

/** Fecha en que la etapa quedó habilitada: la anterior resuelta por completo. */
export function inicioEtapa(exp: Expediente, etapaIdx: number): Fecha | undefined {
  if (etapaIdx === 0 || exp.etapas[etapaIdx].inicia === 'apertura') return exp.apertura
  const previa = exp.etapas[etapaIdx - 1]
  if (!previa.pasos.every(resuelto)) return undefined
  const fechas = previa.pasos.map((p) => p.fechaHecho).filter((f): f is Fecha => !!f)
  const desde = inicioEtapa(exp, etapaIdx - 1)
  return fechas.length ? fechas.sort().at(-1) : desde
}

function basePlazo(exp: Expediente, etapaIdx: number, plazo: Plazo): Fecha | undefined {
  if (plazo.origen === 'apertura') return exp.apertura
  if (plazo.origen === 'inicioEtapa') return inicioEtapa(exp, etapaIdx)
  const ref = plazo.refPasoId ? buscarPaso(exp, plazo.refPasoId)?.paso : undefined
  return ref?.estado === 'hecho' ? ref.fechaHecho : undefined
}

export interface PlazoCalculado {
  desde: Fecha
  vence: Fecha
  tipoDia: TipoDia
}

export function calcularPlazo(
  exp: Expediente,
  etapaIdx: number,
  plazo: Plazo | undefined,
  inhabiles: ReadonlySet<Fecha>,
): PlazoCalculado | undefined {
  if (!plazo) return undefined
  const desde = basePlazo(exp, etapaIdx, plazo)
  if (!desde) return undefined
  return { desde, vence: sumarDias(desde, plazo.dias, plazo.tipoDia, inhabiles), tipoDia: plazo.tipoDia }
}

export type Nivel = 'vencido' | 'proximo' | 'aTiempo'

export function restan(vence: Fecha, tipoDia: TipoDia, hoy: Fecha, inhabiles: ReadonlySet<Fecha>) {
  return tipoDia === 'habiles' ? diferenciaHabiles(hoy, vence, inhabiles) : diferenciaNaturales(hoy, vence)
}

export function nivelDe(vence: Fecha, tipoDia: TipoDia, aviso: number, hoy: Fecha, inhabiles: ReadonlySet<Fecha>): Nivel {
  if (vence < hoy) return 'vencido'
  return restan(vence, tipoDia, hoy, inhabiles) <= aviso ? 'proximo' : 'aTiempo'
}

export function requisitosPendientes(exp: Expediente, paso: PasoInst): PasoInst[] {
  return paso.requiere
    .map((id) => buscarPaso(exp, id)?.paso)
    .filter((p): p is PasoInst => !!p && !resuelto(p))
}

export function etapaActual(exp: Expediente): number {
  return exp.etapas.findIndex((e) => !e.pasos.every(resuelto))
}

export function pasosPendientes(exp: Expediente): PasoInst[] {
  return exp.etapas.flatMap((e) => e.pasos.filter((p) => !resuelto(p)))
}

/** Lo que impide cerrar un expediente; vacío si se puede cerrar. */
export function bloqueosCierre(exp: Expediente) {
  const pendientes = exp.etapas.flatMap((e) => e.pasos.filter((p) => !resuelto(p)).map((p) => ({ paso: p, etapa: e.nombre })))
  const s = saldo(exp.movimientos).saldo
  const hechos = exp.etapas.flatMap((e) => e.pasos).filter((p) => p.estado === 'hecho').length
  return { pendientes, saldoNegativo: s < 0 ? -s : 0, sinPasosHechos: hechos === 0 }
}

/** El adeudo del cliente no bloquea: se confirma y queda asentado en la bitácora. */
export const puedeCerrar = (b: ReturnType<typeof bloqueosCierre>) => !b.pendientes.length && !b.sinPasosHechos

export function saldo(movs: Movimiento[]) {
  const anticipos = movs.filter((m) => m.tipo === 'anticipo').reduce((s, m) => s + m.monto, 0)
  const sum = (t: Movimiento['tipo']) => movs.filter((m) => m.tipo === t).reduce((s, m) => s + m.monto, 0)
  const gastos = sum('gasto')
  const impuestos = sum('impuesto')
  const honorarios = sum('honorario')
  return { anticipos, gastos, impuestos, honorarios, saldo: anticipos - gastos - impuestos - honorarios }
}

// ---------- Alertas ----------

export interface Alerta {
  key: string
  vence: Fecha
  desde: Fecha
  tipoDia: TipoDia
  nivel: Nivel
  restan: number
  /** Cuál plazo manda en esta fila. */
  cual: 'notaria' | 'ley' | 'recurrente'
  notaria?: PlazoCalculado
  ley?: PlazoCalculado
  titulo: string
  contexto: string
  expId?: string
  folio?: string
  partes?: string
  tipoNombre?: string
  pasoId?: string
  recurrenteId?: string
  periodo?: string
}

export function alertasExpediente(exp: Expediente, hoy: Fecha, inhabiles: ReadonlySet<Fecha>): Alerta[] {
  if (exp.estatus === 'cerrado') return []
  const out: Alerta[] = []
  exp.etapas.forEach((etapa, ei) => {
    for (const paso of etapa.pasos) {
      if (resuelto(paso)) continue
      const notaria = calcularPlazo(exp, ei, paso.plazoNotaria, inhabiles)
      const ley = calcularPlazo(exp, ei, paso.plazoLey, inhabiles)
      // Manda el plazo más próximo que aún no vence; si ambos vencieron, el de ley.
      const candidatos = [
        notaria && { ...notaria, cual: 'notaria' as const },
        ley && { ...ley, cual: 'ley' as const },
      ].filter((c) => !!c)
      if (!candidatos.length) continue
      const vigentes = candidatos.filter((c) => c.vence >= hoy).sort((a, b) => a.vence.localeCompare(b.vence))
      const manda = vigentes[0] ?? candidatos.find((c) => c.cual === 'ley') ?? candidatos[0]
      out.push({
        key: `${exp.id}:${paso.id}`,
        vence: manda.vence,
        desde: manda.desde,
        tipoDia: manda.tipoDia,
        cual: manda.cual,
        nivel: notaria && notaria.vence < hoy && manda.vence >= hoy
          ? 'vencido'
          : nivelDe(manda.vence, manda.tipoDia, paso.avisoPrevio, hoy, inhabiles),
        restan: restan(manda.vence, manda.tipoDia, hoy, inhabiles),
        notaria,
        ley,
        titulo: paso.nombre,
        contexto: etapa.nombre,
        expId: exp.id,
        folio: exp.folio,
        partes: exp.partes,
        tipoNombre: exp.tipoNombre,
        pasoId: paso.id,
      })
    }
  })
  return out
}

/** Lo que toca atender hoy: vencido (aunque sea solo el plazo de notaría) o que vence hoy. */
export const esDeHoy = (a: Alerta, hoy: Fecha) => a.nivel === 'vencido' || a.vence <= hoy

export function vencimientoRecurrente(r: Recurrente, anio: number, mes0: number, inhabiles: ReadonlySet<Fecha>): Fecha {
  if (r.dia === 'ultimoHabil') return ultimoHabilDelMes(anio, mes0, inhabiles)
  const ultimo = new Date(anio, mes0 + 1, 0).getDate()
  return aFecha(new Date(anio, mes0, Math.min(r.dia, ultimo)))
}

export const periodoDe = (f: Fecha) => f.slice(0, 7)

export function alertaRecurrente(r: Recurrente, hoy: Fecha, inhabiles: ReadonlySet<Fecha>): Alerta {
  const d = aDate(hoy)
  let anio = d.getFullYear()
  let mes0 = d.getMonth()
  // El primer periodo no atendido, empezando por el mes en curso.
  while (r.atendidos.includes(`${anio}-${String(mes0 + 1).padStart(2, '0')}`)) {
    mes0++
    if (mes0 > 11) { mes0 = 0; anio++ }
  }
  const vence = vencimientoRecurrente(r, anio, mes0, inhabiles)
  const desde = aFecha(new Date(anio, mes0, 1))
  return {
    key: `rec:${r.id}:${periodoDe(vence)}`,
    vence,
    desde,
    tipoDia: 'habiles',
    cual: 'recurrente',
    nivel: nivelDe(vence, 'habiles', r.avisoPrevio, hoy, inhabiles),
    restan: restan(vence, 'habiles', hoy, inhabiles),
    titulo: r.nombre,
    contexto: r.descripcion,
    recurrenteId: r.id,
    periodo: periodoDe(vence),
  }
}

export function todasLasAlertas(
  expedientes: Expediente[],
  recurrentes: Recurrente[],
  hoy: Fecha,
  inhabiles: ReadonlySet<Fecha>,
): Alerta[] {
  return [
    ...expedientes.flatMap((e) => alertasExpediente(e, hoy, inhabiles)),
    ...recurrentes.map((r) => alertaRecurrente(r, hoy, inhabiles)),
  ].sort((a, b) => a.vence.localeCompare(b.vence))
}

// ---------- Reglas de acumulado ----------

export interface AvisoAcumulado {
  /** Identifica el tramo rebasado: al atenderlo, el siguiente múltiplo del umbral vuelve a avisar. */
  key: string
  regla: ReglaAcumulado
  tipoNombre: string
  clave: string
  total: number
  tramo: number
  expedientes: Expediente[]
}

/** Valor numérico de un campo de moneda capturado como texto. */
export const montoDe = (v: string | undefined) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0

export function avisosAcumulado(tipos: TipoTramite[], expedientes: Expediente[], atendidos: string[]): AvisoAcumulado[] {
  const out: AvisoAcumulado[] = []
  for (const t of tipos) {
    for (const r of t.reglas ?? []) {
      if (!(r.umbral > 0)) continue
      const grupos = new Map<string, Expediente[]>()
      for (const e of expedientes) {
        if (e.tipoId !== t.id || !cumple(r.condiciones, e.datos)) continue
        const clave = (e.datos[r.campoClave] ?? '').trim()
        if (!clave) continue
        const k = clave.toLowerCase()
        grupos.set(k, [...(grupos.get(k) ?? []), e])
      }
      for (const [k, exps] of grupos) {
        const total = exps.reduce((s, e) => s + montoDe(e.datos[r.campoMonto]), 0)
        const tramo = Math.floor(total / r.umbral)
        const key = `${r.id}:${k}:${tramo}`
        if (tramo >= 1 && !atendidos.includes(key)) {
          out.push({ key, regla: r, tipoNombre: t.nombre, clave: exps[0].datos[r.campoClave].trim(), total, tramo, expedientes: exps })
        }
      }
    }
  }
  return out
}

export function describirPlazo(p: Plazo, nombrePaso?: (id: string) => string | undefined): string {
  const unidad = p.tipoDia === 'habiles' ? (p.dias === 1 ? 'día hábil' : 'días hábiles') : p.dias === 1 ? 'día natural' : 'días naturales'
  const origen =
    p.origen === 'apertura'
      ? 'desde la apertura'
      : p.origen === 'inicioEtapa'
        ? 'desde que inicia la etapa'
        : `desde «${(p.refPasoId && nombrePaso?.(p.refPasoId)) || 'paso sin elegir'}»`
  return `${p.dias} ${unidad} ${origen}`
}
