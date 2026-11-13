import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Regla } from '../components/Regla'
import { Boton, Campo, Encabezado, Entrada, IconoPaso, Selector, Confirmar } from '../components/ui'
import { hoy as hoyF, pesos, sumarDias } from '../lib/fechas'
import { describirPlazo, nuevoId } from '../lib/motor'
import { useInhabiles, useStore } from '../store'
import { EditorCampos, EditorCondiciones, EditorReglas } from '../components/EditorEsquema'
import { describirCondiciones } from '../lib/textos'
import type { CampoConfig, EtapaConfig, PasoConfig, Plazo, TipoMovimiento, TipoPaso, TipoTramite } from '../types'
import { cx, nombreTipoPaso, nombreMovimiento } from '../lib/textos'

const mover = <T,>(lista: T[], i: number, d: -1 | 1) => {
  const j = i + d
  if (j < 0 || j >= lista.length) return lista
  const c = [...lista]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

interface ErrorEditor { texto: string; ancla: string }

function validar(t: TipoTramite): ErrorEditor[] {
  const errores: ErrorEditor[] = []
  const push = (texto: string, ancla = 'datos-tramite') => errores.push({ texto, ancla })
  if (!t.nombre.trim()) push('El trámite necesita nombre.')
  const ids = new Set(t.etapas.flatMap((e) => e.pasos.map((p) => p.id)))
  t.etapas.forEach((e, i) => {
    const ancla = `etapa-${e.id}`
    if (!e.nombre.trim()) push(`La etapa ${i + 1} necesita nombre.`, ancla)
    e.pasos.forEach((p) => {
      if (!p.nombre.trim()) push(`Hay un paso sin nombre en «${e.nombre}».`, ancla)
      for (const pl of [p.plazoNotaria, p.plazoLey]) {
        if (pl?.origen === 'paso' && (!pl.refPasoId || !ids.has(pl.refPasoId))) push(`«${p.nombre}»: elige desde qué paso corre su plazo.`, ancla)
        if (pl && pl.dias < 1) push(`«${p.nombre}»: el plazo debe ser de al menos 1 día.`, ancla)
      }
      const n = p.plazoNotaria
      const l = p.plazoLey
      if (n && l && n.tipoDia === l.tipoDia && n.origen === l.origen && n.refPasoId === l.refPasoId && n.dias > l.dias) {
        push(`«${p.nombre}»: el plazo de la notaría (${n.dias} días) no puede ser mayor que el de ley (${l.dias}).`, ancla)
      }
      for (const c of p.condiciones ?? []) {
        if (!t.campos.some((x) => x.id === c.campoId)) push(`«${p.nombre}»: una condición usa un dato que ya no existe.`, ancla)
      }
    })
  })
  t.campos.forEach((c) => {
    if (!c.nombre.trim()) push('Hay un dato de apertura sin nombre.', 'titulo-campos')
    if (c.tipo === 'opcion' && !(c.opciones ?? []).length) push(`El dato «${c.nombre}» necesita al menos una opción.`, 'titulo-campos')
  })
  t.reglas.forEach((r) => {
    if (!r.campoClave || !r.campoMonto || !(r.umbral > 0)) push(`La regla «${r.nombre}» necesita dato para agrupar, monto a sumar y umbral.`, 'titulo-reglas')
  })
  return errores
}

export default function TramiteEditor() {
  const { id } = useParams()
  const original = useStore((s) => s.tipos.find((t) => t.id === id))
  const { guardarTipo, eliminarTipo, expedientes } = useStore()
  const navigate = useNavigate()
  const [borrador, setBorrador] = useState<TipoTramite | undefined>(() => original && structuredClone(original))
  const [abierto, setAbierto] = useState<string | null>(null)
  // Paso recién agregado: su nombre recibe el foco para escribirlo de inmediato.
  const [recien, setRecien] = useState<string | null>(null)
  const [borrandoTipo, setBorrandoTipo] = useState(false)
  const [borrandoEtapa, setBorrandoEtapa] = useState<string | null>(null)
  const [errores, setErrores] = useState<ErrorEditor[]>([])
  const [guardado, setGuardado] = useState(false)
  const sucio = JSON.stringify(borrador) !== JSON.stringify(original)
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => sucio && currentLocation.pathname !== nextLocation.pathname)

  if (!borrador || !original) {
    return (
      <>
        <Encabezado titulo="Tipo de trámite no encontrado" />
        <Link className="text-tinta underline" to="/tramites">Volver</Link>
      </>
    )
  }

  const usos = expedientes.filter((e) => e.tipoId === borrador.id).length
  const todos = borrador.etapas.flatMap((e) => e.pasos.map((p) => ({ ...p, etapa: e.nombre })))
  const cambiar = (fn: (t: TipoTramite) => void) => {
    const c = structuredClone(borrador)
    fn(c)
    setBorrador(c)
    setGuardado(false)
  }
  const cambiarEtapa = (ei: number, fn: (e: EtapaConfig) => void) => cambiar((t) => fn(t.etapas[ei]))
  const cambiarPaso = (ei: number, pi: number, fn: (p: PasoConfig) => void) => cambiar((t) => fn(t.etapas[ei].pasos[pi]))

  const quitarReferencias = (t: TipoTramite, ids: string[]) => {
    for (const p of t.etapas.flatMap((e) => e.pasos)) {
      p.requiere = p.requiere.filter((r) => !ids.includes(r))
      for (const k of ['plazoNotaria', 'plazoLey'] as const) if (p[k]?.refPasoId && ids.includes(p[k]!.refPasoId!)) p[k] = { ...p[k]!, origen: 'inicioEtapa', refPasoId: undefined }
    }
  }

  const guardar = () => {
    const e = validar(borrador)
    setErrores(e)
    if (e.length) return
    guardarTipo(borrador)
    setGuardado(true)
  }

  return (
    <>
      <Link to="/tramites" className="mb-3 inline-flex items-center gap-1 text-sm text-sub hover:text-tinta"><ArrowLeft className="h-4 w-4" /> Tipos de trámite</Link>
      <Encabezado titulo={borrador.nombre || 'Sin nombre'} sub={usos ? `${usos} expedientes lo usan; los cambios aplican solo a expedientes nuevos` : 'Sin expedientes todavía'}>
        {guardado && !sucio && <span className="text-sm text-verde-hondo">Cambios guardados</span>}
        <Boton disabled={!sucio} onClick={() => { setBorrador(structuredClone(original)); setErrores([]) }}>Descartar</Boton>
        <Boton variante="primario" disabled={!sucio} onClick={guardar}>Guardar cambios</Boton>
      </Encabezado>

      {bloqueo.state === 'blocked' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-marca-claro px-3 py-2 text-sm text-ocre">
          Tienes cambios sin guardar.
          <Boton chico onClick={() => bloqueo.reset()}>Seguir editando</Boton>
          <Boton chico variante="peligro" onClick={() => bloqueo.proceed()}>Salir sin guardar</Boton>
        </div>
      )}
      {errores.length > 0 && (
        <div role="alert" className="mb-4 rounded-md bg-plumon-claro px-4 py-3 text-sm text-plumon-hondo">
          <p className="font-semibold">Antes de guardar, corrige:</p>
          <ul className="mt-1 list-disc pl-5">
            {errores.map((e, i) => <li key={i}><a href={`#${e.ancla}`} className="underline underline-offset-2">{e.texto}</a></li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[300px_1fr]">
        <aside className="flex flex-col gap-4 self-start xl:sticky xl:top-6">
          <div id="datos-tramite" className="flex scroll-mt-6 flex-col gap-3 border border-raya bg-hoja p-4">
            <Campo etiqueta="Nombre">{(i) => <Entrada id={i} value={borrador.nombre} onChange={(e) => cambiar((t) => { t.nombre = e.target.value })} />}</Campo>
            <Campo etiqueta="Clave">{(i) => <Entrada id={i} value={borrador.clave} maxLength={4} onChange={(e) => cambiar((t) => { t.clave = e.target.value.toUpperCase() })} />}</Campo>
            <Campo etiqueta="Descripción">{(i) => <Entrada id={i} value={borrador.descripcion} onChange={(e) => cambiar((t) => { t.descripcion = e.target.value })} />}</Campo>
          </div>
          <EditorCampos campos={borrador.campos} onCambio={(c) => cambiar((t) => { t.campos = c })} />
          <nav aria-label="Etapas" className="border border-raya bg-hoja p-2 text-sm">
            {borrador.etapas.map((e, i) => (
              <a key={e.id} href={`#etapa-${e.id}`} className="flex justify-between rounded px-2 py-1.5 hover:bg-celda">
                <span>{i + 1}. {e.nombre || 'Sin nombre'}</span><span className="text-sub">{e.pasos.length}</span>
              </a>
            ))}
          </nav>
          {borrandoTipo ? (
            <Confirmar texto={`¿Eliminar «${borrador.nombre}»? Los expedientes existentes conservan su copia.`} accion="Eliminar"
              onConfirmar={() => { eliminarTipo(borrador.id); navigate('/tramites') }} onCancelar={() => setBorrandoTipo(false)} />
          ) : (
            <Boton variante="peligro" onClick={() => setBorrandoTipo(true)}><Trash2 className="h-4 w-4" />Eliminar tipo de trámite</Boton>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {borrador.etapas.map((etapa, ei) => (
            <section key={etapa.id} id={`etapa-${etapa.id}`} className="scroll-mt-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-cond text-xl font-bold text-sub">{ei + 1}.</span>
                <Entrada aria-label={`Nombre de la etapa ${ei + 1}`} value={etapa.nombre} onChange={(e) => cambiarEtapa(ei, (x) => { x.nombre = e.target.value })}
                  className="h-10 min-w-0 flex-1 border-transparent border-b-borde border-dashed bg-transparent font-cond text-xl font-bold hover:border-solid hover:border-borde md:max-w-md" />
                <div className="ml-auto flex gap-1">
                  <Boton chico variante="fantasma" aria-label={`Subir etapa: ${etapa.nombre}`} disabled={ei === 0} onClick={() => cambiar((t) => { t.etapas = mover(t.etapas, ei, -1) })}><ArrowUp className="h-4 w-4" /></Boton>
                  <Boton chico variante="fantasma" aria-label={`Bajar etapa: ${etapa.nombre}`} disabled={ei === borrador.etapas.length - 1} onClick={() => cambiar((t) => { t.etapas = mover(t.etapas, ei, 1) })}><ArrowDown className="h-4 w-4" /></Boton>
                  <Boton chico variante="peligro" aria-label={`Eliminar etapa: ${etapa.nombre}`} aria-expanded={borrandoEtapa === etapa.id} onClick={() => {
                    if (etapa.pasos.length) return setBorrandoEtapa(etapa.id)
                    cambiar((t) => { t.etapas.splice(ei, 1) })
                  }}><Trash2 className="h-3.5 w-3.5" /></Boton>
                </div>
              </div>
              {ei > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <label htmlFor={`inicia-${etapa.id}`} className="text-sub">Empieza</label>
                  <Selector id={`inicia-${etapa.id}`} value={etapa.inicia ?? 'anterior'} className="w-auto!"
                    onChange={(e) => cambiarEtapa(ei, (x) => { x.inicia = e.target.value === 'apertura' ? 'apertura' : undefined })}>
                    <option value="anterior">al terminar «{borrador.etapas[ei - 1].nombre}»</option>
                    <option value="apertura">desde la apertura, en paralelo</option>
                  </Selector>
                </div>
              )}
              {borrandoEtapa === etapa.id && (
                <div className="mb-2">
                  <Confirmar texto={`¿Eliminar la etapa «${etapa.nombre}» y sus ${etapa.pasos.length} pasos?`} accion="Eliminar etapa"
                    onConfirmar={() => { setBorrandoEtapa(null); cambiar((t) => { quitarReferencias(t, etapa.pasos.map((p) => p.id)); t.etapas.splice(ei, 1) }) }}
                    onCancelar={() => setBorrandoEtapa(null)} />
                </div>
              )}
              <ul className="border border-raya bg-hoja">
                {etapa.pasos.length === 0 && <li className="px-4 py-4 text-sm text-sub">Etapa sin pasos. Agrega documentos, pagos, esperas o tareas.</li>}
                {etapa.pasos.map((p, pi) => (
                  <EditorPaso
                    key={p.id}
                    paso={p}
                    abierto={abierto === p.id}
                    recien={recien === p.id}
                    onAlternar={() => setAbierto(abierto === p.id ? null : p.id)}
                    otros={todos.filter((o) => o.id !== p.id)}
                    campos={borrador.campos}
                    onCambio={(fn) => cambiarPaso(ei, pi, fn)}
                    onMover={(d) => cambiarEtapa(ei, (x) => { x.pasos = mover(x.pasos, pi, d) })}
                    primero={pi === 0}
                    ultimo={pi === etapa.pasos.length - 1}
                    onEliminar={() => cambiar((t) => { quitarReferencias(t, [p.id]); t.etapas[ei].pasos.splice(pi, 1) })}
                  />
                ))}
              </ul>
              <Boton chico variante="fantasma" className="mt-2" onClick={() => {
                const nuevo: PasoConfig = { id: nuevoId(), nombre: 'Nuevo paso', tipo: 'documento', opcional: false, avisoPrevio: 1, requiere: [] }
                cambiarEtapa(ei, (x) => { x.pasos.push(nuevo) })
                setAbierto(nuevo.id)
                setRecien(nuevo.id)
              }}><Plus className="h-4 w-4" />Agregar paso<span className="sr-only"> a {etapa.nombre}</span></Boton>
            </section>
          ))}
          <Boton className="self-start" onClick={() => cambiar((t) => { t.etapas.push({ id: nuevoId(), nombre: `Etapa ${t.etapas.length + 1}`, pasos: [] }) })}>
            <Plus className="h-4 w-4" />Agregar etapa
          </Boton>
          <div className="border-t border-raya pt-6">
            <EditorReglas reglas={borrador.reglas} campos={borrador.campos} onCambio={(r) => cambiar((t) => { t.reglas = r })} />
          </div>
        </div>
      </div>
    </>
  )
}

type Otro = PasoConfig & { etapa: string }

function EditorPaso({ paso, abierto, recien, onAlternar, otros, campos, onCambio, onMover, primero, ultimo, onEliminar }: {
  paso: PasoConfig
  campos: CampoConfig[]
  abierto: boolean
  recien: boolean
  onAlternar: () => void
  otros: Otro[]
  onCambio: (fn: (p: PasoConfig) => void) => void
  onMover: (d: -1 | 1) => void
  primero: boolean
  ultimo: boolean
  onEliminar: () => void
}) {
  const nombrePaso = (id: string) => otros.find((o) => o.id === id)?.nombre
  const Chevron = abierto ? ChevronDown : ChevronRight
  return (
    <li className="border-b border-raya-suave last:border-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onClick={onAlternar} aria-expanded={abierto} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Chevron className="h-4 w-4 shrink-0 text-sub" />
          <IconoPaso tipo={paso.tipo} />
          <span className="max-w-[70%] shrink-0 truncate font-medium" title={paso.nombre}>{paso.nombre || 'Sin nombre'}</span>
          <span className="hidden min-w-0 truncate text-xs text-sub md:inline">
            {[
              paso.plazoNotaria && `notaría ${describirPlazo(paso.plazoNotaria, nombrePaso)}`,
              paso.plazoLey && `ley ${describirPlazo(paso.plazoLey, nombrePaso)}`,
              paso.costo && paso.costo.monto > 0 && pesos(paso.costo.monto),
              paso.opcional && 'Solicita Sí/No',
              paso.condiciones?.length && `solo si ${describirCondiciones(paso.condiciones, campos)}`,
            ].filter(Boolean).join(' · ')}
          </span>
        </button>
        <div className="flex shrink-0 gap-1">
          <Boton chico variante="fantasma" aria-label={`Subir paso: ${paso.nombre}`} disabled={primero} onClick={() => onMover(-1)}><ArrowUp className="h-4 w-4" /></Boton>
          <Boton chico variante="fantasma" aria-label={`Bajar paso: ${paso.nombre}`} disabled={ultimo} onClick={() => onMover(1)}><ArrowDown className="h-4 w-4" /></Boton>
          <Boton chico variante="peligro" aria-label={`Eliminar paso: ${paso.nombre}`} onClick={onEliminar}><Trash2 className="h-3.5 w-3.5" /></Boton>
        </div>
      </div>
      {abierto && (
        <div className="grid gap-5 border-t border-raya-suave bg-fila px-4 py-4 pl-10 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Campo etiqueta="Nombre del paso">{(i) => <Entrada id={i} autoFocus={recien} onFocus={(e) => recien && e.currentTarget.select()} value={paso.nombre} onChange={(e) => onCambio((p) => { p.nombre = e.target.value })} />}</Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Tipo">{(i) => (
                <Selector id={i} value={paso.tipo} onChange={(e) => onCambio((p) => { p.tipo = e.target.value as TipoPaso })}>
                  {Object.entries(nombreTipoPaso).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Selector>
              )}</Campo>
              <Campo etiqueta="Avisar con anticipación" ayuda="Días antes del vencimiento">{(i) => (
                <Entrada id={i} type="number" min={0} max={30} value={paso.avisoPrevio} onChange={(e) => onCambio((p) => { p.avisoPrevio = Number(e.target.value) })} />
              )}</Campo>
            </div>
            <Campo etiqueta="Descripción">{(i) => <Entrada id={i} value={paso.descripcion ?? ''} onChange={(e) => onCambio((p) => { p.descripcion = e.target.value || undefined })} />}</Campo>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-tinta" checked={paso.opcional} onChange={(e) => onCambio((p) => { p.opcional = e.target.checked })} />
              Solicita Sí/No: se puede marcar «No se solicita» en cada expediente
            </label>
            <EditorCosto paso={paso} onCambio={onCambio} />
            <Requisitos paso={paso} otros={otros} onCambio={onCambio} />
            <EditorCondiciones condiciones={paso.condiciones ?? []} campos={campos} onCambio={(c) => onCambio((p) => { p.condiciones = c.length ? c : undefined })} />
          </div>
          <div className="flex flex-col gap-4">
            <EditorPlazo titulo="Plazo de la notaría" plazo={paso.plazoNotaria} otros={otros} onPlazo={(pl) => onCambio((p) => { p.plazoNotaria = pl })} />
            <EditorPlazo titulo="Plazo de ley" plazo={paso.plazoLey} otros={otros} onPlazo={(pl) => onCambio((p) => { p.plazoLey = pl })} />
            <VistaPrevia paso={paso} nombrePaso={nombrePaso} />
          </div>
        </div>
      )}
    </li>
  )
}

function EditorPlazo({ titulo, plazo, otros, onPlazo }: { titulo: string; plazo?: Plazo; otros: Otro[]; onPlazo: (p?: Plazo) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{titulo}</legend>
      <label className="mb-1 flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 accent-tinta" checked={!!plazo}
          onChange={(e) => onPlazo(e.target.checked ? { dias: 3, tipoDia: 'habiles', origen: 'inicioEtapa' } : undefined)} />
        {titulo}
      </label>
      {plazo && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-20"><Campo etiqueta="Días">{(i) => <Entrada id={i} type="number" min={1} value={plazo.dias} onChange={(e) => onPlazo({ ...plazo, dias: Number(e.target.value) })} />}</Campo></div>
          <div className="w-32">
            <Campo etiqueta="Cuenta">{(i) => (
              <Selector id={i} value={plazo.tipoDia} onChange={(e) => onPlazo({ ...plazo, tipoDia: e.target.value as Plazo['tipoDia'] })}>
                <option value="habiles">Hábiles</option><option value="naturales">Naturales</option>
              </Selector>
            )}</Campo>
          </div>
          <div className="w-60">
            <Campo etiqueta="Corre desde">{(i) => (
              <Selector id={i} value={plazo.origen} onChange={(e) => onPlazo({ ...plazo, origen: e.target.value as Plazo['origen'], refPasoId: e.target.value === 'paso' ? otros[0]?.id : undefined })}>
                <option value="apertura">La apertura del expediente</option>
                <option value="inicioEtapa">Que inicia esta etapa</option>
                <option value="paso" disabled={!otros.length}>Que se completa otro paso</option>
              </Selector>
            )}</Campo>
          </div>
          {plazo.origen === 'paso' && (
            <div className="w-full">
              <Campo etiqueta="Paso">{(i) => (
                <Selector id={i} value={plazo.refPasoId ?? ''} onChange={(e) => onPlazo({ ...plazo, refPasoId: e.target.value })}>
                  {[...new Set(otros.map((o) => o.etapa))].map((et) => (
                    <optgroup key={et} label={et}>
                      {otros.filter((o) => o.etapa === et).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </optgroup>
                  ))}
                </Selector>
              )}</Campo>
            </div>
          )}
        </div>
      )}
    </fieldset>
  )
}

function EditorCosto({ paso, onCambio }: { paso: PasoConfig; onCambio: (fn: (p: PasoConfig) => void) => void }) {
  const c = paso.costo
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Movimiento en la cuenta corriente</legend>
      <label className="mb-1 flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 accent-tinta" checked={!!c}
          onChange={(e) => onCambio((p) => { p.costo = e.target.checked ? { concepto: p.nombre, monto: 0, tipo: 'gasto' } : undefined })} />
        Registra un movimiento en la cuenta corriente
      </label>
      {c && (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2"><Campo etiqueta="Concepto">{(i) => <Entrada id={i} value={c.concepto} onChange={(e) => onCambio((p) => { p.costo!.concepto = e.target.value })} />}</Campo></div>
          <Campo etiqueta="Monto estimado">{(i) => <Entrada id={i} type="number" min={0} value={c.monto} onChange={(e) => onCambio((p) => { p.costo!.monto = Number(e.target.value) })} />}</Campo>
          <Campo etiqueta="Tipo">{(i) => (
            <Selector id={i} value={c.tipo} onChange={(e) => onCambio((p) => { p.costo!.tipo = e.target.value as TipoMovimiento })}>
              {Object.entries(nombreMovimiento).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Selector>
          )}</Campo>
        </div>
      )}
    </fieldset>
  )
}

function Requisitos({ paso, otros, onCambio }: { paso: PasoConfig; otros: Otro[]; onCambio: (fn: (p: PasoConfig) => void) => void }) {
  const [ver, setVer] = useState(false)
  const elegidos = otros.filter((o) => paso.requiere.includes(o.id))
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">Requiere antes (no se puede completar hasta que estén resueltos)</p>
      <div className="flex flex-wrap gap-1.5">
        {elegidos.length === 0 && <span className="text-xs text-sub">Sin requisitos.</span>}
        {elegidos.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1 rounded bg-celda px-2 py-0.5 text-xs">
            {o.nombre}
            <button type="button" aria-label={`Quitar ${o.nombre}`} className="text-sub hover:text-plumon" onClick={() => onCambio((p) => { p.requiere = p.requiere.filter((r) => r !== o.id) })}>×</button>
          </span>
        ))}
        <Boton chico variante="fantasma" onClick={() => setVer((v) => !v)}>{ver ? 'Listo' : 'Elegir pasos'}</Boton>
      </div>
      {ver && (
        <div className="max-h-56 overflow-y-auto border border-raya bg-hoja p-2">
          {otros.map((o) => (
            <label key={o.id} className="flex items-center gap-2 px-1 py-1 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-tinta" checked={paso.requiere.includes(o.id)}
                onChange={(e) => onCambio((p) => { p.requiere = e.target.checked ? [...p.requiere, o.id] : p.requiere.filter((r) => r !== o.id) })} />
              <span className="text-sub">{o.etapa} ›</span> {o.nombre}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/** Cómo se vería el plazo si su base fuera hoy. */
function VistaPrevia({ paso, nombrePaso }: { paso: PasoConfig; nombrePaso: (id: string) => string | undefined }) {
  const inhabiles = useInhabiles()
  const hoy = hoyF()
  if (!paso.plazoNotaria && !paso.plazoLey) return <p className="text-xs text-sub">Sin plazo: este paso no genera alertas.</p>
  const calc = (p?: Plazo) => p && p.dias > 0 ? { desde: hoy, vence: sumarDias(hoy, p.dias, p.tipoDia, inhabiles), tipoDia: p.tipoDia } : undefined
  return (
    <div className="flex flex-col gap-1.5 border-t border-raya pt-3">
      <p className="text-xs font-medium text-sub">Vista previa si el plazo empezara hoy</p>
      <Regla hoy={hoy} inhabiles={inhabiles} notaria={calc(paso.plazoNotaria)} ley={calc(paso.plazoLey)} />
      <p className={cx('text-xs text-sub')}>
        {[paso.plazoNotaria && `Notaría: ${describirPlazo(paso.plazoNotaria, nombrePaso)}`, paso.plazoLey && `Ley: ${describirPlazo(paso.plazoLey, nombrePaso)}`].filter(Boolean).join(' · ')}
        {paso.avisoPrevio > 0 && ` · aviso ${paso.avisoPrevio} ${paso.avisoPrevio === 1 ? 'día' : 'días'} antes`}
      </p>
    </div>
  )
}
