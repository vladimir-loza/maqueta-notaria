---
name: Notaría · Expedientes
description: Agenda de despacho para el seguimiento de trámites notariales, donde cada plazo se lee como se marca en la agenda del contador.
colors:
  vino: "#5e1f2b"
  vino-hondo: "#4a1822"
  vino-claro: "#d9bfc4"
  tinta: "#1d4fa3"
  tinta-hondo: "#163d80"
  tinta-clara: "#c9d8ee"
  plumon: "#c8302e"
  plumon-hondo: "#9e1f1d"
  plumon-claro: "#fbe3e2"
  marca: "#f2dc4a"
  marca-borde: "#c9ae10"
  marca-claro: "#fbf1bf"
  ocre: "#6b5600"
  verde: "#2f7a4b"
  verde-hondo: "#1f5b37"
  verde-claro: "#ddefe3"
  papel: "#f5f6f2"
  hoja: "#ffffff"
  celda: "#eef2f7"
  raya: "#d5deea"
  raya-suave: "#e8edf3"
  texto: "#1e2329"
  sub: "#56606b"
  fila: "#f8fafc"
  borde: "#c3ccd6"
  borde-fuerte: "#9aa8b8"
  apagado: "#a3adb8"
  plumon-borde: "#e4b3b2"
  plumon-trama: "#f7dada"
  vino-texto: "#f3e6e8"
  vino-etiqueta: "#c59aa2"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Public Sans, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "Barlow Semi Condensed, Public Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: "Barlow Semi Condensed, Public Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  fecha:
    fontFamily: "Barlow Semi Condensed, Public Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  cifra:
    fontFamily: "Barlow Semi Condensed, Public Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    fontFeature: "\"tnum\""
  regla:
    fontFamily: "Barlow Semi Condensed, Public Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  column-head:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  celda: "3px"
  sm: "4px"
  md: "6px"
  full: "9999px"
spacing:
  hueco: "2px"
  celda: "22px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  boton-primario:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.hoja}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  boton-primario-hover:
    backgroundColor: "{colors.tinta-hondo}"
  boton-secundario:
    backgroundColor: "{colors.hoja}"
    textColor: "{colors.texto}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  boton-secundario-hover:
    textColor: "{colors.tinta}"
  boton-fantasma:
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  boton-peligro:
    backgroundColor: "{colors.hoja}"
    textColor: "{colors.plumon-hondo}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  boton-peligro-hover:
    backgroundColor: "{colors.plumon-claro}"
  boton-chico:
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  entrada:
    backgroundColor: "{colors.hoja}"
    textColor: "{colors.texto}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  etiqueta-vencido:
    backgroundColor: "{colors.plumon-claro}"
    textColor: "{colors.plumon-hondo}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  etiqueta-hoy:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.ocre}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  etiqueta-a-tiempo:
    backgroundColor: "{colors.verde-claro}"
    textColor: "{colors.verde-hondo}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  etiqueta-neutra:
    backgroundColor: "{colors.celda}"
    textColor: "{colors.texto}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  celda-regla:
    backgroundColor: "{colors.celda}"
    typography: "{typography.regla}"
    rounded: "{rounded.celda}"
    width: "22px"
    height: "26px"
  celda-regla-hoy:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.texto}"
  celda-regla-corre:
    backgroundColor: "{colors.tinta-clara}"
    textColor: "{colors.tinta-hondo}"
  celda-regla-atraso:
    backgroundColor: "{colors.plumon-claro}"
    textColor: "{colors.plumon-hondo}"
  celda-regla-ley:
    backgroundColor: "{colors.hoja}"
    textColor: "{colors.plumon}"
    rounded: "{rounded.full}"
  riel:
    backgroundColor: "{colors.vino}"
    width: "232px"
  enlace-riel:
    textColor: "{colors.hoja}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  enlace-riel-hover:
    backgroundColor: "{colors.vino-hondo}"
  enlace-riel-activo:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.vino}"
---

# Design System: Notaría · Expedientes

## Overview

**Creative North Star: "La agenda de despacho"**

El sistema es la agenda de papel del contador de notaría pasada a pantalla: un riel vino como el lomo de la agenda, hojas blancas cuadradas sobre papel frío, hairlines azul pálido como el rayado del cuaderno, y cuatro instrumentos de escritura con un solo oficio cada uno. La tinta azul es lo que se puede tocar y el plazo propio de la notaría; el plumón rojo tacha lo inhábil, marca lo vencido y circula la fecha fatal de ley; el marcatextos amarillo es hoy; el verde es lo hecho. Ningún color decora.

La densidad es de jornada completa: tablas de 14px con cifras tabulares, filas de 12px de alto de relleno, sin tarjetas KPI ni insignias sueltas. La firma del sistema es la regla de días: una tira de celdas-día de módulo fijo que aparece igual en la bandeja de vencimientos, en el detalle del expediente y en la vista previa del constructor de trámites, de modo que un plazo se lee siempre en la misma geometría.

El estado de un paso no es una píldora de color sino una marca en celda fija, como en la agenda: círculo vacío pendiente, círculo lleno hecho, círculo tachado no se solicita.

**Key Characteristics:**
- Riel vino de 232px con el ítem activo en papel, como pestaña de agenda.
- Hojas blancas sin radio con hairline azul pálido; nada flota.
- Cuatro tintas con un solo significado cada una (tinta, plumón, marcatextos, verde).
- Barlow Semi Condensed para fechas, folios, títulos y cifras; Public Sans para todo lo demás; cifras tabulares en toda la app.
- La regla de días con módulo de 22px es el componente firma y se reutiliza sin variar su medida.

## Colors

Paleta de agenda: neutros fríos de papel rayado, un vino de encuadernación y cuatro tintas semánticas, cada una con tres pasos (claro, base, hondo).

### Primary
- **Tinta azul** (tinta): botones primarios, enlaces en hover, foco, cursor de texto y el subrayado del plazo de la notaría en la regla. Su paso hondo es el hover del primario; su paso claro pinta los días en que corre un plazo y los avisos informativos.

### Secondary
- **Vino de agenda** (vino): exclusivo del riel de navegación y del subrayado de la pestaña activa. Vino hondo es el hover dentro del riel; vino claro es el texto secundario y los contadores no urgentes del riel.

### Tertiary
- **Rojo plumón** (plumon): días inhábiles (rayado diagonal), fechas vencidas, el círculo de la fecha de ley o fecha límite, contadores de alerta. Plumón hondo es el texto sobre plumón claro (etiqueta vencido, aviso de error, saldo negativo, botón de peligro).
- **Amarillo marcatextos** (marca): el día de hoy en la regla y el calendario, con contorno marca-borde en la regla, y la selección de texto. Marca claro con texto ocre es la etiqueta "Hoy", el aviso de cambios sin guardar y el destello de llegada a un paso.
- **Verde hecho** (verde): el relleno de la marca "hecho". Verde hondo sobre verde claro es la etiqueta "A tiempo", el saldo a favor y los abonos.

### Neutral
- **Papel frío** (papel): fondo de la aplicación y fondo del ítem activo del riel.
- **Hoja** (hoja): superficie de tablas, listas, formularios y controles.
- **Celda** (celda): días hábiles sin plazo en la regla, etiqueta neutra, controles deshabilitados.
- **Raya** (raya): hairline de contenedores, encabezados de tabla y pestañas. **Raya suave** (raya-suave): separador entre filas.
- **Texto** (texto): texto principal. **Sub** (sub): etiquetas de campo, segundas líneas, encabezados de columna, marca pendiente.
- Los controles usan el trazo `borde` (#c3ccd6, `borde-fuerte` al pasar el cursor) y las filas clicables el hover `fila` (#f8fafc). El riel usa `vino-texto` y `vino-etiqueta`; el rayado inhábil, `plumon-trama`; la marca de «no se solicita», `apagado`.

### Named Rules
**The Una Tinta, Un Oficio Rule.** Cada tinta significa una sola cosa: azul es accionable o plazo de notaría, rojo es inhábil, vencido o fatal, amarillo es hoy, verde es hecho. Si un elemento no tiene ese significado, no lleva esa tinta.

**The Marcatextos Rule.** El amarillo sólido marca únicamente el día de hoy (y la selección de texto). Su versión clara se reserva para lo que pide atención ahora.

**The Vino Encuadernado Rule.** El vino vive en el riel y en la pestaña activa; nunca en botones, etiquetas ni datos.

## Typography

**Display Font:** Barlow Semi Condensed (con Public Sans, sans-serif)
**Body Font:** Public Sans (con system-ui, sans-serif)

**Character:** Barlow Semi Condensed es la letra del sello y la fecha: compacta, firme, cabe en una columna estrecha. Public Sans es la letra del formulario oficial: neutra y legible durante toda la jornada. Toda la app usa cifras tabulares, de modo que fechas y montos alinean en columna.

### Hierarchy
- **Display** (700, 30px, interlineado 1): el título de página en el encabezado, seguido de un subtítulo en Public Sans 15px gris (la fecha larga en Vencimientos).
- **Headline** (700, 20px): títulos de sección y de etapa ("1. Apertura", "Movimientos"), numerados cuando hay orden.
- **Title** (600, 15px): folio y tipo de trámite en tablas, subtítulos de etapa en formularios.
- **Fecha** (600, 16px): la fecha de vencimiento en su columna; en plumón cuando ya venció.
- **Cifra** (600, 20px): montos del resumen de saldo.
- **Regla** (600, 11px): números de día dentro de las celdas y la inicial del día en el encabezado de la regla.
- **Body** (400, 14px): texto de tablas, controles y botones (los botones en 500).
- **Label** (500, 13px, sub): etiquetas de campo.
- **Caption** (400, 12px, sub): segundas líneas de fila, ayudas, leyenda de la regla. Párrafos de ayuda limitados a 60–70ch.
- **Column head** (600, 12px, 0.06em, mayúsculas, sub): encabezados de columna de tabla.

### Named Rules
**The Fecha Condensada Rule.** Fechas, folios, números de día, montos destacados y títulos van en Barlow Semi Condensed; frases y datos de lectura van en Public Sans.

**The Columna Fija Rule.** Las cifras son tabulares en toda la app (declarado en la raíz); no se desactiva en ningún componente.

## Layout

Rejilla de dos columnas en escritorio: riel fijo de 232px a la izquierda, a toda la altura y pegajoso, y área de trabajo fluida con 32px de margen lateral y 24px vertical. Por debajo de 768px el riel se convierte en barra superior con enlaces en fila desplazable y el margen baja a 16px.

El encabezado de página alinea título y subtítulo por la línea base a la izquierda, y filtros y acción primaria a la derecha, con 20px hasta el contenido. Debajo van las pestañas, pegadas a la tabla (la tabla omite su borde superior para continuar la línea de las pestañas). Las secciones se apilan con 20px de separación; las celdas de tabla usan 12px de relleno horizontal y 10 a 12px vertical, con 16px en los extremos.

Las tablas densas tienen ancho mínimo (720 a 900px) y desplazamiento horizontal propio; en móvil la bandeja de vencimientos cambia la tabla por una lista de filas apiladas con una regla más corta (11 días en lugar de 13). Las filas de paso del expediente pasan a una rejilla de cuatro columnas a partir de 1024px.

**The Módulo Día Rule.** Toda celda-día mide 22px de ancho con 2px de hueco, en cualquier regla de la app. La ventana se ajusta cambiando el número de días, nunca el tamaño de la celda.

## Elevation & Depth

Plano por completo. No hay sombras proyectadas: la profundidad viene del contraste papel frío / hoja blanca y de las hairlines raya. Las únicas sombras del código son trazos interiores que funcionan como marcas de pluma dentro de la regla: un subrayado interior de 4px en tinta para el vencimiento del plazo de notaría y un filete interior izquierdo de 3px en plumón cuando el plazo venció antes de la ventana visible. El foco es un contorno de 2px en tinta con 2px de separación; en los controles, borde tinta más un halo de 2px de tinta al 20%.

**The Hoja Plana Rule.** Las superficies no se elevan. Si algo necesita destacarse, se marca con una tinta, no con una sombra.

## Shapes

Las hojas son rectángulos sin radio: tablas, listas de pasos, resumen de saldo, formularios y estados vacíos (este último con borde discontinuo). Los controles y avisos llevan una esquina suave de 6px; las etiquetas de estado, 4px; las celdas-día, 3px. El círculo completo se reserva para la fecha de ley o fecha límite (círculo de plumón de 2px), los contadores del riel y la marca de estado.

**The Esquina Por Función Rule.** El radio indica qué se toca: hojas rectas, controles redondeados, y el círculo sólo para lo que en la agenda se circularía.

## Components

### Buttons
Sobrios y compactos, como sellos de oficina.
- **Shape:** esquina suave (6px), borde de 1px siempre presente, 36px de alto (28px en la variante chica, texto 13px), peso 500, icono opcional de 16px con 6px de separación.
- **Primario:** fondo tinta, texto blanco; hover a tinta hondo. Uno por encabezado.
- **Secundario (por defecto):** fondo hoja con trazo gris azulado; en hover el borde y el texto pasan a tinta.
- **Fantasma:** sin borde visible, texto tinta, hover con tinta clara al 50%. Acciones de fila ("Reabrir", "Marcar enviado", eliminar).
- **Peligro:** fondo hoja, texto plumón hondo, trazo rosado; hover plumón claro.
- **Transición:** sólo color, 150ms. Deshabilitado al 45% de opacidad.

### Chips
- **Etiqueta de estado:** bloque de 4px de radio, 12px seminegrita, siempre un par claro/hondo de la misma tinta: vencido (plumón), hoy (marcatextos/ocre), a tiempo (verde), neutro (celda) para "Mañana" o "N días".

### Cards / Containers
- **Corner Style:** sin radio.
- **Background:** hoja sobre papel.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** hairline raya en el perímetro, raya suave entre filas.
- **Internal Padding:** 16px en formularios y celdas de saldo; filas 12px vertical.

### Inputs / Fields
- **Style:** hoja con trazo gris azulado de 1px, 6px de radio, 36px de alto, 10px de relleno, texto 14px; etiqueta 13px gris arriba con 4px de separación, ayuda en 12px debajo.
- **Hover / Focus:** el trazo se oscurece en hover; en foco pasa a tinta con halo de tinta al 20%. El cursor de texto es tinta.
- **Disabled:** fondo celda.
- **Adjuntar archivo:** control propio con clip y texto tinta en lugar del selector nativo.

### Navigation
- **Riel:** fondo vino, marca del producto en Barlow 15px negrita en mayúsculas con 0.04em, y una línea de aclaración en Public Sans 12px vino claro. Enlaces 14px peso 500 con icono de trazo 1.75 a 16px, 6px de radio; hover vino hondo; activo en papel con texto vino, como pestaña de agenda. Contadores a la derecha: pastilla plumón con texto blanco para lo urgente, número vino claro para el resto. Grupo "Configuración" con rótulo de 11px en mayúsculas.
- **Pestañas:** texto 14px peso 500 sobre la hairline raya; la activa lleva subrayado vino de 3px y texto principal; el contador va en plumón cuando la pestaña es de alerta y tiene casos.

### Marca de estado
Celda fija de 16px a la izquierda de cada paso o vencimiento, dibujada en SVG: círculo de trazo sub para pendiente, círculo lleno verde para hecho, círculo gris claro atravesado por una diagonal para "no se solicita" (el nombre del paso además se tacha).

### Regla de días (componente firma)
Tira horizontal de celdas-día de 22 x 26px con 2px de hueco y el número de día abajo en Barlow 11px. Estados por prioridad: fecha de ley o fecha límite circulada en plumón sobre hoja; hoy en marcatextos con contorno marca-borde; inhábil con rayado diagonal de plumón; atraso en plumón claro; plazo corriendo en tinta clara; resto en celda. El vencimiento del plazo de notaría se subraya en tinta. Un plazo fuera de la ventana se anota a la derecha con flecha y fecha corta. Lleva encabezado opcional con la inicial del día (inhábiles en plumón) y una leyenda debajo de la tabla. Se expone a lectores de pantalla como imagen con un resumen textual de los plazos.

### Destello de llegada
Al abrir un paso desde la bandeja, la fila destella en marcatextos claro y se desvanece en 2.4s; se suprime con movimiento reducido.

## Do's and Don'ts

### Do:
- **Do** mostrar todo plazo con la regla de días, con el módulo de 22px y 2px de hueco.
- **Do** reservar tinta para lo accionable y el plazo de notaría, plumón para inhábil, vencido y fecha fatal, marcatextos para hoy y verde para hecho.
- **Do** escribir fechas, folios, días y montos en Barlow Semi Condensed con cifras tabulares.
- **Do** poner el contenido en hojas blancas sin radio con hairline raya sobre el fondo papel.
- **Do** indicar el estado de un paso con la marca en celda fija (pendiente, hecho, no se solicita) y una etiqueta clara/honda sólo en la columna de estado.
- **Do** mantener un único botón primario tinta por encabezado.

### Don't:
- **Don't** usar tarjetas KPI, paneles de métricas ni insignias de color sueltas fuera de la columna de estado.
- **Don't** proyectar sombras para elevar superficies; las sombras interiores de la regla son marcas, no profundidad.
- **Don't** usar el vino fuera del riel y de la pestaña activa.
- **Don't** pintar con amarillo sólido nada que no sea el día de hoy.
- **Don't** cambiar el tamaño de la celda-día para encajar una ventana; se cambia el número de días.
