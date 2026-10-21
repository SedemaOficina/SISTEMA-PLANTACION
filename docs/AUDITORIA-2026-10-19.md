# Auditoría del Sistema de Registro de Plantaciones

19-10-2026 · **versión 1**, commit `84747a9`, rama `main`, sin cambios sin guardar · alcance aprobado por el
dueño: las auditorías de cada cambio, de cada versión, de entrega y de datos reales, más «Intentar romperlo»,
el respaldo, la coherencia de los documentos y las pantallas nuevas desde el 12-10-2026.

Auditoría independiente y de sólo lectura: no se corrigió nada. Todas las pruebas que escriben corrieron en
copias fuera del proyecto. Las únicas escrituras en el proyecto son este informe y su carpeta
`docs/evidencia-2026-10-19/`.

---

## 1. Veredicto

| Etapa | Veredicto | Por qué |
|---|---|---|
| En cada cambio | **No lista** | La prueba completa de la aplicación no terminó en tres corridas (A1-01) y la revisión de presentación está atrasada (A1-04). Las demás suites dan 0 fallas |
| En cada versión | **No lista** | 2 hallazgos Críticos y 6 Altos abiertos |
| Antes de usar datos reales | **No lista** | La seguridad está bien (0 Críticos y 0 Altos de seguridad), pero la integridad no: dos Críticos de la cola de envío pierden o atoran cambios del teléfono (E3-R1-01, E3-R1-02). Falta decidir el plazo de conservación de los datos personales y la constancia del aviso de privacidad |
| Antes de entregar al SIA | **Lista con reservas** | El paquete está completo, sus sumas cuadran y se instala en limpio; el respaldo se restaura entero. Reservas: los Críticos de arriba, el ensayo de instalación lo hizo quien escribió el instructivo (falta otra persona) y no dice cómo revertir |
| Documentos que van a firma | No aplica | El reporte de jornada se firma, pero no cita leyes ni normas |
| Antes de operar | **No lista** | Teléfonos reales, prueba con el personal, carga concurrente y piloto: sin hacer (es lo esperado en esta etapa) |

## 2. Resumen ejecutivo

El sistema está bien construido en lo que más se suele romper. El control de acceso del servidor resistió unas
320 peticiones alteradas a mano, sin una sola escalada. No hay secretos, contraseñas ni datos reales en los 88
commits del repositorio. Las cifras de Supervisión cuadran exactas con un recálculo propio en la base, en 7
combinaciones de periodo e institución. En el barrido de pantallas se revisaron 297 pantallas y 2,083 botones,
en 7 tamaños y con los 4 perfiles, sin desbordes, sin botones muertos y sin violaciones de la política de
seguridad. El flujo principal funciona igual en el motor de Safari. El respaldo de la base se restaura entero,
y uno alterado se detecta.

Los problemas están en **la cola de envío del teléfono y en la concurrencia**, dos zonas que se construyeron
después de la última auditoría completa:

- **Dos Críticos.** Un cambio hecho sin señal puede quedarse para siempre sin llegar al servidor mientras la
  aplicación dice «Al día». Pasa con una corrección que no cambia nada seguida de otro cambio, y con dos
  pestañas abiertas, donde además se pierde un árbol.
- **Seis Altos:**
  - una fotografía se pierde si algo en el camino responde «200» sin ser el servicio;
  - un árbol queda atorado si alguien elimina su jornada en el servidor;
  - una fecha con el año de dos cifras se guarda como el año 26;
  - dos cargas masivas iguales al mismo tiempo duplican el histórico;
  - dos Administraciones pueden desactivarse una a la otra al mismo tiempo y dejar el sistema sin ninguna;
  - la prueba completa de la aplicación ya no termina, por depender de esperas de tiempo fijo.

Todos los Críticos y Altos se reprodujeron dos veces, en el entorno del auditor. Ninguno se ve en el uso de
una sola persona con buena señal. Por eso no los atraparon las pruebas, y por eso conviene corregirlos antes
del piloto.

Totales: **2 Críticos · 6 Altos · 16 Medios · 34 Bajos · 14 Informativos · 1 No confirmado.**

## 3. Cobertura

Estado: Hecha · En parte · No hecha · No aplica. Calificación del 1 al 5: 5 es completa y sin Críticos ni
Altos. «H» suma los hallazgos por gravedad (C/A/M/B/I).

| Código | Auditoría | Estado | Cómo se hizo | H (C/A/M/B/I) | Cal. | Qué faltó |
|---|---|---|---|---|---|---|
| A1 | Pruebas y regresión | Hecha | Las 7 suites del proyecto, dos veces, sobre una copia. Cobertura del servidor medida por primera vez: 97.8 % de renglones, 80.5 % de ramas y 93.3 % de funciones. Las secciones que fallaron se corrieron aisladas 2 veces cada una | 0/1/1/0/1 | 2 | Las suites no corren solas: no hay gancho ni verificación automática (pendiente M170) |
| A2 | Integridad de datos | En parte | Huella de capas contra la regenerada; capa propia y catálogos contra su fuente | 0/0/0/0/1 | 4 | No hay sumas de control registradas de cada archivo de datos |
| A3 | Construcción reproducible | Hecha | Todo lo generado (4 capas, especies, diccionario, `js/esquema.js`, SQL, huella, copia real y el servidor compilado), construido dos veces desde cero y comparado contra lo publicado | 0/0/0/1/1 | 4 | — |
| A4 | Calidad estática | Hecha | ESLint en 61 archivos (reglas base y variables sin definir), revisión de tipos con y sin variables sin uso, pyflakes | 0/0/0/1/1 | 5 | — |
| A5 | Consistencia automática | Hecha | `auditoria.py`: 144 comprobaciones, 0 hallazgos | 0/0/0/0/0 | 4 | Que corra sola (M170) |
| A6 | Estilos y contraste | Hecha | `auditoria_css.py` sin hallazgos; contraste medido de cada marcador y cada nivel de la capa sobre los dos mapas base | 0/0/0/1/1 | 4 | — |
| B1 | Barrido de pantallas | Hecha | Guion nuevo: modo prueba, 4 perfiles, 7 tamaños (360, 390, 430, horizontal, tableta, 1440, zoom 200 %), 189 pantallas y 973 botones presionados uno por uno; modo real, 4 perfiles en teléfono y escritorio, 108 pantallas y 1,110 botones | 0/0/0/1/0 | 5 | — |
| B2 | Coherencia de cifras | Hecha | Recálculo propio en SQL, sin el código de la aplicación, contra Supervisión en modo real: 7 combinaciones, dos veces, todas iguales | 0/0/0/0/0 | 4 | Recalcular por separado el PDF y el CSV (salen del mismo cálculo que la pantalla) |
| B3 | Archivos que genera | Hecha | Revisor 2: PDF, CSV, Excel y ZIP con textos raros y volumen (informe «Todo» de 87 páginas en 2.1 s) | 0/0/2/4/2 | 3 | — |
| B4 | Accesibilidad | En parte | axe-core 4.10 (WCAG 2.2 A y AA) en cada pantalla de los 4 perfiles, en los dos modos, y en las 19 ventanas | 0/0/1/2/0 | 3 | Teclado de principio a fin, simulación de daltonismo y lector de pantalla (no hay en el equipo) |
| B5 | Robustez ante errores | Hecha | Revisores 1, 2 y 3: datos dañados, archivos que no llegan, servidor que responde mal, inyección | 0/1/2/3/1 | 2 | — |
| B6 | Sin conexión y continuidad | Hecha | Revisor 1, en modo real: cortes a la mitad, sesión vencida, dos pestañas, reloj, sin espacio | 2/0/3/5/0 | 1 | Horizontal en equipo real |
| B7 | Terceros | Hecha | Barrido: un solo dominio externo, el del mapa base (Esri), ya aceptado el 08-10-2026 | 0/0/0/0/0 | 5 | — |
| B8 | Navegadores y fechas | En parte | Flujo principal en modo real en Chromium y WebKit, 2 de 2 cada uno; reloj y zona horaria (revisor 1) | 0/0/1/0/0 | 3 | Firefox: no abre en el equipo |
| B9 | Seguridad del despliegue | En parte | Pasada del barrido con la política de seguridad real: 0 violaciones en 2,083 botones | 0/0/0/0/0 | 3 | Un servidor web local configurado como el del SIA |
| C1 | Tareas del personal | En parte | Pantallas nuevas en teléfono con la Administración, con la carga de cada una | 0/0/0/1/0 | 3 | La ficha formal de una pregunta por pantalla, con el personal |
| C2 | UX heurística | En parte | Revisores 1 y 4: flujos reales con varias personas | 0/0/0/2/1 | 3 | Las 10 heurísticas pantalla por pantalla |
| C3 | Carga de la interfaz | Hecha | Palabras, botones, campos y alto de cada pantalla nueva | 0/0/0/1/0 | 4 | — |
| C4 | Matriz de estados | En parte | Revisores 1 y 4: «Atrás», recarga, dos pestañas, dos personas | 0/0/1/2/0 | 3 | La matriz sistemática de filtros y vistas |
| C5 | Textos | En parte | Revisores 2 y 4 y el barrido | 0/0/0/1/1 | 4 | Inventario completo de los textos nuevos desde el 12-10-2026 |
| C6 | Sistema visual | Hecha | Capturas de las pantallas nuevas contra el sistema de botones | 0/0/0/0/0 | 5 | — |
| D1 | Coherencia documental | Hecha | Pendientes, decisiones, plan de traspaso, alineación, README y mejoras, contra el código y entre sí | 0/0/3/2/0 | 3 | — |
| D2 | Modelo de datos | No hecha | Hecha el 03-10-2026; sin cambios de fondo después | — | — | — |
| D3 | Datos de referencia | No hecha | Hecha el 05-10-2026; la huella se regeneró igual (A3) | — | — | — |
| D4 | Peso y velocidad | En parte | Las dos pantallas más largas, con procesador 4 veces más lento: 0.1 a 0.6 s | 0/0/0/0/0 | 3 | La red 3G y el presupuesto del dueño |
| D5 | Validación del método | No aplica | El SRP no calcula la prioridad: la toma de una capa de otro proyecto | — | — | — |
| E1 | Seguridad y datos personales | Hecha | Historial completo de git; control de acceso, ruta por perfil (revisor 3); sesiones, fuerza bruta, enumeración, cookies, archivos, inyección | 0/0/0/3/3 | 4 | El plazo de conservación (pendiente ya registrado) |
| E2 | Integridad y respaldo | Hecha | Respaldo real con `pg_dump`; uno alterado falla sin dejar nada; el bueno se restaura con las 23 tablas iguales, los 7 disparadores y los permisos | 0/0/0/0/1 | 5 | — |
| E3 | Intentar romperlo | Hecha | 4 revisores independientes, con listas de ataques y cada hallazgo repetido dos veces: captura en campo, datos raros y archivos, servidor, administración y concurrencia | 2/4/11/21/9 | 1 | — |
| F1 | Limpieza | En parte | ESLint, tipos y pyflakes (A4); herramienta atrasada (A1-04); documentos atrasados (D1) | 0/0/1/1/0 | 3 | La cobertura del navegador en modo real |
| F2 | Revisión de código | En parte | Lectura de la cola de envío, la sesión, las peticiones y las pantallas que arman HTML | 0/1/0/0/0 | 3 | La aplicación entera, por bloques |
| F3 | Dependencias y licencias | Hecha | `npm audit` del servidor (211 dependencias); versiones y licencias de `vendor/` | 0/0/0/0/1 | 5 | — |
| F4 | Control del paquete | Hecha | El ZIP: 113 entradas, 0 archivos de trabajo, 112 de 112 sumas, suma del ZIP | 0/0/0/1/0 | 4 | — |
| F5 | Ensayo de instalación | En parte | Hecho el 17-10-2026 (18 de 18); restauración probada aquí (E2) | 0/0/0/1/0 | 3 | Que lo haga otra persona; validar el servidor web con su herramienta |
| F6 | Revisión del receptor | En parte | Lo que el SIA pidió a todo paquete está atendido (`docs/ALINEACION-SIA.md` § 6) | — | 3 | El SIA aún no revisa la versión 1 |
| G1 | Cotejo normativo | No aplica | Nada cita leyes ni normas | — | — | — |
| G2 | Componentes compartidos | En parte | Un caso, corregido por el SIA | 0/0/0/1/0 | 3 | Un registro propio y fijo |
| H1 a H7 | Operación | No hecha | Requieren el sistema instalado y personas reales; se dejan guías (anexo) | — | — | — |

Un hallazgo de «Intentar romperlo» (E3) se cuenta también en la auditoría que toca (B3, B5, B6, C…): por eso
la columna H no suma los totales de la sección 5.

## 4. Las 10 de mayor prioridad

Prioridad = impacto × probabilidad ÷ esfuerzo (S: hasta 2 horas, M: hasta 1 día, L: más).

| # | Clave | Gravedad | Esfuerzo | Qué |
|---|---|---|---|---|
| 1 | E3-R1-01 | Crítica | S | Una corrección que no cambia nada atora para siempre el cambio siguiente; la pastilla dice «Al día» |
| 2 | E3-R1-02 | Crítica | M | Con dos pestañas se pierde un árbol y el cierre y el reporte no llegan |
| 3 | E3-R4-03 | Alta | M | Árbol atorado para siempre si se eliminó su jornada en el servidor |
| 4 | E3-R2-01 | Alta | S | El año de dos cifras (y cualquier año absurdo) se acepta |
| 5 | F2-01 | Alta | S | La fotografía se pierde si un «200» ajeno contesta la subida |
| 6 | E3-R1-04 | Media | S | Con la aplicación abierta de un día para otro, el árbol queda con la fecha de ayer |
| 7 | E3-R4-01 | Alta | M | Dos cargas masivas iguales al mismo tiempo duplican el histórico |
| 8 | E3-R4-02 | Alta | S | El sistema puede quedar sin ninguna Administración global activa |
| 9 | E3-R3-01 | Media | S | Una fecha imposible tira toda una tanda de la carga con error interno |
| 10 | A1-01 | Alta | M | La prueba completa de la aplicación ya no termina |

## 5. Hallazgos

Totales por gravedad: **Crítica 2 · Alta 6 · Media 16 · Baja 34 · Informativa 14** (y 1 No confirmado, en la
sección 10).

Por auditoría: E3 47 (2 C, 4 A, 11 M, 21 B, 9 I) · A1 3 · A3 2 · A4 2 · A6 2 · B1 1 · B4 3 · C3 1 · D1 5 · E1 1 ·
F2 1 · F3 1 · F4 1 · F5 1 · G2 1.

Las claves `E3-R1` a `E3-R4` son de los cuatro revisores independientes. Su informe completo, con los guiones
y las capturas, está en el informe aparte, fuera del repositorio (sección 15). Todos los Críticos y Altos los
reprodujo además el auditor, en su propio entorno, como se dice en cada uno.

### 5.1 Críticos

#### E3-R1-01 · Crítica · Una corrección sin cambios atora para siempre el cambio siguiente del mismo registro
- **Prioridad, esfuerzo:** 1 · S. **Auditoría y etapa:** E3, B6 · antes de usar datos reales.
- **Dónde:** modo real, cabo, teléfono; `js/cola.js:86-90`, `:119`, `:140-152`; `js/envio.js:76-90`.
- **Qué pasa:** sin señal, una corrección que al final deja todo igual (abrir «Corregir» y guardar sin tocar,
  o cambiar el nombre de la jornada y regresarlo) seguida de otro cambio del mismo registro (eliminar el
  árbol, cerrar la jornada). Al volver la señal, el segundo cambio no sale nunca.
  - Esperado: llega al servidor.
  - Observado: se queda en la cola «sin versión» para siempre; no hay franja ni aviso y la pastilla dice «Con
    conexión · Al día».
- **Consecuencia:** el teléfono asegura que todo se envió, pero el servidor dice otra cosa:
  - el árbol eliminado sigue contando como plantado;
  - la jornada cerrada y reportada sigue abierta, sin reporte, y no cuenta en Supervisión.
- **Cómo se reproduce:**
  1. Cabo, jornada y un árbol, con señal.
  2. Quitar la señal.
  3. Corregir el árbol y guardar sin cambios.
  4. Eliminar el árbol.
  5. Devolver la señal y «Enviar ahora».
- **Evidencia:**
  - `verificar_criticas.py`, V4: cola `['registro.eliminar (sin versión)']`, pastilla «Con conexión · Al día»,
    el árbol `activo` en el servidor;
  - el revisor 1 lo vio también con la jornada.
- **Reproducido:** revisor 2 de 2 (árbol) y 2 de 2 (jornada); auditor 2 de 2.
- **Causa probable:** una edición sin cambios da `null` en `datos()` y se borra como «sobra», sin pasar su
  versión a la operación que sigue. Ésta nació sin versión porque había otra antes, y lo que no tiene versión
  espera para siempre. La pastilla sólo cuenta árboles.
- **Corrección propuesta:**
  - al quitar una operación que ya no tiene qué enviar, pasar su versión a la siguiente del mismo registro;
  - al arrancar, darle la versión del registro a una operación sin versión cuya anterior ya no existe;
  - que la pastilla y la franja cuenten toda operación pendiente y avisen de la que lleva tiempo sin salir.
- **Listo cuando:** una prueba en `prueba_conexion.py` hace la secuencia sin señal y, con señal, el árbol queda
  eliminado en el servidor y la cola vacía.
- **Estado:** Corregido en el bloque 236 (1.0.1): la corrección vacía también viaja y su respuesta trae la versión. `verificar_criticas.py`, V4, después: la eliminación llega y la cola queda vacía, 2 de 2. Prueba permanente en `prueba_conexion.py`.

#### E3-R1-02 · Crítica · Con dos pestañas de la misma cuenta se pierde un árbol y el cierre y el reporte no llegan
- **Prioridad, esfuerzo:** 2 · M. **Auditoría y etapa:** E3, B6 · antes de usar datos reales.
- **Dónde:** modo real, cabo, dos pestañas del mismo navegador; `js/cola.js` (`this.ops` en memoria, `limpiar`).
- **Qué pasa:**
  1. Sin señal, la pestaña B registra un árbol en la jornada abierta.
  2. La pestaña A cierra la jornada y entrega el reporte.
  3. Vuelve la señal.
  - Esperado: llega todo.
  - Observado: el árbol de B desaparece del teléfono y nunca llega al servidor.
- **Consecuencia:** pérdida de un árbol capturado en campo, sin aviso. Abrir la aplicación instalada y además
  una pestaña del navegador basta para que pase.
- **Cómo se reproduce:** como arriba, con dos pestañas de la misma cuenta.
- **Evidencia:** `verificar_criticas.py`, V5: el árbol de B no está en el servidor ni en el teléfono; en la
  memoria de B queda su `registro.crear`, que ya no tiene registro que enviar.
- **Reproducido:** revisor 4 de 4; auditor 2 de 2.
- **Causa probable:** cada pestaña guarda su propia copia de la cola en memoria y decide sola qué borrar del
  teléfono (`limpiar`), sin ver lo que espera en la otra.
- **Corrección propuesta:** una cola sola por teléfono:
  - que cada pestaña lea la cola de la base del teléfono antes de limpiar, y no de su memoria;
  - o que sólo una pestaña a la vez pueda capturar (Web Locks o BroadcastChannel), con un aviso en la otra.
- **Listo cuando:** la prueba de dos pestañas de `prueba_conexion.py` registra en B sin señal, cierra en A, y el
  árbol llega.
- **Estado:** Corregido en el bloque 236 (1.0.1): una pestaña a la vez (decisión del dueño, 19-10-2026), y la limpieza y el envío leen la cola del almacén. `verificar_criticas.py`, V5, después: el árbol de la pestaña B, el cierre y el reporte llegan, 2 de 2. Pruebas permanentes en `prueba_conexion.py`.

### 5.2 Altos

#### E3-R4-03 · Alta · Un árbol en una jornada eliminada en el servidor queda atorado para siempre, sin aviso
- **Prioridad, esfuerzo:** 3 · M. **Auditoría y etapa:** E3 · antes de usar datos reales.
- **Dónde:** `js/cola.js:163` (`JORNADA_PENDIENTE` se espera siempre); `servidor/src/modulos/srp/recepcion-arboles.ts:94`.
- **Qué pasa:** el cabo inicia una jornada (llega vacía); la coordinación o la Administración la elimina en el
  servidor; el cabo sigue registrando en ella. El servidor responde «la jornada todavía no está» y la cola
  espera para siempre.
  - Esperado: avisarle al cabo y ofrecerle qué hacer.
  - Observado: «por enviar» indefinidamente, sin franja, sin «Revisar».
- **Consecuencia:** el árbol sólo vive en ese teléfono; si se pierde el teléfono, se pierde. Eliminar jornadas
  vacías es una limpieza normal de la coordinación.
- **Evidencia:** `verificar_altas.py`, V1: respuestas `['JORNADA_PENDIENTE']`, sin rechazo a la vista, el
  árbol no llega.
- **Reproducido:** revisor 2 de 2; auditor 2 de 2.
- **Corrección propuesta:**
  - en el servidor, distinguir «la jornada se eliminó» (por ejemplo `JORNADA_ELIMINADA`);
  - en la aplicación, tratarlo como rechazo en «Revisar», con «moverlo a otra jornada» o «descartarlo»;
  - opcional: no dejar eliminar una jornada abierta con capturas recientes de su cabo.
- **Listo cuando:** la prueba lleva el árbol a «Revisar» con su motivo y, al moverlo, llega.
- **Estado:** Corregido en el bloque 236 (1.0.1): `JORNADA_ELIMINADA`, y el árbol va a «Revisar» con «Pasar a otra jornada». `verificar_altas.py`, V1, después: rechazo a la vista y franja, 2 de 2. Pruebas permanentes en `prueba_conexion.py` y `servidor/pruebas/recepcion.test.js`.

#### E3-R2-01 · Alta · El año de dos cifras (y cualquier año absurdo) se acepta y distorsiona Supervisión
- **Prioridad, esfuerzo:** 4 · S. **Auditoría y etapa:** E3, B5 · cada versión.
- **Dónde:**
  - los campos de fecha de jornada, edición y árbol;
  - la carga masiva;
  - el servidor (`recepcion-apoyo.ts:76`, sólo revisa «no posterior a hoy»);
  - `js/indicadores.js:25` (los años 0-99 se convierten en 1900-1999).
- **Qué pasa:**
  - Teclear «19/10/26» deja la fecha 0026-10-19, sin aviso; igual con 1026, 1900 y 0001.
  - El servidor la guarda y le da folio.
  - Mi avance «Todo» pasa a 2,001 años y su informe, de 2 a 59 páginas, con renglones que no suman el total.
- **Consecuencia:** un error de tecleo común deja fechas falsas en el servidor y cifras que no cuadran.
- **Evidencia:** el campo de fecha no tiene mínimo. El auditor inició jornadas con 0026-10-19 y 1900-01-01: las
  dos se aceptaron y el servidor las guardó.
- **Reproducido:** revisor 2 de 2 en prueba, 1 de 1 en real; servidor 2 de 2; auditor 2 de 2.
- **Corrección propuesta:**
  - una fecha mínima (por ejemplo 01-01-2000, o un parámetro) en el atributo `min`, en la validación y en el
    servidor;
  - un aviso ante una fecha de hace más de un año;
  - `setFullYear` en `aFecha`.
- **Listo cuando:** una prueba teclea 19/10/26 y la aplicación la rechaza con su mensaje; el servidor rechaza
  0026 con error de campo.
- **Estado:** Corregido en el bloque 237 (1.0.2): nada antes del 01-OCT-2024, cuando empezó el programa (decisión del dueño, 19-10-2026), en la pantalla, la carga masiva y el servidor, y en campo un aviso para lo de hace más de 30 días. Pruebas permanentes en `prueba_conexion.py`, `servidor/pruebas/recepcion.test.js` y `cargas.test.js`.

#### F2-01 · Alta · La fotografía se pierde si una respuesta «200» que no es del servicio contesta la subida
- **Prioridad, esfuerzo:** 5 · S. **Auditoría y etapa:** F2 · antes de usar datos reales.
- **Dónde:** `js/cola.js:219-220` (cualquier respuesta correcta da la foto por subida); `js/servidor.js:39-40`
  (acepta un 2xx aunque el cuerpo no sea la respuesta del servicio).
- **Qué pasa:** si algo entre el teléfono y el servicio responde 200 a la subida (un intermediario, una página
  de mantenimiento, un portal de red), la operación de la fotografía sale de la cola. Al cerrar y reportar la
  jornada, el árbol sale del teléfono y la fotografía con él.
  - Esperado: la fotografía se queda hasta que el servicio confirme.
  - Observado: no está en el servidor (que la espera) ni en el teléfono.
- **Consecuencia:** pérdida de la fotografía, sin aviso. Probabilidad baja, pero la pérdida no se recupera. La
  misma causa hace que las acciones de la Administración parezcan aplicadas sin estarlo, sin pérdida de datos:
  la siguiente carga enseña lo real.
- **Evidencia:** `foto_falso_ok.py`, con la subida interceptada para responder 200 con una página. La cola
  queda vacía; el servidor no tiene la fotografía y el árbol del servidor la espera; al reportar, el árbol ya
  no está en el teléfono.
- **Reproducido:** auditor 2 de 2.
- **Corrección propuesta:**
  - dar por buena sólo la respuesta que trae el sello del servicio (un JSON con el id de la fotografía, o una
    cabecera propia);
  - en `servidor.js`, tratar un 2xx sin JSON del servicio como «sin respuesta del servicio».
- **Listo cuando:** la misma prueba deja la fotografía en la cola y, sin intercepción, llega.
- **Estado:** Corregido en el bloque 236 (1.0.1): sólo la confirmación del servicio, con el id de la fotografía, la saca de la cola. `foto_falso_ok_despues.py`: con el «200» ajeno la fotografía se queda en la cola y llega cuando contesta el servicio, 2 de 2. Prueba permanente en `prueba_conexion.py`.

#### E3-R4-01 · Alta · Dos cargas masivas iguales al mismo tiempo duplican el histórico
- **Prioridad, esfuerzo:** 7 · M. **Auditoría y etapa:** E3 · antes de usar datos reales.
- **Dónde:** `servidor/src/modulos/srp/cargas.ts:213-234`: la huella de «ya está en el sistema» no ve los lotes
  que todavía se suben.
- **Qué pasa:** dos lotes con el mismo archivo, intercalados (dos Administraciones, o dos pestañas), se
  completan los dos.
  - Esperado: el segundo detecta los árboles como «ya está en el sistema».
  - Observado: cada árbol queda dos veces, con dos folios.
- **Consecuencia:** cifras del histórico infladas y que no lo marca nada; se corrige con «Deshacer carga» si
  alguien lo nota.
- **Evidencia:** `verificar_altas.py`, V3: «árboles en la base: 6 (esperado 3)».
- **Reproducido:** revisor 2 de 2; auditor 2 de 2.
- **Corrección propuesta:** al completar un lote, volver a revisar la huella contra lo ya visible, dentro de un
  bloqueo, y rechazar o marcar lo repetido.
- **Listo cuando:** la prueba de dos lotes intercalados deja 3 árboles y el segundo lote dice «ya estaban».
- **Estado:** Corregido en el bloque 238 (1.0.3): una carga a la vez, y la revisión al completar. Liber: habrá una sola carga, de hasta 5,000 árboles. Pruebas permanentes en `servidor/pruebas/cargas.test.js` y `prueba_conexion.py`.

#### E3-R4-02 · Alta · El sistema puede quedar sin ninguna Administración global activa
- **Prioridad, esfuerzo:** 8 · S. **Auditoría y etapa:** E3 · antes de usar datos reales.
- **Dónde:** `servidor/src/modulos/srp/cuentas.ts:92`, `:278`, `:295`: sólo se protege la cuenta propia.
- **Qué pasa:** dos Administraciones que se desactivan (o se quitan el perfil) una a la otra al mismo tiempo
  quedan fuera las dos. Una por una no pasa, porque nadie puede desactivarse a sí mismo.
- **Consecuencia:** nadie puede administrar desde la aplicación; se recupera sólo con SQL. La probabilidad es
  baja (hace falta hacerlo en el mismo instante), pero el impacto es total.
- **Evidencia:** `verificar_altas.py`, V2: 5 de 8 con peticiones simultáneas.
- **Reproducido:** revisor 2 de 8 y 2 de 6; auditor 5 de 8.
- **Corrección propuesta:** antes de desactivar, eliminar o quitar el perfil de Administración a cualquier
  cuenta, comprobar en la misma transacción, con bloqueo, que queda al menos otra activa.
- **Listo cuando:** la prueba simultánea deja siempre al menos una activa.
- **Estado:** Corregido en el bloque 238 (1.0.3): la última Administración global activa no se desactiva, no se elimina ni deja de serlo, con candado. Prueba permanente en `servidor/pruebas/acceso.test.js`: dos que se desactivan, y dos que se quitan el perfil, al mismo tiempo.

#### A1-01 · Alta · La prueba completa de la aplicación ya no termina
- **Prioridad, esfuerzo:** 10 · M. **Auditoría y etapa:** A1 · cada cambio.
- **Dónde:** `pruebas/prueba.py`: 1,643 esperas de tiempo fijo contra 60 esperas por condición.
- **Qué pasa:** en 3 corridas sobre el mismo commit se detuvo en 3 puntos distintos:
  - a los 953 s;
  - a los 1,861 s, con 2 fallas;
  - a los 248 s, con la fecha del 17-10 simulada.

  El 17-10-2026 pasó 0 de 1,441. Las secciones de Jornadas y del mapa pasan aisladas 2 de 2. La de filtros se
  detiene aislada, pero la pantalla, revisada a mano, tiene exactamente lo que la prueba espera. Cargar la
  demostración tardó 7.2 s y 22.8 s en dos vueltas seguidas.
- **Consecuencia:** sin una red de pruebas que termine no se puede certificar una versión. La falla es de la
  prueba, no del sistema.
- **Reproducido:** 4 de 4 sin terminar, contando la corrida final: se detuvo a los 437 s, en otra sección.
- **Corrección propuesta:**
  - cambiar las esperas fijas por esperas a una condición, empezando por las secciones que se detuvieron;
  - partir la suite en tramos que se puedan correr por separado.
- **Listo cuando:** dos corridas seguidas, en dos equipos, terminan con el mismo resultado.
- **Estado:** Abierto.

### 5.3 Medios

| Clave | Dónde | Qué pasa | Reproducido | Corrección propuesta |
|---|---|---|---|---|
| E3-R1-03 | `js/cola.js:79`, `js/rechazos.js:86-87` | Si la señal se corta después de que el servidor recibió una corrección, la siguiente corrección se rechaza con un falso «se cambió desde otro teléfono» | 2 de 2 | Al reconocer una respuesta perdida, tomar la versión que el servidor ya tiene |
| E3-R1-04 | `js/jornada-activa.js:111-115`, `:291-292` | Con la aplicación abierta de un día para otro, el árbol de la mañana queda con la fecha de ayer, con el campo de fecha oculto | 2 de 2 | Volver a fijar la fecha al guardar si cambió el día |
| E3-R1-05 | `js/util.js:18-21` | Con el reloj o la zona del teléfono distintos de la Ciudad de México, las fechas se rechazan sin decir que es el reloj, o se aceptan falsas | 2 de 2 | Calcular «hoy» en la zona de la Ciudad y avisar si el reloj del teléfono no cuadra con el del servidor |
| E3-R2-02 | `js/reportes.js:695-698` | Un enlace largo en un comentario aplasta la columna «Especie» del reporte PDF | 3 de 3 | Ancho fijo para Especie y cortar las palabras largas |
| E3-R2-03 | `js/reportes.js:653-654` | En una «Solicitud especial» con textos largos, el recuadro de datos se sale por el pie de la página 1 | 4 de 4 | Partir el recuadro entre páginas |
| E3-R2-04 | `js/excel.js:85` | El CSV que guarda Excel en español (Windows-1252) se rechaza con «faltan columnas», que es engañoso | 2 de 2 | Detectar la codificación o decir que se guarde como «CSV UTF-8» |
| E3-R2-05 | `js/carga.js:48`; tope de 100 KB del servidor | Una tanda de 300 árboles en 300 jornadas distintas pesa 105 KB y el servidor la rechaza (413) | revisor 2 de 2; auditor 2 de 2 | Armar las tandas por tamaño, no sólo por número de árboles |
| E3-R2-06 | `servidor/db/srp/02-srp-tablas.sql:110-111, 136-137` | En Especies, un nombre científico de más de 140 caracteres o «otros nombres» de más de 400 dan un error interno, y el aviso queda detrás de la ventana | 2 de 2 | El mismo largo máximo en pantalla y servidor, con error de campo |
| E3-R3-01 | `recepcion-apoyo.ts:76` | Una fecha imposible con forma de fecha (mes 13, día 45) da error interno; en la carga masiva tira toda la tanda | revisor 2 de 2; auditor 2 de 2 | Que `esFecha` devuelva falso ante una fecha inválida |
| E3-R4-04 | `cuentas.ts` y `catalogos.ts` (PUT) | Dos Administraciones editando la misma cuenta o el mismo valor de catálogo: gana la última, sin aviso, y se pierde el cambio de la otra | 2 de 2 (cuentas y catálogos) | Versión del registro, como en árboles y jornadas, o mandar sólo los campos cambiados |
| E3-R4-05 | `js/sesion.js`, `js/almacen.js` | Al cerrar sesión y entrar otra cuenta en el mismo equipo, lo no enviado de la primera queda varado y legible en el almacén; la pastilla de la segunda dice «Al día» | 2 de 2 | Avisar al cerrar sesión si hay pendientes, y no dejar entrar otra cuenta mientras haya pendientes ajenos |
| A1-04 | `pruebas/revisar.py` | La revisión de presentación quedó atrasada desde que «Iniciar jornada» pide ubicación: no llega a Nuevo registro y sus 8 avisos de «el mapa mide 0 px» son falsos. No se corre en la verificación de los bloques | 2 de 2 | Ubicar la jornada como lo hace la prueba de conexión, o sustituirla por el barrido de esta auditoría |
| B4-03 | Posibles duplicados, mapas de cada pareja | axe «nested-interactive» (serio): el mapa fijo de cada pareja repite el problema que se corrigió en los otros mapas el 08-10-2026 | 2 de 2 (teléfono y escritorio) | El marcador del mapa fijo no interactivo y el contenedor como grupo con su etiqueta, como en los demás |
| D1-01 | `docs/DECISIONES.md`, encabezado | De 18 «[pendiente]», unos 12 ya se resolvieron: folio, duplicados, cola, fotografías como archivos, colonias, claves UGA, módulo anterior, doble conteo y mapa base | — | Marcarlos como resueltos con su decisión |
| D1-02 | Cuatro documentos | El aviso de privacidad tiene cuatro estados: «pospuesto» (DECISIONES:140), «consultado; no se requiere» (D249), «ya no aplica» (FASE2 § 4) y «en la lista de lo que falta antes de operar» (REVISION-SERVIDOR #12). No hay constancia | — | Decidir (sección 8) y dejar uno solo, con su constancia |
| D1-03 | `docs/PLAN-TRASPASO-SIA.md` § 5 | Dice que faltan «el servicio» y «el paquete de instalación», que ya están hechos en la versión 1 | — | Ponerlo al día |

### 5.4 Bajos

| Clave | Qué pasa | Corrección propuesta |
|---|---|---|
| E3-R1-07 | Sin espacio al recibir la respuesta del servidor, el árbol se queda sin folio en el teléfono | Volver a pedirlo al tener espacio |
| E3-R1-08 | Doble toque en «Cerrar jornada» y «Ver vista previa» del cierre duplica operaciones y bitácora | Candado contra el doble toque, como en «Guardar» |
| E3-R1-09 | Si la pestaña muere justo al guardar (1 ms), el árbol vuelve «a medias» y puede guardarse dos veces | Borrar el borrador en la misma transacción que guarda |
| E3-R1-10 | Recargar a mitad de «Iniciar jornada» pierde lo escrito | Borrador, como el del árbol |
| E3-R1-11 | «Atrás» o recargar en la ventana de datos de cierre pierde lo escrito | Borrador o confirmación |
| E3-R1-12 | Con la jornada cerrada en otra pestaña, el aviso dice «No tiene permiso para registrar» | Decir que la jornada se cerró |
| E3-R2-07 | Los nombres de catálogo no tienen largo máximo | Largo máximo en pantalla y servidor |
| E3-R2-08 | El PDF pierde emojis, otros alfabetos y acentos escritos por separado | Normalizar (NFC) y avisar de lo que la letra del PDF no tiene |
| E3-R2-09 | Los PDF no traen título, autor ni idioma | Llenar sus propiedades |
| E3-R2-10 | Coordenadas con coma decimal y pocos decimales se reescriben solas | Avisar del cambio |
| E3-R2-11 | `PUT /fotos/:id` sólo mira los primeros bytes y guarda el EXIF con GPS de lo que llega por la API (la aplicación sí lo quita) | Revisar la imagen completa y quitar los metadatos en el servidor |
| E3-R2-12 | Otra cuenta puede «reclamar» el `foto_id` pendiente de un árbol ajeno | Atar el `foto_id` al árbol al subirlo |
| E3-R2-13 | Datos raros por la API que el servidor no traduce a error de campo | Validar tipos y rangos antes de la base |
| E3-R2-14 | Se crea una cuenta con correo de más de 254 caracteres, que nunca podrá entrar (también E3-R3-05) | Largo máximo del correo en el alta |
| E3-R2-15 | Nombres invisibles o invertidos (caracteres de control y de dirección) | Rechazar caracteres de control en nombres |
| E3-R2-16 | El Excel que genera el sistema queda dañado con U+FFFE o U+FFFF | Quitar esos caracteres al escribir |
| E3-R2-17 | La PNG transparente queda con fondo negro; la HEIC dice «no es una imagen» | Fondo blanco al comprimir; mensaje para HEIC |
| E3-R2-18 | Fechas de Excel anteriores al 1-MAR-1900 se convierten con un día menos | Con la fecha mínima (E3-R2-01) desaparece |
| E3-R3-02 | Un `gps_precision_m` enorme desborda la columna y da error interno | Tope en el servidor |
| E3-R3-03 | El límite por procedencia depende de cómo el intermediario arme la cabecera de procedencia; con una configuración floja se evade | Detalle en el informe aparte; confirmar la configuración con el SIA |
| E3-R4-06 | Desactivar una institución cierra las sesiones de sus cuentas en su siguiente petición, no al momento (el README dice otra cosa) | Cerrarlas al momento o corregir el README |
| A3-01 | En Windows los generadores escriben saltos de renglón CRLF; lo guardado es LF: 9 archivos regenerados difieren sólo en eso | Escribir siempre LF |
| A4-01 | `pruebas/prueba.py`: 4 secuencias de escape inválidas (renglones 2034, 3794, 6785 y 6895) que un Python futuro tratará como error | Cadenas sin procesar |
| A6-01 | El marcador «por revisar» (ámbar con borde blanco) sobre el mapa «Calles»: 1.8:1 contra el fondo (se pide 3:1); sólo la sombra lo separa | Borde oscuro en ese marcador |
| B1-01 | Supervisión, lista de cabos (modo real): botones de 23 px de alto, uno menos que el mínimo de 24 | Un píxel más de alto o la separación de la excepción |
| B4-01 | Tablas en teléfono (Catálogos, Usuarios): los botones de orden de la cabecera quedan ocultos pero reciben el foco del teclado; con zoom al 200 % el foco se pierde de vista | Sacarlos del orden del teclado en teléfono: el orden ya tiene su lista |
| B4-02 | Jornadas: la sección toma su nombre de un texto que a veces está vacío (axe «aria-prohibited-attr») | Darle un nombre fijo |
| C3-01 | Usuarios y Posibles duplicados no se paginan: con 103 cuentas la lista mide 16,266 px en teléfono; con 63 parejas, 13,724 px. Pinta rápido | Paginar como Registros y Jornadas (propuesta de pantalla, con antes y después) |
| D1-04 | El README dice que la prueba de conexión tarda «un minuto» (tarda unos 4) y presenta como vigente la revisión de presentación atrasada | Ponerlo al día |
| D1-05 | `docs/MEJORAS.md` «Por hacer»: M397 «Decidido» ya hecho, M398 ya verificado, M171 ya no aplica | Moverlas a «Hechas» o «Descartadas» |
| E1-01 | Un documento público (`docs/DECISIONES.md:116-117`) nombra dos datos internos de la infraestructura del SIA | Quitarlos del documento; quedan en el historial de git |
| F4-01 | `herramientas/empaquetar.py` sólo avisa: no se detiene ante archivos de trabajo ni ante posibles secretos | Detenerse, con una lista de excepciones revisadas (los dos avisos de hoy son falsos y están explicados en el LEEME) |
| F5-01 | El paquete no dice cómo revertir la instalación (base, backend y servidor web) | Una sección «Revertir» en el LEEME. La restauración del respaldo ya está probada (E2) |
| G2-01 | No hay un registro propio y fijo de fallas de componentes compartidos; el único caso vive en la alineación y la revisión del servidor | Un documento fijo para el equipo del SIA |

### 5.5 Informativos

| Clave | Qué |
|---|---|
| A1-03 | Cobertura del servidor medida por primera vez: 97.8 % de renglones, 80.5 % de ramas, 93.3 % de funciones (sobre el compilado; con mapas de fuentes la herramienta reparte mal las líneas) |
| A3-02 | La huella de las capas regenerada en este equipo difiere en 6 centroides en el sexto decimal (unos 10 cm) |
| A4-02 | 10 parámetros `req` sin uso en las rutas del servidor (forma de Express) |
| A6-02 | Los niveles contiguos de la capa de prioridad tienen 1.3 a 2.0:1 entre sí; la información también va en texto (etiqueta de cada colonia y leyenda) |
| F3-01 | `npm audit`: 1 aviso bajo, en esbuild, sólo de desarrollo; 0 moderados, altos o críticos |
| E3-R2-I1 a I4 | Excel con XML mal formado registra una violación de estilo en la consola; el ZIP de fotografías no tiene ZIP64 ni tope; el registro del servidor copia el dato enviado; el ZIP dice «no se pudieron bajar» de fotografías que nunca llegaron |
| E3-R3-04 a 06 | Fragilidad del banco de pruebas compartido (no del sistema); el alta no acota el largo del correo (ver E3-R2-14); 8 ms de diferencia al entrar, dentro del ruido |
| E3-R4-07 | Se puede cambiar la institución de un cabo con una jornada abierta en la anterior |
| E3-R4-08 | El rechazo de un árbol por catálogo desactivado da primero un mensaje genérico; el fino está en «Revisar» |

## 6. Verificado sin hallazgos

- **Pruebas:**
  - servidor, 96 de 96;
  - aplicación con datos reales contra el servicio, 92 de 92, y sobre la copia que se entrega, 93 de 93;
  - consistencia, 144 sin hallazgos; hoja de estilos, sin hallazgos.
- **Construcción:** todo lo generado sale igual dos veces; el servidor compilado es idéntico; el módulo y los
  guiones del paquete son los del repositorio.
- **Código:** ESLint, 0 errores en 61 archivos; tipos del servidor, 0 errores.
- **Barrido de pantallas:**
  - 297 pantallas y 2,083 botones;
  - 0 desbordes, 0 textos cortados y 0 botones que no hacen nada;
  - 0 errores de página y 0 violaciones de la política de seguridad.
- **Cifras:** Supervisión igual al recálculo propio en 7 combinaciones, dos veces.
- **Navegadores:** flujo principal en modo real, 12 de 12, en Chromium y en WebKit, dos vueltas cada uno.
- **Seguridad:**
  - 88 commits sin llaves, contraseñas, cadenas de conexión ni las 16 placas reales;
  - ninguna escalada de privilegios, vertical ni horizontal, en las 33 rutas;
  - sin inyección SQL ni recorrido de rutas;
  - CSRF cubierto (cookie del mismo sitio y ningún GET que cambie algo);
  - el mismo 401 para toda entrada fallida;
  - bloqueo por cuenta y por procedencia;
  - errores sin detalle interno.
- **Escape:** ningún texto se ejecuta ni entra como HTML en ninguna pantalla, mapa, PDF, CSV ni Excel; las
  fórmulas se neutralizan en el CSV y el Excel escribe todo como texto.
- **Concurrencia:**
  - la versión de árboles y jornadas impide escribir sobre lo de otro;
  - 20 altas iguales en paralelo dan 1;
  - los folios no se repiten;
  - la revisión de duplicados es atómica.
- **Captura en campo:**
  - doble toque en Iniciar jornada, Guardar, Enviar ahora y Generar PDF: uno solo;
  - recarga y «Atrás» a mitad de un árbol: no se pierde;
  - señal cortada antes o después de que llegó: nada se duplica;
  - sesión vencida a media tarea y sin espacio al guardar: nada se pierde;
  - GPS negado o impreciso: mensajes claros.
- **Respaldo:**
  - restauración completa: 23 tablas iguales, 7 disparadores y los permisos de la cuenta del servicio;
  - un respaldo alterado falla sin dejar nada.
- **Paquete:** 113 entradas, 0 archivos de trabajo, 112 de 112 sumas; suma del ZIP correcta.
- **Dependencias:** sin avisos moderados ni altos; versiones y licencias de `vendor/` anotadas.

## 7. Contradicciones entre documentos y datos atrasados

| Tema | Fuente 1 | Fuente 2 |
|---|---|---|
| Aviso de privacidad | `docs/DECISIONES.md:140` «[pendiente] … lo pospuso» | `docs/DECISIONES.md` D249 «consultado; no se requiere»; `docs/FASE2-Y-TRASPASO.md` § 4 «ya no aplica»; `docs/REVISION-SERVIDOR.md` #12 «en la lista de lo que falta antes de operar» |
| Pendientes resueltos | `docs/DECISIONES.md:75-142`, 18 «[pendiente]» | D212, D218, D223, D215, D249, D251, D298: ya decididos o hechos |
| Lo que falta del SRP | `docs/PLAN-TRASPASO-SIA.md` § 5 «Falta: el servicio … paquete de instalación» | Versión 1 (D315): hechos |
| Carga por tandas | `docs/ALINEACION-SIA.md:104` «Falta: la carga masiva por tandas: hecha» | La misma línea |
| Revisión de presentación | `README.md:466` la presenta como vigente | No llega a Nuevo registro (A1-04) |
| Tiempo de la prueba de conexión | `README.md:467` «un minuto» | Hoy, 230 a 233 s |
| Cierre de sesiones | `servidor/README.md`: desactivar la institución «cierra sus sesiones» | Se cierran en la siguiente petición (E3-R4-06) |

## 8. Para decidir (dueño)

1. **¿Se pide el aviso de privacidad, o no?** Opciones:
   - a) no se requiere: se deja la constancia de la consulta;
   - b) se pone en la pantalla de acceso.

   Costo de b): S, más la revisión del área de transparencia. **Recomendación:** pedir por escrito al área
   competente la respuesta de D249 y dejarla como constancia; mientras, dejar un solo estado en los documentos.
2. **¿Cuánto tiempo se guardan el registro de entradas y las sesiones cerradas?** Opciones:
   - a) 1 año;
   - b) 3 años;
   - c) lo que diga la política del SIA.

   Costo: S (una depuración periódica). **Recomendación:** c), y si no la hay, 1 año.
3. **¿Fecha mínima para jornadas y árboles?** Opciones:
   - a) 01-01-2000 fija;
   - b) un parámetro de la Administración;
   - c) dos: una para la captura en campo (por ejemplo, un año atrás) y otra para la carga histórica.

   Costo: S. **Recomendación:** c).
4. **¿Una sola pestaña de captura por teléfono, o una cola compartida entre pestañas** (E3-R1-02)? Costo: M y M.
   **Recomendación:** una sola pestaña, con aviso en la otra. Es lo más simple y lo que la persona entiende.
5. **¿Paginar Usuarios y Posibles duplicados?** Cambia la pantalla: se haría con su antes y después.
   **Recomendación:** sí, como Registros y Jornadas.
6. **Presupuesto de peso y velocidad (D4).** **Propuesta:**
   - primera carga de menos de 2 MB comprimida;
   - cada pantalla en menos de 1 s en un teléfono de gama media;
   - la petición más lenta del servidor en menos de 2 s con el volumen de un año.

## 9. Fallas de componentes compartidos

| Componente | Síntoma | Rodeo en el SRP | Aviso | Estado |
|---|---|---|---|---|
| Módulo común de procedencia del backend del SIA | Tomaba la dirección del intermediario y daba la misma para todos | Ninguno: se esperó su corrección | Registrado en `docs/ALINEACION-SIA.md` § 6.2 | Corregido por el SIA el 16-10-2026 |

No se encontraron fallas nuevas de componentes compartidos. Falta el registro propio y fijo (G2-01).

## 10. No verificable desde aquí, hipótesis, no confirmado y no aplica

- **No verificable desde aquí:**
  - Firefox: no abre en el equipo; se verifica en otro equipo.
  - El servidor web real: no hay nginx en el equipo; se verifica con `nginx -t` y peticiones reales en el SIA.
  - Lector de pantalla: no hay NVDA ni VoiceOver; se verifica en H1.
  - Teléfonos reales y carga concurrente: H1 y H3.
- **No confirmado:** E3-R1-06. Sin espacio al recibir los catálogos al entrar, el botón «Entrar» se queda
  deshabilitado hasta recargar (1 de 1; el revisor no lo repitió). Para confirmarlo: repetir `a06` del revisor 1
  con el límite de espacio.
- **Hipótesis:** las fallas de tiempo de `prueba.py` vienen de la carga del equipo. La carga de la demostración
  tardó de 7 a 23 s según la vuelta, pero no se midió en otro equipo.
- **No aplica:** D5 (el SRP no calcula la prioridad) y G1 (nada cita leyes ni normas).

## 11. Plan de corrección en bloques cerrados

| Bloque | Qué va junto | Prueba que lo cierra | Versión |
|---|---|---|---|
| 1. La cola de envío | E3-R1-01, E3-R1-02, E3-R1-03, E3-R4-03, F2-01, E3-R4-05, E3-R1-07, E3-R1-12; la pastilla cuenta toda operación pendiente | Pruebas nuevas en `prueba_conexion.py` para cada caso, y la suite completa | 1.0.1 |
| 2. Las fechas | E3-R2-01, E3-R3-01, E3-R1-04, E3-R1-05, E3-R2-18; `aFecha` | Pruebas de fecha mínima, cambio de día y zona en las dos suites y en el servidor | 1.0.2 |
| 3. El servidor | E3-R4-01, E3-R4-02, E3-R4-04, E3-R2-05, E3-R2-06, E3-R2-07, E3-R3-02, E3-R2-14, E3-R2-11, E3-R2-12, E3-R2-13, E3-R4-06 | Pruebas nuevas en `servidor/pruebas/` (cargas intercaladas, última Administración, versión de cuentas y catálogos, largos) | 1.0.3 |
| 4. Reportes y archivos | E3-R2-02, 03, 04, 08, 09, 16, 17 | Los PDF y el CSV de E3-R2 vueltos a generar, página por página | 1.0.4 |
| 5. Pruebas y herramientas | A1-01, A1-04, A3-01, A4-01, F4-01; verificación automática en cada push (M170) | Dos corridas seguidas en dos equipos, iguales | — |
| 6. Documentos y entrega | D1-01 a 05, E1-01, F5-01, G2-01, y la decisión 1 | Una nueva revisión de coherencia | — |
| 7. Pantalla (propuestas con antes y después) | C3-01, B4-01, B4-02, B4-03, B1-01, A6-01, E3-R1-06, E3-R1-08, E3-R1-10, E3-R1-11, E3-R4-08 | El barrido de esta auditoría, sin hallazgos | 1.1 |

Los bloques 1 y 2 van antes del piloto. Lo que cambia pantallas (bloque 7 y la paginación) se presenta antes
con su antes y después.

## 12. Pruebas nuevas que deben quedar permanentes

| Prueba | Serie |
|---|---|
| Corrección sin cambios seguida de eliminar o cerrar, sin señal (E3-R1-01) | Cada cambio (`prueba_conexion.py`) |
| Dos pestañas: registrar sin señal en una, cerrar y reportar en otra (E3-R1-02) | Cada cambio |
| Jornada eliminada en el servidor con un árbol pendiente (E3-R4-03) | Cada cambio |
| Respuesta 200 que no es del servicio a la subida de la fotografía (F2-01) | Cada cambio |
| Fecha con año de dos cifras y fecha imposible, en pantalla, carga y servidor (E3-R2-01, E3-R3-01) | Cada cambio |
| Dos cargas intercaladas del mismo archivo; dos Administraciones que se desactivan a la vez (E3-R4-01, 02) | Cada cambio (`servidor/pruebas/`) |
| Barrido de pantallas (`barrido.py` de la evidencia) | Cada versión |
| Recálculo propio de las cifras (`cifras.py`) | Cada versión |
| Flujo principal en WebKit (`motores.py`) | Cada versión |
| Respaldo y restauración (`e2_respaldo.sh`) | Antes de entregar |
| Construir dos veces y comparar (`a3_construir.sh`) | Antes de entregar |
| Secretos en todo el historial (`secretos_historial.py`) | Antes de entregar |

## 13. Criterios de salida

| Momento | Criterio | Cumple | Por qué |
|---|---|---|---|
| Cada cambio | A1 a A6 en 0 fallas | No | A1-01 y A1-04 |
| Cada versión | 0 Críticos y 0 Altos abiertos | No | 2 Críticos y 6 Altos |
| Al terminar pantallas | Sin Altos en C1 ni C5 | Sí | Sin Altos en C |
| Antes de mostrar al área | B1, B2, C1 y C5 sin Altos; 0 diferencias en cifras | Sí, con reservas | Cifras iguales; C1 en parte |
| Antes de cerrar etapa | Sin contradicciones abiertas; dentro del presupuesto de peso | No | Sección 7; sin presupuesto |
| Antes de usar datos reales | 0 Críticos y 0 Altos en E; plazo de conservación decidido; aviso con constancia | No | E3-R1-01, 02 y los Altos de E3; plazo y aviso sin decidir |
| Antes de entregar | F1 a F6 completas; ensayo aprobado por otra persona | No | F5 hecho por el autor del instructivo; F6 sin revisión del SIA |
| Documentos a firma | 0 citas equivocadas | No aplica | — |
| Antes de operar | H1 a H6 hechas con constancia | No | Sin hacer |
| Siempre | G2 registrada y avisada | Sí | El único caso, registrado y corregido |

## 14. Calendario

| Auditoría | Cada cuándo |
|---|---|
| A1 a A6 | En cada cambio, de preferencia solas en cada push |
| B1 (barrido), B2 (cifras), B4, B8 | En cada versión |
| E3 (intentar romperlo) | Después de corregir los bloques 1 a 3, y tras cada cambio grande de la cola o del servidor |
| E1, E2, F3, F4, F5 | Antes de cada entrega al SIA |
| D1 | Al cerrar cada etapa |
| H7 | Mensual en operación: dependencias, cuentas y accesos, calidad de datos, espacio de fotografías y errores del servidor |

## 15. Método

- **Revisores y frentes:**
  - el auditor hizo los bloques A, B, C, D, E1, E2, F y G;
  - cuatro revisores independientes hicieron «Intentar romperlo» (E3), cada uno con su copia, sus puertos y su
    lista de ataques: captura en campo; datos raros y archivos; servidor y peticiones alteradas; administración
    y concurrencia;
  - el dueño aprobó usar subagentes sólo para E3; lo demás no los usó, por la regla del proyecto, y hubo una
    segunda pasada propia;
  - el auditor reprodujo todos los Críticos y Altos en su propio entorno, más una muestra de los Medios
    (E3-R3-01 y E3-R2-05).
- **Pantallas, anchos y navegadores:** 7 tamaños (360, 390, 430, 844×390, 768, 1440 y 720 con escala 2, que
  equivale al zoom al 200 %); Chromium de Playwright y WebKit.
- **Herramientas:**
  - Playwright 1.63;
  - axe-core 4.10.3, tomado de la memoria local de npm, sin descargar;
  - ESLint 9.13 y pyflakes;
  - TypeScript del proyecto;
  - `pg_dump` y `pg_restore` 17;
  - `npm audit`, con permiso del dueño para consultar por internet;
  - la cobertura de Node 24.
- **Entorno:** copias del proyecto fuera de su carpeta y la base local de desarrollo, que se volvió a cargar
  igual al terminar. Sin producción, sin datos reales nuevos y sin servicios externos (salvo `npm audit` y las
  teselas del mapa base).
- **Línea base y resultado final:**

  | Suite | Al empezar | Al terminar |
  |---|---|---|
  | `npm test` del servidor | 96 de 96 (86 s) | 96 de 96 (81 s) |
  | `prueba_conexion.py` | 92 de 92 (233 s) | 92 de 92 (253 s) |
  | `prueba_conexion.py --app` (la copia que se entrega) | 93 de 93 (230 s) | 93 de 93 (252 s) |
  | `auditoria.py` | 144, 0 hallazgos | 144, 0 hallazgos |
  | `auditoria_css.py` | 0 hallazgos | 0 hallazgos |
  | `revisar.py` | 12 avisos falsos (A1-04) | Los mismos 12 |
  | `prueba.py` | No terminó en 3 corridas (A1-01) | No terminó: se detuvo a los 437 s con 1 falla en otra sección, que aislada se detiene en otra espera fija |

  Ninguna falla nueva: lo que cambió entre una y otra corrida es el punto donde se detiene `prueba.py`, que es
  justo el hallazgo A1-01.
- **Huellas:** 1,868 archivos al empezar y al terminar; «Sin cambios: 1868 archivos idénticos». Se dejaron
  fuera este informe, su carpeta de evidencia y el informe aparte, que el dueño pidió en `servidor/local/`.
  Commit al terminar: `84747a9`, el mismo. Los dos archivos de huellas están en la evidencia.
- **Informe aparte, fuera del repositorio:** `servidor/local/auditoria-2026-10-19/`. Contiene los informes
  completos de los cuatro revisores (con las claves de sus cuentas de prueba), el detalle de E3-R3-03 y de
  E1-01, y las capturas del barrido.
- **Incidencias del proceso:**
  - un revisor corrió la limpieza compartida a media prueba y le quitó a los demás un permiso de la base de
    desarrollo; se restableció;
  - el revisor 1 se detuvo antes de escribir su informe y se le pidió terminarlo con lo que tenía.

## 16. Qué sigue

**Recomendación:** corregir los bloques 1 y 2 (la cola de envío y las fechas) antes de cualquier uso con datos
reales y antes del piloto. Son los dos Críticos y tres de los Altos, con esfuerzo de S a M cada uno. Después,
el bloque 3 del servidor y la decisión del aviso de privacidad. Al terminar, repetir «Intentar romperlo» sobre
la cola de envío. Nada de esto requiere cambiar pantallas, salvo los avisos nuevos de la cola, que se
presentarían con su antes y después.

## Anexo · Guías para las auditorías de operación (H)

**H1 · Teléfonos reales.** Un iPhone con Safari y un Android de gama baja con Chrome, con la versión instalada en
el SIA. En cada uno:
1. Instalar la aplicación desde el navegador.
2. Entrar con la contraseña temporal y escribir una propia.
3. Iniciar una jornada con el GPS y registrar tres árboles, uno con fotografía.
4. Quitar la señal (modo avión) y registrar dos más.
5. Cerrar la aplicación, abrirla y devolver la señal: los cinco llegan una sola vez.
6. Cerrar la jornada y generar el reporte en PDF.
7. Girar el teléfono en cada pantalla.
8. Con VoiceOver o TalkBack, hacer el paso 3 sin mirar.

Se anota, por paso: el equipo, qué pasó y una captura.

**H2 · Prueba con el personal.** Dos cabos y una coordinación, en sus propios teléfonos, con la guía de arriba,
sin ayuda. Por persona se anota:
- cuánto tardó cada paso;
- dónde dudó o preguntó;
- qué buscó y no encontró;
- qué contó o anotó a mano.

Al final, las tres preguntas de cada pantalla (sección C1) contestadas por ellos.

**H6 · Piloto.** Una cuadrilla, una semana, datos reales. Criterios de salida escritos antes de empezar:
- cero árboles perdidos o duplicados contra lo que la cuadrilla anotó en papel;
- folios consecutivos por celda;
- el reporte de cada jornada conforme;
- cero operaciones atoradas en la cola al final de cada día.

Para revisar a diario: la cola de cada teléfono, la bandeja de posibles duplicados y Supervisión contra el
papel.

## Seguimiento de las correcciones

El dueño aprobó los bloques 1 y 2 del plan (sección 11) el 19-10-2026, con sus decisiones:
- una pestaña a la vez (decisión 4);
- la fecha mínima del 01-OCT-2024, cuando empezó el programa, con un aviso en campo a los 30 días (decisión 3);
- avisar al cerrar sesión con algo sin enviar, sin bloquear otra cuenta;
- los avisos nuevos de la pastilla, la hora del teléfono, la jornada eliminada y la jornada cerrada.

### Bloque 1 · La cola de envío (bloque 236 del proyecto, versión 1.0.1)

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| E3-R1-01 | Corregido | `verificar_criticas.py` V4: antes, 2 de 2 atorados «sin versión»; después, 0 de 2 | `prueba_conexion.py`: corrección sin cambios y luego eliminar el árbol, y lo mismo con la jornada |
| E3-R1-02 | Corregido | `verificar_criticas.py` V5: antes, el árbol perdido 2 de 2; después, llega con el cierre y el reporte, 2 de 2 | `prueba_conexion.py`: la segunda pestaña detiene a la primera, «Usar aquí», y la limpieza con lo que espera en el almacén |
| E3-R1-03 | Corregido | La prueba nueva repite el corte de la respuesta; no se corrió contra el código anterior | `prueba_conexion.py`: respuesta perdida y otra corrección encima |
| E3-R4-03 | Corregido | `verificar_altas.py` V1: antes, `JORNADA_PENDIENTE` sin aviso, 2 de 2; después, `JORNADA_ELIMINADA` y en «Revisar», 2 de 2 | `prueba_conexion.py` y `servidor/pruebas/recepcion.test.js` |
| F2-01 | Corregido | `foto_falso_ok.py`: antes, la fotografía perdida 2 de 2; después (`foto_falso_ok_despues.py`), se queda en la cola y llega, 2 de 2 | `prueba_conexion.py`: «200» con una página a la subida |
| E3-R4-05 | Corregido | La ventana de «Cerrar sesión» con pendientes | `prueba_conexion.py` |
| E3-R1-07 | Corregido | Sin espacio simulado al poner la respuesta; no se repitió con el límite real del navegador | `prueba_conexion.py` |
| E3-R1-12 | Corregido | El texto nuevo | `prueba_conexion.py` |
| La pastilla | Corregido | Cuenta las jornadas; en rojo lo que no sale en 30 minutos con conexión | `prueba_conexion.py` |

`foto_falso_ok_despues.py` está en la evidencia, junto a los guiones de la auditoría.

### Bloque 2 · Las fechas (bloque 237 del proyecto, versión 1.0.2)

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| E3-R2-01 | Corregido | Antes, 0026 y 1900 se aceptaban y recibían folio, 2 de 2. Después, el campo y el servidor dicen «no puede ser anterior al 01-OCT-2024» | `prueba_conexion.py` (0026 tecleado y el aviso de los 30 días), `recepcion.test.js` (0026, 1900 y 30-SEP-2024; el 01-OCT-2024 sí entra) |
| E3-R3-01 | Corregido | Antes, `ERROR_INTERNO` 2 de 2 y la tanda entera con 500. Después, «Indique la fecha…» y, en la carga, un problema del renglón | `recepcion.test.js` y `cargas.test.js` (mes 13, día 45, mes 00) |
| E3-R1-04 | Corregido | La prueba nueva cruza la medianoche con el reloj simulado sin salir de Nuevo registro; no se corrió contra el código anterior | `prueba_conexion.py` |
| E3-R1-05 | Corregido en parte | «Hoy» y la hora en la zona de la Ciudad, y la franja de la hora del teléfono. Falta que el servidor guarde su propia hora de recepción | `prueba_conexion.py` (zona de Tokio; servidor con tres días de diferencia) |
| E3-R2-18 | Corregido | Las fechas de Excel de 1899 y 1900 quedan antes de la mínima | `prueba_conexion.py` (el número 1 de Excel) |
| `aFecha` y la serie | Corregido | `setFullYear` y el año a cuatro cifras | — (la fecha mínima ya no deja entrar esos años) |

### Bloque 3 · El servidor (bloque 238 del proyecto, versión 1.0.3)

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| E3-R4-01 | Corregido | `verificar_altas.py` V3: antes, 6 árboles donde debían ser 3, 2 de 2. Después (`verificar_altas_despues.py`), la tanda de la segunda carga responde 409 «Hay otra carga subiendo» y quedan 3, 2 de 2. El lote que se completa después de otro igual no pasa: `cargas.test.js` | `cargas.test.js` (una a la vez; dos del mismo archivo) y `prueba_conexion.py` |
| E3-R4-02 | Corregido | `verificar_altas.py` V2: antes, las dos desactivadas 5 de 8. Después (`verificar_altas_despues.py`), con esas dos como las únicas activas, el sistema sin ninguna 0 de 8: la segunda recibe `ULTIMA_ADMINISTRACION`, o ya no tiene sesión porque la otra la desactivó primero. El guion de antes tenía una tercera activa; el de después deja a las dos solas, que es el caso del hallazgo | `acceso.test.js` |
| E3-R4-04 | Corregido | La prueba nueva repite la secuencia del revisor en cuentas y en catálogos | `acceso.test.js`, `catalogos.test.js` y `prueba_conexion.py` |
| E3-R2-05 | Corregido | 300 árboles en 300 jornadas: las tandas caben en 100 KB | `prueba_conexion.py` |
| E3-R2-06, E3-R2-07 | Corregido | Los largos, iguales en pantalla y servidor | `catalogos.test.js` (la comparación con la aplicación, con textos largos) |
| E3-R2-14 | Corregido | Correo de 271 caracteres: rechazado en su campo | `acceso.test.js` |
| E3-R2-11 | Corregido | Una imagen falsa y una WebP sin cuerpo no entran; los datos de la cámara se quitan; `nosniff` | `fotografias.test.js` |
| E3-R2-12 | Corregido | Otro árbol con el mismo `foto_id`: rechazado | `fotografias.test.js` |
| E3-R3-02, E3-R2-13 | Corregido | Precisión de 9,999,999,999 m, el nulo y el año 2999 | `recepcion.test.js` |
| E3-R4-06 | Corregido | Desactivar la institución cierra la sesión al momento | `acceso.test.js` |
| E3-R1-05 (lo que faltaba) | Corregido | La hora de llegada ya la guarda la bitácora con la del servidor; una hora imposible del teléfono se cambia por la del servidor | `recepcion.test.js` |

`verificar_altas_despues.py` y su salida están en la evidencia, junto a los guiones de la auditoría. Los demás
hallazgos del bloque se probaron sólo con el código nuevo: las pruebas nuevas repiten la secuencia del revisor.

### Bloque 4 · Reportes y archivos (bloque 239 del proyecto, versión 1.0.4)

El dueño aprobó el 20-10-2026 el antes y el después del reporte, el «?» con su aviso y el mensaje de la HEIC.
Antes y después se corrieron con los guiones del revisor, sobre el código del bloque 238 y sobre la corrección.

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| E3-R2-02 | Corregido | Antes, «Coordenada» empezaba a 256 pt con una palabra de 19 caracteres y a 128 pt con una de 79; con el enlace del revisor, la especie quedaba de una letra de ancho. Después, a 214 pt con cualquiera de ellas | `prueba.py`, ctx95 |
| E3-R2-03 | Corregido | Antes, 15 renglones de la página 1 fuera de la hoja (el guion lista hasta 15). Después, ninguno: el recuadro sigue en la página 2 | `prueba.py`, ctx95 |
| E3-R2-04 | Corregido | Antes, «Al archivo le faltan columnas» con los dos CSV de Windows. Después, se revisan sus renglones | `prueba.py`, ctx95 |
| E3-R2-08 | Corregido | Antes, emojis, hebreo y árabe desaparecían sin aviso y «José Peña» escrito aparte salía «Jose Pena». Después, «José Peña», «?» por tramo y el aviso al entregar | `prueba.py`, ctx95 |
| E3-R2-09 | Corregido | Antes, sólo el productor. Después, título, asunto, autora, creador, idioma es-MX y el título en la ventana | `prueba.py`, ctx95 |
| E3-R2-16 | Corregido | Antes, el libro con U+FFFE o U+FFFF no abría. Después, abre sin esos caracteres | `prueba.py`, ctx95 |
| E3-R2-17 | Corregido | Antes, la esquina del PNG transparente en (1, 1, 1) y la HEIC «no es una imagen». Después, (255, 255, 255) y el mensaje de la HEIC | `prueba.py`, ctx95 |

La sección nueva de `prueba.py`, corrida contra el código de antes, da 8 fallas de 9 (la novena es la de errores de
consola).

### Bloque 5 · Pruebas y herramientas (bloque 240 del proyecto, versión 1.0.5)

El dueño aprobó el bloque el 20-10-2026 y decidió que las pruebas corran en GitHub en cada subida. El equipo
lento simulado (`por_tramos.py --lento`) encontró dos fallas de la aplicación que no estaban en el informe; van al
final de la tabla.

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| A1-01 | Corregido | Antes, 4 de 4 corridas sin terminar. Después, `por_tramos.py` termina los 80 tramos en cada corrida (ver abajo). En una corrida normal, con otros dos proyectos probándose en el mismo equipo, hubo 2 fallas: una espera de la prueba, ya corregida, y una vez que el servidor de prueba no entregó la biblioteca del mapa (`sin_leaflet.py` da el mismo error). Repetidos, los dos tramos pasan 3 de 3 | `por_tramos.py`, en GitHub en cada subida |
| A1-04 | Corregido | Antes, 12 avisos falsos. Después, «sin problemas» y salida 0 | `revisar.py`, en GitHub |
| A3-01 | Corregido | Antes, 9 archivos regenerados diferían de lo guardado sólo en CRLF. Después, ninguno | — (los generadores escriben LF) |
| A4-01 | Corregido | Antes, 4 avisos de sintaxis en `prueba.py`. Después, ninguno | GitHub compila los guiones con esos avisos como error |
| F4-01 | Corregido | Antes, sólo avisaba y armaba el paquete. Después, no escribe el ZIP con los dos avisos sin revisar, con un archivo revisado que cambió ni con `~$LEEME.docx` y un `.bak`. Con los dos avisos revisados, arma el paquete (113 archivos) | — (se prueba al armar cada paquete) |
| M170 | Corregido en parte | Las pruebas corren en GitHub en cada subida, con Chromium. Falta WebKit. El servicio y la base de datos (`npm test`, `prueba_conexion.py`) se siguen probando en el equipo de desarrollo | `.github/workflows/pruebas.yml` |
| Nuevo · el mapa fijo | Corregido | `mapa_quitado.py`: antes, un error de Leaflet, 2 de 2; después, sin error, 2 de 2 | `prueba.py`, ctx96 |
| Nuevo · la lista de Jornadas | Corregido | `lista_atrasada.py`: antes, con «Hoy» marcado quedaban a la vista las jornadas de otro día, 2 de 2; después, la lista del atajo, 2 de 2 | `prueba.py`, ctx97 |

Criterio de cierre, «dos corridas seguidas en dos equipos, iguales». En el equipo de desarrollo, dos corridas
seguidas de los 80 tramos, 1,452 de 1,452 cada una: la del equipo 3 veces más lento y otra normal. El primer
tramo, con el equipo 4 veces más lento, 645 de 645 dos veces. En GitHub (Linux), la primera corrida pasó los 80
tramos sin fallas ni tramos detenidos, en 30 min.

`lista_atrasada.py`, `mapa_quitado.py` y `sin_leaflet.py` están en la evidencia, junto a los guiones de la
auditoría.

### Bloque 6 · Documentos y entrega (bloque 241 del proyecto; la aplicación sigue en la 1.0.5)

El dueño decidió el 21-10-2026 la decisión 1 del § 8: el aviso de privacidad no se requiere; falta la constancia
escrita de la Unidad de Transparencia.

| Clave | Estado | Antes y después | Prueba |
|---|---|---|---|
| D1-01 | Corregido | Antes, 21 «[pendiente]» en el encabezado. Después, 6, que dependen del SIA o de la operación; los otros 15, tachados con su decisión | Revisión de coherencia |
| D1-02 | Corregido | Antes, cuatro estados. Después, uno en todos los documentos y en el paquete | Revisión de coherencia |
| D1-03 | Corregido | El § 5 del plan de traspaso, y también su § 1, § 3, § 4, § 6, § 7 y § 9 | Revisión de coherencia |
| D1-04 | Corregido | En el bloque 5 | — |
| D1-05 | Corregido | M397 hecha, M398 verificada, M171 descartada | — |
| E1-01 | Corregido | Antes, dos datos internos en un documento público. Después, ninguno en los archivos del repositorio; siguen en el historial de git | Búsqueda en todos los archivos: 0 |
| F5-01 | Corregido | El LEEME trae «Revertir» y «Si ya está instalada la versión 1». El diff se deshace limpio | `git apply -R --check` sobre `sia-backend` |
| G2-01 | Corregido | `docs/FALLAS-COMPARTIDAS.md`, con el caso del módulo de procedencia | — |
| Nuevo · el manual | Corregido | Antes, «hasta 20,000 renglones» y una herramienta que se atoraba desde la 1.0.2. Después, al día con la 1.0.5 | El manual se generó completo |
| Nuevo · el paquete | Corregido | Armado otra vez sobre la versión vigente de `sia-backend` (20-10-2026): ensayo 18 de 18, binario 23 de 23, servidor 105 de 105, aplicación del paquete 120 de 120 | Ensayo de instalación |

Criterio de cierre, «una nueva revisión de coherencia»: la hizo un revisor independiente, en sólo lectura. Encontró
26 hallazgos, 3 de ellos altos; se corrigieron todos, salvo tres que se explican en la bitácora y tres dudas que
no se pueden resolver desde aquí.
