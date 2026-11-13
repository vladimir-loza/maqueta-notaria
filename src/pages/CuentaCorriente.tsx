import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FormMovimiento, ResumenSaldo, TablaMovimientos } from '../components/Cuenta'
import { Campo, Encabezado, Selector } from '../components/ui'
import { pesos } from '../lib/fechas'
import { saldo } from '../lib/motor'
import { useAviso, useStore } from '../store'
import { cx } from '../lib/textos'

export default function CuentaCorriente() {
  const { expedientes, agregarMovimiento, eliminarMovimiento, restaurarExpediente } = useStore()
  const avisar = useAviso((s) => s.avisar)
  // El filtro vive en la URL: se conserva al volver de un expediente.
  const [params, setParams] = useSearchParams()
  const expId = params.get('exp') ?? ''
  const setExpId = (v: string) => setParams(v ? { exp: v } : {}, { replace: true })
  const elegido = expedientes.find((e) => e.id === expId)
  // Sin destino por defecto: el contador elige a qué expediente va cada peso.
  const [destino, setDestino] = useState('')
  const visibles = expId ? expedientes.filter((e) => e.id === expId) : expedientes
  const movimientos = visibles.flatMap((e) =>
    e.movimientos.map((m) => ({ ...m, expId: e.id, etiqueta: <Link className="font-cond font-semibold hover:text-tinta hover:underline" to={`/expedientes/${e.id}`}>{e.folio}</Link> })),
  )
  const filas = expedientes
    .filter((e) => e.estatus === 'abierto' || e.movimientos.length)
    .map((e) => ({ e, s: saldo(e.movimientos) }))
    .sort((a, b) => a.s.saldo - b.s.saldo)
  // Lo que deben unos clientes no se compensa con los anticipos de otros.
  const porCobrar = filas.filter((r) => r.s.saldo < 0)
  const aFavor = filas.filter((r) => r.s.saldo > 0)

  return (
    <>
      <Encabezado titulo="Cuenta corriente" sub="Saldo cliente = anticipos − (gastos a terceros + impuestos + honorarios)">
        <Selector aria-label="Ver cuenta de" value={expId} onChange={(e) => setExpId(e.target.value)} className="w-auto! max-w-full">
          <option value="">Todos los expedientes</option>
          {expedientes.map((e) => <option key={e.id} value={e.id}>{e.folio} · {e.partes}</option>)}
        </Selector>
      </Encabezado>

      <div className="flex flex-col gap-6">
        {expId ? (
          <ResumenSaldo movimientos={movimientos} />
        ) : (
          <div className="grid border border-raya bg-hoja sm:grid-cols-2">
            <div className="flex flex-col gap-0.5 bg-plumon-claro px-5 py-4">
              <span className="text-xs font-medium text-plumon-hondo">Por cobrar a clientes · {porCobrar.length} {porCobrar.length === 1 ? 'expediente' : 'expedientes'}</span>
              <span className="font-cond text-2xl font-semibold text-plumon-hondo">{pesos(-porCobrar.reduce((t, r) => t + r.s.saldo, 0))}</span>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-raya px-5 py-4 sm:border-t-0 sm:border-l">
              <span className="text-xs font-medium text-sub">Anticipos a favor de clientes · {aFavor.length} {aFavor.length === 1 ? 'expediente' : 'expedientes'}</span>
              <span className="font-cond text-2xl font-semibold text-verde-hondo">{pesos(aFavor.reduce((t, r) => t + r.s.saldo, 0))}</span>
            </div>
          </div>
        )}

        {!expId && (
          <section>
            <h2 className="mb-2 font-cond text-xl font-bold">Saldos por expediente</h2>
            <div className="overflow-x-auto border border-raya bg-hoja">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-raya text-left text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-sub uppercase">
                    <th className="py-2.5 pr-3 pl-4">Expediente</th>
                    <th className="px-3 py-2.5 text-right">Anticipos</th>
                    <th className="px-3 py-2.5 text-right">Gastos</th>
                    <th className="px-3 py-2.5 text-right">Impuestos</th>
                    <th className="px-3 py-2.5 text-right">Honorarios</th>
                    <th className="py-2.5 pr-4 pl-3 text-right">Saldo cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ e, s }) => (
                    <tr key={e.id} className="border-b border-raya-suave last:border-0">
                      <td className="py-2.5 pr-3 pl-4">
                        <Link to={`/expedientes/${e.id}`} className="font-cond text-[15px] font-semibold hover:text-tinta hover:underline">{e.folio}</Link>
                        <span className="ml-2 text-xs text-sub">{e.partes}</span>
                        {e.estatus === 'cerrado' && <span className="ml-2 rounded bg-celda px-1.5 py-0.5 text-xs text-sub">cerrado</span>}
                        <button type="button" onClick={() => setExpId(e.id)} className="ml-2 text-xs text-tinta hover:underline">Ver movimientos<span className="sr-only"> de {e.folio}</span></button>
                      </td>
                      <td className="px-3 py-2.5 text-right">{pesos(s.anticipos)}</td>
                      <td className="px-3 py-2.5 text-right">{pesos(s.gastos)}</td>
                      <td className="px-3 py-2.5 text-right">{pesos(s.impuestos)}</td>
                      <td className="px-3 py-2.5 text-right">{pesos(s.honorarios)}</td>
                      <td className={cx('py-2.5 pr-4 pl-3 text-right font-semibold', s.saldo < 0 ? 'text-plumon' : s.saldo > 0 ? 'text-verde-hondo' : 'text-sub')}>{pesos(s.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-cond text-xl font-bold">Registrar movimiento</h2>
          {elegido?.estatus === 'cerrado' ? (
            <p className="border border-raya bg-hoja px-4 py-3 text-sm text-sub">
              {elegido.folio} está cerrado y ya no admite movimientos. <Link to={`/expedientes/${elegido.id}`} className="text-tinta hover:underline">Reábrelo desde el expediente</Link> si hace falta.
            </p>
          ) : (
          <FormMovimiento
            faltaDestino={expId || destino ? undefined : 'elige el expediente'}
            saldoActual={(() => { const d = expedientes.find((e) => e.id === (expId || destino)); return d ? saldo(d.movimientos).saldo : undefined })()}
            onGuardar={(m) => {
            const id = expId || destino
            const copia = structuredClone(expedientes.find((e) => e.id === id)!)
            const err = agregarMovimiento(id, m)
            avisar(err ?? `${copia.folio}: «${m.concepto}» registrado · ${pesos(m.monto)}`, err ? undefined : () => restaurarExpediente(copia))
          }}>
            {!expId && (
              <div className="w-full max-w-md">
                <Campo etiqueta="Registrar en el expediente">{(id) => (
                  <Selector id={id} value={destino} onChange={(e) => setDestino(e.target.value)}>
                    <option value="">Elige expediente…</option>
                    {expedientes.filter((e) => e.estatus === 'abierto').map((e) => <option key={e.id} value={e.id}>{e.folio} · {e.partes}</option>)}
                  </Selector>
                )}</Campo>
              </div>
            )}
          </FormMovimiento>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-cond text-xl font-bold">Movimientos</h2>
          <TablaMovimientos
            extra={expId ? undefined : 'Expediente'}
            saldoCorrido={!!expId}
            saldoSin={(m) => { const d = expedientes.find((e) => e.id === (m as typeof movimientos[number]).expId)!; return saldo(d.movimientos.filter((x) => x.id !== m.id)).saldo }}
            movimientos={movimientos}
            puedeEliminar={(m) => expedientes.find((e) => e.id === (m as typeof movimientos[number]).expId)?.estatus === 'abierto'}
            onEliminar={(m) => {
              const expDe = (m as typeof movimientos[number]).expId
              const copia = structuredClone(expedientes.find((e) => e.id === expDe)!)
              const err = eliminarMovimiento(expDe, m.id)
              avisar(err ?? `Movimiento «${m.concepto}» eliminado · ${pesos(m.monto)}`, err ? undefined : () => restaurarExpediente(copia))
            }}
          />
        </section>
      </div>
    </>
  )
}
