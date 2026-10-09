# Auditoría integral de la aplicación

08-10-2026 · versión 0.9.58 · alcance: la aplicación (`index.html`, `js/`, `css/`, `sw.js`, `assets/`,
`herramientas/`, `pruebas/`) y los documentos de traspaso. El servidor (`servidor/`) se audita al terminar
sus fases 2 a 4 (`docs/ALINEACION-SIA.md`), para no auditar código que se va a reescribir.

Se corrigió sobre la marcha todo lo que no cambia pantallas ni decisiones. Este documento deja constancia
de qué se revisó, con qué, qué se encontró y en qué estado queda.

## 1. Resultado

| Frente | Referencia | Hallazgos | Corregidos | Para el SIA | Aceptados |
|---|---|---|---|---|---|
| Seguridad y datos personales | OWASP ASVS 4.0, nivel 1 (lo que aplica a una aplicación sin servidor) | 2 | 0 | 2 | 0 |
| Integridad de los datos | — | 1 | 1 | 0 | 0 |
| Accesibilidad y uso en campo | WCAG 2.2, nivel AA | 2 | 1 | 0 | 1 |
| Código, rendimiento y traspaso | — | 5 | 4 | 1 | 0 |

Ningún hallazgo crítico. Todos los de severidad alta y media que dependían del proyecto están corregidos;
los que quedan dependen del servidor web del SIA y están en `docs/FASE2-Y-TRASPASO.md`, § 4.

## 2. Hallazgos

| # | Severidad | Frente | Hallazgo | Estado |
|---|---|---|---|---|
| 1 | Alta | Integridad | Sin `crypto.randomUUID` (iPhone con iOS anterior a 15.4) los registros nacían con identificadores `id-…` hechos con `Math.random`: el servidor guarda `uuid` y los rechazaría al sincronizar, y dos teléfonos podían repetir uno. | **Corregido**: UUID v4 con `crypto.getRandomValues` (`js/util.js`, `generarId`). |
| 2 | Media | Accesibilidad | En los mapas fijos (Revise antes de guardar y detalle del árbol) el marcador se podía enfocar con el teclado, sin nombre, dentro de un contenedor declarado imagen que además tenía un enlace (WCAG 4.1.2; axe `aria-command-name`, `nested-interactive`). | **Corregido**: el marcador de un mapa fijo no es interactivo y el contenedor es un grupo con su etiqueta (`js/mapa.js`, `index.html`). |
| 3 | Media | Seguridad | La política de contenido va en una etiqueta `<meta>`, que no admite `frame-ancestors`: nada impide meter la aplicación en un marco de otro sitio (secuestro de clics). Faltan además las cabeceras de transporte y de tipo. | **Para el SIA**: cabeceras del servidor web en `docs/FASE2-Y-TRASPASO.md`, § 4. |
| 4 | Media | Rendimiento | Sin compresión del servidor web la primera carga baja 6.6 MB en vez de 1.7 MB (las capas son texto); en 4G lenta, unas cuatro veces más tiempo. | **Para el SIA**: compresión y caché en `docs/FASE2-Y-TRASPASO.md`, § 4. |
| 5 | Baja | Traspaso | El service worker atendía todo lo del mismo sitio; cuando la API viva en `/api/srp`, sus peticiones pasarían por él. | **Corregido**: la API va directo a la red (`sw.js`). |
| 6 | Baja | Traspaso | `docs/FASE2-Y-TRASPASO.md` decía que el servidor carga sus propias capas, contra la alineación con `territorio` (D277). | **Corregido**. |
| 7 | Baja | Código | El texto del periodo de los filtros estaba escrito tres veces (Registros, Jornadas, Fotografías) y el reinicio de filtros de Registros repetía paso a paso al de «Quitar filtros». | **Corregido**: `SRP.util.textoPeriodo`; el reinicio llama al otro. Duplicación final: 0 %. |
| 8 | Baja | Código | La medición de cobertura encontró cuatro funciones que nada llama y que el análisis del bloque 198 no vio, porque viven dentro de objetos que se arman al vuelo: `fijarDia` (zona de filtros), `etiqueta` (folio), `contar` y `resumen` (colonias prioritarias). | **Corregido**: quitadas. |
| 9 | Baja | Accesibilidad | En el mapa de la jornada, dos puntos muy juntos se enciman y su área tocable baja de 24 px (WCAG 2.5.8). | **Aceptado**: aplica la excepción «equivalente» de la norma; la lista de puntos bajo el mapa hace lo mismo con renglones grandes. |
| 10 | Informativo | Datos personales | Las teselas del mapa base se piden al proveedor (Esri; CARTO en producción): el proveedor sabe qué zona se ve, como en cualquier mapa en línea. No se le envía de qué página viene la petición (`no-referrer`) ni dato alguno del registro. | Sin acción; los términos de uso de cada proveedor se confirman antes de operar (§ 4 del traspaso). |
| 11 | Informativo | Seguridad | En la versión de prueba el acceso es simulado y los permisos los aplica el teléfono. Es por diseño: con `ES_FICTICIO: false` el acceso queda cerrado hasta conectar el servidor, que es quien verifica la contraseña e impone los permisos (Norma 7.1). | Fases 3 y 4 del servidor. |
| 12 | Informativo | Traspaso | El catálogo de especies trae una nota de discrepancia redactada en segunda persona; viene así del Excel del SIA y la aplicación la copia sin editarla. | Se corrige en el Excel de origen, si el SIA lo decide. |

## 3. Lo que se revisó y está bien

**Seguridad y datos personales**
- Los 190 lugares donde el código escribe HTML se analizaron con el árbol de sintaxis: todo dato capturado
  pasa por `escapar`; lo demás son constantes, números o iconos. Los avisos usan `textContent`.
- Política de contenido estricta: sólo código del propio sitio, sin scripts ni estilos en línea, imágenes
  del sitio, de datos incrustados y del mapa base; `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`.
- Repositorio e historial completo de git: sin llaves, contraseñas, direcciones internas, correos reales ni
  archivos originales; `originales/` y lo local del servidor, fuera de git.
- Fotografías: se vuelven a codificar en un lienzo antes de guardarse, así que no conservan los datos de la
  cámara (incluida la ubicación). Sólo se aceptan como `data:image/…` válidas al mostrarlas.
- `localStorage` sólo guarda preferencias y la sesión de prueba; la tabla para Excel no deja pasar fórmulas.
- El código no escribe en la consola; los errores inesperados se avisan en pantalla.

**Integridad de los datos**
- Cada cambio se escribe junto con su renglón de bitácora en una sola transacción.
- Fechas locales en todo lo que se compara («hoy» nunca sale de una hora UTC).
- Dos pestañas abiertas con versiones distintas: la vieja suelta la base y pide recargar; la nueva avisa si
  queda esperando. Se pide almacenamiento persistente para que el sistema no borre la base.

**Accesibilidad** (axe-core 4.10, reglas WCAG 2.0, 2.1 y 2.2 A y AA, más buenas prácticas)
- 14 pantallas con los cuatro perfiles (Administración, cabo, coordinación, directivo), en teléfono y en
  computadora, con 17,800 árboles de demostración, más la ficha de una jornada y el detalle de un árbol de
  cada perfil: sin fallas, salvo el hallazgo 9.
- Las 16 ventanas: sin fallas (tres avisos de botones vacíos son de abrirlas sin su código, que los llena).
- Contraste: sin fallas, también en el modo sol.

**Código**
- Código sin uso: el análisis del bloque 198 más la cobertura (hallazgo 8); eslint y pyflakes sin avisos.
- Duplicación (jscpd, 5 renglones o 50 fichas como mínimo): 0 % después del hallazgo 7.

## 4. Mediciones de rendimiento

Teléfono simulado: pantalla de 390 px, procesador 4 veces (gama media) y 6 veces (gama baja) más lento que
el equipo de prueba. Datos de demostración: 1,356 jornadas, 17,819 árboles y 739 fotografías.

| Medida | Gama media | Gama baja |
|---|---|---|
| Abrir la app ya instalada | 0.5 s | 0.6 s |
| Abrir sin señal | 0.2 s | 0.3 s |
| Registros (lista) | 0.6 s | 1.0 s |
| Jornadas (lista) | 0.5 s | 0.5 s |
| Fotografías | 0.5 s | 0.7 s |
| Ficha de una jornada | 1.0 s | 1.2 s |

- Primera carga, que instala la app: 1.7 MB con compresión (unos 9 s en 4G lenta, 2 a 3 s en 4G normal);
  6.6 MB sin ella (hallazgo 4).
- Memoria de JavaScript con todos los datos de demostración: 117 MB. Espacio en el teléfono: 47 MB.

## 5. Cobertura de las pruebas

Se midió con el perfilador de V8 (cobertura por bloques) durante una corrida completa de `pruebas/prueba.py`,
tomando la cobertura de cada página antes de cada navegación y de cada cierre.

- **98.6 % de los renglones de código de `js/`** se ejecutan en las pruebas (11,021 de 11,174, sin contar
  comentarios ni renglones en blanco). 17 de los 37 archivos, al 100 %.
- Lo que no corre son, sobre todo, caminos de error del navegador (la base que no abre, una transacción que
  aborta, una imagen que no carga), varios «Deshacer» de avisos y la búsqueda dentro de Fotografías. Ninguno
  es un flujo principal.
- La medición frena la ejecución y su sesión de depuración interfiere con la emulación de «sin señal» de
  Playwright al recargar: con ella fallan 6 comprobaciones de ese modo. Sin medición, la misma prueba pasa
  completa (1,425 de 1,425).

| Archivo | Cobertura | Lo que no corre |
|---|---|---|
| `js/filtros.js` | 85.5 % | Quitar una ficha y «Deshacer» en Fotografías |
| `js/conexion.js` | 89.9 % | Aplicar la versión nueva sin recargar a mano |
| `js/folio.js` | 93.3 % | (la función sin uso, ya quitada) |
| `js/prioritarias.js` | 95.8 % | (las funciones sin uso, ya quitadas) |
| `js/croquis.js` | 95.9 % | Croquis sin imagen de satélite |
| `js/formulario.js` | 96.6 % | «Deshacer» y el resaltado de la búsqueda de especies |
| Los demás | 97.6 a 100 % | Caminos de error del navegador |


## 6. Lo que esta auditoría no cubre

- El servidor (`servidor/`): se audita al terminar sus fases, con las mismas herramientas más pruebas de
  permisos ejecutando como la cuenta del servicio.
- Teléfonos reales: todo se midió en Chromium con teléfono simulado. Falta un recorrido en un iPhone y en un
  Android de gama baja, con VoiceOver y TalkBack.
- Pruebas de penetración: no aplican mientras no haya servidor; se recomiendan sobre el servidor del SIA antes
  de operar.
- Lighthouse no se pudo correr (no es compatible con la versión de Node.js del equipo); sus frentes se
  cubrieron con axe-core y con las mediciones de la sección 4.
