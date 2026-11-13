# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Solo frontend: Vite + React 19 + TypeScript + Tailwind CSS. Estado con zustand, persistido en localStorage y reiniciable a datos semilla. Sin backend en v1, pero relativamente funcional (crear, editar y avanzar de verdad).

## Users

Personal de una notaría pública mexicana, trabajando en escritorio durante la jornada.

- **Contador (usuario principal)**: registra y documenta cada expediente etapa por etapa: qué se solicitó, qué se recibió, qué se pagó, qué costos se cargarán al cliente, qué plazo corre. También configura los tipos de trámite y sus etapas.
- **Proyectistas / oficiales**: llevan cada expediente día a día. Abren el expediente, cotejan el checklist documental, solicitan trámites previos (certificados, avalúos, denominación, testamento, edictos), vigilan plazos y mueven el caso de etapa en etapa.
- **Notario titular**: supervisa el estado general de los expedientes, los vencimientos, los cierres de escritura y el cumplimiento PLD.
- **Contabilidad / caja**: registra anticipos, gastos a terceros, impuestos enterados y honorarios en la cuenta corriente de cada expediente; emite facturas de retención y complementos antes del cierre de mes.

El cliente final (compareciente) no usa el sistema.

## Product Purpose

Sistema de documentación y seguimiento de trámites notariales con **etapas dinámicas**. No está orientado a un trámite concreto: el usuario crea tipos de trámite, define sus etapas conforme el trámite lo requiera y parametriza cada una. Cada etapa contiene pasos de tipo: solicitar un documento, realizar un pago, esperar un tiempo, o tarea. En cada etapa la notaría registra costos y pagos que después se cobran al cliente. Un expediente se instancia desde la plantilla de su tipo de trámite y se documenta paso a paso.

La escrituración (ver Operating Context) es el **caso de referencia y dato semilla**, no lógica en código. Nada específico de escrituración (ISR, traslado, PLD, nombres de etapas) va fijo en código; todo debe poder expresarse como configuración.

v1 es un **prototipo / demo** para validar el modelo funcional con una notaría cliente. Éxito: el notario y su equipo recorren un expediente simulado de punta a punta y confirman que el sistema refleja su operación real (etapas, plazos, bloqueos, cuenta corriente, alertas), o señalan con precisión dónde no.

## Positioning

Un motor de pipelines configurable por la propia notaría: el tipo de trámite define el camino completo del expediente: etapas y requisitos configurables con selector "Solicita Sí/No", doble plazo (SLA interno de la notaría vs. plazo de ley), reglas que bloquean el cierre si los impuestos no están pagados y declarados, cuenta corriente por expediente y alertas PLD transversales. No es un gestor documental ni un sistema contable genérico: modela el flujo procesal notarial mexicano.

## Operating Context

Caso de referencia, escrituración (fuente: diagrama y modelo funcional). Sirve para probar que el motor genérico lo puede expresar y para sembrar datos de ejemplo:

1. **Motor de configuración**: tipo de acto → plantilla de etapas → requisitos configurables (información, archivos con Solicita Sí/No, costos/aranceles).
2. **Apertura y validación documental**: apertura de expediente, recepción de anticipo, apertura de Expediente Único (PLD), checklist: INE, actas (nacimiento, matrimonio, defunción), CURP, CSF actualizada, comprobante de domicilio, escritura o título antecedente, predial, agua, copias certificadas del juicio.
3. **Trámites previos (SLA interno vs. ley)**: certificado de libertad de gravamen (notaría 1d / ley 3 días hábiles), avalúo fiscal/comercial (1d / 3d), denominación (1d / 5d, constitutivas), certificado de testamento (1d, JSI/JST), pago y publicación de edictos (JSI/JST), redacción de acta de asamblea.
4. **Dictamen y firma**: plazo máximo desde apertura: compraventa/donación ≤ 1 semana; protocolizaciones 2 semanas primera escritura, 1 mes segunda (espera de edictos); constitutivas/asambleas y otros ≤ 1.5 semanas.
5. **Gestión fiscal**: cálculo y pago de ISR (ley 15 días hábiles), IVA cuando el acto lo genere, declaración y pago enterado, factura de retención + complemento notarial (persona física que enajena).
6. **Traslado de dominio y catastro**: pago de revisión (ley 3 días hábiles), impresión (predial y catastro), regreso del traslado sellado (≤ 10 días hábiles; semáforo preventivo día 7, crítico día 10).
7. **Control de cierre**: ¿impuestos pagados y declarados? No → bloqueo de avance. Sí → cerrar escritura.
8. **Inscripción registral y entrega**: formas precodificadas (constitutivas, asambleas), escritura enviada al registro (ordinario/urgente), alerta a los 7 días naturales para llamar al gestor, aviso de uso de denominación (constitutivas), entrega del testimonio con acuse.

**Transversal PLD**: monitoreo de ventas acumuladas por sociedades (alerta al rebasar $900,000.00 MXN); aviso de actividades vulnerables con fecha límite fatal el día 17 de cada mes.

**Cierre de mes**: factura de retención por cada entero de ISR/IVA y complemento notarial antes del último día hábil.

**Cuenta corriente**: Saldo cliente = Total anticipos − (Gastos a terceros + Impuestos enterados + Honorarios).

## Capabilities and Constraints

- CRUD de tipos de trámite; cada uno con etapas ordenadas creadas por el usuario; cada etapa con pasos (documento, pago, espera, tarea), costos estimados y aranceles.
- Todo paso admite "Solicita Sí/No" (se puede omitir por expediente).
- Datos de apertura configurables por trámite (texto, monto, lista de opciones, Sí/No). Cada paso puede llevar condiciones sobre esos datos: solo entra al expediente si se cumplen (p. ej. «Acto: Compraventa o Donación», «¿Genera IVA?: Sí»).
- Reglas de acumulado por trámite: suman un monto entre expedientes que comparten un dato y avisan cada vez que el total rebasa otro múltiplo del umbral (p. ej. ventas de una sociedad > $900,000 para PLD).
- Estructura viva: un expediente abierto puede recibir etapas y pasos propios, sin tocar la plantilla; todo queda en la bitácora.
- Plazos por paso en días hábiles o naturales, con origen configurable (apertura, inicio de etapa, otro paso); doble plazo notaría/ley con semáforo.
- Pasos de pago y costos alimentan la cuenta corriente del expediente.
- Alertas derivadas de pasos con tiempo o fecha límite (preventiva y vencida), en una vista central y en el expediente.
- Reglas del caso de referencia (bloqueo de cierre sin impuestos, alerta de gestor a 7 días, regreso de traslado 7/10, PLD $900,000, día 17, cierre de mes) deben poder modelarse como configuración: dependencias/bloqueos entre pasos, plazos y alertas recurrentes. No como código específico.
- Datos simulados; sin autenticación, roles reales ni integración con SAT, RPP o catastro en v1.
- Idioma de interfaz: español de México; montos en MXN.
- **Sin decidir**: calendario de días inhábiles (festivos oficiales y vacaciones de la notaría) para el cálculo de días hábiles; si v1 distingue vistas por rol.

## Brand Commitments

Sin marca ni nombre de producto aún. No usar el nombre de una notaría real.

## Evidence on Hand

Fuentes de producto fuera del repo (carpeta padre `archivo Zip/`):

- `modelo_funcional.md` (y `Modelo_Funcional_Gestion_Expedientes_Notariales.docx`): especificación funcional.
- `pasos_escrituración.md` (y `.docx`): pasos del trámite en palabras de la notaría.
- `Diagrama Flujo.png`: flujo de 8 bloques + PLD transversal.

No existen testimonios, clientes, métricas ni capturas reales. No inventarlos. Los datos semilla son ficticios y deben verse plausibles.

## Product Principles

1. **Configuración, no código.** Etapas, pasos, documentos, plazos y costos salen de plantillas que crea el usuario. Escrituración es un ejemplo, no el producto.
2. **El plazo siempre visible.** Cada paso pendiente muestra cuánto falta contra la notaría y contra la ley.
3. **Las reglas bloquean, no sugieren.** Cierre sin impuestos pagados es imposible, y el sistema dice por qué.
4. **El dinero cuadra por expediente.** Cada movimiento cae en la cuenta corriente y el saldo se explica solo.
5. **Validar, no impresionar.** La demo debe ser fiel al trabajo real para que la notaría pueda corregir el modelo.

## Accessibility & Inclusion

Sin requisito específico establecido. Uso prolongado en escritorio por personal administrativo: legibilidad de tablas, fechas y montos es prioritaria.
