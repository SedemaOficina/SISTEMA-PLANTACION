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

- El servidor (`servidor/`): sus guiones y su acceso se revisan en la sección 5; el resto, al terminar sus fases 2 a 4.
- Teléfonos reales, VoiceOver y TalkBack: todo se midió en Chromium y, desde la sección 5, también en WebKit.
- Los PDF y el Excel se revisaron en `docs/REVISION-ARCHIVOS.md`; aquí no se repitieron.

## 5. Antes del servidor: navegadores, pruebas, servidor y librerías (bloque 204)

12-10-2026 · versión 0.9.63. Liber pidió dejar todo limpio y probado antes de la fase 2 del servidor. Se
cubrió lo que las auditorías anteriores dejaron fuera a propósito.

### Otros navegadores

| # | Hallazgo | Estado |
|---|---|---|
| 10 | Todo se había probado sólo en Chromium. | **Hecho**: la prueba elige el motor con `SRP_MOTOR` (`webkit` es el de Safari). En WebKit, 57 secciones independientes pasan completas: 523 comprobaciones, 0 fallas, después de corregir la prueba del hallazgo 12. |
| 11 | El WebKit de Playwright para Windows no es Safari del iPhone: no tiene campo de fecha (lo trata como texto) ni `overscroll-behavior`, y se cae al recargar sin red con el service worker. Por eso la suite completa no corre en él de principio a fin. | **Límite de la herramienta**: en WebKit se bloquea el service worker y lo de sin señal se prueba en Chromium. La prueba en un Safari real queda en M170 (GitHub Actions con macOS) y M46. |
| 12 | Una prueba dependía del orden en que el navegador avisa que se salió de un campo: Safari reparte el par de coordenadas al salir de Latitud, antes que Chromium. | **Corregido** en la prueba; en el uso real (escribir el par y tocar «Colocar punto») las dos funcionan igual. |
| 13 | Escribir de golpe los 17,800 árboles de demostración tardó 11 minutos en WebKit y 2 segundos en Chromium. Leerlos, 167 ms contra 142; abrir Registros, 0.4 s contra 0.3; Jornadas, 0.9 s contra 0.2. | **Para la fase 4**: lo que baje del servidor a un teléfono se escribe por partes, y se mide en un iPhone real antes de darlo por bueno. El uso diario (un árbol a la vez, leer listas) no se afecta. |
| 14 | El código no usa nada que Safari no tenga: fechas en formato ISO, sin «lookbehind» en expresiones regulares, y lo reciente con su alternativa. La hoja pide iOS 15.4 o posterior (`<dialog>`, `:has()`); en iOS 15 el crédito del mapa usa el ancho de la pantalla. | Revisado y bien. |
| 15 | Firefox no abre en este equipo: le falta una biblioteca de Microsoft (Visual C++). | No se instaló: cambia el sistema. Firefox casi no se usa en teléfonos. |

### Pruebas confiables

| # | Hallazgo | Estado |
|---|---|---|
| 16 | Las pruebas esperaban tiempos fijos después de abrir la app; en un navegador más lento o un equipo ocupado se adelantaban. | **Corregido**: la app marca `data-listo` al terminar de arrancar (también si se detiene por un error) y la prueba espera esa marca en cada carga y recarga. |
| 17 | Una prueba que depende del día solo se descubre el día en que falla. | **Hecho**: `SRP_HOY=AAAA-MM-DD` corre la prueba como si fuera ese día, en Python y en el navegador. Corrida completa como si fuera el lunes 1 de enero de 2029 (inicio de semana, de mes y de año a la vez): salieron diez comprobaciones que dependían del día —años escritos a mano, «Este año» con árboles de ayer o de agosto, Supervisión vacía un 1 de enero—, una del peso de un PDF y una espera fija. **Corregidas**: calculan lo esperado con la fecha del día. En esa fecha pasa la suite completa hasta el mapa de prioridad y, de ahí al final, sus 26 secciones por separado. |

### Servidor actual

| # | Hallazgo | Estado |
|---|---|---|
| 18 | **Bloqueo por intentos burlable.** El contador de intentos fallidos se leía y se escribía en dos pasos: ocho contraseñas mandadas al mismo tiempo se probaban todas y la cuenta no se bloqueaba. | **Corregido**: cada intento se anota en la base, en un solo paso, antes de verificar la contraseña. Prueba nueva: de ocho simultáneos se verifican tres (el máximo de la prueba) y cinco encuentran la cuenta bloqueada; con el código anterior la prueba falla. |
| 19 | La contraseña temporal repartía las letras con un pequeño sesgo (el residuo de un byte). | **Corregido**: `crypto.randomInt`, parejo entre las 31 letras. |
| 20 | Guiones SQL: permisos mínimos de `srp_api`, bitácora que sólo crece, funciones sin permiso público, instalación en una sola transacción. | Revisado y bien; 22 pruebas del servidor, 0 fallas. |

Para las fases 2 a 4, sin cambio hoy:
- **Índices del servidor** para las consultas de Supervisión (`cabo_id` y `fecha_plantacion` de los árboles, `fecha` de las jornadas): se agregan cuando existan las consultas, como `indices_servidor` en el esquema, porque `indices` es también lo que tiene el teléfono.
- **Límite por equipo** en `/acceso/entrar`, además del bloqueo por cuenta, para que no se pruebe una contraseña en muchas cuentas: con el formato de acceso del SIA (fase 3).
- Una cuenta bloqueada responde distinto de una que no existe: así se sabe que el correo tiene cuenta. El SIA pidió a otro proyecto lo mismo que su módulo `acceso`: un único 401 para toda entrada fallida. **Hecho** en el bloque 206 (`docs/ALINEACION-SIA.md`, 6.1).
- El cuerpo de las peticiones admite 100 KB: la recepción con fotografías (fase 4) necesitará más.
- Express tiene una versión menor nueva (5.3.0): se sube al empaquetar en la fase 2.

### Librerías y migraciones

| # | Hallazgo | Estado |
|---|---|---|
| 21 | Dos versiones de `vendor/` estaban «por confirmar». | **Corregido**: Leaflet Gesture Handling 1.2.2 (idéntico byte a byte al publicado) y Turf 6.x (el código incluido es el mismo de la 6.2 a la 6.5), anotadas en `vendor/LICENCIAS.md`. Leaflet, jsPDF y AutoTable están en su última versión; el servidor, sin avisos de seguridad. |
| 22 | La imagen del encabezado del teléfono se descargaba también en computadora (precarga sin condición). | **Corregido**: la precarga sólo en pantallas de teléfono. |
| 23 | Migraciones de la base del teléfono. | Revisado y bien: cada una, de la 2 a la 9, tiene su prueba desde la anterior, y otra sube de la 2 a la 9 de un jalón. La base real nace en la 9: ningún dato real pasa por las viejas. |
