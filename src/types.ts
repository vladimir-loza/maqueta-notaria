/** Fecha local en formato ISO corto: 'YYYY-MM-DD'. */
export type Fecha = string

export type TipoPaso = 'documento' | 'pago' | 'espera' | 'tarea'
export type TipoDia = 'habiles' | 'naturales'
export type TipoMovimiento = 'anticipo' | 'gasto' | 'impuesto' | 'honorario'

/** Desde cuándo corre un plazo. */
export type OrigenPlazo = 'apertura' | 'inicioEtapa' | 'paso'

export interface Plazo {
  dias: number
  tipoDia: TipoDia
  origen: OrigenPlazo
  /** Solo con origen 'paso': corre desde que ese paso se completa. */
  refPasoId?: string
}

export interface CostoPaso {
  concepto: string
  monto: number
  tipo: TipoMovimiento
}

// ---------- Plantillas (las configura el usuario) ----------

export interface PasoConfig {
  id: string
  nombre: string
  tipo: TipoPaso
  descripcion?: string
  /** Permite marcar "No se solicita" en el expediente. */
  opcional: boolean
  plazoNotaria?: Plazo
  plazoLey?: Plazo
  /** Días antes del vencimiento en que se avisa (preventivo). */
  avisoPrevio: number
  costo?: CostoPaso
  /** Pasos que deben estar hechos antes de poder completar este. */
  requiere: string[]
  /** Solo entra al expediente si se cumplen todas (vacío o ausente: siempre). */
  condiciones?: Condicion[]
}

// ---------- Datos de apertura y reglas (configurables por trámite) ----------

export type TipoCampo = 'texto' | 'moneda' | 'opcion' | 'sino'

/** Dato que se captura al abrir el expediente; las condiciones y reglas lo leen. */
export interface CampoConfig {
  id: string
  nombre: string
  tipo: TipoCampo
  /** Solo para 'opcion'. */
  opciones?: string[]
  requerido: boolean
  ayuda?: string
}

/** El valor del campo debe ser uno de estos ('Sí' / 'No' para campos sí/no). */
export interface Condicion {
  campoId: string
  valores: string[]
}

/**
 * Suma un campo de moneda entre expedientes que comparten un valor (p. ej. el mismo enajenante)
 * y avisa cada vez que el acumulado rebasa otro múltiplo del umbral.
 */
export interface ReglaAcumulado {
  id: string
  nombre: string
  campoClave: string
  campoMonto: string
  umbral: number
  condiciones: Condicion[]
}

/** Cuándo se habilita una etapa: al resolverse la anterior, o desde la apertura (en paralelo). */
export type InicioEtapa = 'anterior' | 'apertura'

export interface EtapaConfig {
  id: string
  nombre: string
  inicia?: InicioEtapa
  pasos: PasoConfig[]
}

export interface TipoTramite {
  id: string
  nombre: string
  clave: string
  descripcion: string
  /** Datos que pide el alta del expediente. */
  campos: CampoConfig[]
  etapas: EtapaConfig[]
  reglas: ReglaAcumulado[]
}

/** Obligación que vence cada mes, independiente de los expedientes. */
export interface Recurrente {
  id: string
  nombre: string
  descripcion: string
  /** Día del mes (1-31) o 'ultimoHabil'. */
  dia: number | 'ultimoHabil'
  avisoPrevio: number
  /** Meses ya atendidos, 'YYYY-MM'. */
  atendidos: string[]
}

// ---------- Expedientes (instancias) ----------

export type EstadoPaso = 'pendiente' | 'hecho' | 'noSolicita'

export interface PasoInst extends PasoConfig {
  estado: EstadoPaso
  fechaHecho?: Fecha
  nota?: string
  archivo?: string
}

export interface EtapaInst {
  id: string
  nombre: string
  inicia?: InicioEtapa
  pasos: PasoInst[]
}

export interface Movimiento {
  id: string
  fecha: Fecha
  tipo: TipoMovimiento
  concepto: string
  monto: number
  comprobante?: string
  pasoId?: string
  /** Contra-asiento: id del movimiento que cancela. */
  cancela?: string
}

export interface EntradaBitacora {
  id: string
  fecha: Fecha
  texto: string
}

export interface Expediente {
  id: string
  folio: string
  tipoId: string
  /** Copia del nombre del tipo al abrir, por si la plantilla cambia. */
  tipoNombre: string
  partes: string
  objeto: string
  apertura: Fecha
  /** Valores de los campos de apertura, por id de campo. */
  datos: Record<string, string>
  /** Copia de los campos al abrir, para mostrarlos aunque la plantilla cambie. */
  campos: CampoConfig[]
  estatus: 'abierto' | 'cerrado'
  fechaCierre?: Fecha
  etapas: EtapaInst[]
  movimientos: Movimiento[]
  bitacora: EntradaBitacora[]
}
