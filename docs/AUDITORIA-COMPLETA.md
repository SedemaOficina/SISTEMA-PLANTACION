# Auditoría completa del proyecto

12-10-2026 · versión 0.9.61. Alcance: todo el proyecto, la carpeta local y el repositorio: organización de
archivos, código sin uso, persistencia, reglas, conexiones, rapidez en teléfono y computadora, diseño,
experiencia de uso, textos, botones, avisos y tipografía. Complementa `docs/AUDITORIA-INTEGRAL-APP.md`
(seguridad, integridad, accesibilidad, rendimiento y cobertura), que no se repite aquí.

Lo que no cambia la pantalla se corrigió sobre la marcha. Lo que sí la cambia queda en la sección 3 como
propuesta, con su antes y después, para aprobarse antes de programarlo.

## 1. Método

- Un recorrido automático por 50 pantallas: las 14 vistas con los cuatro perfiles, la ficha de una jornada,
  en teléfono (390 px) y en computadora (1,280 px), con 17,800 árboles de demostración. En cada una se midió
  la tipografía real de cada texto, las áreas de toque, los textos cortados, el desborde horizontal y el
  inventario de botones, y se tomó una captura para la revisión visual.
- Los 2,018 textos de la interfaz (literales del código y del HTML), revisados con el diccionario español de
  México de LibreOffice (Hunspell), y comparados entre sí para los términos.
- Los 96 avisos flotantes del código, con su tono.
- Análisis del código: identificadores del HTML, iconos, parámetros, índices de la base del teléfono y claves
  de `localStorage` sin uso; acciones de permiso definidas contra usadas; escrituras en la base sin permiso;
  referencias de las reglas documentadas contra el código.
- La carpeta local y el historial de git.

## 2. Hallazgos y estado

### Organización de archivos

| # | Hallazgo | Estado |
|---|---|---|
| 1 | El repositorio local nunca se había compactado: 1,282 objetos sueltos, 37 MB. | **Corregido**: `git gc`, 5 MB; la verificación de integridad, sin errores. |
| 2 | El árbol de archivos del README no tenía cuatro documentos de `docs/`, `datos/HUELLA-CAPAS.json` ni `pruebas/servir.py`, y describía `servidor/` como de hace varias fases. | **Corregido**. |
| 3 | «Cómo abrirlo» recomendaba `http.server`, que en Windows rechaza conexiones; la sección de pruebas ya decía `servir.py`. | **Corregido**. |

Lo que vive sólo en la carpeta local está bien fuera de git: `originales/` (22 MB), `historial/`,
`servidor/local/`, `servidor/node_modules/` y `pruebas/__pycache__/`. `_to_delete/` está vacía.

### Código sin uso

| # | Hallazgo | Estado |
|---|---|---|
| 4 | Una limpieza heredada borraba al abrir la fecha del respaldo que se retiró hace semanas; sólo la tenían teléfonos de prueba viejos, y tenía su propia prueba. | **Corregido**: quitadas las dos. |
| 5 | 46 títulos de sección de las pruebas decían «BLOQUE n:» en mayúsculas: la limpieza anterior sólo buscaba «Bloque». | **Corregido**. |

Sin uso, ninguno: los 37 iconos, 529 de 533 identificadores del HTML (los otros cuatro los usan las pruebas
para ubicarse), los 43 parámetros de `config.js`, los índices que quedan en la base del teléfono y las claves
de `localStorage`.

### Persistencia, reglas y conexiones

| # | Hallazgo | Estado |
|---|---|---|
| 6 | Dos reglas documentadas en `datos/esquema.json` apuntaban a funciones que ya no existen (`nuevoRegistro`, `refrescarVista`). | **Corregido**, con el diccionario y el SQL regenerados. |
| 7 | `esquema.json` y un comentario de `sesion.js` todavía decían que el acceso lo daría un proveedor institucional y que el aviso de privacidad estaba pendiente; se decidieron cuentas propias y que el aviso no se requiere (D249, D250). | **Corregido** en lo que no se ve; lo que se ve, en las propuestas 5 y 6. |
| 8 | Las fotografías viajan dentro del registro del árbol, y cada lista lee todos los registros. Con un año de trabajo de un cabo (unos 6,000 árboles con foto: entre 300 y 600 MB, según la foto) el teléfono cargaría todo eso en memoria en cada lista. | **Recomendación para la fase 4**: fotografías en un almacén aparte y lo ya confirmado por el servidor depurado del teléfono (S-11). |

Revisado y bien: las 15 acciones de permiso están definidas y se usan todas, y una acción desconocida se
niega; toda escritura en la base la protege un permiso, en su función o en la que la llama; los índices de la
base son los que se consultan; las conexiones (sin señal, envío, versión nueva, mapa caído) tienen sus
pruebas y pasan.

### Pruebas

| # | Hallazgo | Estado |
|---|---|---|
| 9 | Una comprobación de Supervisión en computadora dependía del día: abría en «Semana» y, un lunes sin jornadas cerradas todavía, no había tablas que revisar y la prueba se detenía. | **Corregido**: elige «Todo», como las demás pruebas de Supervisión. |

### Rapidez

Medida en la auditoría anterior: con la app instalada abre en 0.5 a 0.6 s en un teléfono de gama baja
simulado, las listas en 1 s o menos con 17,800 árboles, sin desborde horizontal en ninguna de las 50
pantallas. La primera carga depende de que el servidor del SIA comprima los archivos (traspaso, § 4).

### Diseño, textos, botones, avisos y tipografía

Revisado y bien:
- **Ortografía**: de 1,413 palabras distintas, las que el diccionario no reconoce son nombres propios, términos
  técnicos o imperativos correctos («Ciérrela», «descártelo»). El trato es de usted en todo el sistema.
- **Avisos**: 96, todos con su punto final; el tono corresponde al contenido (13 alertas, 30 avisos, 35 de
  éxito, 16 sólo para lector de pantalla).
- **Botones**: ninguna pantalla tiene más de una acción principal a la vista.
- **Tipografía**: dos familias (Cabin en títulos, Roboto en el texto) y una escala de seis tamaños con nombre.

Lo que no está bien va en las propuestas.

## 3. Propuestas (cambian la pantalla: se aprueban antes)

Liber aprobó las 12 el 12-10-2026; quedaron hechas en la versión 0.9.62 (bloque 203, D284). En la 1, la
pastilla de conexión ya respondía en 48 px; se sumaron la × de las fichas de filtro (28 px), la × de las
ventanas, «Deshacer», los botones del punto en el mapa y los enlaces de las tablas de Supervisión. El selector
«Resultados por página» crece a 44 px también a la vista: un selector no admite un área ampliada.

| # | Qué | Antes | Después |
|---|---|---|---|
| 1 | Áreas de toque de 44 px | La pastilla de conexión y los encabezados que ordenan las tablas miden 32 px; la paginación, la × de los avisos, «Filtros», los saltos de la ficha (Mapa · Conciliación · Puntos) y los programas frecuentes, 40 px. El proyecto pide 48 (`--toque`). | 44 px como mínimo, ampliando el área que responde al toque sin cambiar cómo se ven. |
| 2 | El pie en la versión real | «Sistema de Registro de Plantaciones. Versión 0.9.61 (Bloque 202)» | Con datos de prueba, igual; en la versión real, sin «(Bloque …)». |
| 3 | «Teléfono» y «dispositivo» | Mezclados para lo mismo: la franja dice «guardado en este dispositivo» y la guía sin señal, «este teléfono». | «Teléfono» en lo que ve el cabo; «este equipo» en Configuración, donde entra desde computadora. |
| 4 | Iconos en dos acciones | «Colocar punto» y «Filtros» son las únicas acciones sin icono. | Con su icono, como las demás. |
| 5 | Aviso del acceso de prueba | En rojo: «La verificación real corresponde al proveedor institucional en la siguiente fase». | En ámbar (es una advertencia, no un error): «Con el servidor, cada cuenta entra con su correo y su contraseña». |
| 6 | Mensaje de la versión real sin servidor | «El acceso institucional todavía no está conectado…» | «El acceso con el servidor todavía no está conectado…» (una prueba exige el texto de hoy: se cambia con ella). |
| 7 | Historial del árbol | «Territorio rederivado:» | «Territorio recalculado:» |
| 8 | Datos de la jornada en su ficha | Un solo renglón: día · cabo · alcaldía · prioridad · estado · quién la solicita. | Dos renglones: día y cabo; alcaldía, prioridad, estado y quién la solicita. |
| 9 | Créditos del mapa en computadora | Ocupan tres renglones sobre la imagen. | Plegados en uno, como en el teléfono, y completos al tocarlos. |
| 10 | Interlineados | Siete distintos (1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.6). | Tres: 1 para símbolos, 1.2 para títulos y controles, 1.5 para texto. Diferencias de uno o dos pixeles. |
| 11 | Texto de código | `<code>` usa la monoespaciada del navegador. | La del proyecto, como el folio. |
| 12 | Tamaño de página para Administración | Las listas abren de 10 en 10: Registros, con todo el sistema, son 1,793 páginas. | Abrir de 25 en 25 en computadora (en el teléfono, 10). |

## 4. Lo que esta auditoría no cubre

- El servidor (`servidor/`): se revisa al terminar sus fases 2 a 4.
- Teléfonos reales, VoiceOver y TalkBack: todo se midió en Chromium.
- Los PDF y el Excel se revisaron en `docs/REVISION-ARCHIVOS.md`; aquí no se repitieron.
