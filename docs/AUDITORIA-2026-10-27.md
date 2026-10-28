# Auditoría del Sistema de Registro de Plantaciones

27-10-2026 · **versión 1.4.2** (se entregará al SIA como 1.0.0, D337), commit `1eb30e6`, rama `main`, sin cambios
sin guardar en los archivos del repositorio (al tomar la línea base, la prueba de presentación dejó 8 capturas `rev_*.png` en la
raíz: A5-01 y sección 15) · alcance aprobado por el dueño el 27-10-2026:
- lo cambiado desde la 1.1 (`8d0cfcd`): los 18 commits de los bloques 243 a 255;
- las auditorías de la etapa de entrega;
- cinco revisores en paralelo y uno independiente;
- un paquete provisional para el ensayo de instalación.

Auditoría independiente y de sólo lectura: no se corrigió nada. Todas las pruebas que escriben corrieron en copias
del commit, fuera de la carpeta del proyecto. Lo que ya estaba registrado (pendientes M…, decisiones D337 y D338 y lo
aceptado) se cita por su clave y no se cuenta como nuevo (sección 5.6). Las rutas de evidencia son relativas a la carpeta `evidencia-2026-10-27/`; `r1/` a `r6/` son los seis revisores y
`coordinacion/` las huellas. En el repositorio (`docs/evidencia-2026-10-27/`) van los guiones y las salidas de texto;
las capturas, los PDF y los datos grandes están en la evidencia completa, fuera del repositorio
(`servidor/local/auditoria-2026-10-27/`), con el informe sensible.

---

## 1. Veredicto

| Etapa | Veredicto | Por qué |
|---|---|---|
| En cada cambio | **No lista** | La prueba completa da 5 fallas y 4 tramos detenidos (A1-01, A1-02), y GitHub falla desde el bloque 252 sin que ningún cierre lo registre (A1-03). Las demás suites: 0 fallas |
| En cada versión | **No lista** | 2 Críticos y 4 Altos abiertos |
| Antes de usar datos reales | **No lista** | La seguridad está bien (0 Críticos y 0 Altos en E1), pero se pierden árboles capturados por los cabos de apoyo sin señal (B6-01) y la jornada compartida no sobrevive a reabrir la aplicación sin señal (B6-02). El borrado del registro de entradas (D337) no está programado y falta la constancia escrita del aviso de privacidad. El respaldo sí se restaura entero y uno alterado o cortado se detecta (E2) |
| Antes de entregar al SIA | **No lista** | El instructivo es el de la 1.1 y no sirve para instalar la 1.0.0 (F4-01); el empaquetador deja pasar archivos que no deben ir (F4-02); M563 sigue abierto. El ensayo en limpio sí instala: 58 de 63 comprobaciones, y las 4 que fallan son del instructivo (F5) |
| Documentos que van a firma | No aplica | El reporte de jornada se firma, pero no cita leyes ni normas |
| Antes de operar | **No lista** | Teléfonos reales, prueba con el personal, carga concurrente y piloto: sin hacer (es lo esperado en esta etapa) |

## 2. Resumen ejecutivo

Lo nuevo desde la 1.1 está bien protegido por dentro:
- el control de acceso resistió 132 de 135 peticiones alteradas a mano; las 3 que pasan son una sola puerta, anterior
  a la 1.1 (E1-01);
- las reglas de la pantalla y las del servidor son idénticas en 73,482 comparaciones;
- la cuenta del servicio tiene lo mínimo;
- el barrido de 477 pantallas y 1,352 botones, con los 4 perfiles y en los dos modos, salió limpio;
- la capa de calles coincide tramo por tramo con su fuente (178,771 tramos) y los conteos de Supervisión, del PDF y
  del CSV cuadran con un recálculo propio en SQL.

Los problemas están en **la jornada compartida cuando falta señal**, en **dos cifras nuevas de Supervisión** y en
**el instructivo para el SIA**:
- **Dos Críticos.**
  - B6-01: los árboles que un cabo de apoyo capturó sin señal, mientras sí estaba en la jornada, se rechazan para
    siempre si antes de que vuelva su señal la Coordinación cierra la jornada o lo quita. La única salida que da la
    pantalla es eliminarlos. Lo encontraron cuatro revisores por separado, uno de ellos independiente.
  - B2-01: el «% del total» de cada calle sale inflado en Supervisión y en el informe PDF.
- **Cuatro Altos:**
  - la compartida no se guarda en el teléfono del cabo de apoyo: al reabrir la aplicación sin señal, desaparece;
  - la Coordinación puede eliminar una compartida mientras sus cabos tienen árboles sin enviar;
  - con el filtro de compartidas, Supervisión dice «0 de 20 cabos trabajaron» cuando 17 registraron 3,582 árboles;
  - el instructivo de la última entrega (1.1) no sirve para la 1.0.0: no dice nada de la capa de calles y manda a
    verificar en un guion que ya es otro.

Los de la jornada compartida no se ven con una sola persona y buena señal, y por eso no los atraparon las pruebas;
pero la compartida es justo para eventos masivos con señal intermitente. Los de las cifras sí están a la vista, en
Supervisión y en el informe. Conviene corregirlos antes del piloto y antes de armar el paquete 1.0.0.

Totales: **2 Críticos · 4 Altos · 22 Medios · 37 Bajos · 13 Informativos (78)**, más 7 No confirmados (sección 10).

## 3. Cobertura

Estado: Hecha · En parte · No hecha · No aplica. «H» suma los hallazgos por gravedad (C/A/M/B/I), contados en la
auditoría de su clave. Calificación del 1 al 5: 5 es completa y sin Críticos ni Altos.

| Código | Auditoría | Estado | Cómo se hizo | H (C/A/M/B/I) | Cal. | Qué faltó |
|---|---|---|---|---|---|---|
| A1 | Pruebas y regresión | En parte | Coordinación: línea base completa (sección 15). r1: tramos 1, 8, 54, 83, 84 y 85 solos, dos veces los que fallan; causa de cada falla con guiones propios; prueba ajustada sólo en las esperas (tramo 84, 15 de 15; tramo 85, 19 de 19); las secciones nuevas corridas contra la 1.1 en una copia de `8d0cfcd` (se detienen ahí; el tramo 83 pasa 12 de 12 en la 1.4.2) | 0/0/3/1/1 | 3 | La prueba completa no se volvió a correr entera en el equipo compartido. La cobertura del servidor no se midió: `npm test` destruye el esquema compartido (A1-04). La repetición final de todas las suites da lo mismo que la línea base (sección 15) |
| A2 | Integridad de datos | Hecha | r1: SHA-256 del gpkg y del zip de la capa contra README e índice; 97 celdas y 178,771 claves de la copia ligera; base contra gpkg tramo por tramo; 33,808 puntos de la calle de prueba contra la del servidor | 0/0/0/1/0 | 5 | — |
| A3 | Construcción reproducible | Hecha | r1: los tres generadores dos veces en carpetas vacías (iguales al commit, salvo el fin de renglón); producción dos veces desde un clon LF (76 archivos, iguales); servidor compilado dos veces, idéntico al dado. r2, r3, r4 y r6 armaron la copia de producción | 0/0/1/0/0 | 4 | No se comparó contra `servidor/local/srp-sia/`, que es de la 1.1 |
| A4 | Calidad estática | Hecha | r1: ESLint en 70 archivos, 0 errores y 1 aviso; revisión de tipos del servidor, 0 errores, también con `--noUnusedLocals`; con `--noUnusedParameters`, 10 (`req` de Express); pyflakes, 13 avisos (12 falsos positivos y 1 variable sin uso) | 0/0/0/0/0 | 5 | — |
| A5 | Consistencia automática | Hecha | r1: `pruebas/auditoria.py`, 144 comprobaciones y 0 hallazgos (147 en la carpeta original: 3 dependen de `originales/`). Coordinación: lo que las pruebas dejan en la carpeta del proyecto | 0/0/0/1/0 | 4 | Las comprobaciones de lo nuevo de los bloques 249 a 255 (sección 12) |
| A6 | Estilos y contraste | Hecha | r2: `auditoria_css.py` sin hallazgos; 20 pares medidos con el fondo compuesto, en modo sol y normal; el círculo del GPS en 3 niveles × 2 mapas base × 2 lugares, 75 muestras cada uno | 0/0/0/1/1 | 4 | Las marcas de sustituto en el mapa no estaban en pantalla: se calcularon de las variables |
| B1 | Barrido de pantallas | Hecha | r2: 4 perfiles × 7 tamaños (360, 390, 430, 844×390, 768, 1440×900 y zoom al 200 %) × 2 modos: 72 corridas, 477 pantallas y 1,352 botones presionados | 0/0/0/0/0 | 4 | El barrido sólo abre jornadas «Sólo yo»; los estados de la compartida se cubrieron en B4 |
| B2 | Coherencia de cifras | Hecha | r1: SQL propio contra Supervisión, «Por red vial», PDF y CSV, en modo real, con «Todo» y con compartidas sí y no, más una compartida propia. r3: recálculo desde el almacén con la demostración, con «Compartidas» y «Por calle» | 1/1/1/0/0 | 2 | Un Directivo y la Administración global en modo real |
| B3 | Archivos que genera | Hecha | r1: reporte de una compartida en modo real, informes, CSV con 11 casos de inyección, metadatos e idioma, los dos manuales. r3: PDF del reporte y del informe | 0/0/0/1/0 | 4 | Abrir el CSV en Excel (no está instalado): se revisó el texto exacto |
| B4 | Accesibilidad | En parte | r2: axe-core 4.10.3 (WCAG 2.2 A y AA), 50 corridas sobre 15 estados nuevos (Chromium a 390 y 1440, WebKit a 390) más las vistas del barrido: 0 fallas. Teclado de principio a fin en la compartida; foco devuelto en 12 de 12 casos; anuncios de las regiones vivas | 0/0/0/0/0 | 4 | Lector de pantalla (no hay en el equipo). No se simuló daltonismo: se comprobó que cada marca nueva lleva texto |
| B5 | Robustez ante errores | En parte | r5: cinco respuestas raras al envío, sesión vencida, cuatro formas de catálogos dañados, inyección en el nombre, reloj adelantado | 0/0/1/1/0 | 3 | Un servidor lento de verdad (más de 20 s) y una caída a mitad de un relevo |
| B6 | Sin conexión y continuidad | Hecha | r2: en modo real, quitar a un cabo sin señal, relevo hacia un cabo sin señal, «Terminar mi parte» al volver la señal, sesión vencida en horizontal, reabrir sin señal y el ciclo del service worker. r6: 5 corridas en modo real, con la copia para el SIA y su service worker | 1/2/1/1/0 | 1 | Teléfono real (H1). La recarga sin red en WebKit falla en la herramienta |
| B7 | Terceros | Hecha | r4: todo dominio externo bloqueado y contado: 366 y 294 peticiones en modo real, 153 y 153 en modo de prueba (la segunda con service worker). r2, igual en el barrido | 0/0/0/0/0 | 5 | — |
| B8 | Navegadores y fechas | En parte | r2: la compartida en modo real, en Chromium y WebKit, dos veces cada uno; reloj simulado del 31-DIC a las 23:50 al 1-ENE, en las zonas de la Ciudad de México, Tokio y UTC: 45 de 45 | 0/0/0/0/0 | 4 | Firefox no abre en el equipo. El cambio de horario no aplica: la aplicación fija la zona de la Ciudad de México |
| B9 | Seguridad del despliegue | Hecha | r4: servidor web local con el fragmento del paquete tal cual, validado con su propia herramienta; 14 rutas revisadas por sus cabeceras; barrido de 14 vistas con 4 o 5 perfiles en los dos modos con la política de seguridad real: 0 violaciones | 0/0/0/0/1 | 4 | Las cabeceras globales del servidor del SIA (B9-01) |
| C1 | Tareas del personal | Hecha | r3: 17 fichas, con los 4 perfiles más los cabos de apoyo y de relevo, con el volumen de la demostración (22,100 árboles) | 0/0/1/1/0 | 2 | Teléfono físico. B6-02 también salió de aquí |
| C2 | UX heurística | Hecha | r3: las 10 heurísticas de Nielsen en teléfono y escritorio, sobre la compartida, el relevo, el filtro, la calle, el GPS, el sitio y «Sustituir» | 0/0/0/2/1 | 3 | — |
| C3 | Carga de la interfaz | Hecha | r3: palabras, controles, campos y alto de 14 pantallas a 390×844 y 4 a 1440×900 | 0/0/1/1/0 | 3 | — |
| C4 | Matriz de estados | En parte | r3: «Tipo de jornada» con sus 3 valores en Registros, Jornadas y Supervisión (Sí + No = Todas en 5 de 5); «Atrás», recarga y dos pestañas. r6: el estado del cabo tras cada cambio de la Coordinación | 0/0/0/0/0 | 2 | El tipo combinado con Alcaldía y Programa; dos pestañas del mismo cabo. Sus hallazgos quedaron en B6-01, B2-01, B2-02 y B2-03 |
| C5 | Textos | Hecha | r3: inventario de 320 cadenas nuevas o cambiadas, avisos, PDF y CSV, y glosario. r6: «Revisar», cierre, eliminación y Nuevo registro en cada caso | 0/0/2/2/0 | 3 | Correos: el sistema no envía |
| C6 | Sistema visual | En parte | r3: botones y colores de lo nuevo | 0/0/0/1/0 | 4 | El modo sol de cada elemento nuevo (r2 lo midió en A6) |
| D1 | Coherencia documental | Hecha | Coordinación: README, documentos de traspaso, MEJORAS y ALINEACION-SIA contra el código y D333 a D338. r3: unas 150 afirmaciones del manual del personal y 70 del de la Administración, con 168 textos citados letra por letra. r6: D334 a D338, las ventanas, el manual y el instructivo | 0/0/4/12/7 | 2 | — |
| D2 | Modelo de datos | Hecha | r1: diccionario contra la base (10 tablas, 167 campos, 0 diferencias); restricciones e índices de los 12 campos de la calle y de los cabos de apoyo; 0 violaciones en 18,515 árboles y 100 cabos de apoyo | 0/0/0/2/0 | 4 | — |
| D3 | Datos de referencia | Hecha | r1: conteos, claves y sumas de la capa de calles contra su fuente; cita y licencia contra las condiciones de uso del paquete de calles | 0/0/1/0/0 | 4 | Abrir los enlaces externos (regla de la auditoría) |
| D4 | Peso y velocidad | En parte | Coordinación: primera carga de la copia de producción, 1.97 MB comprimida y 7.27 MB sin comprimir, en 60 archivos; estimación de 10 s en 4G lenta y 40 s en 3G. r5: bajar lo enviado de la Coordinación, 705 jornadas en 150 ms y 8,836 árboles en 1.8 s | 0/0/0/0/0 | 3 | Medición en un teléfono lento simulado; presupuesto del dueño (sección 8) |
| D5 | Validación del método | No aplica | El SRP no calcula modelos, índices ni puntajes | — | — | — |
| E1 | Seguridad y datos personales | Hecha | r4: 135 peticiones alteradas con 11 cuentas de 4 perfiles y 2 instituciones, dos corridas; paridad de reglas en 73,482 comparaciones; 30 consultas como la cuenta del servicio; los 18 commits y los 2 manuales sin secretos ni placas; inyección HTML con 4 perfiles. r5: los permisos de lo nuevo por la API | 0/0/2/2/1 | 4 | La conexión de la cuenta del servicio con contraseña y cifrada (necesita superusuario) |
| E2 | Integridad y respaldo | Hecha | r5: transacciones y versiones de las operaciones nuevas; bitácora que no se edita ni con la cuenta dueña; recálculo de calles en una copia (0 distintos de lo guardado). Con la base libre, al final, `r5/e2_respaldo.sh`: respaldo con `pg_dump` (4.3 MB, 23 tablas); uno alterado y uno cortado al 90 % fallan sin dejar nada; el bueno se restaura con la huella de las 23 tablas idéntica (renglones y md5 de su contenido), los 9 disparadores activos, la bitácora sin poderse editar y la cuenta del servicio con sus 67 permisos | 0/0/0/2/1 | 4 | — |
| E3 | Intentar romperlo | Hecha | r5: unos 50 casos por la API y 9 escenarios en el navegador con dos o tres teléfonos, dos corridas cada uno. r6: 5 corridas de la compartida con la red cortada. r2 y r3, en sus frentes | 0/0/1/3/0 | 2 | «Atrás» a mitad de un paso; el relevo con el servidor caído; «Terminar mi parte» sin señal seguido del cierre (hipótesis H-6). B6-01 también salió de aquí |
| F1 | Limpieza | En parte | Coordinación: el campo `coordinadores_ids` sin uso; «cuadrilla» sólo queda como palabra común | 0/0/0/1/0 | 3 | La cobertura del navegador para encontrar código sin uso |
| F2 | Revisión de código | En parte | Coordinación, por muestreo de lo cambiado; confirmó por lectura E1-01, B2-01 y F4-01 | 0/0/0/0/0 | 3 | La aplicación entera, por bloques |
| F3 | Dependencias y licencias | Hecha | r4: `npm audit` en `servidor/` (3 avisos); `vendor/` sin cambios desde la 1.1, con las versiones de `LICENCIAS.md` | 0/0/1/0/0 | 4 | No se actualizó nada (regla) |
| F4 | Control del paquete | Hecha | r4: paquete provisional armado con las herramientas del proyecto (120 archivos, 120 sumas bien, ZIP y su suma bien); búsqueda de secretos; 6 archivos plantados contra el empaquetador; instructivo contra D337 y D338 | 0/1/1/1/0 | 2 | El paquete real 1.0.0 todavía no existe |
| F5 | Ensayo de instalación | Hecha | r4, que no escribió el instructivo, con `r4/f5_ensayo_instalacion.py`: en seco, 2 × 25 comprobaciones; con la base libre, respaldo, instalación en limpio (una segunda vez se niega), comprobación como la cuenta del servicio (7 de 7 consultas, 15 de 15 intentos indebidos negados), integración en una copia del backend del SIA (el diff aplica limpio, revisión de tipos y compilación sin errores), humo 18 de 18 con folio y calle «ok», «Revertir» limpio y la base restaurada idéntica: 58 de 63 comprobaciones; las 4 que fallan son del instructivo (F4-01) y 1 fue del guion del revisor | — | 3 | La contraseña y el cifrado de la conexión de la cuenta del servicio (necesitan superusuario). El instructivo nuevo de la 1.0.0 |
| F6 | Revisión del receptor | En parte | r4: la capa de calles que instala el SIA contra lo que lee el SRP. r6: el instructivo leído paso por paso como lo leería el SIA, contra la guía del SIA | 0/0/1/0/0 | 3 | La revisión del propio SIA: todavía no recibe el paquete |
| G1 | Cotejo normativo | No aplica | El reporte de jornada se firma, pero no cita leyes ni normas. El pie de «Por red vial» cita un acuerdo de clasificación de vialidades como fuente de datos; se revisó en D3 contra la cita del paquete de calles, no contra su publicación oficial | — | — | — |
| G2 | Componentes compartidos | Hecha | Coordinación: `docs/FALLAS-COMPARTIDAS.md` tiene un caso, corregido; no hay casos nuevos | 0/0/0/0/0 | 5 | — |
| H1 a H7 | Operación | No hecha | Fuera de este alcance: requieren el sistema instalado y personas reales | — | — | — |

**Auditorías que no entraron en este alcance**

| Código | Última vez | Nota |
|---|---|---|
| H1 a H7 | Nunca | Las guías están en el anexo de `docs/AUDITORIA-2026-10-19.md` |
| D5 y G1 | No aplicaron tampoco el 19-10-2026 | — |
| Lo anterior a la 1.1 que no cambió | 19-10-2026 (versión 1), con su seguimiento hasta la 1.1 (`8d0cfcd`) | Sólo se revisó si lo nuevo lo tocaba |

## 4. Las 10 de mayor prioridad

Prioridad = impacto × probabilidad ÷ esfuerzo (S: hasta 2 horas, M: hasta 1 día, L: más).

| # | Clave | Gravedad | Esfuerzo | Qué |
|---|---|---|---|---|
| 1 | B6-01 | Crítica | M | Árboles del cabo de apoyo que llegan tras el cierre o tras quitarlo: rechazados para siempre; sólo se pueden eliminar |
| 2 | B2-01 | Crítica | S | «% del total» de cada calle inflado en Supervisión y en el PDF |
| 3 | B6-02 | Alta | M | La compartida (y la de relevo) no se guarda en el teléfono: al reabrir sin señal desaparece |
| 4 | B6-03 | Alta | S | Se puede eliminar una compartida con cabos de apoyo que tienen árboles sin enviar |
| 5 | B2-02 | Alta | S | «0 de 20 cabos trabajaron» con el filtro de compartidas |
| 6 | F4-01 | Alta | M | El instructivo de la 1.1 no sirve para instalar la 1.0.0 |
| 7 | E1-02 | Media | S | El relevo sigue abierto en la compartida: la titular deja de registrar y un cabo de apoyo gana permisos de titular |
| 8 | C5-01 | Media | S | Con puntos por revisar, el cierre pierde la advertencia de los cabos de apoyo |
| 9 | A1-02 | Media | S | La prueba completa se detiene por esperas fijas en los tramos 8, 84 y 85 |
| 10 | E1-01 | Media | S | «Sustituir» entrega el árbol completo a quien no lo alcanza |

## 5. Hallazgos

Totales por gravedad: **Crítica 2 · Alta 4 · Media 22 · Baja 37 · Informativa 13** (78), y 7 No confirmados en la
sección 10.

Por auditoría: A1 5 · A2 1 · A3 1 · A5 1 · A6 2 · B2 3 · B3 1 · B5 2 · B6 5 · B9 1 · C1 2 · C2 3 · C3 2 · C5 4 · C6 1 ·
D1 23 · D2 2 · D3 1 · E1 5 · E2 3 · E3 4 · F1 1 · F3 1 · F4 3 · F6 1.

**Claves.** Cada hallazgo lleva una clave nueva, con el código de su auditoría, sin prefijo de revisor. Entre
paréntesis van las claves originales de los revisores, para rastrear su evidencia. Cuando varios revisores encontraron
lo mismo, aquí es uno solo y se dice quién lo encontró y con qué reproducción. Las claves D1-01 a D1-07, A5-01 y F1-01 son de
la coordinación.

### 5.1 Críticos

#### B6-01 · Crítica · Los árboles de un cabo de apoyo que llegan después de que lo quitan o de que se cierra la jornada se rechazan para siempre; la única salida es eliminarlos
(B6-R2-01, C4-R3-01, E3-R5-01, B6-R6-01)
- **Prioridad, esfuerzo:** 1 · M.
- **Lo encontraron, cada uno por su camino:**
  - r2, al quitar al cabo: 4 de 4, dos en Chromium y dos en WebKit;
  - r3, al cerrar y reabrir la jornada: 2 de 2, más una tercera vez en otra corrida;
  - r5, al cerrar y al quitar: 2 de 2 en el navegador y 2 de 2 por la API (r5 lo calificó Alta);
  - r6, independiente: 3 de 3; de 6 árboles capturados sin señal siendo cabo vigente, llegaron 0.
- **Clasificación:** Crítica (decisión de la coordinación): pierde información capturada en campo.
- **Auditoría y etapa:** B6, también E3, C4 y C5 · antes de usar datos reales y en cada versión.
- **Dónde:** modo real; perfil Cabo de apoyo, teléfono de 390 a 412 px; ventana «Cambios que el servidor no aceptó».
  - Servidor: `servidor/src/modulos/srp/permisos.ts:119` (`jornada.registrar` pide la jornada abierta y al cabo de
    apoyo vigente), aplicada al recibir en `recepcion-arboles.ts:107-108`.
  - Aplicación: `js/cola.js:42` (el rechazo por permiso no está entre lo que se reintenta) y `js/rechazos.js:9`,
    `:38` y `:100-114` (para un alta rechazada por permiso sólo hay «Eliminar este registro»).
- **Qué pasa:**
  - Esperado, según D334 (`docs/DECISIONES.md:4432-4433`), la ventana de cierre (`js/jornada-activa.js:745`) y el
    manual del personal (§10, `docs/manual/manual-personal.html:575`; §13, `:654`): todo árbol capturado mientras el
    cabo estaba en la jornada llega a ella aunque llegue tarde; si la jornada se cerró, «se queda en su teléfono, sin
    perderse, hasta que se reabra la jornada».
  - Observado:
    - el servidor decide con la jornada como está **al recibir**: si ya se cerró o el cabo ya no está vigente,
      responde «No tiene permiso para registrar en esta jornada»;
    - el teléfono lo deja en «Revisar» con un solo botón, «Eliminar este registro»;
    - reabrir la jornada o volver a marcar al cabo no lo envía, porque el teléfono no reintenta ese rechazo, aunque
      el servidor sí lo aceptaría después de reabrir (r5, caso A4);
    - la fotografía queda esperando detrás: la pastilla dice «Con conexión · 1» indefinidamente (r2);
    - la ventana «Cabos de apoyo» no avisa nada al quitar a alguien.
- **Consecuencia:**
  - un árbol plantado y capturado, con su fotografía, no llega a la base: no tiene folio y no cuenta en el reporte,
    en Supervisión ni en Mi avance;
  - la única acción que se ve lo borra, y el mensaje habla de permisos cuando la causa es el cierre;
  - es el caso común en campo: el cabo termina sin señal, la Coordinación ve «no ha terminado su parte» (sólo un
    aviso) y cierra al final del día.
- **Cómo se reproduce** (r6, `r6/f1_compartida_sin_senal.py`):
  1. La Coordinación y dos cabos de su institución. La Coordinación inicia la jornada A con «Varios cabos» y marca a
     los dos. Cada cabo entra con señal, recibe A y registra 1 árbol, que llega.
  2. Se corta la señal a los dos cabos; cada uno registra 2 árboles.
  3. La Coordinación, con señal, quita al cabo 1 y cierra A.
  4. Vuelve la señal al cabo 2: sus 2 árboles salen rechazados. La Coordinación reabre A y el cabo 2 envía otra vez:
     siguen rechazados.
  5. Vuelve la señal al cabo 1: sus 2 árboles, capturados antes de que lo quitaran, salen rechazados. La Coordinación
     lo vuelve a marcar y él envía otra vez: siguen rechazados.
- **Evidencia:**
  - r6: `r6/f1_163145_manual.json`, `f1_163503_auto.json`, `f1_164923_manual.json` y `f1_corrida3_manual.txt` (en el
    servidor, la jornada A queda con 1 de 3 árboles de cada cabo); capturas `r6/f1_163145_c1_quitado_revisar.png`,
    `f1_163145_c1_vuelto_a_marcar_revisar.png` y `f1_163145_coord_cierre_A.png`.
  - r2: `r2/guiones/compartida_real.py`, `r2/b6-b8/corridas.log` y `compartida-*.json`; el rechazo
    `["registro.crear","SIN_PERMISO","No tiene permiso para registrar en esta jornada."]` con los botones
    `["Cerrar","Eliminar este registro"]`; capturas `r2/b6-b8/*-5-cabo3-rechazos.png`.
  - r3: `r3/s9_real_cerrada.py`, `r3/s9-1.json` y `s9-2.json` (`srv_arbol_final: {"arbol":null}` antes y después de
    reabrir); capturas `r3/capturas/s9-*-cabo2-revisar*.png`.
  - r5: `r5/e3_navegador.py` (escenarios B1 y B2), `r5/salidas/e3_navegador_1.txt` y `_2.txt`, capturas
    `r5/capturas/B1_revisar_c*.png` y `B2_revisar_c*.png`; por la API, A2 y A4 en `r5/salidas/e3_compartida_*.txt`.
- **Reproducido:** r2 4 de 4; r3 2 de 2; r5 2 de 2 en el navegador y 2 de 2 por la API; r6 3 de 3 (dos con envío
  manual y uno automático al volver la señal).
- **Causa probable:** la regla se evalúa al recibir, sin mirar cuándo se capturó el árbol (`fecha_registro`) ni el
  `desde` y `hasta` del cabo. El teléfono trata ese rechazo como definitivo. Lo que promete D334 no se programó en
  ninguno de los dos lados.
- **Corrección propuesta:** según la decisión 1 (sección 8). En cualquier opción: que «Eliminar» no sea la única
  salida, que el mensaje diga la causa (cierre o quitado) y que la ventana de cierre diga, de cada cabo vigente, que
  puede tener árboles por llegar (propuestas P-1, P-2 y P-3).
- **Listo cuando:** en `pruebas/prueba_conexion.py`, un cabo de apoyo registra 2 árboles sin señal; la Coordinación
  lo quita y cierra; al volver la señal y reabrir (o volver a marcarlo), el servidor tiene los 2 árboles en la
  jornada, a su nombre y con folio, y la cola del cabo queda vacía, o la salida que se decida, nunca sólo
  «Eliminar».
- **Estado:** Abierto · Decide el dueño (la regla).

#### B2-01 · Crítica · El «% del total» de cada calle sale inflado en Supervisión y en el informe PDF
(C4-R3-04)
- **Prioridad, esfuerzo:** 2 · S.
- **Lo encontró:** r3, 2 de 2, en teléfono y escritorio. La coordinación lo confirmó leyendo el código.
- **Clasificación:** Crítica (decisión de la coordinación; r3 la calificó Alta): da un dato falso en pantalla y en el
  informe PDF. Los conteos de árboles están bien: sólo falla la columna de porcentaje.
- **Auditoría y etapa:** B2 (encontrado en C4) · en cada versión y antes de mostrar al área.
- **Dónde:** Supervisión › «Por calle», perfil Directivo de la Secretaría, «Todo»; informe PDF › «Por red vial».
  `js/supervision.js:255` y `js/informes.js:170` aplican `conPct` (`js/supervision.js:369-371`) a las calles de una
  sola red contra el total de todos los árboles. Entró en el bloque 249 (`8486ec0`).
- **Qué pasa:**
  - Esperado: cada calle muestra árboles × 100 ÷ total, redondeado, igual que su red.
  - Observado con la demostración (22,100 árboles):
    - vialidades primarias: 93 de 210 calles dicen «1 %» con valores de 0.01 % a 0.4 %; por ejemplo, «Viaducto
      Tlalpan, 7 árboles, 1 %», que es 0.03 %. Las calles de esa red suman 93 % y la red dice 8 %;
    - calles secundarias: 87 calles mal; suman 93 % contra 73 %;
    - carreteras: sus 2 calles dicen «1 %» cada una y la red dice «0 %».
- **Consecuencia:** un dato falso en la tabla que usa la Dirección para decidir dónde reforzar: un tramo con 3 árboles
  parece pesar lo mismo que uno con 84. Sale igual en el informe PDF.
- **Cómo se reproduce:** cargar la demostración; entrar como `u-dir-1`; Supervisión, «Todo»; abrir «Por calle» y
  comparar la columna «% del total» de cada calle con sus árboles ÷ 22,100.
- **Evidencia:** `r3/s4_cifras.py`; `r3/s4-1.json` (teléfono) y `r3/s4-2-esc.json` (escritorio), clave `calles.por`,
  con `distintas`, `sumaPantalla` y `ejemplos`; captura `r3/capturas/s2-tel-sup-calles.png`.
- **Reproducido:** 2 de 2.
- **Causa probable:** `conPct` reparte el sobrante con el método del residuo mayor para que la lista sume 100.
  Aplicado a un subconjunto contra el total, el sobrante es grande y a todas las calles con residuo les toca un punto
  más.
- **Corrección propuesta:** para las listas que no suman el total, el redondeo simple (`SRP.indicadores.pct`), con
  «menos de 1 %», como ya hace `pc()` en el PDF.
- **Listo cuando:** una prueba en `pruebas/prueba.py` confirma que, en cada tabla de red, ninguna calle tiene un
  porcentaje distinto de `round(árboles × 100 ÷ total)`, en pantalla y en el PDF.
- **Estado:** Abierto.

### 5.2 Altos

#### B6-02 · Alta · La jornada compartida (y la recibida en relevo) no se guarda en el teléfono: al reabrir la aplicación sin señal desaparece de Nuevo registro
(B6-R2-02, C1-R3-02, B6-R6-03)
- **Prioridad, esfuerzo:** 3 · M.
- **Lo encontraron:**
  - r2: 2 de 2 en Chromium, más 1 vez con una jornada propia ya enviada en la corrida del service worker;
  - r3: 2 de 2, sin árbol propio y con uno ya enviado; dejó como hipótesis que al relevo le pasaba lo mismo;
  - r6, independiente: 2 de 2, cerrando el navegador y cerrando sólo la pestaña, y confirmó el caso del relevo.
- **Auditoría y etapa:** B6, también C1 y C4 · antes de usar datos reales y en cada versión.
- **Dónde:** modo real con service worker (la copia para el SIA); perfiles Cabo de apoyo y Cabo de relevo, de 390 a
  412 px; Nuevo registro. `js/remoto.js:3-7` y `:97-105` (`tomarLocales`), `js/cola.js:353-357` (`limpiar`),
  `js/jornada-activa.js:157-166`; D301 (S-11), `docs/DECISIONES.md:3635-3657`.
- **Qué pasa:**
  - Esperado: recibida una vez con señal, la jornada sigue en el teléfono y se registra en ella sin señal. Así lo
    prometen la ventana y el formulario («Cada cabo abre el sistema con señal un momento: así le llega la jornada a
    su teléfono», `index.html:262` y `:1001`), el manual del personal (§5, `:277`; §10, `:562`) y el comentario de
    `js/cola.js:353` («El cabo de apoyo guarda la jornada compartida mientras registra en ella»).
  - Observado:
    - la compartida, y la recibida en relevo, nunca se guarda en el teléfono (`unoLocal('jornadas', id)` falso en
      todas las corridas);
    - al reabrir sin señal la sesión sigue, pero no hay jornada activa, «Cambiar jornada» no tiene ninguna abierta y
      Nuevo registro enseña «Registrar jornada», sin ningún aviso;
    - el árbol que esperaba envío sigue en el teléfono;
    - el cabo **titular**, en las mismas condiciones, sigue con su jornada y registra otro árbol en ella.

    | Cabo | Jornada activa al reabrir sin señal | Puede registrar otro árbol en su jornada |
    |---|---|---|
    | De apoyo | Ninguna | No |
    | De relevo | Ninguna | No |
    | Titular | La suya | Sí |

- **Consecuencia:**
  - en un evento sin señal, cualquier cierre de la aplicación (que el sistema la descarte al bloquear el teléfono,
    al abrir la cámara o al cambiar de aplicación; en iPhone el sistema las cierra solo) deja al cabo de apoyo sin
    poder registrar en la jornada del evento;
  - la pantalla lo empuja a iniciar una jornada propia, y sus árboles quedan fuera del evento y del reporte de la
    Coordinación.
- **Cómo se reproduce:**
  1. La Coordinación abre una compartida con el cabo.
  2. El cabo entra con señal, toca «Entendido» y registra un árbol.
  3. Se corta la señal; se cierra y se vuelve a abrir la aplicación (o se recarga).
  4. Se abre Nuevo registro.
- **Evidencia:**
  - r6: `r6/f2_reabrir_sin_senal.py`, `r6/f2_163902.json` y `f2_164243.json` (`casos.*.despues`); capturas
    `r6/f2_163902_apoyo_reabierta_sin_senal.png`, `f2_163902_relevo_reabierta_sin_senal.png` y
    `f2_163902_titular_reabierta_sin_senal.png`;
  - r2: `r2/guiones/apoyo_reabre_sin_senal.py` y `r2/b6/apoyo-reabre-chromium-2.txt`
    (`{"sesion": true, "activa": null, "panelIniciar": true, "remoto": "sin-senal", "avisos": []}`); capturas
    `r2/b6/apoyo-reabre-sin-senal-chromium-*.png`;
  - r3: `r3/s8_real.py`, `r3/s8-1.json` y `s8-2.json`; capturas `r3/capturas/s8-*-cabo2-sin-senal-recargado.png`.
- **Reproducido:** r2 2 de 2 (más 1); r3 2 de 2; r6 2 de 2. En WebKit la recarga sin red con service worker falla en
  la herramienta (sección 10).
- **Causa probable:** D301 (S-11) deja lo enviado sólo en memoria. `tomarLocales` sólo pone al día las jornadas que
  ya estaban en el teléfono, y nada guarda la compartida ni la de relevo, aunque `limpiar()` está escrito para
  conservarla. El caso del relevo es anterior a la 1.1; el del cabo de apoyo es nuevo de la 1.4 y es justo el que la
  jornada compartida necesita.
- **Corrección propuesta:** según la decisión 2. La que recomiendan los tres revisores: al recibir con señal una
  jornada donde la persona es cabo de apoyo vigente o relevo, guardarla en el teléfono (sólo la jornada, sin los
  árboles de otros ni fotografías) y soltarla al cerrarse o al cerrar sesión, como ya prevé `limpiar()`.
- **Listo cuando:** una prueba con un navegador de carpeta propia: el cabo de apoyo y el de relevo reciben su
  jornada con señal, cierran, vuelven a abrir sin señal, y su jornada queda activa y acepta un árbol.
- **Estado:** Abierto · Decide el dueño (excepción a D301).

#### B6-03 · Alta · La Coordinación puede eliminar una jornada compartida mientras sus cabos de apoyo tienen árboles sin enviar
(B6-R6-02)
- **Prioridad, esfuerzo:** 4 · S.
- **Lo encontró:** r6, independiente, 3 de 3. La coordinación lo dejó aparte del Crítico, en el mismo frente.
- **Auditoría y etapa:** B6, también C4 · antes de usar datos reales.
- **Dónde:** ficha de la jornada, perfil Coordinación, «Eliminar jornada»: `js/jornadas.js:1240-1256` y
  `servidor/src/modulos/srp/recepcion-jornadas.ts:443-462`; el destino que se le ofrece al cabo:
  `js/jornadas.js:1074-1076` y `:1112`.
- **Qué pasa:**
  - Esperado: una jornada con un cabo de apoyo vigente no se elimina, o al menos se avisa de que puede tener árboles
    por llegar; lo que el cabo capturó llega a la jornada del evento.
  - Observado: el botón aparece y la ventana dice «No tiene árboles registrados. La bitácora conserva la constancia»
    (sólo cuenta lo que ya está en el servidor). Al volver la señal, los 2 árboles del cabo quedan en «Revisar» con
    «Esa jornada se eliminó en el servidor. Páselo a otra jornada suya», y «Pasar a otra jornada» le dice «No hay otra
    jornada abierta suya. Inicie una en Nuevo registro». Sólo se ofrecen jornadas donde el cabo es titular: tampoco
    podría pasarlos a otra compartida.
- **Consecuencia:** los árboles del evento acaban en una jornada personal que el cabo tiene que inventar, con otro
  nombre, otro titular y otro reporte, o se borran. El reporte del evento no los tiene.
- **Cómo se reproduce:** la Coordinación inicia la jornada B con «Varios cabos» y marca al cabo 3; el cabo la recibe
  con señal, se queda sin señal y registra 2 árboles; la Coordinación abre la ficha de B y toca «Eliminar jornada»;
  vuelve la señal al cabo 3; «Revisar» › «Pasar a otra jornada».
- **Evidencia:** capturas `r6/f1_163145_coord_eliminar_B.png`, `f1_163145_c3_con_B_eliminada_revisar.png` y
  `f1_163145_c3_mover.png`; en los JSON del frente 1, `dialogo_eliminar_B`, `c3_con_B_eliminada` y `c3_mover`.
- **Reproducido:** 3 de 3.
- **Causa probable:** la regla «sólo si no tiene árboles» mira el servidor, y desde la 1.4 una jornada puede tener
  árboles de otros teléfonos todavía en camino. `abrirMover` filtra por el cabo del árbol. (r5 comprobó que, si los
  árboles de apoyo ya llegaron, el servidor sí niega la eliminación: sección 6.)
- **Corrección propuesta:** no ofrecer «Eliminar jornada», y rechazarlo en el servidor, mientras haya cabos de apoyo
  vigentes; decir por qué y pedir quitarlos o esperar a que terminen (decisión 3 y propuesta P-4).
- **Listo cuando:** con un cabo de apoyo vigente, el botón no aparece y `jornada.eliminar` responde un rechazo con su
  motivo; sin cabos vigentes, se elimina como hoy.
- **Estado:** Abierto · Decide el dueño (impedir o sólo avisar).

#### B2-02 · Alta · Con el filtro de compartidas, Supervisión dice «0 de 20 cabos trabajaron» y Mi avance mezcla los árboles del cabo con los de toda la jornada
(C4-R3-03)
- **Prioridad, esfuerzo:** 5 · S.
- **Lo encontró:** r3, 2 de 2, en teléfono y escritorio.
- **Clasificación:** Alta (decisión de la coordinación): es un dato falso con el filtro de compartidas. La definición
  de «trabajaron» la decide el dueño.
- **Auditoría y etapa:** B2 (encontrado en C4) · en cada versión y antes de mostrar al área.
- **Dónde:** Supervisión, perfil Directivo de la Secretaría, «Todo», «Tipo de jornada: Compartidas», en teléfono y
  escritorio; Mi avance del cabo de apoyo. `js/indicadores.js:226-232` y `:264-265`.
- **Qué pasa:**
  - Esperado: «N de M cabos trabajaron» cuenta a los cabos que registraron árboles, y la tabla dice en cuántas
    jornadas trabajó cada uno.
  - Observado:
    - «0 de 20 cabos trabajaron», cuando el recálculo aparte da 17 cabos con árboles en 38 compartidas cerradas
      (3,582 árboles);
    - en «Por quién registró», por ejemplo, «Marisol Pérez Demo · 319 · — · 0 · Sin jornadas · Nada pendiente»; el
      informe PDF dice lo mismo («Jornadas 0»);
    - en Mi avance, con «Compartidas», el mismo cabo ve «109 árboles plantados · 21.8 por jornada · 5 jornadas
      cerradas · 488 de 486 previstos»: mezcla sus 109 árboles con los 488 de las jornadas y le cuenta 5 jornadas que
      Supervisión le pone en 0.
- **Consecuencia:** la Dirección lee que ningún cabo trabajó en los eventos compartidos, ve sus pendientes en «Nada
  pendiente» y no puede comparar el avance de un cabo entre perfiles. Sin el filtro, la demostración da 20 de 20 sólo
  porque cada cabo es titular de alguna jornada: en un periodo en que un cabo sólo fue de apoyo, no se le cuenta.
- **Cómo se reproduce:** cargar la demostración; entrar como `u-dir-1`; Supervisión, «Todo» y, en «Más filtros»,
  «Tipo de jornada: Compartidas».
- **Evidencia:** `r3/s4_cifras.py`, `r3/s4-1.json` y `s4-2-esc.json`; captura
  `r3/capturas/s4-1-sup-compartidas-cabos.png`; `r3/s6.json`, `r3/pdf/s6-informe-compartidas.txt` (renglones 43 a
  55) y la captura `r3/capturas/s6-cabo-mi-avance-compartidas.png`.
- **Reproducido:** 2 de 2.
- **Causa probable:** `cabosActivos` y las «Jornadas» de cada cabo cuentan a los **titulares** de las jornadas
  cerradas, y el avance usa todos los árboles de la jornada. Las reglas son anteriores a la 1.1, pero la compartida,
  donde la titular es la Coordinación, las vuelve falsas.
- **Corrección propuesta:** según la decisión 4: «cabos que trabajaron» son los cabos distintos con árboles en lo
  filtrado; las «Jornadas» de cada cabo, aquellas donde capturó al menos un árbol (titular, relevo o apoyo); el avance
  de Mi avance, con los árboles del propio cabo, o que diga «de la jornada».
- **Listo cuando:** una prueba en `pruebas/prueba.py` comprueba que, con «Compartidas», `cabosActivos` es igual al
  número de cabos distintos con árboles y que ningún renglón con árboles tiene 0 jornadas.
- **Estado:** Abierto · Decide el dueño (qué significa «trabajaron»).

#### F4-01 · Alta · El instructivo de la última entrega (1.1) no sirve para instalar la 1.0.0
(F4-R4-01, F6-R6-05, F6-R6-06, F6-R6-07)
- **Prioridad, esfuerzo:** 6 · M.
- **Lo encontraron:** r4 (17 puntos; 2 de 2 con el ensayo en seco) y r6, independiente, que lo leyó paso por paso
  como el SIA (2 de 2 en cada punto). La coordinación confirmó por lectura el nombre del guion y la falta del
  recálculo.
- **Auditoría y etapa:** F4, también F6 y D1 · antes de entregar al SIA.
- **Dónde:** `servidor/local/srp-sia/LEEME.md` (el de la entrega 1.1); el paquete provisional lo lleva tal cual,
  sólo con su renglón de versión cambiado.
- **Qué pasa:** se esperaba un instructivo que, seguido al pie de la letra, deje el SRP instalado con su calle. Falta
  o está mal:
  1. **La capa de calles, primero.** No dice que la capa de calles del esquema `territorio` (paquete de calles 1.0.0)
     se instala antes (D337), ni que el SRP la lee junto con su versión; «Lee de `territorio`» (renglón 49) sólo nombra
     las otras cuatro tablas. Tampoco dice que la cuenta de lectura del SIA debe poder leerla.
  2. **El recálculo.** No aparece `SELECT srp.recalcular_calles();` para cuando la capa llega después;
     `servidor/README.md:111` sí lo dice.
  3. **El guion de la verificación.** Los renglones 72 y 187 mandan verificar en `09-srp-rol-y-grants.sql`; hoy el 09
     es el de la calle y la cuenta va en `10-srp-rol-y-grants.sql` (`instalar.sql:7` y `:19-20`). Es el único paso que
     comprueba los permisos de la cuenta del servicio.
  4. **Lo que se verifica.** La verificación ya incluye que `srp.calle()` funcione y que `srp.recalcular_calles()`
     falle como cuenta del servicio, y no hay comprobación de que un árbol recibido traiga su calle: el instructivo no
     lo dice.
  5. **Versión.** Dice 1.1 (renglones 3, 143 y 163); debe decir 1.0.0.
  6. **«Si ya está instalada una versión anterior»** (renglones 7-10 y 151-165). Dice que sustituye a los paquetes 1 y
     1.0.5 y que «la base y los datos de arranque no cambian». Desde la 1.1 la base agregó 13 columnas a las
     plantaciones (el sitio y las 12 de la calle), la lista de cabos de apoyo, la acción `APOYO`, 3 funciones y 2
     disparadores; no hay migración, `instalar.sql` se detiene si el esquema ya existe y la versión del esquema que se
     anota sigue en «1» (`10-srp-rol-y-grants.sql:89`). D337 dice que al SIA no le ha llegado ningún paquete.
  7. **Las dos cuentas iniciales (D337):** sólo habla de «la primera Administración global».
  8. **Quién opera las cuentas:** sigue como pregunta abierta; ya está decidido (D337).
  9. **El registro de entradas:** sigue como pendiente; está decidido (un año), pero no programado: el instructivo no
     puede prometerlo hasta que exista.
  10. **Sistema interno (D337):** la pregunta sigue abierta.
  11. **El guion de vaciado** tras la prueba real (D337) no se menciona, y aún no existe.
  12. **Manuales (D338):** `manual/` lleva sólo el de la Administración; hoy son dos, en la 1.0.0.
  13. **«Lo que se verificó»** trae cifras viejas (106, 120 y 1,469 comprobaciones; renglones 211, 215 y 219) y una
      versión anterior del backend del SIA (el diff sigue aplicando sobre la actual).
  14. La jornada compartida y la Coordinación con toda su institución no se mencionan, y cambian quién ve qué.
  15. «Revertir» no dice qué pasa con la calle si se quita el SRP (la capa es del SIA y se queda).
  16. El renglón 94 dice que el archivo con placas «no va a ningún repositorio»; D325 lo manda al repositorio privado
      de la entrega.
  17. El plazo de las sesiones cerradas sigue sin decidir y se lista junto al de entradas.
- **Consecuencia:** el SIA instalaría sin calle (todos los árboles «por asignar»: la columna «Calle» del reporte,
  «Por red vial» y el CSV, vacíos) o buscaría la verificación en el guion equivocado y se la saltaría; recibiría como
  pendientes cosas ya decididas.
- **Cómo se reproduce:** `python r4/f5_ensayo_instalacion.py … --seco` revisa el instructivo del paquete; leer el
  paso 1.5 y listar `servidor/db/srp/`.
- **Evidencia:** `r4/f5_ensayo_seco.1.txt` y `.2.txt` («FALLA el LEEME nombra el guion de la cuenta srp_api que trae
  el paquete (['10-srp-rol-y-grants.sql'])», «FALLA … recalcular_calles», «FALLA … territorio.calles va primero»);
  `r6/f3_diff_paquete_vs_hoy.txt` (el paquete trae 9 guiones; hoy son 10) y `r6/f3_diff_sql.txt` (42 renglones
  distintos en el 02 y 11 en el guion de la cuenta).
- **Reproducido:** 2 de 2 (r4) y 2 de 2 (r6).
- **Causa probable:** el instructivo se escribe a mano al armar cada paquete, y D337 dejó sus cambios para el
  próximo.
- **Corrección propuesta:** reescribir el instructivo para la 1.0.0 con los 17 puntos, y que `empaquetar.py`
  compruebe que nombra cada guion de `db/srp/`, que la lista coincide con la de `instalar.sql`, y que menciona la capa
  de calles, `recalcular_calles` y la versión. La sección de actualización, según la decisión 17.
- **Listo cuando:** el ensayo en seco da 0 fallas en las comprobaciones del instructivo, y la revisión automática del
  paquete falla si el instructivo nombra un guion que no está o si `instalar.sql` incluye uno que no menciona.
- **Estado:** Abierto (se hace al armar el paquete) · Para el SIA: confirmar por escrito que no tiene nada instalado.

### 5.3 Medios

#### A1-01 · Media · El reporte que se genera desde la ficha abierta usa los árboles de cuando se abrió
(A1-R1-01)
- **Prioridad, esfuerzo:** 14 · S. **Auditoría y etapa:** A1, también B3 · en cada cambio.
- **Lo encontró:** r1. Es la falla de «Calle» del tramo 1 de la línea base.
- **Dónde:** `js/jornadas.js:1481-1485` (`irAlReporte` usa `this.jornada.registros`); la prueba,
  `pruebas/prueba.py:1050-1074`.
- **Qué pasa:** con la ficha abierta, el envío pone la calle en el almacén (4 de 4 árboles), pero la ficha conserva su
  copia (0 de 4) y el reporte sale sin la columna «Calle»: `['N.º', 'Especie', 'Precisión']`. Al reabrir la ficha, la
  columna aparece con los 5 valores. El cambio del bloque 253 («pedir el envío y esperar»,
  `docs/BITACORA.md:6621-6622`) no puede resolverlo.
- **Consecuencia:** un reporte PDF sin la columna «Calle», o con «Se asigna al enviar», aunque el dato ya esté en el
  teléfono; lo mismo con cualquier dato que llegue después de abrir la ficha (un árbol de un cabo de apoyo).
- **Cómo se reproduce:** `SRP_BASE=<app de prueba> python r1/a1/depurar_calle2.py`: entra como cabo, crea la jornada
  de 5 árboles del tramo 1, abre su ficha, envía, genera el reporte, reabre la ficha y lo genera otra vez.
- **Evidencia:** `r1/a1/depurar_calle2_salida1.txt` y `_salida2.txt`; `r1/a1/tramo_1_corrida1.json` (la falla en el
  renglón 1072); `r1/a1/depurar_calle_salida1.txt`.
- **Reproducido:** 2 de 2 con el guion y 1 de 1 en el tramo 1 completo; la línea base, 2 de 2, y GitHub falla igual.
- **Causa probable:** la ficha guarda la lista de árboles al abrirse y «Generar PDF» no la vuelve a leer.
- **Corrección propuesta:** que `irAlReporte` lea los árboles del almacén en el momento, o que la ficha se repinte
  cuando el envío cambia árboles suyos; en la prueba, quitar la dependencia del orden.
- **Listo cuando:** una prueba abre la ficha, cambia un árbol por debajo, genera el reporte y encuentra el valor
  nuevo; y `prueba.py:1072` pasa 5 de 5 en el tramo 1.
- **Estado:** Abierto.

#### A1-02 · Media · La prueba completa se detiene en los tramos 8, 84 y 85 por esperas fijas
(A1-R1-02)
- **Prioridad, esfuerzo:** 9 · S. **Auditoría y etapa:** A1 · en cada cambio.
- **Lo encontró:** r1.
- **Dónde:** `pruebas/prueba.py:113` (`iniciar_jornada` espera 0.3 + 0.5 s), `:7785` (cierra ventanas a los 1.2 s),
  `:7826`, `:2895-2897`, `:7715` y `:7764`.
- **Qué pasa:** con la demostración cargada, la jornada nueva queda activa 0.79 y 1.41 s después de tocar «Iniciar
  jornada», y el aviso «Jornada compartida» llega 4.3 y 4.0 s después de recargar. Por eso el tramo 84 no ve «Cabos
  de apoyo» (renglón 7705), el 85 se detiene en el renglón 108 o en el 7829, y el 8 queda tapado por el aviso (renglón
  2902). Con sólo las esperas cambiadas, sin tocar ninguna comprobación: tramo 84, 15 de 15; tramo 85, 19 de 19; el 8
  avanza, pero lo vuelve a tapar otra ventana más adelante (hipótesis H-2).
- **Consecuencia:** la prueba completa y GitHub quedan en rojo por tiempos, y una falla real se pierde entre ellas.
- **Cómo se reproduce:** `python pruebas/por_tramos.py --solo 8,84,85` con la app de prueba; luego
  `python r1/a1/ajustar_prueba.py` y la versión ajustada.
- **Evidencia:** `r1/a1/tramos_84_85_corrida1.*`, `tramos_54_8_corrida1.*`, `original_corrida2.*`,
  `ajustada_8_84_85.*`, `ajustada_8_84_corrida2.*`, `medir_aviso_salida.txt` y `depurar_84_salida*.txt`.
- **Reproducido:** 84, 2 de 2; 85, 2 de 2 (en dos puntos distintos); 8, 2 de 2.
- **Causa probable:** esperas de tiempo fijo escritas con poco volumen; la demostración pasó de 17,000 a 22,000
  árboles en el bloque 253, y el aviso de cabo de apoyo es nuevo del 252.
- **Corrección propuesta:** esperar condiciones (que la jornada nueva sea la activa, que terminen los avisos, que la
  tabla exista) en lugar de tiempos. Exponer una marca de «avisos de entrada terminados» ayuda (decisión 19).
- **Listo cuando:** los tramos 8, 84 y 85 pasan 3 de 3 seguidos y también con `--lento 4`.
- **Estado:** Abierto.

#### A1-03 · Media · GitHub está en rojo desde el bloque 252 sin aviso ni constancia
(A1-R1-03; también en las notas de la coordinación)
- **Prioridad, esfuerzo:** 15 · S. **Auditoría y etapa:** A1 · en cada cambio.
- **Lo encontraron:** r1 y la coordinación.
- **Dónde:** `.github/workflows/pruebas.yml` (sin paso de aviso; el renglón 4 dice que la subida «queda marcada con
  una ✗»); `docs/BITACORA.md`, bloques 252 a 255.
- **Qué pasa:** la verificación de cada subida falla desde `64536ab` (la última corrida, `dab0e0b`: 1,508
  comprobaciones, 2 fallas y el tramo 8 detenido). El flujo sólo marca la subida; las verificaciones de los bloques
  252 a 255 citan corridas locales y ninguna dice el resultado de GitHub; la del 255 no corrió la prueba completa.
- **Consecuencia:** cuatro bloques y tres versiones (1.4, 1.4.1 y 1.4.2) se cerraron con la red de seguridad apagada.
- **Cómo se reproduce:** leer el flujo y las cuatro verificaciones de la bitácora.
- **Evidencia:** los archivos citados. El estado de GitHub viene de la línea base; no se consultó GitHub desde la
  auditoría (regla de no tocar servicios externos).
- **Reproducido:** no aplica (revisión documental).
- **Causa probable:** el cierre de bloque no incluye «GitHub en verde», y el aviso depende de la configuración
  personal de notificaciones.
- **Corrección propuesta:** según la decisión 21: agregar al cierre de bloque «la corrida de GitHub del commit
  anterior, en verde», con una insignia de estado en el README.
- **Listo cuando:** la verificación de cada bloque cita el número de corrida de GitHub y su resultado.
- **Estado:** Decide el dueño.

#### A3-01 · Media · `preparar_produccion.py` falla en un clon de Windows y deja una copia a medias, ya en modo real pero con lo de prueba dentro
(A3-R1-04, B1-R2-01, F-R3-01, F4-R4-03, A3-R6-09)
- **Prioridad, esfuerzo:** 20 · S. **Auditoría y etapa:** A3, también F4 · antes de entregar.
- **Lo encontraron:** r1, r2, r3, r4 y r6, cada uno al armar su copia, 2 de 2 cada uno.
- **Clasificación:** Media (decisión de la coordinación; r2, r4 y r6 la dieron Baja), porque deja una copia a medias.
- **Dónde:** `herramientas/preparar_produccion.py:28-35` (busca el aviso de prueba con `\n`) y `:55` (el mensaje usa
  `os.path.relpath` sobre una ruta `\\?\`); el repositorio no tiene `.gitattributes`.
- **Qué pasa:** en un clon hecho con el Git de Windows por omisión (`core.autocrlf=true`), `index.html` llega con
  CRLF, no se encuentra el aviso, y al querer decirlo la herramienta se cae con `ValueError: path is on mount
  '\\?\C:', start on mount 'C:'`. La carpeta destino queda con 80 archivos y `js/config.js` ya en `ES_FICTICIO:
  false`, pero con las cuentas de prueba, la demostración y la capa ligera dentro. Desde un clon con LF funciona: 76
  archivos, dos corridas idénticas.
- **Consecuencia:** quien arme el paquete en otra computadora con Windows no puede, y si no lee el error le queda una
  carpeta «de producción» que todavía trae lo de prueba.
- **Cómo se reproduce:** clonar el repositorio en Windows sin cambiar `core.autocrlf` y correr
  `python herramientas/preparar_produccion.py <carpeta vacía>`; o `bash r1/a3/regenerar.sh`.
- **Evidencia:** `r1/a3/regenerar_salida.txt`, `r1/a3/tmp/prod1.log` y `prod2.log`; `r4/f4_preparar_produccion.txt`;
  `r6/f3_preparar_produccion_crlf.txt`.
- **Reproducido:** 2 de 2 en cada uno de los cinco revisores; desde LF, 2 de 2 bien.
- **Causa probable:** comparación de texto con `\n` fijo, falta de `.gitattributes` (el paquete de la entrega sí lo
  trae) y el prefijo de ruta larga en el mensaje.
- **Corrección propuesta:** `.gitattributes` con `* text=auto eol=lf`; leer `index.html` sin depender del fin de
  renglón; armar en una carpeta temporal y moverla al final; el mensaje con la ruta visible.
- **Listo cuando:** una prueba corre la herramienta sobre un `index.html` con CRLF y sobre uno con LF, y en los dos
  sale la misma copia; ante un error, la carpeta destino no existe.
- **Estado:** Abierto.

#### B2-03 · Media · «Por red vial»: la tabla de cada red no suma lo que dice su renglón
(B2-R1-05, C4-R3-05)
- **Prioridad, esfuerzo:** 11 · S (la regla) a M (si cambia la presentación). **Auditoría y etapa:** B2, también A2 y
  C4 · en cada versión y antes de mostrar al área.
- **Lo encontraron:** r1, en modo real, 2 de 2 combinaciones, en pantalla y PDF; r3, con la demostración, 2 de 2.
  Va junto con B2-01 en el plan.
- **Dónde:** Supervisión › «Por calle» e informe PDF › «Por red vial»; `js/indicadores.js:173-180` (la calle se
  agrupa por calle y alcaldía y toma la red de su primer árbol).
- **Qué pasa:**

  | Dónde | Red | Renglón | Suma de su tabla de calles |
  |---|---|---|---|
  | Modo real, Coordinación de la Secretaría, «Todo» (r1) | Vialidades primarias | 155 calles, 906 árboles | 912 |
  | Modo real (r1) | Calles secundarias | 1,750 calles, 6,180 árboles | 6,174 |
  | Demostración, Directivo, «Todo» (r3) | Carreteras y caminos | 2 calles, 73 árboles | 10 |
  | Demostración (r3) | Vialidades primarias | 1,861 árboles | 1,880 |
  | Demostración (r3) | Calles secundarias | 16,126 árboles | 16,170 |

  En SQL hay 158 y 1,753 calles distintas con algún árbol en cada red: 6 calles tienen árboles en las dos redes y se
  listan enteras en una sola (por ejemplo, Eje 4 Norte en Azcapotzalco, con 6 árboles en primaria y 5 en
  secundaria). Igual con «compartidas: no» y en el PDF.
- **Consecuencia:** en el informe, una cifra y la lista que la explica no suman lo mismo; con la demostración, la
  Dirección no encuentra 63 de los 73 árboles de carreteras.
- **Cómo se reproduce:** `python r1/b2/b2_real.py` (modo real) y `python r1/b2/b2_comparar.py`; o `r3/s4_cifras.py`.
- **Evidencia:** `r1/b2/b2_comparar_salida.txt`, `b2_sql_salida.txt`, `app_real.json` y `app_todo.pdf`;
  `r3/s4-1.json` y `s4-2-esc.json` (`calles.red` contra `calles.por[].arboles`).
- **Reproducido:** r1 2 de 2; r3 2 de 2.
- **Causa probable:** la llave de la calle no incluye la red: `porRed` cuenta cada árbol por la red de su tramo y
  `porCalle` manda la calle entera a la red de su primer árbol.
- **Corrección propuesta:** según la decisión 5 (recomendada: partir la calle por red).
- **Listo cuando:** una prueba con una calle de dos redes comprueba que la suma de cada lista es igual a su renglón.
- **Estado:** Decide el dueño.

#### B5-01 · Media · Una respuesta «200» con `{}` al bajar los catálogos los borra del teléfono sin aviso
(B5-R5-04)
- **Prioridad, esfuerzo:** 16 · S. **Auditoría y etapa:** B5 · en cada versión.
- **Lo encontró:** r5. El código es del bloque 221, anterior a la 1.1, y no está en los pendientes.
- **Dónde:** la entrada, todos los perfiles; `js/remoto.js:30-35` (`r.datos[t] || []` reemplaza cada catálogo con
  una lista vacía).
- **Qué pasa:** un teléfono con 79 especies y 7 programas recibe `{}` y se queda con 0 y 0; la respuesta se toma como
  buena y no hay aviso. En un teléfono nuevo, la persona entra con 0 especies.
- **Consecuencia:** el cabo no puede iniciar jornada ni elegir especie hasta volver a entrar con un servidor sano.
  Basta un intermediario que conteste un JSON vacío.
- **Cómo se reproduce:** `python r5/e3_navegador2.py <corrida> C2`.
- **Evidencia:** `r5/salidas/e3_navegador_nav2_2.txt` y `_3.txt` (línea C2b), `_1.txt` (C2 «vacío») y la captura
  `r5/capturas/C2_catalogos_vacíovacío_c1.png`.
- **Reproducido:** 2 de 2 (con catálogos) y 3 de 3 (teléfono nuevo).
- **Causa probable:** no se valida la forma de la respuesta antes de reemplazar.
- **Corrección propuesta:** reemplazar sólo si cada catálogo llega como lista y las tablas obligatorias no vienen
  vacías; si no, conservar lo que hay y avisar.
- **Listo cuando:** una prueba de `prueba_conexion.py` con `/catalogos` → `{}` deja los catálogos como estaban y
  muestra el aviso.
- **Estado:** Abierto.

#### B6-04 · Media · Con señal de nuevo, el teléfono del cabo no se entera de que lo quitaron ni de que se cerró la jornada
(B6-R6-04)
- **Prioridad, esfuerzo:** 13 · S. **Auditoría y etapa:** B6, también C5 · antes de usar datos reales.
- **Lo encontró:** r6. La jornada sigue activa 3 de 3; el árbol nuevo, rechazado al instante, 2 de 2.
- **Dónde:** Nuevo registro del cabo de apoyo, 412 px; `js/app.js:81` (lo enviado sólo se vuelve a traer si no
  estaba listo) y `js/remoto.js:84-95`.
- **Qué pasa:** lo enviado se trajo al entrar y se queda como estaba: la compartida sigue como «Jornada activa». El
  cabo quitado registra otro árbol con señal y sale rechazado al momento con «No tiene permiso para registrar en esta
  jornada», sin decir que lo quitaron o que la cerraron, cuándo ni quién.
- **Consecuencia:** el cabo sigue plantando y capturando en una jornada donde nada se va a recibir, y acumula
  rechazos que sólo puede eliminar (B6-01).
- **Cómo se reproduce:** los pasos 1 a 5 de B6-01; con la señal de vuelta, el cabo 1 registra otro árbol.
- **Evidencia:** en los JSON del frente 1 de r6, `c1_quitado.activa`, `c2_con_A_cerrada.activa` y
  `c1_quitado_con_senal_registra` (`guardado: true`, rechazo al instante).
- **Reproducido:** 3 de 3 y 2 de 2.
- **Causa probable:** lo enviado se trae una vez por sesión, y el rechazo no dispara la puesta al día de la jornada
  que ya existe para la Coordinación.
- **Corrección propuesta:** ante un rechazo por permiso de un alta, traer la jornada al día, sacarla de Nuevo registro
  si ya no puede registrar y decir por qué (propuesta P-7).
- **Listo cuando:** tras quitar al cabo y volver su señal, su primer envío deja Nuevo registro sin esa jornada y con un
  aviso que dice que la Coordinación lo quitó o cerró la jornada.
- **Estado:** Abierto.

#### C1-01 · Media · La franja de la Coordinación no dice que su jornada es compartida ni cómo van sus cabos
(C1-R3-08)
- **Prioridad, esfuerzo:** 22 · S. **Auditoría y etapa:** C1, también C2 · al terminar pantallas.
- **Lo encontró:** r3, 2 de 2 (en escritorio sí se ve «· compartida», pero no los cabos).
- **Dónde:** Nuevo registro, franja de la jornada activa, Coordinación, 390×844; `js/jornada-activa.js:496`; en el
  teléfono `.franja-jornada-datos` va oculta (`css/estilos.css:1370`).
- **Qué pasa:** la pregunta de trabajo es «¿quién de mis cabos sigue registrando y cuántos lleva cada uno?». La franja
  sólo dice «Plaza cívica · El Mirador / 10 de 60 árboles»; el «· compartida» va escondido en «Ver detalle». Para
  saber quién terminó hay que abrir «Cabos de apoyo», que no dice cuántos árboles lleva cada quien, o empezar a
  cerrar. El cabo de apoyo, en cambio, sí ve «Jornada compartida · coordina … · 3 suyos».
- **Consecuencia:** la Coordinación tiene que recordar a quién agregó y salir del registro para saber cómo van.
- **Cómo se reproduce:** entrar como `u-demo-k1` y abrir Nuevo registro.
- **Evidencia:** captura `r3/capturas/s1-tel-08-estela-franja.png`; `r3/s1-tel.json` (`estela_franja`).
- **Reproducido:** 2 de 2.
- **Causa probable:** la franja se diseñó para la jornada de una persona.
- **Corrección propuesta:** propuesta P-8.
- **Listo cuando:** en una compartida, la franja de la Coordinación dice cuántos cabos de apoyo siguen y cuántos
  terminaron, también en el teléfono.
- **Estado:** Abierto · propuesta de pantalla para aprobar.

#### C3-01 · Media · En la ventana «Cabos de apoyo», «Guardar» queda fuera de la pantalla y la lista no tiene búsqueda
(C3-R3-07)
- **Prioridad, esfuerzo:** 21 · S. **Auditoría y etapa:** C3, también C1 · al terminar pantallas.
- **Lo encontró:** r3, 2 de 2 (teléfono y escritorio).
- **Dónde:** ventana «Cabos de apoyo» y formulario «¿Quién registra en esta jornada?», perfil Coordinación.
- **Qué pasa:**

  | Dónde | Cabos en la lista | Alto | «Guardar» empieza en |
  |---|---|---|---|
  | Ventana, teléfono (812 px visibles) | 7 | 1,140 px | 1,076 px |
  | Ventana, escritorio (900 px) | 7 | 931 px | 867 px, cortado |
  | Formulario con «Varios cabos», teléfono | 7 | 1,616 px | — |
  | Formulario, modo real | 12 | 1,763 px | — |

  Entre la lista y el botón van 6 pasos de instrucciones (unas 90 palabras). No hay búsqueda ni orden por «últimos
  usados», y no se ve qué cabo ya tiene otra jornada abierta hoy.
- **Consecuencia:** hay que desplazarse para guardar, cada vez; con 30 o 40 cabos, encontrar a 5 obliga a buscar a
  ojo.
- **Cómo se reproduce:** entrar como `u-demo-k1`, ir a Nuevo registro y tocar «Cabos de apoyo».
- **Evidencia:** `r3/s1-tel.json` y `s1-esc.json` (`apoyos_alto_visible`); capturas
  `r3/capturas/s1-tel-09-apoyos.png`, `s1-esc-09-apoyos.png` y `s8-1-coord-varios.png`.
- **Reproducido:** 2 de 2.
- **Causa probable:** el botón está al final del contenido desplazable, después de las instrucciones.
- **Corrección propuesta:** propuesta P-9.
- **Listo cuando:** con 30 cabos, a 390×844, «Guardar» está a la vista sin desplazarse.
- **Estado:** Abierto · propuesta de pantalla para aprobar.

#### C5-01 · Media · Con puntos por revisar, el cierre de una compartida pierde la advertencia de los cabos de apoyo
(C5-R3-06, C5-R6-08)
- **Prioridad, esfuerzo:** 8 · S. **Auditoría y etapa:** C5, también C2 · al terminar pantallas y antes de usar
  datos reales.
- **Lo encontraron:** r3 (Media, 2 de 2) y r6 (Baja, 3 de 3). Se deja Media: es la única advertencia que tiene la
  Coordinación sobre los árboles en camino (B6-01) y el caso, con puntos por revisar, es común.
- **Dónde:** «Cerrar jornada» de la Coordinación, teléfono y escritorio; `js/jornada-activa.js:741-746`.
- **Qué pasa:** sin puntos por revisar, la ventana dice «Se puede cerrar de todos modos. Si después llegan árboles de
  un cabo de apoyo, se quedan en su teléfono hasta que se reabra la jornada». Con un punto por revisar, esa nota se
  reemplaza por «Puede revisarlo ahora o cerrar de todos modos y revisarlo después» y la advertencia desaparece.
- **Consecuencia:** se cierra sin saber que lo que falta por llegar de los cabos se atora. Además, la nota que
  desaparece promete algo que hoy no pasa (B6-01).
- **Cómo se reproduce:** en la compartida de `u-demo-k1`, con un árbol lejos de los demás, tocar «Cerrar jornada»;
  o el paso 3 de B6-01 con árboles sin revisar.
- **Evidencia:** `r3/s1-tel.json` (`cerrar_dialogo`), captura `r3/capturas/s1-tel-10-cerrar-pendientes.png` y
  `r3/s10.json`; `dialogo_cierre_A` en los tres JSON del frente 1 de r6 y la captura
  `r6/f1_163145_coord_cierre_A.png`.
- **Reproducido:** 2 de 2 (r3) y 3 de 3 (r6).
- **Causa probable:** `Object.assign({ …, nota: … }, revisar)`: la nota de la revisión sobrescribe la de los cabos.
- **Corrección propuesta:** juntar las dos notas, con el texto que salga de la decisión 1 (propuesta P-2).
- **Listo cuando:** `confirmacionCierre()` con cabos vigentes y un punto por revisar contiene las dos notas.
- **Estado:** Abierto.

#### C5-02 · Media · Un mismo papel tiene tres nombres: «Coordinación», «coordinación» y «Coordinador»
(C5-R3-09)
- **Prioridad, esfuerzo:** 24 · S. **Auditoría y etapa:** C5 · al terminar pantallas.
- **Lo encontró:** r3, 2 de 2 (teléfono y escritorio). Relacionados: D1-15 y D1-18, en el manual.
- **Dónde y qué dice:**
  - «Coordinación»: el aviso de compartida y «Terminar mi parte» (`js/jornada-activa.js:846-873`), las instrucciones
    (`index.html:996-1001`) y la ficha («Estela Ramírez Demo (Coordinación)», `js/jornadas.js:775`);
  - «coordinación»: la lista «Encargado» del cierre y el filtro «Quién registró» (`js/util.js:435`); el manual del
    personal la escribe así 27 veces;
  - «Coordinador»: la etiqueta del perfil (`js/permisos.js:13`), el menú de la cuenta, Usuarios, el historial y el PDF
    del reporte («Generado por … (Coordinador).»);
  - lo mismo con «Directivo» y «Dirección» en el manual.
- **Qué pasa:** el criterio de C5 pide un término por concepto; en una misma jornada se leen tres.
- **Consecuencia:** la persona lee tres nombres para el mismo papel.
- **Cómo se reproduce:** recorrer la compartida como Coordinación y generar su reporte.
- **Evidencia:** `r3/s1-tel.json` (`cierre`, `previa`), `r3/pdf/s1-tel-reporte.txt` (página 3) y `r3/s3-tel.json`
  (`registros_selects_u-demo-k1`).
- **Reproducido:** 2 de 2.
- **Causa probable:** la etiqueta del perfil es anterior a los textos nuevos de la 1.4.
- **Corrección propuesta:** según la decisión 6 (recomendada: «Coordinación» en todo).
- **Listo cuando:** `pruebas/auditoria.py` no encuentra a la vez «(coordinación)», «(Coordinación)» y
  «(Coordinador)» en la interfaz y en el PDF.
- **Estado:** Decide el dueño.

#### D1-01 · Media · El README describe la dependencia del cabo con «uno o varios coordinadores», que ya no existe
(coordinación)
- **Prioridad, esfuerzo:** 27 · S. **Auditoría y etapa:** D1 · antes de cerrar la etapa.
- **Dónde:** `README.md:50` («El cabo depende de uno o varios coordinadores de su misma institución») y `README.md:99`
  (los «`coordinadores_ids` (una lista) en las cuentas»).
- **Qué pasa:** desde la 1.4 (D333) la Coordinación trabaja con toda su institución y el campo no se usa.
- **Consecuencia:** quien lea el README, el SIA incluido, entiende una regla de acceso que ya no aplica.
- **Cómo se reproduce:** leer los renglones citados contra D333 (`docs/DECISIONES.md:4399`) y `js/permisos.js`.
- **Evidencia:** los archivos y renglones citados.
- **Reproducido:** no aplica (revisión documental).
- **Causa probable:** D333 cambió la regla y el README no se actualizó.
- **Corrección propuesta:** describir la regla de D333 y quitar la mención del campo (o marcarlo sin uso, según la
  decisión 18).
- **Listo cuando:** una búsqueda de «coordinadores» en el README sólo da usos vigentes.
- **Estado:** Abierto.

#### D1-02 · Media · Un documento que lee el SIA describe reglas del servidor que ya no se aplican
(coordinación)
- **Prioridad, esfuerzo:** 26 · S. **Auditoría y etapa:** D1, también F6 · antes de entregar.
- **Dónde:** `docs/FASE2-Y-TRASPASO.md:95` (fila 14) y `:99` (fila 18).
- **Qué pasa:** describen, con los coordinadores de cada cuenta, «el alcance de su cuadrilla» y el relevo «hacia un
  cabo activo de su cuadrilla». El servidor ya no las aplica:
  `servidor/src/modulos/srp/recepcion-jornadas.ts:355-359` sólo pide un cabo activo de la institución.
- **Consecuencia:** el SIA revisaría una regla de acceso que no es la que corre.
- **Cómo se reproduce:** leer las dos filas contra el código citado.
- **Evidencia:** los archivos y renglones citados.
- **Reproducido:** no aplica (revisión documental).
- **Causa probable:** D333 no se llevó a este documento.
- **Corrección propuesta:** reescribir las dos filas con la regla de la institución.
- **Listo cuando:** cada regla de la tabla tiene su renglón de código y coincide.
- **Estado:** Abierto.

#### D1-08 · Media · El manual del personal dice que «Ver detalle» abre la ficha de la jornada, y no la abre
(MAN-R3-01)
- **Prioridad, esfuerzo:** 28 · S. **Auditoría y etapa:** D1, también C5 · antes de cerrar la etapa.
- **Lo encontró:** r3, 2 de 2.
- **Dónde:** `docs/manual/manual-personal.html:344` (§6, «La jornada activa»); `js/jornada-activa.js:68` y `:461-467`;
  `css/estilos.css:577` y `:1369`.
- **Qué pasa:** el manual dice que «Ver detalle» abre la ficha de la jornada en Jornadas. En la aplicación sólo
  despliega la tarjeta (fecha, lugar y pasos) y el botón cambia a «Ocultar detalle»; en la computadora el botón no
  existe.
- **Consecuencia:** quien siga el manual no encuentra la ficha por ese camino.
- **Cómo se reproduce:** en el teléfono, tocar «Ver detalle» en la franja de la jornada activa.
- **Evidencia:** `r3/manuales/sondeo2/sondeo2.json` (la vista sigue en «registrar»).
- **Reproducido:** 2 de 2.
- **Causa probable:** el manual describe una versión anterior del botón.
- **Corrección propuesta:** decir que despliega los datos de la jornada; para la ficha, la pestaña Jornadas.
- **Listo cuando:** la revisión de citas del manual (`r3/manuales/citas.py`) no encuentra diferencias en §6.
- **Estado:** Abierto.

#### D1-09 · Media · El manual no dice lo que la aplicación advierte al cerrar con cabos de apoyo, ni qué hacer con un árbol rechazado
(MAN-R3-02)
- **Prioridad, esfuerzo:** 23 · S. **Auditoría y etapa:** D1 · antes de usar datos reales.
- **Lo encontró:** r3, 2 de 2.
- **Dónde:** `docs/manual/manual-personal.html:654` (§13, «Al cerrar»), `:490` (§9) y `:576` (§10).
- **Qué pasa:** el manual sólo dice que el cierre «avisa, no impide… se puede cerrar de todos modos». No dice lo que
  la aplicación advierte (los árboles que lleguen después, `js/jornada-activa.js:745`), y al cabo de apoyo no le dice
  qué hacer si su árbol queda rechazado (B6-01).
- **Consecuencia:** la Coordinación cierra sin saber el efecto en los árboles en camino.
- **Cómo se reproduce:** comparar las secciones citadas con la ventana de cierre.
- **Evidencia:** `r3/manuales/afirmaciones.txt` y `citas.txt`.
- **Reproducido:** 2 de 2.
- **Causa probable:** el manual se escribió con la regla prometida en D334.
- **Corrección propuesta:** agregar la advertencia y, cuando se corrija B6-01, el paso para el cabo.
- **Listo cuando:** el manual dice lo mismo que la ventana de cierre corregida.
- **Estado:** Abierto (depende de la decisión 1).

#### D3-01 · Media · La cita obligatoria de la capa de calles va incompleta en Supervisión y en el informe
(D3-R1-06)
- **Prioridad, esfuerzo:** 18 · S. **Auditoría y etapa:** D3 · antes de mostrar al área y antes de entregar.
- **Lo encontró:** r1, 2 de 2 (PDF de «Todo» y de «compartidas: no»).
- **Dónde:** `js/calles.js:100-106` (`nota`), usada en `js/informes.js:178` y `js/supervision.js:264`.
- **Qué pasa:** las condiciones de uso del paquete de calles y `README.md:499-504` piden la cita completa: «(INEGI,
  SICT, IMT)», «Portal de Datos Abiertos de la Ciudad de México» y «SEDEMA unió, partió y clasificó los tramos, y
  homologó sus nombres; esas transformaciones no son del INEGI ni de SEMOVI, ni están respaldadas por ellos». En el
  PDF del informe va la nota abreviada, sin ninguna de esas tres partes. El CSV, con 4 columnas de la capa, no lleva
  cita.
- **Consecuencia:** el informe que sale de la Secretaría no cumple la condición de uso de la capa (la licencia CC BY
  4.0 exige indicar los cambios).
- **Cómo se reproduce:** generar el informe PDF de Supervisión y buscar «Elaborada por SEDEMA».
- **Evidencia:** `r1/b2/app_todo.pdf`; `assets/calles/indice.json` sí trae la cita completa, igual que
  `herramientas/generar_calles.py:30-33`.
- **Reproducido:** 2 de 2.
- **Causa probable:** la nota se escribió corta para el pie y no se tomó del índice.
- **Corrección propuesta:** que `nota()` use la cita del índice; una línea de cita en el CSV (propuesta P-15).
- **Listo cuando:** una prueba compara el pie del PDF con la cita del índice y la encuentra completa.
- **Estado:** Abierto.

#### E1-01 · Media · «Sustituir» entrega el árbol completo a quien no lo alcanza, si está eliminado o ya sustituido
(E1-R4-01)
- **Prioridad, esfuerzo:** 10 · S. **Auditoría y etapa:** E1 (control de acceso, ASVS 4.1.3 y 4.2.1) · antes de usar
  datos reales.
- **Lo encontró:** r4, 2 de 2 con 3 cuentas cada vez; la coordinación lo confirmó por lectura. Es anterior a la 1.1
  (igual en `8d0cfcd`) y no estaba en la auditoría del 19-10.
- **Dónde:** `servidor/src/modulos/srp/recepcion-arboles.ts:293-296`: el árbol se devuelve en `otras` antes de
  revisar el permiso de sustituir.
- **Qué pasa:** se espera un rechazo por permiso, sin datos. Un cabo de otra institución (o de la misma, sin alcance)
  manda la sustitución de un árbol eliminado y recibe «ya no se puede sustituir» con el árbol entero: 42 campos, entre
  ellos su punto, su cabo, su folio y sus comentarios.
- **Consecuencia:** un registro de otra institución, con el texto libre de sus comentarios, sale a quien no debe
  verlo. Hace falta conocer el identificador del árbol, que es aleatorio: por eso no es Crítica.
- **Cómo se reproduce:** con cuentas de prueba, un cabo registra un árbol y lo elimina; un cabo de otra institución
  manda la sustitución con el identificador de ese árbol.
- **Evidencia:** `r4/e1_acceso.1.txt` y `.2.txt`, casos 129 a 131 (cabo y Coordinación de otra institución, y cabo de
  la misma sin alcance).
- **Reproducido:** 2 de 2.
- **Causa probable:** el aviso de «ya no se puede sustituir» se pensó para el dueño del árbol, que lo necesita al día.
- **Corrección propuesta:** revisar el permiso (al menos el alcance) antes de devolver nada; a quien no lo alcanza,
  el rechazo sin datos (decisión 10).
- **Listo cuando:** una prueba de `servidor/pruebas/recepcion.test.js` con un cabo de otra institución recibe el
  rechazo por permiso y ningún árbol.
- **Estado:** Abierto.

#### E1-02 · Media · El relevo sigue abierto en la jornada compartida: la titular deja de registrar y un cabo de apoyo gana permisos de titular
(E3-R5-03, E1-R4-06)
- **Prioridad, esfuerzo:** 7 · S. **Auditoría y etapa:** E1 (control de acceso), también E3 · antes de usar datos
  reales.
- **Lo encontraron:** r5 (Media, 2 de 2 en cada variante) y r4 (Informativa, casos 120 a 126, 2 de 2). Se deja Media
  (decisión de la coordinación).
- **Dónde:** `servidor/src/modulos/srp/permisos.ts:121` (`jornada.relevo` no excluye las compartidas) y `:81-82`
  (la restricción de cabo de apoyo deja de valer para quien estuvo en un relevo); `js/jornadas.js:795` (el botón
  «Relevo de cabo» sólo se oculta a la Coordinación titular).
- **Qué pasa:**
  - Esperado (`docs/DECISIONES.md:4429-4431`): en la jornada de la Coordinación, «Cabos de apoyo» ocupa el lugar de
    «Relevo de cabo», y el cabo de apoyo «no cambia sus datos ni la cierra».
  - Observado:
    - el relevo de la titular a otro cabo se acepta, y la titular ya no registra en su propia jornada;
    - tras un relevo a un cabo de apoyo y su devolución, ese cabo renombra y cierra la jornada de la Coordinación;
    - otra Coordinación de la misma institución hace el relevo desde la ficha y lo devuelve; después, el cabo de
      apoyo elimina la jornada.
- **Consecuencia:** la jornada compartida queda en manos de quien no la coordina: un cabo de apoyo puede cambiar el
  nombre, la fecha o el programa de todos los árboles, cerrarla o eliminarla, y la titular puede quedarse sin
  registrar por la acción de otra Coordinación.
- **Cómo se reproduce:** `node r5/e3_relevo_otra_coord.mjs 1`; la parte A5 de `r5/e3_compartida.mjs`; los casos 120 a
  126 de `r4/e1_acceso.mjs`.
- **Evidencia:** `r5/salidas/e3_relevo_otra_coord_1.txt` y `_2.txt`; `r5/salidas/e3_compartida_1.txt` y `_2.txt`
  (A5, con la bitácora: 3 renglones de relevo, «EDITADO · R5 cabo1 · Campos: nombre» y «Jornada cerrada»);
  `r4/e1_acceso.1.txt` y `.2.txt`.
- **Reproducido:** 2 de 2 (r5, en cada variante) y 2 de 2 (r4).
- **Causa probable:** la regla del relevo es anterior a la compartida y no se ajustó en el servidor; la pantalla la
  esconde sólo a la titular.
- **Corrección propuesta:** según la decisión 8 (recomendada: rechazar el relevo en las compartidas, en el servidor y
  en `js/permisos.js`).
- **Listo cuando:** la prueba que compara permisos tiene un caso donde el relevo en una compartida se rechaza, y un
  cabo con historia de apoyo nunca obtiene `jornada.editar` ni `jornada.eliminar`.
- **Estado:** Decide el dueño.

#### E3-01 · Media · Un reenvío de «Cabos de apoyo» o de «Terminar mi parte» deshace lo que hizo la otra persona
(E3-R5-02)
- **Prioridad, esfuerzo:** 12 · M. **Auditoría y etapa:** E3, también E2 · antes de usar datos reales.
- **Lo encontró:** r5, 2 de 2 en el navegador y 2 de 2 por la API, en los dos sentidos.
- **Dónde:** perfiles Coordinación y Cabo de apoyo. `servidor/src/modulos/srp/recepcion-jornadas.ts:396-400` (el
  cambio se decide con el estado del momento, sin saber qué estado conocía el teléfono) y `:427` (terminar se
  reconoce como repetido sólo si el cabo no está vigente); `js/cola.js:14-15` y `:173` (lo que salió sin respuesta se
  reenvía tal como salió).
- **Qué pasa:**
  - Esperado: D334 dice que compartir lleva sólo los cabos que entran y salen «para no deshacer lo que un cabo hizo
    mientras tanto» (`docs/DECISIONES.md:4436-4437`), y un reenvío de algo ya aplicado no se repite
    (`recepcion.ts:37`).
  - Observado: «Guardar» de «Cabos de apoyo» llega al servidor, pero la respuesta se pierde; mientras, el cabo 1 toca
    «Terminar mi parte» y queda terminado; al volver la señal, el teléfono de la Coordinación reenvía y el cabo 1 queda
    **vigente otra vez**, con otro «Agrega» en la bitácora. Al revés, un «Terminar mi parte» reenviado termina al cabo
    que la Coordinación acababa de volver a marcar.
- **Consecuencia:** un cabo que ya terminó aparece como «no ha terminado su parte» al cerrar y vuelve a poder
  registrar; la bitácora dice dos veces que lo agregaron. Basta un corte de señal o una respuesta de más de 20 s
  (`js/servidor.js:28`).
- **Cómo se reproduce:** `python r5/e3_navegador.py <corrida> B3`; por la API, A13 y A13b de `r5/e3_compartida.mjs`.
- **Evidencia:** `r5/salidas/e3_navegador_1.txt` y `_2.txt`, línea B3 (`[cabo1, null] → [cabo1, "terminado"] →
  [cabo1, null]`); la bitácora de A13 en `r5/salidas/e3_compartida_1.txt` y `_2.txt`.
- **Reproducido:** 2 de 2 y 2 de 2.
- **Causa probable:** las dos operaciones no traen una marca que permita reconocer un reenvío.
- **Corrección propuesta:** según la decisión 7 (recomendada: cada cambio de cabo lleva el `desde` que conocía el
  teléfono).
- **Listo cuando:** una prueba del servidor manda compartir con el cabo 1, luego su «Terminar mi parte» y luego el
  mismo compartir otra vez: el cabo 1 sigue terminado y hay un solo «Agrega»; lo simétrico para terminar.
- **Estado:** Decide el dueño.

#### F3-01 · Media · `npm audit`: un aviso alto (body-parser) y uno moderado (qs) en lo que corre en el servidor
(F3-R4-01)
- **Prioridad, esfuerzo:** 25 · S. **Auditoría y etapa:** F3 · antes de entregar.
- **Lo encontró:** r4, 1 de 1 (es una consulta).
- **Dónde:** `servidor/package-lock.json`. Según su lista de dependencias, el backend del SIA trae versiones dentro
  del mismo rango, y el módulo, ya instalado, corre con las de allá.
- **Qué pasa:** 3 avisos: alto, body-parser GHSA-27r3-jxmh-p828 (negación de servicio con bytes de más después de un
  cuerpo comprimido; corregido en 2.4.0); moderado, qs GHSA-6pq8-jhm2-2vcw; bajo, esbuild GHSA-g7r4-m6w7-qqqr (sólo
  su servidor de desarrollo, en Windows). El 19-10 había 1 (esbuild). El módulo lee JSON antes de la sesión, así que
  la entrada lo usa sin cuenta.
- **Consecuencia:** posible caída del backend con una petición armada, sin cuenta. No se probó el ataque.
- **Cómo se reproduce:** `npm audit --json` en `servidor/`.
- **Evidencia:** `r4/f3_npm_audit.json` y `r4/f3_npm_audit.resumen.txt`.
- **Reproducido:** 1 de 1.
- **Causa probable:** avisos publicados después de la última revisión.
- **Corrección propuesta:** el SIA actualiza en su backend (componente compartido); el SRP, en su `servidor/` de
  pruebas, cuando usted lo apruebe, comprobando que las salidas quedan iguales (decisión 15).
- **Listo cuando:** `npm audit` sin avisos altos en los dos.
- **Estado:** Para el SIA.

#### F4-02 · Media · `empaquetar.py` no se detiene ante un `.env` con contraseña, respaldos de base, listas con claves ni archivos de prueba
(F4-R4-02)
- **Prioridad, esfuerzo:** 17 · S. **Auditoría y etapa:** F4 · antes de entregar.
- **Lo encontró:** r4, 2 de 2.
- **Dónde:** `herramientas/empaquetar.py:22` y `:24` (las listas de lo sospechoso y de los archivos de trabajo).
- **Qué pasa:** se plantaron 6 archivos en una copia del paquete provisional y los 6 entraron al ZIP: un `.env` con
  una contraseña y un servidor, un respaldo de base, un CSV con columna «clave», la carpeta de un editor, una captura
  y un archivo de datos de prueba. Sólo se detuvo con la palabra «password». Tampoco busca nombres de servidor,
  `@ejemplo.local` ni las cuentas de prueba.
- **Consecuencia:** un descuido al armar la entrega puede mandar al SIA, y al repositorio privado, una contraseña o
  un respaldo con datos.
- **Cómo se reproduce:** copiar el paquete provisional, plantar los archivos, correr `empaquetar.py` y listar el ZIP.
- **Evidencia:** `r4/f4_empaquetar_huecos.txt` («126 archivos en el manifiesto» y la lista de los 6 dentro del ZIP).
  Los archivos plantados no se copian a esta evidencia.
- **Reproducido:** 2 de 2.
- **Causa probable:** las listas cubren respaldos de editor y contraseñas en inglés o «contraseña», no `_PASS`,
  «clave», `.env`, `.dump`, `.sql.gz`, `.backup`, carpetas de editor ni la lista de archivos de prueba.
- **Corrección propuesta:** ampliar las dos listas y que importe la lista de archivos de prueba de
  `preparar_produccion.py` para detenerse si alguno aparece.
- **Listo cuando:** una prueba planta esos 6 archivos y `empaquetar.py` sale con error en cada uno.
- **Estado:** Abierto.

#### F6-01 · Media · El SRP lee la versión de la capa de calles de una tabla distinta de la que el SIA usa para registrar capas
(F6-R4-01)
- **Prioridad, esfuerzo:** 19 · S. **Auditoría y etapa:** F6, también F4 · antes de entregar.
- **Lo encontró:** r4, 2 de 2 (lectura de código y consulta). No es una falla de un componente del SIA: es una
  diferencia de integración entre el paquete de calles, el SRP y la forma en que el SIA registra sus capas
  (coordinación).
- **Dónde:** `servidor/db/srp/09-srp-calles.sql:35` y `:81` leen la versión de la tabla de versiones del paquete de
  calles. Para alcaldías, colonias y UGA, el SRP la lee de la tabla de versiones de capas del SIA
  (`04-srp-sobre-territorio.sql:79`, con su marca de vigente). La versión más reciente del backend del SIA instala el
  paquete de calles tal cual y además registra la capa en su tabla de versiones.
- **Qué pasa:** coinciden las tablas, las columnas que usa `srp.calle()`, el índice espacial, los 178,771 tramos y el
  permiso de lectura. No coincide la fuente de la versión. Hoy las dos dicen 1.0.0 y funciona; si el SIA marca una
  versión como no vigente o registra otra sólo en su tabla, el SRP seguiría con la otra y `recalcular_calles()` no
  recalcularía.
- **Consecuencia:** después de una actualización de la capa, árboles con la calle de una versión que el SIA ya no da
  por vigente, sin aviso.
- **Cómo se reproduce:** comparar `09-srp-calles.sql` con la instalación de calles del backend del SIA (sólo
  lectura); en la base local, la tabla de versiones de capas no trae la de calles y el SRP funciona igual.
- **Evidencia:** `r4/f6_receptor.txt`.
- **Reproducido:** 2 de 2.
- **Causa probable:** el SRP se escribió sobre el paquete de calles antes de saber cómo lo registraría el SIA.
- **Corrección propuesta:** según la decisión 11.
- **Listo cuando:** una prueba cambia la versión vigente en la tabla del SIA y `srp.calle()` devuelve esa versión.
- **Estado:** Decide el dueño · Para el SIA (confirmar su regla para actualizar capas).

### 5.4 Bajos

| Clave | Gravedad | Dónde | Qué pasa | Corrección propuesta |
|---|---|---|---|---|
| A1-04 (A1-R1-08, I-R5-11; lo vio también r2) | Baja | `pruebas/apoyo_servidor.mjs:105` y `servidor/pruebas/apoyo.js:31`; `servidor/pruebas/esquema.test.js`; `servidor/pruebas/recepcion.test.js:445-450` | Las pruebas del servidor y su apoyo cambian cosas compartidas de la base: «quitar» le quita el rol del servicio a la cuenta local (deja sin servicio a todo el que la use; pasó hoy con cinco revisores), `npm test` destruye y reinstala el esquema, y una prueba renombra la capa de calles. Por eso no se pudo medir la cobertura del servidor | Prestar el rol sólo si no se tenía y devolver sólo lo prestado; una base propia para `npm test` |
| A2-01 (A2-R1-07) | Baja | `js/calles.js:149-185` contra `servidor/db/srp/09-srp-calles.sql:20-48` | Mismas reglas, distinta aritmética: de 33,808 puntos, 801 difieren (2.4 %) y las 801 se explican (667 por el redondeo de 1 m, 81 por tramos a menos de 10 cm, 50 en el borde de 4 m y 3 en el de 40 m); en 33 cambia el nombre de la calle (0.1 %) y en 4 la red. 2 de 2 | Documentar la diferencia (decisión 20) y dejar el comparador como prueba con un umbral |
| A5-01 (coordinación) | Baja | `pruebas/revisar.py:77` | Guarda sus 8 capturas (`rev_*.png`) en la carpeta desde donde se corre. Corrida desde la raíz del proyecto, como al tomar la línea base, las deja ahí, sin seguimiento y fuera de `.gitignore`: un `git add .` las subiría al repositorio público. Ya pasó en la copia de la auditoría anterior. 2 de 2 | Guardarlas en una carpeta temporal o en `pruebas/salidas/`, y agregar `rev_*.png` a `.gitignore` |
| A6-01 (A6-R2-01) | Baja | Nuevo registro, mapa; `js/mapa.js:299-304` | El círculo de precisión del GPS (1.5 px) queda bajo 3:1 (WCAG 1.4.11): de 1.06 a 2.74 en el Centro; en «Calles», Centro, nivel «Baja», 75 de 75 muestras bajo 3:1. El nivel también se dice en texto. 2 de 2 | Un halo blanco de 1 px bajo el trazo y trazo de 2.5 px (propuesta P-19) |
| B3-01 (B3-R1-12) | Baja | `docs/manual/Manual-Personal-SRP.pdf` (35 páginas) y `Manual-Administracion-SRP.pdf` (24) | Traen título, autor y «1.0.0» (D338 se cumple), pero no declaran idioma, ni estructura etiquetada, ni marcadores; los PDF que genera la aplicación sí declaran `es-MX`. 2 de 2 | Que `manual_pdf.py` conserve las etiquetas y escriba el idioma y los marcadores |
| B5-02 (B5-R5-05) | Baja | Entrada; `js/sesion.js:90-93` y `js/remoto.js:32` | Con catálogos dañados sale «No se pudo entrar (listas[t].forEach is not a function)»; con un JSON cortado, «Falta corregir 1 dato · … falta conexión con el servidor», cuando no falta ningún dato y la conexión estaba. 3 de 3 | Un mensaje claro y sin nombres internos (propuesta P-17) |
| B6-05 (B6-R2-03) | Baja | Sólo con datos de prueba; `js/envio.js:171` y `js/calles.js:41` | Con señal mala, si las celdas de calles no bajan, el árbol se da por enviado sin calle y su detalle dice «Se asigna al enviar»; no la recibe al volver la red ni al recargar, sólo con otro envío. Con datos reales la calle la pone el servidor. 2 de 2 | Asignar las calles pendientes también al volver la red y al abrir |
| C1-02 (C1-R3-13) | Baja | Detalle del registro, renglón «Calle»; `js/calles.js:38-46` | «Calle secundaria · Alcaldía Xochimilco» se lee como la alcaldía del árbol, que va en otro renglón; el reporte, Supervisión y el CSV sí dicen «Quién la atiende». 2 de 2 | «… · la atiende la Alcaldía Xochimilco» (propuesta P-11) |
| C2-01 (C2-R3-10) | Baja | Ventana «Terminar mi parte»; `js/jornada-activa.js:839` | Dice que «la jornada sale de su lista», pero sigue en Jornadas. 2 de 2 | «Ya no podrá registrar en ella; la seguirá viendo en Jornadas» (propuesta P-13) |
| C2-02 (C2-R3-14) | Baja | Renglón del GPS; `js/mapa.js:281-293` | Mientras afina no se ve cuánto falta, y a los 32 s, con precisión baja, pide «Espere unos segundos…» después de 30 s de espera. 2 de 2 | Cuenta regresiva y un mensaje final distinto (propuesta P-12) |
| C3-02 (C3-R3-15) | Baja | PDF del reporte de una compartida, tabla «Ejemplares plantados» | La columna «Cabo» parte cada nombre en tres renglones; cada fila crece al triple y la tabla pasa a otra página. 2 de 2 | Más ancho para «Cabo» y menos para «Calle», o iniciales en la tabla |
| C5-03 (C5-R3-11) | Baja | Ficha de la compartida; `js/jornadas.js:391` y `:866` | «Siguiente: registrar los árboles que faltan (lo hace el cabo) (9 de 60)»: en una compartida registran la Coordinación y sus cabos y cierra la Coordinación; dos paréntesis seguidos. 2 de 2 | El texto según quién lo hace (propuesta P-10) |
| C5-04 (C5-R3-12) | Baja | Ficha «Revise antes de guardar» del cabo de apoyo | Muestra el folio y «Cabo: <su nombre>», que el detalle ya no enseña desde la 1.2 (RP-03 y RP-05); `js/registros.js:446` pide que se lean igual. 2 de 2 | Las mismas reglas del detalle |
| C6-01 (C6-R3-16) | Baja | «Cabos de apoyo» y «¿Quién registra?»; `.chip-renglon[aria-pressed=true]` | Un cabo marcado se ve igual que el botón principal (azul relleno, ancho completo): con varios marcados hay varios «botones azules» que no hacen nada. 2 de 2 | Fondo claro, borde de 2 px y palomita (propuesta P-14) |
| D1-03 (coordinación) | Baja | `docs/PLAN-TRASPASO-SIA.md:190-195`, «Siguiente paso» | Dice que se entregue la 1.1 con la etiqueta `entrega-2026-10-22`; D337: la primera instalación será la 1.0.0 y al SIA no le ha llegado ningún paquete | Ponerlo al día con D337 |
| D1-04 (coordinación) | Baja | `README.md:8` y `docs/MEJORAS.md:8` | Dicen que la versión va «al pie de cada pantalla»; va fija arriba en todas (`index.html:28-31`), y al pie sólo en la entrada | Corregir el texto |
| D1-05 (coordinación) | Baja | `README.md:311` | Dice «(hoy, «Versión 1.3.1»)»; es la 1.4.2 | Corregir, o no citar la versión |
| D1-06 (coordinación) | Baja | `docs/FASE2-Y-TRASPASO.md:157` | Dice 6.6 MB sin comprimir y 1.7 MB comprimida; medido hoy: 7.27 MB y 1.97 MB en 60 archivos (unos 1.80 MB en el teléfono) | Poner las cifras de hoy |
| D1-07 (coordinación) | Baja | `docs/ALINEACION-SIA.md:112-126`, «Preguntas para el SIA» | La pregunta 1 (quién opera las cuentas) ya la decidió el dueño en D337 y sigue como abierta | Marcarla resuelta con D337 |
| D1-10 (MAN-R3-03) | Baja | Manual del personal §8, `:463` | Dice que el detalle trae el folio y quién registró; desde RP-03 y RP-05 no trae folio y al cabo no le dice su nombre (`js/registros.js:455-472`) | Quitar el folio; aclarar que «Cabo» sólo lo ven los demás perfiles |
| D1-11 (MAN-R3-04) | Baja | Manual del personal §4, `:266` | «Una ventana con dos botones»: el cierre con puntos por revisar tiene tres, y los avisos de compartida y relevo, uno | «Una ventana con sus opciones» |
| D1-12 (MAN-R3-05) | Baja | Manual del personal §11, `:600` | Dice que Fotografías tiene «los mismos filtros» que Mi avance; no tiene «Tipo de jornada» ni Semana, Mes o Año (`js/galeria.js:33-46`, `js/filtros.js:57-60`) | Listar sus filtros |
| D1-13 (MAN-R3-06) | Baja | Manual del personal §15, `:697` | Dice que se filtra «por reporte generado o no»; «Pendientes» sólo ofrece «Sin reporte todavía» (`index.html:520-524`) y no menciona «Buscar por nombre» | Corregir y agregar la búsqueda |
| D1-14 (MAN-R3-07) | Baja | Manual del personal §12, `:607` | La coordinación hace «todo lo del cabo (secciones 6 a 11)»; la 11 es Mi avance y la coordinación tiene Supervisión | «Secciones 6 a 10» |
| D1-15 (MAN-R3-08) | Baja | Manual del personal §1, `:115-116`, y §4 | Perfiles «Coordinación» y «Dirección»; la aplicación dice «Coordinador» y «Directivo» (`js/permisos.js:13` y `:18`), igual que el manual de la Administración | Igualar con la decisión 6 |
| D1-16 (MAN-R3-09) | Baja | Manual del personal §9, `:505` | «Marcar todos como revisados»; el botón dice «Marcar los N como revisados» (`js/jornadas.js:958`) | Citar el texto real |
| D2-01 (D2-R1-10) | Baja | `servidor/db/srp/02-srp-tablas.sql:37-55` y `:249-255`; `datos/esquema.json` | Los 12 campos de la calle y la lista de cabos de apoyo dependen sólo del disparador y del servicio: no hay regla en la base para la distancia (0 a 40 m), el tipo de vía, que «ok» traiga calle y «lejos» no, ni para los elementos de la lista; la relación de sus cuentas no está declarada. Hoy, 0 violaciones en 18,515 árboles y 100 cabos de apoyo | Reglas de coherencia en la base y la relación en `esquema.json` |
| D2-02 (D2-R1-11) | Baja | `datos/esquema.json` → `datos/DICCIONARIO-DATOS.md:3`, `02-srp-tablas.sql:2` y `js/esquema.js:8` | Dicen «Versión del esquema: 2026-10-04 · Etapa 1 (Fase 1: dispositivo, sin servidor)», aunque el esquema cambió en los bloques 247, 249 y 252 | Subir la versión con cada cambio de campos y que `auditoria.py` lo compruebe |
| E1-03 (E1-R4-03) | Baja | `servidor/db/srp/09-srp-calles.sql:23`, `:54` y `:72` | Las funciones de la calle no elevan permisos (bien), pero toman la ruta de búsqueda de la sesión que instala (en la base local, `"$user", public`); si en el SIA la extensión geográfica vive en otro esquema o la sesión trae otra ruta, la función cambia sin que el guion lo diga. 2 de 2 | Fijar la ruta en el guion |
| E1-04 (E1-R4-04) | Baja | `servidor/src/modulos/srp/acceso.ts:36-46` | Si la cuenta no existe, el registro de entradas guarda tal cual lo escrito en el campo del correo (hasta 254 caracteres): quien teclea su contraseña ahí la deja en claro por un año (ASVS 7.1.1) | Decisión 14 |
| E2-01 (E2-R5-09) | Baja | `servidor/db/srp/09-srp-calles.sql:70` contra `:81-84` | `srp.recalcular_calles()` es una sola sentencia: 53.4 s con 18,515 árboles y 102.5 s con 74,060; si se interrumpe no guarda nada, aunque su comentario dice que «sigue con lo que falta». 1 de 1 (medición) | Decisión 16 |
| E2-02 (E2-R5-10) | Baja | `servidor/src/modulos/srp/recepcion-arboles.ts:199-206` | Al mover un árbol, la bitácora dice los campos, el punto y el territorio, pero no el cambio de calle («lejos» → «Calle 5 de Mayo (30 m)»). 2 de 2 | Agregar «Calle: X → Y» cuando cambie |
| E3-02 (E3-R5-06) | Baja | `servidor/src/modulos/srp/recepcion-jornadas.ts:428` | Carrera entre «Terminar mi parte» y «Cerrar jornada»: cuando gana el cierre, el cabo queda vigente en una jornada cerrada, sin «Terminó su parte» en la bitácora, y en su teléfono queda un rechazo que sólo se descarta. Intermitente, 2 de 20 | Aceptar el «Terminar mi parte» en una jornada cerrada si el cabo seguía vigente al cierre |
| E3-03 (E3-R5-07) | Baja | `servidor/src/modulos/srp/recepcion-jornadas.ts:396-400` | Identificadores mal formados en la lista de cabos (en mayúsculas, «no-es-un-id», la lista como texto, nula o como objeto) se responden «recibido, repetido» y no hacen nada; un identificador bien formado que no existe sí da error de datos. 2 de 2 | Rechazar si no son listas de identificadores válidos |
| E3-04 (E3-R5-08) | Baja | Aviso «Jornada compartida» (`js/jornada-activa.js`); el servidor sólo quita el carácter nulo (`recepcion-apoyo.ts:82`) | Un carácter de dirección (U+202E) en el nombre de una jornada voltea el texto del aviso, también los nombres de las demás jornadas. El marcado, la fórmula y el SQL del mismo nombre no se ejecutaron. 2 de 2 | Quitar los caracteres de control de dirección al guardar, o aislar cada nombre |
| F1-01 (coordinación; D2-R1-09) | Baja | `usuarios.coordinadores_ids`: `02-srp-tablas.sql:346`, `acceso.ts:66`, `cuentas.ts:111` y `:208`, `js/usuarios.js:284`, `js/referencias.js:36`; comentario de `cuentas.ts:20`; `pruebas/auditoria.py:123-125` | Sin uso desde la 1.4 (D333), sigue en cinco lugares y viaja al teléfono; 17 cuentas de la base local conservan coordinadores; tres comprobaciones dan «OK» sobre un campo que ya no importa; el comentario de `cuentas.ts:20` dice que se edita y no se edita. La coordinación lo calificó Informativa y r1 Baja: queda Baja | Decisión 18 |
| F4-03 (F4-R4-04) | Baja | `js/app.js:362` (`CUENTAS_POR_ROL` con las 7 cuentas de prueba) y el comentario de `servidor/db/srp/02-srp-tablas.sql:339` («las de arranque: u-admin-1, u-coord-1, u-cabo-1») | Restos de prueba en la copia de producción además de M563; el comentario de la base no es cierto en una instalación (la primera cuenta tiene identificador aleatorio). 2 de 2 | Incluirlos en lo que M563 quita o revisa |

### 5.5 Informativos

| Clave | Gravedad | Dónde | Qué pasa | Corrección propuesta |
|---|---|---|---|---|
| A1-05 (A1-R1-13, B4-R2-01) | Informativa | Aviso «Jornada compartida» del cabo de apoyo; `js/jornada-activa.js:227` y `:853-875` | Llega como ventana varios segundos después de entrar: 4.0 a 4.3 s (r1); en modo real, de 2.6 a 7.3 s en 8 medidas, y con la demostración, de 2.7 a 12.3 s (r2). Si la persona ya tocó algo, se le abre encima. Cerrado sin «Entendido», vuelve la siguiente vez que se llama al aviso. No se vio ninguna pérdida | Decisión 19 |
| A6-02 (A6-R2-02) | Informativa | Chips sin marcar y botón «Cabos de apoyo», modo normal | Sus contornos dan 1.46:1 y 2.56:1; los identifica su texto y en modo sol, el de arranque, dan 11.21:1. Son variables anteriores a la 1.1 | No pide acción |
| B9-01 (B9-R4-01) | Informativa | `index.html:13` (política de seguridad en `<meta>`); el fragmento del servidor web, sin cabeceras propias (regla del SIA) | La política dio 0 violaciones, pero la protección contra que otra página muestre la aplicación dentro de un marco no funciona en `<meta>`: depende de las cabeceras globales del SIA, que no se conocen | Para el SIA: confirmar sus cabeceras |
| C2-03 (C2-R3-17) | Informativa | «Relevo de cabo» contra «Cabos de apoyo» y «¿Quién registra?» | Uno elige con una lista desplegable y los otros con renglones para marcar; es razonable (una persona contra varias) | Anotarlo en la guía visual |
| D1-17 (MAN-R3-10) | Informativa | Manual del personal §13, `:640` | Dice «Guardar»; el botón dice «Guardar: N cabos de apoyo» (`js/jornadas.js:1440`) | Citar el texto real |
| D1-18 (MAN-R3-11) | Informativa | Manual del personal, en todo | «La coordinación», 27 veces en minúscula; la aplicación dice «la Coordinación» | Igualar (decisión 6) |
| D1-19 (MAN-R3-12) | Informativa | Manual del personal §9 `:516`, §10 y §13 | «Personal de apoyo» (dato del reporte) y «cabos de apoyo» (papel en la jornada) aparecen juntos sin aclarar | Una línea que los distinga |
| D1-20 (MAN-R3-13) | Informativa | Manual del personal §17, `:767` | No dice que la Administración global también genera el reporte | Agregarla |
| D1-21 (MAN-R3-14) | Informativa | Manual del personal §12, `:616` | Dice que el encargado se elige entre quienes registraron «ese día»; es entre todos los que registraron en la jornada, y en una compartida el archivo lleva el nombre del encargado (`js/reportes.js:130-140`, `:388-389` y `:898-904`) | Corregir y explicar el nombre del archivo |
| D1-22 (MAN-R3-15) | Informativa | Manual de la Administración §6, `:290` | Da a entender que las instituciones se eliminan; nunca se eliminan (`js/catalogos.js:166`) | Decirlo |
| D1-23 (MAN-R3-16) | Informativa | Manual de la Administración §12, `:481` | Si una coordinación con una jornada abierta cambia de institución, ya no puede editarla ni cerrarla (`js/permisos.js:55-58`) | Advertirlo |
| E1-05 (E1-R4-05) | Informativa | `servidor/db/srp/10-srp-rol-y-grants.sql:50` | La cuenta del servicio puede escribir directamente los campos de la calle; el disparador los pone y ningún código los escribe | Opcional: permisos por columna |
| E2-03 (I-R5-12) | Informativa | La secuencia de folios por celda | Avanza con cada árbol de prueba y no regresa: la base queda con huecos en los folios. Es lo esperado (un folio emitido no se reutiliza) | Tenerlo en cuenta para la copia sin nada de prueba y el guion de vaciado (D337) |

### 5.6 Ya conocido: citado, no se cuenta como nuevo

| Clave | Qué es | Cómo sigue hoy |
|---|---|---|
| M46 | Revisión corta en Android | Sigue pendiente; la cámara en Android 14 y posteriores sólo se verifica en un teléfono (r2, r3) |
| M168 | Capas con su propia versión y la licencia del mapa base | Sigue; las capas son la mitad del peso de la primera carga (D4) |
| M170 | Falta WebKit en GitHub | No se revisó; sigue registrado |
| M343 | Contar los frutales | Fuera de este alcance |
| M532 | Pantalla de entradas, después del piloto | Fuera de este alcance |
| M551 | Probar la guía del teléfono por marca | Sigue; de ella depende cuán frecuente es B6-02 (r3, r6) y la sección 2 del manual |
| M563 | La copia para el SIA trae en `index.html` los bloques de prueba ocultos | Sigue igual: 13 elementos de prueba ocultos, comprobado en tres copias de producción (r4; ver la sección 7 sobre la nota de r1). F4-03 agrega dos restos más |
| D337 | Quién opera las cuentas; registro de entradas 1 año; sistema interno; siglas SRP; la 1.0.0; guion de vaciado; calle desde la base | Decidido. Falta llevarlo al instructivo (F4-01) y a ALINEACION-SIA (D1-07). **El borrado del registro de entradas no está programado:** el disparador de inmutabilidad niega todo borrado, también al dueño, y no hay función ni quién la llame (r4, E1-R4-02; `servidor/db/srp/03-srp-acceso.sql:84-98`); la forma va en la decisión 12. El guion de vaciado aún no existe |
| D338 | Los manuales dicen 1.0.0 | Se cumple: 1 vez cada uno, ningún 1.1, 1.3 ni 1.4 (r1) |
| Mapa base de Esri | Único dominio externo, aceptado el 08-10-2026 | Sigue siendo el único (r2, r4) |
| Aviso de privacidad | No se requiere | Falta la constancia escrita |
| Fotografías fuera de la base | Decidido | Sin cambio |
| E3-R1-09, E3-R2-10, E3-R2-15 y E3-R3-03 (19-10-2026) | Quedaron fuera del plan anterior | No se repitieron |
| Fallas conocidas de la prueba completa | La del Excel de `originales/` (compara con un archivo que no está en el repositorio) y la de los porcentajes del reporte (espera una decisión del dueño) | Siguen; la de porcentajes es una de las 2 fallas de GitHub |

## 6. Verificado sin hallazgos

- **Pruebas** (línea base de la coordinación): `npm test` del servidor, 109 de 109; `prueba_conexion.py`, 126 de
  126 (una de dos corridas se cayó en la prueba de cargas masivas simultáneas, renglón 1194, porque leyó la revisión
  del archivo antes de que terminara: falla de la prueba); `auditoria.py`, 147 comprobaciones y 0 hallazgos;
  `auditoria_css.py` y `revisar.py`, 0 hallazgos. Las fallas de la prueba completa se explican en A1-01 y A1-02; el
  tramo 54 pasó 2 de 2 aisladas (sección 10). Al terminar, la prueba completa dio 844 comprobaciones, 3 fallas y 3 tramos detenidos: ninguna falla de un tipo nuevo (sección 15).
- **Construcción:** los generadores, el servidor compilado y la copia de producción desde LF salen iguales dos veces
  (A3).
- **Código:** ESLint, 0 errores en 70 archivos; tipos del servidor, 0 errores.
- **Capa de calles:**
  - las sumas SHA-256 del gpkg y del zip coinciden con el README, con el índice de la copia ligera y con el
    manifiesto del paquete de calles;
  - copia ligera: 97 celdas, 18.79 MB (5.19 MB con gzip), 178,771 claves; regenerada dos veces es igual byte por byte
    a la del commit;
  - base contra gpkg: 178,771 tramos de los dos lados, 0 claves de más o de menos y 0 diferencias en nombre, calles
    entre las que está, red, tipo de vía, quién la atiende, llave, vértices, extremos y largo;
  - la calle guardada de cada árbol es la que daría hoy `srp.calle()`: 18,514 de 18,514;
  - el teléfono no puede imponer la calle: el disparador la recalcula al recibir y al corregir el punto.
- **Cifras** (r1, modo real): 8,487 árboles, 1,401 sin calle, los 18 valores de quién atiende, las 1,905 calles con
  sus árboles una por una y los 3 CSV renglón por renglón: 0 diferencias contra el recálculo en SQL. Una compartida
  propia de 3 árboles: el reporte trae «Jornada compartida, coordina: …», los cabos de apoyo con sus árboles y las
  columnas «Calle» y «Cabo»; el PDF dice lo mismo; Mi avance del cabo de apoyo, 2 árboles y 1 jornada, igual que en
  SQL. El filtro «Tipo de jornada»: Sí + No = Todas en 5 de 5 casos (r3).
- **Archivos:** el CSV lleva BOM y un apóstrofo delante de `=`, `+`, `-`, `@`, tabulador y retorno (11 casos), y los
  números negativos quedan como número; los PDF de la aplicación traen título, asunto, autor, versión y `es-MX`.
- **Modelo de datos:** diccionario contra base, 10 tablas y 167 campos sin diferencias; los 100 cabos de apoyo
  guardados, con cuenta, perfil Cabo, misma institución y fin válido.
- **Pantallas** (r2): 0 desbordes, 0 textos cortados, 0 botones que no hacen nada, 0 errores de página, 0 violaciones
  de la política de seguridad y 0 fallas de axe en las vistas, con los 4 perfiles y en los dos modos. Lo que el
  barrido marcó y no es hallazgo: 4,383 respuestas 404 de fotografías (el servicio arrancó con la carpeta vacía), los
  controles tapados por el aviso pasajero, los objetivos de 1×1 ocultos y fuera del teclado, y los botones de orden de
  Catálogos y Usuarios, que el barrido sigue contando porque no lleva el ajuste del bloque 7 anterior.
- **Accesibilidad de lo nuevo:** axe da 0 en los 15 estados nuevos; el error de «Varios cabos» se anuncia y lleva al
  resumen; el foco vuelve a «Cabos de apoyo» al cerrar su ventana (12 de 12) y a «Terminar mi parte» al cancelar; el
  inicio y la precisión del GPS se anuncian.
- **Contraste de lo nuevo:** «Sustituir» 7.38:1 en letra y contorno; la red vial en el detalle, 13.84:1 en modo sol
  y 6.2:1 en normal; «Jornada compartida · coordina…», 18.24:1 y 13.77:1; el chip marcado, 8.35:1; la insignia de
  precisión, 4.71:1.
- **Teléfono y continuidad** (r2 y r6):
  - la sesión vencida sin señal, en horizontal, 2 de 2: el árbol se guarda y llega una sola vez al volver a entrar;
  - el cabo de apoyo que registra sin señal y luego toca «Terminar mi parte», 4 de 4;
  - el relevo hacia un cabo sin señal, 4 de 4: recibe la jornada con su aviso cuando tiene señal;
  - el ciclo del service worker: instala la 1.4.2 (71 archivos), abre sin red, instala la nueva al volver la red y
    borra la caché vieja;
  - el cabo titular que reabre sin señal sigue con su jornada (2 de 2) y el árbol pendiente sigue en el teléfono
    (6 de 6);
  - los árboles con señal de un cabo de apoyo llegan a su nombre (6 de 6).
- **Fechas** (r2): una compartida abierta el 31-DIC a las 23:50 sigue después de la medianoche y cada árbol queda con
  su día, también con el teléfono en Tokio o en UTC: 45 de 45.
- **Tareas** (r3): el aviso al cabo de apoyo, su franja, el relevo, el filtro, el sitio de plantación y «Sustituir»
  responden su pregunta de trabajo sin contar ni recordar; el trato es de «usted» en todo lo nuevo; las fechas van
  como 27-OCT-2026; no hay nombres internos a la vista ni faltas de ortografía en lo nuevo; «Atrás» y las dos pestañas
  se comportan como se espera; ningún error en la consola.
- **Seguridad** (r4):
  - control de acceso de lo nuevo, 132 de 135 casos, 2 de 2 (las 3 que fallan son E1-01): compartir, terminar, quién
    ve una jornada, lo que puede y no puede un cabo de apoyo y los datos inyectados en el alta;
  - paridad de reglas pantalla-servidor: 18 acciones y 73,482 comparaciones, 0 diferencias;
  - la cuenta del servicio: 8 de 8 consultas que deben funcionar, 20 de 20 intentos indebidos negados y 0 permisos
    fuera de su esquema; no puede correr el recálculo de calles;
  - inyección: SQL con parámetros; el texto con código en jornada y árbol se muestra como texto con 4 perfiles;
  - los 18 commits y los 2 manuales: 0 llaves, 0 contraseñas, 0 direcciones internas, 0 correos reales, 0 rutas
    personales y 0 de las 16 placas reales de la base.
- **Despliegue** (r4): el fragmento del servidor web pasa su validación; las redirecciones son relativas; la página,
  el service worker y el manifiesto no se guardan en caché y lo versionado sí, 30 días; los archivos de prueba y la
  capa ligera dan 404 en la copia de producción; la API responde sin caché.
- **Paquete provisional** (r4): 120 archivos y 120 sumas bien; sin archivos de datos de prueba, sin la capa ligera,
  sin rutas personales, correos de prueba ni cadenas de conexión. En seco: el diff aplica limpio sobre la versión
  actual del backend del SIA, la copia completa es idéntica byte por byte, la revisión de tipos y la compilación
  pasan, y revertir deja el backend sin rastro.
- **Robustez** (r5):
  - 45 árboles de tres personas enviados a la vez: 0 rechazos, 45 folios distintos y calle en los 45;
  - dos pestañas de la Coordinación cambian cabos a la vez: se aplican las dos;
  - doble envío y doble toque en compartir, terminar, iniciar y guardar: un solo efecto;
  - la eliminación de una jornada con árboles de apoyo ya recibidos se niega; reabrir devuelve el permiso al cabo
    vigente y no al que terminó;
  - respuestas raras del servidor (502, 409, portal, sin resultados): mensaje claro y el cambio se queda en la cola;
  - el reloj adelantado se detecta; una fecha de registro futura se reemplaza por la del servidor;
  - sin la capa de calles (en una copia de los guiones), el alta y el cambio de punto no fallan;
  - la bitácora no se edita ni se borra, ni con la cuenta dueña; nada se borra solo; 0 errores del servidor.
- **Revisión de código** (coordinación): los cambios a la lista de cabos bloquean la fila de la jornada; compartir y
  terminar tienen la misma regla en la pantalla y el servidor; la calle simulada sólo corre con datos de prueba; de la
  compartida viaja sólo la diferencia.
- **Peso:** la copia del SIA no lleva la copia ligera de calles (18.8 MB).
- **Instalación:** `instalar.sql` incluye los diez guiones en el orden de la guía del SIA (r6).
- **E2, el respaldo (r5, con la base libre):** un respaldo de 4.3 MB con las 23 tablas; uno alterado se detiene con «incorrect data check» y uno cortado al 90 % con «fin de archivo», los dos sin dejar el esquema; el bueno se restaura sólo si su suma coincide, y la huella de las 23 tablas queda idéntica. Después: los 9 disparadores activos, la bitácora no se edita (con la cuenta dueña da P0001; con la del servicio, editar y borrar dan 42501), y la cuenta del servicio no borra árboles ni corre `srp.recalcular_calles()`.
- **F5, el ensayo de instalación (r4, con la base libre):** el SRP instala en limpio con `instalar.sql`, que una segunda vez se niega; la comprobación como la cuenta del servicio da 7 de 7 consultas y 15 de 15 intentos indebidos negados; el módulo se integra en una copia del backend del SIA con su diff (revisión de tipos y compilación sin errores); la prueba de humo da 18 de 18, con una jornada y su árbol con folio y calle «ok»; «Revertir» deshace el diff limpio; la base vuelve idéntica (23 tablas, funciones, disparadores, permisos e identidades). Las 4 comprobaciones que fallan son del instructivo viejo (F4-01).
- **Las huellas:** de los 2,575 archivos del proyecto, ninguno cambió durante la auditoría. Sólo aparecieron las 8 capturas de la prueba de presentación en la raíz (A5-01); el commit sigue en `1eb30e6`.

## 7. Contradicciones entre documentos y datos atrasados

| Tema | Fuente 1 | Fuente 2 | Hallazgo |
|---|---|---|---|
| Árboles que llegan después del cierre | `docs/DECISIONES.md:4432-4433` (D334); `js/jornada-activa.js:745`; manual del personal `:575` (§10) y `:654` (§13) | `servidor/src/modulos/srp/permisos.ts:119`; `recepcion-arboles.ts:107-108`; `js/cola.js:42`; `js/rechazos.js:9` y `:100-114` | B6-01 |
| Encabezado de los rechazos | `js/rechazos.js:8-9`: con «sin permiso» el registro «vuelve a como está en el servidor» | `js/rechazos.js:102-104`: para un alta no hay versión en el servidor; el botón es «Eliminar este registro» | B6-01 |
| La jornada en el teléfono | `js/cola.js:353-354`; `index.html:262` y `:1001`; manual del personal `:277`, `:562`, `:633` y `:789` | `js/remoto.js:3-7` y `:97-105`; `docs/DECISIONES.md:3643-3645` (D301) | B6-02 |
| Reenvíos de la compartida | `docs/DECISIONES.md:4436-4437`; `servidor/src/modulos/srp/recepcion.ts:37` | `recepcion-jornadas.ts:396-400` y `:427` | E3-01 |
| Relevo en la compartida | `docs/DECISIONES.md:4429-4431` | `permisos.ts:121` y `:81-82`; `js/jornadas.js:795` | E1-02 |
| Filtro en Fotografías | `js/jornadas.js:1394` (el filtro está en Registros, Jornadas, Supervisión y Fotografías) | `index.html`: Fotografías no lo tiene | D1-12 |
| Lo que ve quien revisa | `js/registros.js:446` | La ficha «Revise antes de guardar» con folio y cabo | C5-04 |
| La columna «Calle» del reporte | `docs/BITACORA.md:6621-6622` («ahora la prueba pide el envío y la espera») | `js/jornadas.js:1481-1485` | A1-01 |
| GitHub | `.github/workflows/pruebas.yml:4` («la subida queda marcada con una ✗») | Bitácoras de los bloques 252 a 255: ningún cierre cita el resultado | A1-03 |
| La carpeta de producción | `herramientas/preparar_produccion.py:13` («la carpeta destino debe no existir o estar vacía») | Si falla, deja 80 archivos a medias | A3-01 |
| Cita de la capa de calles | `README.md:499-504` | `js/calles.js:100-106` | D3-01 |
| «Las mismas reglas» de la calle | `README.md:492`, `js/calles.js:6`, `09-srp-calles.sql:12` | 2.4 % de los puntos difiere por la aritmética | A2-01 |
| Recálculo que «sigue con lo que falta» | `servidor/db/srp/09-srp-calles.sql:70` | `09-srp-calles.sql:81-84`: una sola sentencia | E2-01 |
| La bitácora al mover el punto | `recepcion-arboles.ts:199` («si cambió su territorio») | La calle no aparece | E2-02 |
| Coordinadores de cada cuenta | `README.md:50` y `:99`; `cuentas.ts:20`; `pruebas/auditoria.py:123-125` | `docs/DECISIONES.md:4399` (D333); `cuentas.ts:244-247` | D1-01, F1-01 |
| Reglas para el SIA | `docs/FASE2-Y-TRASPASO.md:95` y `:99` | `recepcion-jornadas.ts:355-359` | D1-02 |
| Versión del diccionario | `datos/DICCIONARIO-DATOS.md:3`; `02-srp-tablas.sql:2` | Campos de los bloques 247, 249 y 252 | D2-02 |
| Siguiente entrega | `docs/PLAN-TRASPASO-SIA.md:190-195` (la 1.1) | D337 (la 1.0.0; ningún paquete entregado) | D1-03 |
| Dónde va la versión | `README.md:8`; `docs/MEJORAS.md:8` | `index.html:28-31` | D1-04 |
| Versión citada | `README.md:311` («Versión 1.3.1») | `VERSION` (1.4.2) | D1-05 |
| Peso de la primera carga | `docs/FASE2-Y-TRASPASO.md:157` (6.6 y 1.7 MB) | Medido hoy: 7.27 y 1.97 MB | D1-06 |
| Quién opera las cuentas | `docs/ALINEACION-SIA.md:112-126` (abierta) | D337 (decidido) | D1-07, F4-01 |
| Guion de la verificación | `servidor/local/srp-sia/LEEME.md:72` y `:187` (`09-srp-rol-y-grants.sql`) | `servidor/db/srp/instalar.sql:7` y `:20` (`10-…`) | F4-01 |
| Paquetes anteriores | `LEEME.md:7-10` y `:151-165` (sustituye a la 1 y la 1.0.5; «la base no cambia») | `docs/DECISIONES.md:4519` (D337: ningún paquete llegó); `02-srp-tablas.sql` y `09-srp-calles.sql` cambiaron | F4-01 |
| Lo que lee de `territorio` | `LEEME.md:49` (cuatro tablas) | `09-srp-calles.sql:30-39` (también la capa de calles y su versión) | F4-01 |
| El recálculo al instalar | `servidor/README.md:111-113` | El instructivo no lo tiene | F4-01 |
| Pasos del servidor | `servidor/README.md:111` y `:114` | Dos pasos con el número 5 | Se corrige con F4-01 |
| Cifras de lo verificado | `LEEME.md:211`, `:215` y `:219` (106, 120 y 1,469) | Línea base de hoy (109 y 852 con 5 fallas) | F4-01 |
| Archivo con placas | `LEEME.md:94` («no va a ningún repositorio») | `docs/DECISIONES.md:4263-4265` (D325: repositorio privado de la entrega) | F4-01 |
| Registro de entradas | `servidor/db/srp/03-srp-acceso.sql:84-86` («Nada las recorta») | `docs/DECISIONES.md:4510-4512` (D337: un año y se borra solo) | Ya conocido (D337) |
| Cuentas de arranque | `02-srp-tablas.sql:339` («u-admin-1, u-coord-1, u-cabo-1») | `servidor/deploy/srp-cuenta-inicial.mjs:1-15` (una cuenta con identificador aleatorio) y D337 (dos) | F4-03 |
| Manuales contra la aplicación | `docs/manual/manual-personal.html` y `manual-administracion.html`, renglones de la tabla de 5.4 y 5.5 | El código citado en cada renglón | D1-08 a D1-23 |

**Entre revisores** (resueltas al consolidar):
- M563: r1 escribió que en la copia de producción «sólo quedan comentarios»; r4 encontró 13 elementos de prueba
  ocultos. Se revisó el `index.html` de tres copias de producción (la de r1, la de r2 y el paquete de r4): las tres
  traen los 13. Vale lo de r4.
- La copia de trabajo de un revisor no traía el servidor compilado, aunque las reglas de la auditoría lo decían: es
  un detalle del entorno, no del proyecto.

## 8. Para decidir (dueño)

1. **¿Qué pasa con lo que un cabo de apoyo capturó sin señal y llega cuando la jornada ya se cerró o ya lo quitaron
   (B6-01)?** Opciones:
   - a) El servidor acepta el alta si el árbol se capturó mientras el cabo estaba vigente (la hora de captura antes
     de su `hasta` o del cierre), con un margen por el reloj del teléfono. Costo M. Riesgo: un reloj adelantado o
     falseado, que ya se vigila con la franja de la hora.
   - b) El teléfono deja el árbol en espera y lo reintenta solo cuando la jornada se reabre o el cabo vuelve a estar
     vigente; «Revisar» ofrece «Enviar otra vez» y «Pasar a otra jornada». Costo M. Es lo que promete D334.
   - c) La combinación: al cabo quitado se le acepta lo capturado antes de su `hasta`; con la jornada cerrada, el
     árbol espera con un código propio y se reintenta solo al reabrir; y la ventana de cierre dice cuántos árboles
     pueden llegar. Costo M.
   - d) Impedir el cierre con cabos de apoyo vigentes. Costo S. Contradice «el cierre sólo avisa» (D333 y D334).
   - e) Mantener el rechazo y cambiar lo que se promete (D334, la ventana y el manual). Costo S. Los árboles se siguen
     perdiendo.

   **Recomendación:** c). Los revisores recomendaron caminos distintos (r2, a con el aviso al quitar; r3, b; r5, b
   con el aviso ahora y a después del piloto; r6, c); c reúne lo que cada uno pedía. En cualquier opción, «Eliminar»
   no debe quedar como única salida.
2. **¿Se guarda en el teléfono la jornada compartida y la recibida en relevo (B6-02)?**
   - a) Sí, como excepción a D301: sólo la jornada (sin árboles de otros ni fotografías) mientras la persona registra
     en ella, y se suelta al cerrarse o al cerrar sesión; `limpiar()` ya la prevé. Costo S a M.
   - b) No; se dice en Nuevo registro y en las instrucciones que la jornada vuelve con señal (propuestas P-5 y P-6).
     Costo S. El cabo sigue sin poder registrar sin señal.
   - c) La copia temporal de lo enviado que D323 prevé «si el SIA no lo garantiza». Costo M a L.

   **Recomendación:** a). La recomiendan los tres revisores que lo encontraron.
3. **¿Se puede eliminar una compartida con cabos de apoyo vigentes (B6-03)?** a) No, hasta quitarlos o que terminen
   (S). b) Sí, con un aviso (S), pero los árboles del cabo siguen sin destino. **Recomendación:** a).
4. **¿Qué son «cabos que trabajaron» y las «Jornadas» de cada cabo (B2-02)?** a) Los cabos con árboles en lo filtrado,
   y las jornadas donde capturó al menos un árbol, sea titular, relevo o apoyo. b) Los titulares, como hoy. Costo S.
   **Recomendación:** a), y que Mi avance calcule el avance con los árboles del propio cabo o diga «de la jornada».
5. **¿En qué red va una calle con tramos en dos redes (B2-03)?**
   - a) Partirla: se cuenta en cada red con los árboles de esa red; la calle aparece en las dos listas. Costo S.
   - b) La red con más árboles, con una nota en el renglón. Costo S. Menos claro.
   - c) Dejarla y anotarlo en el pie. Costo mínimo; la suma sigue sin cuadrar.

   **Recomendación:** a) (r1 y r3 coinciden).
6. **¿Cómo se llama el perfil de coordinación (C5-02, D1-15, D1-18)?** a) «Coordinación» en todo. b) «Coordinador» en
   todo. Lo mismo para «Directivo» y «Dirección». Costo S. **Recomendación:** a), porque los textos nuevos ya lo usan.
7. **¿Cómo se reconoce un reenvío de «Cabos de apoyo» o de «Terminar mi parte» (E3-01)?** a) Cada cambio lleva el
   `desde` que conocía el teléfono, y el servidor sólo agrega o termina si coincide (S a M). b) Un identificador por
   operación, guardado al aplicarla (M). **Recomendación:** a).
8. **¿Se permite el relevo en una compartida (E1-02)?** a) No: se rechaza en el servidor y en la pantalla (S). b) Sí,
   pero pasar por un relevo nunca quita la restricción de cabo de apoyo y la titular sigue registrando (M). c) Dejarlo
   como está. **Recomendación:** a).
9. **¿Puede el cabo de apoyo sacar su propio árbol de la compartida?** Hoy lo mueve a una jornada suya y la
   Coordinación lo pierde de su reporte; sólo lo dice la bitácora (r5, caso A10). a) Dejarlo. b) En una compartida
   sólo la Coordinación mueve árboles (S). **Recomendación:** b), porque el reporte es de la Coordinación.
10. **«Sustituir» y el árbol de otro (E1-01).** a) Revisar el permiso antes de devolver nada (S). b) Devolver el árbol
    sólo a quien lo alcanza. **Recomendación:** a), que es la regla de todas las demás operaciones.
11. **¿De dónde lee el SRP la versión de la calle (F6-01)?** a) De la tabla de versiones de capas del SIA, como las
    otras tres capas, con la del paquete de calles sólo si falta (S). b) Seguir con la del paquete y pedir al SIA por
    escrito que toda versión nueva se instale reinstalando el paquete. c) Leer las dos y avisar si no coinciden (S).
    **Recomendación:** a), una sola fuente, la del receptor.
12. **¿Cómo se borra el registro de entradas al año (D337, ya decidido)?** a) Como dice D337: una función del dueño,
    sin permiso para nadie más, que el disparador deja pasar y que el módulo llama una vez al día (M). b) Que la corra
    el SIA con su programador de tareas (S para el SRP; depende del SIA). c) A mano, una vez al año (S, frágil).
    **Recomendación:** a).
13. **¿Cuánto se guardan las sesiones cerradas** (guardan el navegador)? Quedó abierta desde el 19-10-2026. a) Igual
    que las entradas, un año. b) Borrarlas al vencer. **Recomendación:** a).
14. **El «correo» intentado en el registro de entradas (E1-04).** a) Anotarlo sólo si tiene forma de correo y, si no,
    «(no es un correo)». b) Guardar sólo su resumen. c) Dejarlo. Costo S. **Recomendación:** a).
15. **El aviso de body-parser (F3-01).** Pedir al SIA que actualice su backend; en el `servidor/` del SRP, actualizar
    cuando usted lo apruebe, comprobando que las salidas quedan iguales.
16. **`recalcular_calles` (E2-01).** a) Procesar por tandas de 2,000 confirmadas una por una (S). b) Dejarlo,
    corregir su comentario e indicar correrlo sin tope de tiempo y fuera de horario (S). **Recomendación:** a), antes
    del paquete.
17. **La sección de actualización del instructivo (F4-01).** a) Confirmar con el SIA, por escrito, que no tiene nada
    instalado (D337) y cambiarla por «es la primera instalación» (S). b) Si algo se instaló, una migración numerada de
    la 1.1 a la 1.0.0 y su ensayo (M). En los dos casos, anotar en la tabla de migraciones algo que distinga este
    esquema. **Recomendación:** a).
18. **El campo `coordinadores_ids` (F1-01).** a) Quitarlo antes de la 1.0.0, con el esquema, el diccionario, el
    servidor, la aplicación y las tres comprobaciones: unas 2 h; antes de la primera instalación es el momento más
    barato, después sería una migración en producción. b) Dejarlo marcado como histórico en el diccionario, sin
    enviarlo al teléfono y sin comprobaciones (S), y quitarlo después del piloto. **Recomendación:** a), la de la
    coordinación (r1 recomendaba b para la 1.0.0).
19. **El aviso de cabo de apoyo y de relevo (A1-05).** a) Mostrarlo como franja, sin ventana, en Nuevo registro (S): no
    interrumpe y las pruebas no dependen del tiempo. b) Dejarlo como ventana y exponer una marca de «avisos
    terminados» para las pruebas (S). **Recomendación:** b) ahora, porque arregla las pruebas; a) si en campo molesta.
20. **Las diferencias de la calle entre la versión de prueba y el servidor (A2-01).** Documentarlas (S) o igualar el
    desempate (S a M). **Recomendación:** documentarlas: la versión de prueba no da datos reales.
21. **GitHub en el cierre de bloque (A1-03).** Agregar «la corrida de GitHub del commit anterior, en verde» a la lista
    de cierre, con una insignia de estado en el README (S); opcional, un paso que abra un aviso al fallar.
    **Recomendación:** las dos primeras.
22. **Presupuesto de peso (D4).** Propuesta: la primera carga en 2 MB comprimida o menos. Hoy es 1.97 MB (unos 1.80 MB
    en el teléfono); la capa de colonias sola es 760 KB, y M168 ya prevé aligerar las capas. **Recomendación:**
    fijarlo así y medirlo en cada versión.

## 9. Fallas de componentes compartidos

| Componente | Síntoma | Rodeo en el SRP | Aviso | Estado |
|---|---|---|---|---|
| Módulo común de procedencia del backend del SIA | (caso anterior) | Ninguno | `docs/FALLAS-COMPARTIDAS.md` | Corregido por el SIA |

No hay fallas nuevas de componentes del SIA (coordinación). Para el equipo del SIA quedan, sin ser fallas de sus
componentes:
- **F3-01:** el aviso alto de body-parser también alcanza a la versión que usa su backend; se le pide actualizar.
- **B9-01:** confirmar sus cabeceras globales (la protección contra marcos, la política de seguridad del servidor y
  HSTS).
- **F6-01:** es una diferencia de integración entre el paquete de calles, el SRP y la forma en que el SIA registra sus
  capas; se le pide confirmar su regla para actualizar capas.

## 10. No verificable desde aquí, hipótesis, no confirmado y no aplica

**No verificable desde aquí**
- **La fotografía sin señal en Safari real.** En WebKit de la herramienta, sin red, fallan las imágenes en memoria: la
  aplicación dice «No se pudo leer la imagen» 2 de 2 y en modo real los árboles de WebKit llegaron sin foto 2 de 2;
  con red carga bien, y en Chromium sin red también. Una prueba aislada muestra que es la emulación. **Prioridad
  alta:** si Safari se comportara así, los cabos con iPhone no tendrían foto sin señal. Cómo: en un iPhone, con la
  aplicación en la pantalla de inicio y en modo avión, agregar una foto a un árbol (r2).
- **La recarga sin red en WebKit con service worker:** la herramienta da un error interno. B6-02 en iPhone se
  verifica igual, en modo avión (r2).
- **Con qué frecuencia un teléfono real cierra la aplicación en campo**, que es lo que vuelve frecuente B6-02. Cómo:
  en un Android de gama media, en modo avión, recibir la jornada, tomar 5 fotografías con la cámara y ver si la
  jornada sigue; en la segunda prueba en campo (M551) (r3, r6).
- **La cámara en Android 14 y posteriores:** sólo en un teléfono (M46 y M551).
- **Lector de pantalla** (NVDA, VoiceOver o TalkBack) en la compartida: no hay en el equipo (r2, r3).
- **Firefox:** no abre en el equipo; falta un componente del sistema (r2).
- **Las cabeceras globales del servidor del SIA** y su límite para la API: se ven en el sitio del SIA (r4).
- **La contraseña de la cuenta del servicio y la conexión cifrada:** necesitan superusuario (r4).
- **Si el SIA ya instaló la capa de calles, en qué forma, con qué permisos y con qué ruta de búsqueda instalará el
  SRP.** Cómo: como la cuenta del servicio, `SELECT * FROM srp.calle(19.4326, -99.1332);` debe dar `ok` (r4, r5, r6).
- **La explotabilidad del aviso de body-parser:** no se lanzó el ataque (r4).
- **El estado y el historial de GitHub:** regla de no tocar servicios externos; se ven en la pestaña de corridas del
  repositorio (r1).
- **La cobertura del servidor:** las pruebas destruyen el esquema compartido (A1-04); se mide con una base propia
  (r1).
- **Abrir el CSV en Excel o LibreOffice:** no están instalados; se verificó el texto exacto (r1).

**Hipótesis**
- **H-1.** Con datos reales, el reporte desde la ficha abierta también sale sin la calle si el árbol se envió
  después de abrirla: el código es el mismo (A1-01). Se verifica abriendo la ficha, enviando con señal y generando el
  PDF sin reabrirla (r1).
- **H-2.** En el tramo 8 ajustado, la ventana que tapa el botón es un segundo aviso de entrada. Se verifica
  registrando el título de la ventana (r1).
- **H-3.** Con el equipo cargado, la aplicación pone el foco en «Registrar ubicación del punto» un poco tarde después
  de iniciar la jornada, y puede quitárselo a donde ya fue la persona (r2).
- **H-4.** Con «Ver detalle» plegado en el teléfono, la Coordinación no ve «· compartida» en ningún lugar de Nuevo
  registro con datos reales; se vio con la demostración (r3).
- **H-5.** `srp.recalcular_calles()` no cambia la fecha de última edición: un teléfono que ya tenía el árbol quizá no
  reciba su calle nueva hasta bajar todo otra vez (r4).
- **H-6.** «Terminar mi parte» sin señal seguido del cierre: el árbol y el «terminar» salen en ese orden al volver la
  señal y los dos chocan con la jornada cerrada. Es la secuencia más probable en un evento (r6).
- **H-7.** Una capa de calles con otra forma, sin el permiso de lectura o en otra proyección haría fallar el alta de
  todos los árboles, porque las funciones de la calle corren con los permisos de la cuenta del servicio y sólo
  comprueban que las tablas existan (`09-srp-calles.sql:30`). Se prueba en el ensayo de instalación en limpio (r6).
- **H-8.** Mientras corre `recalcular_calles` (unos 53 s), las correcciones de los árboles que toca esperarían y, con
  el tope de 50 s de la cuenta del servicio, podrían terminar en error. Se mide con la base libre (r5).
- **H-9.** Una respuesta de más de 20 s se trata como sin señal y produce el reenvío de E3-01 (r5).
- **H-10.** Si en el SIA la extensión geográfica no vive en el esquema público, el disparador de la calle fallaría en
  cada alta (E1-03; r5).

Se confirmó, en cambio, la hipótesis de r3 de que la jornada recibida en relevo también se pierde al reabrir sin
señal: r6 la reprodujo 2 de 2 (B6-02).

**No confirmado** (7)
- Tramo 54 de la prueba completa: 0 fallas en 8 corridas, 2 de 2 aisladas; la línea base lo dio 1 de 2 (r1).
- Tramo 1, renglón 1237 («la vista previa dice «Jornada 2 de 3»…»): falló 1 vez en la única corrida; no se repitió
  (r1).
- Tras iniciar la compartida con Intro, el foco quedó en el cuerpo de la página 1 de 5 veces, con el equipo cargado
  (r2).
- Al cerrar «Cabos de apoyo» con Escape, el foco fue a «Registrar ubicación del punto» 1 de 5 veces; en 12 de 12 casos
  aislados fue correcto (r2).
- El aviso de compartida cerrado sin «Entendido» volvió a abrirse solo al ir a Nuevo registro 1 de 4 veces (r3).
- Con el Directivo, en modo de prueba, «Informe en PDF» y «Tabla en CSV» de Supervisión estaban deshabilitados 2 de 2;
  en modo real descargaron 2 de 2. Lo más probable es la prueba (el filtro quedó en una opción sin árboles) (r4).
- El aviso «Jornada compartida» crece sin límite con muchas compartidas abiertas (con unas 60, sale cortado arriba);
  en el uso real un cabo tendrá una o dos (r5).

**No aplica**
- D5: el SRP no calcula modelos, índices ni puntajes.
- G1 y los documentos que van a firma: el reporte de jornada se firma pero no cita leyes ni normas.
- El cambio de horario en B8: la aplicación fija la zona de la Ciudad de México, que no tiene horario de verano.

## 11. Plan de corrección en bloques cerrados

| Bloque | Qué va junto | Prueba que lo cierra | Versión |
|---|---|---|---|
| 1. Las pruebas en verde | A1-01, A1-02, A1-03, A1-04, A3-01; decisiones 19 y 21 | La prueba completa sin fallas nuevas, dos corridas seguidas y con `--lento 4` (salvo la de porcentajes, que espera su decisión); GitHub en verde; `preparar_produccion.py` con CRLF y LF da la misma copia; preparar y quitar dejan los roles como estaban | 1.4.3 |
| 2. La jornada compartida en campo | B6-01, B6-02, B6-03, B6-04, C5-01, E3-01, E3-02, E1-02, B5-01, B5-02, B6-05 y la decisión 9; textos P-1 a P-7 y P-17 | En `prueba_conexion.py`, las pruebas nuevas de la sección 12 (apoyo sin señal con cierre y quitado, reabrir sin señal, eliminar, reenvíos, catálogos vacíos); `npm test` con reenvíos, relevo y carrera; repetir E3 sobre la compartida | 1.4.4 |
| 3. Cifras e informes | B2-01, B2-02, B2-03, D3-01, C3-02; decisiones 4 y 5; P-15 y P-16 | En `prueba.py`: el porcentaje simple por calle, la suma de cada red igual a su renglón, los cabos con árboles; el pie igual a la cita del índice; el recálculo B2 en SQL (`r1/b2/`) sin diferencias | 1.4.5 |
| 4. Servidor y base | E1-01, E1-03, E1-04, E1-05 (opcional), E2-01, E2-02, E3-03, E3-04, D2-01, D2-02, F1-01, F6-01, el borrado del registro de entradas (D337); decisiones 10 a 14, 16 y 18 | `npm test` con los casos nuevos; `esquema.test.js` con la ruta fija y las reglas de la calle; `r4/e1_acceso.mjs` y `r4/e1_paridad.mjs` sin diferencias | 1.4.6 |
| 5. Pantalla y textos (con las propuestas aprobadas) | C1-01, C1-02, C2-01, C2-02, C3-01, C5-02, C5-03, C5-04, C6-01, A6-01, A1-05; decisión 6; P-8 a P-14, P-18 y P-19 | El barrido de `r2/guiones/` sin hallazgos; axe en los estados nuevos; `auditoria.py` sin los tres nombres a la vez | 1.4.7 |
| 6. Documentos y paquete 1.0.0 | F4-01, F4-02, F4-03 con M563, D1-01 a D1-23, B3-01, el guion de vaciado (D337); decisiones 15 y 17; confirmar con el SIA F3-01, B9-01 y F6-01 | `empaquetar.py` se detiene con los 6 archivos plantados; el ensayo de instalación en limpio, por alguien distinto de quien escribe el instructivo, con 0 fallas; una nueva revisión de coherencia (D1) | Paquete 1.0.0 para el SIA (D337) |

**Orden.** El bloque 1 va primero porque es pequeño (S cada uno) y sin él ningún otro bloque se puede cerrar con la
prueba en verde. Los bloques 2 y 3 van antes del piloto y antes de mostrar Supervisión al área. El 6 cierra la
entrega. Lo que cambia pantallas (bloques 2, 3 y 5) se presenta antes con su antes y después.

### Propuestas que cambian pantalla (antes y después)

**P-1 · «Revisar», árbol del cabo de apoyo que llegó tarde (B6-01; r2, r3, r5 y r6).**
- Antes: «Por qué: No tiene permiso para registrar en esta jornada.» y un solo botón: [Eliminar este registro].
- Después, con la decisión 1 a) o b): «La Coordinación cerró la jornada «X» (o lo quitó de ella) antes de que llegara
  este árbol. Se enviará solo cuando la reabra o lo vuelva a marcar. También puede pasarlo a otra jornada.» con
  [Pasar a otra jornada], [Enviar otra vez] y [Eliminar este registro] en contorno rojo.
- Después, con la decisión 1 c): no aparece en «Revisar»; la pastilla lo cuenta como pendiente y Nuevo registro dice
  «La Coordinación cerró «X». Sus N árboles se enviarán cuando la reabra. Avísele.»

**P-2 · Nota de la ventana de cierre (C5-01 y B6-01; r3 y r5).**
- Antes, con un punto por revisar: «Puede revisarlo ahora o cerrar de todos modos y revisarlo después.» Sin puntos:
  «Se puede cerrar de todos modos. Si después llegan árboles de un cabo de apoyo, se quedan en su teléfono hasta que se
  reabra la jornada.»
- Después: las dos notas juntas, con el texto de la decisión 1; por ejemplo: «Puede revisarlo ahora o cerrar de todos
  modos. Los árboles que Yolanda Cruz aún no envía no se aceptarán hasta que reabra la jornada.»
- Si B6-01 no se corrige: «Si después llegan árboles de un cabo de apoyo, el servidor no los recibirá: pídales que
  envíen lo suyo antes de cerrar.»

**P-3 · Quitar a un cabo de apoyo (r2).**
- Antes: se desmarca y «Guardar: 1 cabo de apoyo» guarda sin preguntar.
- Después: «¿Quitar a <nombre>? Si registró árboles sin señal, le llegarán cuando tenga señal» (según la decisión 1),
  con [Quitar] en contorno rojo y [Cancelar].

**P-4 · Eliminar una jornada compartida (B6-03; r6).**
- Antes: «¿Eliminar la jornada «B»? · No tiene árboles registrados. · La bitácora conserva la constancia.»
- Después: el botón no aparece mientras haya cabos de apoyo vigentes; si se intenta: «No se puede eliminar: <nombre>
  no ha terminado su parte y puede tener árboles sin enviar. Quítelo en «Cabos de apoyo» o espere a que termine.»

**P-5 · Nuevo registro del cabo de apoyo que abre sin señal (sólo si la decisión 2 es b; r2 y r6).**
- Antes: el formulario «Registrar jornada», sin más.
- Después, arriba del formulario: «Usted es cabo de apoyo en «X», que coordina <nombre>. Sin señal no se puede traer
  la jornada: espere a tener señal un momento antes de registrar. No inicie otra jornada.»

**P-6 · Las instrucciones, mientras no se resuelva B6-02 (`index.html:262` y `:1001`, y el manual; r2).**
- Antes: «Cada cabo abre el sistema con señal un momento: así le llega la jornada a su teléfono.»
- Después: «… así le llega la jornada. No cierre la aplicación hasta terminar: si se cierra sin señal, la jornada
  vuelve a llegar cuando tenga señal.»

**P-7 · El cabo al que quitaron o cuya jornada se cerró (B6-04; r6).**
- Antes: la compartida sigue como «Jornada activa» y cada árbol nuevo sale rechazado con «No tiene permiso…».
- Después: la jornada sale de Nuevo registro con el aviso «La Coordinación lo quitó de «X» a las 12:40. Lo que
  registró antes se envió; lo de después, páselo a otra jornada o elimínelo.» (o «La Coordinación cerró «X»…»).

**P-8 · Franja de la Coordinación en una compartida (C1-01; r3).**
- Antes: «Plaza cívica · El Mirador / 10 de 60 árboles» y los botones.
- Después: «Plaza cívica · El Mirador / 10 de 60 árboles / Compartida · 1 cabo registrando, 1 terminó», a la vista
  también en el teléfono; al tocarlo se abre «Cabos de apoyo», donde cada renglón dice además «· 3 árboles».

**P-9 · Ventana «Cabos de apoyo» (C3-01; r3).**
- Antes: texto, lista, 6 pasos de instrucciones y, al final, «Guardar» (en el teléfono, a 1,076 px de 812).
- Después: texto, un campo «Buscar cabo» (con más de 10 cabos), la lista y «Guardar» fijo al pie; las instrucciones
  plegadas en «Cómo funciona una jornada compartida», abiertas sólo la primera vez; cada cabo con otra jornada abierta
  hoy dice «· tiene otra jornada abierta».

**P-10 · Siguiente paso en una compartida (C5-03; r3).**
- Antes: «Siguiente: registrar los árboles que faltan (lo hace el cabo) (9 de 60).»
- Después: «Siguiente: registrar los árboles que faltan (9 de 60); los registran la Coordinación y sus cabos de
  apoyo.»

**P-11 · La calle en el detalle (C1-02; r3).**
- Antes: «Calle secundaria · Alcaldía Xochimilco».
- Después: «Calle secundaria · la atiende la Alcaldía Xochimilco».

**P-12 · El GPS (C2-02; r3).**
- Antes: «Afinando la lectura del GPS, hasta 30 s. Mientras, puede llenar lo demás.»
- Después: «Afinando la lectura del GPS (faltan 24 s). Mientras, puede llenar lo demás.» Si al terminar sigue baja:
  «El GPS no mejoró en 30 s. Vaya a un lugar abierto y toque «Actualizar ubicación», o arrastre el punto hasta el
  árbol.»

**P-13 · «Terminar mi parte» (C2-01; r3).**
- Antes: «La jornada sale de su lista y ya no registra en ella.»
- Después: «Ya no podrá registrar en ella; la seguirá viendo en Jornadas.»

**P-14 · Cabo marcado (C6-01; r3).**
- Antes: renglón azul relleno, igual que el botón «Guardar».
- Después: fondo azul claro, borde azul de 2 px y palomita.

**P-15 · Pie de «Por red vial» en Supervisión y en el informe (D3-01; r1).**
- Antes: «… Elaborada por SEDEMA con información del INEGI (Marco Geoestadístico, Encuesta Intercensal 2025; Red
  Nacional de Caminos 2025) y de SEMOVI (Vialidades primarias, CC BY 4.0, y el acuerdo de clasificación de vialidades
  de 2024).»
- Después: la cita completa del índice de la capa: «… INEGI, Red Nacional de Caminos 2025 (INEGI, SICT, IMT); SEMOVI,
  Vialidades primarias de la Ciudad de México (Portal de Datos Abiertos de la Ciudad de México, CC BY 4.0), y el
  acuerdo de la Comisión de Clasificación de Vialidades. SEDEMA unió, partió y clasificó los tramos, y homologó sus
  nombres; esas transformaciones no son del INEGI ni de SEMOVI, ni están respaldadas por ellos.»

**P-16 · Renglón de red vial con calles partidas (B2-03, decisión 5 a; r1).**
- Antes: «Vialidades primarias · … · 155 calles · 906 árboles», y su lista suma 912.
- Después: «Vialidades primarias · … · 158 calles · 906 árboles», y la lista suma 906; «Eje 4 Norte» aparece en las
  dos listas (6 y 5 árboles).

**P-17 · Entrada con catálogos dañados (B5-02; r5).**
- Antes: «No se pudo entrar (listas[t].forEach is not a function)» y «Falta corregir 1 dato».
- Después: «El servidor respondió algo que no se entiende al bajar los catálogos. Intente de nuevo en unos minutos.»,
  sin el título de «dato».

**P-18 · Nombre del perfil (C5-02, decisión 6).**
- Antes: «(Coordinador)» en el menú, Usuarios, el historial y el PDF; «(coordinación)» en el cierre y los filtros.
- Después: «(Coordinación)» en todos.

**P-19 · Círculo de precisión del GPS (A6-01; r2).**
- Antes: trazo de 1.5 px sin halo.
- Después: trazo de 2.5 px sobre un halo blanco de 1 px.

## 12. Pruebas nuevas que deben quedar permanentes

| Prueba | Serie | Base en la evidencia |
|---|---|---|
| Cabo de apoyo que registra sin señal; la Coordinación lo quita y cierra; al volver la señal y reabrir, los árboles llegan (B6-01) | Cada cambio (`prueba_conexion.py`) | `r6/f1_compartida_sin_senal.py`, `r3/s9_real_cerrada.py`, `r5/e3_navegador.py` (B1, B2), `r2/guiones/compartida_real.py` |
| Reabrir sin señal con service worker: el titular, el de apoyo y el de relevo siguen con su jornada (B6-02) | Cada cambio | `r6/f2_reabrir_sin_senal.py`, `r2/guiones/apoyo_reabre_sin_senal.py` |
| Eliminar una compartida con un cabo vigente se niega (B6-03) | Cada cambio | `r6/f1_compartida_sin_senal.py` |
| El cabo quitado, con su primer envío, queda sin la jornada y con el aviso (B6-04) | Cada cambio | `r6/f1_compartida_sin_senal.py` |
| Compartir y terminar reenviados no deshacen lo del otro (E3-01) | Cada cambio (`npm test`) | `r5/e3_compartida.mjs` (A13, A13b) |
| El relevo en una compartida se niega; un cabo con historia de apoyo nunca obtiene editar ni eliminar (E1-02) | Cada cambio (permisos y paridad) | `r5/e3_relevo_otra_coord.mjs`, `r4/e1_paridad.mjs` |
| «Terminar mi parte» después del cierre deja al cabo terminado (E3-02); listas mal formadas dan error de datos (E3-03); nombres sin caracteres de dirección (E3-04) | Cada cambio (`npm test`) | `r5/e3_compartida.mjs` |
| Sustituir un árbol eliminado sin alcance: rechazo sin datos (E1-01) | Cada cambio (`npm test`) | `r4/e1_acceso.mjs`, casos 127 a 131 |
| `/catalogos` con `{}` no vacía los catálogos (B5-01); la entrada sin nombres internos (B5-02) | Cada cambio | `r5/e3_navegador2.py` (C2) |
| El cierre con cabos vigentes y un punto por revisar trae las dos notas (C5-01) | Cada cambio (`prueba.py`) | `r3/s10_nota_cierre.py` |
| «Por calle»: porcentaje simple y suma de cada red igual a su renglón (B2-01, B2-03); cabos que trabajaron = cabos con árboles (B2-02) | Cada cambio (`prueba.py`) | `r3/s4_cifras.py` |
| El reporte desde la ficha abierta lee datos al día (A1-01) | Cada cambio | `r1/a1/depurar_calle2.py` |
| El pie de «Por red vial» igual a la cita del índice (D3-01) | Cada cambio (`auditoria.py`) | — |
| En `auditoria.py`: sumas e índice de la copia ligera; las constantes de 40 y 4 m iguales en la aplicación y en la base; la coherencia guardada de la calle y de los cabos de apoyo; la versión del esquema cambia si cambian los campos; `VERSION`, la configuración, las marcas `?v=` y el README dicen lo mismo; los manuales con idioma, título y «1.0.0»; un solo nombre del perfil; quitar las tres comprobaciones de coordinadores | Cada cambio | La lista de r1 (A5) y de r3 (C5) |
| La calle se asigna al volver la red, sin otro envío (B6-05) | Cada cambio | `r2/guiones/calles_sin_senal.py` |
| `preparar_produccion.py` con CRLF y con LF da la misma copia; ante un error no deja carpeta (A3-01) | Cada cambio | `r1/a3/regenerar.sh` |
| Preparar y quitar las cuentas de prueba dejan los roles como estaban (A1-04) | Cada cambio | — |
| Mover el punto deja «Calle:» en la bitácora (E2-02); la ruta de búsqueda fija y la cuenta del servicio sin el recálculo (E1-03); las reglas de la calle en la base (D2-01) | Cada cambio (`npm test`, `esquema.test.js`) | `r5/e2_bitacora_calle.mjs`, `r4/e1_funciones.sql` |
| La compartida a las 23:50 del 31-DIC y después de la medianoche, en otra zona horaria | Cada versión | `r2/guiones/fechas_compartida.py` |
| El foco y axe en la ventana «Cabos de apoyo» con su contenido real | Cada versión | `r2/guiones/b4_nuevas.py` |
| Barrido de 4 perfiles × 7 tamaños × 2 modos (unos 25 min) | Cada versión | `r2/guiones/barrido_r2.py` y `resumen_r2.py` |
| Recálculo de cifras en SQL contra Supervisión, PDF y CSV | Cada versión | `r1/b2/b2_sql.sql` y `b2_comparar.py` |
| La calle de prueba contra la del servidor, con un tope de diferencias de nombre (A2-01) | Cada versión | `r1/a2/puntos_sql.sql` y `calle_js_contra_sql.mjs` |
| Dominios externos bloqueados, violaciones de la política de seguridad y texto inyectado, en los dos modos | Cada versión | `r4/b7b9_barrido.py` |
| Las 135 peticiones de acceso y la paridad de reglas | Cada versión | `r4/e1_acceso.mjs`, `r4/e1_paridad.mjs` |
| Concurrencia de la compartida (45 árboles a la vez, doble envío) | Cada versión | `r5/e3_compartida.mjs` (A1, A12) |
| Respaldo y restauración, con respaldo alterado y cortado | Antes de entregar | `r5/e2_respaldo.sh` |
| Ensayo de instalación en limpio | Antes de entregar | `r4/f5_ensayo_instalacion.py --ejecutar` |
| `empaquetar.py` con los 6 archivos plantados; el instructivo nombra cada guion, la capa de calles, el recálculo y la versión (F4-01, F4-02) | Antes de entregar | `r4/f4_empaquetar_huecos.txt` |
| La capa instalada contra el gpkg, al instalar o actualizar la capa | Antes de entregar | `r1/a2/capa_bd_contra_gpkg.py` |
| Las columnas que usa `srp.calle()` contra las del paquete de calles, y la fuente de la versión (F6-01) | Antes de entregar | `r4/f6_receptor.txt` |
| Secretos y placas reales en los commits nuevos | Antes de entregar | `r4/e1_secretos_nuevos.py` |

## 13. Criterios de salida

| Momento | Criterio | Cumple | Por qué |
|---|---|---|---|
| Cada cambio | A1 a A6 en 0 fallas | No | La prueba completa: 5 fallas y 4 tramos detenidos (A1-01, A1-02); GitHub en rojo (A1-03) |
| Cada versión | 0 Críticos y 0 Altos abiertos | No | 2 Críticos y 4 Altos |
| Al terminar pantallas o tras cambios grandes | Sin Altos en C1 ni en C5 | No | B6-02 (Alta) salió también de C1 |
| Antes de mostrar al área | B1, B2, C1 y C5 sin Altos; 0 diferencias en cifras | No | B2-01 (Crítica), B2-02 (Alta) y B2-03 (las listas no suman su renglón) |
| Antes de cerrar una etapa | Sin contradicciones abiertas; dentro del presupuesto de peso | No | La sección 7 tiene contradicciones abiertas; no hay presupuesto fijado (decisión 22) |
| Antes de usar datos reales | 0 Críticos y 0 Altos en E; plazo de conservación decidido; aviso con constancia | No | B6-01 también es de E3; E1 sin Críticos ni Altos; el plazo de entradas está decidido (D337) pero no programado y el de las sesiones no; falta la constancia escrita del aviso. E2 sí cumple: el respaldo se restaura entero |
| Antes de entregar | F1 a F6 completas; ensayo aprobado por otra persona | No | F4-01 (Alta), F4-02; F6 sin la revisión del SIA. El ensayo en limpio, por alguien distinto de quien escribió el instructivo, sí instala (58 de 63; las 4 fallas son del instructivo) |
| Documentos a firma | 0 citas equivocadas | No aplica | — |
| Antes de operar | H1 a H6 hechas con constancia | No | Sin hacer |
| Siempre | G2 registrada y avisada | Sí | El único caso está registrado y corregido; no hay nuevos |

## 14. Calendario

| Auditoría | Cada cuándo |
|---|---|
| A1 a A6 | En cada cambio, y la corrida de GitHub en verde antes de cerrar cada bloque |
| B1 (barrido), B2 (cifras), B4, B6 (la compartida sin señal) y B8 | En cada versión |
| E3 sobre la jornada compartida | Después del bloque 2, y tras cada cambio de la cola de envío o de los permisos |
| E1, E2, F3, F4 y F5 | Antes de cada entrega al SIA; la próxima, el paquete 1.0.0 |
| D1 | Al cerrar cada etapa y al armar cada paquete |
| A2 y D3 (capa de calles) | Cada vez que el SIA instale o actualice la capa |
| H1, H2 y H6 | Antes y durante el piloto |
| H7 | Mensual en operación: dependencias, cuentas y accesos, calidad de los datos, espacio de fotografías y errores del servidor |

## 15. Método

- **Revisores y frentes.** Cada uno con su copia del commit, sus puertos y sus cuentas de prueba; nadie revisó lo que
  construyó. Seguridad, «Intentar romperlo» y limpieza fueron con revisores distintos.

  | Revisor | Frente | Auditorías |
  |---|---|---|
  | r1 | Pruebas, datos y construcción | A1 a A5, B2, B3, D2 y D3 |
  | r2 | Pantallas, accesibilidad y teléfono | A6, B1, B4, B6 y B8 |
  | r3 | Tareas, UX, textos y manuales | C1 a C6 y los dos manuales contra la aplicación |
  | r4 | Seguridad, despliegue y paquete | E1, B7, B9, F3, F4, F5 (en seco y, al final, con la base) y F6 |
  | r5 | Robustez e «Intentar romperlo» | B5, E2 (la restauración, al final, con la base libre) y E3 |
  | r6 | Independiente de los frentes graves: la compartida con señal intermitente, reabrir sin señal y el instructivo; recibió la descripción de los frentes, no los hallazgos | B6, E3, C4, C5, D1 y F6 |
  | Coordinación | Línea base, consolidación, clasificación y verificación por lectura de los Críticos y Altos | D1, D4, F1, F2 (por muestreo) y G2 |

- **Pantallas, anchos y navegadores:** 360, 390, 430, 844×390, 768, 1440×900 y zoom al 200 % (r2); 390×844 y
  1440×900 (r3); 412 px (r6). Chromium y WebKit de Playwright; Firefox no abre en el equipo.
- **Herramientas:** Python 3.12 con Playwright; Node 24; axe-core 4.10.3, tomado de la carpeta de herramientas de la
  auditoría anterior; ESLint con la configuración de la auditoría anterior; la revisión de tipos del proyecto; pyflakes;
  pypdf; `npm audit`; un servidor web local con el fragmento del paquete; las herramientas de respaldo de la base para
  E2. No se instaló ni se descargó nada.
- **Número de pruebas:**
  - r1: 6 tramos de la prueba completa corridos solos; 33,808 puntos de la calle; 178,771 tramos comparados; recálculo
    de cifras en 2 combinaciones y una compartida propia; 11 casos de inyección en el CSV;
  - r2: 72 corridas del barrido (477 pantallas y 1,352 botones), 50 corridas de axe, 14 corridas en modo real de la
    compartida y 45 comprobaciones de fechas;
  - r3: 17 fichas de tareas, 14 pantallas medidas, 320 cadenas, unas 220 afirmaciones de los manuales y 168 citas;
  - r4: 135 peticiones alteradas × 2, 73,482 comparaciones de reglas, 30 consultas como la cuenta del servicio, 6
    archivos plantados y 25 comprobaciones del ensayo en seco × 2;
  - r5: unos 50 casos por la API y 9 escenarios en el navegador, × 2; la carrera, 10 intentos por corrida;
  - r6: 5 corridas en modo real (3 del frente 1 y 2 del frente 2).
- **Entorno:** copias del commit fuera de la carpeta original; la base local de desarrollo, compartida entre los
  revisores, con la demostración (de 17,000 a 22,000 árboles); la cuenta del servicio, nunca una de administración de
  la base. Cuentas de prueba `rN.*@ejemplo.local`, quitadas al terminar con todo lo que hicieron (por ejemplo, r5 quitó
  79 jornadas, 165 árboles y 618 renglones de bitácora). Sin producción, sin datos reales nuevos y sin servicios
  externos, salvo `npm audit` y las teselas del mapa base.
- **Línea base y resultado final:**

  | Suite | Al empezar | Al terminar |
  |---|---|---|
  | `por_tramos.py` (prueba completa, 85 tramos, 59 min) | 852 comprobaciones, 5 fallas y 4 tramos detenidos (1, 54, 84 y 85); el 26-10 había dado 1,536 de 1,539 | 844 comprobaciones, 3 fallas (porcentajes y Excel, ya conocidas, y la de los cabos de apoyo del tramo 84) y 3 tramos detenidos (1, 8 y 85); 51 min. Ninguna falla de un tipo nuevo: las diferencias son las de las esperas fijas (A1-02) |
  | GitHub (última corrida, `dab0e0b`, 32 min) | 1,508 comprobaciones, 2 fallas (calle y porcentajes) y el tramo 8 detenido | Sin corrida nueva: la auditoría no subió nada |
  | `prueba_conexion.py` | 126 de 126 (una de dos corridas se cayó en el renglón 1194) | 126 de 126 |
  | `npm test` del servidor | 109 de 109 | 109 de 109 |
  | `auditoria.py` | 147 comprobaciones, 0 hallazgos | 147 comprobaciones, 0 hallazgos |
  | `auditoria_css.py` y `revisar.py` | 0 hallazgos | 0 hallazgos (`revisar.py` no corre desde otra carpeta: A5-01) |

- **Huellas:** 2,575 archivos al empezar y 2,583 al terminar, sin contar este informe ni su evidencia. La comparación
  da 0 cambiados, 0 quitados y 8 nuevos: las capturas `rev_*.png` que `pruebas/revisar.py` escribe en la carpeta desde
  donde se corre, al tomar la línea base y al repetirla (A5-01). Al terminar se movieron a `_to_delete/`. El commit
  sigue en `1eb30e6`. Los dos archivos de huellas están en `coordinacion/`, dentro de la evidencia.
- **Informe sensible:** hay un informe aparte, fuera del repositorio, con lo que no puede ir aquí. No se copia a esta
  evidencia.
- **Evidencia:** la completa pesa 29 MB (las capturas, los PDF y los datos grandes) y queda fuera del repositorio,
  en `servidor/local/auditoria-2026-10-27/`, con el informe sensible del revisor de seguridad. En el repositorio,
  `docs/evidencia-2026-10-27/` lleva sólo los guiones y las salidas de texto: 228 archivos, 2.5 MB. Al copiarla se
  dejaron fuera las copias regeneradas del proyecto, los archivos plantados para probar el empaquetador y 239 capturas
  repetidas o no citadas (lista en `CAPTURAS-FUERA.txt`). Se reemplazaron las rutas personales por `<carpeta del
  usuario>`, se quitaron dos contraseñas de prueba escritas en guiones y el identificador de la versión del backend
  del SIA. Se buscaron las 16 placas reales en todo el texto, los ZIP y el texto de los PDF: 0 apariciones. Detalle
  en `LEEME.md`.
- **Incidencias del proceso:**
  - la herramienta de cuentas de prueba le quitó el rol del servicio a la cuenta local compartida cuando un revisor
    corrió «quitar»; se restableció cada vez (A1-04);
  - en una copia faltaba el servidor compilado y se compiló;
  - un servidor de prueba anterior en un puerto invalidó una corrida del ciclo del service worker (r2), que se repitió;
  - con cinco revisores en el mismo equipo, varias fallas por tiempos se repitieron y se separaron las de la prueba de
    las del sistema (A1-02);
  - después del ensayo de instalación, la cuenta del servicio de la base local quedó sin contraseña; no se sabe si antes
    tenía una. Los servicios locales no la usan: entran con la cuenta local y cambian de rol;
  - antes de la restauración y del ensayo, la coordinación guardó un respaldo propio del esquema, fuera del proyecto.
    No hizo falta usarlo.

## 16. Qué sigue

**Recomendación:** decidir primero las preguntas 1 a 4 de la sección 8 (la jornada compartida y la definición de
«trabajaron»), porque de ellas dependen los textos y las pruebas. Después, corregir en este orden:
1. el bloque 1 (pruebas en verde), que es pequeño y permite cerrar los demás con la prueba en verde;
2. el bloque 2 (la jornada compartida en campo), que cierra el Crítico B6-01 y los Altos B6-02 y B6-03;
3. el bloque 3 (cifras), con el Crítico B2-01 y el Alto B2-02, antes de mostrar Supervisión al área.

Al terminar el bloque 2, repetir «Intentar romperlo» sobre la jornada compartida con los guiones de r5 y r6. El
instructivo y el paquete 1.0.0 (bloque 6) van al final, con el ensayo de instalación en limpio hecho por alguien
distinto de quien lo escribe y la confirmación escrita del SIA de que no tiene nada instalado.

No se corrigió nada. Las correcciones empiezan cuando usted apruebe el plan (sección 11) y conteste las decisiones de la
sección 8.

## Seguimiento de las correcciones

El dueño contestó el 27-10-2026 las 22 preguntas de la sección 8. Eligió lo recomendado en todas, y en la 15 pidió
dejar el aviso de body-parser escrito para el SIA en el instructivo (D339). El informe se sube con el bloque 1.

### Bloque 1 · Las pruebas en verde (bloque 256 del proyecto, versión 1.4.3)

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| A1-01 | Corregido | «Generar reporte» vuelve a leer los árboles de la jornada: lo que el envío les puso con la ficha abierta, como la calle, llega al reporte. Antes, el tramo 1 fallaba 2 de 2 en el renglón de la calle; después, pasa (645 de 645, dos corridas) | `prueba.py`, tramo 1: la ficha se abre antes del envío |
| A1-02 | Corregido | La prueba espera condiciones, no tiempos: que la jornada nueva quede activa, que terminen los avisos de entrada, que la ficha diga «compartida», que se pinte la lista o el aviso. Los tramos 8, 13, 18, 40, 42, 54, 84 y 85: antes, detenidos o con falla de vez en cuando; después, la prueba completa da 1,538 de 1,540 sin tramos detenidos (las dos fallas, Excel y porcentajes, son las conocidas), y los tramos que fallaron pasan otra vez, también con el equipo 4 veces más lento | `prueba.py`: `aceptar_avisos`, `esperar_avisos` e `iniciar_jornada` |
| A1-05, decisión 19 | Corregido | `<html data-avisos>` dice «revisando» mientras se buscan o se muestran los avisos de entrada y «listos» al terminar. No cambia nada en pantalla | `prueba.py`, ctx102 |
| A1-03, decisión 21 | Corregido | El README lleva el indicador de las pruebas de GitHub, y la regla de cierre: revisar la corrida del commit anterior y anotar su número en la bitácora | La verificación de cada bloque |
| A3-01 | Corregido | `preparar_produccion.py` reconoce el fin de renglón que traiga el clon, arma la copia en una carpeta temporal y sólo la pasa al destino si termina bien; el mensaje dice la ruta legible. `.gitattributes` fija LF, salvo en la evidencia de las auditorías. Antes, desde un clon con CRLF, la herramienta se caía y dejaba una copia a medias; después, la misma copia que desde LF (76 archivos), y ante un error el destino no se crea | `auditoria.py`: las dos comprobaciones nuevas fallan con la herramienta de antes y pasan con la nueva |
| A1-04 | Corregido en parte | `apoyo_servidor.mjs` presta el rol del servicio sólo si falta y ya no lo quita al limpiar: otro servicio de prueba puede estar usándolo. Sigue pendiente una base propia para `npm test`, que hoy reinstala el esquema de la base local de desarrollo: crearla pide la cuenta de administración de PostgreSQL | — |

Verificación del bloque: `prueba_conexion.py` 126 de 126; `auditoria.py` 149 comprobaciones y 0 hallazgos; la prueba
completa, 1,538 de 1,540 y ningún tramo detenido (antes, 844 comprobaciones, 3 fallas y 3 tramos detenidos).

### Bloque 4 · Servidor y base (bloque 257 del proyecto, versión 1.4.4)

Se adelantó a los bloques 2 y 3 porque no cambia pantallas y sus decisiones ya estaban tomadas; los bloques 2, 3 y 5
esperan la aprobación de sus muestras (D340).

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| E1-01 · decisión 10 | Corregido | «Sustituir» revisa el alcance antes de responder: a quien no alcanza el árbol, el rechazo por permiso sin ningún dato; a quien lo alcanza, el árbol al día | `recepcion.test.js`: un cabo de otra institución y uno de la misma sin alcance reciben `SIN_PERMISO` y nada más |
| E1-03 | Corregido | La instalación fija la ruta de búsqueda en «srp y el esquema de PostGIS» antes de crear las funciones. Antes, las 9 funciones con ruta llevaban `"$user", public`; después, `srp, public` (y `pg_catalog, pg_temp` la del recorte) | `esquema.test.js`: ninguna función con `"$user"`; la cuenta del servicio no puede recalcular las calles |
| E1-04 · decisión 14 | Corregido | Lo que no tiene forma de correo se anota como «(no es un correo)» | `acceso.test.js`: una «contraseña» escrita en el campo del correo no queda en el registro |
| E1-05 | No se hizo | Era opcional: el disparador pone la calle en cada alta y cada cambio de punto, y ningún código la escribe (D340) | — |
| E2-01 · decisión 16 | Corregido | `CALL srp.recalcular_calles();`, un procedimiento que confirma cada tanda de 2,000 árboles; si se interrumpe, lo confirmado se queda. Con 18,359 árboles, 11 s | `recepcion.test.js` |
| E2-02 | Corregido | Al corregir el punto, la bitácora dice «Calle: sin calle a 40 m → Calle Parroquia, a 7 m» | `recepcion.test.js` |
| E3-03 | Corregido | Una lista de cabos que no es una lista de identificadores se rechaza como error de datos, no como «recibido, repetido» | `recepcion.test.js`: texto, nulo, objeto, un identificador inválido y uno en mayúsculas |
| E3-04 | Corregido en el servidor | Los textos llegan sin el carácter nulo ni los de control de dirección. En el teléfono de quien escribe, el nombre se ve como lo tecleó hasta que vuelve del servidor | `recepcion.test.js` |
| D2-01 | Corregido | La base exige la forma de la calle («ok» con tramo a 40 m o menos, «lejos» sin tramo, sin calcular todo vacío) y la de cada cabo de apoyo; `esquema.json` declara su relación con las cuentas | `recepcion.test.js` |
| D2-02 | Corregido | La versión del esquema sube con cada cambio de campos (2026-10-28) y guarda la huella de sus campos | `auditoria.py`: si los campos cambian y la versión no, lo dice |
| F1-01 · decisión 18 | Corregido | `coordinadores_ids` sale del esquema, del servidor, de la aplicación y de las pruebas; un teléfono que lo tenga lo pierde al abrir la base | `auditoria.py` (ninguna cuenta lo guarda) y `prueba.py` |
| F6-01 · decisión 11 | Corregido en el SRP · Para el SIA | `srp.version_calles()` lee la versión vigente de `territorio.version_capa` y, si falta, la del paquete. Falta que el SIA confirme por escrito su regla para actualizar capas (bloque 6) | `recepcion.test.js`: una versión vigente nueva en la tabla del SIA es la que toma la calle |
| Registro de entradas (D337) · decisiones 12 y 13 | Corregido | `srp.recortar_acceso()` borra las entradas y las sesiones terminadas de hace más de un año; el servicio la llama con la primera entrada de cada día | `esquema.test.js` (sólo esa función borra, y sólo lo de hace más de un año) y `acceso.test.js` (la entrada la llama) |

Las pruebas nuevas no se corrieron contra el código anterior: sin `coordinadores_ids`, el esquema cambió y no se pueden
instalar sobre él. Cada una revisa algo que antes no existía o respondía distinto, y las fallas se habían reproducido 2 de
2 en la auditoría.

Verificación del bloque: `npm test` 115 de 115; `prueba_conexion.py` 126 de 126; `auditoria.py` 147 comprobaciones y
0 hallazgos; la prueba completa, 1,539 de 1,540 (sólo el Excel) y ningún tramo detenido. GitHub, en verde con el bloque 1
(corrida 40642306243).

### Adelantos del bloque 6 (bloque 258 del proyecto, sin versión nueva)

| Clave | Estado | Antes y después | Prueba permanente |
|---|---|---|---|
| F4-02 | Corregido | Con los seis archivos plantados, la herramienta anterior armó el ZIP las seis veces; la nueva se detiene con cada uno. La entrega anterior se arma igual, con sus dos avisos revisados | `auditoria.py`: un paquete limpio se arma; con cada archivo plantado, no |
| F4-03 | Corregido en parte | El comentario de `usuarios.id` en la base ya no cita las cuentas de prueba. `CUENTAS_POR_ROL` de `js/app.js` va con M563 | — |
| D1-01 | Corregido (bloque 257) | El README describe la regla de la institución, sin `coordinadores_ids` | — |
| D1-02 | Corregido | Las filas 14 y 18 de `FASE2-Y-TRASPASO.md` describen la regla de la institución, la que corre en el servidor | — |
| D1-03 | Corregido | El «Siguiente paso» de `PLAN-TRASPASO-SIA.md` dice la 1.0.0 (D337) | — |
| D1-04 y D1-05 | Corregido (bloque 256) | El README y `MEJORAS.md` dicen que la versión va en la franja de arriba, con su número de hoy | — |
| D1-06 | Corregido | `FASE2-Y-TRASPASO.md` trae las cifras de carga medidas el 27-10-2026 y el presupuesto de 2 MB | — |
| D1-07 | Corregido | La pregunta 1 de `ALINEACION-SIA.md` queda resuelta con D337 | — |

Verificación: `auditoria.py` 149 comprobaciones y 0 hallazgos; `npm test` 115 de 115.
