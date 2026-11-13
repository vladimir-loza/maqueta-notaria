---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# App de gestión de trámites (demo)

Scope: toda la app SPA (`src/`). Modo: Operate.

Audiencia y tarea: contador de notaría, escritorio, jornada completa. Abre el día en la Bandeja de vencimientos; documenta expedientes paso a paso; configura tipos de trámite (etapas, pasos, plazos, costos); lleva cuenta corriente por expediente.

Pantallas v1: Vencimientos (inicio), Expedientes + detalle, Cuenta corriente, Tipos de trámite (constructor), Calendario inhábil.

Evitar: plantilla SaaS genérica, jerga técnica (pipeline/workflow), poca densidad, ornamento ceremonial legal.

## Direction contract

THESIS: Cada plazo se ve como el contador lo marca en su agenda: días hábiles contados en una tira, inhábiles en rojo, la fecha fatal de ley circulada, hoy en marcatextos. Rechaza el panel SaaS con tarjetas KPI e insignias sueltas.

OWN-WORLD: Riel vino de agenda (#5E1F2B) con ítem activo en papel; fondo papel frío #F5F6F2 con hairlines azul pálido #D5DEEA; tinta azul #1D4FA3 solo en lo accionable; rojo plumón #C8302E para inhábil/vencido; amarillo marcatextos #F2DC4A solo para hoy; verde #2F7A4B para hecho. Public Sans en texto, Barlow Semi Condensed en fechas, folios y títulos; cifras tabulares siempre. Estado del paso como marca en celda fija: ○ pendiente, ● hecho, tachado = no se solicita.

STORY: El contador entiende qué vence hoy y qué ya venció, cree que el sistema cuenta días hábiles como él, y entra al expediente a documentar el paso o registrar el pago.

FIRST VIEWPORT: Riel 232px izquierda (Vencimientos con contador rojo, Expedientes, Cuenta corriente; Configuración: Tipos de trámite, Calendario inhábil). Encabezado: "Vencimientos" + fecha larga; filtros y botón tinta "+ Nuevo expediente" a la derecha. Pestañas Vencidos/Esta semana/Próximos 15 días/Recurrentes. Tabla densa: marca, expediente (folio + partes), paso·etapa, vence, regla de días, estado. Leyenda abajo.

FORM: Agenda de despacho mexicana, candidato 4 de 7 de mi lista. Firma: la regla de días hábiles (tira de celdas-día con plazo notaría subrayado en tinta y plazo de ley circulado en rojo), reutilizada en bandeja, detalle de expediente y constructor (vista previa del plazo). seed:5c49b90e2205e6c2. Raises: cifras tabulares en columnas fijas (Datamatics); un módulo columna-día único (Crouwel); tinta solo en lo accionable (app cálida); estado como marca en celda fija (horario en diapositivas).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
