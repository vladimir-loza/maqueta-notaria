import { ArrowLeft, ChevronDown, ChevronRight, Lock, Paperclip } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CampoCosto, FormMovimiento, ResumenSaldo, TablaMovimientos } from '../components/Cuenta'
import { LeyendaRegla, Regla } from '../components/Regla'
import { Adjuntar, Boton, Campo, Encabezado, Entrada, IconoPaso, Marca, Pestanas } from '../components/ui'
import { fechaCorta, fechaLarga, fechaMedia, hoy as hoyF, pesos } from '../lib/fechas'
import {
  bloqueosCierre,
  montoDe,
  calcularPlazo,
  describirPlazo,
  etapaActual,
  inicioEtapa,
  nivelDe,
  pasosPendientes,
  puedeCerrar,
  requisitosPendientes,
  resuelto,
  saldo,
  type PlazoCalculado,
} from '../lib/motor'
import { useAviso, useInhabiles, useStore } from '../store'
import type { Expediente, PasoInst } from '../types'
import { AvanceEtapas } from './Expedientes'
import { cx, leerCosto } from '../lib/textos'

type Vista = 'etapas' | 'cuenta' | 'bitacora'

export default function ExpedienteDetalle() {
  const { id } = useParams()
  const exp = useStore((s) => s.expedientes.find((e) => e.id === id))
  const { cerrarExpediente, reabrirExpediente, agregarMovimiento, eliminarMovimiento, restaurarExpediente } = useStore()
  const avisar = useAviso((s) => s.avisar)
  const [params] = useSearchParams()
  const [vista, setVista] = useState<Vista>('etapas')
  const [cerrando, setCerrando] = useState(false)
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false)
  const [recienCerrado, setRecienCerrado] = useState(false)
  const cierre = useRef<HTMLButtonElement>(null)

  if (!exp) {
    return (
      <>
        <Encabezado titulo="Expediente no encontrado" />
        <Link className="text-tinta underline" to="/expedientes">Volver a expedientes</Link>
      </>
    )
  }

  const pendientes = pasosPendientes(exp)
  const s = saldo(exp.movimientos)
  const ei = etapaActual(exp)

  return (
    <>
      <Link to="/expedientes" className="mb-3 inline-flex items-center gap-1 text-sm text-sub hover:text-tinta">
        <ArrowLeft className="h-4 w-4" /> Expedientes
      </Link>
      <Encabezado titulo={`${exp.folio} · ${exp.tipoNombre}`} sub={exp.partes}>
        {exp.estatus === 'cerrado' ? (
          confirmandoReabrir ? (
            <>
              <span className="text-sm">¿Reabrir {exp.folio}?</span>
              <Boton variante="primario" autoFocus onClick={() => {
                const copia = structuredClone(exp)
                reabrirExpediente(exp.id)
                setConfirmandoReabrir(false)
                avisar(`${exp.folio} reabierto; quedó anotado en la bitácora`, () => restaurarExpediente(copia))
                requestAnimationFrame(() => cierre.current?.focus())
              }}>Sí, reabrir</Boton>
              <Boton onClick={() => setConfirmandoReabrir(false)}>Cancelar</Boton>
            </>
          ) : (
            <Boton onClick={() => setConfirmandoReabrir(true)}>Reabrir expediente</Boton>
          )
        ) : (
          <Boton ref={cierre} aria-expanded={cerrando} onClick={() => setCerrando((v) => !v)}>
            {!puedeCerrar(bloqueosCierre(exp)) && <Lock className="h-4 w-4" />}
            Cerrar expediente{pendientes.length ? ` · faltan ${pendientes.length}` : ''}
          </Boton>
        )}
      </Encabezado>
      {cerrando && exp.estatus === 'abierto' && (
        <PanelCierre
          exp={exp}
          onCancelar={() => setCerrando(false)}
          onIrACuenta={() => { setVista('cuenta'); setCerrando(false) }}
          onIrAPaso={() => { setVista('etapas'); setCerrando(false) }}
          onCerrar={() => {
            const err = cerrarExpediente(exp.id)
            if (err) return avisar(err)
            setCerrando(false)
            setRecienCerrado(true)
            const copia = structuredClone(exp)
            avisar(`${exp.folio} cerrado`, () => restaurarExpediente(copia))
          }}
        />
      )}
      {exp.estatus === 'cerrado' && <ResumenCerrado exp={exp} enfocar={recienCerrado} />}

      <dl className="mb-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-sub">Objeto</dt><dd className="font-medium">{exp.objeto || '—'}</dd></div>
        <div><dt className="text-xs text-sub">Apertura</dt><dd className="font-medium">{fechaMedia(exp.apertura)}</dd></div>
        <div>
          <dt className="text-xs text-sub">Etapa</dt>
          <dd className="font-medium">{ei >= 0 ? `${ei + 1} de ${exp.etapas.length} · ${exp.etapas[ei].nombre}` : 'Todas resueltas'}</dd>
          <dd className="mt-1"><AvanceEtapas exp={exp} /></dd>
        </div>
        {exp.estatus === 'abierto' && <div><dt className="text-xs text-sub">Saldo cliente</dt><dd className={cx('font-medium', s.saldo < 0 && 'text-plumon')}>{pesos(s.saldo)}</dd></div>}
        {exp.campos.filter((c) => exp.datos[c.id]).map((c) => (
          <div key={c.id}>
            <dt className="text-xs text-sub">{c.nombre}</dt>
            <dd className="font-medium">{c.tipo === 'moneda' ? pesos(montoDe(exp.datos[c.id])) : exp.datos[c.id]}</dd>
          </div>
        ))}
      </dl>

      <Pestanas valor={vista} onCambio={setVista} opciones={[
        { id: 'etapas', texto: 'Etapas y pasos', cuenta: pendientes.length },
        { id: 'cuenta', texto: 'Cuenta corriente', cuenta: exp.movimientos.length },
        { id: 'bitacora', texto: 'Bitácora', cuenta: exp.bitacora.length },
      ]} />

      <div className="mt-5">
        {/* La clave remonta las etapas al seguir un enlace a un paso: abre su etapa y su formulario. */}
        {vista === 'etapas' && <Etapas key={params.get('paso') ?? ''} exp={exp} foco={params.get('paso')} />}
        {vista === 'cuenta' && (
          <div className="flex flex-col gap-4">
            <ResumenSaldo movimientos={exp.movimientos} />
            {exp.estatus === 'abierto' && <FormMovimiento saldoActual={s.saldo} onGuardar={(m) => {
              const copia = structuredClone(exp)
              const err = agregarMovimiento(exp.id, m)
              avisar(err ?? `Movimiento «${m.concepto}» registrado · ${pesos(m.monto)}`, err ? undefined : () => restaurarExpediente(copia))
            }} />}
            <TablaMovimientos
              saldoCorrido
              saldoSin={(m) => saldo(exp.movimientos.filter((x) => x.id !== m.id)).saldo}
              movimientos={exp.movimientos}
              onEliminar={exp.estatus === 'abierto' ? (m) => {
                const copia = structuredClone(exp)
                const err = eliminarMovimiento(exp.id, m.id)
                avisar(err ?? `Movimiento «${m.concepto}» eliminado · ${pesos(m.monto)}`, err ? undefined : () => restaurarExpediente(copia))
              } : undefined}
            />
          </div>
        )}
        {vista === 'bitacora' && <Bitacora exp={exp} />}
      </div>
    </>
  )
}

function Etapas({ exp, foco }: { exp: Expediente; foco: string | null }) {
  const inhabiles = useInhabiles()
  const hoy = hoyF()
  // Solo el siguiente paso de la etapa en curso lleva el botón principal.
  const actual = etapaActual(exp)
  const siguiente = actual >= 0 ? exp.etapas[actual].pasos.find((p) => !resuelto(p) && !requisitosPendientes(exp, p).length)?.id : undefined
  return (
    <div className="flex flex-col gap-5">
      {exp.etapas.map((etapa, i) => (
        <SeccionEtapa key={etapa.id} exp={exp} i={i} hoy={hoy} inhabiles={inhabiles} foco={foco} siguiente={siguiente} />
      ))}
      <LeyendaRegla />
    </div>
  )
}

function SeccionEtapa({ exp, i, hoy, inhabiles, foco, siguiente }: { exp: Expediente; i: number; hoy: string; inhabiles: ReadonlySet<string>; foco: string | null; siguiente?: string }) {
  const etapa = exp.etapas[i]
  const inicio = inicioEtapa(exp, i)
  const hechos = etapa.pasos.filter(resuelto).length
  const completa = hechos === etapa.pasos.length
  // Una sola ventana de días por etapa: las tiras de sus pasos quedan alineadas.
  const plazos = etapa.pasos.filter((p) => !resuelto(p)).flatMap((p) =>
    [calcularPlazo(exp, i, p.plazoNotaria, inhabiles), calcularPlazo(exp, i, p.plazoLey, inhabiles)].filter((x) => !!x).map((x) => x!))
  const claves = plazos.map((p) => p.vence)
  const conVencido = claves.some((v) => v < hoy)
  // Se abre «lo que sigue»: la etapa en curso, la que tenga algo vencido o la que contiene el paso enlazado.
  const enCurso = etapaActual(exp) === i
  const [abierta, setAbierta] = useState(!completa && (enCurso || conVencido || etapa.inicia === 'apertura') || etapa.pasos.some((p) => p.id === foco))
  const Chevron = abierta ? ChevronDown : ChevronRight
  const anterior = exp.etapas[i - 1]?.nombre
  return (
    <section aria-labelledby={`etapa-${etapa.id}`}>
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)} className="mb-2 flex w-full flex-wrap items-baseline gap-x-3 text-left">
        <Chevron className="h-4 w-4 self-center text-sub" />
        <h2 id={`etapa-${etapa.id}`} className="font-cond text-xl font-bold">{i + 1}. {etapa.nombre}</h2>
        <span className={cx('text-sm', completa ? 'text-verde-hondo' : 'text-sub')}>
          {completa
            ? `${hechos}/${etapa.pasos.length} resueltos · etapa completa`
            : inicio
              ? `${hechos}/${etapa.pasos.length} resueltos · ${etapa.inicia === 'apertura' && i > 0 ? 'corre desde la apertura, en paralelo' : `sus plazos corren desde ${fechaCorta(inicio)}`}`
              : `${etapa.pasos.length} ${etapa.pasos.length === 1 ? 'paso' : 'pasos'} · empieza tras «${anterior}»${claves.length ? ' · un plazo ya corre desde la apertura' : ''}`}
          {conVencido && !completa && <span className="ml-2 font-semibold text-plumon-hondo">con vencidos</span>}
        </span>
      </button>
      {abierta && (
        <ul className="border border-raya bg-hoja">
          {etapa.pasos.length === 0 && <li className="px-4 py-3 text-sm text-sub">Etapa sin pasos todavía.</li>}
          {etapa.pasos.map((p) => (
            <FilaPaso key={p.id} exp={exp} etapaIdx={i} paso={p} hoy={hoy} inhabiles={inhabiles} foco={foco === p.id} principal={siguiente === p.id} habilitada={!!inicio} claves={claves} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FilaPaso({ exp, etapaIdx, paso, hoy, inhabiles, foco, principal, habilitada, claves }: {
  exp: Expediente
  etapaIdx: number
  paso: PasoInst
  hoy: string
  inhabiles: ReadonlySet<string>
  foco: boolean
  principal: boolean
  habilitada: boolean
  claves: string[]
}) {
  const { completarPaso, noSolicitar, reabrirPaso, restaurarExpediente } = useStore()
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false)
  const avisar = useAviso((s) => s.avisar)
  const abierto = exp.estatus === 'abierto'
  const [registrando, setRegistrando] = useState(foco && paso.estado === 'pendiente' && abierto)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (foco) ref.current?.scrollIntoView({ block: 'center', behavior: quieto ? 'auto' : 'smooth' })
  }, [foco])

  const faltan = requisitosPendientes(exp, paso)
  const notaria = calcularPlazo(exp, etapaIdx, paso.plazoNotaria, inhabiles)
  const ley = calcularPlazo(exp, etapaIdx, paso.plazoLey, inhabiles)
  const nombrePaso = (id: string) => exp.etapas.flatMap((e) => e.pasos).find((p) => p.id === id)?.nombre
  const pendiente = paso.estado === 'pendiente'
  // Neto del paso: los contra-asientos llevan monto negativo.
  const pagado = exp.movimientos.filter((m) => m.pasoId === paso.id).reduce((t, m) => t + m.monto, 0)
  const boton = useRef<HTMLButtonElement>(null)
  const volverAlBoton = () => requestAnimationFrame(() => boton.current?.focus())
  const reabrir = () => {
    const copia = structuredClone(exp)
    reabrirPaso(exp.id, paso.id)
    setConfirmandoReabrir(false)
    volverAlBoton()
    avisar(`«${paso.nombre}» reabierto${pagado ? ` · contra-asiento por ${pesos(pagado)}` : ''}`, () => restaurarExpediente(copia))
  }

  return (
    <li ref={ref} tabIndex={-1} className={cx('group/fila border-b border-raya-suave outline-none last:border-0 focus-visible:bg-fila', foco && 'resaltado')}>
      <div className="grid grid-cols-[20px_1fr] items-start gap-x-3 gap-y-2 px-4 py-3 lg:grid-cols-[20px_minmax(240px,1fr)_minmax(0,auto)_auto]">
        <Marca estado={paso.estado} className="mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <IconoPaso tipo={paso.tipo} />
            <span className={cx('font-medium', paso.estado === 'noSolicita' && 'text-sub line-through')}>{paso.nombre}</span>
            {pendiente && paso.costo && paso.costo.monto > 0 && <span className="text-xs text-sub">estimado {pesos(paso.costo.monto)}</span>}
          </div>
          {paso.descripcion && <p className="mt-0.5 text-xs text-sub">{paso.descripcion}</p>}
          {paso.estado === 'hecho' && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-sub">
              <span className="text-verde-hondo">Hecho {paso.fechaHecho && fechaMedia(paso.fechaHecho)}</span>
              {pagado > 0 && <span className="text-texto">pagado <span className="font-medium">{pesos(pagado)}</span></span>}
              {paso.archivo && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{paso.archivo}</span>}
              {paso.nota && <span>{paso.nota}</span>}
            </p>
          )}
          {pendiente && faltan.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-sub">
              <Lock className="h-3 w-3" /> Requiere antes: {faltan.map((f) => f.nombre).join(', ')}
            </p>
          )}
        </div>
        <div className="col-start-2 min-w-0 lg:col-start-auto">
          {pendiente && (notaria || ley) ? (
            <PlazoPaso notaria={notaria} ley={ley} aviso={paso.avisoPrevio} hoy={hoy} inhabiles={inhabiles} claves={claves} />
          ) : pendiente && (paso.plazoNotaria || paso.plazoLey) ? (
            <p className="text-xs text-sub">Plazo {describirPlazo((paso.plazoLey ?? paso.plazoNotaria)!, nombrePaso)}; aún no corre.</p>
          ) : null}
        </div>
        {abierto && (
          <div className="col-start-2 flex gap-1.5 lg:col-start-auto lg:justify-end">
            {pendiente ? (
              <>
                {/* Con requisitos pendientes no hay botón: la línea «Requiere antes» ya lo explica. */}
                {faltan.length === 0 && (
                  <Boton ref={boton} chico variante={principal && !registrando ? 'primario' : habilitada ? 'secundario' : 'fantasma'} aria-expanded={registrando}
                    aria-label={`${habilitada ? 'Registrar' : 'Registrar por adelantado'}: ${paso.nombre}`}
                    onClick={() => setRegistrando((v) => !v)}>
                    {habilitada ? 'Registrar' : 'Registrar por adelantado'}
                  </Boton>
                )}
                {paso.opcional && (
                  <Boton chico variante="fantasma" aria-label={`No se solicita: ${paso.nombre}`} onClick={() => {
                    const copia = structuredClone(exp)
                    noSolicitar(exp.id, paso.id)
                    avisar(`«${paso.nombre}»: no se solicita`, () => restaurarExpediente(copia))
                  }}>No se solicita</Boton>
                )}
              </>
            ) : (
              confirmandoReabrir ? (
                <span className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
                  <span>Se cancelará {pesos(pagado)} con un contra-asiento.</span>
                  <Boton chico variante="primario" autoFocus onClick={() => reabrir()}>Reabrir</Boton>
                  <Boton chico onClick={() => { setConfirmandoReabrir(false); volverAlBoton() }}>Cancelar</Boton>
                </span>
              ) : (
                <Boton ref={boton} chico variante="fantasma" aria-label={`Reabrir: ${paso.nombre}`} onClick={() => (pagado ? setConfirmandoReabrir(true) : reabrir())}>Reabrir</Boton>
              )
            )}
          </div>
        )}
      </div>
      {registrando && pendiente && (
        <FormRegistro paso={paso} onCancelar={() => { setRegistrando(false); volverAlBoton() }} onGuardar={(d) => {
          const copia = structuredClone(exp)
          const err = completarPaso(exp.id, paso.id, d)
          if (!err) {
            setRegistrando(false)
            const nuevo = saldo(useStore.getState().expedientes.find((e) => e.id === exp.id)!.movimientos).saldo
            const alerta = nuevo < 0 && saldo(exp.movimientos).saldo >= 0 ? `. El saldo quedó en ${pesos(nuevo)}: falta cobrar al cliente` : ''
            avisar(`«${paso.nombre}» registrado${d.monto ? ` · ${pesos(d.monto)} en la cuenta` : ''}${alerta}`, () => restaurarExpediente(copia))
            requestAnimationFrame(() => ref.current?.focus())
          }
          return err
        }} />
      )}
    </li>
  )
}

function PlazoPaso({ notaria, ley, aviso, hoy, inhabiles, claves }: { notaria?: PlazoCalculado; ley?: PlazoCalculado; aviso: number; hoy: string; inhabiles: ReadonlySet<string>; claves: string[] }) {
  const texto = (p: PlazoCalculado, quien: string) => {
    const n = nivelDe(p.vence, p.tipoDia, aviso, hoy, inhabiles)
    return <span className={cx(n === 'vencido' && 'font-semibold text-plumon-hondo', n === 'proximo' && 'font-semibold text-ocre')}>{quien} {fechaCorta(p.vence)}</span>
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="max-w-full overflow-x-auto"><Regla hoy={hoy} inhabiles={inhabiles} notaria={notaria} ley={ley} claves={claves} /></div>
      <p className="flex gap-3 text-xs text-sub">
        {notaria && texto(notaria, 'Notaría')}
        {ley && texto(ley, 'Ley')}
      </p>
    </div>
  )
}

function FormRegistro({ paso, onGuardar, onCancelar }: {
  paso: PasoInst
  onGuardar: (d: { fecha: string; nota?: string; archivo?: string; monto?: number }) => string | undefined
  onCancelar: () => void
}) {
  const [fecha, setFecha] = useState(hoyF())
  const [nota, setNota] = useState('')
  const [archivo, setArchivo] = useState('')
  const [monto, setMonto] = useState(paso.costo?.monto ? String(paso.costo.monto) : '')
  const [sinCosto, setSinCosto] = useState(false)
  const [error, setError] = useState('')
  const idMonto = useId()
  const pideMonto = !!paso.costo

  return (
    <form
      className="flex flex-wrap items-start gap-3 border-t border-raya-suave bg-fila px-4 py-3 pl-12"
      onKeyDown={(e) => e.key === 'Escape' && onCancelar()}
      onSubmit={(e) => {
        e.preventDefault()
        const r = pideMonto ? leerCosto(paso.costo!, monto, sinCosto) : {}
        if (r.error) {
          setError(r.error)
          document.getElementById(idMonto)?.focus()
          return
        }
        const notaFinal = [nota.trim(), sinCosto ? 'Sin costo en este expediente.' : ''].filter(Boolean).join(' ')
        setError(onGuardar({ fecha, nota: notaFinal, archivo, monto: r.monto }) ?? '')
      }}
    >
      <div className="w-36"><Campo etiqueta="Fecha">{(id) => <Entrada id={id} type="date" autoFocus={!pideMonto} value={fecha} max={hoyF()} onChange={(e) => setFecha(e.target.value)} />}</Campo></div>
      {pideMonto && (
        <CampoCosto id={idMonto} costo={paso.costo!} monto={monto} onMonto={(v) => { setMonto(v); setError('') }}
          sinCosto={sinCosto} onSinCosto={(v) => { setSinCosto(v); setError('') }} error={error} />
      )}
      <Adjuntar etiqueta={paso.tipo === 'documento' ? 'Documento' : 'Comprobante'} archivo={archivo} onArchivo={setArchivo} />
      <div className="min-w-48 flex-1"><Campo etiqueta="Nota">{(id) => <Entrada id={id} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />}</Campo></div>
      <div className="flex gap-2 pt-[22px]">
        <Boton type="submit" variante="primario">Guardar registro</Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </div>
      {error && <p id={`${idMonto}-error`} role="alert" className="w-full text-sm text-plumon-hondo">{error}</p>}
    </form>
  )
}

function Bitacora({ exp }: { exp: Expediente }) {
  const agregarNota = useStore((s) => s.agregarNota)
  const [texto, setTexto] = useState('')
  const entradas = [...exp.bitacora].reverse()
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) { agregarNota(exp.id, texto.trim()); setTexto('') } }}>
        <Entrada aria-label="Nueva nota" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Agregar nota a la bitácora" />
        <Boton type="submit" variante="primario" disabled={!texto.trim()}>Agregar</Boton>
      </form>
      <ol className="border border-raya bg-hoja">
        {entradas.map((b) => (
          <li key={b.id} className="grid grid-cols-[96px_1fr] gap-3 border-b border-raya-suave px-4 py-2.5 text-sm last:border-0">
            <span className="font-cond font-semibold text-sub">{fechaMedia(b.fecha)}</span>
            <span>{b.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Revisión antes de cerrar: qué falta, o el resumen de lo que queda asentado. */
function PanelCierre({ exp, onCancelar, onCerrar, onIrACuenta, onIrAPaso }: { exp: Expediente; onCancelar: () => void; onCerrar: () => void; onIrACuenta: () => void; onIrAPaso: () => void }) {
  const { noSolicitar, restaurarExpediente } = useStore()
  const avisar = useAviso((s) => s.avisar)
  const b = bloqueosCierre(exp)
  const listo = puedeCerrar(b)
  // Cerrar con adeudo se permite, pero solo marcando que se sabe.
  const [conAdeudo, setConAdeudo] = useState(false)
  const todosObligatorios = b.pendientes.every((x) => !x.paso.opcional)
  const pasos = exp.etapas.flatMap((e) => e.pasos)
  const hechos = pasos.filter((p) => p.estado === 'hecho').length
  const omitidos = pasos.filter((p) => p.estado === 'noSolicita').length
  const porEtapa = [...new Set(b.pendientes.map((x) => x.etapa))]
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => titulo.current?.focus(), [])
  return (
    <section
      aria-labelledby="titulo-cierre"
      onKeyDown={(e) => e.key === 'Escape' && onCancelar()}
      className={cx('mb-5 border bg-hoja p-5', listo ? 'border-raya' : 'border-plumon-borde')}
    >
      <h2 id="titulo-cierre" ref={titulo} tabIndex={-1} className="font-cond text-xl font-bold outline-none">
        {listo ? '¿Cerrar el expediente?' : 'Aún no se puede cerrar'}
      </h2>
      {listo ? (
        <>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><dt className="text-xs text-sub">Pasos hechos</dt><dd className="font-cond text-lg font-semibold">{hechos}</dd></div>
            <div><dt className="text-xs text-sub">No se solicitaron</dt><dd className="font-cond text-lg font-semibold">{omitidos}</dd></div>
            <div><dt className="text-xs text-sub">Saldo final</dt><dd className={cx('font-cond text-lg font-semibold', b.saldoNegativo > 0 && 'text-plumon-hondo')}>{pesos(saldo(exp.movimientos).saldo)}</dd></div>
          </dl>
          {b.saldoNegativo > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-md bg-plumon-claro px-3 py-2 text-sm text-plumon-hondo">
              <p className="flex flex-wrap items-center gap-x-3">
                <span>El cliente aún debe <strong className="font-cond text-base">{pesos(b.saldoNegativo)}</strong>.</span>
                <Boton chico variante="fantasma" onClick={onIrACuenta}>Ir a cuenta corriente</Boton>
              </p>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-plumon" checked={conAdeudo} onChange={(e) => setConAdeudo(e.target.checked)} />
                Cerrar con el adeudo pendiente; queda anotado en la bitácora
              </label>
            </div>
          )}
          <p className="mt-3 max-w-[70ch] text-sm text-sub">
            Al cerrarlo sale de Vencimientos y ya no admite registros. Si hace falta, puedes reabrirlo; queda anotado en la bitácora.
          </p>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-4 text-sm">
          {b.sinPasosHechos && <p>No hay ningún paso hecho: un expediente no se cierra solo con pasos omitidos.</p>}
          {porEtapa.length > 0 && (
            <div>
              <p className="mb-2">
                {todosObligatorios
                  ? `Faltan ${b.pendientes.length} ${b.pendientes.length === 1 ? 'paso obligatorio' : 'pasos obligatorios'}. Regístralos:`
                  : `Faltan ${b.pendientes.length} pasos. Registra los obligatorios; los opcionales puedes marcarlos aquí como «no se solicita»:`}
              </p>
              <div className="flex flex-col gap-3">
                {porEtapa.map((et) => (
                  <div key={et}>
                    <p className="mb-1 font-cond text-[15px] font-semibold">{et}</p>
                    <ul className="flex flex-col gap-1 border-l-2 border-raya pl-3">
                      {b.pendientes.filter((x) => x.etapa === et).map(({ paso }) => (
                        <li key={paso.id} className="flex flex-wrap items-baseline gap-x-2">
                          <Link to={`?paso=${paso.id}`} onClick={onIrAPaso} className="text-tinta underline-offset-2 hover:underline">{paso.nombre}</Link>
                          <span className="text-xs text-sub">{paso.opcional ? 'opcional' : 'obligatorio'}</span>
                          {paso.opcional && (
                            <Boton chico variante="fantasma" aria-label={`No se solicita: ${paso.nombre}`} onClick={() => {
                              const copia = structuredClone(exp)
                              noSolicitar(exp.id, paso.id)
                              avisar(`«${paso.nombre}»: no se solicita`, () => restaurarExpediente(copia))
                            }}>No se solicita</Boton>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          {b.saldoNegativo > 0 && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Además, falta cobrar <strong className="font-cond text-base">{pesos(b.saldoNegativo)}</strong> al cliente; podrás cerrar con el adeudo, confirmándolo.</span>
              <Boton chico variante="fantasma" onClick={onIrACuenta}>Ir a cuenta corriente</Boton>
            </p>
          )}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {listo && <Boton variante="primario" disabled={b.saldoNegativo > 0 && !conAdeudo} onClick={onCerrar}>Cerrar expediente</Boton>}
        <Boton onClick={onCancelar}>{listo ? 'Cancelar' : 'Entendido'}</Boton>
      </div>
    </section>
  )
}

/** Constancia del cierre: queda a la vista mientras el expediente esté cerrado. */
function ResumenCerrado({ exp, enfocar }: { exp: Expediente; enfocar: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { if (enfocar) ref.current?.focus() }, [enfocar])
  const pasos = exp.etapas.flatMap((e) => e.pasos)
  return (
    <section ref={ref} tabIndex={-1} aria-label="Resumen del cierre" className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-2 border border-raya bg-hoja px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-tinta">
      {saldo(exp.movimientos).saldo < 0
        ? <span aria-hidden className="h-5 w-5 rounded-full border-2 border-plumon" />
        : <Marca estado="hecho" className="h-5 w-5" />}
      <div>
        <p className="font-cond text-lg font-bold">Expediente cerrado</p>
        <p className="text-sm text-sub">{exp.fechaCierre && fechaLarga(exp.fechaCierre)}</p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <div><dt className="text-xs text-sub">Pasos hechos</dt><dd className="font-cond text-lg font-semibold">{pasos.filter((p) => p.estado === 'hecho').length}</dd></div>
        <div><dt className="text-xs text-sub">No se solicitaron</dt><dd className="font-cond text-lg font-semibold">{pasos.filter((p) => p.estado === 'noSolicita').length}</dd></div>
        <div>
          <dt className="text-xs text-sub">Saldo final</dt>
          <dd className={cx('font-cond text-lg font-semibold', saldo(exp.movimientos).saldo < 0 && 'text-plumon-hondo')}>
            {pesos(saldo(exp.movimientos).saldo)}{saldo(exp.movimientos).saldo < 0 && <span className="ml-1.5 font-sans text-xs font-medium">cerrado con adeudo</span>}
          </dd>
        </div>
      </dl>
    </section>
  )
}
