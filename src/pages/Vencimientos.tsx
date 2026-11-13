import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { Fragment, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFiltroUrl } from '../lib/url'
import { LeyendaRegla, Regla, ReglaEncabezado } from '../components/Regla'
import { Adjuntar, Boton, Encabezado, Entrada, EtiquetaAlerta, Marca, Pestanas, Selector, Vacio } from '../components/ui'
import type { PasoInst } from '../types'
import { cx, leerCosto, textoRestan } from '../lib/textos'
import { CampoCosto } from '../components/Cuenta'
import { fechaCorta, fechaLarga, hoy as hoyF, pesos, sumarNaturales } from '../lib/fechas'
import { avisosAcumulado, buscarPaso, esDeHoy, requisitosPendientes, saldo, todasLasAlertas, type Alerta } from '../lib/motor'
import { useAviso, useInhabiles, useStore } from '../store'

type Vista = 'hoy' | 'semana' | 'quince' | 'todo'
const VISTAS: Vista[] = ['hoy', 'semana', 'quince', 'todo']

const origen = { notaria: 'Notaría', ley: 'Ley', recurrente: 'Límite' }

/** Debajo de la fecha: de qué plazo se trata, y el otro plazo cuando ambos corren. */
const sublinea = (a: Alerta) => {
  if (a.nivel === 'vencido' && a.restan >= 0 && a.notaria) return `Ley · notaría venció ${fechaCorta(a.notaria.vence)}`
  if (a.restan >= 0 && a.notaria && a.ley && a.notaria.vence !== a.ley.vence) return `Notaría ${fechaCorta(a.notaria.vence)} · Ley ${fechaCorta(a.ley.vence)}`
  return `${origen[a.cual]} · ${textoRestan(a)}`
}

const nombreFila = (a: Alerta) => (a.folio ? `${a.folio}: ${a.titulo}` : `Obligación mensual: ${a.titulo}`)

/** Pasos agrupados bajo su expediente; las obligaciones mensuales forman un grupo propio. */
interface Grupo {
  clave: string
  titulo: string
  detalle: string
  expId?: string
  alertas: Alerta[]
}

function agrupar(alertas: Alerta[]): Grupo[] {
  const mapa = new Map<string, Grupo>()
  for (const a of alertas) {
    const clave = a.expId ?? 'mensual'
    if (!mapa.has(clave)) {
      mapa.set(clave, a.expId
        ? { clave, expId: a.expId, titulo: `${a.folio} · ${a.tipoNombre}`, detalle: a.partes ?? '', alertas: [] }
        : { clave, titulo: 'Obligaciones mensuales', detalle: 'Toda la notaría', alertas: [] })
    }
    mapa.get(clave)!.alertas.push(a)
  }
  // Las alertas ya vienen ordenadas por vencimiento: cada grupo hereda la fecha de su primer paso.
  return [...mapa.values()]
}

/** Solo se monta la vista que corresponde al ancho: evita filas y formularios duplicados en el DOM. */
const consulta = '(min-width: 1024px)'
const suscribir = (cb: () => void) => { const m = window.matchMedia(consulta); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
const useEsAncho = () => useSyncExternalStore(suscribir, () => window.matchMedia(consulta).matches)

const peor = (g: Grupo) => g.alertas.find((a) => a.nivel === 'vencido') ?? g.alertas[0]

export default function Vencimientos() {
  const { expedientes, recurrentes, tipos, atenderRecurrente, guardarRecurrente, completarPaso, restaurarExpediente, avisosAtendidos, atenderAviso } = useStore()
  const avisos = avisosAcumulado(tipos, expedientes, avisosAtendidos)
  const avisar = useAviso((s) => s.avisar)
  const inhabiles = useInhabiles()
  const navigate = useNavigate()
  const hoy = hoyF()
  const [vistaUrl, setVista] = useFiltroUrl('vista', 'hoy')
  const vista = (VISTAS.includes(vistaUrl as Vista) ? vistaUrl : 'hoy') as Vista
  const [q, setQ] = useFiltroUrl('q')
  const [tipo, setTipo] = useFiltroUrl('tipo')
  const [pidiendo, setPidiendo] = useState<string | null>(null)
  const [plegados, setPlegados] = useState<Set<string>>(new Set())
  const ancho = useEsAncho()

  const todas = useMemo(() => todasLasAlertas(expedientes, recurrentes, hoy, inhabiles), [expedientes, recurrentes, hoy, inhabiles])
  const filtradas = todas.filter((a) => {
    if (tipo && expedientes.find((e) => e.id === a.expId)?.tipoId !== tipo) return false
    const t = q.trim().toLowerCase()
    return !t || [a.folio, a.partes, a.titulo].some((s) => s?.toLowerCase().includes(t))
  })
  const semana = sumarNaturales(hoy, 7)
  const quince = sumarNaturales(hoy, 15)
  const porVista: Record<Vista, Alerta[]> = {
    hoy: filtradas.filter((a) => esDeHoy(a, hoy)),
    semana: filtradas.filter((a) => a.nivel === 'vencido' || a.vence <= semana),
    quince: filtradas.filter((a) => a.vence >= hoy && a.vence <= quince),
    todo: filtradas,
  }
  const grupos = agrupar(porVista[vista])
  // Ventana de la regla: alineada en todas las filas de la tabla.
  const inicio = sumarNaturales(hoy, -3)
  const DIAS = 13
  const inicioCorto = sumarNaturales(hoy, -2)
  const destinoDe = (a: Alerta) => (a.expId ? `/expedientes/${a.expId}?paso=${a.pasoId}` : '/calendario')
  const fatalDe = (a: Alerta) => (a.cual === 'recurrente' ? { desde: a.desde, vence: a.vence, tipoDia: a.tipoDia } : undefined)
  const alternar = (clave: string) => setPlegados((s) => { const n = new Set(s); if (n.has(clave)) n.delete(clave); else n.add(clave); return n })

  const pasoDe = (a: Alerta) => {
    const exp = expedientes.find((e) => e.id === a.expId)
    return exp && buscarPaso(exp, a.pasoId!)?.paso
  }

  /** Lo que impide marcar hecho desde la bandeja; vacío si se puede. */
  const impedimento = (a: Alerta): string => {
    if (a.recurrenteId) return ''
    const exp = expedientes.find((e) => e.id === a.expId)
    const paso = pasoDe(a)
    if (!exp || !paso) return 'Paso no encontrado'
    const faltan = requisitosPendientes(exp, paso)
    return faltan.length ? `Requiere: ${faltan.map((p) => p.nombre).join(', ')}` : ''
  }

  /** Tras marcar, el foco pasa al círculo que quedó en el mismo lugar. */
  const enfocarCirculo = (i: number) => requestAnimationFrame(() => {
    const visibles = [...document.querySelectorAll<HTMLButtonElement>('[data-circulo]')].filter((b) => b.offsetParent)
    ;(visibles[i] ?? visibles.at(-1))?.focus()
  })

  /** Al cancelar el registro rápido, el foco vuelve al círculo que lo abrió. */
  const cancelar = (clave: string) => {
    setPidiendo(null)
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-clave="${clave}"]`)?.focus())
  }

  const marcar = (a: Alerta, i: number, datos: { fecha?: string; monto?: number; archivo?: string; nota?: string } = {}) => {
    setPidiendo(null)
    enfocarCirculo(i)
    if (a.recurrenteId) {
      const r = recurrentes.find((x) => x.id === a.recurrenteId)!
      atenderRecurrente(r.id, a.periodo!)
      avisar(`«${a.titulo}» marcado como enviado`, () => guardarRecurrente(r))
      return
    }
    const exp = expedientes.find((e) => e.id === a.expId)!
    const paso = buscarPaso(exp, a.pasoId!)!.paso
    const antes = saldo(exp.movimientos).saldo
    const copia = structuredClone(exp)
    const err = completarPaso(exp.id, paso.id, { fecha: hoy, ...datos })
    if (err) return avisar(err)
    const despues = saldo(useStore.getState().expedientes.find((e) => e.id === exp.id)!.movimientos).saldo
    const cargo = datos.monto ? ` · ${pesos(datos.monto)} en la cuenta` : ''
    // Solo se avisa si este registro dejó el saldo en negativo.
    const alerta = antes >= 0 && despues < 0 ? `. El saldo quedó en ${pesos(despues)}: falta cobrar al cliente` : ''
    avisar(`${exp.folio}: «${paso.nombre}» registrado${cargo}${alerta}`, () => restaurarExpediente(copia))
  }

  /** El círculo de la agenda: marcar hecho sin salir de la bandeja. */
  const circulo = (a: Alerta, i: number) => {
    const motivo = impedimento(a)
    const pideDatos = !!pasoDe(a)?.costo
    const accion = a.recurrenteId ? 'Marcar enviado' : 'Marcar hecho'
    return (
      <button
        type="button"
        // aria-disabled en lugar de disabled: el motivo sigue alcanzable con el teclado.
        aria-disabled={!!motivo}
        title={motivo || accion}
        aria-label={`${accion}: ${nombreFila(a)}${motivo ? `. ${motivo}` : ''}`}
        aria-expanded={pideDatos ? pidiendo === a.key : undefined}
        data-circulo
        data-clave={a.key}
        onClick={(e) => {
          e.stopPropagation()
          if (motivo) return avisar(`${nombreFila(a)}. ${motivo}`)
          if (pideDatos) setPidiendo(pidiendo === a.key ? null : a.key)
          else marcar(a, i)
        }}
        className="group relative -m-1.5 rounded-full p-1.5 hover:bg-verde-claro aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
      >
        {/* Con el formulario abierto el paso aún no está hecho: el círculo no se pinta de verde. */}
        <Marca estado="pendiente" className={cx(!motivo && pidiendo !== a.key && 'group-hover:hidden group-focus-visible:hidden')} />
        {!motivo && pidiendo !== a.key && <Marca estado="hecho" className="hidden group-hover:block group-focus-visible:block" />}
        {/* Rótulo visible: el círculo no es solo decoración, marca el paso. */}
        {!motivo && pidiendo !== a.key && (
          <span aria-hidden className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-texto px-1.5 py-0.5 text-xs whitespace-nowrap text-white group-hover:block group-focus-visible:block">
            {a.recurrenteId ? 'Enviado' : pideDatos ? 'Registrar' : 'Hecho'}
          </span>
        )}
      </button>
    )
  }

  const encabezadoGrupo = (g: Grupo, plegado: boolean) => {
    const Chevron = plegado ? ChevronRight : ChevronDown
    const p = peor(g)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" aria-expanded={!plegado} onClick={() => alternar(g.clave)} className="flex min-w-0 items-center gap-2 text-left">
          <Chevron className="h-4 w-4 shrink-0 text-sub" />
          <span className="font-cond text-[15px] font-semibold whitespace-nowrap">{g.titulo}</span>
          <span className="min-w-0 truncate text-sm text-sub">{g.detalle}</span>
        </button>
        <span className="text-xs text-sub">
          {g.alertas.length === 1 ? '1 paso' : `${g.alertas.length} pasos`} · vence {fechaCorta(p.vence)}
        </span>
        {plegado && <EtiquetaAlerta alerta={p} />}
        {g.expId && <Link to={`/expedientes/${g.expId}`} className="ml-auto text-xs text-tinta hover:underline">Abrir expediente<span className="sr-only"> {g.titulo}</span></Link>}
      </div>
    )
  }

  // Posición de cada fila visible, para devolver el foco al círculo que ocupa su lugar.
  const orden = new Map(grupos.flatMap((g) => (plegados.has(g.clave) ? [] : g.alertas)).map((a, i) => [a.key, i]))

  return (
    <>
      <Encabezado titulo="Vencimientos" sub={fechaLarga(hoy)}>
        <Selector aria-label="Tipo de trámite" value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-48!">
          <option value="">Todos los trámites</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </Selector>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-sub" />
          <Entrada aria-label="Buscar" placeholder="Folio, partes o paso" value={q} onChange={(e) => setQ(e.target.value)} className="w-52! pl-8" />
        </div>
        <Boton variante="primario" onClick={() => navigate('/expedientes/nuevo')}><Plus className="h-4 w-4" />Nuevo expediente</Boton>
      </Encabezado>

      {avisos.length > 0 && (
        <section aria-labelledby="titulo-avisos" className="mb-5 border border-plumon-borde bg-hoja">
          <h2 id="titulo-avisos" className="border-b border-raya-suave bg-plumon-claro px-4 py-2 font-cond text-[15px] font-semibold text-plumon-hondo">
            Avisos por acumulado · {avisos.length}
          </h2>
          <ul>
            {avisos.map((av) => (
              <li key={av.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-raya-suave px-4 py-3 text-sm first:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{av.clave}: {pesos(av.total)} acumulados rebasan {pesos(av.regla.umbral * av.tramo)}</p>
                  <p className="text-xs text-sub">
                    {av.regla.nombre} · {av.tipoNombre} ·{' '}
                    {av.expedientes.map((e, i) => (
                      <Fragment key={e.id}>{i > 0 && ', '}<Link to={`/expedientes/${e.id}`} className="text-tinta hover:underline">{e.folio}</Link></Fragment>
                    ))}
                  </p>
                </div>
                <Boton chico onClick={() => { atenderAviso(av.key); avisar(`Aviso de ${av.clave} marcado como atendido`, () => useStore.setState((s) => ({ avisosAtendidos: s.avisosAtendidos.filter((k) => k !== av.key) }))) }}>
                  Marcar atendido<span className="sr-only">: {av.clave}</span>
                </Boton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Pestanas
        valor={vista}
        onCambio={setVista}
        opciones={[
          { id: 'hoy', texto: 'Hoy y vencidos', cuenta: porVista.hoy.length, alerta: true },
          { id: 'semana', texto: 'Esta semana', cuenta: porVista.semana.length },
          { id: 'quince', texto: 'Próximos 15 días', cuenta: porVista.quince.length },
          { id: 'todo', texto: 'Todo', cuenta: porVista.todo.length },
        ]}
      />

      {grupos.length === 0 ? (
        <div className="mt-4">
          <Vacio titulo={vista === 'hoy' ? 'Nada pendiente para hoy.' : 'Sin vencimientos en esta vista.'}>
            {q || tipo ? 'Prueba quitando el filtro o la búsqueda.' : 'Los pasos con plazo aparecen aquí en cuanto su plazo empieza a correr.'}
          </Vacio>
        </div>
      ) : (
        <>
          {!ancho && (
          <div className="border border-t-0 border-raya bg-hoja">
            {grupos.map((g) => {
              const plegado = plegados.has(g.clave)
              return (
                <section key={g.clave} aria-label={g.titulo} className="border-b border-raya last:border-0">
                  <div className="bg-fila px-4 py-2.5">{encabezadoGrupo(g, plegado)}</div>
                  {!plegado && (
                    <ul>
                      {g.alertas.map((a) => {
                        const i = orden.get(a.key)!
                        return (
                          <li key={a.key} onClick={() => navigate(destinoDe(a))} className="flex cursor-pointer flex-col gap-1.5 border-t border-raya-suave px-4 py-3">
                            <div className="flex items-start gap-3">
                              <span className="pt-0.5">{circulo(a, i)}</span>
                              <div className="min-w-0 flex-1">
                                <Link to={destinoDe(a)} onClick={(e) => e.stopPropagation()} aria-label={nombreFila(a)} className="block truncate font-medium">{a.titulo}</Link>
                                <span className="block truncate text-xs text-sub">{a.contexto}</span>
                              </div>
                              <EtiquetaAlerta alerta={a} />
                            </div>
                            <div className="flex items-baseline gap-2 pl-8">
                              <span className={cx('font-cond text-base font-semibold', a.restan < 0 && 'text-plumon')}>{fechaCorta(a.vence)}</span>
                              <span className="text-xs text-sub">{sublinea(a)}</span>
                            </div>
                            <div className="overflow-x-auto pl-8"><Regla decorativa inicio={inicioCorto} dias={11} hoy={hoy} inhabiles={inhabiles} notaria={a.notaria} ley={a.ley} fatal={fatalDe(a)} /></div>
                            {pidiendo === a.key && <RegistroRapido paso={pasoDe(a)!} onCancelar={() => cancelar(a.key)} onGuardar={(d) => marcar(a, i, d)} />}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>

          )}

          {ancho && (
          <div className="overflow-x-auto border border-t-0 border-raya bg-hoja">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-raya text-left text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-sub uppercase">
                  <th className="relative w-12 py-2.5 pl-4"><span className="sr-only">Marcar hecho</span></th>
                  <th className="px-3 py-2.5">Paso · etapa</th>
                  <th className="w-[150px] px-3 py-2.5 xl:w-[200px]">Vence</th>
                  <th className="w-[262px] px-3 py-1.5 normal-case xl:w-[336px]">
                    <span className="sr-only">Días</span>
                    <span className="xl:hidden"><ReglaEncabezado inicio={inicioCorto} dias={10} hoy={hoy} inhabiles={inhabiles} /></span>
                    <span className="hidden xl:block"><ReglaEncabezado inicio={inicio} dias={DIAS} hoy={hoy} inhabiles={inhabiles} /></span>
                  </th>
                  <th className="hidden w-[140px] py-2.5 pr-4 pl-3 xl:table-cell">Estado</th>
                </tr>
              </thead>
              {grupos.map((g) => {
                const plegado = plegados.has(g.clave)
                return (
                  <tbody key={g.clave} className="border-b border-raya last:border-0">
                    <tr className="bg-fila">
                      <th scope="colgroup" colSpan={5} className="px-4 py-2.5 text-left font-normal">{encabezadoGrupo(g, plegado)}</th>
                    </tr>
                    {!plegado && g.alertas.map((a) => {
                      const i = orden.get(a.key)!
                      const destino = destinoDe(a)
                      return (
                        <Fragment key={a.key}>
                          <tr onClick={() => navigate(destino)} className="cursor-pointer border-t border-raya-suave hover:bg-fila">
                            <td className="py-3 pl-4">{circulo(a, i)}</td>
                            <td className="px-3 py-3">
                              <Link to={destino} onClick={(e) => e.stopPropagation()} title={a.titulo} aria-label={nombreFila(a)} className="line-clamp-2 font-medium text-texto hover:text-tinta hover:underline">{a.titulo}</Link>
                              <span className="block truncate text-xs text-sub">{a.contexto}</span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={cx('block font-cond text-base font-semibold', a.restan < 0 && 'text-plumon')}>{fechaCorta(a.vence)}</span>
                              <span className="block truncate text-xs text-sub" title={sublinea(a)}>{sublinea(a)}</span>
                              <span className="mt-1 block xl:hidden"><EtiquetaAlerta alerta={a} /></span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="xl:hidden"><Regla decorativa inicio={inicioCorto} dias={10} hoy={hoy} inhabiles={inhabiles} notaria={a.notaria} ley={a.ley} fatal={fatalDe(a)} /></span>
                              <span className="hidden xl:block"><Regla decorativa inicio={inicio} dias={DIAS} hoy={hoy} inhabiles={inhabiles} notaria={a.notaria} ley={a.ley} fatal={fatalDe(a)} /></span>
                            </td>
                            <td className="hidden py-3 pr-4 pl-3 xl:table-cell"><EtiquetaAlerta alerta={a} /></td>
                          </tr>
                          {pidiendo === a.key && (
                            <tr className="border-t border-raya-suave">
                              <td colSpan={5} className="p-0"><RegistroRapido paso={pasoDe(a)!} onCancelar={() => cancelar(a.key)} onGuardar={(d) => marcar(a, i, d)} /></td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                )
              })}
            </table>
          </div>
          )}
          <div className="mt-3"><LeyendaRegla estados={false} /></div>
        </>
      )}
    </>
  )
}

/** Registro rápido de un paso con costo: fecha, lo que realmente se cargó y su comprobante. */
function RegistroRapido({ paso, onGuardar, onCancelar }: {
  paso: PasoInst
  onGuardar: (d: { fecha: string; monto?: number; archivo?: string; nota?: string }) => void
  onCancelar: () => void
}) {
  const [fecha, setFecha] = useState(hoyF())
  const [monto, setMonto] = useState(paso.costo?.monto ? String(paso.costo.monto) : '')
  const [sinCosto, setSinCosto] = useState(false)
  const [archivo, setArchivo] = useState('')
  const [error, setError] = useState('')
  const id = useId()
  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === 'Escape' && onCancelar()}
      onSubmit={(e) => {
        e.preventDefault()
        const r = leerCosto(paso.costo!, monto, sinCosto)
        if (r.error) {
          setError(r.error)
          document.getElementById(`${id}-monto`)?.focus()
          return
        }
        onGuardar({ fecha, monto: r.monto, archivo: archivo || undefined, nota: sinCosto ? 'Sin costo en este expediente.' : undefined })
      }}
      className="flex flex-wrap items-start gap-3 bg-fila px-4 py-3 lg:pl-14"
    >
      <div className="w-36">
        <label htmlFor={`${id}-fecha`} className="mb-1 block text-[13px] font-medium text-sub">Fecha</label>
        <Entrada id={`${id}-fecha`} type="date" value={fecha} max={hoyF()} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <CampoCosto id={`${id}-monto`} costo={paso.costo!} monto={monto} onMonto={(v) => { setMonto(v); setError('') }}
        sinCosto={sinCosto} onSinCosto={(v) => { setSinCosto(v); setError('') }} error={error} />
      <Adjuntar etiqueta="Comprobante" archivo={archivo} onArchivo={setArchivo} />
      <div className="flex gap-2 pt-[22px]">
        <Boton type="submit" variante="primario">Guardar registro</Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </div>
      {error && <p id={`${id}-monto-error`} role="alert" className="w-full text-sm text-plumon-hondo">{error}</p>}
    </form>
  )
}
