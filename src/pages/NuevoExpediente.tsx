import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Boton, Campo, Encabezado, Entrada, IconoPaso, Selector } from '../components/ui'
import { hoy, pesos } from '../lib/fechas'
import { cumple, describirPlazo } from '../lib/motor'
import { CampoDato } from '../components/CampoDato'
import { useStore } from '../store'

export default function NuevoExpediente() {
  const { tipos, abrirExpediente } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tipoId, setTipoId] = useState(params.get('tipo') ?? tipos[0]?.id ?? '')
  const [partes, setPartes] = useState('')
  const [objeto, setObjeto] = useState('')
  const [apertura, setApertura] = useState(hoy())
  const [datos, setDatos] = useState<Record<string, string>>({})
  const tipo = tipos.find((t) => t.id === tipoId)
  const faltan = (tipo?.campos ?? []).filter((c) => c.requerido && !datos[c.id])
  // La vista previa ya refleja los datos capturados: solo aparecen los pasos que aplicarán.
  const etapasPrevia = (tipo?.etapas ?? []).map((e) => ({ ...e, pasos: e.pasos.filter((p) => cumple(p.condiciones, datos)) })).filter((e) => e.pasos.length)
  const totalPasos = (tipo?.etapas ?? []).reduce((t, e) => t + e.pasos.length, 0)
  const aplican = etapasPrevia.reduce((t, e) => t + e.pasos.length, 0)
  const nombrePaso = (id: string) => tipo?.etapas.flatMap((e) => e.pasos).find((p) => p.id === id)?.nombre
  const [error, setError] = useState('')

  const abrir = (e: React.FormEvent) => {
    e.preventDefault()
    if (!partes.trim()) {
      setError('Escribe las partes o comparecientes del expediente.')
      document.querySelector<HTMLInputElement>('[data-campo=partes]')?.focus()
      return
    }
    if (!tipo || !apertura) return setError('Elige el tipo de trámite y la fecha de apertura.')
    if (faltan.length) {
      setError(`Falta: ${faltan.map((c) => c.nombre).join(', ')}.`)
      document.querySelector<HTMLElement>(`[data-dato="${faltan[0].id}"]`)?.focus()
      return
    }
    const id = abrirExpediente(tipoId, { partes: partes.trim(), objeto: objeto.trim(), apertura, datos })
    navigate(`/expedientes/${id}`)
  }

  if (!tipos.length) {
    return (
      <>
        <Encabezado titulo="Nuevo expediente" />
        <p className="text-sm text-sub">Primero crea un tipo de trámite en <Link className="text-tinta underline" to="/tramites">Tipos de trámite</Link>.</p>
      </>
    )
  }

  return (
    <>
      <Encabezado titulo="Nuevo expediente" sub="Se crea desde la plantilla del tipo de trámite" />
      <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <form onSubmit={abrir} className="flex flex-col gap-4 self-start border border-raya bg-hoja p-5">
          <Campo etiqueta="Tipo de trámite">{(id) => (
            <Selector id={id} value={tipoId} onChange={(e) => { setTipoId(e.target.value); setDatos({}) }}>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </Selector>
          )}</Campo>
          <Campo etiqueta="Partes o comparecientes" ayuda="Ej. Ortega Lugo → Banda Fuentes">{(id) => (
            <Entrada id={id} data-campo="partes" value={partes} aria-invalid={!!error && !partes.trim()} aria-describedby={error ? 'error-alta' : undefined}
              onChange={(e) => { setPartes(e.target.value); setError('') }} />
          )}</Campo>
          <Campo etiqueta="Objeto" ayuda="Inmueble, sociedad o acto">{(id) => (
            <Entrada id={id} value={objeto} onChange={(e) => setObjeto(e.target.value)} />
          )}</Campo>
          <Campo etiqueta="Fecha de apertura" ayuda="Los plazos «desde la apertura» corren a partir de aquí.">{(id) => (
            <Entrada id={id} type="date" required value={apertura} onChange={(e) => setApertura(e.target.value)} />
          )}</Campo>
          {(tipo?.campos ?? []).length > 0 && (
            <fieldset className="flex flex-col gap-4 border-t border-raya pt-4">
              <legend className="mb-1 font-cond text-[15px] font-semibold">Datos del trámite</legend>
              {tipo!.campos.map((c) => (
                <CampoDato key={c.id} campo={c} valor={datos[c.id] ?? ''} invalido={!!error && faltan.includes(c)}
                  onValor={(v) => { setDatos((d) => ({ ...d, [c.id]: v })); setError('') }} />
              ))}
            </fieldset>
          )}
          {error && <p id="error-alta" role="alert" className="text-sm text-plumon-hondo">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Boton type="submit" variante="primario">Abrir expediente</Boton>
            <Boton onClick={() => navigate(-1)}>Cancelar</Boton>
          </div>
        </form>

        {tipo && (
          <section aria-label="Vista previa de la plantilla">
            <h2 className="mb-1 font-cond text-xl font-bold">{tipo.nombre}</h2>
            <p className="mb-4 max-w-[70ch] text-sm text-sub">
              {tipo.descripcion} El expediente copia estas etapas; cambios posteriores a la plantilla no lo alteran.
              {totalPasos !== aplican && <> Con los datos capturados aplican <strong className="text-texto">{aplican} de {totalPasos} pasos</strong>.</>}
            </p>
            <ol className="flex flex-col gap-4">
              {etapasPrevia.map((et, i) => (
                <li key={et.id}>
                  <h3 className="mb-1.5 font-cond text-[15px] font-semibold">{i + 1}. {et.nombre}</h3>
                  <ul className="border-l-2 border-raya pl-3">
                    {et.pasos.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 py-1 text-sm">
                        <IconoPaso tipo={p.tipo} />
                        <span>{p.nombre}</span>
                        {p.plazoNotaria && <span className="text-xs text-sub">notaría: {describirPlazo(p.plazoNotaria, nombrePaso)}</span>}
                        {p.plazoLey && <span className="text-xs text-plumon-hondo">ley: {describirPlazo(p.plazoLey, nombrePaso)}</span>}
                        {p.costo && p.costo.monto > 0 && <span className="text-xs text-sub">· {pesos(p.costo.monto)}</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  )
}
