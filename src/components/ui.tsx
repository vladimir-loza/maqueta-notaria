import { Banknote, FileText, Hourglass, ListChecks, Paperclip, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useEffect, useId } from 'react'
import type { EstadoPaso, TipoPaso } from '../types'
import type { Alerta, Nivel } from '../lib/motor'
import { cx, nombreTipoPaso } from '../lib/textos'


type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
const variantes: Record<Variante, string> = {
  primario: 'bg-tinta text-white border-tinta hover:bg-tinta-hondo hover:border-tinta-hondo',
  secundario: 'bg-hoja text-texto border-borde hover:border-tinta hover:text-tinta',
  fantasma: 'bg-transparent text-tinta border-transparent hover:bg-tinta-clara/50',
  peligro: 'bg-hoja text-plumon-hondo border-plumon-borde hover:bg-plumon-claro',
}

export function Boton({ variante = 'secundario', chico, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; chico?: boolean; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'relative inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed',
        variante === 'fantasma' ? 'disabled:bg-transparent! disabled:text-apagado!' : 'disabled:border-raya! disabled:bg-celda! disabled:text-sub!',
        chico ? 'h-7 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        variantes[variante],
        className,
      )}
    />
  )
}

const control =
  'w-full rounded-md border border-borde bg-hoja px-2.5 text-sm text-texto placeholder:text-sub hover:border-borde-fuerte focus:border-tinta focus:outline-2 focus:outline-offset-1 focus:outline-tinta aria-invalid:border-plumon disabled:bg-celda'

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-sub">{etiqueta}</label>
      {children(id)}
      {ayuda && <p className="text-xs text-sub">{ayuda}</p>}
    </div>
  )
}

export const Entrada = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(control, 'h-9', className)} />
export const Area = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(control, 'py-2', className)} />
export const Selector = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(control, 'h-9 pr-7', className)} />

export function Encabezado({ titulo, sub, children }: { titulo: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  // Cada vista nombra la pestaña del navegador: el lector de pantalla y el historial distinguen las páginas.
  useEffect(() => {
    if (typeof titulo === 'string') document.title = `${titulo} · Notaría`
  }, [titulo])
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-cond text-[30px] leading-none font-bold text-balance">{titulo}</h1>
        {sub && <span className="text-[15px] text-sub">{sub}</span>}
      </div>
      {children && <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

export function Pestanas<T extends string>({ valor, opciones, onCambio }: { valor: T; opciones: { id: T; texto: string; cuenta?: number; alerta?: boolean }[]; onCambio: (v: T) => void }) {
  // Patrón de pestañas: una sola parada de tabulador, flechas para moverse.
  const mover = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = opciones.findIndex((o) => o.id === valor)
    const sig = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? opciones.length - 1 : -2
    if (sig === -2) return
    e.preventDefault()
    const j = (sig + opciones.length) % opciones.length
    onCambio(opciones[j].id)
    ;(e.currentTarget.children[j] as HTMLElement | undefined)?.focus()
  }
  return (
    <div role="tablist" onKeyDown={mover} className="flex gap-1 overflow-x-auto border-b border-raya [mask-image:linear-gradient(to_right,black_80%,transparent)] md:[mask-image:none]">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={valor === o.id}
          tabIndex={valor === o.id ? 0 : -1}
          onClick={() => onCambio(o.id)}
          className={cx(
            'relative -mb-px border-b-[3px] px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
            valor === o.id ? 'border-vino text-texto' : 'border-transparent text-sub hover:text-texto',
          )}
        >
          {o.texto}
          {o.cuenta !== undefined && (
            <span className={cx('ml-1.5 font-semibold', o.alerta && o.cuenta > 0 ? 'text-plumon' : 'text-sub')}>
              <span className="sr-only">:</span> {o.cuenta}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Marca de estado en celda fija: ○ pendiente, ● hecho, tachado = no se solicita. */
export function Marca({ estado, className }: { estado: EstadoPaso; className?: string }) {
  const titulo = estado === 'hecho' ? 'Hecho' : estado === 'noSolicita' ? 'No se solicita' : 'Pendiente'
  return (
    <svg viewBox="0 0 16 16" className={cx('h-4 w-4 shrink-0', className)} role="img" aria-label={titulo}>
      {estado === 'hecho' ? (
        <circle cx="8" cy="8" r="6" fill="var(--color-verde)" />
      ) : (
        <circle cx="8" cy="8" r="5.25" fill="none" stroke={estado === 'noSolicita' ? 'var(--color-apagado)' : 'var(--color-sub)'} strokeWidth="1.5" />
      )}
      {estado === 'noSolicita' && <line x1="2" y1="14" x2="14" y2="2" stroke="#a3adb8" strokeWidth="1.5" />}
    </svg>
  )
}

const iconoPaso: Record<TipoPaso, LucideIcon> = { documento: FileText, pago: Banknote, espera: Hourglass, tarea: ListChecks }

export function IconoPaso({ tipo }: { tipo: TipoPaso }) {
  const I = iconoPaso[tipo]
  return <I aria-label={nombreTipoPaso[tipo]} className="h-4 w-4 shrink-0 text-sub" strokeWidth={1.75} />
}

const estilosNivel: Record<Nivel, string> = {
  vencido: 'bg-plumon-claro text-plumon-hondo',
  proximo: 'bg-marca-claro text-ocre',
  aTiempo: 'bg-verde-claro text-verde-hondo',
}
export function Etiqueta({ nivel, children }: { nivel: Nivel | 'neutro'; children: ReactNode }) {
  return (
    <span className={cx('inline-block rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap', nivel === 'neutro' ? 'bg-celda text-texto' : estilosNivel[nivel])}>
      {children}
    </span>
  )
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 border border-dashed border-raya bg-hoja px-6 py-10">
      <p className="font-cond text-lg font-semibold">{titulo}</p>
      {children && <div className="max-w-[60ch] text-sm text-sub">{children}</div>}
    </div>
  )
}

export function Aviso({ tono = 'error', children }: { tono?: 'error' | 'info'; children: ReactNode }) {
  return (
    <p role={tono === 'error' ? 'alert' : 'status'} className={cx('rounded-md px-3 py-2 text-sm', tono === 'error' ? 'bg-plumon-claro text-plumon-hondo' : 'bg-tinta-clara/50 text-tinta-hondo')}>
      {children}
    </p>
  )
}

export function EtiquetaAlerta({ alerta: a }: { alerta: Alerta }) {
  if (a.nivel === 'vencido') return <Etiqueta nivel="vencido">{a.restan < 0 ? 'Vencido' : 'Notaría vencida'}</Etiqueta>
  if (a.restan === 0) return <Etiqueta nivel="proximo">Hoy</Etiqueta>
  if (a.restan === 1) return <Etiqueta nivel="neutro">Mañana</Etiqueta>
  // Mismo texto para la misma distancia; el tono dice si ya entró al periodo de aviso.
  return <Etiqueta nivel={a.nivel === 'proximo' ? 'neutro' : 'aTiempo'}>{a.restan} días</Etiqueta>
}

/** Adjuntar archivo: control propio en lugar del selector nativo del navegador. */
export function Adjuntar({ etiqueta, archivo, onArchivo }: { etiqueta: string; archivo: string; onArchivo: (nombre: string) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <span id={`${id}-et`} className="text-[13px] font-medium text-sub">{etiqueta}</span>
      <label htmlFor={id} className="inline-flex h-9 max-w-56 cursor-pointer items-center gap-1.5 rounded-md border border-borde bg-hoja px-3 text-sm text-tinta hover:border-tinta focus-within:ring-2 focus-within:ring-tinta/20">
        <Paperclip className="h-4 w-4 shrink-0" />
        <span id={`${id}-nom`} className={cx('truncate', archivo ? 'text-texto' : '')}>{archivo || 'Adjuntar archivo'}</span>
        <input id={id} type="file" className="sr-only" aria-labelledby={`${id}-et`} aria-describedby={`${id}-nom`} onChange={(e) => onArchivo(e.target.files?.[0]?.name ?? '')} />
      </label>
    </div>
  )
}

/** Confirmación en línea: reemplaza el `confirm()` del navegador con el lenguaje de la app. */
export function Confirmar({ texto, accion, onConfirmar, onCancelar }: { texto: ReactNode; accion: string; onConfirmar: () => void; onCancelar: () => void }) {
  return (
    <div role="group" aria-label={accion} onKeyDown={(e) => e.key === 'Escape' && onCancelar()} className="flex flex-wrap items-center gap-2 rounded-md bg-plumon-claro px-3 py-2 text-sm text-plumon-hondo">
      <span>{texto}</span>
      <Boton chico variante="peligro" autoFocus onClick={onConfirmar}>{accion}</Boton>
      <Boton chico onClick={onCancelar}>Cancelar</Boton>
    </div>
  )
}
