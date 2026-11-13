import { Plus, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useFiltroUrl } from '../lib/url'
import { Link, useNavigate } from 'react-router-dom'
import { Boton, Encabezado, Entrada, Etiqueta, EtiquetaAlerta, Pestanas, Selector, Vacio } from '../components/ui'
import { cx } from '../lib/textos'
import { fechaCorta, fechaMedia, hoy as hoyF, pesos } from '../lib/fechas'
import { alertasExpediente, etapaActual, resuelto, saldo } from '../lib/motor'
import { useInhabiles, useStore } from '../store'
import type { Expediente } from '../types'

type Filtro = 'abierto' | 'cerrado' | 'todos'

/** Una muesca por etapa: llena si está resuelta, a medias si está en curso. */
export function AvanceEtapas({ exp }: { exp: Expediente }) {
  const actual = etapaActual(exp)
  return (
    <div className="flex gap-0.5" aria-hidden>
      {exp.etapas.map((e, i) => {
        const hechos = e.pasos.filter(resuelto).length
        return (
          <span key={e.id} className="h-1.5 w-5 overflow-hidden rounded-sm bg-celda">
            <span
              className={cx('block h-full', i === actual ? 'bg-sub' : 'bg-verde')}
              style={{ width: `${(hechos / Math.max(1, e.pasos.length)) * 100}%` }}
            />
          </span>
        )
      })}
    </div>
  )
}

export default function Expedientes() {
  const { expedientes, tipos } = useStore()
  const inhabiles = useInhabiles()
  const navigate = useNavigate()
  const hoy = hoyF()
  const [filtroUrl, setFiltro] = useFiltroUrl('estatus', 'abierto')
  const filtro = (['abierto', 'cerrado', 'todos'].includes(filtroUrl) ? filtroUrl : 'abierto') as Filtro
  const [tipo, setTipo] = useFiltroUrl('tipo')
  const [q, setQ] = useFiltroUrl('q')

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return expedientes
      .filter((e) => filtro === 'todos' || e.estatus === filtro)
      .filter((e) => !tipo || e.tipoId === tipo)
      .filter((e) => !t || [e.folio, e.partes, e.objeto].some((s) => s.toLowerCase().includes(t)))
      .map((e) => ({
        e,
        s: saldo(e.movimientos),
        proxima: alertasExpediente(e, hoy, inhabiles).sort((a, b) => a.vence.localeCompare(b.vence))[0],
      }))
      .sort((a, b) => b.e.folio.localeCompare(a.e.folio))
  }, [expedientes, filtro, tipo, q, hoy, inhabiles])

  const cuenta = (f: Filtro) => expedientes.filter((e) => f === 'todos' || e.estatus === f).length

  return (
    <>
      <Encabezado titulo="Expedientes">
        <Selector aria-label="Tipo de trámite" value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-auto! max-w-full">
          <option value="">Todos los trámites</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </Selector>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-sub" />
          <Entrada aria-label="Buscar" placeholder="Folio, partes u objeto" value={q} onChange={(e) => setQ(e.target.value)} className="w-56! pl-8" />
        </div>
        <Boton variante="primario" onClick={() => navigate('/expedientes/nuevo')}><Plus className="h-4 w-4" />Nuevo expediente</Boton>
      </Encabezado>

      <Pestanas valor={filtro} onCambio={setFiltro} opciones={[
        { id: 'abierto', texto: 'Abiertos', cuenta: cuenta('abierto') },
        { id: 'cerrado', texto: 'Cerrados', cuenta: cuenta('cerrado') },
        { id: 'todos', texto: 'Todos', cuenta: cuenta('todos') },
      ]} />

      {filas.length === 0 ? (
        <div className="mt-4"><Vacio titulo="No hay expedientes con estos filtros.">Abre uno nuevo desde un tipo de trámite o cambia el filtro.</Vacio></div>
      ) : (
        <div className="overflow-x-auto border border-t-0 border-raya bg-hoja">
          <table className="w-full table-fixed border-collapse text-sm md:min-w-[700px]">
            <thead>
              <tr className="border-b border-raya text-left text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-sub uppercase">
                <th className="py-2.5 pr-3 pl-4 xl:w-[150px]">Expediente</th>
                <th className="hidden px-3 py-2.5 xl:table-cell">Partes · objeto</th>
                <th className="hidden w-[200px] px-3 py-2.5 md:table-cell xl:w-[220px]">Etapa</th>
                <th className="w-[140px] px-3 py-2.5 md:w-[210px] xl:w-[250px]">Próximo vencimiento</th>
                <th className="w-[110px] px-3 py-2.5 text-right md:w-[130px]">Saldo cliente</th>
                <th className="hidden w-[120px] py-2.5 pr-4 pl-3 xl:table-cell">Apertura</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ e, proxima, s }) => {
                const ei = etapaActual(e)
                return (
                  <tr key={e.id} onClick={() => navigate(`/expedientes/${e.id}`)} className="cursor-pointer border-b border-raya-suave last:border-0 hover:bg-fila">
                    <td className="py-3 pr-3 pl-4">
                      <Link to={`/expedientes/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="block font-cond text-[15px] font-semibold whitespace-nowrap hover:text-tinta hover:underline">{e.folio}</Link>
                      <span className="block truncate text-xs text-sub" title={`${e.tipoNombre} · ${e.partes}`}>{e.tipoNombre}<span className="xl:hidden"> · {e.partes}</span></span>
                    </td>
                    <td className="hidden px-3 py-3 xl:table-cell">
                      <span className="block truncate font-medium">{e.partes}</span>
                      <span className="block truncate text-xs text-sub">{e.objeto}</span>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      {e.estatus === 'cerrado' ? (
                        <Etiqueta nivel="neutro">Cerrado {e.fechaCierre && fechaCorta(e.fechaCierre)}</Etiqueta>
                      ) : (
                        <>
                          <span className="mb-1 block truncate text-[13px]" title={ei >= 0 ? e.etapas[ei].nombre : undefined}>{ei >= 0 ? `${ei + 1}/${e.etapas.length} · ${e.etapas[ei].nombre}` : 'Listo para cerrar'}</span>
                          <AvanceEtapas exp={e} />
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {proxima ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-cond text-[15px] font-semibold whitespace-nowrap">{fechaCorta(proxima.vence)}</span>
                            <EtiquetaAlerta alerta={proxima} />
                          </div>
                          <span className="block truncate text-xs text-sub" title={proxima.titulo}>{proxima.titulo}</span>
                        </>
                      ) : <span className="text-xs text-sub">Sin plazo corriendo</span>}
                    </td>
                    <td className={cx('px-3 py-3 text-right font-medium whitespace-nowrap', s.saldo < 0 && 'text-plumon')}>{pesos(s.saldo)}</td>
                    <td className="hidden py-3 pr-4 pl-3 whitespace-nowrap text-sub xl:table-cell">{fechaMedia(e.apertura)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
