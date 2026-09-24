# Decisiones del proyecto SRP

| # | Decisión | Motivo |
|---|---|---|
| D01 | Dos fases: Fase 1 local sin servidor; Fase 2 servidor, API y sincronización | Probar el flujo de campo antes de invertir en infraestructura |
| D02 | Cuatro perfiles: Registrador, Jefe de registradores, Administración global (SIA), Consulta | Definido por Liber, 21-09-2026. **Términos superados por D85**: hoy son Cabo, Coordinador, Administración global y Consulta (`CABO`, `COORDINADOR`, `ADMIN`, `VIEWER`); Consulta está definido en código y sin cuenta, por confirmar |
| D03 | Jefe edita registros de su equipo; en producción aparece en Fase 2 | Definido por Liber. **Léase Coordinador (D85)**: edita los de sus cabos, no elimina |
| D04 | Los cuatro perfiles se simulan desde Fase 1 | Definido por Liber: estructura lista antes de datos reales. Las cuentas de arranque son tres (Administración, Coordinador, Cabo) |
| D05 | Usuarios en tabla USUARIOS de la base (Fase 2); en Fase 1, almacén `usuarios` | Definido por Liber |
| D06 | Registrador se da de alta con nombre, apellidos, área y cargo-rol; queda fijo en el dispositivo | Cada dispositivo = un registrador. **Léase cabo (D85)**; la cuenta también lleva correo y coordinador |
| D07 | Editor de catálogos sólo para Administración global, en pestaña «Catálogos» | Definido por Liber |
| D08 | Un valor de catálogo con uso no se elimina: se desactiva | Auditoría completa; los registros conservan su valor |
| D09 | Catálogos iniciales: programas Reforestación Urbana y Centro Histórico; áreas Dirección de Infraestructura Verde y Coordinación del SIA | Definido por Liber |
| D10 | Toda alta, edición, eliminación, activación y desactivación queda en bitácora (quién, cuándo, perfil, campos) | Norma 7.7; definido por Liber |
| D11 | Eliminar un registro lo marca `eliminado`; no se borra | Norma 7.4: un solo camino de retiro, con constancia |
| D12 | Los registros guardan identificadores de especie, programa y registrador (hoy `cabo_id`, D85), no sus nombres | Fuente única: renombrar en catálogo actualiza todo. Sustituye el esquema previo que copiaba nombres |
| D13 | Bibliotecas incluidas localmente, no desde CDN | Funciona sin señal y al abrir con doble clic |
| D14 | Turf empaquetado sólo con punto-en-polígono (12 KB en lugar de 592 KB) | Rendimiento en teléfono modesto |
| D15 | En bordes entre polígonos gana el primero que contiene el punto | Precedencia declarada (Norma 6.6). [pendiente] revisar con capas reales |
| D16 | Cruce territorial en el navegador sólo para registro de campo | Si en Fase 2 se usa para turnar o validar, se hace en servidor (Norma 6.4) |
| D17 | Se retiran `enviado_en`, `id_servidor` y `comentarios` del esquema previo | Norma 4.7 y 1.8: sin uso en Fase 1; se agregan cuando exista el uso |
| D18 | Mapa: pan con dos dedos, acercar con +/−; alternativa de captura manual de coordenadas | Evita conflicto con el desplazamiento; Norma 6.10 |
| D19 | El filtro de periodo son atajos más listas de Año y Mes; el rango Desde/Hasta queda para casos finos | Definido por Liber: el sistema opera hasta 2030 y una fila de chips de mes sueltos deja de servir al acumularse los años. ~~Los atajos eran Este mes, Mes pasado y Este año~~: reducidos en D53 |
| D20 | Año/Mes y el rango Desde/Hasta no conviven: elegir uno limpia el otro | Dos criterios de fecha a la vez producen un resultado que nadie puede explicar |
| D21 | El mes sólo lista los meses con registros en el año elegido | Evita elegir un periodo vacío y dudar si el filtro falló |
| D22 | Al agregar en cualquier catálogo, la clave se sugiere a partir del nombre: sin acentos, mayúsculas, guion bajo; editable antes de guardar y fija después | Definido por Liber. La unión de datos se hace por clave (Norma 6.5), así que debe ser estable y legible |
| D23 | Si la clave sugerida ya existe, se propone con sufijo _2, _3 | Dos valores con la misma clave harían ambigua la unión |
| D24 | Las claves del catálogo real de especies se cargan tal cual; la generación automática aplica sólo a lo que se agregue después | Definido por Liber: su archivo ya trae claves propias |
| D25 | Escala de énfasis de tres niveles, única en toda la aplicación: guinda relleno para la acción principal, guinda de contorno para la alterna del mismo rango, gris subrayado para lo de apoyo (desplegar, salir, ampliar) | Señalado por Liber: «Registrar ubicación del punto» y «Capturar coordenadas a mano» eran las dos guindas y parecían lo mismo. El guinda queda reservado a los dos primeros niveles |
| D26 | Cerrar sesión y cambiar de usuario son texto clicable, sin caja | Definido por Liber. En el encabezado no hay acción principal que sostener, y dos cajas ahí pesaban más que el nombre al que acompañan |
| D27 | La insignia del perfil pierde el contorno guinda y pasa a fondo suave con texto gris | Se leía igual que un botón secundario, siendo una etiqueta que no se pulsa |
| D28 | El botón de ubicación cambia de acción a corrección: sin punto es guinda relleno; con punto puesto pasa a dorado y dice «Actualizar» | Definido por Liber. Es la misma señal de corregir que en el resto del sistema, y el color no va solo (Norma 8.4). ~~Con lápiz~~: sustituido por D48 |
| D29 | La fecha de plantación arranca sin valor y el programa sin preselección, aun cuando el catálogo tenga uno solo | Definido por Liber. Una fecha puesta de antemano se acepta sin mirarla, y la de captura rara vez es la de plantación |
| D30 | «Agregar registro nuevo» deja el formulario en blanco: ni especie, ni programa, ni fecha, ni fotografía, ni punto. Revierte a D-anterior, que conservaba programa, fecha y ubicación | Definido por Liber. Lo heredado se guarda sin que nadie lo note, y la coordenada del árbol anterior es el peor caso: se ve bien estando mal. Sólo sobrevive el encuadre del mapa, que no es un dato |
| D31 | Coordenadas, alcaldía y colonia salen del recuadro bajo el mapa y pasan a ser campos del formulario, de sólo lectura. Bajo el mapa queda únicamente el aviso de lo que ocurrió | Definido por Liber. Son datos del registro y se leen donde están los demás; el recuadro los presentaba como parte del mapa |
| D32 | Se retira el campo «Estás registrando como» y la nota del asterisco de la pantalla de registro | Definido por Liber: el encabezado ya dice quién tiene la sesión. Lo obligatorio pasa a anunciarse con el atributo `required`, además del asterisco |
| D33 | Cada registro guarda de dónde salió su coordenada (`punto_origen`: GPS, mapa, manual o ajustado) y, cuando vino del GPS, el margen de error del aparato (`gps_precision_m`) | Definido por Liber: la fotografía es opcional y la mayoría de los registros no la llevará, así que la coordenada carga con la prueba. Una tomada junto al árbol no vale lo mismo que una señalada desde una oficina, y ese dato sólo existe en el instante de la captura |
| D34 | La precisión se guarda si y sólo si el origen es `gps`; al mover el punto a mano se borra | Un margen de ±8 m junto a una coordenada que después se arrastró describiría algo que ya no existe. La auditoría comprueba la regla en cada corrida |
| D35 | El sistema llama a su cifra «árboles registrados», nunca «plantados», en pantalla y en el PDF, y el reporte lo dice expresamente | Definido por Liber: operativamente no se alcanzará a registrar todo lo que se plante, así que las dos cifras van a diferir. Nombrarlo protege a quien firme el documento |
| D36 | El PDF informa qué proporción de los registros se ubicó con GPS | Quien lee el reporte necesita saber de qué clase de coordenada se trata; una fila por punto abultaría la tabla, una cifra al pie se compara entre periodos |
| D37 | La fotografía es opcional y prioritaria sólo después del registro: si la imagen falla, el registro se conserva y la foto se adjunta después | Definido por Liber. En campo hay señal mala y batería baja; una imagen de 100 KB no puede tumbar un registro de 400 bytes |
| D38 | El SRP es la fuente del registro individual; el SIA construye encima el visor global, los tableros y la cifra pública, sobre una copia publicada, no sobre la base viva | Una consulta de análisis no puede competir con la captura en campo, que es lo que no puede fallar. Confirmado con la arquitectura del SIA: un esquema y una cuenta de servicio por módulo |
| D39 | El mapa de puntos de las pantallas de registros (cabo y coordinador) sí es del SRP; el mapa global es del SIA vía GeoServer | Los primeros son herramientas de trabajo sobre volúmenes pequeños; el global necesita agregación en servidor, y el SIA ya publica WMS/WFS/WMTS |
| D41 | Las capas de alcaldías y UGA del SIA sustituyen a las ficticias. Los originales se conservan intactos en `assets/fuentes/`; la aplicación carga versiones compactadas generadas por script, nunca editadas a mano | Definido por Liber al entregarlas. Conservar el original es la constancia de qué se recibió; generar por script hace reproducible la transformación y valida la entrega antes de aceptarla |
| D42 | El registro guarda `alcaldia_cve` (clave INEGI) además del nombre | La clave es la llave para unir con el esquema `territorio` del SIA (Norma 6.5); el nombre se guarda aparte para leerse sin cargar la capa, igual que `usuario_nombre` en la bitácora |
| D43 | Los defectos de la capa de alcaldías —cinco huecos, tres solapes— no se corrigen en el sistema: en un solape gana el primer polígono de la capa; en un hueco se guarda sin alcaldía, se avisa, y se conserva `capa_version` para rederivar | La capa es del SIA y se corrige ahí. Un árbol real plantado en un hueco no puede quedarse sin registrar por un defecto de la capa, y una regla fija garantiza que el mismo punto derive siempre lo mismo |
| D44 | El ámbito válido sigue siendo la caja de la ciudad, no la unión de las alcaldías | Con la unión, un punto en un hueco de la capa quedaría «fuera de la Ciudad de México» y no se podría guardar |
| D45 | `colonia` se guarda nula hasta que exista capa, y la pantalla lo dice como pendiente, no como falla | No hay capa de colonias. Mezclar una alcaldía real con una colonia ficticia haría pasar por real un dato inventado. ~~Superada~~ por D62: ya hay capa (de prueba) |
| D46 | `capa_version` guarda la versión de cada capa por separado (`alcaldias=…;uga=…`) | Las dos llegaron juntas hoy, pero no tienen por qué actualizarse juntas; con una sola versión no se sabría cuál cambió |
| D47 | El prefijo de la clave UGA no se usa como alcaldía del punto | En la frontera, la celda pertenece a una alcaldía y el punto a otra: 9 celdas tienen su centro en una alcaldía distinta de la de su prefijo. La alcaldía sale de su propia capa |
| D48 | El botón de ubicación lleva el icono de ubicación en sus dos estados; el estado de corrección se distingue por el color dorado y por el texto «Actualizar…» | Definido por Liber (sustituye la parte del lápiz de D28). El lápiz decía «editar» pero el botón no edita: vuelve a tomar la posición del GPS. El color sigue sin ir solo porque el texto cambia |
| D49 | Con «Capturar coordenadas a mano» desplegado, el botón de ubicación se oculta; reaparece al cerrarlo | Definido por Liber. Dos formas de fijar el punto a la vista al mismo tiempo confunden en campo; una regla CSS de respaldo (`:has`) lo oculta aunque falle el JS |
| D50 | Se reincorpora `comentarios` al registro de plantación: texto libre opcional, hasta 500 caracteres | Definido por Liber. **Modifica D17**, que lo retiró por no tener uso declarado (Norma 1.8); ahora lo tiene: observaciones del cabo sobre el sitio o el ejemplar. Sigue fuera del reporte PDF hasta la validación de reportes (ver pendientes) |
| D51 | En el selector de programa, «Reforestación Urbana» va primero y el resto en orden alfabético; sigue sin preselección | Definido por Liber: es el programa de casi toda la captura en campo. Se ordena por la clave `REFOR_URBANA`, no por el nombre, para que sobreviva a un cambio de redacción |
| D52 | La pestaña dice «Nuevo registro» y el formulario ya no repite el título; en edición el título sí se muestra («Editar registro») | Definido por Liber. En alta, pestaña y título decían lo mismo; en edición el contexto cambia respecto a la pestaña y hay que decirlo |
| D53 | Los atajos de periodo quedan en tres —Hoy, Este mes, Todos— y se agrega «Reiniciar filtros», que devuelve la vista a su estado de entrada: Hoy, sin año ni mes, sin rango y todos los cabos | Definido por Liber. «Mes pasado» y «Este año» se cubren con las listas de Año y Mes. «Todos» sólo quita el periodo y respeta el cabo elegido; Reiniciar lo devuelve todo, por eso son dos controles |
| D54 | Los tres datos del punto —Coordenadas, Alcaldía, Colonia— van en una sola fila de tres columnas en escritorio y tableta, y apilados en teléfono | Señalado por Liber: al ocultar «Cómo se obtuvo» (bloque 15) su celda vacía dejó un hueco junto a Coordenadas. El dato oculto sale de la rejilla; sigue anunciándose al lector de pantalla y guardándose |
| D40 | Espejo de campos al pie del formulario, sólo con datos de prueba: enseña los campos que llegan a la base sin tener lugar en la pantalla, más la entrada de bitácora que se escribiría. **Se elimina al cerrar la Etapa 1** (`js/espejo.js`, su sección en `index.html` y el bloque `.espejo` del CSS; nada más depende de él) | Definido por Liber, para llevar control visual mientras se afina la interfaz. No reconstruye el registro: lee el mismo objeto que escribe Guardar (`registroPrevisto()`), y su lista de campos es lo que queda al restar los visibles, así que un campo nuevo aparece solo. Lo que aún no existe —identificador, marcas de tiempo— se nombra como pendiente en vez de inventarse |

## Pendientes de decisión

- ~~Icono de la app instalada~~ Resuelto en D90: emblema del Programa de Reforestación Urbana en blanco sobre guinda
- ~~Tipografías sin señal~~ Resuelto en D87: Cabin y Roboto en `vendor/fuentes/` (woff2, ~110 KB)

- [pendiente] **Emisión del folio (Fase 2).** No se emite un solo folio definitivo hasta que el SIA:
  (1) entregue la malla UGA corregida, con identificador de versión y fecha de corte, para
  congelarla como capa de referencia; (2) informe si corregir las ocho claves inconsistentes
  cambia la clave de otras celdas; (3) confirme nombre, tipo y formato de la llave de la celda y
  certifique que la malla no tiene huecos ni traslapes en el límite; (4) entregue alcaldías
  corregida y colonias definitiva; (5) documente que el prefijo UGA no indica territorio. Con eso
  la Secretaría congela la capa y habilita la emisión. Del análisis de Liber, sección 8
- [pendiente] **Bandeja de especies fuera de catálogo (Fase 2).** Con un responsable en el SIA que
  la cierre; sin ella el catálogo se degrada con variantes del mismo taxón (D68)
- [pendiente] **Validación de posible duplicado (Fase 2, servidor).** Con la regla corregida de
  D69, no con 5 m fijos
- [pendiente] **Cola de envío al servidor (Fase 2).** Especificación acordada con Liber el
  22-09-2026 a partir de cómo lo resuelve KoboToolbox/Enketo: (1) cada registro guardado queda en
  cola con estado local `guardado` → `enviado` → `con error`; (2) mientras la app esté abierta y
  haya señal, un proceso en segundo plano intenta enviar la cola a intervalos y reintenta los
  fallidos; (3) botón «Enviar ahora» para forzar un intento entre automáticos; (4) nada se borra
  del dispositivo hasta que el servidor confirme la recepción; (5) la pastilla del encabezado
  (D83) pasa de «N guardados» a «N pendientes de enviar» y el bloque «Registros en este
  dispositivo» de Reportes muestra el estado de cada uno. No se adoptan de Kobo: el modal que
  exige OK en cada envío, la figura de borrador (aquí el registro está completo o no se guarda) ni
  esconder la cola en una barra lateral
- [pendiente] **Colonias en el teléfono (3 MB) o sólo en el servidor.** El SIA hace los cruces territoriales en PostGIS, no en el dispositivo (llamada del 22-09-2026). El diseño ya lo prevé: el teléfono deriva alcaldía, colonia y UGA para verlas en campo sin señal (provisional, con `capa_version`) y en Fase 2 el servidor rederiva con PostGIS y su resultado manda (S-08). Alcaldías (390 KB) y UGA (423 KB) se quedan en el teléfono; decidir si colonias (3 MB, IECM) se queda o se deriva sólo en el servidor y el cabo la ve al sincronizar. Lo que se pide al SIA: nombre de las tablas del esquema `territorio`, SRID, campos llave, versión y fecha de corte, y una exportación de esas mismas tablas (ST_AsGeoJSON o QGIS) para que teléfono y servidor crucen contra la misma geometría
- ~~Sustituir alcaldías y malla UGA por las definitivas~~ Hecho en el bloque 38 (D92)
- [pendiente] **Antes de liberar esta etapa: sustituir la capa de colonias** (hoy IECM 2022, de prueba) por la definitiva del SIA, con fuente, llave y fecha de corte, y volver a correr `pruebas/generar_capas.py`. Anotado por Liber, 22-09-2026
- [pendiente] **Las ocho claves UGA con prefijo distinto a su alcaldía siguen en la malla definitiva** (TLP-040, TLP-085, IZP-005, IZP-011, COY-054, MIH-001, MIH-002, IZC-021). No afectan al registro (la alcaldía sale de su capa), pero sí al folio: una de esas celdas daría `TLP-040-…` a un árbol de Milpa Alta. Confirmar con el SIA si se quedan así antes de emitir folios (condición 2 y 5 de la emisión)

### Para resolver antes de montar en los servidores del SIA

- [pendiente] **El módulo `plantacion` que ya existe.** El backend del SIA tiene un módulo Plantación y `bd_csia` un esquema `plantacion`. Liber confirma que es un antecesor mal construido que el SRP sustituye. Antes de descartarlo hay que revisar **si su catálogo de especies ya tiene claves en uso**, para no estrenar claves distintas para las mismas especies (ver D22–D24)
- [pendiente] **Dónde viven las fotografías.** Hoy van incrustadas en el registro. Deben salir a archivo, como ya hace el SIA en sus otros módulos. Sin eso, ni el teléfono del cabo ni el volumen del servidor .196 aguantan: quedan ~6 GB libres, que a 100 KB por imagen cubren unos 60 mil archivos
- [pendiente] **Cuánto disco pedir a ADIP.** Depende de qué proporción suba foto: 10% son ~5 GB, 20% ~10 GB, 30% ~15 GB para la meta de 500 mil. ADIP autoriza con uso real medido, así que **el sistema debe reportar desde el primer mes cuántos registros llevan foto y cuánto pesan**, para que la solicitud sea una proyección con evidencia y no una estimación
- [pendiente] **Colonia o unidad territorial.** Ya llegaron alcaldías y UGA; falta la capa de colonias o de unidades territoriales. El esquema `territorio` del SIA tiene 1,817 unidades territoriales. Confirmar cuál es la unidad oficial de reporte y pedir esa capa; mientras, `colonia` se guarda nula (D45)
- [pendiente] **Fuente y fecha de corte de las dos capas recibidas.** Los atributos de alcaldías (`cvegeo`, `nomgeo`, `shape_area`, `region`) apuntan al Marco Geoestadístico del INEGI más campos propios; confirmar y anotar en `generar_capas.py`
- ~~Reportar al SIA los cinco huecos y tres solapes de la capa de alcaldías~~ Corregidos en la capa definitiva (D92). Antes decía: **Reportar al SIA los cinco huecos y tres solapes de la capa de alcaldías**, con sus coordenadas (en `BITACORA.md`, Bloque 15). El mayor hueco, de 1.2 ha, está cerca de 19.4838, -99.1499; el mayor solape, GAM–VCA, de 2.5 ha
- [pendiente] **Capas reales de colonias y malla UGA: origen, fecha de corte y área responsable** → resuelto para UGA; queda colonias (arriba)
- [pendiente] **Límites de nginx.** El servidor web tiene configurados límites de velocidad y de tamaño de subida. Con decenas de cuadrillas subiendo fotos a la vez se tocan; conocer el límite antes, no el primer día
- [pendiente] **HTTPS y geolocalización.** El navegador sólo entrega la posición del GPS en contexto seguro. Hacia el ciudadano hay HTTPS porque ADIP lo termina, pero una prueba por HTTP dentro de la red interna dejará el botón de ubicación sin responder, y parecerá un defecto del sistema
- [pendiente] **El sitio aún no se declara apto para difusión pública masiva.** Aclarar si montar el SRP ahí cuenta como difusión pública, dado que el personal de campo entra por el dominio público

### Para resolver en el diseño del programa

- ~~Qué cuenta como plantado~~ Decidido en D87: sólo el alta. El identificador (UUID y folio inmutable) admite un seguimiento posterior si en Fase 2 se decide
- [pendiente] **Cómo se evita el doble conteo**, con dos cuadrillas registrando el mismo árbol o un árbol repuesto contado dos veces
- ~~¿Una fotografía por árbol o por jornada?~~ Decidido en D87: por ejemplar, opcional. El contador de fotografías (D87) medirá el uso real para la solicitud a ADIP

- ~~Apellido materno obligatorio~~ Decidido en D87: opcional
- ~~¿Cada persona edita sus propios datos?~~ Decidido en D87: sólo Administración global
- ~~¿El Coordinador registra?~~ Decidido en D87: sí registra; no elimina
- ~~Perfil Consulta~~ Retirado en D87
- ~~`es_ficticio` en cierres y bitácora~~ Agregado en D87
- ~~Respaldo sin usuarios ni catálogos~~ Resuelto en D87: lleva las cinco tablas
- [pendiente] **Constancia de generación del parte.** Liber decidió (22-09-2026) **no** registrar cada generación del PDF en bitácora; queda sólo CREADO/EDITADO del cierre. Se reabre si en Fase 2 el parte se usa como evidencia formal
- [pendiente] **Aviso de privacidad** en la pantalla de acceso: Liber lo pospuso (22-09-2026)
- [pendiente] **Comentarios en el parte PDF** (columna, anexo o no entra): sin decidir; Liber lo dejó para la validación de reportes
- [pendiente] **Doble conteo, capa oficial de colonias y mapa base para producción**: sin decidir en el Excel del 22-09-2026; siguen abiertos (ver «Para resolver en el diseño del programa»)
- [pendiente] Proveedor de mapa base para producción (OpenStreetMap no admite uso institucional intensivo)
- ~~Validación del catálogo de especies y su clasificación~~ Resuelto en D84: catálogo real del SIA con `tipo_distribucion` del SNIB
- ~~Formato de las claves del catálogo real de especies~~ Resuelto en D84: `ESP-0000`, consecutivo del SIA
- ~~Cuenta institucional para el repositorio~~ Resuelto: `SedemaOficina/SISTEMA-PLANTACION`
- [pendiente] Aviso de privacidad: el sistema recaba nombre, área y cargo del personal (Norma 1.8)
- ~~Plegar los tres campos del punto~~ Decidido en D87: se dejan visibles
- [pendiente] **El campo «Comentarios» del registro** (opcional, hasta 500 caracteres) todavía no entra al reporte. Queda por decidir en qué forma: columna truncada en la tabla de ejemplares, o un reporte de detalle aparte. La reserva de no tocar `js/reportes.js` hasta terminar el formulario queda levantada por D55–D58, que Liber pidió expresamente

- ~~Clave de campo del ejemplar (`CIZ_366`)~~ **Descartada** por Liber en D87: no entra como atributo. Si en Fase 2 hace falta conciliar lo ya plantado, se reabre

- ~~Colonia en el parte~~ Resuelto en el bloque 21 (D62): sale del punto de cada registro

---

## Bloque 19 — El parte del día

- **D55. El reporte es el parte de un día, no de un periodo.** El botón sólo genera cuando el
  filtro está parado en una fecha: el atajo «Hoy», o un rango con la misma fecha en los dos
  extremos. Con mes, año o rango amplio queda apagado y la nota de al lado dice qué falta.
  *Por qué:* los datos que acompañan al parte —chófer, hora de finalización, observaciones— no
  valen para un mes, y son la mitad del documento. Así se escribe hoy en campo: un parte por
  jornada y por cuadrilla. *Qué se sacrifica:* ya no hay un PDF de «todo el mes»; los filtros de
  mes y año siguen sirviendo para mirar la lista en pantalla.

- **D56. Los datos de cierre se capturan al generar el reporte, no al empezar la jornada.** Se
  consideró un encabezado de jornada que se abriera al llegar al frente y lo descartó Liber: el
  chófer, la hora de finalización y las observaciones se saben al terminar. Pedirlos antes obliga
  a volver a abrirlos después. Todos los campos son **opcionales y de texto libre**, porque los
  partes varían de una cuadrilla a otra; los que quedan vacíos **no se imprimen**, para que el
  documento no parezca una plantilla a medio llenar. Lo capturado se guarda en el almacén
  `cierres`, con clave `fecha|cabo`: regenerar el parte de un día no obliga a volver a escribirlo.

- **D57. El encargado sale de la sesión.** A un cabo no se le pregunta: es él, y el campo se
  muestra como respuesta, no como pregunta. Quien ve a varias personas —coordinador o
  Administración— lo elige, y sólo entre **los cabos que tienen registros ese día**: ofrecer el
  padrón completo sería ofrecer a gente que no estuvo. Se guarda `encargado_id`, no el nombre: el
  nombre se lee de la cuenta, que es su fuente única.

- **D58. Lo que se calcula no se captura.** Los totales por especie, el total de ejemplares, el
  resumen por programa y la alcaldía del sitio salen de los registros. *Por qué:* el 21 de
  septiembre de 2026, un parte escrito a mano reportó «apertura de 13 cepas» junto a 112 árboles
  plantados; los folios listados eran 116 y los totales por especie sumaban 112. Un total que se
  teclea es un total que se puede equivocar, y el que sale mal es el que se reporta hacia arriba.

- **D59. La estructura de la base se comprueba al abrir.** `SRP.almacen.ALMACENES` declara los
  almacenes que el código da por existentes, y `abrir()` verifica que estén. Mientras toda la
  estructura viva en `MIGRACIONES[1]`, un dispositivo que ya abrió el sistema no vuelve a
  ejecutarla, y un almacén nuevo —como `cierres`— no aparecería solo: la pantalla fallaría al
  primer reporte sin decir por qué. Es el mismo problema que `SELLO_DATOS` resolvió para los
  datos, ahora para la estructura. *Sólo vale mientras los datos sean ficticios:* con el primer
  dato real, un almacén que falta pasa a ser una migración numerada (Norma 4.1), nunca un borrado.

## Bloque 20 — Ajustes al formulario de cierre

- **D60. El cierre se captura en el orden en que se lee el parte en papel.** El encargado va
  primero; luego sitio, actividades, personal participante, personal de apoyo (varias líneas,
  como el participante), observaciones, y al final la logística: chófer, modelo de vehículo,
  placa y hora de finalización. El vehículo se separa en modelo y placa porque son dos datos que
  se piden por separado; la hora se elige con el selector del teléfono, no se teclea, para que
  siempre salga con el mismo formato en el PDF. Definido por Liber. Un cierre guardado con el
  campo único `vehiculo` se muestra en «Modelo» al reabrirlo.
- **D61. El PDF se comparte sólo en dispositivos táctiles sin ratón; en escritorio se
  descarga.** El «compartir archivos» del navegador también existe en Windows (Chrome y Edge) y
  abría el panel de Compartir del sistema en lugar de guardar el reporte; el destino de Acrobat
  de ese panel recibía un archivo de longitud cero. El criterio es `(hover: none) and
  (pointer: coarse)`, no el ancho de pantalla: una laptop con pantalla táctil sigue descargando.

## Bloque 21 — Capa de colonias (de prueba)

- **D62. Colonias: fuera de zona urbana no hay colonia; en un solape gana la más pequeña; el
  nombre va como viene.** La capa del IECM 2022 no cubre el suelo de conservación (532 km²):
  un punto ahí se guarda con `colonia` nula y la pantalla dice «Sin colonia (fuera de zona
  urbana)», que no es un pendiente ni una falla. En los 215 solapes —una unidad habitacional
  dibujada encima del pueblo o colonia que la rodea— gana el polígono de menor área, que es la
  unidad más específica; regla declarada, no dejada al orden del archivo (Norma 6.6). El nombre
  se guarda como viene, en mayúsculas y con su tipo entre paréntesis (`SAN MIGUEL (BARR)`); sólo
  se quitan los espacios dobles, que son error de captura. La alcaldía sigue saliendo de su propia
  capa (D47): doce colonias tienen el interior en otra alcaldía que la que declaran. Se guarda
  también `colonia_cve` (`CVEUT`) como llave. Las tres reglas definidas por Liber. **La capa es
  de prueba** y se sustituye antes de liberar la etapa (ver pendientes).

## Bloque 22 — Registros legible y el espejo en tres lugares

- **D65. Cada renglón de Registros dice nombre común (científico) y alcaldía, colonia; el
  bloque de filtros va en una sola altura.** Las etiquetas Año, Mes, Cabo, Desde y Hasta van a
  la izquierda de su control, no encima: con etiqueta arriba los chips quedaban colgando por
  debajo de las listas y «Reiniciar» flotaba en medio. Señalado por Liber con capturas de
  escritorio y teléfono.
- **D66. El espejo de campos vive en los tres sitios donde algo se escribe a la base:** el
  formulario (registro previsto), el detalle de un registro (lo guardado, en Registros) y el
  cierre del parte (cierre previsto, en el diálogo de generar reporte). Un solo motor en
  `js/espejo.js`; cada espejo resta los campos visibles de su pantalla y muestra el resto con
  su nota. El del cierre lee `SRP.reportes.cierrePrevisto()`, que es el mismo objeto que escribe
  «Generar reporte» (la regla de D40): no puede desfasarse. Los tres se eliminan al cerrar la
  Etapa 1, como D40 lo establece; la lista de qué borrar está en la cabecera de `js/espejo.js`.
  Pedido por Liber.

## Bloque 23 — Folio: la estructura entra, la emisión espera

- **D67. Nomenclatura del folio: `AAA-000-00000`** (redacción vigente desde el bloque 54; sustituye
  a la de 22-09-2026, que llevaba además prefijo de sistema y año en 22 caracteres). Dos segmentos
  congelados al asignar, 13 caracteres fijos, patrón `/^[A-Z]{3}-\d{3}-\d{5}$/`:
  | Segmento | Formato | Origen |
  |---|---|---|
  | Celda UGA | `AAA-000` | Cruce punto-en-polígono contra la malla UGA vigente al alta |
  | Consecutivo | 5 dígitos | Tabla de secuencias por celda, servida por el servidor |
  Salen el prefijo de sistema y el año por redundantes con la base: el origen del registro y el
  ejercicio ya son campos y se consultan por ellos. La clave de especie sigue fuera del
  identificador y se conserva como atributo. `EXT-000` es la celda reservada para un punto fuera
  de la malla. Decisión del SIA acordada con Liber (23-09-2026); no se reabre.
- **D68. Reglas de operación adoptadas (R1–R10 del análisis).** R1: el registro nace con UUID y
  la pantalla dice PROVISIONAL hasta sincronizar. R2: nada definitivo —placa, rótulo, reporte—
  sale de un registro provisional; el PDF lo advierte. R3: el folio se asigna una sola vez, en el
  servidor, en una transacción. R4: el UUID es la clave de idempotencia. R5–R6 (ampliadas el 23-09-2026 al quitar el año del
  folio, que era la única señal visible de un reinicio): (a) el consecutivo corre por celda UGA en
  una tabla de secuencias PERPETUA y MONOTÓNICA; no se reinicia por ejercicio fiscal, por cambio
  de administración ni por versión del sistema; (b) nunca se calcula con MAX(folio)+1 ni con
  COUNT(registros)+1 sobre los registros vigentes: sólo se lee e incrementa la secuencia, de forma
  atómica, dentro de la transacción de asignación; (c) restricción UNIQUE en la columna `folio`;
  (d) los huecos en la serie son aceptables, la reutilización de un número no lo es; (e) techo de
  99 999 folios por celda sin reinicio. Regla de desbordamiento: al llegar la secuencia de una
  celda a 99 999, la asignación se detiene para esa celda con error explícito —el registro queda
  PROVISIONAL, nunca se recorta ni se reinicia el contador— y se resuelve por decisión expresa del
  SIA, que puede subdividir la celda en la malla o ampliar el ancho del consecutivo en una
  versión nueva del patrón que conviva con la anterior; los folios ya emitidos no cambian. R7: inmutable ante cualquier corrección. R8: al asignar se congelan folio, celda, versión
  de capas y coordenada (`folio_uga`, `folio_capa_version`, `folio_lat`, `folio_lng`); `uga` sigue
  siendo la vigente. R9: baja lógica, nunca física (ya era así). R10: el folio identifica al
  ejemplar, no al evento; el seguimiento cuelga del mismo folio. «Otra especie» pasa a ser un
  pendiente de catálogo: `especie_estatus = PENDIENTE_VALIDACION`. **En la Etapa 1 entra sólo la
  estructura**: los cinco campos del folio nacen nulos, `js/folio.js` guarda patrón, validación y
  etiqueta de campo, y la emisión se construye en Fase 2 cuando se cumpla el pendiente.
- **D69. El duplicado no se detecta por distancia fija.** El análisis proponía avisar cuando otro
  registro cae a menos de 5 m en 30 días. Con el GPS del teléfono —5–10 m a cielo abierto, 15–30
  entre edificios— y árboles plantados cada 3–8 m, cinco metros están por debajo del error del
  instrumento: en una jornada el aviso saltaría en casi todos los árboles (el vecino) y no saltaría
  en el duplicado real capturado con 15 m de error. Regla corregida, para el servidor: distancia
  menor que la incertidumbre combinada de ambos puntos (suma de sus `gps_precision_m`), con piso de
  5 m para puntos a mano o en el mapa. Lo que ningún umbral resuelve —dos cabos, dos teléfonos, un
  frente monoespecífico— se controla con el conteo del parte contra la meta y con la supervisión
  del coordinador. Se difiere íntegro a Fase 2; por ahora se guarda la precisión de cada punto,
  que es el insumo. Señalado por Liber; regla acordada.

## Bloque 24 — El parte de cualquier día

- **D70. El reporte es de un día, de cualquier día, y se puede volver a generar.** D55 dejaba el
  parte atado al chip «Hoy» o a un rango con Desde = Hasta; en la práctica sólo se sacaba el de
  hoy. Ahora un selector «Día del parte» junto al botón filtra la lista a la fecha elegida (ayer,
  la semana pasada) y habilita el reporte; el chip «Hoy» sigue siendo el atajo. Volver a generar
  el mismo día reabre el cierre con lo capturado —ya era así desde el bloque 19— y lo reescribe,
  con constancia en bitácora; la nota junto al botón lo dice. Definido por Liber.

## Bloque 25 — Sin señal: la app abre, y quien registra sabe qué hacer

- **D71. La aplicación abre sin señal y lo dice.** Un *service worker* (`sw.js`) guarda en el
  dispositivo todo lo que `index.html` pide con marca `?v=` —la lista sale del propio
  `index.html`, no de una escrita aparte— y lo sirve desde ahí. La versión llega en la dirección
  de registro (`sw.js?v=0.6.6`), la misma marca de siempre: una versión nueva es un worker nuevo,
  que llena su caché y borra la anterior al activarse; no hay dos mecanismos de versión. La
  página se pide primero a la red (3 s) y si no, a la caché: con señal se recibe la versión nueva,
  sin señal se abre la guardada. Mosaicos y tipografías siguen yendo a la red. Manifiesto para
  «Agregar a pantalla de inicio». El encabezado dice «Con conexión» o «Sin conexión · puede seguir
  registrando», con palabras, y Registros muestra cuántos registros guarda el dispositivo y qué
  hacer con ellos: en la Etapa 1, «no hay envío al servidor; genere el parte y compártalo; no
  borre los datos del navegador». Ese aviso es el sitio donde en Fase 2 irá «N pendientes de
  enviar» y el botón de sincronizar. Una pantalla «¿Qué hacer sin internet?» de cinco pasos lo
  dice en lenguaje de campo. Pedido por Liber.
- **D72. Respaldo del dispositivo, y se prueba restaurándolo.** «Guardar respaldo» produce un
  archivo con plantaciones, cierres y bitácora tal como están en la base —mismo esquema— y se
  entrega igual que el PDF (compartir en táctil, descargar en escritorio). Con cabos reales
  probando, el riesgo mayor no es la señal sino perder el teléfono o borrar el navegador, y hasta
  que exista el servidor este archivo es la única copia. Un respaldo que nunca se ha restaurado
  es una suposición (Norma 4.9): «Restaurar respaldo» existe en las herramientas de prueba, sólo
  agrega lo que no existe y nunca sobreescribe, y la prueba automatizada hace el viaje completo a
  un dispositivo limpio. En Fase 2 la restauración la hará el servidor a partir del mismo archivo.
  Incluido con el visto bueno de Liber.

## Bloque 26 — Tres ajustes del formulario en teléfono

- **D73. «Revisar y guardar» es verde, con el disco de guardar, más alto y de margen a margen en
  teléfono.** Verde porque en la escala de color del sistema es el color de guardar y confirmar
  (Norma 8.4: el color no va solo; lleva icono y palabra); el disco porque es el signo que todo el
  mundo lee como «guardar». Pedido por Liber.
- **D74. En la ficha «Revise antes de guardar», título y acciones quedan fijos arriba.** La ficha
  es larga (mapa, doce datos, foto) y «Guardar» al pie se perdía: había que desplazarse hasta el
  final para encontrarlo. La cabecera es pegajosa dentro del diálogo: Guardar y Corregir están
  siempre a la vista, y la lista se desplaza por debajo. Pedido por Liber.
- **D75. «Un periodo» abre el selector de fecha, y las fechas se encadenan.** Al tocar el atajo se
  abre el selector nativo de «Desde» (o queda el foco en él, si el navegador exige un gesto más
  reciente); al elegir Desde se abre «Hasta»; al elegir Hasta el periodo se aplica solo.
  «Aplicar» sigue ahí para corregir un extremo. Es el mismo criterio de avance automático del
  foco del formulario: al resolver un campo, el siguiente está listo. Señalado por Liber.

## Bloque 27 — Editar la especie desde la ficha

- **D76. Al volver al campo de especie con una elección vigente, la lista ofrece todo, y el texto
  queda seleccionado.** «Editar especie» desde la ficha llevaba al campo con «Ahuejote (Salix
  bonplandiana)» y el buscador filtraba con ese texto completo, que no coincide con ningún nombre
  por separado: sólo quedaba «Otra especie». Liber propuso arrancar en blanco; se prefiere
  conservar el texto seleccionado —se ve qué había y al teclear se reemplaza— y ofrecer la lista
  completa mientras la elección siga vigente; en cuanto se teclea, se filtra como siempre. El
  mismo defecto ocurría al volver a tocar el campo en el formulario, y queda resuelto por la
  misma vía.

## Bloque 28 — La ficha sin «Corregir»

- **D77. En la ficha «Revise antes de guardar» ya no hay botón «Corregir»: cada dato tiene su
  Editar.** Queda una × de «Cerrar sin guardar» en la cabecera (nivel de apoyo, con etiqueta
  accesible), porque la ficha necesita una salida que no sea guardar ni editar un campo, y en
  teléfono no hay tecla Esc. Señalado por Liber.

## Bloque 29 — La ficha bien apilada y Registros por bloques

- **D78. En la ficha de revisión el mapa va aislado en su propio contexto de apilamiento, el
  foco inicial es el título y el desplazamiento no se encadena.** En Safari las capas de Leaflet
  (z-index 200–600) se pintaban sobre la cabecera fija y tapaban «Guardar»; con `isolation:
  isolate` y `z-index: 0` en la caja del mapa, sus z-index no salen de ella. El foco inicial caía
  en la × —Enter cerraba—; ahora va al título. `overscroll-behavior: contain` evita que el gesto
  siga moviendo la página de atrás al llegar al final, y `100dvh` corrige la altura del diálogo con
  la barra del navegador de iOS. Señalado por Liber con captura.
- **D79. Registros se organiza en cuatro bloques con título, en el orden en que se usan:
  Filtrar; la lista; Parte del día; Registros en este dispositivo.** Antes filtros, lista,
  reporte, aviso y respaldo iban seguidos sin encabezados y se leían como una sola masa. Cada
  bloque va separado por un filete y con su `h2`; el aviso ya no repite «en este dispositivo»,
  que es el título. Señalado por Liber.

## Bloque 30 — La conexión se nota

- **D80. El estado de la conexión es una pastilla con icono, color y palabras, y tocarla abre
  la guía «¿Qué hacer sin internet?».** Verde con ondas: «Con conexión»; dorado con las ondas
  tachadas: «Sin conexión · puede seguir registrando». Dorado y no rojo porque no es un error. Vive
  en el encabezado de sesión, así que se ve en Nuevo registro y en Registros y nunca en el acceso.
  Pedido por Liber.

## Bloque 31 — Reportes aparte, sin saltos de foco, la cuenta a la vista

- **D81. «Reportes» es una pestaña propia.** Lleva el «Parte del día» (día y, para quien ve a
  varias personas, cabo; consulta propia de los registros del día) y el bloque «Registros en este
  dispositivo» con respaldo y guía sin internet. «Registros» queda sólo para filtrar, ver, editar
  y eliminar. Antes las dos cosas convivían en Registros (D79) y la pantalla mezclaba consulta con
  generación. `descripcionFiltro()` se retiró de registros.js por no tener uso. Propuesto por
  Liber, confirmado.
- **D82. Ningún formulario mueve el foco por su cuenta.** Se retira el avance automático de
  Nuevo registro (ubicación → especie → programa → fecha), el encadenado del filtro por periodo
  (Desde abría Hasta, Hasta aplicaba: D75 queda superada; «Un periodo» sólo muestra los campos y
  el rango entra con «Aplicar») y los saltos del alta de cuentas (perfil → coordinador, área →
  cargo). Desorientaba: la pantalla se desplazaba sola y en móvil se abrían selectores sin
  pedirlo. Se conservan los focos que la persona pide con su acción: «Editar» desde la ficha,
  «Agregar registro nuevo», el campo de «Otra especie» al elegirla, y los errores. Pedido por
  Liber.
- **D83. La pastilla de conexión lleva la cuenta de registros guardados** («Con conexión · 4
  guardados») en todas las pantallas, y el aviso «Registro guardado» dice que quedó en este
  dispositivo y cuántos van, sin pedir otro clic. Con D81 el bloque del dispositivo se fue a
  Reportes, a donde el cabo no va en campo; la pastilla sí se ve siempre. Tomado de la cola de
  envío de KoboToolbox, evaluada con Liber; lo que exige servidor queda en el pendiente «Cola de
  envío (Fase 2)».

## Bloque 32 — Catálogo real de especies

- **D84. El catálogo de especies es el del SIA, entra tal cual y su clave es la llave.** Liber
  entregó `CGO_ESPECIES_REFORESTACION_URBANA` (76 especies, 11 campos, verificadas contra
  EncicloVida/CONABIO el 22-09-2026), con las discrepancias resueltas en el propio archivo
  (*Cupressus* en lugar de *Hesperocyparis*, grafías corregidas, *Quercus rubra* sin registro en
  CONABIO). Se decide: (1) el Excel vive en `assets/fuentes/` y `pruebas/generar_especies.py`
  lo convierte en `assets/catalogo-especies.js`, que se siembra sin tocar; (2) `id` y `clave`
  son el `id_especie` (`ESP-0000`), única llave de enlace con las plantaciones, y las altas
  nuevas continúan el consecutivo sin escribirse a mano; (3) `nombre` es el nombre común (la
  etiqueta de campo) y el científico se muestra entre paréntesis; (4) `tipo_distribucion` con
  los cuatro valores del SNIB sustituye a Nativa/Introducida; (5) `genero` y `especie` se
  derivan del nombre científico al guardar, no se piden; (6) `otros_nombres_comunes` **se
  buscan** en el formulario y en Catálogos y la lista dice por cuál coincidió, porque un nombre
  puede señalar a varias especies y no debe resolver solo; (7) `formadecrecimiento`, `id_snib`,
  `id_enciclovida` y `nota_discrepancia` viajan con la especie y **no se copian al registro**:
  el registro guarda sólo `especie_id`, y el SIA obtiene lo demás por la clave; (8) las 76
  llevan `es_ficticio: false`, y el sello de datos sube para que los dispositivos de prueba
  vuelvan a sembrar. Supera el pendiente de validación del catálogo y el de formato de claves.
  Entregado por Liber, 22-09-2026.

## Bloque 33 — Inventario de tablas y diccionario de datos

- **D85. Terminología de perfiles.** Quien captura en campo es **cabo** y quien lo dirige,
  **coordinador**: son los términos del personal y sustituyen a «registrador» y «jefe de
  registradores» de D02–D06 y D12, que se conservan en la tabla como historia con la nota
  correspondiente. En código: `CABO`, `COORDINADOR`, `ADMIN` (Administración global) y `VIEWER`
  (Consulta, sin cuenta; ver pendiente). Definido por Liber (bloques anteriores); registrado aquí
  porque la tabla de decisiones seguía diciendo lo viejo.
- **D86. `esquema.json` es la fuente única del modelo de datos.** Tablas, campos (tipo, nulo,
  origen, dominio, pantalla, regla), dominios con su fuente en el código, relaciones, campos
  derivados, calculados, efímeros y condicionales, reglas de Fase 1 con el archivo donde viven
  y reglas de Fase 2. De él se genera `DICCIONARIO-DATOS.md` (`pruebas/generar_diccionario.py`),
  que incluye un borrador de tablas PostgreSQL para la Fase 2; **no se edita a mano**.
  `pruebas/auditoria.py` compara el esquema contra los almacenes reales (campos, llaves, índices),
  contra los dominios del código (`SRP.PERFILES`, `SRP.mapa.ORIGENES`, tipos de catálogo, lista
  de distribución, acciones y entidades de bitácora) y comprueba que el diccionario esté
  regenerado: un campo nuevo en el código sin su línea en el esquema hace fallar la auditoría.
  `MAPEO-CAMPOS.md` sigue como vista por pantalla y también se audita. Motivo: al pasar a la
  Fase 2 todo lo que se capturó, se derivó o se calculó debe estar en un solo lugar verificado,
  no repartido en el código y en la memoria de las iteraciones. Pedido por Liber, 22-09-2026.

## Bloque 34 — Decisiones del 22-09-2026 (Excel de pendientes)

- **D87. Diecisiete decisiones de Liber, tomadas en el Excel `SRP_decisiones_pendientes_2026-09-22`,
  y lo que se hizo con cada una.** Sistema, ejecutado en este bloque: (1) **se retira el perfil
  Consulta (`VIEWER`)**: quedan `CABO`, `COORDINADOR` y `ADMIN`; una cuenta con perfil desconocido
  ya no cae en Consulta sino en «Perfil no reconocido», sin permisos y con aviso; (2) **no** se
  registra en bitácora cada generación del parte (queda como pendiente reabrible); (3) **`es_ficticio`
  entra a `cierres` y `bitacora`**: la depuración de datos de prueba alcanza a las cinco tablas;
  (4) **el respaldo lleva las cinco tablas** y un resumen de fotografías; (5) **el Coordinador sí
  registra** y no elimina; (6) sólo Administración edita los datos de una cuenta; (7) apellido
  materno opcional; (8) **no** se agrega la clave de campo del ejemplar; (9) comentarios en el
  parte: sin decidir; (10) los tres campos del punto se quedan visibles; (11) **tipografías
  locales**: Liber entregó Cabin y Roboto; van en `vendor/fuentes/` como woff2 con subconjunto
  latino (~110 KB), sin Google Fonts, y el service worker las guarda en lista explícita porque el
  CSS las pide sin marca; (12) icono de la app: Liber entregó el set de iconografía del Manual de
  Identidad CDMX, que es para la interfaz; el icono de la app se compondrá con él (pendiente, bloque
  aparte); (13) **contador de fotografías**: «Registros en este dispositivo» dice cuántos llevan
  fotografía y cuánto pesan, y el respaldo lo lleva en `resumen`; (14) aviso de privacidad:
  pospuesto. Programa, registrado: (15) **fotografía por ejemplar, opcional**; (16) **sólo el alta
  cuenta como plantado**; (17) doble conteo, capa oficial de colonias y mapa base: sin decidir.
  Además, con el catálogo real de 76 especies, **la lista de especies ya no se corta en ocho**: al
  tocar el campo se ve completa con desplazamiento y al escribir filtra (Liber la creyó incompleta
  por ese tope). Sube el sello de datos.

## Bloque 35 — Iconografía institucional

- **D88. Los iconos de la interfaz salen del set de iconografía del Manual de Identidad Gráfica
  CDMX 2024-2030 cuando el set los tiene.** Liber entregó `ICONOS SET.ai` (300 iconos, trazo de 12
  pt sobre retícula de 48, vértices exteriores redondeados) y eligió: basura #1 (eliminar), cerrar
  #31, ubicación #12 (pin), cámara #62 (agregar fotografía) y ver #21. El archivo vive en
  `assets/fuentes/` y `pruebas/extraer_iconos.py` agrupa los trazados, los numera como en la hoja
  índice (`--indice` la regenera) y normaliza los elegidos a una caja de 24×24: lo que hay en
  `js/iconos.js` es reproducible. Palomita, lápiz, disco y señal no existen en el set y se
  conservan. El icono `ojo` pasa a llamarse `ver`. Decidido por Liber, 22-09-2026.

## Bloque 36 — Más iconos del set, logotipo del programa e icono de la app

- **D89. Iconos del set CDMX en acceso, cuenta, pestañas y acciones.** Elegidos por Liber:
  correo #53 y contraseña #63 (etiquetas del acceso), Entrar #11, cuenta con sesión #261,
  pestañas Nuevo registro #32, Registros #214 (árbol; el #183 era comida, corregido en el bloque 37), Reportes #50, Catálogos #48 y Usuarios #270
  (las cinco con icono para que la barra sea pareja; Liber marcó tres y las otras dos llevan la
  primera opción propuesta), «¿Qué hacer sin internet?» #24, buscar #4, agregar en catálogos
  #32, dar de alta #264 y avisos informativos #22 (aviso simulado, «Registros en este
  dispositivo»). Sin icono por decisión de Liber: cerrar sesión, generar reporte, guardar
  respaldo, reiniciar filtros, marca «usted»; la conexión sigue con las ondas. Los iconos se
  insertan al arrancar (`SRP.app.ponerIconos`, `SRP.ICONOS.poner`) para que el HTML no cargue
  trazados. Definido por Liber, 22-09-2026.
- **D90. El logotipo del Programa de Reforestación Urbana es el del encabezado y el del PDF, y
  su emblema es el icono de la app.** Liber entregó las seis versiones (color, blanco, calado;
  horizontal y vertical). Encabezado: versión color horizontal completa (Gobierno CDMX ·
  Secretaría del Medio Ambiente · Reforestación Urbana) en pantalla ancha, y en teléfono el
  recorte del emblema con el nombre del programa, porque el logotipo completo a 38 px de alto es
  ilegible. PDF: siempre la versión completa, cargada del mismo archivo (sale sin señal porque el
  service worker la guarda). Icono de la app: el emblema (árbol y pala) en blanco sobre guinda,
  esquinas redondeadas, en 192, 512, 512 enmascarable y apple-touch. Deja de usarse
  `assets/logo.js` (SEDEMA incrustado en base64): se movió a `_to_delete/` para que Liber lo
  borre. Los PNG originales viven en `assets/fuentes/logo-reforestacion-urbana/`. Pedido por
  Liber, 22-09-2026.

## Bloque 37 — Ventanas con cabecera fija

- **D91. Toda ventana con contenido lleva la cabecera fija de «Revise antes de guardar»:**
  título, × arriba a la derecha y la acción principal debajo, fijos mientras el cuerpo se
  desplaza. Detalle del registro (× y **Editar**, sólo si el perfil puede editar), Datos de cierre
  del día (× y **Generar reporte**; sin Cancelar), Agregar/Editar de catálogo y Dar de alta/Editar
  cuenta (× y **Guardar**; sin Cancelar), y «¿Qué hacer sin internet?» (sólo ×; sin Entendido).
  Una sola regla cierra todas: la clase `dialogo-cerrar`. Se quedan como están el aviso de
  «Registro guardado» y la confirmación de eliminar: son cortos y su decisión son sus dos botones.
  Además, la pestaña Registros cambia su icono al árbol #214. Pedido por Liber, 22-09-2026.

## Bloque 38 — Capas definitivas de alcaldías y malla UGA

- **D92. Entran las capas definitivas de alcaldías y UGA; colonias sigue de prueba.** Liber las
  entregó el 22-09-2026. Diagnóstico antes de cargar: **alcaldías** (INEGI, publicadas 14-AGO-2017;
  metadato del SIA del 01-ENE-2026, créditos INEGI/SEDEMA/CSIA): 16 polígonos válidos, **sin
  solapes ni huecos** —los tres solapes (mayor GAM–VCA, 2.5 ha) y cinco huecos (mayor 1.2 ha) de
  la entrega anterior quedaron corregidos—; el contorno de la ciudad cambia 0.16 km². El archivo
  viene como GeoJSON por renglones y ya no trae el prefijo de tres letras (`clv_mun`), que
  `generar_capas.py` toma de la clave INEGI. **Malla UGA**: 1,624 celdas, claves sin repetir, sin
  traslapes, cubre el 100 % de las alcaldías; **misma geometría que la anterior** (diferencia de
  redondeo, centroides a menos de 5 mm) y **las ocho claves con prefijo distinto a su alcaldía
  siguen igual**: no afecta al registro, sí al folio (pendiente). Los originales anteriores se
  movieron a `_to_delete/fuentes-anteriores/` para que Liber los borre; el metadato, el
  diccionario y el estilo SLD de alcaldías se guardan en `assets/fuentes/documentacion/`. Sube el
  sello de datos. Pedido por Liber, 22-09-2026.

## Bloque 39 — La cuenta en un menú

- **D93. El nombre, el perfil y las salidas de la cuenta van en un menú.** En el encabezado
  quedan el logotipo, la pastilla de conexión (siempre a la vista: es lo que el cabo necesita en
  campo) y un botón redondo con el icono de usuario. Al tocarlo aparecen el nombre, el perfil,
  «Cerrar sesión» y, sólo con datos de prueba, «Cambiar usuario (pruebas)», que desaparece con
  `ES_FICTICIO: false` como ya estaba previsto. El menú se cierra al tocar fuera o con Escape.
  En teléfono la pastilla dice «Con conexión · 4» (la palabra «guardados» se oculta para caber
  en una fila; la etiqueta accesible la dice completa). Antes el bloque ocupaba cuatro renglones.
  Pedido por Liber, 22-09-2026.

## Bloque 40 — Acciones de renglón en una tuerca

- **D94. Las acciones de cada renglón van en un menú que abre una tuerca.** En Registros,
  Catálogos y Usuarios, los botones Ver, Editar, Activar/Desactivar y Eliminar se sustituyen
  por una tuerca por renglón; al tocarla aparece un menú con las acciones que el perfil permite
  (las mismas reglas de antes: un coordinador no ve Eliminar, un valor o una cuenta con uso no
  ofrece Eliminar, nadie se desactiva a sí mismo). Eliminar va en rojo y con su icono. El menú
  se coloca junto a la tuerca sin que la tabla lo recorte, sigue a la tuerca al desplazar y se
  cierra al elegir, al tocar fuera o con Escape; se recorre con las flechas. El set CDMX no trae
  engrane suelto: se usa un contorno sencillo del mismo peso. Supera el renglón de botones de
  D72/D79 en la lista de registros. Pedido por Liber, 22-09-2026.

## Bloque 41 — Estilo único de atajos y filtros

- **D95. Atajos, filtros y buscadores siguen un solo estilo en toda la plataforma.** Se aplica
  la propuesta A de la maqueta aprobada por Liber. Los atajos (Hoy/Todos/Un periodo; Programas/
  Áreas/Especies) son botones de ancho igual con borde suave y esquinas de 10 px; el activo va
  en guinda suave con borde guinda, de modo que el único relleno guinda de cada vista es la
  acción principal («Aplicar», que pasa de secundario a primario, «Agregar», «Generar»). Los
  campos de filtro (listas, fechas y buscadores de Registros, Reportes, Catálogos y Usuarios,
  marcados con `.zona-filtros`) son cajas gris claro sin contorno fuerte, con etiqueta chica
  encima y, a la derecha, un cuadrito gris con la flecha o el calendario; los buscadores llevan
  dentro la lupa del set CDMX (antes iba en la etiqueta). Siguen siendo controles nativos: el
  teléfono abre su selector y el lector de pantalla los reconoce; en escritorio, tocar cualquier
  parte de la fecha abre el calendario. «Reiniciar filtros» sube al encabezado del grupo, en
  guinda a la derecha. «Hoy» muestra la fecha en un segundo renglón para caber en un tercio del
  teléfono y se sigue leyendo «Hoy, 22-SEP-2026». Los campos de los formularios de captura y de
  las ventanas conservan su contorno: ahí el límite visible del campo importa más que el
  parecido con la referencia. Pedido por Liber, 22-09-2026.

## Bloque 42 — Guardar a la mano, precisión del GPS y estados vacíos

- **D96. Tres ajustes para el trabajo en campo.** (1) «Revisar y guardar» va en una barra fija
  al pie de la pantalla mientras el formulario está a la vista; al llegar al final vuelve a su
  lugar. (2) Bajo el mapa, la precisión del GPS se muestra como insignia con punto de color y
  palabra: buena hasta ±10 m, aceptable hasta ±30 m (aconseja revisar el punto) y baja por
  encima (aconseja esperar y volver a ubicar o arrastrar el punto). Sobre el mapa se dibuja un
  círculo del tamaño del margen. Los umbrales viven en `CONFIG.MAPA`; son guía, no impiden
  guardar. Un punto a mano o ajustado no lleva insignia ni círculo, porque no tiene precisión.
  (3) Cuando la lista de registros queda vacía, el aviso trae el botón que resuelve: sin
  registros, «Registrar un árbol» (sólo a quien captura); sin registros de hoy, además «Ver
  todos»; con un filtro sin resultados, «Quitar filtros» (limpia periodo y cabo). Sustituye al
  texto «Toque «Todos»…». Elegidas por Liber de la lista de mejoras, 22-09-2026.
- **D97. Las salidas de la cuenta son texto.** En el menú de la cuenta, «Cambiar usuario
  (pruebas)» y «Cerrar sesión» son renglones de texto bajo un filete, como en la mayoría de los
  sistemas, en lugar de un botón con contorno y un enlace subrayado. Supera esa parte de D93.
  Pedido por Liber, 22-09-2026.

## Bloque 43 — Formulario revisado en iPhone

- **D98. Seis ajustes al formulario de Nuevo registro tras revisarlo en un iPhone.**
  (1) Al tocar Especie en teléfono, el campo sube al tope de la pantalla para que la lista no
  quede bajo el teclado; es un desplazamiento hasta lo que la persona tocó, no un salto de foco,
  así que D82 sigue en pie. (2) Los estados de «señalar» (hover) sólo existen con ratón: en
  iPhone un toque los dejaba pegados, la zona de foto quedaba rosa y la primera especie parecía
  elegida. Con foto cargada, la zona de carga se reduce a un renglón «Cambiar fotografía».
  (3) El foco de los campos de texto es un borde guinda de 2 px; el contorno azul queda para
  botones y enlaces. (4) Con hasta cuatro programas se eligen con botones de ancho igual, sin
  ninguno marcado de inicio (D29); la lista sigue siendo el dato y reaparece con más de cuatro.
  (5) Coordenadas, alcaldía y colonia van en una ficha compacta sin cajas de campo: renglones
  etiqueta-valor en teléfono, tres columnas en escritorio. (6) La fecha sigue arrancando vacía
  (D29) y lleva al lado un botón «Hoy» que la pone de un toque. Aprobadas por Liber, 22-09-2026.

## Bloque 44 — Ficha de revisión revisada en iPhone

- **D99. La ficha «Revise antes de guardar» sigue el orden del formulario y guarda desde el pie.**
  (1) Los datos van en el orden en que se capturan (Especie, Programa, Fecha, Alcaldía, Colonia,
  Coordenadas, Cómo se obtuvo, Cabo, Comentarios, Fotografía); Folio e Identificador bajan a un
  apartado final «Datos del sistema», en letra chica, porque no son algo que el cabo revise.
  (2) «Cómo se obtuvo» lleva la misma insignia de precisión que bajo el mapa y, si no es buena,
  pide revisar el punto con «Editar» en Coordenadas; es aviso, no impide guardar. (3) «Guardar»
  pasa de la cabecera a una barra fija al pie, verde y a todo el ancho, igual que «Revisar y
  guardar» en el formulario; la cabecera conserva el título y la ×. Sustituye a D74 en esta
  ficha. (4) Especie y «Especifique la especie» no pasan por el corrector ni por mayúsculas
  automáticas del teléfono, que subrayaban y podían cambiar los nombres científicos.
  Aprobadas por Liber, 22-09-2026.

## Bloque 45 — Lista de registros, filtros y tablas

- **D100. La lista y sus filtros se ajustan al teléfono, y las tablas se ordenan.**
  (1) Cada registro es una tarjeta: miniatura de la foto (o un árbol si no tiene), especie,
  lugar y fecha, con la tuerca arriba a la derecha; tocar la tarjeta abre el detalle. La lista
  ya no repite «PROVISIONAL» en cada registro: lo siguen diciendo el detalle, la ficha de
  revisión y el PDF, con lo que R1 (D68) se mantiene; el folio aparece en la tarjeta cuando
  exista. (2) Los filtros activos se ven como fichas con × (periodo y cabo). En teléfono el
  panel de filtros va plegado tras «Filtros (n)»; en escritorio sigue abierto. (3) Año/Mes y
  Desde/Hasta ya no se ven a la vez: con «Un periodo» abierto se ocultan Año y Mes. (4) El
  detalle sigue el orden del formulario, deja Folio e Identificador en «Datos del sistema» y
  pone «Editar» en la barra fija al pie, como la ficha de revisión (D99); muestra la insignia
  de precisión. (5) Al editar queda marcada la pestaña Registros. (6) Las tablas de Catálogos y
  Usuarios se ordenan tocando el encabezado (A-Z / Z-A, con aria-sort), el encabezado queda fijo
  al desplazar en escritorio y el estado lleva un punto de color junto a la palabra. (7) Todas
  las vistas miden lo mismo; en las de formulario y lectura el contenido conserva su línea
  corta, alineado a la izquierda. Aprobadas por Liber, 22-09-2026 (M05, M07, M10, M11, M30–M32,
  M34–M36).

## Bloque 46 — Avisos con «Deshacer», vista previa del parte y nombre del PDF

- **D101. Un solo aviso flotante y vista previa antes del PDF.** (1) Todos los avisos de la
  plataforma salen del mismo componente: arriba de la pantalla (para no tapar las barras fijas
  del pie), fondo oscuro neutro con filete e icono de éxito o alerta, texto, × para cerrarlo y,
  cuando la acción se puede revertir, «Deshacer». Dura 4.5 s, 7 s si es alerta y 8 s si trae
  «Deshacer». Se puede deshacer: eliminar un registro (vuelve con bitácora RESTAURADO),
  reiniciar filtros, quitar la foto del formulario y activar o desactivar un valor de catálogo o
  una cuenta. (2) El formulario de cierre ya no genera el PDF directo: su botón, al pie, dice
  «Ver vista previa» y abre una hoja con lo mismo que dirá el PDF (sitio, actividades, personal,
  ejemplares, totales, programa, observaciones y logística, sin los apartados vacíos). Desde ahí,
  «Generar PDF» o «Corregir datos de cierre», que vuelve al formulario con lo escrito.
  Elegidas por Liber, 22-09-2026 (M08, M09).
- **D102. El PDF se nombra con la palabra Reporte, quién responde y la fecha del parte.**
  Forma: `Reporte_<Nombre_Apellidos>_<AAAA-MM-DD>.pdf`, p. ej.
  `Reporte_Perengano_Gomez_Ejemplo_2026-09-22.pdf`. La persona es el encargado del cierre; si no
  lo hay, el cabo elegido en Reportes; si tampoco, quien genera. Sin acentos ni espacios para que
  ningún sistema de archivos ni app de mensajería lo altere. Sustituye a
  `Reporte_Plantacion_<fecha>.pdf`. Pedido por Liber, 22-09-2026.

## Bloque 47 — Parte del día: PDF más claro y ligero, cierre más ágil

- **D103. Ajustes al parte del día tras revisar un PDF real.** (1) En «Personal participante»
  el Encargado va primero y cada grupo lleva su subtítulo («Participantes», «Personal de apoyo»)
  con los nombres sangrados y con viñeta, uno por renglón; antes los de apoyo se leían como
  participantes. (2) En «Totales por especie» la cifra del Total y el encabezado «Ejemplares» se
  alinean a la derecha como las demás cifras. (3) El PDF se genera comprimido y el logotipo se
  incrusta en JPEG sobre blanco: el archivo pasa de ~800 KB a ~60 KB y se comparte sin problema
  por mensajería. (4) En Reportes, en teléfono, el cabo va a todo el ancho para que su nombre no
  se corte. (5) En el cierre, Chófer va solo; Modelo y Placa en una fila también en teléfono; la
  hora de finalización lleva un botón «Ahora». Elegidas por Liber, 22-09-2026 (M38, M39, M41–M43).

## Bloque 48 — Registros sin filtro de inicio, «reporte» en vez de «parte» y Reportes simplificado

- **D104. Ajustes pedidos por Liber tras usar la 0.6.27 en su iPhone.** (1) Registros abre con
  todos los registros, sin filtro, y con el panel de filtros abierto también en teléfono;
  «Filtros» lo pliega. «Reiniciar filtros» vuelve a Todos. Supera el inicio en «Hoy» (D64) y el
  panel plegado de inicio (D100). (2) Un solo atajo marcado a la vez: al abrir «Un periodo» se
  marca él y se desmarcan Hoy y Todos, aunque el rango entre hasta «Aplicar»; antes Todos seguía
  marcado y Un periodo llevaba contorno guinda, y parecían elegidos los dos. (3) Las fechas y la
  hora vacías muestran un texto guía («Seleccione en el calendario», «Elija la fecha», «Elija la
  hora»), porque el iPhone las deja en blanco y placeholder no aplica a esos controles. (4) En
  toda la interfaz, el PDF y los comentarios del código, «parte» pasa a «reporte» («Reporte del
  día», «Día del reporte», «Vista previa del reporte»). Los identificadores internos y las
  decisiones anteriores conservan su texto. (5) Se retira de Reportes el bloque «Registros en
  este dispositivo» (conteo, fotos y aviso). «Guardar respaldo» pasa al menú de la cuenta, porque
  es la única forma de sacar los datos del teléfono mientras no haya servidor; la guía de qué
  hacer sin internet sigue en la pastilla de conexión. 23-09-2026.

## Bloque 49 — Catálogos y Usuarios en teléfono

- **D105. Catálogos y Usuarios como tarjetas en teléfono y fichas de filtro sin duplicar.**
  (1) En teléfono cada especie, programa, área o usuario es una tarjeta compacta: nombre,
  científico (o correo), un renglón de resumen con el punto de estado (clave, distribución y uso;
  o perfil, área, coordinador y registros) y la tuerca arriba a la derecha. Tocar la tarjeta abre
  la edición. En computadora se conserva la tabla ordenable (D100). Antes cada fila medía 350–400
  px. (2) En las ventanas de catálogo y de usuario, «Guardar» pasa a la barra fija al pie, a todo
  el ancho, como en la ficha de revisión y el detalle (D99, D100). (3) Bajo el buscador, un
  contador: «76 especies», «4 de 76 especies», «3 usuarios». (4) La nota de que lo que tiene
  registros no se elimina se reduce a una línea. (5) Las fichas de filtros activos (D100) sólo se
  ven con el panel de filtros plegado: abierto, los atajos ya marcan lo mismo y la ficha «Hoy»
  se repetía. Elegidas por Liber, 23-09-2026 (M52–M56 y petición sobre la ficha «Hoy»).

## Bloque 50 — Modo sol (alto contraste)

- **D106. Modo sol para leer a pleno sol.** Interruptor «Modo sol (alto contraste)» en el menú
  de la cuenta. Al activarlo: texto negro, grises casi negros, bordes suaves a contornos
  visibles, campos de filtro blancos con borde de 2 px, atajos con borde de 2 px y el activo
  relleno de guinda con texto blanco, tarjetas con borde de 2 px y texto un punto más pesado.
  El guinda (8:1) y los colores de significado no cambian. Los textos guía (placeholder y campos
  vacíos) quedan en gris medio, sin negrita y en cursiva, para no confundirse con lo escrito. Se
  recuerda en el dispositivo; si el teléfono ya pide más contraste en sus ajustes de
  accesibilidad y la persona no ha elegido, arranca activado. Elegida por Liber (M12).

## Bloque 51 — Navegación abajo, estado de cuentas y forma de crecimiento

- **D107. Cinco ajustes elegidos por Liber de la lista pendiente.** (1) En teléfono (≤700 px)
  las secciones van en una barra fija abajo, al alcance del pulgar, con la sección activa marcada
  por un filete guinda arriba; la barra de «Revisar y guardar» sube para quedar encima de ella y
  respeta la zona segura del iPhone. En computadora siguen arriba. (2) Usuarios lleva atajos
  Activos / Inactivos / Todos (arranca en Todos) y el contador refleja el filtro. (3) La forma de
  crecimiento de una especie se elige con seis botones de opción múltiple (Árbol, Arbusto, Palma,
  Sufrútice, Liana, Hierba, tomados del catálogo real); se guarda igual que antes, como texto
  separado por comas, y una forma distinta que ya traiga el catálogo se conserva como botón.
  (4) Los campos del cierre del reporte son cajas grises como los filtros (clase
  `campos-grises`), con sus etiquetas normales. (5) La etiqueta «Fotografía» se alinea con las
  demás: el fieldset y su leyenda traían margen y relleno del navegador. 23-09-2026
  (M02, M57, M58, M40, M26).

## Bloque 52 — Crédito del mapa y autollenado de Safari

- **D108. Dos ajustes de la revisión en iPhone.** (1) En teléfono el crédito del mapa ocupa un
  renglón que termina en «…» y se despliega completo al tocarlo; sin la bandera del prefijo de
  Leaflet. La atribución de Esri se conserva íntegra, como exige el proveedor. (2) Para que Safari
  no ponga la llave, la tarjeta y la ubicación sobre el teclado en campos que no son de contacto:
  todos los formularios y campos fuera del acceso llevan `autocomplete="off"`, y mientras hay
  sesión el campo de contraseña sale de la página (vuelve al regresar al acceso, con su
  autollenado de contraseña). Safari decide al final; el efecto es reducirlo, no garantizarlo.
  Elegidas por Liber (M22, M23).

## Bloque 53 — Equilibrio en computadora

- **D109. Nuevo registro en dos columnas y Reportes centrado, sólo en computadora (≥1024 px).**
  Nuevo registro pone la ubicación (botón, captura a mano, mapa y ficha del punto) a la izquierda
  y los datos del árbol a la derecha; el mapa crece hasta 520 px de alto. Reportes centra su
  contenido y el reporte del día va como tarjeta. Resuelve la media pantalla vacía que dejó D100
  al igualar el ancho de las vistas. En teléfono y tableta no cambia nada. Elegida por Liber (M45).

## Bloque 55 — Folio simulado con datos de prueba

- **D110. Con datos de prueba, un servidor simulado emite el folio.** Para poder ver el folio en
  la lista, el detalle, la vista previa y el PDF antes de que exista el servidor, cuando
  `ES_FICTICIO` es verdadero y hay conexión, cada registro de prueba sin folio recibe el suyo al
  guardarse, al entrar a la app y al volver la señal. Se emite como lo hará el servidor real:
  una sola vez, con `AAA-000-00000` (D67), consecutivo leído e incrementado de una secuencia por
  celda que sólo avanza (R5–R6), y se congelan `folio_uga`, `folio_capa_version`, `folio_lat` y
  `folio_lng` (R8); la bitácora registra `FOLIO_ASIGNADO`. Sin conexión no se emite y el registro
  sigue PROVISIONAL, como pasará en campo. Límites, a propósito: la secuencia vive en el
  dispositivo (dos teléfonos de prueba pueden repetir número, que es lo que el servidor evitará)
  y el folio se muestra como «(simulado)» en el detalle; la vista previa y el PDF advierten
  «Folios SIMULADOS con datos de prueba: no valen para placas, rótulos ni oficios». Con
  `ES_FICTICIO` en falso nada de esto corre y D67–D68 rigen tal cual: folio nulo y PROVISIONAL
  hasta la Fase 2. Pedido por Liber, 23-09-2026.

## Bloque 56 — Envío al servidor simulado con datos de prueba

- **D111. Con datos de prueba se simula la cola de envío de la Fase 2.** Para ver en pruebas
  cómo funcionará el envío, con `ES_FICTICIO` cada registro nace «por enviar» y sale solo en
  cuanto hay señal: al guardar, al entrar, al volver la señal, al volver a la app y cada minuto
  mientras haya pendientes; «Enviar ahora» lo fuerza. El servidor simulado tarda 1.2 s, confirma
  la recepción y asigna el folio (D110). Si la señal se va a medio envío, nada se da por recibido.
  Una edición posterior vuelve a la cola y se reenvía sin cambiar el folio (R7). Estados:
  por enviar, cambios por enviar, recibido. Avisos: la pastilla del encabezado («Con conexión ·
  Al día», «Sin conexión · 3 por enviar», «Enviando 3…», en rojo con atraso); «Registro guardado»
  dice si se envió y a qué hora se confirmó o si quedó en el teléfono; una franja de atraso
  («Hoy es miércoles 23 de septiembre. Tiene 5 registros sin enviar desde el lunes 21…») cuando
  hay pendientes de días anteriores o, desde las 17:00, de hoy; la tarjeta lleva «Por enviar» y el
  detalle la fila «Envío»; la guía «¿Qué hacer sin internet?» muestra la cola y el último envío.
  El menú de cuenta trae «Simular sin señal (pruebas)» para probar sin modo avión. Límites, a
  propósito: nada sale del teléfono; lo «recibido» se anota en `localStorage` del dispositivo
  (`srp_envios_prueba`), no en la base, porque los dos campos de envío siguen pendientes para la
  Fase 2 (esquema, pendientes). Con `ES_FICTICIO` en falso nada de esto corre y la pantalla dice
  lo de D83. Pedido por Liber, 23-09-2026.

## Bloque 57 — Jornadas y el atajo «Un día»

- **D112. «Jornadas» es la cuarta sección: mapa y lista de lo registrado en un día de trabajo.**
  Al cierre, cabos y coordinadores necesitan comprobar que cada árbol plantado tenga su punto y
  corregir lo que salió mal. Una jornada es la fecha de plantación más el cabo, la misma llave
  del cierre del día; si ese día hubo dos sitios a más de 500 m, se muestran como dos tarjetas.
  La revisión tiene el mapa con los puntos numerados en el orden en que se registraron, la lista
  con el mismo número (tocar uno lo marca en ambos), la conciliación «Árboles plantados según la
  cuadrilla» contra los registrados (se guarda en el cierre como `arboles_plantados` y sale en el
  reporte), y avisos por punto: posible duplicado (misma especie a menos de 3 m), lejos del resto
  (a más de 150 m de la mediana de los demás) y precisión baja (peor que 30 m). «Está bien» marca
  el punto como revisado (`puntos_revisados` del cierre); «Eliminar» sólo aparece en duplicados;
  «Ver» y «Editar» vuelven a la misma jornada. «Registrar faltante» abre Nuevo registro con la
  fecha puesta; «Reporte de la jornada» abre Reportes en esa fecha. Va en la barra inferior del
  teléfono. Para que la llave coincida, un cabo guarda su cierre con su propio id (antes
  «fecha|TODOS»; se sigue leyendo). El sitio de la tarjeta sale del cierre o, si no, de la colonia
  más frecuente. Es un módulo aparte y no una vista de Registros por decisión de Liber, 23-09-2026.

- **D113. Atajo «Un día» en Registros y Jornadas.** Para ver una fecha concreta antes había que
  abrir «Un periodo» y repetirla en Desde y Hasta. «Un día» muestra una sola fecha y filtra en
  cuanto se elige, sin «Aplicar»; esconde año, mes y el rango mientras está activo. Los atajos
  quedan Hoy · Un día · Todos · Un periodo. Pedido por Liber, 23-09-2026.

## Bloque 58 — Vocabulario, iconos del menú y orden de secciones

- **D114. Los árboles se plantan, no se siembran; iconos en el menú de la cuenta; orden de las
  secciones.** (1) «Sembrar» se reserva a la agricultura: en pantalla, reporte y esquema se dice
  «plantar»; el campo del cierre pasa de `arboles_sembrados` a `arboles_plantados` (nunca llegó a
  producción) y la auditoría vigila que el término no vuelva. Cargar los datos de arranque se sigue
  llamando «sembrar» en `almacen.js`: no habla de árboles. (2) Cada opción del menú de la cuenta
  lleva icono: sol en «Modo sol», puerta en «Cerrar sesión» (los dos pedidos) y disco, señal
  tachada y usuario en las demás, por consistencia. (3) Las secciones van en este orden: Nuevo
  registro, Jornadas, Registros, Reportes (y Catálogos y Usuarios para administración). Pedido por
  Liber, 23-09-2026.

## Bloque 59 — Croquis de la jornada en el reporte y revisión de Jornadas en el teléfono

- **D115. El reporte lleva el croquis de la jornada.** Después de la tabla de ejemplares, una
  imagen con los puntos numerados en el mismo orden que la tabla, barra de escala y norte
  (`js/croquis.js`). Con conexión lleva de fondo la imagen de satélite del mismo proveedor del
  mapa (JPEG, 60–120 KB); sin conexión, si los mosaicos no llegan en 8 s o el servidor no permite
  copiarlos al lienzo, va sobre fondo liso (PNG de pocos KB) y el pie lo dice. Se arma una vez por
  conjunto de puntos y la reutilizan la vista previa y el PDF. La vista previa abre sin esperar
  la imagen y la coloca cuando está. [pendiente] Comprobar en el teléfono que los mosaicos de Esri
  permitan la copia (CORS); si no, el croquis saldrá siempre sin imagen y habrá que cambiar de
  proveedor o pasar por un servidor propio. Pedido por Liber (M64), 23-09-2026.

- **D116. Revisión de Jornadas con capturas del iPhone.** (1) El mapa de la jornada acepta zoom
  hasta 22 escalando la imagen (`ZOOM_JORNADA`): al 19, tope del proveedor, dos árboles a 3 m
  quedaban a 11 px y los pines se encimaban; el teléfono «rebotaba» al intentar acercar más.
  (2) Las acciones de cada punto siguen la Norma 8.4, color por significado y con icono: «Ver»
  con ojo, «Está bien» verde con palomita, «Eliminar» rojo con bote. (3) «Cancelar» y «Cancelar
  edición» van en rojo de contorno con tache (`.btn-cancelar`); el rojo relleno sigue reservado a
  eliminar. (4) El subtítulo de la jornada dice la fecha una sola vez. (5) El campo del conteo
  lleva `autocomplete="off"` para que Safari no ofrezca llave, tarjeta y ubicación. Pedido por
  Liber, 23-09-2026.

## Bloque 60 — La jornada es la unidad: varias en un día, un reporte por jornada

- **D117. Un cabo puede hacer varias jornadas en un día; cada una tiene su revisión, su
  conciliación y su reporte.** El área de plantación reporta días con dos o tres sitios
  (Parque de los Pericos en la mañana, Parque Hundido en la tarde). La jornada es fecha + cabo +
  número del día (1, 2, 3…, en el orden en que se empezaron a registrar). El reparto es
  automático: cada punto va a la jornada del día que tenga un punto a menos de
  `CONFIG.JORNADA.SEPARAR_M` (500 m); si ninguna, abre una nueva. Dos correcciones a mano desde la
  tuerca del punto, guardadas en el registro (`corte_jornada`: 'inicia' | 'continua') y en su
  historial: «Iniciar otra jornada aquí» y «Unir con la jornada anterior». Se descartó pedir al
  cabo que «abra» cada jornada con un botón: en campo se olvida y un olvido mezcla dos sitios sin
  que nadie lo note. La conciliación, los puntos revisados y el cierre son de la jornada: llave
  `fecha|cabo|n`, y el cierre guarda además `jornada_n` y `primer_registro_id` para reencontrarse
  si el número cambia (se eliminó una jornada anterior completa); lo guardado antes del bloque 60
  (`fecha|cabo`, `fecha|TODOS`) se lee para la jornada 1. Reportes: con el día y el cabo, el
  selector «Jornada» (sólo cuando hay más de una) y un PDF por jornada, con su sitio, sus
  ejemplares, su croquis y «Jornada 2 de 3» bajo la fecha; el archivo lleva `_J2`. Se retiró
  «Todos los cabos» del selector de Reportes porque un reporte de varios cabos ya no tiene
  sentido. La tarjeta de la jornada se llama como el sitio escrito en su cierre. Decidido por
  Liber: el reporte es por jornada, 23-09-2026.

## Bloque 61 — Galería de fotografías y cierre sin «Actividades»

- **D118. Sección «Fotografías» para coordinación y administración, con descarga; el cierre ya no
  pregunta «Actividades realizadas».** (1) Permiso `galeria` (COORDINADOR y ADMIN; el cabo ve sus
  fotografías en cada registro). La galería enseña las fotografías de los registros activos que
  alcanza quien entró, con los atajos Hoy · Un día · Todas y el filtro por cabo; una fotografía
  se abre grande con especie, fecha, cabo, lugar, folio y nombre de archivo, con «Descargar» y
  «Ver registro»; «Descargar todas» arma un ZIP con las filtradas. El ZIP se arma en la
  aplicación sin biblioteca, en modo «almacenar» (las JPEG no se comprimen más); los nombres son
  `Foto_<folio o identificador>_<fecha>_<especie>.jpg`. En teléfono se comparte con las apps del
  dispositivo y en computadora se descarga (D61). (2) La única actividad es plantar: el campo
  `actividades` sale del cierre, de la vista previa, del PDF y del esquema; un cierre anterior que
  lo traiga se ignora. Pedido por Liber, 23-09-2026.

## Bloque 62 — La jornada se declara antes de registrar

- **D119. La jornada se declara antes del primer árbol; supera a D117.** La gente trabaja por
  jornada de plantación, y el área pidió que se capture al inicio y una sola vez: nombre, fecha y
  comentarios. Sin una jornada abierta, «Nuevo registro» muestra «Iniciar jornada» en lugar del
  formulario; con una, el formulario lleva la franja de la jornada (nombre, fecha, cuántos árboles)
  con «Cambiar» (elegir otra abierta o iniciar otra) y «Cerrar jornada» (pasa a su revisión; se
  puede reabrir desde ahí o con «Registrar faltante»). Cada árbol nace con `jornada_id` y hereda
  la fecha de plantación: el campo deja de pedirse por árbol (decisión 1 de Liber). Nueva tabla
  `jornadas` (versión 2 de la base) que además absorbe lo que vivía en `cierres`: conteo, puntos
  revisados y datos de cierre del reporte; `cierres` se retira y «Sitio» sale del cierre porque
  lo da el nombre de la jornada (decisión 2). Los comentarios van al reporte como «Comentarios de
  la jornada» (decisión 3). El reparto automático de D117 se convierte en salvaguarda: un árbol a
  más de 500 m de los demás de la jornada abierta se pregunta antes de guardar; y la corrección
  manual pasa a «Mover a otra jornada» desde la tuerca del punto (decisión 4), que también ajusta
  la fecha. Al entrar con una jornada abierta de otro día se avisa. Los registros de prueba
  anteriores no llevan jornada: el sello de datos cambia y los dispositivos arrancan en blanco
  (decisión 5). Se descartó de nuevo pedir la jornada sin salvaguarda: la distancia sigue
  vigilando el olvido. Reportes: el selector «Jornada» lista las declaradas por nombre. En
  Fotografías y en el detalle del registro aparece el nombre de la jornada. Pedido por Liber
  (área de plantación), 23-09-2026.

## Bloque 63 — Inicio de jornada: bloqueo real, fecha con «Hoy», ubicación y programa en lista

- **D120. Cuatro ajustes al inicio de jornada tras la revisión de Liber.** (1) En computadora el
  formulario de registro asomaba bajo «Iniciar jornada»: la regla de dos columnas (D109) ponía
  `display: grid` y le ganaba al atributo `hidden`. Se corrige de raíz con `[hidden] { display:
  none !important }` (la única excepción a «sin !important» junto con reduced-motion) y, por si
  acaso, el botón de ubicación y el envío del formulario exigen jornada abierta y devuelven al
  panel si no la hay. (2) La fecha de la jornada arranca vacía, con el texto guía «Seleccione la
  fecha» y el botón «Hoy» a un toque, como el resto de las fechas (D29, D98). (3) Campo abierto
  «Ubicación de la jornada» (dirección, parque o referencia; opcional), guardado en
  `jornadas.ubicacion`; va en la franja y en el reporte bajo el nombre. (4) El programa se elige
  en la lista desplegable, ya no con botones (supera a D98 en ese punto): los programas crecen con
  el tiempo. De paso se retiró un bloque de estilos duplicado del envío (D111) que había quedado
  mal pegado. Pedido por Liber, 23-09-2026.

## Bloque 64 — Colores de la revisión de jornada

- **D121. Cerrar no es aprobar.** «Cerrar jornada» iba en verde y parecía una aprobación: pasa a
  guinda (acción de la casa) con candado, en la franja de Nuevo registro, en la revisión y en el
  diálogo de confirmación; «Reabrir jornada» va en dorado con lápiz (corregir). En cada punto,
  «Está bien» y «Eliminar» dejan de ser texto subrayado: botones pequeños de contorno, verde con
  palomita y rojo con bote (Norma 8.4), y en teléfono bajan a un segundo renglón para no aplastar
  la especie y el aviso. «Registrar faltante» y «Reporte de la jornada» llevan icono. El conteo
  de la conciliación ya no muestra un guion como texto guía, sino «Cantidad». De paso se corrigió
  que los iconos de la fila no se pintaban (la función de iconos se pasaba suelta y perdía `this`).
  Pedido por Liber, 23-09-2026.
- **D122. La jornada también se ubica.** En «Iniciar jornada», antes del campo de ubicación, un
  botón «Detectar ubicación de la jornada» toma la posición del teléfono y deriva alcaldía y
  colonia con las mismas capas que cada árbol (D47, D62); se muestran como datos de lectura y se
  guardan en la jornada (`lat`, `lng`, `gps_precision_m`, `alcaldia_cve`, `alcaldia`,
  `colonia_cve`, `colonia`). Es sólo de la jornada: no toca el mapa ni el punto de ningún árbol,
  y el campo «Ubicación de la jornada» (dirección o referencia escrita) se conserva y no se
  rellena solo. Sin tocar el botón, los siete campos quedan nulos. Alcaldía y colonia de la
  jornada van a la franja de Nuevo registro, a Jornadas (cuando aún no hay árboles) y al reporte,
  junto a la ubicación escrita. El botón sigue la regla del punto (D48): guinda sin detección,
  dorado «Detectar de nuevo» con ella. «Cambiar» pasa a «Cambiar de jornada». Pedido por Liber,
  23-09-2026.
- **D123. La ficha de revisión dice folio y distribución.** En «Revise antes de guardar» el Folio
  (PROVISIONAL hasta que el servidor lo asigne) sube de «Datos del sistema» a la lista, debajo de
  la Fotografía, porque es lo que la persona citará; en «Datos del sistema» queda sólo el
  identificador. La fila Especie añade el tipo de distribución del catálogo (Nativa, Endémica,
  Exótica, Exótica-Invasora) bajo el nombre común y el científico. Pedido por Liber, 23-09-2026.
- **D124. Sistema de botones sin el manual gráfico.** La auditoría de los 115 controles (23-09-2026)
  encontró 17 formas de botón y el origen de la confusión: el guinda (#9D2148) y el rojo (#B3261E)
  tienen 1.1:1 de contraste, así que mientras el guinda fuera el color de acción el rojo no podía
  significar nada, y cada parche (dorado oscurecido a café, contornos, subrayados) sumó formas.
  Liber pidió dejar el manual a un lado. Queda: cinco intenciones y tres pesos. Acento **pizarra**
  #2F4858 para avanzar (entrar, generar, descargar, cerrar jornada, agregar, aplicar); verde #1E7A46
  para comprometer (guardar con disco; iniciar jornada, confirmar y aprobar con palomita); rojo
  #C62828 para quitar (relleno sólo en la confirmación definitiva; contorno con tache para cancelar,
  con bote para eliminar en lista); ámbar (fondo #FFF4E0, borde #D98A1E, texto #8A4B00) para
  corregir (editar, reabrir, actualizar la ubicación, corregir el cierre); gris de contorno o texto
  para apoyo (Hoy, Ahora, Colocar punto, Ver, Cambiar de jornada, Ver mis registros, Mostrar más,
  volver con chevron). Pesos: 56 px cierra la pantalla, 48 normal, 40 en fila o franja. Un radio
  (8 px); los filtros son píldoras con el activo relleno del acento; la tuerca lleva borde; el
  tache de los diálogos va en círculo suave; los menús pintan Editar en ámbar y Eliminar y Cerrar
  sesión en rojo, y Desactivar/Activar llevan tache/palomita. Todo botón con color lleva icono
  («Agregar registro nuevo», «Generar reporte», «Ver vista previa», «Aplicar», «Colocar punto»,
  «Enviar ahora», «Corregir datos de cierre» lo recibieron). «Enviar ahora» pesa igual en la
  franja y en el diálogo. El guinda se conserva en encabezado, pie, títulos, tablas del reporte y
  marcadores del mapa: la app sigue siendo SEDEMA, pero el guinda deja de ser el color de los
  botones. Se conservan los nombres de clase (`btn-primario`, `btn-secundario`…) con su nuevo
  significado, para no tocar cada llamada; `--radio-pildora` es nuevo. Elegido por Liber entre
  pizarra, petróleo, verde bosque y guinda, 23-09-2026.
- **D125. «Cerrar jornada» siempre llega a la ficha.** Al cerrar desde la franja de Nuevo registro se
  va a Jornadas y se abre la ficha de esa jornada; si el filtro la dejaba fuera (estaba en «Hoy» y
  la jornada es de otro día, o en otro cabo), el filtro se ajusta a ella («Un día» con su fecha;
  cabo en «Todos»). Antes, en ese caso, se llegaba a la lista sin la jornada. Pedido por Liber,
  23-09-2026.
- **D126. La ficha de revisión enseña el folio que tocará y esconde el identificador.** Orden final
  de la ficha: …, Fotografía, Folio, Cabo. Con datos de prueba el Folio ya no dice PROVISIONAL sino
  el que recibirá al guardar («COY-049-00002 (simulado)»): la celda del punto y el consecutivo
  siguiente de la secuencia simulada, contando los registros de esa celda que aún esperan folio
  (`SRP.folio.previsto`); no incrementa la secuencia, la emisión sigue ocurriendo una sola vez al
  guardar y sincronizar (R3). Sin simulación (ES_FICTICIO en false) vuelve a decir PROVISIONAL,
  porque el folio real lo da el servidor. El bloque «Datos del sistema» con el identificador UUID
  y su nota se quitan de la ficha: es dato interno, no de quien registra; sigue en el detalle del
  registro y en el espejo. Pedido por Liber, 23-09-2026.
- **D127. «Registro guardado» responde qué quedó registrado.** El aviso va de lo que la persona
  reconoce a lo que el sistema confirma: especie (común en negritas, científico en cursiva), Folio
  (PROVISIONAL hasta que el envío simulado lo confirma; entonces se sustituye), Jornada · fecha,
  Lugar (alcaldía · colonia), Cómo se obtuvo con la misma insignia de precisión que la ficha, y al
  final el envío con su hora (verde con palomita) o la espera de señal (ámbar). Fuera el
  identificador UUID y la fecha suelta. Criterio propuesto y aprobado por Liber, 23-09-2026.
- **D128. Fichas y filtros de Jornadas.** Criterio de la ficha: identificar → cuándo → estado → dónde
  → cuánto → quién. Nombre en grande con la miniatura a la derecha (puntos pizarra; ámbar con
  aviso; rojo lejos del resto); «Hoy» o «Ayer» en negritas cuando aplica, el día con su fecha y la
  insignia «Jornada n de n» sólo si ese día hubo más de una; dos etiquetas de estado juntas y
  visibles: **Abierta** (verde relleno) o **Cerrada** (pizarra relleno con candado —no rojo, que
  en el sistema significa quitar/error y ya lo usa el descuadre de al lado—) más el resultado de
  la revisión con color; alcaldía · colonia (las detectadas al iniciar la jornada; si no, las de
  sus árboles) y en gris la ubicación escrita; cuatro cifras iguales: árboles, especies, por
  revisar, bien (= registros sin aviso pendiente), con los ceros atenuados; el cabo sólo para
  coordinador y administrador. El total dice «n jornadas · m árboles». Filtros: atajos **Todas ·
  Hoy · Un día · Un periodo** (Desde/Hasta con «Aplicar», como en Registros, D82) y **Año, Mes y
  Cabo** plegados en un acordeón «Más filtros» cuyo resumen dice lo elegido dentro; un día gana
  sobre año/mes y el rango limpia a los tres. Mockup aprobado por Liber, 23-09-2026.
- **D129. Registros con los mismos filtros que Jornadas.** Atajos en el orden Todos · Hoy · Un día
  · Un periodo, y Año, Mes y Cabo plegados en el acordeón «Más filtros», cuyo resumen dice lo
  elegido; se esconde si dentro no queda nada que elegir (con «Un día» o «Un periodo» abiertos y
  sin filtro por cabo). Se conserva la regla de D100: año/mes y Desde/Hasta nunca se ven a la
  vez. Fotografías no cambia: sus filtros son pocos. Decidido por Liber, 23-09-2026.
- **D130. Guardar en un toque.** Por árbol había nueve toques, tres de ellos de ceremonia (Revisar
  y guardar → Guardar → Agregar registro nuevo): en una jornada de cien árboles, trescientos toques
  y una ficha que ya nadie lee. Queda: un solo «Guardar»; la ficha «Revise antes de guardar» se
  abre sólo cuando hay algo que revisar —precisión que no es buena, especie fuera del catálogo,
  posible duplicado (< JORNADA.DUPLICADO_M de otro árbol de la jornada) o árbol lejos de la jornada
  (> JORNADA.SEPARAR_M, que sustituye la pregunta de D119)— o al editar, y lo dice arriba en un
  recuadro ámbar. La fotografía es opcional y nunca avisa (Liber). Al guardar desaparece el modal:
  el formulario queda en blanco y listo, con el foco en «Registrar ubicación», y arriba una franja
  verde dice «Guardado: especie · folio · lugar · envío» con «Corregir» (abre ese registro en
  edición) y «Ver»; el envío simulado actualiza la franja (D111). El programa pasa a la jornada:
  se elige al iniciarla (`jornadas.programa_id`, obligatorio), va en la franja y se hereda en el
  formulario, donde sigue pudiéndose cambiar por árbol; el dato del árbol sigue siendo
  `plantaciones.programa_id`. Encima del buscador de especies van las últimas tres de la jornada
  como atajos. Resultado: cinco toques por árbol (ubicación, especie, foto ×2, Guardar). Propuesto
  con números y aprobado por Liber, 23-09-2026.
- **D131. La meta se declara al iniciar; el reporte es de una jornada cerrada.** Quien inicia la
  jornada ya sabe cuántos árboles va a plantar: «Árboles que se van a plantar» (`meta_arboles`,
  obligatoria, 1–9999) sustituye al conteo de la cuadrilla que se capturaba en la revisión (D112);
  `arboles_plantados` deja de existir (las jornadas viejas se leen como meta). La revisión compara
  registrados contra la meta: abierta y por debajo es «En curso: n de m», no error; cerrada, falta
  o sobra en rojo; cuadra en verde. La ficha de Jornadas lleva las cifras meta · registrados
  (grandes) y por revisar · bien · especies, y «Abierta» con candado abierto. En Nuevo registro
  hay un solo panel «JORNADA ACTIVA» (nombre grande, fecha, lugar, programa, «n de meta árboles»,
  Cambiar/Cerrar) con el último árbol guardado dentro, y después el título «Nuevo árbol» (o
  «Editar árbol») separa el formulario: así siempre se ve en qué jornada se registra y el aviso de
  guardado no parece parte del formulario. El reporte es de una jornada cerrada: abierta todavía
  cambia; Reportes deshabilita el botón y lo dice, y la revisión sólo ofrece «Reporte de la
  jornada» cerrada. Pedido por Liber, 23-09-2026.
- **D132. La jornada se edita y, vacía, se elimina.** En la ficha de la jornada, «Editar jornada»
  (ámbar, lápiz) abre un diálogo con nombre, ubicación, programa, meta, fecha y comentarios; lo
  puede usar quien registra en ella o quien la alcanza (coordinador de ese cabo, administrador),
  esté abierta o cerrada y cumplida o no la meta; cada cambio va a la bitácora con sus campos, y
  si cambia la fecha sus árboles toman la fecha nueva (heredan, D119) y vuelven a la cola de envío.
  «Eliminar jornada» (rojo de contorno, bote) sólo aparece sin árboles: con árboles primero se
  mueven o se eliminan ellos. El programa deja de preguntarse por árbol: se hereda de la jornada,
  el campo queda oculto en Nuevo registro y sólo se ve al editar un registro, donde es dato del
  árbol. Propuesto en el análisis del 23-09-2026 (P1, P2) y aprobado por Liber; la observación del
  programa doble es suya, 24-09-2026.
- **D133. Cuatro salvaguardas de campo.** (1) Al cambiar de sección con un árbol a medias (punto,
  especie, foto o comentario, sin ser edición) se pregunta «¿Descartarlo y salir?» en rojo; antes
  se perdía en silencio. (2) «Cerrar jornada», desde la franja o desde la ficha, dice lo que queda
  pendiente —puntos por revisar y árboles por debajo o por encima de la meta— y deja cerrar de
  todos modos. (3) Cerrar, reabrir y editar una jornada lo puede hacer quien registra en ella o
  quien la alcanza (coordinador de ese cabo, administrador); reabrir una jornada ajena no la
  vuelve la activa de quien la reabre. (4) Con una jornada de otro día abierta, el aviso al entrar
  trae la acción «Cerrar «nombre»», y guardar en ella se confirma una vez por sesión («no es de
  hoy; el árbol quedará con esa fecha; cancele y toque Cambiar de jornada para iniciar la de
  hoy»). El aviso flotante deja bajar su acción a un renglón propio cuando el texto es largo.
  Propuesto en el análisis del 23-09-2026 (P3–P6) y aprobado por Liber, 24-09-2026.
- **D134. Reportes por jornada cerrada; la tarjeta dice su jornada.** Reportes deja de pedir «día →
  jornada → generar»: lista las jornadas cerradas al alcance, la más reciente arriba, con nombre,
  «Hoy/Ayer» y fecha, «Jornada n de m», árboles y especies, el cabo (coordinación) y, si ya tiene
  reporte, cuándo se generó; cada ficha lleva «Generar reporte» (pizarra) o «Volver a generar»
  (ámbar); una jornada sin árboles lo dice y no genera. Atajos Todas · Hoy · Un día y filtro por
  cabo para quien ve a varios; la nota cuenta las abiertas que aún no se pueden reportar. «Reporte
  de la jornada» desde Jornadas llega directo al cierre de esa jornada. La jornada guarda
  `reporte_en` al aceptar el cierre. En Registros cada tarjeta dice el nombre de la jornada antes
  de la alcaldía, para que la duda «¿en qué jornada quedó?» se resuelva sin abrir nada. Propuesto en
  el análisis del 23-09-2026 (P7, P8) y aprobado por Liber, 24-09-2026.
- **D135. Fotografías por jornada; saltos de página del PDF.** La galería añade la lista «Jornada»
  con las jornadas que tienen fotografías dentro del día y cabo elegidos (la más reciente arriba);
  elegir una deja sólo sus fotos, cada pie dice la jornada y el ZIP se llama con su nombre y su
  fecha; cambiar de día o de cabo limpia la jornada elegida. Los atajos quedan en el orden común
  Todas · Hoy · Un día (sin acordeón: aquí los filtros son pocos, D129). En el PDF, un bloque cabe
  si termina antes de alto − 19 (el pie va en alto − 16); antes se reservaban 24 mm más el aire
  del propio bloque y un apartado corto saltaba de página cuando sí cabía (M44). Propuesto en el
  análisis del 23-09-2026 (P9, P12) y aprobado por Liber, 24-09-2026.
- **D136. Notificaciones en tres tonos y espera visible.** El aviso flotante suma un tercer tono,
  «aviso» (filete azul claro, icono de información), para lo que informa sin ser confirmación ni
  error: «Jornada activa: X», reabierta para otro cabo, «Registre el árbol que falta», «No hay
  registros por enviar», datos de prueba actualizados. «Éxito» queda para lo que se guardó o se
  completó y «alerta» para bloqueos y fallas. La duración crece con el largo del texto (base 4.5 s,
  7 s en alerta, 8 s con «Deshacer», más 1 s por cada 40 caracteres) y se detiene mientras el
  puntero está encima. Lo que tarda se dice: «Guardar» pasa a «Guardando…» y se deshabilita desde
  el primer toque (un segundo toque ya no crea otro árbol); «Enviar ahora» dice «Enviando…»;
  «Descargar todas» dice «Armando…» y cede un cuadro antes de armar el ZIP para que el texto
  alcance a pintarse; al generar el PDF, un aviso «Generando reporte…» y la vista principal con
  aria-busy. Los botones vuelven a su texto e icono al terminar, pase lo que pase. Auditoría UX/UI
  del 24-09-2026, bloque 77, aprobada por Liber.
- **D137. El logotipo suma el SIA entre la Secretaría y Reforestación Urbana.** Orden: Gobierno
  CDMX · Secretaría del Medio Ambiente · SIA · Reforestación Urbana, en encabezado y PDF. Se arma
  con piezas oficiales, sin redibujar: el bloque del SIA sale del logotipo institucional horizontal
  a color (`SIA_LOGO-07.png`) a la escala del de Reforestación Urbana. En teléfono y tableta chica
  (hasta 767 px) va SIA · Reforestación Urbana, porque el completo quedaría ilegible. En el PDF el
  logotipo se fija por su alto (9.3 mm) para que sumar el SIA no encoja el resto. Complementa D90.
  Pedido por Liber, 24-09-2026.
- **D138. Pasos de la jornada y «Siguiente».** El flujo de una jornada se enseña como pasos:
  una tira de cuatro píldoras —Registrar · Cerrar · Revisar · Reporte— en el panel «Jornada
  activa» y en la ficha de la jornada, con el paso actual en acento y los hechos en verde con
  palomita. Registrar está hecho cuando hay árboles y, abierta, se alcanzó la meta; Cerrar, cuando
  está cerrada; Revisar, cerrada y sin puntos marcados; Reporte, con reporte generado. En la ficha,
  la barra fija del pie dice «Siguiente: …» y su botón principal lo hace (Registrar árboles, Cerrar
  jornada, Revisar puntos, Generar reporte); una acción aparece una sola vez: «Cerrar jornada» deja
  el encabezado cuando ya es lo que sigue y el reporte cede su lugar a «Revisar puntos» mientras
  haya marcados. Con todo hecho: «Jornada completa: reporte generado …» y «Volver a generar» en
  ámbar. Terminar un paso anuncia el siguiente: al cerrar (desde el panel o la ficha), al revisar el
  último punto y al generar el PDF («La jornada «X» quedó completa»), con el foco en el botón de lo
  que sigue; «Revisar puntos» lleva al primer pendiente con el foco en «Está bien». Con una fecha
  que no es hoy, el botón dice «Iniciar jornada del 22-SEP». La barra del pie se prefirió a una línea
  bajo la tira (como en la maqueta) porque queda siempre a la mano y evita repetir botones. De paso,
  los mapas quedan aislados (Leaflet dibujaba su atribución encima de la barra fija). Auditoría
  UX/UI del 24-09-2026, bloque 79 (plan: 78), aprobada por Liber.
