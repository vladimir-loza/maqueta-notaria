import { CalendarX2, FolderOpen, Layers, RotateCcw, ScrollText, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { hoy } from '../lib/fechas'
import { avisosAcumulado, esDeHoy, todasLasAlertas } from '../lib/motor'
import { useAviso, useInhabiles, useStore } from '../store'
import { cx } from '../lib/textos'

function Enlace({ a, icono: I, texto, cuenta, alerta, titulo }: { a: string; icono: typeof FolderOpen; texto: string; cuenta?: number; alerta?: boolean; titulo?: string }) {
  return (
    <NavLink
      to={a}
      end={a === '/'}
      className={({ isActive }) =>
        cx(
          'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
          isActive ? 'bg-papel text-vino' : 'text-vino-texto hover:bg-vino-hondo',
        )
      }
    >
      {({ isActive }) => (
        <>
          <I className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">{texto}</span>
          {cuenta !== undefined && cuenta > 0 && (
            <span title={titulo} className={cx('rounded-full px-1.5 text-xs font-semibold', alerta ? 'bg-plumon text-white' : isActive ? 'text-sub' : 'text-vino-claro')}>
              {cuenta}
              {titulo && <span className="sr-only"> {titulo}</span>}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { expedientes, recurrentes, tipos, reiniciar, avisosAtendidos } = useStore()
  const inhabiles = useInhabiles()
  const urgentes = useMemo(() => {
    const h = hoy()
    return todasLasAlertas(expedientes, recurrentes, h, inhabiles).filter((a) => esDeHoy(a, h)).length + avisosAcumulado(tipos, expedientes, avisosAtendidos).length
  }, [expedientes, recurrentes, inhabiles, tipos, avisosAtendidos])
  const abiertos = expedientes.filter((e) => e.estatus === 'abierto').length
  const [reiniciando, setReiniciando] = useState(false)

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <a href="#contenido" className="sr-only z-30 rounded-md bg-hoja px-3 py-2 text-sm font-medium text-tinta focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Saltar al contenido
      </a>
      <nav aria-label="Principal" className="bg-vino text-vino-texto md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:px-4 md:py-5">
        <div className="flex items-center justify-between px-4 pt-3 md:block md:px-2.5 md:pt-0 md:pb-6">
          <p className="font-cond text-[15px] font-bold tracking-[0.04em] text-white uppercase">
            Notaría · Expedientes
            <span className="block font-sans text-xs font-normal tracking-normal text-vino-claro normal-case">Demostración, datos ficticios</span>
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:overflow-visible md:p-0">
          <Enlace a="/" icono={CalendarX2} texto="Vencimientos" cuenta={urgentes} alerta titulo="para hoy: vencidos, que vencen hoy y avisos por acumulado" />
          <Enlace a="/expedientes" icono={FolderOpen} texto="Expedientes" cuenta={abiertos} />
          <Enlace a="/cuenta" icono={Wallet} texto="Cuenta corriente" />
          <p className="mt-5 mb-1 hidden px-2.5 text-[11px] font-semibold tracking-[0.08em] text-vino-etiqueta uppercase md:block">Configuración</p>
          <Enlace a="/tramites" icono={Layers} texto="Tipos de trámite" cuenta={tipos.length} />
          <Enlace a="/calendario" icono={ScrollText} texto="Calendario y avisos" />
        </div>
        {reiniciando ? (
          <div role="group" aria-label="Reiniciar datos" onKeyDown={(e) => e.key === 'Escape' && setReiniciando(false)} className="mt-auto hidden flex-col gap-2 rounded-md bg-vino-hondo p-2.5 text-xs text-vino-texto md:flex">
            <span>Se pierden los cambios y se cargan los datos de ejemplo.</span>
            <span className="flex gap-1.5">
              <button type="button" autoFocus onClick={() => { reiniciar(); setReiniciando(false) }} className="rounded bg-papel px-2 py-1 font-semibold text-vino">Reiniciar</button>
              <button type="button" onClick={() => setReiniciando(false)} className="rounded px-2 py-1 hover:bg-vino">Cancelar</button>
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setReiniciando(true)}
            className="mt-auto hidden items-center gap-2 rounded-md px-2.5 py-2 text-xs text-vino-claro hover:bg-vino-hondo hover:text-white md:flex"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar datos de ejemplo
          </button>
        )}
      </nav>
      <main id="contenido" tabIndex={-1} className="min-w-0 px-4 py-6 outline-none md:px-8">
        <Outlet />
      </main>
      <AvisoFlotante />
    </div>
  )
}

/** Confirma la última acción y permite deshacerla durante unos segundos. */
function AvisoFlotante() {
  const { aviso, cerrarAviso } = useAviso()
  // Mientras el puntero o el foco estén sobre el aviso, no se cierra solo.
  const [retenido, setRetenido] = useState(false)
  useEffect(() => {
    if (!aviso || retenido) return
    const t = setTimeout(cerrarAviso, 8000)
    return () => clearTimeout(t)
  }, [aviso, retenido, cerrarAviso])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
      <div
        onMouseEnter={() => setRetenido(true)}
        onMouseLeave={() => setRetenido(false)}
        onFocus={() => setRetenido(true)}
        onBlur={() => setRetenido(false)}
        className={cx(aviso && 'pointer-events-auto flex items-center gap-4 rounded-md border border-black bg-texto py-2.5 pr-2 pl-4 text-sm text-white')}
      >
        {/* La región viva siempre existe para que el lector anuncie el primer aviso. */}
        <p role="status" aria-live="polite" className={cx(!aviso && 'sr-only')}>{aviso?.texto}</p>
        {aviso?.deshacer && (
          <button type="button" onClick={() => { aviso.deshacer!(); cerrarAviso() }} className="rounded px-2 py-1 font-semibold text-marca hover:bg-white/10">
            Deshacer<span className="sr-only">: {aviso.texto}</span>
          </button>
        )}
        {aviso && (
          <button type="button" aria-label="Cerrar aviso" onClick={cerrarAviso} className="rounded px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white">×</button>
        )}
      </div>
    </div>
  )
}
