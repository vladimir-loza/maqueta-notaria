// Datos de demostración. Todo es ficticio: nombres, folios, montos.
// La escrituración se arma con el esquema genérico (etapas, pasos, condiciones y reglas); el motor no la conoce.
import type { Condicion, CostoPaso, EtapaConfig, Expediente, Fecha, PasoConfig, Plazo, Recurrente, TipoTramite } from '../types'
import { sumarNaturales } from './fechas'
import { buscarPaso, instanciar, nuevoId } from './motor'

const hab = (dias: number, origen: Plazo['origen'] = 'inicioEtapa', refPasoId?: string): Plazo => ({ dias, tipoDia: 'habiles', origen, refPasoId })
const nat = (dias: number, origen: Plazo['origen'] = 'inicioEtapa', refPasoId?: string): Plazo => ({ dias, tipoDia: 'naturales', origen, refPasoId })

function paso(
  id: string,
  nombre: string,
  tipo: PasoConfig['tipo'],
  o: Partial<Omit<PasoConfig, 'id' | 'nombre' | 'tipo'>> & { costo?: CostoPaso } = {},
): PasoConfig {
  // pasos_escrituración.md: «En todo poner opción de si solicita o no».
  return { id, nombre, tipo, opcional: true, avisoPrevio: 1, requiere: [], ...o }
}
const etapa = (id: string, nombre: string, pasos: PasoConfig[]): EtapaConfig => ({ id, nombre, pasos })

// ---------- Escrituración: pasos_escrituración.md al pie de la letra, con el esquema genérico ----------
// Cada viñeta del .md es un paso; las secciones del .md son las etapas; el alcance entre paréntesis
// (compraventas, donaciones, JSI y JST, …) es la condición «Aplica cuando Acto». El motor no sabe de escrituras.

const ACTOS = ['Compraventa', 'Donación', 'JSI y JST', 'Constitutiva', 'Acta de asamblea', 'Otro'] as const
type Acto = (typeof ACTOS)[number]
const acto = (...valores: Acto[]): Condicion => ({ campoId: 'acto', valores: [...valores] })
const si = (campoId: string): Condicion => ({ campoId, valores: ['Sí'] })
/** «(compraventas, donaciones, JSI y JST, otro)» */
const CV_DO_JS_OT = acto('Compraventa', 'Donación', 'JSI y JST', 'Otro')

/** Documentación de la apertura (.md l. 5-7): sin plazo ni alcance en el .md. */
const doc = (id: string, nombre: string) => paso(id, nombre, 'documento')
/** Pago cuyo monto se captura al registrarlo: el .md no da importes. */
const pago = (id: string, nombre: string, tipo: CostoPaso['tipo'], o: Partial<PasoConfig> = {}) =>
  paso(id, nombre, 'pago', { costo: { concepto: nombre, monto: 0, tipo }, ...o })

export const tiposSemilla = (): TipoTramite[] => [
  {
    id: 'escrituracion',
    nombre: 'Escrituración',
    clave: 'ESC',
    descripcion: 'Pasos del trámite de escrituración (pasos_escrituración.md).',
    campos: [
      { id: 'acto', nombre: 'Acto', tipo: 'opcion', opciones: [...ACTOS], requerido: true, ayuda: 'Decide qué pasos aplican, según los paréntesis del documento de pasos.' },
      { id: 'iva', nombre: '¿El acto genera IVA?', tipo: 'sino', requerido: false, ayuda: '«Cálculo IVA (cuando genere)».' },
      { id: 'personaFisica', nombre: '¿Vende una persona física?', tipo: 'sino', requerido: false, ayuda: '«Complemento (siempre que una persona física venda)».' },
      { id: 'registro', nombre: 'Registro ordinario o urgente', tipo: 'opcion', opciones: ['Ordinario', 'Urgente'], requerido: false, ayuda: 'Constitutivas y actas de asamblea.' },
      { id: 'enajenante', nombre: 'Enajenante', tipo: 'texto', requerido: false, ayuda: 'Para la acumulación de ventas de sociedades.' },
      { id: 'valor', nombre: 'Valor de la operación', tipo: 'moneda', requerido: false },
      { id: 'sociedad', nombre: '¿El enajenante es sociedad?', tipo: 'sino', requerido: false },
    ],
    reglas: [
      {
        // .md l. 62-63: «Acumulación (en las sociedades cuando realizan ventas cada que se rebase el monto de $900,000.00)».
        id: 'acumulado',
        nombre: 'Acumulación',
        campoClave: 'enajenante',
        campoMonto: 'valor',
        umbral: 900000,
        condiciones: [acto('Compraventa'), si('sociedad')],
      },
    ],
    etapas: [
      // .md l. 9 «Abrir expediente (anticipo y documentación):» y sus viñetas l. 11-50.
      etapa('apertura', 'Abrir expediente (anticipo y documentación)', [
        pago('anticipo', 'Anticipo', 'anticipo'),
        doc('ine', 'INE'),
        doc('actaNac', 'Acta de nacimiento'),
        doc('actaMat', 'Acta de matrimonio'),
        doc('actaDef', 'Acta de defunción'),
        doc('curp', 'CURP'),
        doc('csf', 'CSF actualizada'),
        doc('domicilio', 'Comprobante de domicilio'),
        doc('escAnt', 'Escritura o título'),
        doc('antecedentes', 'Antecedentes'),
        doc('predialAgua', 'Pago predial y agua'),
        doc('copiasJuicio', 'Copias certificadas del juicio'),
        paso('certGrav', 'Solicitar certificado', 'tarea', { plazoNotaria: nat(1), plazoLey: hab(3), condiciones: [CV_DO_JS_OT] }),
        paso('avaluo', 'Solicitar avalúo', 'tarea', { plazoNotaria: nat(1), plazoLey: hab(3), condiciones: [CV_DO_JS_OT] }),
        paso('denominacion', 'Solicitar denominación', 'tarea', { plazoNotaria: nat(1), plazoLey: nat(5), condiciones: [acto('Constitutiva')] }),
        paso('testamento', 'Solicitar certificado negativo o positivo de testamento', 'tarea', { plazoNotaria: nat(1), condiciones: [acto('JSI y JST')] }),
        paso('actaAsamblea', 'Realizar el acta de asamblea y enviarla a firma', 'tarea', { condiciones: [acto('Acta de asamblea')] }),
        // «Firma de escritura desde la apertura del expediente»
        paso('firmaCvDo', 'Firma de escritura', 'tarea', { plazoNotaria: nat(7, 'apertura'), descripcion: 'Compraventa y donaciones: tiempo máximo 1 semana desde la apertura.', condiciones: [acto('Compraventa', 'Donación')] }),
        paso('firma1', 'Firma de primera escritura', 'tarea', { plazoNotaria: nat(14, 'apertura'), descripcion: 'Protocolizaciones: 2 semanas desde la apertura.', condiciones: [acto('JSI y JST')] }),
        paso('firma2', 'Firma de segunda escritura', 'tarea', { plazoNotaria: nat(30, 'apertura'), descripcion: 'Protocolizaciones: 1 mes desde la apertura, en lo que salen los edictos.', requiere: ['pagoEdictos'], condiciones: [acto('JSI y JST')] }),
        paso('firmaSoc', 'Firma de escritura', 'tarea', { plazoNotaria: nat(11, 'apertura'), descripcion: 'Constitutivas y actas de asamblea: tiempo máximo 1 semana y media desde la apertura.', condiciones: [acto('Constitutiva', 'Acta de asamblea')] }),
        paso('firmaOtro', 'Firma de escritura', 'tarea', { plazoNotaria: nat(11, 'apertura'), descripcion: 'Otro: tiempo máximo 1 semana y media desde la apertura.', condiciones: [acto('Otro')] }),
        pago('pagoEdictos', 'Pago de edictos', 'gasto', { condiciones: [acto('JSI y JST')] }),
        paso('calcIsr', 'Cálculo de ISR', 'tarea'),
        pago('pagoIsr', 'Pago de ISR', 'impuesto', { plazoLey: nat(15, 'paso', 'calcIsr'), avisoPrevio: 3, requiere: ['calcIsr'] }),
        paso('declIsr', 'Declarado pago ISR', 'documento', { plazoLey: nat(15, 'paso', 'calcIsr'), avisoPrevio: 3, requiere: ['pagoIsr'] }),
        paso('calcIva', 'Cálculo de IVA', 'tarea', { descripcion: 'Cuando genere.', condiciones: [si('iva')] }),
        pago('pagoIva', 'Pago de IVA', 'impuesto', { requiere: ['calcIva'], condiciones: [si('iva')] }),
      ]),
      // .md l. 52 «Certificado y avaluó» y l. 54 «Traslado (documentación) (…):» con sus viñetas l. 56-83.
      { ...etapa('traslado', 'Traslado (documentación)', [
        pago('revTras', 'Pago de revisión del traslado, para cerrarlo', 'gasto', { plazoLey: hab(3, 'paso', 'avaluo'), requiere: ['certGrav', 'avaluo'], condiciones: [CV_DO_JS_OT] }),
        paso('impTras', 'Impresión de traslado (predial y catastro)', 'tarea', { requiere: ['certGrav', 'avaluo'], condiciones: [CV_DO_JS_OT] }),
        paso('expUnico', 'Apertura expediente único', 'tarea'),
        paso('regTras', 'Regreso del traslado', 'espera', { plazoLey: hab(10, 'paso', 'impTras'), avisoPrevio: 3, descripcion: '10 días hábiles de la fecha de impresión.', requiere: ['impTras'], condiciones: [CV_DO_JS_OT] }),
        paso('cierreEsc', 'Cerrar escritura', 'tarea', { descripcion: 'En este punto deben estar pagados y declarados los impuestos.', requiere: ['pagoIsr', 'declIsr', 'pagoIva'] }),
        paso('formas', 'Hacer formas precodificadas', 'tarea', { condiciones: [acto('Constitutiva', 'Acta de asamblea')] }),
        paso('envioReg', 'Escritura enviada al registro', 'tarea', { descripcion: 'Depende si es ordinario o urgente.', condiciones: [acto('Constitutiva', 'Acta de asamblea')] }),
        paso('gestor', 'Llamar al gestor', 'espera', { plazoNotaria: nat(7, 'paso', 'envioReg'), descripcion: 'Alerta a la semana de que se envió la escritura al registro.', requiere: ['envioReg'], condiciones: [acto('Constitutiva', 'Acta de asamblea')] }),
        paso('avisoDen', 'Dar aviso de uso de denominación', 'tarea', { descripcion: 'Ya con el registro.', requiere: ['envioReg'], condiciones: [acto('Constitutiva')] }),
        paso('entrega', 'Entregar escritura', 'tarea'),
      ]), inicia: 'apertura' },
      // .md l. 85-89 «ANTES DE CERRAR EL MES».
      { ...etapa('mes', 'Antes de cerrar el mes', [
        paso('factRet', 'Factura de retención', 'tarea', { descripcion: 'Cuando se paga el ISR e IVA.', requiere: ['pagoIsr', 'pagoIva'] }),
        paso('complemento', 'Complemento', 'tarea', { descripcion: 'Siempre que una persona física venda.', condiciones: [si('personaFisica')] }),
      ]), inicia: 'apertura' },
    ],
  },
]

export const recurrentesSemilla = (): Recurrente[] => [
  { id: 'avisoPld', nombre: 'Aviso de actividades vulnerables', descripcion: 'Envío al portal SAT / UIF', dia: 17, avisoPrevio: 3, atendidos: [] },
  { id: 'cierreMes', nombre: 'Facturas de retención y complementos', descripcion: 'Cierre de mes', dia: 'ultimoHabil', avisoPrevio: 3, atendidos: [] },
]

/** Días inhábiles oficiales (LFT, art. 74) 2026–2027; los fines de semana se cuentan aparte. */
export const inhabilesSemilla = (): Fecha[] => [
  '2026-01-01', '2026-02-02', '2026-03-16', '2026-05-01', '2026-09-16', '2026-11-16', '2026-12-25',
  '2027-01-01', '2027-02-01', '2027-03-15', '2027-05-01', '2027-09-16', '2027-11-15', '2027-12-25',
]

// ---------- Expedientes de ejemplo, fechados respecto a hoy ----------

function avanzar(exp: Expediente, hechos: Record<string, Fecha | 'no'>, montos: Record<string, number> = {}) {
  for (const [id, f] of Object.entries(hechos)) {
    const r = buscarPaso(exp, id)
    if (!r) continue
    const p = r.paso
    if (f === 'no') { p.estado = 'noSolicita'; continue }
    p.estado = 'hecho'
    p.fechaHecho = f
    if (p.tipo === 'documento') p.archivo = `${p.nombre.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, '-')}.pdf`
    const monto = montos[id] ?? p.costo?.monto
    if (p.costo && monto) exp.movimientos.push({ id: nuevoId(), fecha: f, tipo: p.costo.tipo, concepto: p.costo.concepto, monto, pasoId: p.id, comprobante: p.tipo === 'pago' ? 'recibo.pdf' : undefined })
    exp.bitacora.push({ id: nuevoId(), fecha: f, texto: `${p.nombre}: hecho.` })
  }
  exp.bitacora.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function expedientesSemilla(tipos: TipoTramite[], hoy: Fecha): Expediente[] {
  const esc = tipos.find((x) => x.id === 'escrituracion')!
  const d = (n: number) => sumarNaturales(hoy, n)
  const anio = hoy.slice(0, 4)
  const nuevo = (n: string, partes: string, objeto: string, ap: number, datos: Record<string, string>) =>
    instanciar(esc, { folio: `${anio}/${n}`, partes, objeto, apertura: d(ap), datos: { iva: 'No', personaFisica: 'No', sociedad: 'No', ...datos } })
  const documentos = (f: Fecha, no: string[] = []) =>
    Object.fromEntries(['anticipo', 'ine', 'actaNac', 'actaMat', 'actaDef', 'curp', 'csf', 'domicilio', 'escAnt', 'antecedentes', 'predialAgua', 'copiasJuicio'].map((k) => [k, no.includes(k) ? 'no' : f]))
  const sinJuicio = ['actaDef', 'copiasJuicio']

  const e1 = nuevo('0398', 'Márquez Ibarra → Sandoval Ruiz', 'Lote 14, Fracc. Las Ánimas', -35, { acto: 'Compraventa', valor: '1850000', enajenante: 'Márquez Ibarra', personaFisica: 'Sí' })
  avanzar(e1, { ...documentos(d(-34), ['actaMat', ...sinJuicio]), certGrav: d(-34), avaluo: d(-33), firmaCvDo: d(-29), calcIsr: d(-28), pagoIsr: d(-25), declIsr: d(-24), factRet: d(-24), complemento: d(-24), revTras: d(-22), impTras: d(-16), expUnico: d(-34) },
    { anticipo: 25000, pagoIsr: 48210, revTras: 1850 })

  const e2 = nuevo('0405', 'Fam. Cárdenas Olvera', 'Casa en calle Hidalgo 212, Centro', -3, { acto: 'Donación', valor: '980000', enajenante: 'Cárdenas Olvera', personaFisica: 'Sí' })
  avanzar(e2, { ...documentos(d(-1), ['predialAgua', 'actaMat', ...sinJuicio]) }, { anticipo: 20000 })

  const e3 = nuevo('0411', 'Talleres Río Lerma, S.A. de C.V.', 'Capital social $50,000', -5, { acto: 'Constitutiva', registro: 'Urgente' })
  avanzar(e3, { anticipo: d(-5), ine: d(-4), csf: d(-4), domicilio: d(-4), actaNac: 'no', actaMat: 'no', actaDef: 'no', escAnt: 'no', antecedentes: 'no', predialAgua: 'no', copiasJuicio: 'no', curp: d(-4), expUnico: d(-5) }, { anticipo: 15000 })

  // Dos ventas de la misma sociedad: juntas rebasan $900,000 y disparan la acumulación.
  const e4 = nuevo('0387', 'Inmobiliaria Altavista → Peña Gómez', 'Depto. 302, Torre Jacarandas', -21, { acto: 'Compraventa', valor: '650000', enajenante: 'Inmobiliaria Altavista, S.A. de C.V.', sociedad: 'Sí', iva: 'Sí' })
  avanzar(e4, { ...documentos(d(-20), ['actaNac', 'actaMat', ...sinJuicio]), certGrav: d(-21), avaluo: d(-20), firmaCvDo: d(-14), calcIsr: d(-12) }, { anticipo: 25000 })

  const e9 = nuevo('0392', 'Inmobiliaria Altavista → Robles Vega', 'Depto. 105, Torre Jacarandas', -9, { acto: 'Compraventa', valor: '420000', enajenante: 'Inmobiliaria Altavista, S.A. de C.V.', sociedad: 'Sí', iva: 'Sí' })
  avanzar(e9, { ...documentos(d(-8), ['actaNac', 'actaMat', ...sinJuicio]), certGrav: d(-9) }, { anticipo: 20000 })

  const e5 = nuevo('0402', 'Grupo Alfarero del Bajío, S.A.', 'Asamblea extraordinaria: aumento de capital', -24, { acto: 'Acta de asamblea', registro: 'Ordinario' })
  avanzar(e5, { ...documentos(d(-23), ['actaNac', 'actaMat', 'actaDef', 'curp', 'escAnt', 'antecedentes', 'predialAgua', 'copiasJuicio']), actaAsamblea: d(-18), firmaSoc: d(-14), expUnico: d(-24), formas: d(-12), envioReg: d(-6) }, { anticipo: 12000 })

  const e6 = nuevo('0379', 'Sucesión de Ernesto Villalobos Rangel', 'Casa habitación, Col. Jardines del Valle', -12, { acto: 'JSI y JST', valor: '2300000' })
  avanzar(e6, { anticipo: d(-12), ine: d(-11), actaDef: d(-11), copiasJuicio: d(-10), escAnt: d(-10), predialAgua: 'no', testamento: d(-11), pagoEdictos: d(-8) }, { anticipo: 30000, pagoEdictos: 2400 })

  const e7 = nuevo('0414', 'Ortega Lugo → Banda Fuentes', 'Terreno rústico, Ejido San Isidro', 0, { acto: 'Otro', valor: '310000', enajenante: 'Ortega Lugo', personaFisica: 'Sí' })

  const e8 = nuevo('0360', 'Aguilar Medina → Aguilar Soto', 'Casa en Av. Juárez 88', -70, { acto: 'Donación', valor: '1200000', enajenante: 'Aguilar Medina' })
  avanzar(e8, {
    ...documentos(d(-69), ['actaMat', ...sinJuicio]), certGrav: d(-69), avaluo: d(-68), firmaCvDo: d(-64), calcIsr: d(-63), pagoIsr: d(-60), declIsr: d(-60), factRet: d(-59),
    revTras: d(-55), impTras: d(-53), expUnico: d(-69), regTras: d(-45), cierreEsc: d(-44), entrega: d(-28),
  }, { anticipo: 20000, pagoIsr: 0, revTras: 1850 })
  e8.movimientos.push({ id: nuevoId(), fecha: d(-28), tipo: 'anticipo', concepto: 'Liquidación del cliente', monto: 12200, comprobante: 'recibo.pdf' })
  e8.estatus = 'cerrado'
  e8.fechaCierre = d(-28)

  return [e7, e2, e3, e9, e6, e4, e5, e1, e8]
}
