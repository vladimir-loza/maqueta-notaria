import { Copy, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Boton, Encabezado, Vacio } from '../components/ui'
import { nuevoId } from '../lib/motor'
import { useStore } from '../store'
import type { TipoTramite } from '../types'

export default function Tramites() {
  const { tipos, expedientes, guardarTipo } = useStore()
  const navigate = useNavigate()

  const crear = () => {
    const t: TipoTramite = { id: nuevoId(), nombre: 'Nuevo trámite', clave: '', descripcion: '', campos: [], reglas: [], etapas: [{ id: nuevoId(), nombre: 'Apertura', pasos: [] }] }
    guardarTipo(t)
    navigate(`/tramites/${t.id}`)
  }
  const duplicar = (t: TipoTramite) => {
    const copia = { ...structuredClone(t), id: nuevoId(), nombre: `${t.nombre} (copia)` }
    guardarTipo(copia)
    navigate(`/tramites/${copia.id}`)
  }

  return (
    <>
      <Encabezado titulo="Tipos de trámite" sub="Cada tipo define sus etapas, pasos, plazos y costos">
        <Boton variante="primario" onClick={crear}><Plus className="h-4 w-4" />Nuevo tipo de trámite</Boton>
      </Encabezado>
      {tipos.length === 0 ? (
        <Vacio titulo="Aún no hay tipos de trámite.">Crea el primero y agrega sus etapas conforme el trámite lo requiera.</Vacio>
      ) : (
        <div className="overflow-x-auto border border-raya bg-hoja">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-raya text-left text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-sub uppercase">
                <th className="py-2.5 pr-3 pl-4">Trámite</th>
                <th className="hidden w-[36%] px-3 py-2.5 xl:table-cell">Etapas</th>
                <th className="w-[76px] px-3 py-2.5 text-right">Pasos</th>
                <th className="w-[84px] px-3 py-2.5 text-right" title="Pasos con plazo de ley">Con ley</th>
                <th className="w-[96px] px-3 py-2.5 text-right" title="Expedientes abiertos">Abiertos</th>
                <th className="relative w-[180px] py-2.5 pr-4 pl-3 xl:w-[340px]"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => {
                const pasos = t.etapas.flatMap((e) => e.pasos)
                return (
                  <tr key={t.id} className="border-b border-raya-suave last:border-0">
                    <td className="py-3 pr-3 pl-4">
                      <Link to={`/tramites/${t.id}`} className="font-cond text-base font-semibold hover:text-tinta hover:underline">{t.nombre}</Link>
                      <span className="block max-w-[40ch] text-xs text-sub">{t.descripcion}</span>
                    </td>
                    <td className="hidden px-3 py-3 text-[13px] text-sub xl:table-cell">{t.etapas.map((e) => e.nombre).join(' · ')}</td>
                    <td className="px-3 py-3 text-right">{pasos.length}</td>
                    <td className="px-3 py-3 text-right">{pasos.filter((p) => p.plazoLey).length}</td>
                    <td className="px-3 py-3 text-right">{expedientes.filter((e) => e.tipoId === t.id && e.estatus === 'abierto').length}</td>
                    <td className="py-3 pr-4 pl-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Boton chico onClick={() => navigate(`/tramites/${t.id}`)}>Configurar<span className="sr-only"> {t.nombre}</span></Boton>
                        <Boton chico variante="fantasma" onClick={() => duplicar(t)}><Copy className="h-3.5 w-3.5" />Duplicar<span className="sr-only"> {t.nombre}</span></Boton>
                        <Boton chico variante="fantasma" onClick={() => navigate(`/expedientes/nuevo?tipo=${t.id}`)}>Abrir expediente<span className="sr-only"> de {t.nombre}</span></Boton>
                      </div>
                    </td>
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
