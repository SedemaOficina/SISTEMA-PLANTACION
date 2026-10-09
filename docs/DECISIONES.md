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

- [resuelto, D253] **Los originales del SIA siguen en el historial de git del repositorio público.** Desde
  el bloque 102 (D164) ya no se publican ni se suben (`originales/`, fuera de git), pero quien
  revise commits anteriores en GitHub todavía puede descargarlos: capas en GeoJSON, Excel de
  especies, set de iconografía en .ai y metadatos. Opciones: (a) dejarlos así, si no preocupa que
  estén a la vista; (b) reescribir el historial con `git filter-repo` para quitar `assets/fuentes/`
  de todos los commits y subirlo con *force push*: es delicado, cambia los identificadores de todos
  los commits y obliga a volver a clonar cualquier otra copia del repositorio; (c) hacer privado el
  repositorio: con el plan gratuito de GitHub un repositorio privado no publica el sitio. Decide Liber. Anotado a petición suya,
  26-09-2026

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
- ~~Sustituir la capa de colonias~~ No hace falta: las colonias del IECM 2022 son la unidad oficial y definitiva (bloque 117, D180). Nota original: sustituir la capa de colonias (IECM 2022, de prueba) por la definitiva del SIA, con fuente, llave y fecha de corte, y volver a correr `pruebas/generar_capas.py`. Anotado por Liber, 22-09-2026
- [pendiente] **Las ocho claves UGA con prefijo distinto a su alcaldía siguen en la malla definitiva** (TLP-040, TLP-085, IZP-005, IZP-011, COY-054, MIH-001, MIH-002, IZC-021). No afectan al registro (la alcaldía sale de su capa), pero sí al folio: una de esas celdas daría `TLP-040-…` a un árbol de Milpa Alta. Confirmar con el SIA si se quedan así antes de emitir folios (condición 2 y 5 de la emisión)

- ~~Supervisión e informes por periodo~~ Decidido por Liber el 25-09-2026 y hecho en D157–D159. Antes decía: **Supervisión e informes por periodo (propuesta del 25-09-2026, pedido del área de
  plantación).** Pestaña «Supervisión» para coordinación y administración (cifras del periodo, «Qué
  atender», por cabo, por alcaldía con mapa, por especie y programa, calidad del dato) e informes
  semanal, mensual y por alcaldía en PDF, más la tabla en CSV. Límites: en la Etapa 1 cada teléfono
  ve sólo lo suyo (lo de otros cabos llega con el servidor) y el tablero institucional y la cifra
  pública siguen siendo del SIA (D38). Plan: bloque de indicadores (un solo cálculo), bloque de la
  pestaña y bloque de informes. Decisiones que faltan: 1) pestaña propia o dentro de Reportes;
  2) Fotografías dentro de Supervisión y, para administración, Catálogos y Usuarios al menú de la
  cuenta; 3) semana de lunes a domingo y mes calendario; 4) qué cuenta como plantado en el periodo
  (todos los activos, con las jornadas abiertas «en curso», o sólo las cerradas); 5) PDF y CSV o
  sólo PDF; 6) si el cabo ve su avance (una línea en Jornadas); 7) si la coordinación ve eliminados
  y editados por cabo; 8) formato que el área ya use para sus informes.

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
- ~~Comentarios en el parte PDF~~ Decidido en D164: sección «Comentarios por ejemplar» al final del reporte, sólo con los árboles que lo tienen
- [pendiente] **Doble conteo, capa oficial de colonias y mapa base para producción**: sin decidir en el Excel del 22-09-2026; siguen abiertos (ver «Para resolver en el diseño del programa»)
- [pendiente] Proveedor de mapa base para producción (OpenStreetMap no admite uso institucional intensivo)
- ~~Validación del catálogo de especies y su clasificación~~ Resuelto en D84: catálogo real del SIA con `tipo_distribucion` del SNIB
- ~~Formato de las claves del catálogo real de especies~~ Resuelto en D84: `ESP-0000`, consecutivo del SIA
- ~~Cuenta institucional para el repositorio~~ Resuelto: `SedemaOficina/SISTEMA-PLANTACION`
- [pendiente] Aviso de privacidad: el sistema recaba nombre, área y cargo del personal (Norma 1.8)
- ~~Plegar los tres campos del punto~~ Decidido en D87: se dejan visibles
- ~~El campo «Comentarios» del registro en el reporte~~ Resuelto en D164 (ver arriba)

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
- **D139. Confirmar sólo lo que no se deshace, y confirmar en viñetas.** La confirmación queda para
  lo irreversible —eliminar una jornada, una cuenta o un valor del catálogo, restablecer los datos
  de prueba, descartar un árbol sin guardar— y para decisiones cuyas consecuencias conviene ver
  antes: cerrar una jornada con pendientes y guardar en una jornada de otro día. Lo reversible se
  hace de una vez y el aviso dice qué se hizo y ofrece «Deshacer» (D101): eliminar un registro
  («Registro de Aile (folio) eliminado…», también desde la ficha de la jornada), desactivar un valor
  del catálogo y desactivar una cuenta. Antes pedían confirmar *y además* ofrecían deshacer: doble
  protección que gastaba la atención y restaba peso a las confirmaciones que sí importan. El
  diálogo pasa a ser estructurado: título con la acción, una pregunta, lo que implica en viñetas
  («Queda pendiente:», «Se pierde lo capturado:», «Qué pasa:») y una nota final; «No se puede
  deshacer» va en rojo con su icono sólo cuando es cierto. Restablecer dice cuánto se borra
  (registros, jornadas y, si los hay, los que no se han enviado); eliminar una cuenta o un valor
  recuerda la salida reversible (desactivar). El foco empieza en «Cancelar». La forma corta
  `confirmar(texto, boton, icono)` sigue sirviendo. Auditoría UX/UI del 24-09-2026, bloque 80,
  aprobada por Liber.
- **D140. Cada campo dice su error; ayuda, contador y «Hoy» donde hacen falta.** El resumen de
  errores de arriba se queda (con enlaces: sirve al lector de pantalla y en formularios largos),
  pero al llegar al campo, el campo mismo dice qué corregir: el mensaje va debajo, en rojo con
  icono, enlazado con aria-describedby, y se va en cuanto se corrige (al escribir, elegir, tocar
  «Hoy» o tomar la ubicación), sin esperar a volver a enviar. Una sola función para los seis
  formularios que validan (árbol, iniciar y editar jornada, cuentas, catálogo y acceso). Una línea
  de ayuda gris bajo «Árboles que se van a plantar» («Cuántos árboles trae la cuadrilla…») y bajo
  «Ubicación de la jornada» («Dirección, parque o referencia. La alcaldía y la colonia las da
  “Detectar ubicación”»), los dos campos que se prestaban a duda. Los campos con límite (nombre,
  ubicación, comentarios) muestran «420 / 500» al pasar del 80 % y avisan al llegar al tope, que
  antes cortaba en silencio. «Editar jornada» trae «Hoy» junto a la fecha y pone meta y fecha una
  bajo otra, como «Iniciar jornada». Auditoría UX/UI del 24-09-2026, bloque 81, aprobada por Liber.
- **D141. Una anatomía de tarjeta, secciones en la ficha, vacíos con salida y tres tamaños de
  icono.** Las tres tarjetas siguen el orden de Jornadas (D128): qué → cuándo y quién → fila de
  estado → dónde → cuánto → acción. Registros pone el folio y la marca de envío como etiquetas en
  el renglón de la fecha (compacta, D100) y el lugar con su icono; Reportes suma la etiqueta
  «Reporte generado…»/«Sin reporte todavía», el lugar y las cifras en el formato de Jornadas. La
  ficha de la jornada tiene subtítulos —Mapa, Conciliación, Puntos (N)— y, en teléfono, una barra
  fija arriba que salta a cada uno. Los cuatro listados muestran el vacío igual: icono, frase y la
  acción que saca de él (Ver todas, Iniciar una jornada, Ir a Jornadas, Registrar un árbol). Los
  iconos usan tres tamaños con nombre —chico 16, medio 20, grande 24— y cualquier número se lleva
  al escalón más cercano. «Cambiar de jornada» usa el icono de intercambio (el mapa queda para la
  sección) y las etiquetas de resultado llevan el icono de su tono (por revisar, completa,
  falta/sobra, en curso). Para que los botones de dos en dos no se partan en dos renglones desde
  360 px: «Registrar árbol», «Generar PDF», «Regenerar PDF» y «Cambiar» (con su nombre completo
  para el lector de pantalla), con menos aire a los lados. De paso se corrigió un resto de antes de
  D124: al pasar el puntero, el botón principal, la zona de la fotografía y la opción del combo se
  pintaban de guinda; ahora, del acento. Auditoría UX/UI del 24-09-2026, bloque 82, aprobada por
  Liber.
- **D142. Tablas que se leen solas, modo sol completo y atajos de teclado.** El encabezado fijo de
  las tablas en computadora ya existía (la tabla se desplaza dentro de su caja); se verificó y
  queda con prueba. La columna por la que está ordenada una tabla se distingue con fondo de acento
  y flecha en negritas (el lector de pantalla ya oía «Ordenado por…»). La cuenta sobre la tabla
  dice también cuántos están inactivos: «76 especies · 3 inactivas», «3 usuarios · 1 inactivo». El
  modo sol (D106) alcanza lo que llegó después: etiquetas de estado, cifras, pasos, avisos bajo el
  campo y la línea «Siguiente» llevan borde de 2 px y negritas. Atajos para capturar en
  computadora: Ctrl+Enter (⌘+Enter) guarda el árbol o confirma la ficha de revisión; con el
  buscador de especie vacío, 1, 2 y 3 eligen las recientes; Enter solo sigue sin guardar. La pista
  de los atajos sólo aparece con ratón y teclado. Hallazgo del bloque: «Guardar» esperaba al envío
  al servidor antes de volver (se quedaba en «Guardando…» mientras duraba, D136); ahora vuelve en
  cuanto el árbol queda en el teléfono y el envío corre aparte, como ya lo dice la franja. Con
  este bloque se cierra el plan de la auditoría UX/UI del 24-09-2026 (bloques 77 a 83).
- **D143. «Registrar jornada», con coordenadas a mano y «Dirección de la jornada».** A pedido de
  Liber, el panel que abre la jornada se llama «Registrar jornada» (el botón sigue diciendo
  «Iniciar jornada»: es la acción que la abre); la introducción dice que los árboles capturados en
  ella toman su programa y su fecha de plantación y pide anotar cuántos se programaron; se quita la
  línea «Los campos marcados con * son obligatorios» (el asterisco se explica solo). El nombre lleva
  una ayuda con ejemplos (Parque Los Pericos, Intervención en Calzada de Tlalpan). Bajo «Detectar
  ubicación de la jornada» está «Capturar coordenadas a mano», igual que en «Registrar árbol», para
  cuando el registro no se hace en el sitio o no hay señal: valida números y que el punto caiga en
  la Ciudad de México, y deriva alcaldía y colonia como el GPS. Si el GPS falla, ese desplegable se
  abre solo. La jornada guarda `punto_origen` (`gps` o `manual`); con punto a mano no hay precisión.
  «Ubicación de la jornada» pasa a «Dirección de la jornada», también en Editar jornada; el campo
  sigue siendo `ubicacion`. Esquema 2026-09-24. Pedido por Liber, 24-09-2026.
- **D144. Revisión de la ficha de la jornada en computadora.** Sobre una captura de Liber: la
  conciliación decía «hay 1 puntos» y «Quedan 1 punto por revisar»; ahora concuerda en número
  («hay 1 punto», «Queda 1 punto»). El mismo descuido se corrigió en el respaldo («1 registro»), en
  el aviso de una cuenta con registros, en el texto alternativo del croquis y en «Meta de la
  jornada: 1 árbol» del reporte. «Reabrir jornada» y «Editar jornada» salían de distinta altura
  (40 y 52 px) por un margen que «Reabrir» traía de cuando iba solo; se quitó. Y los dos llevaban el
  mismo lápiz ámbar, uno al lado del otro: «Reabrir» pasa al candado abierto, que es lo que hace, y
  el lápiz queda sólo para editar. Revisión pedida por Liber, 24-09-2026.
- **D145. Sistema de ancho en tableta y computadora; sin pista de atajos.** Liber notó que en
  computadora las pantallas se veían desordenadas después de quitar preguntas del formulario. Se
  revisaron las nueve vistas a 390, 820, 1366 y 1440 px. Causas: unas vistas se centraban y otras
  no (el panel de la jornada y «Nuevo árbol» centrados, el formulario pegado a la izquierda,
  Reportes centrado por D109); Jornadas, la ficha y Reportes ocupaban una columna de 44rem con media
  pantalla vacía; en el panel de la jornada activa «Jornada activa» quedaba a la izquierda de los
  datos (la regla de los párrafos le ganaba a la del rótulo) y «Cerrar jornada» se partía en dos
  renglones. Regla nueva, sólo de 601 px en adelante (el teléfono no cambia): 1) todas las vistas
  arrancan en el mismo borde izquierdo y nada se centra por su cuenta; 2) en computadora cada vista
  usa el ancho completo (78rem) y lo reparte: «Registrar jornada» en dos columnas (el lugar a la
  izquierda; programa, meta, fecha, comentarios y el botón a la derecha, como en «Nuevo árbol»), la
  ficha de la jornada con el mapa fijo a la izquierda y conciliación y puntos a la derecha, pasos y
  botones en un renglón y la barra del pie en un renglón; jornadas, registros y reportes en
  tarjetas de dos en dos; la entrada con sus dos tarjetas lado a lado; 3) los textos de ayuda
  conservan su línea corta (62 caracteres) y «Más filtros» mide lo que un formulario. El panel de
  la jornada activa usa rejilla desde 601 px: rótulo arriba, nombre y datos a la izquierda, botones
  a la derecha sin partirse, último guardado a todo lo ancho. «Guardar» ocupa su columna en
  computadora. Reemplaza el centrado de Reportes de D109. En el mapa de la ficha el encuadre deja
  más margen arriba a la izquierda: los botones de acercar tapaban el punto de la orilla (también
  en teléfono). A pedido de Liber se quita de la pantalla la pista «Atajo: Ctrl + Enter guarda…» y
  los números de las especies recientes, y con ellos el atajo 1-2-3 (sin pista era una tecla que
  elegía especie sin avisar); Ctrl+Enter sigue guardando y queda declarado sólo en
  `aria-keyshortcuts`. Pedido por Liber, 24-09-2026.
- **D146. Los pasos de la jornada, como indicador de avance.** Liber notó que «Registrar · Cerrar ·
  Revisar · Reporte» parecían fichas (chips): tenían la misma forma de píldora con borde que los
  filtros «Todas · Hoy · Un día», y el paso actual, relleno en acento, se veía igual que un filtro
  elegido; invitaban a tocarlos y no hacen nada. Se cambian por un indicador de avance como el de
  los formularios por pasos que él envió de referencia: un círculo por paso, unido al anterior por
  un tramo, con el nombre debajo. El actual va relleno en acento con su número y el nombre en
  negritas; el hecho, en verde con palomita, y el tramo que sale de él también en verde; el que
  falta, en blanco con borde gris y su número. El número lo pone la hoja de estilos, así el lector
  de pantalla oye «Registrar (hecho)» y no «1 Registrar». En el panel de la jornada activa los
  círculos miden 22 px y en la ficha 26 px; la tira no pasa de 30rem para que en computadora no se
  estire. El modo sol engruesa círculos y tramos. Se descartó dejar sólo texto («Paso 2 de 4:
  Cerrar»): pierde de un vistazo qué ya se hizo. Pedido por Liber, 24-09-2026.
- **D147. «Hoy» con el año en dos cifras.** En el teléfono el atajo «Hoy» mide un tercio de la
  pantalla y su fecha, «24-SEP-2026», se partía en dos renglones («24-SEP-» y «2026»). A pedido de
  Liber, el atajo dice «24-SEP-26». Sólo cambia ese atajo, en las cuatro vistas que lo tienen
  (Registros, Jornadas, Reportes y Fotografías), que ahora lo pintan desde un solo lugar
  (`SRP.util.pintarChipHoy`); la fecha no se parte y, en la fila de cuatro atajos de Registros y
  Jornadas, el chip cede relleno a los lados (6 px) para que quepa desde 320 px. Las demás fechas conservan el año completo: en la lista, el reporte
  y las fichas de filtro no falta espacio y el año completo evita dudas en documentos que se
  guardan. Pedido por Liber, 24-09-2026.
- **D148. «Regenerar reporte».** En Reportes, una jornada con reporte ofrecía «Volver a generar», que
  no dice qué se vuelve a generar, y en la ficha el mismo botón decía «Regenerar PDF»: dos nombres
  para una acción. A pedido de Liber, en Reportes dice «Regenerar reporte». En la barra de la ficha
  se queda «Regenerar PDF», que cabe junto a «Registrar árbol» desde 360 px (D141). Los dos dejan el
  lápiz, que desde D144 es sólo para editar, y llevan un icono nuevo de flecha en círculo
  (`regenerar`); siguen en ámbar porque rehacen algo ya hecho. Pedido por Liber, 24-09-2026.
- **D149. Lo capturado en el teléfono no se borra solo; ningún fallo se queda mudo.** Primer bloque
  del plan de la auditoría 360 del 24-09-2026 (hallazgos A1, A2, A8 y B3), condición para capturar
  árboles reales. 1) Antes, un `SELLO_DATOS` nuevo, un sello perdido (se guarda en localStorage) o
  una base de otra versión vaciaban los cinco almacenes sin preguntar; en la Etapa 1 el teléfono es
  la única copia. Ahora el sello sólo vuelve a cargar cuentas y catálogos de ejemplo cuando no hay
  nada capturado (árboles, jornadas o bitácora); si lo hay, se conserva todo. Una base a la que le
  falta un almacén, o de una versión posterior, se rehace conservando: se lee entera, se recrea y
  cada renglón vuelve a su almacén, con aviso («se conservó todo lo guardado: N árboles y M
  jornadas»). Un cambio en la forma de los datos viaja como migración numerada que traslada antes
  de retirar (la 2 retiró «cierres» sin trasladarlo). Se atienden `onblocked` y `onversionchange`
  (otra pestaña con otra versión). Con datos reales, una base de versión posterior pide recargar.
  2) Al guardar un árbol o iniciar una jornada se pide `navigator.storage.persist()`, para que el
  navegador no desaloje lo guardado por falta de espacio, y se avisa al 80 % de la cuota. La guía
  «¿Qué hacer sin internet?» dice ahora el estado del teléfono: si lo guardado está protegido, el
  espacio usado, si esta versión abre sin señal y el último respaldo; en iPhone desde Safari, pide
  agregar el SRP a la pantalla de inicio (Safari borra lo de los sitios no abiertos en 7 días) y lo
  sugiere una vez por sesión al guardar el primer árbol. Al cerrar una jornada, la confirmación
  recuerda el respaldo si el último no es de hoy. Cancelar «Compartir» ya no dice «Respaldo
  guardado»; la fecha del último respaldo se guarda en `srp_ultimo_respaldo`. 3) Las 19 acciones
  que escriben en el teléfono se declaran protegidas (`SRP.util.proteger`): si fallan, se dice qué
  no se pudo hacer y, si fue el espacio, qué hacer; el error sigue su camino para que quien llamó
  no continúe como si hubiera salido bien. «Guardar» decía «No se pudo guardar: .» con el espacio
  lleno. El PDF que falla ya no deja «Generando reporte…». Una red de seguridad avisa lo que falle
  fuera de esas acciones, sin silenciar la consola. 4) El service worker ya no muestra un 404 o un
  error del servidor en lugar de la app guardada, y la × de la franja «Guardado» dejó de lanzar un
  error. Quedan para bloques siguientes: guardar las fotos como Blob (ocupan un tercio más como
  texto) y el sello dentro de la base. Aprobado por Liber, 24-09-2026.
- **D150. Respaldo seguro.** Segundo bloque del plan de la auditoría 360 (hallazgos A3, A4, M1 y
  M10), condición para capturar árboles reales. 1) Lo tecleado ya se escapaba, pero los
  identificadores y la foto se pegaban sin escapar dentro de atributos HTML en unos 30 lugares: un
  respaldo alterado ejecutaba código en el teléfono de quien lo restauraba (comprobado en cuatro
  vectores). Ahora todo id que va en un atributo se escapa, los selectores usan `CSS.escape`, y una
  foto sólo se pinta si es una imagen en base64 (`SRP.util.fotoSegura`); la galería omite las que
  no lo son. La página declara una política de seguridad (CSP): sólo corre código del propio
  sitio, sin scripts ni manejadores en línea, con imágenes del sitio, de datos incrustados y del
  mapa base; y `referrer: no-referrer` para que el mapa no sepa desde qué sitio se pide. Si cambia
  el proveedor del mapa, su dominio se cambia también ahí. Los estilos sólo vienen de las hojas
  del sitio: el código los pone con `element.style`, que la política permite, y nunca escribe
  `style="…"` dentro de HTML. Mapa, croquis y PDF se comprobaron con la política puesta; las
  pruebas dejaron de usar `wait_for_function` de Playwright, que se compila con eval dentro de la
  página y la política lo bloquea. 2) Restaurar valida cada renglón contra
  el esquema: `pruebas/generar_diccionario.py` genera ahora también `js/esquema.js` (campos, tipos,
  nulos, dominios y referencias; la auditoría falla si no está regenerado) y `js/validar.js` revisa
  obligatorios, tipos, dominios, referencias, el ámbito del punto, la foto y que no se mezclen
  datos reales con de prueba; los campos no declarados se descartan y los identificadores sólo
  admiten letras, números, guion y guion bajo. Sólo entran árboles y jornadas del alcance de quien
  restaura; nunca cuentas, catálogos ni bitácora (la historia no se importa: cada registro
  restaurado deja su renglón RESTAURADO). Antes de escribir se enseña el resumen —cuántos entran,
  cuántos ya estaban y por qué no entra cada rechazado, nombrando el árbol por su folio y la
  referencia rota en palabras: «la especie no existe en este teléfono»— y se pide confirmación; todo entra en una
  sola transacción. Tope de 60 MB. Se agregó el dominio `estatus_jornada` y la relación
  `jornadas.programa_id` al esquema. 3) El respaldo lleva sólo el alcance de quien respalda: sus
  árboles y jornadas (también los eliminados), la bitácora de esos registros y de las cuentas sólo
  id y nombre; antes llevaba el padrón completo con correos, toda la bitácora y los registros de
  otras cuadrillas. Al guardarlo se avisa que contiene nombres, ubicaciones y fotos. 4) Apagar
  `ES_FICTICIO` ya apaga todo: mientras el proveedor de identidad siga «simulado», el acceso queda
  cerrado (antes cualquier contraseña servía); restaurar y restablecer ni siquiera se conectan. La
  pastilla dice «(simulado)» en pantallas anchas y en su etiqueta accesible, y la guía «servidor
  simulado». El README lleva la lista de verificación para salir a producción. Aprobado por Liber,
  24-09-2026.
- **D151. Integridad de los datos.** Tercer bloque del plan de la auditoría 360 (hallazgos A5, M8,
  M9 y las relaciones de M18), con las decisiones D1 y D2 de Liber. 1) El uso de un valor se cuenta
  en todas las tablas: `SRP.ref.usosDe(tabla)` lee las relaciones del esquema (`SRP.ESQUEMA`) y
  cuenta los renglones que nombran cada id, incluidos los árboles eliminados; la bitácora no cuenta,
  porque es la constancia. Catálogos y Cuentas lo usan para ofrecer «Eliminar» y para negarlo con
  el motivo en palabras («aparece en 2 árboles y 1 jornada»; «coordina a 1 cabo»); la columna Uso
  de Catálogos lo dice igual. Antes sólo se contaban árboles: se eliminaron un programa que usaban
  tres jornadas, un cabo con una jornada abierta y un coordinador con cabos asignados. 2) Una
  jornada sólo se elimina sin ningún árbol, ni eliminado: los eliminados se conservan como
  constancia y siguen apuntando a ella (antes, al deshacer la eliminación, el árbol quedaba en
  Registros y en ninguna jornada). La ficha no ofrece «Eliminar jornada» en ese caso y la función,
  si se llama, lo explica. 3) D2: el programa es de la jornada, como la fecha. Sus árboles lo toman
  siempre: al registrar, cuando cambia el de la jornada y al moverlos a otra; el formulario del
  árbol ya no tiene campo de programa (supera la parte de D130 y D132 que permitía cambiarlo por
  árbol): un árbol de otro programa va en otra jornada. Al editar la jornada, la fecha y el
  programa pasan a todos sus árboles —también a los eliminados— en la misma transacción que la
  jornada (`SRP.almacen.guardarJuntos`), con renglón en el historial de cada uno; el diálogo avisa
  que el programa se propaga, como ya avisaba con la fecha. Mover un árbol le da la fecha y el
  programa de su jornada nueva y quita su marca de revisado de la de origen, todo en una
  transacción, y sólo a jornadas del mismo cabo. Restaurar un árbol toma el renglón actual, no la
  copia de cuando se eliminó, y lo devuelve con los datos de su jornada; sin jornada no se
  restaura. Un árbol que entra por respaldo toma los de su jornada. 4) D1 y M9: la coordinación
  elimina jornadas vacías de su cuadrilla (`eliminarJornadaVacia` en `PERFILES`). Cada acción que
  escribe exige su permiso al empezar (`SRP.permisos.ACCIONES` y `exigir()`): registrar, editar,
  eliminar, restaurar y mover árboles; iniciar, editar, cerrar, reabrir, revisar y eliminar
  jornadas; el cierre del reporte; catálogos; cuentas; el ZIP de fotografías. Sin permiso, avisa
  y se detiene: un coordinador ya no elimina un registro ni un cabo desactiva un programa o la
  cuenta de administración llamando la función. Nadie se desactiva ni se elimina a sí mismo. Es
  la lista que impondrá el servidor en la Fase 2 (S-04). 5) Esquema: relaciones de
  `jornadas.programa_id` y `jornadas.puntos_revisados`; reglas R-J01 y R-J02; R-P03, R-A01, R-U04 y
  R-C03 al día; orígenes «Jornada» y «Dispositivo» declarados. Las pruebas corren una revisión de
  integridad sobre todo lo capturado (referencias, fecha y programa de la jornada, marcas de
  revisado), no sobre la base recién sembrada. 6) Las pruebas destaparon que el envío automático
  (cada minuto, al volver la señal) ponía su aviso encima del de «Deshacer» y se perdía la salida
  de lo recién eliminado: un aviso de fondo ya no tapa uno con acción (`secundario` en
  `SRP.util.anunciar`). En Usuarios, la tarjeta del cabo decía que «coordina» a su coordinador: ahora
  dice «coordinador: …», y la del coordinador, «coordina a N cabos». Las notas de Catálogos y
  Usuarios dicen la regla nueva. Aprobado por Liber, 24-09-2026.
- **D152. Territorio confiable.** Cuarto bloque del plan de la auditoría 360 (A6, A7, M3, M5, M6,
  M7 y B8). 1) El ámbito deja de ser la caja de la ciudad, que aceptaba Nezahualcóyotl, Naucalpan,
  Ecatepec o Huixquilucan (47 % de su superficie queda fuera) y hasta les daba celda UGA: ahora es
  la unión de las alcaldías con 100 m de margen (`MAPA.MARGEN_AMBITO_M`). Un punto dentro del
  margen toma la alcaldía más cercana y se avisa, en el árbol y en la jornada; más lejos se
  rechaza. La coordenada de la jornada por GPS también se revisa y se redondea a seis decimales.
  2) La aplicación no abre sin las tres capas y la biblioteca del cruce (`capasCompletas()`); el
  aviso ya no sugiere borrar los datos del sitio, donde viven los árboles, sino avisar a la
  coordinación. Sin alcaldía o sin las tres capas en `capa_version` no se emite folio: `EXT-000`
  queda sólo para un punto fuera de la malla dentro del margen. 3) Créditos del mapa tal como los
  declara cada servicio de Esri (Vantor en lugar de Maxar; HERE, Garmin y OpenStreetMap en vías y
  lugares), con «Powered by Esri», en todos los mapas —también la ficha de revisión y el detalle,
  que no tenían— y en el pie del croquis, partido en renglones. La licencia y el token de Esri
  siguen pendientes (D5). 4) `generar_capas.py` comprueba que cada geometría siga válida después
  de redondear y, si no, la ajusta a la misma rejilla con `shapely.set_precision` (nueve colonias
  inválidas); la auditoría lo revisa. «Sin colonia en la capa» sustituye a «Sin colonia (fuera de
  zona urbana)», que no era cierto en 31 km² urbanos, y «Sin alcaldía (territorio pendiente)» al
  rótulo del hueco. El detalle muestra la celda UGA y las capas con que se derivó el registro; el
  PDF, las capas. Si al editar cambia el territorio, la bitácora lo registra. 5) El GPS se escucha
  hasta 8 s y se queda con la mejor lectura; se detiene al llegar a precisión buena, al revisar o
  guardar, o si la persona pone el punto a mano; una falla pasajera no lo detiene. Tocar el mapa
  por debajo de zoom 17 primero acerca y luego coloca. El aviso de posible duplicado pasa de 3 a
  5 m. Las coordenadas se leen con cinco decimales (se guardan seis). Nuevo campo
  `plantaciones.uga_borde_m`, la distancia al borde de la celda: si es menor que la precisión del
  GPS, la ficha y el detalle dicen «celda incierta». 6) El folio se documenta con prefijo de celda,
  no de alcaldía, y el reporte marca «(simulado)» en cada renglón. 7) El aviso de imagen caída va
  en su propio renglón y ya no tapa la insignia de precisión. Pendiente para las capas
  definitivas: colonias recortadas a las alcaldías (en el 1.25 % del territorio la colonia es de
  otra demarcación). Aprobado por Liber, 24-09-2026.
- **D153. Orden del código y los textos, primera parte.** Quinto bloque del plan de la auditoría
  360 (M11, M12, M14, M16, M20, B1, B2 y B5). La segunda parte —hoja de estilos conforme a su norma
  (M13) y código repetido (M15)— queda como bloque aparte, con capturas de antes y después.
  1) El espejo de campos ya no es condición para arrancar: la llamada de `app.js` va protegida, la
  revisión de arranque no lo exige y sus instrucciones de retiro dicen lo cierto (dos bloques en
  el HTML, el archivo, sus estilos y nueve llamadas, todas protegidas). Las pruebas abren la app
  sin él, registran un árbol, ven su detalle y llegan a la vista previa del reporte. 2) La × de la
  franja «Guardado» tiene clase propia (`franja-cerrar`), con el mismo aspecto que la de los
  diálogos. 3) Un nombre por acción: «Registrar árbol» (antes también «Registrar un árbol» y
  «Registrar faltante»), «Ver detalle» (antes también «Ver registro»), «Quitar filtros» (antes
  también «Reiniciar filtros») y «Datos de cierre de la jornada»; el PDF habla de «esta jornada»,
  no de «esta fecha». Se conservan «Ver» en las filas de puntos y la franja, y «Generar PDF» y
  «Regenerar PDF» en la barra de la jornada, por espacio (D141, D148). La auditoría revisa que las
  etiquetas retiradas no vuelvan. 4) En el código la jornada guardada deja de llamarse «cierre»
  (`guardada`, `jornadaGuardada()`, `guardarEnJornada()`); el aviso dice «dirección» y no
  «ubicación»; los iconos se piden por nombre (chico, medio, grande). 5) Accesibilidad: Nuevo
  registro tiene su título de primer nivel, oculto a la vista y legible por el lector de pantalla;
  la banda de datos ficticios va dentro del encabezado; el crédito del mapa pasa a texto oscuro
  subrayado sobre fondo casi opaco (el azul de Leaflet daba 2.55:1). 6) Base del teléfono en la
  versión 3: índice de árboles por jornada, que ahora usan la jornada activa, la ficha y la edición
  de la jornada, y fuera los cinco índices que nada consultaba; subir de la 2 a la 3 conserva todo.
  7) Código sin uso fuera: `jornadasDe()`, el icono «ayuda», el botón «Hoy» de la fecha oculta del
  árbol. 8) README con el flujo vigente (Registrar jornada → Nuevo árbol → Jornadas → Reportes y
  Fotografías), el reporte por jornada y el mapa al día; comentarios corregidos (la franja
  «Guardado» en lugar del diálogo, la meta al iniciar, el respaldo del alcance, la fecha y el
  programa de la jornada). Aprobado por Liber, 25-09-2026.
- **D154. La tuerca, subir al inicio y un árbol capturado por error dentro de la jornada.** Pedido
  por Liber desde el iPhone, con capturas de la lista de puntos. 1) La tuerca salía ovalada en las
  filas de puntos (48 × 36 px): las filas bajan el alto mínimo de sus botones y la tuerca sólo fijaba
  el ancho. Ahora fija ancho y alto (48 px, círculo exacto en cualquier renglón) y en el teléfono va a
  la orilla derecha de la fila, a la misma altura en todos los puntos. 2) Botón flotante «Subir al
  inicio» con la flecha: aparece al bajar más de tres cuartos de pantalla, en la esquina inferior
  derecha, por encima de la navegación del teléfono y de la barra fija de la sección (Guardar en
  Nuevo registro, «Siguiente» en la jornada), y sigue a la barra cuando la página cambia de alto.
  Al subir, el foco va al título de la sección. 3) Cada página empieza arriba: al cambiar de sección,
  al abrir la ficha de una jornada y al volver a la lista. En iPhone el salto se perdía si la página
  seguía deslizándose por inercia al tocar la pestaña; ahora se corta la inercia un cuadro y el salto
  se repite ya pintada la sección. Tocar la pestaña de la sección en que se está sube a su inicio,
  como en las apps del teléfono. 4) Un árbol capturado por error se elimina desde la jornada: la
  tuerca del punto ofrece Editar, Mover a otra jornada y Eliminar, las mismas opciones que la tarjeta
  en Registros; si la fila ya trae «Eliminar» (duplicado), la tuerca no lo repite. Eliminar sigue
  siendo marcar con constancia, con «Deshacer» (D139). 5) La coordinación elimina los árboles que
  capturó ella —para corregir su propio error— y sigue sin eliminar los de sus cabos (D87 queda así
  acotado); la regla vive en `puedeEliminar()` y en las acciones `registro.eliminar` y
  `registro.restaurar`. El punto 5 lo amplió Liber en D155: la coordinación elimina cualquier árbol de su cuadrilla. Aprobado 25-09-2026.
- **D155. La coordinación elimina los árboles de su cuadrilla.** Decidido por Liber el 25-09-2026:
  «la coordinación puede eliminar cualquier árbol». Sustituye el «no elimina» de D87 y el punto 5
  de D154 (sólo lo que capturó ella). El perfil Coordinador tiene `eliminar: true` con su alcance de
  siempre: los árboles suyos y los de los cabos que tiene asignados; no los de otra cuadrilla, aunque
  se llame a la función. Eliminar sigue siendo marcar con constancia y con «Deshacer» (D139).
- **D156. Hoja de estilos conforme a su norma y código repetido (bloque 94b).** Sexto bloque del plan
  de la auditoría 360 (M13 y M15), con la huella visual de 22 estados en siete anchos (360, 390, 440,
  640, 720, 768 y 1280 px) antes y después. 1) Cada regla en su sección: las 104 que estaban después
  de las consultas pasaron a componentes o estados; el modo sol, junto, en estados. 2) Tres cortes de
  ancho documentados —480, 700 y 1024 px— y una sola consulta por corte: los de 600 y 767 se unieron
  al de 700 y el de 601 al de 701. Cambia sólo entre 601 y 767 px (tabletas chicas y teléfonos
  acostados): ahí se usa el diseño de teléfono (puntos apilados, franja en columna) y la barra de
  saltos de la ficha se deja para 700 px o menos. 3) Una clase por caso en lugar de #id (34
  selectores); Nuevo registro, Jornadas y Reportes son vistas anchas. 4) Fuera 29 selectores sin
  elemento (el diálogo «Registro guardado», la conciliación con campo, `.enlace`…) y el corte de
  400 px, que sólo los usaba. 5) Un selector, una regla: 11 duplicados unidos. 6) Sombras y velos
  como variables de :root; el código ya no escribe colores: el mapa, el croquis y el PDF los leen de
  la hoja (`SRP.util.color`, `colorBase`, `rgb`), y el PDF y el croquis no cambian con el modo sol.
  El círculo de precisión del GPS usa los mismos verde, ámbar y rojo que su insignia (antes eran
  otros). 7) Un solo resumen de errores para los seis formularios (título, texto escapado, enlaces y
  el foco en la caja), un solo botón «ocupado», una sola manera de armar listas de opciones y de
  personas, una sola barra de atajos de fecha para Registros, Jornadas, Reportes y Fotografías, y un
  solo modelo del reporte que pintan la vista previa y el PDF (la vista previa trae ahora las
  advertencias del pie). 8) El lugar se dice igual en todas partes: «Alcaldía Coyoacán · Col. Del
  Carmen». La auditoría revisa desde ahora la norma de la hoja y que el código no escriba colores.
  Propuesto por Claude, aprobado por Liber («continúa con 94b»), 25-09-2026.
- **D157. Indicadores de supervisión con un solo cálculo (bloque 96).** Primer bloque de lo que pidió
  el área de plantación (informes por alcaldía, semanales y mensuales, y un panel de supervisión).
  `js/indicadores.js` calcula, a partir de las jornadas y los árboles del alcance de quien consulta,
  todo lo que verán la pestaña Supervisión («Mi avance» del cabo) y los informes en PDF y CSV, para
  que lo que se ve y lo que se imprime no puedan diferir. Reglas decididas por Liber el 25-09-2026:
  1) sólo cuentan las jornadas cerradas; las abiertas del periodo se dicen aparte, «en curso», y las
  de días anteriores van a «Qué atender»; 2) la semana va de lunes a domingo, el mes y el año son de
  calendario, y también hay rango y «todo»; 3) cada perfil ve su alcance; 4) la coordinación ve los
  árboles eliminados y editados por cabo, como trazabilidad que no cambia la cifra; 5) el cabo
  consulta su propio avance por alcaldía, semana, mes y año. Indicadores: árboles plantados, jornadas
  cerradas y en curso, avance contra la meta, árboles por jornada, cabos que trabajaron de los
  asignados, especies y porcentaje de nativas (Nativa o Endémica en el catálogo), alcaldías y
  colonias, calidad del dato (foto, GPS, mapa, a mano, precisión mediana), qué atender (abiertas de
  días anteriores, puntos sin revisar, sin reporte), trazabilidad y la serie para la gráfica (por
  día en una semana, por semana en un mes, por mes en un año). Las definiciones quedan en
  `esquema.json` («indicadores») y en el diccionario, para que el SIA calcule igual en la Fase 2.
  En la Etapa 1 cada teléfono ve lo que tiene guardado; con el servidor se verá lo de toda la
  cuadrilla. Aprobado por Liber, 25-09-2026.
- **D158. Pestaña Supervisión y «Mi avance» (bloque 97).** Lo que pidió el área de plantación y
  decidió Liber el 25-09-2026: 1) pestaña propia, «Supervisión», primera en la barra y primera
  pantalla al entrar para la coordinación y la administración; para el cabo se llama «Mi avance»
  y va al final de su barra (él sigue entrando a Nuevo registro); 2) Fotografías pasa a estar dentro
  de Supervisión (con «Supervisión» para volver) y Catálogos y Usuarios salen de la barra al menú de
  la cuenta, para que la barra del teléfono no pase de cinco secciones; 3) periodo: Semana (de lunes
  a domingo), Mes, Año, Rango y Todo, con anterior y siguiente, sin avanzar al futuro; filtros de
  alcaldía, programa y, para quien supervisa, cabo. Qué se ve: seis cifras (árboles plantados,
  avance contra la meta, cabos que trabajaron o árboles por jornada, especies y porcentaje de
  nativas, alcaldías y colonias, jornadas en curso), «Qué atender» con las jornadas a las que lleva,
  la gráfica de avance (barras sin librería, con su tabla para el lector de pantalla), la tabla por
  cabo con sus pendientes, eliminados y editados (tocar un cabo abre sus jornadas), el mapa de las 16
  alcaldías coloreado según los árboles (sin mosaicos: se ve igual sin señal) con su tabla —o las
  colonias, con una alcaldía elegida—, especies, programas, calidad del dato y las jornadas cerradas
  del periodo. En computadora las cifras van en un renglón y el resto en dos columnas. Todo sale de
  `SRP.indicadores` (D157). Aprobado por Liber, 25-09-2026.
- **D159. Informes por periodo en PDF y CSV (bloque 98).** Lo que pidió el área de plantación:
  informes por alcaldía, semanales y mensuales; Liber decidió PDF y CSV, y que el área no entrega
  un formato propio (el diseño es nuestro). El informe es lo que se ve en Supervisión o Mi avance, en
  papel: su título lo dicen el periodo y la alcaldía («Informe semanal / mensual / anual de
  plantación», «· Alcaldía X»); lleva el membrete del reporte de la jornada, el periodo, de quién es
  (el cabo, la cuadrilla de la coordinación o toda la Ciudad) y los filtros; luego el resumen de
  indicadores, qué atender, el avance, por cabo (no en el del cabo), por alcaldía o —con una
  alcaldía— por colonia, todas las especies con su total, programas, jornadas cerradas del periodo y
  trazabilidad, con las notas de qué cuenta y qué no, y el aviso de datos de prueba. El CSV trae un
  renglón por árbol contado (folio, fecha, jornada, cabo, programa, especie, distribución, alcaldía,
  colonia, celda, coordenadas, origen y precisión, fotografía y reporte), con BOM para que Excel lea
  los acentos. Los nombres de archivo dicen qué son («Informe_mensual_2026-09_Cuauhtemoc.pdf»,
  «Arboles_semanal_…csv»). Sin jornadas cerradas en el periodo no se ofrece informe; sin árboles, no
  se ofrece tabla. En Reportes, un apartado dice dónde están los informes y lleva ahí. El reporte de
  cada jornada sigue igual: ése es el documento de campo; éste, el de seguimiento. Aprobado por
  Liber, 25-09-2026.
- **D160. Datos de demostración (bloque 99).** Liber pidió datos de varios meses, cabos y años para
  probar cómo funciona todo, con un botón para borrarlos y otro para recuperarlos, al final de la
  página. Sólo con datos de prueba (`ES_FICTICIO`): al pie, bajo «Restablecer» y «Restaurar
  respaldo», el apartado «Datos de demostración» con «Cargar datos de demostración» y «Quitar datos
  de demostración»; después de quitarlos, el primero dice «Recuperar datos de demostración». Qué se
  carga (`js/demostracion.js`): una segunda coordinación con tres cabos, tres cabos más para la
  coordinación de prueba y jornadas también para la cabo de prueba, de enero de 2024 a hoy (unas 550
  jornadas y 7,000 árboles), más en lluvias que en secas y un poco más cada año, cada una en una
  colonia real de las alcaldías de su cabo, con meta, cierre y casi siempre reporte; el territorio de
  cada árbol se deriva con las capas; lo anterior a hoy ya tiene folio y está enviado. Trae lo que la
  supervisión debe encontrar: dos jornadas abiertas de días anteriores, dos de hoy, puntos sin
  revisar, jornadas sin reporte, eliminados, editados, precisión baja y algunas fotografías. El
  generador usa una semilla fija: recuperar da las mismas cuentas, jornadas y árboles; los folios no
  se repiten porque la secuencia simulada nunca retrocede. Todo lleva identificador «demo-» (las
  cuentas, «u-demo-»), así que se quita sin agregar un campo al esquema y sin tocar lo capturado; si
  alguien registró algo propio dentro de lo de demostración (un árbol en una jornada de demostración,
  o entró con una cuenta de demostración), esa jornada, esa cuenta y su coordinación se conservan. Si
  quien está dentro usa una cuenta que se quitó, vuelve al acceso. Con volumen real salieron tres
  cosas que se corrigen en el mismo bloque: 1) en Supervisión, las jornadas del periodo y las
  colonias de una alcaldía se cortan en las primeras 15 con un botón para ver las demás (un año
  medía 18,000 px en computadora); 2) quien entra con otra cuenta empieza en la semana en curso y sin
  filtros, en vez de heredar el periodo de la cuenta anterior; 3) el envío simulado se detiene si la
  sesión se cierra a medio envío (antes fallaba al anotar la bitácora sin usuario). Se retira al
  cerrar la Etapa 1, con el resto de las herramientas de prueba. Pedido por Liber, 25-09-2026.
- **D161. La versión publicada llega con una sola recarga (bloque 99b).** Después de publicar el
  bloque 99, Liber no veía la versión nueva. GitHub Pages manda la página con
  «Cache-Control: max-age=600», y el service worker, que pide la página primero a la red (D71),
  la pedía con el modo normal del navegador: éste respondía con su copia de hasta 10 minutos, aunque
  se recargara. Ahora el service worker la pide con `cache: 'no-cache'`: el navegador pregunta al
  servidor si cambió (si no, la respuesta es corta, 304) y la versión nueva aparece al abrir o
  recargar una vez. Sin señal todo sigue igual: se abre la copia guardada. El cambio vive en el
  service worker, así que rige desde la versión siguiente a la que lo instala; el paso a la 0.6.81
  todavía puede pedir dos recargas. Una prueba lo reproduce con un servidor que manda la misma
  cabecera. Con el mismo bloque, el aviso de los datos de demostración dice el nombre real del
  botón del menú, «Cambiar usuario (pruebas)» (lo encontró la guía de prueba). Aprobado por Liber
  («sí, guarda»), 26-09-2026.
- **D162. Catálogo de vehículos en el reporte (bloque 100).** Liber entregó la lista de vehículos de
  las cuadrillas (placa, modelo y tipo, 16) y pidió que el reporte la use: se elige la placa y el
  modelo y el tipo se ponen solos, con botones de los vehículos que más usa esa persona, y que el
  catálogo esté en Catálogos. 1) Catálogo `vehiculo` en la tabla de catálogos: la placa es el nombre
  (en mayúsculas), `modelo` y `tipo_vehiculo` son obligatorios, la clave es la placa sin espacios y
  no se muestra (así «PRU006» y «PRU 006» son la misma). Lo lleva la Administración en Catálogos ›
  Vehículos, con alta, edición, desactivar y el uso por jornadas; con uso no se elimina (D151). Los 16
  de arranque (`assets/catalogo-vehiculos.js`) son reales, no ficticios, y se escribieron como el
  resto de los catálogos: «Dodge», «Estacas», «Grúa», «Pick up», y las placas con su espacio (las placas reales se sustituyeron por ficticias en el bloque 118, D181). 2) En
  los datos de cierre, «Vehículo» es una lista de placas agrupada por tipo; al elegir una se ven su
  modelo y su tipo. Arriba, a un toque, los tres que más ha usado el encargado de la jornada (el
  cabo, o el que elija la coordinación), el más usado primero. «Otro vehículo» abre modelo, placa y
  tipo para uno prestado o rentado. 3) La jornada guarda el vehículo (`vehiculo_id`) y una copia de
  placa, modelo y tipo (`vehiculo_tipo` es nuevo): el reporte es un documento y no cambia si después
  se corrige el catálogo. Una jornada de antes con la placa escrita a mano se reconoce si la placa
  está en el catálogo; si no, abre como «Otro vehículo» con lo que tenía. 4) El reporte dice
  «Vehículo: Dodge · Estacas, placa PRU 005». 5) Un teléfono que ya tiene capturas recibe el
  catálogo nuevo sin perder nada: con el sello nuevo se agregan los catálogos que falten, por id,
  una sola vez. Los datos de demostración usan estos vehículos, uno o dos por cabo. Nota: el
  repositorio es público, así que las placas quedan a la vista en GitHub. Pedido por Liber,
  26-09-2026.
- **D163. El reporte de la jornada por secciones (bloque 101).** Liber pidió rehacer el PDF del
  reporte con este orden y buen diseño: el nombre del cabo; 1) datos de identificación de la
  jornada (nombre, alcaldía, colonia, dirección, programa, árboles meta, el día completo
  —«Jueves 25 de septiembre de 2026»—, comentarios, hora de finalización y observaciones); 2)
  personal (participante, de apoyo y chófer); 3) datos del vehículo (tipo, modelo y placas); 4)
  croquis donde se vean todos los puntos, con el acercamiento automático; 5) ejemplares plantados
  (número, especie, nombre científico, coordenada y precisión; sin folio: «en el reporte no es
  necesario poner los folios»); 6) totales por especie con tipo de distribución, ejemplares y
  porcentaje del total; y gráficas de lo relevante; las etiquetas en negritas («**Chófer:** …»).
  Cómo quedó: título, franja con el nombre del cabo y cinco cifras (árboles plantados, meta,
  porcentaje de la meta, especies y porcentaje de nativas); cada sección con franja guinda numerada;
  los datos en dos columnas con la etiqueta en negritas, y los de varios renglones (comentarios,
  observaciones, listas de personal) a lo ancho; 7) gráficas: ejemplares por especie (las diez con
  más y el resto junto), distribución (nativa, endémica, exótica, exótica-invasora) y avance contra
  la meta, dibujadas con trazos, sin imágenes. Los porcentajes son enteros y suman 100 (resto
  mayor). El programa ya no va en su propio apartado (es uno por jornada, D151) y las notas de folios
  provisionales o simulados salen, porque ya no hay folio en el papel; quedan al pie la calidad del
  GPS, las capas, la advertencia de la cifra y quién lo generó. Croquis: el acercamiento ya no es
  sólo de niveles enteros, sino el exacto para que los puntos llenen el lienzo (hasta el 20,
  ampliando el satélite); si a ese nivel faltan mosaicos se prueba uno o dos más lejos; el círculo se
  achica con muchos puntos y los números que se enciman se apartan con una línea a su punto real.
  Si el croquis no cabe entero al final de una página pero sí a dos tercios, se reduce en vez de
  saltar de página. La vista previa pinta lo mismo, en el mismo orden (M15). Pedido por Liber,
  26-09-2026.
- **D164. Comentarios por ejemplar, originales fuera del sitio y jsPDF al día (bloque 102).**
  Decididos por Liber el 26-09-2026 de la lista de pendientes (decisiones 1, 2 y 8). 1) El campo
  «Comentarios» de cada árbol entra al reporte en una sección al final, «Comentarios por
  ejemplar», sólo con los árboles que lo tienen: número (el del croquis y la tabla), especie y
  texto, sin espacios de sobra ni renglones vacíos. Debajo de la tabla de ejemplares se avisa
  cuántos tienen comentario y dónde están; sin ninguno, la sección no sale ni se anuncia. Cierra el
  pendiente «Comentarios en el parte PDF». 2) Los originales (capas en GeoJSON, Excel de especies,
  set de iconografía en .ai y metadatos, 9.7 MB) salen de `assets/fuentes/`, que GitHub Pages
  publicaba, a `originales/` en la raíz, fuera de git (`.gitignore`). `generar_capas.py`,
  `generar_especies.py` y `extraer_iconos.py` los leen de ahí y, si faltan, se detienen y lo dicen;
  con ellos reproducen idénticos los archivos de la aplicación. La auditoría comprueba que no
  estén dentro del sitio y que `.gitignore` los deje fuera; en una copia sin la carpeta omite la
  comparación de las capas contra los originales y lo avisa. Siguen en el historial de git del
  repositorio público: sacarlos también de ahí exige reescribir el historial, y eso lo decide Liber.
  3) jsPDF 2.5.1 → 4.2.1 y AutoTable 3.8.2 → 5.0.8, sin cambios en el código del reporte ni de los
  informes. De M168 quedan las capas con su propia versión y aligeradas y la licencia del mapa base.
- **D165. Ayudas más cortas al iniciar la jornada (bloque 103).** Pedido de Liber el 26-09-2026.
  1) La ayuda de «Dirección de la jornada» dice sólo «Calle y número, entre calles o tramo.»: la
  plantación suele ir a lo largo de una calle o un tramo, no en un número; se quita la explicación
  de que la alcaldía y la colonia salen del punto de arriba. 2) «Árboles que se van a plantar» ya no
  lleva línea de ayuda, ni al iniciar ni en «Editar jornada»: la etiqueta basta. El campo deja de
  anunciar la ayuda (aria-describedby) y sólo anuncia su error cuando lo hay. Ajusta D140 en esos
  dos campos; la comparación de la meta con los árboles registrados en la revisión no cambia.
- **D166. Colores por significado en la aplicación; lo institucional, sólo en el PDF (bloque 104).**
  Pedido de Liber el 26-09-2026: la aplicación usaba nueve colores con significado y la paleta
  institucional marcaba estados (punto normal, por revisar, filtro activo, foco), con choques: «Revisar»
  en tres tonos, guinda y rojo casi iguales en el mapa, el dorado como «revisar» y como «exótica». Liber
  aceptó la propuesta (artefacto «Colores del SRP») con una condición: los puntos del mapa, siempre
  círculos. 1) Dos mundos: guinda, dorado y gris institucionales salen de la pantalla y quedan en
  variables `--pdf-*` para el reporte, los informes, su vista previa y el croquis; la identidad en
  pantalla la da el logotipo. 2) En pantalla, un color por pregunta: azul `#1B5FAA` (tocar, elegir,
  avanzar; también el único color de foco y la jornada abierta), verde (quedó bien), ámbar (hay que
  mirarlo; relleno `#F4A62A` con número oscuro), rojo (está mal) y gris `#5A6269` (sin carga: texto
  secundario, jornada cerrada, datos de prueba con rayas). Títulos en tinta `#1E2327`; neutros con
  tinte frío para no competir con la vegetación del mapa. 3) Puntos de la jornada (mapa, lista y
  miniatura), círculos con semáforo: sin aviso blanco con borde oscuro, por revisar ámbar, lejos del
  resto rojo con un anillo más (lo distingue sin ver el color), revisado verde; el elegido lleva anillo
  azul. El punto revisado ya no vuelve a verse normal y la miniatura de la tarjeta lo refleja.
  4) Corregir y editar pasan a botón neutro con lápiz: el ámbar queda sólo para «atención».
  5) Tablas con encabezado neutro; en Supervisión, los árboles plantados en verde (barras y mapa de
  alcaldías). 6) PDF: la gráfica de origen con colores lógicos (nativa verde, endémica verde oscuro,
  exótica dorado, invasora rojo, sin dato gris claro), el porcentaje sobre dorado y gris claro en
  texto oscuro (el blanco sobre dorado daba 3.0:1) y «Documento de prueba» en gris. Todo color de
  significado pasa 4.5:1 con su fondo. La barra del navegador pasa a blanco.
- **D167. «Correcto», tuerca sin círculo y «Hoy» sin año ni mes (bloque 105).** Observaciones de
  Liber el 26-09-2026. 1) «Sin aviso» no decía nada: en la leyenda del mapa de la jornada el punto
  blanco pasa a «Correcto» (pasó las revisiones automáticas: precisión del GPS, distancia al resto y
  posible duplicado); «Revisado», en verde, es el que tuvo un aviso y alguien confirmó con «Está
  bien». 2) La tuerca de acciones es sólo su icono, sin círculo ni contorno; conserva sus 48 px de
  toque, se aclara al pasar el cursor y lleva fondo azul claro con el menú abierto. 3) Hoy es hoy:
  en Registros y Jornadas, año y mes sólo acompañan a «Todos»/«Todas»; con «Hoy», «Un día» o «Un
  periodo» no se ofrecen, y si no queda nada más en «Más filtros» (el cabo sólo lo ven coordinación
  y administración), el acordeón no se muestra. Ajusta D100, D129 y D166.
- **D168. «Previstos», Supervisión con porcentajes y de diez en diez, y la barra contra el total
  (bloque 106).** Observaciones de Liber el 26-09-2026. 1) «Meta» se confundía con la meta del
  programa: lo que se escribe al iniciar la jornada son los árboles **previstos**, y así se dice en
  toda la aplicación, el reporte y el informe («previstos», «de lo previsto», «Árboles previstos»,
  «Cuadra: 4 previstos y 4 registrados», «Se plantó lo previsto», «Sin cantidad prevista»). El campo
  sigue siendo `meta_arboles`. 2) Supervisión: la gráfica de avance dice su unidad («Árboles plantados
  por día, semana, mes o año»; también en el informe); las tablas por alcaldía o colonia, especie y
  programa llevan el % del total de lo elegido (también en el informe); «Por especie» junta tabla y
  gráfica (una barra verde bajo cada nombre, medida contra la especie más plantada y sin carril de
  fondo); las listas largas (jornadas, colonias, especies) muestran 10 y «Mostrar 10 más» suma de diez
  en diez hasta el final, donde el mismo botón vuelve a las primeras 10 (antes 15 y todo de golpe).
  3) Reporte, «Ejemplares por especie»: la barra completa es el total de la jornada y se dice debajo;
  medida contra la especie más plantada, 3 árboles de 19 se veían como barra llena. Cantidades iguales
  llevan el mismo porcentaje (antes 3 de 19 salía 16 % en una fila y 15 % en «Otras»): el resto mayor
  se reparte por grupos de iguales y, si la suma no llega a 100, la nota lo advierte. «Otras N
  especies» calcula su porcentaje de su propia cantidad y sólo aparece con más de 11 especies.
- **D169. El reporte: franja del cabo con los datos de la jornada, comentarios en la tabla y la
  precisión en color (bloque 107).** Pedido de Liber el 26-09-2026. 1) La sección «1. Datos de
  identificación de la jornada» desaparece: sus datos (nombre, día, alcaldía, colonia, dirección,
  programa, hora de finalización, comentarios y observaciones) van en la misma franja del «Nombre del
  cabo», con el mismo estilo; los árboles previstos ya están en las cifras. 2) «Comentarios por
  ejemplar» (D164) deja de ser sección: el comentario va en su propia columna de la tabla de
  ejemplares, sólo si algún árbol tiene. 3) Sin columna «Nombre científico»: va entre paréntesis
  después del nombre común, en ejemplares y en totales por especie. 4) La precisión va en color con
  la escala de la aplicación: verde ±10 m o menos, ámbar hasta ±30 m, rojo más de ±30 m; «En el mapa»
  y «A mano», sin color; una nota lo explica. Quedan seis secciones: personal, vehículo, croquis,
  ejemplares, totales por especie y gráficas. Ajusta D163 y D164.
- **D170. Longitud con «−» fijo y pegar el par completo (bloque 108).** Hallazgo de la prueba del
  27-09-2026: en «Capturar coordenadas a mano» el teclado numérico del iPhone (y de algunos Android)
  no trae el signo menos, y como en la Ciudad de México toda longitud es negativa, el valor escrito
  (99.1332) se rechazaba por quedar fuera de la ciudad. 1) El campo «Longitud» muestra un «−» fijo
  pegado a su izquierda, fuera de lo que se escribe, y pide sólo el número (ejemplo 99.133200); para el
  lector de pantalla, la etiqueta dice que es negativa. 2) La longitud se guarda negativa con o sin
  signo, con «−» tipográfico y con coma decimal (`SRP.util.coordenadas`); el campo muestra el número
  sin signo cuando la aplicación lo llena. Un «−» ya escrito dentro del campo se descartó: se borra sin
  querer o se duplica al pegar. 3) Pegar en cualquiera de los dos campos el par que da Google Maps
  («19.4326, -99.1332», también con punto y coma, espacio, coma decimal o al revés) llena los dos; si se
  escribió el par en un solo campo, se reparte al salir de él o al tocar «Colocar punto». Un solo
  número nunca se toma por par. Aplica en «Registrar jornada» y en «Nuevo árbol».
- **D171. Confirmación «Registro exitoso» que se cierra sola (bloque 109).** Hallazgo de la prueba del
  27-09-2026: al guardar un árbol, la franja «Guardado» quedaba arriba y en un teléfono chico fuera de la
  pantalla; el cabo no sabía si se había guardado y podía repetir el registro. El tester pedía una
  ventana de confirmación; Liber aceptó la variante que no suma toques (D130 los quitó): 1) al guardar
  aparece al centro «Registro exitoso» con la palomita y la especie, se cierra sola a los 1.5 s, no
  atrapa los toques y el teléfono vibra un instante (si lo permite); el lector de pantalla oye
  «Registro exitoso: especie. Listo para el siguiente árbol.». 2) La página lleva la franja «Guardado»
  a la vista, arriba, con el formulario nuevo debajo y el foco en «Registrar ubicación», después de
  repintar la franja de la jornada y cancelando el desplazamiento suave que la lista de especies pudo
  dejar en curso. La franja conserva «Corregir» y «Ver».
  3) Bajo las coordenadas a mano, una línea de ayuda dice que se puede pegar el par como lo copia
  Google Maps (con ejemplo) y cómo copiarlo (pedido de Liber; complementa D170).
- **D172. Del mapa a la lista, «Generar reporte» único y la × del aviso en su lugar (bloque 110).**
  Observaciones de Liber el 27-09-2026. 1) En el detalle de la jornada, tocar un punto del mapa movía la
  lista pero el árbol quedaba en la orilla, tapado por la barra fija de «Siguiente»: ahora el árbol
  elegido queda al centro del espacio libre entre la barra de saltos de arriba y las barras fijas de
  abajo (`centrarEnLista`). 2) El botón del reporte tiene un solo estado, «Generar reporte», acción
  principal, en Reportes y en el detalle de la jornada (antes «Regenerar reporte» / «Regenerar PDF» en
  ámbar con flecha en círculo, D148). Que ya se generó lo dicen la insignia «Reporte generado…» y el
  paso «Reporte» con su palomita. 3) El aviso flotante es una rejilla (icono · texto · acción · ×): la
  × queda siempre arriba a la derecha; en teléfono chico «Deshacer» baja bajo el texto, y en
  computadora va en el mismo renglón. Antes, con un texto largo, la × caía sola abajo a la izquierda.
- **D173. Guía del mapa según el momento (bloque 111).** Hallazgo de la prueba del 27-09-2026: en
  «Nuevo árbol» nadie sabía que el marcador se arrastra ni que las coordenadas se actualizan solas.
  Liber aceptó una ayuda que cambia según el momento, no un bloque fijo de instrucciones: sin punto, la
  línea bajo el mapa dice «Toque el mapa donde está el árbol o use «Registrar ubicación del punto».»
  (sustituye a «Use el botón de ubicación…»); con el punto puesto, una segunda línea dice «¿No quedó
  justo en el árbol? Arrastre el marcador o toque otro sitio; las coordenadas se actualizan solas.»
  La línea de estado sigue diciendo la precisión o lo que pasó; la guía aparece y desaparece con el
  punto (`SRP.mapa.pintarGuia`, en `colocar` y `limpiar`).
- **D174. Textos de coordenadas, espacios y vehículo sólo del catálogo (bloque 112).** Pedido de Liber
  el 28-09-2026. 1) La ayuda bajo las coordenadas a mano dice «También puede pegar las dos coordenadas
  juntas, por ejemplo: 19.423212, -99.141426. En Google Maps se copian así: mantenga presionado el
  sitio y toque las coordenadas.» (el ejemplo con seis decimales, como lo muestra Google Maps en el
  teléfono). 2) El aviso de error dice «Escriba la latitud y la longitud, por ejemplo 19.4326 y
  99.1332, o pegue las dos juntas.»; «el par completo» no se entendía. 3) «Colocar punto» queda a
  16 px de la ayuda. 4) Se conserva la edición que Liber hizo directo en GitHub (commit a515b68): la
  guía con el punto puesto dice sólo «Arrastre el marcador o toque otro sitio; las coordenadas se
  actualizan solas.»; se corrigió la errata «ArrastreE» y el comentario del código donde quedó pegada
  la pregunta.
  5) «Especie» vuelve a tener aire respecto a la tabla del punto (margen abajo de `.campo-punto`).
  6) En la ficha «Revise antes de guardar», sin comentarios el renglón «Comentarios» no sale (el detalle
  del registro, en Registros, sigue diciendo «Sin comentarios»).
  7) Vehículo sólo del catálogo (Liber, 28-09-2026; responde el visto bueno pendiente de «Otro
  vehículo» del bloque 100): se retiran la opción «Otro vehículo» y los campos de modelo, placa y tipo a
  mano. Al guardar el cierre, placa, modelo y tipo se copian del vehículo elegido; sin vehículo quedan
  vacíos. Un vehículo prestado o rentado se da de alta primero en Catálogos. La base sube a la versión 4:
  la migración 4 enlaza con el catálogo las jornadas cuya placa escrita a mano sí está en él y quita lo
  escrito a mano que no está (y el `vehiculo` de antes del bloque 20); no borra jornadas ni otros datos.
- **D175. Sin respaldo en el teléfono (bloque 113; revoca D72 y la parte de respaldo de D149 y D150).**
  Liber, 28-09-2026: «eso no me sirve; elimina toda la lógica; eso va en Fase 2, en el servidor». Se
  retiran «Guardar respaldo» (menú de la cuenta), «Restaurar respaldo» (herramientas de prueba), el
  renglón «Último respaldo» de la guía «¿Qué hacer sin internet?», el recordatorio al cerrar la jornada
  y los avisos que pedían respaldar. `js/validar.js`, que sólo revisaba lo que entraba por un respaldo,
  sale de la aplicación (queda en el historial de git como referencia para el servidor); `js/esquema.js`
  se queda porque `js/referencias.js` lee de él las relaciones para contar el uso de cuentas y
  catálogos. Al abrir, la app borra del teléfono la fecha del último respaldo (`srp_ultimo_respaldo`).
  Lo que protege lo capturado en la Fase 2 es el servidor y su cola de envío automático (D111): el
  árbol se guarda en el teléfono y se envía solo en cuanto hay señal. Mientras no exista el servidor,
  lo capturado vive sólo en el teléfono; la guía sigue pidiendo no borrar los datos del navegador, y si
  alguien va a cambiar de teléfono debe cerrar antes sus jornadas y generar sus reportes. No se vuelve a
  proponer un respaldo en el teléfono, ni manual ni automático. Sin cambio en la base (sigue en la
  versión 4); «RESTAURADO» se conserva en la bitácora porque lo usa «Deshacer» al eliminar un árbol.
- **D176. Campos depurados y renombrados (bloque 114).** Resultado de la auditoría de campos del
  28-09-2026, aprobado por Liber el mismo día. Se quitan: `catalogos.genero` y `catalogos.especie`
  (salen del nombre científico), `catalogos.nota_discrepancia` (rastro de depuración del Excel del SIA;
  su lugar es ese Excel), `jornadas.creado_por_id` (siempre igual a `cabo_id`), `jornadas.fecha_creacion`
  (el mismo instante que `fecha_inicio`), el campo oculto del vehículo en el cierre (repetía la lista) y
  el código que pintaba el bloque retirado «Registros en este dispositivo». Se renombran: `meta_arboles`
  → `arboles_previstos` (vocabulario de D168, antes de que el servidor fije sus columnas) y, en cuentas,
  `fecha_alta`/`alta_por_id` → `fecha_creacion`/`creado_por_id`, como en catálogos. En jornadas,
  `editado_por_id` y `fecha_ultima_edicion` nacen vacíos hasta la primera edición, como en las demás
  tablas. Se corrige el esquema: regla de `reporte_en` sin «Volver a generar» y como fecha y hora con
  zona; «meta» → «previstos» en reglas e indicador; latitud y longitud de la jornada con seis decimales
  (también al guardarlas); `vehiculo_tipo` con la misma regla de nulo que placa y modelo; la clave
  `srp_demo_quitados` documentada; la nota del espejo de `lat_original` («el punto al guardar el árbol
  por primera vez»). La auditoría automática ya no usa una lista escrita a mano de los campos de la
  jornada: los toma de una jornada que arma el propio código y los compara contra el esquema. La base
  sube a la versión 5: la migración 5 hace todo lo anterior sobre lo ya guardado (incluido el conteo
  viejo `arboles_plantados`) sin borrar ningún registro. Quedan sin decidir `lat_original`/`lng_original`,
  `especie_estatus` y `fecha_cierre`; siguen guardándose como hasta ahora.
- **D177. Qué guarda el teléfono en la Fase 2, y un solo archivo para el traspaso (bloque 114).** Liber,
  28-09-2026. Con el servidor activo, el teléfono guarda sólo lo no enviado (hasta que el servidor
  confirme), los árboles de la jornada abierta (hasta cerrarla y generar su reporte) y los catálogos y la
  cuenta; lo demás —jornadas cerradas, historial y fotografías recibidas— vive sólo en el servidor y se
  consulta y edita ahí, con señal. No se implementa en la Etapa 1, donde el teléfono es la única copia.
  Queda como regla S-11 del esquema. Todo lo que el programador del SIA debe saber y hacer se reúne en
  `FASE2-Y-TRASPASO.md` (servidor, piezas simuladas, entregas del SIA, decisiones abiertas y paquete de
  traspaso); la lista de salida a producción del README apunta ahí. Desde este bloque los comentarios
  nuevos del código van en presente, sin números de decisión, mejora o bloque ni historia.
- **D178. Listas paginadas, cierre más claro y Reportes sin informes (bloque 115).** Pedido de Liber el
  28-09-2026. 1) Jornadas, Registros y Reportes se muestran de 10 en 10, con «Anterior», «Siguiente» y la
  lista de páginas para saltar, bajo la lista; arriba se conserva el total de todo lo filtrado («575
  jornadas · 7,477 árboles», «Total: 7,477 registros», «571 jornadas cerradas…») y abajo «Mostrando
  11–20 de 575 jornadas». Un filtro distinto regresa a la primera página; guardar, editar, cerrar o
  volver del detalle conserva la página. En teléfono chico, Anterior y Siguiente quedan sólo con su
  flecha. Sustituye a «Mostrar más» de Registros. 2) Datos de cierre de la jornada: los campos son blancos
  con contorno, como en los demás formularios (vacíos y grises parecían desactivados); se quita «Una por
  renglón» de Observaciones; las cajas de texto crecen con lo escrito, sin una segunda barra de
  desplazamiento dentro del diálogo (lo que se sentía «pegajoso»). La cabecera y el botón «Ver vista
  previa» siguen fijos. 3) En fechas y horas vacías, la guía propia («Elija la fecha») se quita al enfocar
  el campo: ya no se encima con «dd/mm/aaaa» del navegador. 4) Reportes se titula «Reportes de jornada» y
  ya no lleva el bloque «Informes por periodo» con «Ir a los informes»: repetía la pestaña Supervisión (Mi
  avance para el cabo), donde se generan los informes.
- **D179. Sin marca de prueba, bases separadas y campos sin uso en el árbol (bloque 116).** Liber,
  28-09-2026, tras revisar la estructura de las tablas. 1) Se quita `es_ficticio` de árboles, jornadas,
  cuentas, catálogos y bitácora. En su lugar, la versión de prueba y la real guardan en bases distintas
  del teléfono: `srp_db` con `ES_FICTICIO: true` y `srp_sia` con `false` (`SRP.CONFIG.DB_NOMBRE`). Nunca
  conviven en un teléfono y el servidor de producción sólo recibe de la real (S-09); al pasar al SIA no
  hay que filtrar nada. 2) Del árbol se quitan `lat_original` y `lng_original`: cuando se mueve el punto
  al editar, la bitácora guarda «Punto: lat, lng → lat, lng». 3) Se quitan `folio_uga`,
  `folio_capa_version`, `folio_lat` y `folio_lng`: la celda, la versión de capas y el punto con que se
  asignó el folio (R8) los congela el servidor al emitirlo; el teléfono sólo recibe `folio`. 4) Se quitan
  `foto_nombre` y `foto_bytes`: el nombre del archivo no se usa y el peso se calcula de la foto misma.
  5) Se quita `especie_estatus`: «Otra especie» ya se reconoce por `especie_id` vacío y `especie_otra`
  escrita; los estados de la bandeja del SIA, si hacen falta, son del servidor (S-06). 6) Se conserva
  `reporte_en` (cuándo se generó el reporte de la jornada). La base sube a la versión 6: la migración 6
  quita esos campos de lo ya guardado sin borrar ningún registro. El esquema queda en 99 campos.
- **D180. Fecha de cierre a la vista y colonias del IECM como unidad oficial (bloque 117).** Liber,
  28-09-2026. 1) Jornadas dice cuándo se cerró cada jornada: en la ficha, «Cerrada a las 15:40» si se
  cerró el mismo día de la jornada y «Cerrada el 23/09 a las 10:05» si fue otro; en el detalle, «cerrada
  el martes 22 de septiembre a las 15:40». Una jornada cerrada sin hora guardada dice sólo «Cerrada».
  `fecha_cierre` deja de ser un dato reservado. 2) Las colonias del IECM 2022 son la unidad oficial de
  reporte y la capa definitiva: se descarta la alternativa de las 1,817 unidades territoriales del SIA y
  ya no hay que sustituir la capa antes de liberar la etapa. Su versión pasa de `iecm-2022-prueba` a
  `iecm-2022`, con la misma geometría; la migración 7 cambia ese nombre en lo ya derivado y el detalle y
  el PDF dejan de decir «capa de prueba». Sigue abierto si la capa (3 MB) se queda en el teléfono o sólo
  en el servidor. En el 1.25 % del territorio una colonia cruza el límite de su alcaldía; la alcaldía
  siempre sale de su propia capa.
- **D181. Vehículos de prueba con placas ficticias y visto bueno de los bloques 100 y 101 (bloque
  118).** Liber, 28-09-2026. 1) Las 16 placas del catálogo de arranque eran reales y el repositorio y
  el sitio son públicos: se sustituyen por placas ficticias («PRU 001» a «PRU 016»), con los mismos
  modelos y tipos, así que el reporte se ve igual. La lista real queda fuera del repositorio, en
  `originales/vehiculos_reales_2026-09-26.csv`, y en la Fase 2 se carga en el servidor, como las
  cuentas reales. Un teléfono que ya tiene capturas recibe los de prueba con el sello nuevo; los de
  arranque anteriores se quitan si ninguna jornada los usa y se desactivan si alguna los usa (la
  jornada conserva su copia). Los que dio de alta la administración no se tocan. La auditoría falla si
  una placa real vuelve a aparecer en lo que se publica. Las placas reales se quitaron también de
  DECISIONES, BITACORA, MEJORAS y el esquema (en D162 y en ejemplos). Siguen en el historial de git
  desde el bloque 100, junto con los archivos originales del SIA; recomendación: resolverlo en el
  traspaso (copia sin historial para el SIA y el repositorio archivado y privado), o antes con un
  repositorio nuevo y limpio. 2) Visto bueno de Liber a lo que se dejó en los bloques 100 y 101: el
  catálogo escrito con mayúsculas y minúsculas y las placas con espacio; la franja con el nombre del
  cabo y cinco cifras; el reporte sin apartado propio del programa y sin notas de folios. Queda por
  confirmar el juego de tres gráficas.
- **D182. El reporte de la jornada con dos gráficas (bloque 119).** Liber, 28-09-2026 (opción b del
  punto 8). La sección de gráficas del reporte lleva sólo ejemplares por especie y distribución de
  las especies. Se quita la de avance contra lo previsto: repetía la franja de cifras del inicio
  (plantados, previstos y porcentaje). Cierra el visto bueno de los bloques 100 y 101. El avance de
  Supervisión y de los informes no cambia.
- **D183. Correcciones de la revisión de pantallas (bloque 120).** Liber, 29-09-2026, con notas en la
  página «Pantallas del SRP». 1) Se quita la leyenda «Los campos marcados con * son obligatorios» del
  acceso, de Catálogos y de Usuarios: el asterisco basta. 2) En el acceso, la nota bajo «Entrar» se
  separa del botón. 3) Registrar jornada dice sólo «Registre los datos de la jornada (proyecto) del
  día.». 4) El botón de la franja dice «Cambiar jornada». 5) El folio ya no lleva «(simulado)» en la
  franja «Guardado» ni en la ficha: la banda de datos ficticios ya lo dice. 6) Salir de «Nuevo
  registro» con un árbol a medias pregunta también cuando sólo se tecleó la especie sin elegirla de la
  lista, se escribió «Otra especie» o hay coordenadas escritas sin aplicar; antes eso se perdía sin
  aviso. 7) «¿Qué hacer sin internet?» ya no muestra si lo guardado está protegido, el espacio usado ni
  si abre sin señal; sólo, cuando hay registros en cola, cuántos son y de qué días («3 registros por
  enviar: 28-SEP-2026 (2) y 27-SEP-2026 (1).»), con «Enviar ahora». Se conserva el aviso para iPhone
  desde Safari, porque Safari borra lo guardado a los 7 días sin uso. El teléfono sigue pidiendo al
  navegador que no borre lo guardado y avisa si el espacio pasa del 80 %.
- **D184. Repositorio ordenado por carpetas (bloque 121).** Liber aprobó la propuesta del 29-09-2026
  tras revisar archivo por archivo. La raíz queda sólo con el sitio (`index.html`, `sw.js`,
  `manifest.webmanifest`) y el `README.md`. El modelo de datos va a `datos/` (`esquema.json`,
  `DICCIONARIO-DATOS.md`, `MAPEO-CAMPOS.md`); la memoria del proyecto a `docs/` (`DECISIONES.md`,
  `BITACORA.md`, `MEJORAS.md`, `FASE2-Y-TRASPASO.md`); los generadores a `herramientas/`
  (`generar_capas.py`, `generar_especies.py`, `generar_diccionario.py`, `extraer_iconos.py`), porque no
  son pruebas; `pruebas/` conserva sólo `prueba.py`, `auditoria.py` y `revisar.py`. En `assets/`, las
  capas van a `capas/` y los catálogos a `catalogos/`, separados de las imágenes. Salen del repositorio,
  a `historial/` (local), las dos maquetas HTML ya aplicadas y las dos pruebas de un comportamiento
  retirado (rehacer la base desde cero). Las tres copias viejas de `historial/` van a `_to_delete/`: git
  guarda esas versiones. Nuevos: `vendor/LICENCIAS.md` (versión y licencia de cada biblioteca y
  fuente) y `originales/LEEME.md` (qué es cada original, su fecha y qué genera). `.gitignore` deja fuera
  `__pycache__/`. Las decisiones y la bitácora anteriores conservan las rutas de su momento.
- **D185. Dos programas nuevos (bloque 122).** Liber, 29-09-2026: se agregan al catálogo de programas
  «Palmeras y compensaciones» (`PALMERAS_COMPENSACIONES`) y «Jornadas de voluntariado»
  (`JORNADAS_VOLUNTARIADO`). Llegan con el sello nuevo también a los teléfonos que ya tienen capturas,
  sin tocar lo capturado. Los datos de demostración reparten algunas jornadas en ellos sin cambiar sus
  totales. En la Fase 2 el catálogo real de programas se carga en el servidor.
- **D186. Organizaciones: alcaldías, PAOT, SOBSE y empresas usan el sistema (bloque 123).** Liber,
  29-09-2026. Además de la Secretaría registran las 16 alcaldías, PAOT, SOBSE y las empresas que la
  Secretaría contrata. Sus respuestas: 1) una alcaldía ve sólo lo suyo; 2) la Secretaría da de alta
  todas las cuentas, a solicitud de cada organización; 3) lo que plantan suma a las cifras de la
  Ciudad; 4) de las organizaciones externas no se piden datos de vehículos; 5) sólo la Secretaría da
  de alta programas. Con eso: catálogo nuevo de **Organizaciones** (tipo, contrato o convenio y
  vigencia, obligatoria para empresas); de arranque SEDEMA, PAOT, SOBSE y las 16 alcaldías (id
  `o-alc-` más su cvegeo). Cada cuenta lleva `organizacion_id` obligatorio; el área es sólo de
  SEDEMA; Administración global sólo en SEDEMA; el coordinador de un cabo es de su misma organización,
  y quien coordina cabos no cambia de organización sin reasignarlos. Así no hace falta un perfil
  nuevo: cabo y coordinación ya ven sólo lo suyo y lo de su cuadrilla, de modo que ninguna
  organización ve lo de otra. La jornada guarda la organización de quien la inicia (no cambia
  después); en las de fuera, el cierre no pide chófer ni vehículo y el reporte dice «Organización que
  ejecuta» y el contrato o convenio. Una organización desactivada o con la vigencia vencida deja fuera
  a sus cuentas, también con la sesión abierta; SEDEMA no se desactiva. Al abrir, las cuentas y jornadas
  anteriores quedan en SEDEMA; no es una migración numerada porque la estructura no cambia y porque,
  corriendo a la par de las anteriores en la misma actualización, podía pisar lo que éstas cambiaban. Pendiente para el bloque 124: filtros y totales por
  organización en Supervisión, Informes y reportes, y datos de demostración con una alcaldía y una
  empresa. En la Fase 2 el servidor filtra por organización (S-12).
- **D187. Supervisión, informes y tabla por organización (bloque 124).** Liber, 29-09-2026 («vamos
  con el 124»), con las recomendaciones que dejó sin objetar. 1) Lo que plantan las alcaldías, PAOT,
  SOBSE y las empresas suma al total de la Ciudad y se desglosa: Supervisión y el informe en PDF de
  la Administración traen «Por organización» (organización, tipo, árboles, % y jornadas) cuando
  plantó más de una. 2) Filtro «Organización» en Supervisión, sólo para la Administración: deja los
  árboles, las jornadas y los cabos de la elegida, y da nombre al informe y a la tabla
  («Arboles_todo_ALC_IZP.csv»). Las demás cuentas no lo necesitan: ya ven sólo su organización. 3)
  La tabla para Excel lleva la columna «Organización que ejecuta». 4) En la lista de jornadas de
  Supervisión, las de fuera dicen su organización. 5) Una empresa necesita contrato o convenio,
  además de vigencia. 6) Sin perfil nuevo de consulta por organización: su coordinación ve a sus
  cabos; se agrega si una organización tiene varias coordinaciones. 7) Los datos de demostración
  traen la Alcaldía Iztapalapa (una coordinación y dos cabos desde febrero de 2025) y una empresa
  (una coordinación y un cabo desde marzo de 2026, con contrato y vigencia), generadas con su propia
  semilla: lo de la Secretaría sale idéntico. La empresa de demostración se quita con los datos.
- **D188. Alta de cuentas por institución (bloque 125).** Liber, 29-09-2026: el alta va de lo
  general a lo particular. 1) Primero el **tipo de institución**, fijo: Alcaldía, Gobierno de la
  CDMX, Empresa privada, Organización civil (sustituyen a «Dependencia de gobierno» y «Organismo
  público»). 2) Luego la **institución** de ese tipo: las 16 alcaldías, fijas y sin repetir la
  palabra «Alcaldía» (se guardan así; en reportes, informes y la tabla se lee «Alcaldía Iztapalapa»);
  en los otros tres tipos, las que haya y «Agregar otra…», que da de alta la institución nueva en la
  misma operación que la cuenta (nombre único; clave puesta por el sistema). De arranque: SEDEMA,
  PAOT y SOBSE; Green Cover; Reforestamos México, A.C. 3) **Nombre completo** en un solo campo, en
  lugar de nombre y dos apellidos; al abrir, las cuentas que los tenían se unen. 4) **Sólo SEDEMA
  tiene coordinación** (y Administración global): las cuentas de fuera son de cabo, sin coordinador
  ni área. 5) Sin «Acceso hasta» ni vigencia: el acceso se corta desactivando la cuenta o la
  institución. 6) Sin contrato o convenio en el sistema (no se contestó; se aplicó la recomendación:
  vive en el expediente). 7) La pestaña de Catálogos se llama **Instituciones** y sólo renombra y
  desactiva; no agrega ni elimina; las alcaldías son fijas y SEDEMA no se desactiva. 8) En toda la
  pantalla se dice «institución» (filtro, «Por institución», «Institución que ejecuta»); el campo
  en la base sigue siendo `organizacion_id`. 9) Los datos de demostración quedan con dos cabos de la
  Alcaldía Iztapalapa y uno de una empresa, sin coordinación; lo de la Secretaría sale idéntico.
  Sustituye lo que D186 y D187 decían de vigencia, contrato, tipos y coordinación fuera de SEDEMA.
- **D189. Áreas de la Secretaría e instituciones sólo desde Catálogos (bloque 126).** Liber,
  30-09-2026. 1) El catálogo de áreas —sólo para cuentas de SEDEMA— es DGSANPAVA, Oficina de la
  Secretaría, Sistema de Información Ambiental y DGEIRA. Sustituye a «Dirección de Infraestructura
  Verde» y «Coordinación del SIA» (ésta se renombra a «Sistema de Información Ambiental»); en un
  teléfono con capturas, las cuentas del área retirada pasan a DGSANPAVA. 2) Las instituciones nuevas
  —de Gobierno de la CDMX, empresas y organizaciones civiles— ya no se crean desde «Dar de alta» con
  «Agregar otra…»: las agrega la Administración global, a solicitud, en Catálogos › Instituciones
  («Agregar institución»: tipo, nunca Alcaldía, y nombre; la clave la pone el sistema). Así nadie
  crea duplicados ni nombres mal escritos al dar de alta una cuenta. En el alta sólo se eligen, y el
  campo avisa dónde se agregan las que falten. Sustituye el punto 2 de D188.
- **D190. Una cuenta de prueba por tipo y reinicio de los datos de prueba (bloque 127).** Liber,
  30-09-2026: «rehaz los usuarios de prueba, quiero uno por tipo; todos los datos que existan, en un
  teléfono o en el código, por el momento son de prueba». 1) Siete cuentas de arranque: en la
  Secretaría, una por perfil (Administración global, Coordinación, Cabo); fuera, un cabo por tipo
  de institución (Alcaldía Iztapalapa, PAOT, Green Cover, Reforestamos México), sin área ni
  coordinación. 2) La entrada de prueba las ofrece en ese orden; las cuentas de los datos de
  demostración van aparte, en el grupo «Datos de demostración». 3) Reinicio: un teléfono con un sello
  anterior a `SELLO_REINICIO` (2026-09-30-usuarios) vuelve a empezar aunque tenga capturas —se quitan
  árboles, jornadas, demostración y envíos simulados; los folios simulados no retroceden— y lo avisa.
  Con sellos posteriores se vuelve a conservar lo capturado (D149).
- **D191. Programas por institución y cierre de empresas privadas (bloque 128).** Liber, 30-09-2026.
  1) «Palmeras y compensaciones» se separa en dos programas para todos: **Palmeras** (`PALMERAS`, el
  mismo `p-palmeras`) y **Compensaciones** (`COMPENSACIONES`, nuevo). 2) Una empresa privada sólo
  puede elegir **Palmeras** al iniciar o editar una jornada; las demás instituciones, todos los
  programas. La regla vive en `CONFIG.PROGRAMAS_POR_TIPO_INSTITUCION`, por clave de programa, y se
  comprueba también al guardar. 3) En «Datos de cierre» de una jornada de empresa privada no se piden
  Personal participante ni Personal de apoyo (tampoco chófer ni vehículo, como a toda institución de
  fuera); las demás instituciones de fuera sí los capturan. En un teléfono con capturas, el programa
  de arranque se renombra solo y llega «Compensaciones».
- **D192. Coordinación en cada institución, programas por tipo y cierre con personal sólo en SEDEMA
  (bloque 129).** Liber, 30-09-2026. 1) Alcaldías, Gobierno de la CDMX, empresas privadas y
  organizaciones civiles tienen cuentas de **cabo** y de **coordinador**; la Administración global
  sigue siendo sólo de SEDEMA, igual que el área. El cabo depende de un coordinador de su misma
  institución, que ve, corrige y supervisa lo de sus cabos y nunca lo de otra institución.
  Sustituye lo que D188 y D190 decían de «sin coordinación fuera de SEDEMA». 2) Programas: SEDEMA,
  todos; alcaldías, Gobierno de la CDMX y organizaciones civiles, **Reforestación Urbana**; empresas
  privadas, **Palmeras** (`CONFIG.PROGRAMAS_POR_TIPO_INSTITUCION`). Un programa nuevo queda sólo
  para SEDEMA hasta sumarlo a esa lista. Cuando la institución tiene uno solo, al iniciar la jornada
  ya viene elegido (matiza D130). 3) **Jornadas de voluntariado** sale del catálogo: en un teléfono
  con capturas se desactiva si alguna jornada o árbol lo usa, y si no, se quita. Las jornadas de la
  demostración que lo usaban pasan a Compensaciones. 4) «Datos de cierre»: Personal participante,
  Personal de apoyo, Chófer y Vehículo sólo en jornadas de SEDEMA; las demás instituciones capturan
  encargado, observaciones y hora, y su reporte no imprime personal ni vehículo aunque la jornada
  los traiga de antes. Sustituye el punto 3 de D191. 5) «Institución que ejecuta» aparece en todos
  los reportes, también en los de SEDEMA. 6) Cuentas de prueba: once (tres de SEDEMA y, por tipo de
  institución, un coordinador y su cabo); sello de reinicio `2026-09-30b-coordinacion`.
- **D193. Quién usa cada programa se marca en Catálogos (bloque 130).** Liber, 30-09-2026, sobre la
  propuesta M307. La regla de programas por tipo de institución deja la configuración y pasa al
  catálogo: cada programa guarda `tipos_organizacion`, la lista de tipos de institución (Alcaldía,
  Gobierno de la CDMX, Empresa privada, Organización civil) que, además de SEDEMA, pueden elegirlo al
  iniciar o editar una jornada. SEDEMA puede usar todos. La Administración lo marca con botones en
  Catálogos › Programas («Quién puede usarlo»), y la lista lo muestra («SEDEMA · Alcaldía…» o
  «Sólo SEDEMA»). Un programa nuevo empieza sólo para SEDEMA. De arranque se conserva lo de D192.
  Al abrir, un programa sin el dato recibe el de arranque o, si lo agregó la Administración, vacío.
  Quitar un tipo no cambia las jornadas que ya usan el programa: al editarlas lo conservan.
  Sustituye `CONFIG.PROGRAMAS_POR_TIPO_INSTITUCION` (D191, D192).
- **D194. Datos de demostración con todas las instituciones, perfiles y programas (bloque 131).**
  Liber, 30-09-2026: «que tenga datos de todos los perfiles e instituciones, programas». Se agrega
  una tercera pasada por el calendario, con su propia semilla (20260930), así que lo de la
  Secretaría y lo de Iztapalapa y la empresa de demostración salen igual que antes. Registran: los
  cuatro cabos de prueba de fuera y los seis coordinadores (los de prueba de cada institución, el de
  la Secretaría y la coordinación de demostración), éstos con un tercio de lo que captura un cabo; y
  seis cuentas de demostración nuevas: un cabo de PAOT, dos de Reforestamos México y uno de Green
  Cover, cada uno con el coordinador de prueba de su institución, y un cabo de SOBSE y uno de la
  Alcaldía Coyoacán sin coordinación. Cada institución usa sus programas (Reforestación Urbana, o
  Palmeras las empresas), sin personal, chófer ni vehículo fuera de la Secretaría. Así cada una de
  las diez cuentas de prueba que captura tiene datos en Mi avance o Supervisión, y la Administración
  ve el desglose por institución con ocho instituciones. Total aproximado: 1,300 jornadas, 17,000
  árboles, 16 cuentas de demostración. En Supervisión, lo que registra quien coordina cuenta en los
  árboles y aparece en la tabla «Por cabo», pero no en «X de Y cabos trabajaron», que sólo cuenta
  cabos.
- **D195. Configuración de la Administración global (bloque 132).** Liber, 30-09-2026. El menú de
  la cuenta de la Administración global tiene una sola entrada, **Configuración**, en lugar de
  Catálogos y Usuarios. Abre una pantalla con cinco tarjetas (icono, título, para qué sirve y un
  resumen al día): **Usuarios** y **Catálogos**, que siguen siendo sus vistas y vuelven con
  «Configuración»; **Parámetros**, los valores con que el sistema revisa (distancias de los avisos
  de jornada, niveles de precisión del GPS, margen del límite de la Ciudad, espera del GPS, hora de
  atraso, reintento de envío, tamaño de fotografía y renglones por página), leídos de la
  configuración y **sólo para consulta**: en la Fase 2 se cambian en el servidor para todos los
  teléfonos a la vez; **Registro de cambios**, lo que la bitácora dice de cuentas y catálogos (qué,
  sobre qué, quién y cuándo, con los campos cambiados), con filtros por tipo y por persona, de 10 en
  10, sin poder modificarse; y **Acerca del sistema** (versión, datos de prueba o reales, base del
  dispositivo, acceso, versión y corte de cada capa, mapa base, pendientes de envío y espacio usado).
  Coordinación y cabos no la tienen ni la abren llamándola directamente. Los datos de demostración
  se quedan en el pie (Liber).
- **D196. Catálogo de especies en Excel y carga masiva del histórico (bloque 133).** Liber,
  30-09-2026. 1) Catálogos › Especies tiene «Descargar en Excel»: las especies activas e inactivas
  con todos sus campos y cuántos usos tienen. 2) Configuración tiene la tarjeta **Carga masiva**,
  para subir de una vez los árboles plantados antes del sistema, de los que sólo se tiene latitud,
  longitud, nombre científico, fecha de plantación, programa, tipo de institución e institución
  (resuelve la decisión pendiente 5: el histórico se carga **por árbol**). Pasos: plantilla en
  Excel (con instrucciones y las listas válidas), revisión renglón por renglón sin guardar nada, y
  carga al confirmar. Se aceptan Excel (.xlsx) y CSV (coma o punto y coma); el Excel se escribe y
  se lee sin biblioteca externa. Reglas (Liber): los árboles se agrupan en **jornadas cerradas
  automáticas**, una por institución, fecha, programa y alcaldía, llamadas «Carga histórica ·
  alcaldía»; quedan **a nombre de quien carga**; una especie que no está en el catálogo
  **rechaza el renglón**, con el aviso de darla de alta; un programa que hoy no tiene marcado el
  tipo de institución **entra con aviso**. También rechazan el renglón: coordenadas que no son
  número o fuera de la Ciudad, fecha no válida o futura, programa, tipo o institución inexistentes,
  y el renglón repetido (mismo punto, especie y fecha). Hasta 20,000 renglones por archivo. Los
  renglones con problemas se descargan en Excel para corregirlos. Todo entra en una sola
  transacción. Cada jornada lleva `carga_id` (campo nuevo, la clave del lote); no se cuenta como
  «sin reporte» y sus avisos quedan revisados. Con datos de prueba el folio se emite al cargar.
  La bitácora guarda cada jornada, cada árbol y el lote (entidad nueva `carga`), que se ve en el
  Registro de cambios. Lo cargado lo ve la Administración global; las cuentas de la institución
  ven sólo lo que capturan ellas (está a nombre de quien carga).
- **D197. «Lejos del resto» frente al árbol más cercano y aprobar todos los puntos (bloque 134).**
  Liber, 01-10-2026, con datos reales: en una jornada con dos grupos (una banqueta y el parque de
  enfrente) todo el grupo chico salía «lejos del resto · a 210–240 m» aunque sus árboles estaban
  juntos, porque se medía contra la mediana de todos los puntos, que caía en el grupo grande.
  1) «Lejos del resto» se mide ahora contra el **árbol más cercano** de la jornada: sólo se marca
  el árbol que no tiene ningún otro a menos de `FUERA_M` (150 m), y el aviso dice «a N m del más
  cercano». Sigue pidiéndose con tres o más árboles. 2) En la conciliación de la ficha, con dos o
  más puntos por revisar, **«Marcar los N como revisados»**: pregunta antes, dice cuántos de cada
  aviso, queda en la bitácora con los números de los puntos y se deshace. «Está bien» por árbol se
  queda. 3) «Posible duplicado» sigue en 5 m (Liber). Los avisos nunca impiden cerrar ni generar el
  reporte.
- **D198. Buscar jornadas por nombre y filtrar por revisión (bloque 135).** Liber, 01-10-2026. Jornadas
  tiene un campo «Buscar por nombre» arriba de los filtros. Filtra mientras se escribe, sin distinguir
  mayúsculas ni acentos, y cada palabra tiene que estar en el nombre, en cualquier orden («parque norte»
  encuentra «Parque Hundido, sección norte»). Al lado, el filtro «Revisión» deja ver: Todas · Con algo
  por atender (cualquiera de las dos siguientes) · Con puntos por revisar (avisos de calidad sin marcar
  como revisados) · No cuadran con lo previsto (cerradas con un número de árboles distinto al previsto)
  · Sin pendientes. Usa los mismos criterios que la conciliación de cada jornada. Búsqueda y revisión se
  combinan con el periodo y los demás filtros. Sin coincidencias, el aviso dice lo buscado o el estado
  elegido, y «Ver todas» limpia las dos.

- **D199. La carga masiva reconoce lo ya cargado y se puede deshacer (bloque 136).** Liber, 01-10-2026,
  hallazgo H2 de la auditoría integral. Al revisar un archivo, cada renglón se compara con los árboles
  que ya están en el sistema por su huella: punto con seis decimales, especie, fecha e institución (la
  de su jornada). Un renglón que empata con un árbol guardado no entra y dice si ese árbol se cargó
  antes o se registró en campo; cada árbol guardado empata con un solo renglón, así que si el archivo
  trae más renglones iguales de los que hay guardados, los de más se revisan como nuevos (la regla de
  repetidos dentro del archivo sigue igual). Los eliminados no cuentan. Si todos los renglones ya
  estaban, el resumen dice que el archivo ya se había cargado. En la misma pantalla, «Cargas hechas»
  lista cada lote (fecha, archivo, árboles, jornadas, quién) con «Deshacer carga»: pide confirmar,
  dice cuántos árboles y jornadas quita y avisa lo editado o agregado después; al confirmar quita en
  una transacción las jornadas del lote y todos sus árboles, y la bitácora agrega un renglón
  `ELIMINADO` de la entidad `carga` («Carga deshecha del archivo…»). El lote queda tachado, sin botón,
  y el archivo se puede volver a cargar. El Registro de cambios lo muestra como «Carga masiva
  deshecha». El campo del archivo se vacía al leerlo, para que el mismo archivo corregido se pueda
  elegir otra vez.

- **D200. Filtros por especie, programa, alcaldía e institución; catálogo de instituciones con buscador
  (bloque 137).** Liber, 01-10-2026. En «Más filtros»:
  · Registros: especie (con «Otra especie»), programa y alcaldía para todos; tipo de institución e
    institución sólo para la Administración global, la única cuenta que ve más de una institución.
  · Jornadas: alcaldía (la de la jornada o la de cualquiera de sus árboles) para todos; tipo de
    institución e institución para la Administración global.
  Tipo e institución son dependientes: el tipo acota la lista de instituciones, elegir una institución
  pone su tipo y cambiar el tipo quita la institución de otro tipo. Las listas sólo traen lo que hay
  en lo que la cuenta ve. La institución de un árbol es la de su jornada. Liber pidió los filtros de
  institución para «administrador global y cabo»: el cabo sólo ve su institución, así que recibe
  alcaldía (y, en Registros, especie y programa); si quiere también el tipo y la institución, se
  muestran sin más. En Registros cada filtro tiene su ficha con ×; la de institución quita tipo e
  institución a la vez. «Quitar filtros» y «Ver todas» limpian todo. El resumen del acordeón enumera
  lo disponible («año, mes, cabo, especie, programa, alcaldía e institución») o lo elegido.
  Catálogos › Instituciones: buscador por nombre o clave (sin acentos) y filtro por tipo; la lista
  va agrupada por tipo, en el orden de los tipos, y por nombre. En toda fila de filtros con botones
  (Usuarios, Catálogos) los campos quedan alineados por abajo: sin margen inferior propio.

- **D201. Paginador con botones de página y «Resultados por página» (bloque 137).** Liber, 01-10-2026,
  con una imagen de referencia. Jornadas, Registros, Reportes y el Registro de cambios usan el mismo
  paginador: «Mostrando 11–20 de 85 jornadas»; «‹ Atrás», las páginas como botones y «Siguiente ›»;
  y «Resultados por página» con 10, 25, 50 o 100. Siempre se ven la primera y la última página, la
  actual (marcada) y sus vecinas, con «…» donde se saltan: siete lugares en pantalla ancha y cinco en
  teléfono, donde Atrás y Siguiente quedan sólo con su flecha. Cambiar el tamaño vuelve a la primera
  página y cada lista lo recuerda en el teléfono. Con una sola página quedan el texto y el tamaño; con
  10 resultados o menos no hay paginador. Sustituye la lista desplegable «Página N de M» de D178.

- **D202. Listas de filtro que dependen de las demás; Supervisión con el alcance de cada cuenta;
  «Quién registró» (bloque 138).** Liber, 01-10-2026, auditoría de filtros (F1, F2, F6, F9, F10).
  · En Registros, Jornadas y Supervisión cada lista ofrece sólo los valores que existen entre lo que
    pasa los demás filtros de lista (`SRP.util.facetas`): con PAOT elegida, «Quién registró» y
    Alcaldía traen sólo lo de PAOT. El periodo no cuenta para las listas, para que no cambien al
    moverse de fecha. Tipo de institución e institución se calculan juntos y siguen encadenados;
    al volver la institución a «Todas» su tipo queda elegido (se sube un nivel: todas las de ese tipo).
  · Lo elegido no se quita solo: si otra elección lo deja sin resultados, sigue elegido (con su
    nombre en la lista) y el aviso de vacío ofrece quitar filtros.
  · Supervisión: alcaldías y programas salen de las jornadas de la cuenta, ya no de la capa ni del
    catálogo completo (la coordinación de Iztapalapa veía 16 alcaldías; su cabo, 4 programas).
    Agrega tipo de institución, dependiente de institución, sólo para la Administración global; el
    cálculo de indicadores y el título del informe lo respetan. El resumen dice «alcaldía y programa».
  · La lista «Cabo» se llama «Quién registró» en Registros, Jornadas, Reportes, Galería y
    Supervisión, y la coordinación o la Administración llevan su perfil entre paréntesis. La ficha
    de Registros dice «Registró: …».
  · Registro de cambios: la primera opción de «Sobre» dice «Todo».

- **D203. Sustituir un árbol perdido; duplicados a 4 m (bloque 139).** Liber, 01-10-2026.
  · «Sustituir» (tuerca del árbol en Registros y en la ficha de la jornada, y botón del detalle) pide
    por qué se sustituye: Vandalismo, Impacto vehicular, Robo, Muerte u Otro (este último pide
    escribirlo). Luego abre el formulario «Sustituir árbol» en la **jornada del árbol perdido**
    (Liber): si está cerrada se reabre, como con «Registrar árbol»; la especie empieza igual y se
    puede cambiar. Puede hacerlo quien captura y alcanza al árbol (cabo y coordinación); la
    Administración global no captura.
  · Al guardar, en una sola operación, el sustituto entra con `sustituye_id`, `motivo_sustitucion` y
    `motivo_sustitucion_otro`, y el perdido pasa a estatus `sustituido` con `sustituido_por_id`; cada uno
    lleva su renglón de bitácora (acción nueva `SUSTITUIDO`). El perdido deja de listarse y de
    contar; el sustituto **suma como plantado** (Liber) y Supervisión, el informe PDF y la tabla CSV lo
    dicen aparte, por motivo. Como su jornada no cambia, la conciliación de previstos sigue cuadrando.
  · El sustituto se pinta en **morado** (`--sustituto`, Liber) en el mapa y la lista de la jornada, la
    miniatura y el croquis del reporte, salvo que tenga un aviso por atender; la leyenda lo explica.
    Tarjeta, ficha y detalle llevan la marca «Sustituto · motivo»; el detalle dice a cuál sustituye o
    quién lo sustituyó.
  · Mientras se ubica el sustituto, el perdido no cuenta como «posible duplicado». Si se elimina el
    sustituto, el perdido vuelve a `activo`; si se deshace, vuelve a quedar sustituido.
  · La fecha de plantación del sustituto es la de su jornada (regla de D151); el día real de la
    sustitución queda en su `fecha_registro` y en el historial.
  · «Posible duplicado» pasa de 5 m a **4 m** (`JORNADA.DUPLICADO_M`, Liber); la regla S-05 del
    servidor usa el mismo piso.

- **D204. Cada árbol con su fecha; jornada de varios días; relevo de cabo (bloque 140).** Liber, 01-10-2026.
  Las tres decisiones las tomó Liber: el árbol lleva la fecha del día en que se plantó, también el
  sustituto, con la fecha de la sustitución elegida al sustituir; en un relevo, cada árbol queda con
  su autor, la jornada con su titular y el relevo en la bitácora; el relevo lo hace la coordinación.
  Sustituye a la regla de D119 y D151 según la cual el árbol heredaba la fecha de su jornada, y a la
  línea de D203 sobre la fecha del sustituto.
  · `jornadas.fecha` es el día en que empieza la jornada. Cada árbol lleva su `fecha_plantacion`, entre
    ese día y hoy. Una jornada puede seguir abierta varios días: «Nuevo registro» enseña «Fecha de
    plantación» sólo cuando la jornada empezó antes de hoy. El día que se inicia (también si se inicia
    con una fecha pasada, para capturar lo atrasado), el árbol arranca con la fecha de la jornada; los
    días siguientes, con la de hoy. Lo elegido se conserva para el árbol siguiente de esa jornada, a
    la vista. Al guardar en una jornada de otro día se confirma una vez por sesión, diciendo con qué
    fecha queda el árbol. El aviso al entrar ya no pide cerrarla: dice que puede seguir en ella.
  · Franja, lista y ficha de Jornadas, «Cambiar jornada» y el reporte PDF dicen los días («28-SEP-2026
    al 01-OCT-2026»); en la ficha, los puntos de otro día llevan su fecha, y en el PDF la tabla de
    ejemplares suma la columna «Fecha» cuando hay más de un día.
  · Editar la fecha de la jornada: la toman los árboles plantados el día de inicio; los de otros días
    conservan la suya, y la jornada no puede empezar después de ninguno de ellos. Mover un árbol: si
    era del día de inicio, toma la fecha de la jornada nueva; si no, conserva la suya (nunca antes del
    inicio de la nueva). Restaurar: conserva la suya, salvo que la jornada ahora empiece después.
  · Sustituir pide «Fecha de la sustitución»: hoy de inicio, no antes de la plantación del árbol
    perdido ni después de hoy. Es la fecha de plantación del sustituto y se puede corregir al editarlo.
  · Supervisión, «Mi avance», informes y CSV cuentan cada árbol en el periodo de su fecha de
    plantación. Una jornada es del periodo si empezó en él o si tiene árboles plantados en él; el
    avance contra lo previsto es contra todos los árboles de la jornada, porque la meta es suya. Los
    árboles de la tabla por jornada son los del periodo, para que sumen el total.
  · Relevo: la coordinación, en la ficha de una jornada abierta de su cuadrilla, toca «Relevo de cabo»
    y elige a otro cabo activo de su cuadrilla y de la institución de la jornada (o se la devuelve al
    titular). Campos nuevos en `jornadas`: `relevo_id` (quién registra ahora; nulo, el titular) y
    `relevos` (cada relevo: a quién, cuándo y quién lo hizo). Bitácora con acción nueva `RELEVO`. El
    titular (`cabo_id`) no cambia; deja de poder registrar en ella mientras dure el relevo, pero la
    sigue viendo y puede cerrarla.
  · Registra en una jornada sólo quien la tiene a su cargo (permiso nuevo `jornada.registrar`); la
    sustitución sigue registrando en la jornada del árbol perdido aunque la tenga otro. Quien estuvo
    en un relevo ve la jornada y todos sus árboles, pero sólo edita los suyos. Cada árbol queda con
    su autor: Supervisión cuenta a cada cabo sus árboles; las jornadas, la meta y los pendientes
    siguen siendo del titular. «Quién registró» encuentra la jornada por el titular o por cualquier
    cabo con árboles en ella. El reporte dice «Relevo de cabo: nombre, desde el día».
  · La Administración global no hace relevos (no coordina cuadrillas); el cabo tampoco.
  · Etapa 1: el relevo se modela en el teléfono, como el resto del trabajo en equipo. Que la jornada
    llegue al teléfono del cabo que la recibe es del servidor (S-13, FASE2-Y-TRASPASO).

- **D205. La misma zona de filtros en todos los módulos; aviso del relevo (bloque 141).** Liber, 01-10-2026.
  Cierra M331 y M332 de la auditoría de filtros (F3, F4, F5, F7, F8, F11).
  · Zona compartida `SRP.zonaFiltros` (`js/filtros.js`): encabezado «Filtrar» con «Quitar filtros»,
    fichas de lo que está filtrando (cada una con su ×), buscar, los atajos Todas · Hoy · Un día · Un
    periodo y «Más filtros» con año, mes y las listas de la vista. Las listas dependen unas de otras
    (D202) y lo elegido se queda aunque ya no tenga resultados. «Quitar filtros» ofrece deshacer.
  · **Reportes** la usa: buscar por nombre, periodo y, en «Más filtros», si el reporte ya se generó,
    quién registró, programa, alcaldía y, para la Administración global, tipo de institución e
    institución. Antes sólo tenía Todas · Hoy · Un día y «Quién registró».
  · **Fotografías** la usa: buscar (especie, jornada o colonia), periodo, jornada (las de las fechas
    elegidas), quién registró, especie, programa, alcaldía e institución.
  · **Jornadas** suma el filtro de programa, las fichas y «Quitar filtros». **Supervisión** dice «Un
    periodo» en lugar de «Rango» y «Más filtros:» en lugar de «Filtros:», y lleva fichas y «Quitar
    filtros» de sus listas (el periodo no es un filtro que se quite: siempre hay uno).
  · **Usuarios** filtra por perfil y por tipo de institución, encadenado con la institución.
  · **Registros** conserva su panel plegable en teléfono (D100, D105): sus fichas se ven con el panel
    plegado. En las demás vistas no hay panel que plegar y las fichas se ven siempre.
  · **Aviso del relevo** (Liber): al entrar, quien recibió una jornada en relevo, quien dejó de
    registrar en una o el titular al que se la devolvieron lo lee en una ventana con «Entendido»: qué
    jornada, quién la tiene, quién hizo el relevo y cuándo. Sale una vez por relevo; lo leído se
    recuerda por cuenta en el dispositivo (`srp_relevos_vistos_<cuenta>`). En la Etapa 1 aparece en
    el equipo donde se hizo el relevo; que llegue al teléfono del otro cabo es del servidor (S-13).
  · Sustituir un árbol plantado hoy: no hay otro día que elegir; el campo de fecha queda fijo en hoy
    y dice por qué, en lugar de un calendario con todos los días apagados.

- **D206. Colonias prioritarias para reforestar (bloque 142).** Liber, 01-10-2026.
  Liber entregó la capa de su modelo de priorización (2,243 colonias, prioridad de Muy Baja a Muy
  Alta) y decidió: se dibujan los cinco niveles; del original se publican sólo colonia, alcaldía y
  prioridad (marginación CONAPO, estrato IDS, población y pobreza NBI se quedan en `originales/`,
  que no se publica); la capa va en Nuevo registro, en la ficha de la jornada y en Supervisión; y
  Supervisión cuenta los árboles por nivel.
  · `assets/capas/capa-prioritarias.js` sale de `originales/colonias_prioritarias_reforestacion.geojson`
    con `herramientas/generar_capas.py` (versión `priorizacion-2026-10-01`); viaja con la aplicación,
    así que se ve sin señal.
  · Es **capa de referencia**: no deriva ningún dato que se guarde. La prioridad del punto se calcula
    al mostrarla (`SRP.prioritarias.de`), con el polígono más pequeño cuando hay solape; fuera de la
    capa, «Sin dato». El registro no gana campos.
  · Un solo color, más intenso a mayor prioridad (`--pri-0` a `--pri-4`), para no depender de varios
    tonos; la leyenda y el texto dicen el nivel. La capa va debajo de los puntos y no atiende
    toques: no estorba al colocar el árbol. El botón «Colonias prioritarias» bajo el mapa la enciende
    o la apaga; arranca encendida y lo elegido se recuerda en el dispositivo.
  · Nuevo registro: campo de lectura «Prioridad de reforestación de la colonia» («Alta · Vicente
    Guerrero»). Ficha de la jornada: «Colonias prioritarias: 5 en prioridad alta y 2 en media».
  · Supervisión: apartado «Por prioridad de la colonia» con la cifra de árboles en prioridad alta o
    muy alta, la tabla por nivel y el mapa de colonias; el informe PDF lleva el mismo apartado y la
    tabla CSV, la columna «Prioridad de reforestación de la colonia».
  · Límites de la capa recibida, dichos en pantalla y anotados para el SIA: sus colonias no son las
    unidades territoriales del IECM con que se reporta; sus polígonos son simplificados (15 vértices
    en promedio) y se enciman en 6.5 km², así que cerca de un límite la prioridad es aproximada.
    Por decidir en la Fase 2: si la prioridad se congela con el árbol o se recalcula con la capa
    vigente (FASE2, fila 19).
  · De paso: tras «Iniciar jornada» el mapa de Nuevo registro vuelve a medir su caja; se quedaba sin
    tamaño hasta volver a entrar a la vista.

- **D207. La prioridad en la jornada y en todos los informes (bloque 143).** Liber, 01-10-2026.
  Liber pidió que todos los informes muestren la priorización y que la jornada la marque y la muestre.
  · **Prioridad de la jornada:** el nivel donde cayó la mayoría de sus árboles; en empate, el más
    alto; sin árboles con dato, la de su punto de ubicación (`SRP.prioritarias.deJornada`). Se dice
    «Prioridad alta» y, si no todos sus árboles cayeron ahí, «(8 de 10 árboles)». No se guarda: se
    calcula con la capa vigente, como la del árbol (D206).
  · **Dónde se ve:** al iniciar la jornada, «Prioridad de reforestación de la colonia» al detectar la
    ubicación; en la franja de la jornada activa; en la tarjeta de la lista de Jornadas y de Reportes,
    con su muestra de color; en el encabezado de la ficha; y en cada punto de la ficha.
  · **Filtro:** «Prioridad de la colonia» en «Más filtros» de Jornadas y de Reportes (cinco niveles y
    «Sin dato»), con su ficha.
  · **Reporte de la jornada** (vista previa y PDF): «Prioridad de reforestación», «Árboles por
    prioridad de la colonia» y la columna «Prioridad» en la tabla de ejemplares; la nota al pie de
    la tabla dice de dónde sale y que cerca de un límite es aproximada.
  · **Informe de Supervisión** (PDF): además del apartado «Por prioridad de la colonia» (D206), la
    tabla de jornadas lleva la columna «Prioridad»; la lista de jornadas en pantalla también la dice.
    La tabla CSV ya trae la prioridad de cada árbol.

- **D208. Paleta de prioridades (bloque 144).** Liber, 01-10-2026.
  La paleta de las colonias prioritarias es la del modelo de priorización, fijada por Liber:
  Muy alta `--p4` #7F1D12, Alta `--p3` #C2421B, Media `--p2` #E88A2E, Baja `--p1` #F4C56E y Muy baja
  `--p0` #F9E7BF. Sustituye al tono único de D206 (`--pri-0` a `--pri-4`). Vale para la capa en los
  tres mapas, las leyendas y las muestras de color de tarjetas y puntos. El nivel se sigue diciendo
  con texto en todos lados.

- **D209. Controles de la capa de prioridades sobre el mapa (bloque 145).** Liber, 01-10-2026.
  La capa de colonias prioritarias se maneja desde un botón de capas en la esquina superior derecha
  del mapa (44 × 44), que abre un panel con: el interruptor «Colonias prioritarias», una casilla
  por nivel (Muy alta a Muy baja) con su muestra de color, y la opacidad (10 a 100 %, de 5 en 5).
  Sustituye a la casilla que estaba debajo del mapa.
  · **Dónde:** en los tres mapas: Nuevo registro, la ficha de la jornada y Supervisión. En
    Supervisión la capa es el mapa mismo: no lleva interruptor, sí niveles y opacidad.
  · **Qué se recuerda:** encendido, niveles y opacidad, en el equipo (`srp_capa_prioritarias`), por
    grupo de mapas: los de campo comparten un ajuste (opacidad inicial 45 %) y Supervisión tiene el
    suyo (90 %). Es preferencia de pantalla: no cambia ningún dato ni ningún informe.
  · **Leyenda:** bajo el mapa, sólo con los niveles visibles. Escape cierra el panel; tocar o
    desplazar dentro del panel no mueve el mapa.

- **D210. Origen de la jornada: programada o pedido especial (bloque 146).** Liber, 01-10-2026.
  Una jornada puede venir del programa de trabajo o de un pedido especial de otra instancia (SOBSE,
  una alcaldía, otra dependencia). Es un dato de la jornada, distinto de la institución que ejecuta
  (`organizacion_id`) y del programa: quien pide no es quien planta.
  · **Campos:** `origen` (PROGRAMADA por omisión, o PEDIDO), `solicitante_id` (del catálogo de
    instituciones), `solicitante_otro` (el nombre, cuando la instancia no está en el catálogo) y
    `pedido_descripcion` (opcional). **No se pide oficio ni folio de la solicitud** (Liber).
  · **Captura:** lo marca quien inicia la jornada, en «Origen de la jornada»; se corrige en «Editar
    jornada». Con «Pedido especial» es obligatorio decir quién lo solicita. Al volver a «Programada»
    los datos del pedido se vacían. Las jornadas de carga masiva nacen programadas; una jornada sin
    el dato se lee como programada.
  · **Dónde se ve:** «Pedido especial · SOBSE» en la franja de la jornada activa, en las tarjetas de
    Jornadas y de Reportes y en el encabezado de la ficha; en el reporte de la jornada, «Pedido
    especial solicitado por» y «Descripción del pedido».
  · **Filtro «Origen»** en «Más filtros» de Jornadas, Reportes y Supervisión: Programada, Pedido
    especial (todos) y cada solicitante.
  · **Supervisión e informe:** apartado «Pedidos especiales» (cuántas jornadas y árboles del periodo
    fueron a solicitud de otra instancia, y de quién), sólo si hubo alguno; el CSV lleva origen,
    solicitante y descripción por árbol.
  · Una institución que solicita alguna jornada cuenta como usada: no se elimina del catálogo.

- **D211. El panel de la capa de prioridades cabe en el mapa del teléfono (bloque 147).** Liber, 01-10-2026.
  En el teléfono el panel de D209 se salía del mapa por abajo y la opacidad no se alcanzaba. Ahora se
  abre al lado del botón (no debajo), con los niveles en dos columnas y la opacidad en un renglón:
  mide unos 200 px de alto y cabe en el mapa más bajo (240 px) y en el teléfono más angosto (320 px).
  Al abrirse toma como máximo el alto y el ancho del mapa; si aun así no cupiera, se desplaza por
  dentro. Nueva herramienta `pruebas/auditoria_css.py`: auditoría de la hoja de estilos (norma,
  tokens, limpieza y estilos fuera de la hoja); sólo lee.

- **D212. Limpieza de la hoja de estilos y su norma de medidas (bloque 148).** Liber, 01-10-2026.
  Resultado de la auditoría de CSS. La hoja queda con la norma comprobable por `pruebas/auditoria_css.py`,
  que ahora corre dentro de `pruebas/auditoria.py` y falla si algo se sale.
  · **Medidas con token:** espacios `--e-*` (se agregan `--e-15`, 6 px, y `--e-25`, 10 px), letra
    `--t-*` (se agrega `--t-xxs`, 12 px), radios `--radio*` (se agregan `--radio-chico` 6 px,
    `--radio-min` 2 px y `--radio-grande` 18 px), capas `--z-*` (escala nueva, con los mismos
    valores que había) y duraciones `--dur-rapida` y `--dur-media`.
  · **Quedan escritas, a propósito:** las medidas propias de un componente (altos de control,
    iconos, mapas), las relativas a la letra (em) y los ajustes de hasta 3 px.
  · **Una regla por selector:** lo común a varios va en un grupo y lo propio de cada uno, en su regla,
    junto a su grupo («h1, h2 {…}» y enseguida «h1 {…}»). Esa forma se conserva: repetir las
    declaraciones en cada selector sería peor. Lo propio que estaba lejos de su grupo se llevó a su regla.
  · **Bloques idénticos:** se unen los del mismo componente (tres casos). Los de componentes distintos
    (once) se dejan: unirlos ataría componentes sin relación; la auditoría los lista «para saber».
  · **Fuera:** tres clases sin uso (`.aviso-envio`, `.campo-doble-fijo`, `.filtros-fila`) con sus siete reglas.
  · **Lo que cambia a la vista:** nada perceptible. Comparados los estilos calculados de todos los
    elementos en 114 pantallas (teléfono, tableta y escritorio, tres perfiles y los catorce diálogos),
    sólo cambian seis ajustes de 1 px o menos al entrar a la escala (un relleno de 7 a 8 px, una
    separación de 5 a 4 px, una letra de 12.8 a 13 px, una sangría de lista) y radios que se ven igual.
  · **No se tocó:** los seis selectores de cuatro niveles (tablas rayadas y contraste alto: son así por estructura).

- **D213. Sin conexión: versión nueva completa, pendientes a la vista y árbol a medias (bloque 149).** 02-10-2026.
  Resultado de la auditoría integral del 02-10-2026 (hallazgos A-07, M-19, M-23 y B-39). Se corrige en el
  teléfono lo que seguirá igual cuando exista el servidor; el alcance por cuenta, los permisos, el folio
  y la bitácora se dejan escritos como reglas del servidor (S-15 a S-18), porque ahí se impondrán.
  · **Versión nueva sin quedarse a medias:** el teléfono sigue con su versión guardada mientras la nueva
    no esté completa. La página guardada pregunta a la red qué versión está publicada y, si es otra, pide
    instalar su worker; éste baja todos los archivos y sólo entonces toma el control. Si la descarga se
    corta, no cambia nada y se reintenta al volver a la app o al recuperar la señal. La versión nueva se
    aplica sola con una recarga cuando no interrumpe: sin ventana abierta, sin árbol a medias y sin edición.
  · **Pendientes a la vista sin señal:** al guardar sin señal el indicador dice cuántos registros esperan
    envío; antes seguía en «Al día».
  · **Un envío a la vez:** dos avisos seguidos de «volvió la señal» ya no envían dos veces ni gastan dos
    folios por árbol (la marca del envío en curso se ponía después de una espera).
  · **El árbol a medias no se pierde:** punto, especie, comentarios, fecha y fotografía se copian en el
    teléfono cada vez que cambian (`srp_borrador_arbol`). Tras recargar, cerrar o volver de la cámara, el
    árbol reaparece al entrar a «Nuevo registro» con la misma cuenta y la misma jornada, y se avisa. Se
    borra al guardar o al descartar. No aplica a ediciones ni a sustituciones.
  · **Botón «atrás» del navegador:** cada sección queda en el historial. «Atrás» cierra la ventana abierta
    o vuelve a la sección anterior; con un árbol a medias no sale de «Nuevo registro» y lo dice.
  · **Iconos de instalación:** los tres iconos del manifiesto se guardan para abrir sin señal.
  · **No se hace en el teléfono:** jornada íntegra tras un relevo, permisos del relevo devuelto, cambio de
    institución de una cuenta, folio inmutable ante escrituras con copia anterior, consulta de eliminados
    y registro de cambios de árboles y jornadas. Quedan como reglas S-15 a S-18 del esquema y filas 21 a 24
    de `FASE2-Y-TRASPASO.md`. Las herramientas de prueba no se restringen: desaparecen con la versión real.
- **D214. Lo que se descarga: tabla sin fórmulas, letra del sistema en el PDF y totales que suman (bloque 150).** 02-10-2026.
  Resultado de la auditoría integral del 02-10-2026 (hallazgos M-13, M-20, B-32 y B-35). Son correcciones
  del teléfono que no cambian con el servidor: los informes y la tabla se arman aquí.
  · **Tabla CSV sin fórmulas:** un texto que empieza con «=», «+», «-», «@», tabulador o retorno sale con un
    apóstrofo delante. Excel lo muestra como texto y no lo calcula ni lo abre como enlace. Las cifras
    (la longitud es negativa) quedan como cifras.
  · **Roboto incrustada en los PDF:** el informe por periodo y el reporte de la jornada se escriben con la
    letra de la pantalla, en normal, negrita y cursiva. Una letra fuera del alfabeto básico (una «ā» en un
    nombre) ya no deforma el renglón. Los tres archivos TTF (latino básico y extendido, unos 32 KB cada
    uno) se leen al generar el primer PDF y quedan guardados para trabajar sin señal. Si no pudieran
    leerse, el PDF sale con Helvetica, como antes. El informe pesa unos 95 KB y el reporte unos 120 KB.
  · **Un solo formato de fecha y de cifra:** el sello del pie y el historial de un registro dicen
    «02-OCT-2026, 12:07 h», la fecha de todo el sistema con hora de 24 horas. «Árboles por jornada» usa
    punto decimal, igual que las demás cifras (coma de millares, punto decimal).
  · **La serie suma su total:** cada jornada cerrada cuenta una vez, en la casilla de su primer árbol del
    periodo. Una jornada de varios días que empezó antes del periodo ya no deja la columna en cero con
    el pie en uno.
  · **Eliminados por día local:** un árbol eliminado después de las 18:00 cuenta en el día en que se
    eliminó, con la misma conversión que las ediciones.
  · **Títulos del informe:** un título de sección no se queda solo al pie de la página; pasa a la
    siguiente junto con su tabla.
- **D215. Jornadas y reporte: un solo inicio, reporte vigente y sustitución que no deja la jornada abierta (bloque 151).** 02-10-2026.
  Resultado de la auditoría integral del 02-10-2026 (hallazgos M-18, M-14 y M-15). Son reglas del
  teléfono que el servidor deberá respetar igual.
  · **Un solo inicio:** dos toques seguidos en «Iniciar jornada» inician una sola jornada; el botón dice
    «Iniciando…» mientras se guarda.
  · **El reporte cuenta al entregarse:** `reporte_en` se fija cuando el PDF se descarga o se comparte. Abrir
    la vista previa guarda los datos del cierre, pero no da el reporte por generado. Si se cancela la hoja
    de compartir, tampoco.
  · **El reporte vale para lo que la jornada tenía:** si la jornada se reabre, o si uno de sus árboles se
    elimina, se restaura, se edita, se mueve a otra jornada (cambian las dos) o se sustituye, `reporte_en`
    vuelve a nulo en la misma operación y la bitácora lo dice («Su reporte deja de estar vigente: …»).
    Reportes y Supervisión la muestran sin reporte hasta que se genere de nuevo. No se agrega un campo:
    la constancia de que hubo un reporte anterior está en la bitácora.
  · **Sustituir en una jornada cerrada:** antes de reabrirla se pregunta, y se avisa si tiene reporte. Al
    guardar el sustituto o al cancelar, la jornada vuelve a cerrarse; ya no queda abierta fuera de las
    cifras de Supervisión.
- **D216. Pruebas que corren en cualquier equipo, textos al día y accesibilidad de los mapas (bloque 152).** 02-10-2026.
  Resultado de la auditoría integral del 02-10-2026 (hallazgos M-22, B-29, B-31 y B-36). Cierra las
  correcciones del teléfono que no dependen del servidor.
  · **Pruebas sin rutas fijas:** `prueba.py`, `auditoria.py` y `revisar.py` ubican el proyecto a partir de
    su propia carpeta y dejan lo que descargan en una carpeta temporal. `SRP_BASE` y `SRP_SALIDA` cambian
    la dirección de la aplicación y esa carpeta. `pruebas/requisitos.txt` lista las cinco bibliotecas. El
    README dice el tiempo real: de 25 a 35 minutos el recorrido completo.
  · **Fecha máxima al día:** el calendario de «Iniciar jornada» toma el máximo cada vez que se muestra;
    con la aplicación abierta de un día para otro ya deja elegir hoy.
  · **Mapas de Supervisión:** dejan de declararse imagen y pasan a ser un grupo con etiqueta, de modo
    que un lector de pantalla alcanza sus controles; la etiqueta remite a la tabla de al lado, que trae
    las mismas cifras.
  · **Indicador de conexión:** se ve igual (32 px) y su área sensible mide 44 px o más de alto.
  · **Textos al día:** el aviso de los datos de demostración dice lo que carga (más de 1,300 jornadas y
    17,000 árboles, de la Secretaría y de otras instituciones); el diccionario dice cinco catálogos; el
    README usa los nombres de pantalla («árboles que se van a plantar», Usuarios en el menú de la
    cuenta). Los comentarios del código ya no nombran a personas.
- **D217. Catálogo propio de solicitantes de pedidos especiales (bloque 153).** 02-10-2026. Decisión de Liber.
  «Quién lo solicita» tomaba el catálogo de instituciones, que es el de quienes ejecutan y tienen
  cuentas; quien pide un pedido especial no planta ni entra al sistema, y la lista no se podía ajustar
  sin tocar cuentas, filtros e informes.
  · **Catálogo `solicitante`**, sexto de la tabla `catalogos`, con `tipo_solicitante`. Se administra en
    Catálogos › Solicitantes: agregar, editar (nombre y tipo), desactivar y, sin uso, eliminar. La clave
    la pone el sistema y no se muestra.
  · **Tipos propios**, lista fija de siete (`SRP.ref.TIPOS_SOLICITANTE`): Alcaldía, Dependencia de
    gobierno, Congreso, Empresa, Organización civil, Escuela y Vecinos. Agrupan la lista y la tabla.
  · **De arranque**, los que dio Liber: las 16 alcaldías sin la palabra «Alcaldía» y en orden
    alfabético, Secretaría de Obras y Servicios (SOBSE), Secretaría de Gestión Integral del Agua
    (SEGIAGUA), Jefatura de Gobierno y Diputadas y diputados. PAOT, Green Cover, Reforestamos y la
    propia Secretaría ya no aparecen como solicitantes.
  · **«Otra instancia» se conserva**: el cabo escribe el nombre si el solicitante no está en el
    catálogo; la Administración lo da de alta después.
  · **El nombre se lee como se guarda**: «Pedido especial · Iztapalapa». En la lista, el grupo
    «Alcaldía» dice de qué se trata.
  · **Lo ya capturado**: al abrir, una jornada cuyo solicitante era una institución pasa al
    solicitante que le corresponde (una alcaldía, SOBSE) o queda escrita con su nombre como «Otra
    instancia». Un teléfono con capturas recibe el catálogo nuevo sin perder nada (sello
    `2026-10-02-solicitantes`).
  · **Sin cambio**: la institución que ejecuta, los filtros «Origen», el apartado «Pedidos
    especiales» de Supervisión, el reporte y el CSV; sólo cambia de dónde sale el nombre.
- **D218. Registrar viendo la jornada: editarla desde la franja, sus árboles en el mapa y aviso al llegar a lo previsto (bloque 154).** 02-10-2026.
  Pedido por Liber al probar el registro en campo.
  · **«Editar jornada» en la franja de «Nuevo registro»:** junto a «Cambiar jornada» y «Cerrar jornada»,
    con el mismo formulario de la ficha de Jornadas y el mismo permiso (`jornada.editar`). Al guardar se
    sigue en «Nuevo registro»; la franja, la fecha y el mapa se ponen al día.
  · **Los árboles de la jornada, a la vista mientras se registra:** el mapa de registro dibuja como punto
    cada árbol activo de la jornada (verde; morado si es sustituto). El marcador de gota queda sólo para el
    árbol que se está ubicando. Al pasar el cursor o al tocar un punto se lee la especie y el folio, y bajo
    el mapa aparece su renglón con «Ver», que abre la ficha del árbol sin salir del formulario.
    Tocar un punto no mueve el marcador. Sólo se dibuja la jornada con que se registra; al corregir un
    árbol, los demás de su jornada. La primera vez que se ve una jornada, el mapa encuadra lo ya plantado.
  · **Aviso al llegar a lo previsto:** cuando el árbol guardado es el último de los previstos, la misma
    confirmación «Registro exitoso» lo dice en un segundo renglón, dura 4 s en lugar de 1.5 y vibra dos
    veces. Es un solo aviso, no dos que se encimen. Después queda escrito en la franja, resaltado, junto a
    «Cerrar jornada»; pasado lo previsto, la franja dice cuántos van de más y el aviso no se repite.
  · **Ficha del registro:** «Editar» y «Sustituir árbol» van uno junto al otro; si no caben, uno bajo el
    otro con su separación.
  · **Fechas con «Hoy»:** los campos de fecha que llevan «Hoy» al lado (inicio de jornada, fecha de
    plantación, editar jornada y sustitución) no enseñan el botón de calendario del navegador: tocar el
    campo abre el calendario. En la sustitución el campo y «Hoy» están siempre disponibles; si el árbol
    perdido se plantó hoy, el calendario sólo ofrece hoy y la ayuda lo dice.
  · **Reporte de jornada sin la gráfica «Ejemplares por especie»:** la tabla «Totales por especie» ya da
    ese dato, con todas las especies. La sección 6 pasa a llamarse «Distribución de las especies» y conserva
    su barra. Modifica D163 y D168 en lo que toca a esa gráfica.
- **D219. Listas que se ordenan, sustituciones a la vista, varios coordinadores por cabo y mapa de colonias intervenidas (bloque 155).** 02-10-2026. Decisión de Liber.
  · **Orden de las listas:** Jornadas, Registros, Reportes y Fotografías traen sobre la lista «Ordenar»,
    con «Lo más reciente primero» (como llegaban) y «Lo más antiguo primero». Se recuerda por lista en el
    dispositivo. No es un filtro: no aparece entre los filtros activos ni lo quita «Quitar filtros».
  · **Sustituciones en la tarjeta de la jornada:** una sexta cifra dice cuántos de sus árboles reemplazan
    a uno que se perdió. Se calcula de los árboles con `sustituye_id`; no se guarda.
  · **Usuarios, etiquetas:** «Cargo» (antes «Cargo y rol») y «Perfil de captura» (antes «Perfil»). Los
    campos siguen llamándose `cargo_rol` y `perfil`.
  · **Un cabo puede tener más de un coordinador:** `usuarios.coordinador_id` se sustituye por la lista
    `usuarios.coordinadores_ids` (vacía si no tiene; todos de su misma institución). Cada coordinador de
    la lista ve, edita y releva al cabo como antes el único. En el alta se marcan en una lista de botones.
    Las cuentas guardadas con el campo anterior pasan a la lista al abrir la base (`normalizar()`); no
    cambia la estructura de la base, así que no hay migración numerada. Modifica D192 en ese punto.
  · **Mapa «Por prioridad de la colonia» (Supervisión y Mi avance):** se pintan sólo las colonias donde
    se plantó en lo filtrado, con el color de su prioridad. Es una sola rampa de color —la de prioridad—;
    la cantidad de árboles no se pinta: va en la etiqueta de cada colonia y en la tabla. Modifica D206
    en lo que toca a ese mapa; en Nuevo registro y en la ficha de la jornada la capa sigue completa.
  · **Pedidos especiales:** el catálogo de solicitantes de arranque suma «Oficina de la Secretaría», que
    va primera en «Quién lo solicita»; el grupo «Dependencia de gobierno» va antes que «Alcaldía». La
    descripción del pedido es obligatoria. Un teléfono con capturas recibe el solicitante nuevo con el
    sello de datos `2026-10-02b-oficina`, sin reiniciar. Modifica D210 y D217 en esos puntos.
- **D220. El reporte se genera en la ficha de la jornada, el cabo descarga sus fotografías y la capa de prioridad se apaga en campo (bloque 156).** 02-10-2026. Decisión de Liber.
  · **Sin sección Reportes:** se quitan la pestaña y la lista de «Reportes de jornada». El reporte se
    genera desde la ficha de la jornada cerrada, con «Generar reporte»: datos del cierre, vista previa y
    PDF, sin salir de Jornadas. Pedir la sección anterior (un «atrás» de una versión vieja) lleva a
    Jornadas. Modifica D134 y D205.
  · **Filtro «Reporte» en Jornadas:** «Generado» o «Sin generar», sobre las jornadas cerradas; va en
    «Más filtros», con su ficha. La tarjeta de una jornada cerrada con árboles dice «Reporte generado …»
    o «Sin reporte todavía».
  · **Fotografías del cabo:** el cabo abre «Fotografías» desde «Mi avance», ve sólo las de los árboles
    que registró y las descarga una por una o todas en ZIP. Cumple M369 y modifica D118.
  · **Capa de prioridad en campo (Nuevo registro y ficha de la jornada):** arranca apagada. Encendida,
    pinta sólo las colonias de la jornada: las de sus árboles y la del punto que se ubica o, sin árboles,
    la de la ubicación de la jornada. La leyenda aparece sólo con la capa encendida. La prioridad del
    punto y de la jornada se siguen diciendo en texto. La preferencia se guarda con otra clave, así que
    todos los dispositivos arrancan con la capa apagada. Modifica D206 y D209.
  · **Encuadre del mapa de registro:** si el mapa no estaba a la vista al entrar, encuadra los árboles de
    la jornada la primera vez que se pinta visible.

- **D221. El origen de la jornada se elige a propósito (bloque 157).** 03-10-2026. Decisión de Liber.
  · **Qué:** «Origen de la jornada» es obligatorio al iniciar una jornada. La lista abre en «Seleccione el
    origen» y la jornada no inicia hasta elegir «Programada» o «Pedido especial».
  · **Por qué:** con «Programada» puesta de antemano, un pedido especial podía quedar registrado como
    programado sin que nadie lo decidiera. Modifica D210.
  · **Lo que no cambia:** al editar, la jornada muestra el origen que ya tiene; las de carga masiva y las
    anteriores sin el dato se leen como programadas.

- **D222. La tarjeta de jornada resume lo normal y marca la excepción (bloque 157).** 03-10-2026. Decisión de Liber, sobre un ejemplo con tres diseños.
  · **Qué:** la tarjeta de la lista de Jornadas deja las seis cajas de cifras. Dice «n de m árboles» con
    una barra de avance (azul en curso, verde completa, ámbar si cerró sin cuadrar), las especies, el
    estado con la hora de cierre, «Reporte: fecha y hora» cuando ya se generó, el lugar, el programa y,
    para coordinación y administración, quién la tiene a su cargo. Lo que pide atención va en marcas que
    sólo aparecen cuando existe: por revisar, faltaron o sobran frente a lo previsto, sustituciones y
    «Sin reporte todavía».
  · **Por qué:** una tarjeta ocupaba la pantalla del teléfono y repetía datos (previstos y registrados ya
    los decía «Completa»; «bien» era el complemento de «por revisar»); los ceros pesaban igual que un
    dato. Las cifras completas siguen en la ficha de la jornada.
  · **Textos:** «Pedido especial · Solicita: …», con «Alcaldía» delante cuando quien pide es una alcaldía,
    y «Colonia de prioridad…»: la prioridad es de la colonia. Modifica D128, D131 y D219 en lo que toca a
    la tarjeta.

- **D223. «Nuevo registro» enseña lo que cambia y pliega lo que no (bloque 157).** 03-10-2026. Decisión de Liber, sobre un ejemplo del flujo.
  · **Qué:** en teléfono la jornada activa deja a la vista su nombre, cuántos árboles van (con barra frente
    a lo previsto) y sus acciones; fecha, lugar, programa, pedido, prioridad y pasos van en «Ver detalle».
    La ficha del punto no aparece hasta que hay punto. La simbología de prioridad dice sólo los niveles
    que el mapa pinta. Comentarios mide un renglón hasta que se usa; la zona de fotografía, lo que un
    botón, y la foto cargada no enseña el nombre del archivo.
  · **Revisión con avisos:** en un árbol nuevo el botón dice «Guardar de todos modos». Si el árbol quedó
    lejos de los demás, el mapa los pinta y se ofrece «Cambiar jornada»; lo capturado sigue en el
    formulario. Al corregir un árbol la revisión no cambia.
  · **Lo que se conserva:** sin avisos el árbol se guarda de una vez (D130), «Registro exitoso» aparece al
    centro sin tapar los toques (D171) y «Guardar» sigue fijo al pie (D96). El aviso de iPhone (D149)
    pasa del primer guardado a la entrada.
  · **Por qué:** la pantalla se recorre por cada árbol; lo que no cambia entre un árbol y otro no debe
    ocupar la primera pantalla. Modifica D119, D138 y D149 en lo que toca a la presentación.

- **D224. Cuarto perfil: Directivo, que ve y no modifica (bloque 158).** 03-10-2026. Decisión de Liber.
  · **Los cuatro perfiles:** el cabo registra y lleva su cuadrilla en campo; el coordinador tiene varios
    cabos, registra y supervisa; el directivo —subdirecciones, direcciones de área y direcciones
    generales, un solo perfil; el cargo los distingue— ve y no registra ni crea jornadas; la
    Administración global (el SIA) configura, lleva catálogos y cuentas, y ve, edita y elimina todo, sin
    capturar.
  · **Alcance del directivo:** en la Secretaría, toda la Ciudad; en otra institución, sólo lo de la suya
    (alcance `institucion`: la jornada por su `organizacion_id`; el árbol, por la institución de quien lo
    capturó).
  · **Qué hace:** Supervisión, Jornadas, Registros y Fotografías en lectura; descarga tablas, fotografías y
    los reportes ya generados. No genera reportes: generar deja marca en la jornada y es de quien la
    lleva. «Descargar reporte» abre la vista previa del reporte tal como quedó y entrega el PDF sin
    escribir nada.
  · **Por qué:** quien dirige necesita ver jornadas, árboles y fotografías reales, no sólo un tablero.
    Modifica D87, que había retirado el perfil de consulta, y D192.

- **D225. Cada catálogo en su tabla, igual en el teléfono y en el servidor (bloque 160).** 03-10-2026. Decisión de Liber.
  · **Qué:** la tabla única `catalogos`, que distinguía seis catálogos con un campo `tipo`, se reparte en
    `programas`, `areas`, `especies`, `vehiculos`, `instituciones` y `solicitantes`, cada una sólo con sus
    campos. La base del teléfono pasa a la versión 8; la migración lleva cada renglón a su tabla antes de
    retirar la anterior. El modelo queda en diez tablas y 152 campos.
  · **Por qué:** de los 20 campos de la tabla única, 11 sólo aplicaban a un catálogo, y la base no podía
    exigir que una especie tuviera nombre científico ni impedir que un árbol apuntara a un vehículo. Con
    tablas distintas en el teléfono y en el servidor haría falta una capa de traducción que alguien
    tendría que mantener. Se hace antes del traspaso al SIA y sin datos reales capturados.
  · **Lo que no cambia:** la sección Catálogos y sus pestañas. En memoria cada renglón lleva `tipo` para
    que la pantalla sepa de qué catálogo es; ese dato no se guarda. La bitácora sigue diciendo `catalogo`
    como entidad: los identificadores no se repiten entre tablas.

- **D226. Menos filtros, y la simplicidad se revisa sola (bloque 161).** 03-10-2026. Decisión de Liber.
  · **Qué:** los filtros bajan de 50 a 37 entre las siete vistas que filtran. El periodo se elige con seis
    atajos —Todas, Hoy, Este mes, Este año, Un día, Un periodo—: las listas de Año y de Mes desaparecen
    de Jornadas, Registros y Fotografías. La institución es una sola lista agrupada por tipo, en lugar de
    dos listas dependientes (Jornadas, Registros, Fotografías, Supervisión y Usuarios). En Jornadas,
    «Pendientes» reúne lo que hay por atender —puntos por revisar, cifras que no cuadran, reporte sin
    generar— y sustituye a «Revisión» y «Reporte»; la prioridad de la colonia se lee en la tarjeta y deja
    de ser filtro. «Origen» se conserva en Jornadas y en Supervisión.
  · **Por qué:** cada filtro se agregó por una razón válida, pero la suma pedía hasta trece decisiones en
    una pantalla de teléfono. Año y Mes repetían lo que ya resuelve «Un periodo»; el tipo de institución
    sólo servía para llegar a la institución.
  · **Regla que queda:** ninguna vista pide más de ocho filtros, y a la vista quedan a lo más cuatro; el
    resto va plegado en «Más filtros». `pruebas/auditoria.py` lo cuenta y falla si se rebasa. Al cerrar
    cada bloque se dice qué se agregó a la pantalla y qué se pudo quitar. Ajusta D128, D129, D167 y D202.

- **D227. Supervisión y «Mi avance» en resumen, con los desgloses plegados (bloque 163).** 03-10-2026. Decisión de
  Liber, sobre un ejemplo con dos opciones; eligió la A.
  · **Qué:** arriba van las cifras (cuatro para quien supervisa, tres para el cabo), «Qué atender», las
    descargas y la gráfica. Cada desglose —por cabo, institución, alcaldía, prioridad de la colonia,
    especie, programa, pedidos especiales y calidad del dato— es un renglón que dice su dato principal y
    se abre al tocarlo. En el teléfono sólo «Por cabo» viene abierto; con ancho, todos. Lo que la persona
    abre o cierra se conserva al cambiar de periodo o de filtro.
  · **Por cabo:** lista a quienes tuvieron jornadas en el periodo; los demás van juntos en un renglón que
    se abre («12 sin jornadas en el periodo»).
  · **Tablas en el teléfono:** renglones con nombre, árboles y porcentaje arriba, y lo demás debajo con su
    etiqueta. Ya no se parten palabras ni se sale una columna de lado.
  · **Jornadas del periodo:** la lista se sustituye por un enlace a Jornadas con el mismo periodo y filtros.
  · **Cabo:** no ve pedidos especiales, eliminados, ediciones ni la tabla CSV; «Calidad del dato» es para él
    «Mis registros» (fotografía, GPS, sustitutos). Conserva los dos mapas, dentro de sus secciones.
  · **Por qué:** la pantalla medía quince pantallas de teléfono para la Administración global y seis para el
    cabo; la mitad eran fichas de cabos, doce de ellos sin jornadas. Todo tenía el mismo peso y las
    descargas quedaban al final.
  · **Lo que no cambia:** los cálculos (`js/indicadores.js`), el informe en PDF y la tabla CSV.

- **D228. Eliminar una cuenta o un valor de catálogo pide escribirlo (bloque 164).** 04-10-2026. Decisión de Liber.
  · **Qué:** la confirmación de lo que no se deshace lleva un campo: para un valor de catálogo hay que
    escribir «ELIMINAR»; para una cuenta, su correo. El botón rojo no se activa hasta que lo escrito
    coincide (sin distinguir mayúsculas ni espacios de los lados); Intro confirma sólo entonces.
  · **Por qué:** un toque de más en el teléfono no debe borrar algo que no vuelve. Escribir obliga a una
    pausa y, en la cuenta, a mirar de quién es.
  · **Alcance:** esas dos eliminaciones y, desde el bloque 165, deshacer una carga masiva, que pide
    escribir «DESHACER»: quita de una vez todos los árboles y jornadas de un archivo. Las demás
    confirmaciones siguen igual; lo que tiene uso sigue sin poder eliminarse y se desactiva.

- **D229. La solicitud es un programa; se retira el origen de la jornada (bloque 166).** 04-10-2026. Decisión de Liber.
  · **Qué:** ya no se pregunta el origen (programada o pedido especial). «Solicitud» es una opción más de
    la lista Programa, la última; al elegirla se piden quién lo solicita, del catálogo de solicitantes, y
    la descripción de la solicitud, obligatoria y en varios renglones (hasta 500 caracteres).
  · **Consecuencia aceptada:** la solicitud sustituye al programa. Sus árboles cuentan en «Solicitud» y
    no en Reforestación Urbana, Palmeras u otro; no se guarda a qué programa habría correspondido.
  · **Filtros:** desaparece «Origen» de Jornadas y de Supervisión; las solicitudes se filtran con
    Programa. Quién solicitó se ve en el desglose «Solicitudes» de Supervisión y en el informe.
  · **Catálogo:** «Solicitud» es un valor del catálogo de programas: la Administración puede renombrarlo
    o desactivarlo. El sistema lo reconoce por su identificador (`p-solicitud`), no por su nombre.
    De arranque lo usa sólo la Secretaría, para que las demás instituciones sigan con su único programa
    ya elegido; la Administración lo abre a otros tipos en Catálogos › Programas › «Quién puede usarlo».
  · **Datos:** `jornadas.origen` se retira y `pedido_descripcion` pasa a `solicitud_descripcion`. La base
    del teléfono sube a la versión 9: la jornada que era pedido especial pasa al programa «Solicitud»,
    con sus árboles, y conserva solicitante y descripción. El modelo queda en 151 campos.
  · **No se carga por archivo:** la carga masiva rechaza el programa «Solicitud», porque el archivo no
    trae quién lo solicita.
  · Sustituye a D210 y D221, y ajusta D217 y D226.

- **D230. Espejo de campos en cada pantalla que escribe; el fondo no se mueve con un diálogo abierto (bloque 166).**
  04-10-2026. Observaciones de Liber en iPhone.
  · **Espejo:** además del formulario del árbol, su detalle y el cierre del reporte, llevan «Campos que
    viajan a la base y no se ven en pantalla» Iniciar jornada (la jornada prevista), la ficha de la
    jornada (la guardada) y el alta y la edición de cuentas y de valores de catálogo (lo que pone el
    sistema). Sólo en la versión de prueba; se retira con ella.
  · **Diálogos:** con uno abierto, la página de atrás no se desplaza.
  · **Mapa de la jornada:** la simbología dice sólo los tipos de punto que hay en esa jornada; el texto
    bajo el mapa dice «Árboles por prioridad de la colonia», no «Colonias prioritarias», porque cuenta
    árboles. En el control de capas, con «Colonias prioritarias» apagada sus niveles se ven apagados.
  · **Botones del detalle:** «Sustituir árbol» ya no se parte en dos renglones; si no cabe junto a
    «Editar», baja completo.

- **D231. «Configuración» va en la barra de secciones, no en el menú de la cuenta (bloque 166).**
  04-10-2026. Petición de Liber: en el teléfono, el acceso debe quedar al alcance del pulgar.
  · La Administración global tiene «Configuración» como última pestaña de su barra, junto a Registros:
    abajo en el teléfono y arriba en la computadora, igual que las demás secciones.
  · Sale del menú de la cuenta, que queda con Modo sol, las opciones de prueba y Cerrar sesión.
  · Dentro de Usuarios, Catálogos, Parámetros, Registro de cambios, Carga masiva y Acerca del sistema,
    la pestaña «Configuración» sigue marcada; tocarla regresa a las tarjetas de Configuración.
  · Los demás perfiles no la ven ni la abren. Ajusta D158 y D195.
  · **Orden de la barra:** quien registra —cabo y coordinación— tiene Nuevo registro, Jornadas,
    Registros y, al final, Supervisión («Mi avance» para el cabo). Quien sólo consulta —dirección y
    Administración global— la conserva al principio. La coordinación sigue entrando a Supervisión.
  · **Alcaldías sin la palabra en los catálogos:** en Catálogos › Instituciones y en las listas de
    institución de los filtros, una alcaldía va sólo con su nombre («Iztapalapa»): que es alcaldía lo
    dice su tipo o el grupo de la lista. En texto corrido (reporte, informes, cuentas) se sigue
    leyendo «Alcaldía Iztapalapa», para que no se confunda con una colonia o una empresa.

- **D232. Especies escritas: lo escrito en «Otra especie» se lista para la Administración global (bloque 167).**
  04-10-2026. Petición de Liber: ver cuáles especies escriben los usuarios. La revisión se hace fuera
  del sistema —primero si es un error de escritura, después contra EncicloVida (CONABIO)—, así que la
  pantalla es sólo de consulta: no asigna, no da de alta y no cambia ningún registro.
  · **Dónde:** Configuración › «Especies escritas». La tarjeta dice cuántas hay.
  · **Qué se ve:** un renglón por cada cosa escrita, sin distinguir mayúsculas, acentos ni espacios
    («Fresno», «fresno », «FRESNO» son una), con cuántos árboles y jornadas, quién la escribió, entre qué
    fechas, las otras formas en que se escribió y, si la hay y es una sola, la especie parecida del
    catálogo. No cuentan los árboles eliminados.
  · **Descarga:** «Descargar en Excel», con las mismas columnas y la clave de la parecida, para
    revisarla fuera.
  · **Después de revisar:** la especie nueva se da de alta en Catálogos › Especies; el árbol toma la
    especie al editarlo y entonces deja de aparecer en la lista. El modelo de datos no cambia (151 campos).
  · **Alcance en la Etapa 1:** la lista sale de los árboles que hay en el dispositivo de quien
    administra. Reunir lo de todas las instituciones es del servidor (fila 27 de `FASE2-Y-TRASPASO.md`).

- **D233. La prioridad de reforestación es de la jornada, no de cada árbol (bloque 168).**
  04-10-2026. Petición de Liber: la prioridad ya se ve al registrar la jornada; repetirla en cada árbol
  —bajo el mapa, bajo las coordenadas y en los informes— no aporta. Un árbol puede caer en una colonia
  de otra prioridad que la de su jornada; se acepta.
  · **Prioridad de la jornada:** la de la colonia donde se ubicó. Sólo una jornada sin ubicación toma el
    nivel donde cayó la mayoría de sus árboles. Sustituye a D207.
  · **Iniciar jornada:** en lugar del texto, la escala de los cinco niveles en orden, de menor a mayor,
    cada uno con su color y su nombre; el de la colonia crece, lleva marca y se dice con palabras
    debajo («Baja · Los Reyes»). Elegida por Liber entre tres variantes (barra, lista, fichas).
  · **Nuevo registro:** se quitan «Prioridad» bajo el mapa y «Prioridad de reforestación de la colonia»
    bajo las coordenadas.
  · **Mapas de campo (árbol y ficha de la jornada):** queda sólo el polígono de la colonia de la
    jornada, con el color de su prioridad, encendido de entrada; un botón sobre el mapa lo apaga y lo
    enciende. Ya no hay panel de niveles ni opacidad ahí; sigue en el mapa de Supervisión.
  · **Ficha de la jornada y reporte diario:** sólo la prioridad de la jornada; se quitan el desglose
    «Árboles por prioridad de la colonia» y la prioridad de cada punto o árbol.
  · **Supervisión e informes:** «Por prioridad de la colonia» cuenta cada árbol en la prioridad de su
    jornada y pinta las colonias de las jornadas. La tabla de árboles (CSV) ya no trae prioridad.
  · Ajusta D206 y D209.

- **D234. Detalle del registro sin «Datos del sistema»; el lugar, sin la palabra «Alcaldía» (bloque 168).**
  04-10-2026. Observaciones de Liber.
  · **Detalle del registro:** se quita el grupo «Datos del sistema» (celda UGA, capas, identificador y
    envío): son de la base de datos y no le sirven a quien consulta. El folio pasa al frente de los
    datos. En la versión de prueba, esos campos siguen en el espejo.
  · **Lugar:** «Coyoacán · Col. Del Carmen», sin «Alcaldía», en la franja de la jornada, la franja
    «Guardado», la lista de jornadas y la ficha. Ajusta el formato único del lugar (M15).
  · **Botones al pie:** «Editar» y «Sustituir árbol», y «Corregir datos» y «Generar PDF» en la vista
    previa del reporte, llevan los dos contorno y el mismo tamaño; van en un renglón en computadora y
    uno bajo el otro en teléfono, donde no caben sin partir su texto.
  · **Mover a otra jornada:** con más de cinco jornadas, el diálogo trae buscador por nombre y fecha
    del día; se combinan y dicen cuántas quedan.

- **D235. Los informes dicen siempre sus fechas; Fotografías va por páginas (bloque 168).**
  04-10-2026. Observaciones de Liber.
  · **Informes en PDF:** bajo el título va siempre «Periodo: del 01-ENE-2026 al 31-DIC-2026», además del
    nombre del periodo cuando lo tiene (mes, año, todo el registro). Si el periodo termina después de
    hoy se dice el corte. «Todo el registro» va del primer árbol o jornada a hoy. El pie de cada página
    repite el periodo, para que una hoja suelta diga de cuándo es.
  · **Fotografías:** por páginas, como Registros y Jornadas, de 25 en 25 (rejilla); la cuenta, el peso
    y «Descargar todas» siguen siendo de todo lo filtrado.

- **D236. Avisos: menos repetidos, ámbar para lo que no es falla y «en curso» hasta que termine (bloque 169).**
  05-10-2026. A partir del inventario de avisos (77 flotantes), con el visto bueno de Liber.
  · **Dos avisos menos:** «Jornada activa: …» (la franja ya lo dice) y «Catálogo actualizado» (la lista
    ya cambió) dejan de mostrarse; se siguen anunciando al lector de pantalla.
  · **El rojo es para lo que salió mal.** Pasan a ámbar 17 avisos que dicen una regla o una espera, no
    una falla: «Las alcaldías son fijas», «No puede desactivar su propia cuenta», «No se puede eliminar:
    aparece en…», «Sólo se mueve a otra jornada del mismo cabo», «Sin conexión… se enviarán solos»,
    «Sigue abierta la jornada…», entre otros. Siguen en rojo las fallas (no se pudo guardar, no se pudo
    generar el PDF), los datos mal puestos (rango de fechas al revés) y la falta de permiso.
  · **Duración:** el ámbar dura 6 s de base (antes 4.5 s), porque suele traer una regla que hay que leer;
    verde, 4.5 s; rojo, 7 s; con «Deshacer», 8 s; más 1 s por cada 40 caracteres.
  · **«Generando reporte…»** ya no se cierra a los 4.5 s: se queda hasta que el resultado lo sustituye;
    si no hay resultado (se canceló), se quita (`anunciar(…, { fijo: true })`, `quitarAviso()`).

- **D237. Jornada completa con ventana propia; un árbol de más se pregunta una vez; al cerrar se ofrece actualizar lo previsto (bloque 170).**
  05-10-2026. Petición de Liber, sobre una propuesta acordada en la conversación.
  · **Jornada completa:** al guardar el último árbol previsto ya no sale la tarjeta «Registro exitoso»
    con un renglón extra, sino una ventana distinta: «Jornada completa. Registró los 3 árboles previstos
    en «[jornada]»». No se cierra sola y ofrece «Cerrar jornada» o «Seguir registrando». Desde ahí,
    «Cerrar jornada» no vuelve a preguntar si no queda nada pendiente. Sustituye lo de D171 para ese caso.
  · **Un árbol de más:** con lo previsto ya registrado, el siguiente árbol se confirma antes de guardar
    («Este sería el árbol 4 de la jornada… ¿Lo registra de todos modos?»). Se pregunta una vez por
    jornada y se recuerda en el dispositivo: plantar de más es normal y preguntar en cada árbol sumaría
    un toque por árbol. Al cancelar, lo capturado sigue en pantalla. La sustitución no pregunta.
  · **Al cerrar con árboles de más** —desde Nuevo registro o desde la ficha— se ofrece actualizar los
    árboles previstos a lo registrado («Actualizar a 5» / «Dejar en 3»). Al actualizar, la conciliación
    cuadra y el cambio queda en el historial de la jornada; al dejarlo, la conciliación dice cuántos sobran.
  · La confirmación genérica acepta otro nombre para su segunda salida (`cancelar`), que entonces va
    neutra y sin tache.

- **D238. Una jornada con árboles en otra colonia los enseña y los dice; su prioridad sigue siendo una (bloque 171).**
  05-10-2026. Consulta de Liber sobre una jornada con árboles en dos colonias; propuesta aprobada.
  · **Mapas de campo (Nuevo registro y ficha de la jornada):** se pintan la colonia donde se ubicó la
    jornada y las colonias donde cayeron sus árboles, cada una con el color de su prioridad. El mismo
    botón las enciende y las apaga.
  · **Ficha de la jornada:** después de la prioridad, «1 árbol en otra colonia, de prioridad media»;
    con varias prioridades, «3 árboles en otras colonias: 2 de prioridad media y 1 de prioridad alta».
  · **Reporte de la jornada:** renglón «Árboles en otra colonia», debajo de «Prioridad de reforestación»,
    con el nombre de cada colonia: «1 en Pro Hogar, de prioridad media». Sólo aparece si los hay.
  · **Lo que no cambia (D233):** la prioridad de la jornada es la de la colonia donde se ubicó, y
    Supervisión e informes siguen contando cada árbol en la prioridad de su jornada. Los árboles que
    quedan fuera de la capa no se mencionan.

- **D239. Catálogo de especies: el Excel sale con la forma del libro de origen; «Especies escritas» vive en Catálogos › Especies (bloque 172).**
  05-10-2026. Petición de Liber.
  · **Descarga:** el archivo se llama `CGO_ESPECIES_REFORESTACION_URBANA_[fecha].xlsx` y trae las tres
    hojas del original: «especies» (las once columnas con sus nombres de campo: `id_especie`, `genero`,
    `especie`, `nombre_cientifico`, `nombre_comun`, `otros_nombres_comunes`, `tipo_distribucion`,
    `id_snib`, `formadecrecimiento`, `id_enciclovida`, `nota_discrepancia`), «diccionario_datos» y
    «catalogos». Así lo que sale del sistema se revisa con las mismas herramientas que el original.
    Género y especie se obtienen del nombre científico; las notas de discrepancia y las hojas de
    referencia las guarda `herramientas/generar_especies.py` en el catálogo generado. Ya no lleva las
    columnas «Estado» y «Usos», que se ven en pantalla.
  · **Especies escritas** deja de ser tarjeta de Configuración: se abre con un botón en Catálogos ›
    Especies, que dice cuántas hay, y regresa ahí. Sigue siendo sólo consulta (D232).
  · **Solicitantes:** al agregar no se ofrece el tipo «Alcaldía»: las dieciséis ya están en el catálogo.
    La que ya lo es lo conserva al editarla.

- **D240. La entrada de prueba ofrece una cuenta por rol distinto (bloque 172).**
  05-10-2026. Petición de Liber: la lista tenía 29 cuentas y un grupo «Datos de demostración» que se
  confundía con la herramienta del mismo nombre.
  · Se listan siete: Administración global, Directivo, Coordinador y Cabo de la Secretaría, y
    Directivo, Coordinador y Cabo de una alcaldía. Sustituye la lista anterior, de un par por tipo de institución.
  · Las demás cuentas de arranque (Gobierno de la CDMX, empresa, organización civil) y las de los datos
    de demostración siguen existiendo —son dueñas de sus jornadas y aparecen en filtros y Supervisión—
    pero no se ofrecen para entrar.
  · Las cuentas que se den de alta en Usuarios sí aparecen, en el grupo «Cuentas dadas de alta en
    Usuarios», para poder probarlas.
  · Con datos reales la entrada de prueba no existe (`ES_FICTICIO: false`): permite entrar sin
    contraseña. En el ambiente de pruebas del SIA puede conservarse.

- **D241. En una ventana, el campo que se escribe queda a la vista (bloque 172).**
  05-10-2026. Reporte de Liber en iPhone: en «Datos de cierre de la jornada», al tocar «Personal
  participante» salía el teclado y el campo quedaba tapado por el pie fijo.
  · Al enfocar un campo dentro de una ventana, y otra vez cuando el teclado termina de salir, el campo
    se lleva al centro de la ventana.
  · Con el teclado en pantalla, la ventana se limita al alto visible y su pie deja de estar fijo.
  · Aplica a todas las ventanas con campos. No probado en iPhone por Claude.

- **D242. Supervisión se vacía al entrar con otra cuenta (bloque 172).**
  05-10-2026. Hallazgo de la corrida de pruebas: al cambiar de cuenta en el mismo dispositivo, mientras
  se leían los datos de la nueva, la lista «Quién registró» y las cifras conservaban por un instante
  lo de la cuenta anterior; una coordinación de otra institución podía leer nombres que no le
  corresponden. Ahora, al entrar con otra cuenta, Supervisión borra de inmediato listas y cifras, y
  sus controles esperan a que estén los datos propios.

- **D243. La edición de un árbol se distingue de la captura (bloque 173).**
  05-10-2026. Petición de Liber; eligió la variante A entre tres ejemplos.
  · **Franja fija «Editando registro»** con el folio, que se queda arriba al desplazarse.
  · **Marco de acento** alrededor de ubicación y campos.
  · El botón dice **«Guardar cambios»**, también en la ficha de revisión.
  · Los campos conservan su apariencia. Se descartó marcarlos con línea punteada o en ámbar: el
    punteado ya significa «aquí se agrega una fotografía» y el ámbar, «advertencia».
  · «Nuevo registro» y la sustitución no cambian.

- **D244. Supervisión cuenta cada árbol en la colonia donde quedó, y cada nivel de prioridad por separado (bloque 174).**
  05-10-2026. Petición de Liber, tras probar una jornada con dos árboles en una colonia de prioridad muy
  alta y uno en otra de muy baja: Supervisión decía «3 de 3 en alta o muy alta» y pintaba una colonia.
  · «Por prioridad de la colonia» cuenta cada árbol en la prioridad de la colonia donde quedó plantado,
    aunque su jornada se haya ubicado en otra. El mapa pinta todas las colonias con árboles.
  · Ya no se suman «alta o muy alta»: el encabezado, la frase y el informe en PDF dicen cada nivel por
    separado («2 en muy alta · 1 en muy baja»). El pie de la tabla del PDF es el total.
  · **Sustituye a D233 en Supervisión e informes.** D233 sigue valiendo para la jornada: su prioridad es
    una, la de la colonia donde se ubicó, y así se dice en su ficha, su tarjeta y su reporte (D238).

- **D245. El botón de capas elige el mapa base —satélite o calles— y la simbología de las colonias va bajo el mapa (bloque 174).**
  05-10-2026. Petición de Liber.
  · En Nuevo registro y en la ficha de la jornada, el botón de capas abre un panel: «Mapa base»
    (Satélite, Calles) y la casilla «Colonias de la jornada». Sustituye al botón que sólo encendía o
    apagaba las colonias.
  · El mapa base elegido vale para todos los mapas (también los de la revisión y el detalle) y se
    recuerda en el dispositivo. «Calles» es el plano de calles del mismo proveedor y dominio que la
    imagen, así que la política de seguridad no cambia. El croquis del reporte sigue con imagen.
  · Bajo el mapa, la simbología dice qué prioridad es cada color de las colonias pintadas; sólo los
    niveles que se ven, y se oculta al apagar las colonias.

- **D246. «Cerrar jornada» desde «Jornada completa» cierra sin otra ventana (bloque 174).**
  05-10-2026. Petición de Liber: tras «Jornada completa» salía una segunda ventana de confirmación.
  Ahora cierra de inmediato y lleva a la ficha, que dice qué sigue (revisar puntos o generar el
  reporte). «Cerrar jornada» desde su botón habitual sí sigue preguntando. Sustituye lo de D237 para ese caso.

- **D247. Ajustes del bloque 174.**
  05-10-2026. Peticiones y un defecto reportado por Liber.
  · **Revise antes de guardar:** en computadora, «Cambiar jornada» y «Guardar de todos modos» van en un
    renglón, del mismo tamaño; en teléfono, uno debajo del otro.
  · **Especies escritas** se presenta en tabla (siete columnas); en teléfono, como fichas.
  · **Defecto:** la Administración global no podía editar ni sustituir un árbol: «Editar» la llevaba a
    Registros, porque no tiene permiso de «Nuevo registro». Ahora el formulario se le abre para
    corregir; «Nuevo registro» sigue sin abrírsele.

- **D248. Los formularios van en una columna también en computadora (bloque 175).**
  05-10-2026. Petición de Liber, aprobada sobre una comparación del antes y el después.
  · **Nuevo registro, Editar árbol y Registrar jornada** se llenan de arriba abajo, en una columna
    centrada y en el mismo orden que en el teléfono. En dos columnas el orden de lectura no era claro
    (de «Ubicación» se saltaba a «Especie»). «Guardar» sigue fijo al pie mientras se llena el formulario.
  · **No cambian** la ficha de la jornada ni Supervisión (mapa junto a su lista o su tabla: no son
    formularios) ni las listas de tarjetas de dos en dos.
  · Sustituye lo que D109 y D145 decían de Nuevo registro y Registrar jornada en dos columnas.

- **D249. Cierre de la Etapa 1 y decisiones para el traspaso al SIA.**
  05-10-2026. Decisiones de Liber.
  · **La Etapa 1 se cierra con la versión 0.9.41.** Lo que siga en la aplicación son correcciones de
    las pruebas en teléfono, no funciones nuevas. Lo siguiente es el servidor.
  · **Nombre:** `srp` para el proyecto, su esquema y su ruta.
  · **Acceso:** base propia de usuarios, con correo y contraseña; el módulo de usuarios se construye en
    este proyecto. No hay servicio de correo: la contraseña la restablece la Administración global.
  · **Doble conteo entre instituciones:** el servidor acepta el registro y lo marca en una bandeja de revisión.
  · **Prioridad de la colonia:** el servidor la congela con el árbol al recibirlo, con la versión de la capa.
  · **Histórico cargado:** queda a nombre de la Administración global.
  · **Celdas UGA con prefijo distinto al de su alcaldía:** sus claves son correctas.
  · **Aviso de privacidad:** consultado; no se requiere.
  · **Repositorio:** uno nuevo y limpio con el mismo nombre, al iniciar la fase de servidor.
  · **Excel del catálogo de especies:** se queda como el libro de origen, sin hoja de estado y usos.
  · La etiqueta «Perfil de captura» se queda como está.

- **D250. Restablecimiento de contraseñas y prioridad de la jornada (bloque 177).**
  05-10-2026. Decisiones de Liber.
  · **Sólo la Administración global restablece contraseñas**, con una contraseña temporal de un solo
    uso. Las coordinaciones no restablecen las de sus cabos. Se descarta la propuesta de D249.
  · **La prioridad de la jornada también se congela** al recibirla, con la versión de la capa, igual que
    la de cada árbol (D249). Un reporte regenerado dice la misma prioridad aunque la capa cambie.
  · Frutales (M343) sigue abierta.

- **D251. Capas verificadas, colonias del IECM 2022, mapa base y convivencia con el módulo actual (bloque 178).**
  05-10-2026. Decisiones de Liber, con la comparación de capas hecha ese día.
  · **Capas verificadas.** Alcaldías: iguales a las del servidor de mapas del SIA (16 claves, misma
    superficie, diferencia máxima de borde de 0.1 m por el redondeo). Colonias y malla UGA: los archivos
    que entregó el SIA son idénticos, byte por byte, a los originales con que se generó la aplicación.
  · **Colonias:** las 1,837 del IECM 2022. Las 1,817 unidades territoriales del esquema `territorio` son
    otra capa y el SRP no la usa. Las capas viajan con el SRP y el servidor las carga en su esquema.
  · **Mapa base:** CARTO para «Calles» y Esri, en su modalidad gratuita, para «Satélite». La clave de
    CARTO la guarda el servidor, fuera del repositorio; la aplicación pide las teselas a través de él. Se
    aplica al adaptar la aplicación al servidor; mientras, sigue Esri en las dos.
  · **Módulo de plantación actual del SIA:** convive con el SRP hasta que éste opere; entonces se carga
    como histórico o se archiva.

- **D252. Paleta vegetal y fruto comestible en el catálogo de especies (bloque 179).**
  05-10-2026. Petición de Liber, aprobada sobre un ejemplo del antes y el después. Atiende M343 en parte.
  · **Catálogo nuevo:** el libro `16._Registro_plantaciones_catalogos_05_10_2026.xlsx`, con 79 especies:
    las 76 de la paleta vegetal de la Secretaría y Níspero (ESP-0077), Peral (ESP-0078) y Ciruelo
    (ESP-0079), fuera de ella. Dos campos nuevos en `especies`: `paleta_vegetal` (Sí · No) y
    `fruto_comestible` (Sí · No · Por determinar). Ese libro es el que lee la herramienta del catálogo y
    contra el que se compara el Excel que descarga la app; el anterior pasó a `_to_delete/`. En su hoja
    `diccionario_datos` se corrigieron los textos que ya no estaban al día.
  · **Alta y edición:** las dos preguntas son obligatorias y empiezan sin respuesta: se eligen a
    propósito. «Por determinar» es una respuesta válida para el fruto mientras el área técnica lo revisa.
  · **Lista:** marca «Fuera de la paleta» en ámbar (algo que mirar) y «Fruto comestible» en gris (un
    dato, sin carga: el verde significa «quedó bien»). Filtro «Mostrar»: todas, con fruto comestible o
    fuera de la paleta.
  · **Captura:** la lista de especies de Nuevo registro avisa «Fuera de la paleta vegetal». Sólo informa:
    estar fuera de la paleta no impide registrar.
  · **Teléfonos con capturas:** reciben las especies nuevas y las dos respuestas sin perder nada; una
    especie que dio de alta la Administración queda con el fruto «Por determinar» y la paleta por
    declarar al editarla.
  · Contar los árboles con fruto comestible en Supervisión e informes queda para cuando lean del servidor.

- **D253. El repositorio limpio ya existe desde el 02-10-2026 (bloque 181).**
  05-10-2026. Comprobado al iniciar la fase de servidor, para cumplir lo que D249 pedía hacer en ella.
  · El repositorio público `SISTEMA-PLANTACION` se creó de nuevo el 02-10-2026, con el mismo nombre, a
    partir del commit «repositorio sin historial previo» (Bloque 148). El sitio conservó su dirección.
  · Su historial (31 commits al 05-10-2026) no trae archivos originales del SIA ni ninguna de las 16
    placas reales; todos los commits van a nombre de `SedemaOficina`, sin correo personal. Nadie lo ha
    copiado (*forks*: 0). El repositorio anterior ya no está entre los públicos de la cuenta.
  · No queda nada por hacer en GitHub. Si el anterior se conserva como privado, se borra o no a juicio de
    Liber; mientras sea privado, nadie más lo ve.

- **D254. La base de datos del servidor: esquema `srp`, cuentas y permisos (bloque 182).**
  05-10-2026. Fase 1 de la fase de servidor.
  · **Las tablas salen del diccionario.** `herramientas/generar_sql.py` traduce `datos/esquema.json` a
    `servidor/sql/02_tablas.sql`: las diez tablas con sus campos en el mismo orden, tipos y nulos, su llave,
    sus índices, una regla por cada lista de valores, «único» donde el diccionario lo dice, las llaves
    foráneas de cada «→ tabla.id» y un comentario por tabla y campo. La auditoría falla si el guion queda
    atrasado. Las reglas en prosa que se imponen en la base (patrón del folio y de la especie, especie o
    especie escrita, motivo «OTRO» escrito, árboles previstos de 1 a 9999, hora, correo en minúsculas)
    están en la herramienta.
  · **Dos tipos del diccionario, corregidos:** `jornadas.hora` pasa de `time` a `varchar(5)` («HH:MM» o
    vacío: el teléfono guarda '' cuando no se elige, y un `time` no lo admite); `plantaciones.especie_id`,
    de `char(8)` a `text`, el tipo de `especies.id`, para que la llave foránea funcione. `relevos` es
    `jsonb` en el servidor. La aplicación no usa esos tipos: no cambia su comportamiento.
  · **Llaves foráneas diferibles** y sin borrado en cascada: lo que está en uso no se elimina. Diferibles
    para escribir juntos, en una transacción, un árbol perdido y su sustituto, que se señalan entre sí. No
    hay llave en `bitacora.usuario_id` (conserva el nombre por si la cuenta desaparece) ni en las listas.
  · **Lo propio del servidor va aparte**, no en las tablas del teléfono: `credenciales` (la contraseña
    sólo derivada con sal, temporal de un solo uso, intentos y bloqueo), `sesiones` (sólo el resumen del
    testigo; cada cierre dice por qué) y `migraciones` (la instalación es la versión 1).
  · **Dos cuentas:** `srp_propietario`, dueña de todo, que no se conecta, y `srp_servicio`, la del servicio:
    lee, agrega, cambia y borra datos, pero no crea, altera, vacía ni borra tablas, y a la bitácora sólo le
    agrega renglones. Quien administra la base no ve los datos sin asumir la cuenta propietaria. No hace
    falta superusuario para instalar.
  · **Instalación en una sola transacción** (`servidor/sql/instalar.sql`); falla si el esquema ya existe.
  · **Pruebas del servidor en Node.js** (`servidor/`, `npm test`), con el cliente `pg`: instalan,
    comparan cada tabla contra el diccionario, prueban reglas y permisos, y destruyen.
  · **Pendiente para la adaptación de la app:** `SRP.util.generarId()` debe dar siempre un UUID v4, también
    en su respaldo (FASE2-Y-TRASPASO, apartado 3).

- **D255. Base local con capas en PostGIS, catálogos y los datos de la aplicación (bloque 183).**
  05-10-2026. Petición de Liber: antes del acceso, tener en el equipo la base como quedará en el SIA y
  comprobar que todo corre. Liber pidió cargar la lista real de vehículos.
  · **Capas en PostGIS** (`servidor/sql/04_capas.sql`, parte de la instalación): alcaldías, colonias, malla
    UGA y colonias prioritarias, con índice espacial, cargadas de `assets/capas/` —las mismas de la
    aplicación— con `npm run cargar -- capas`. `srp.capas` anota la versión de cada una.
  · **El punto no agrega campos:** las tablas siguen guardando latitud y longitud, como el teléfono;
    `srp.punto(lat, lng)` da el punto y lleva índice espacial en árboles y jornadas.
  · **`srp.derivar(lat, lng)`** da alcaldía, colonia, celda UGA, distancia al borde de la celda y
    capa_version con las reglas de `js/derivacion.js`: primer polígono en el orden de la capa, borde
    dentro, alcaldía más cercana dentro del margen, colonia más pequeña donde se enciman. Las distancias
    se miden sobre el elipsoide; la aplicación usa una proyección local: difieren hasta un 1 %.
  · **Cargador** (`servidor/cargar.js`): capas y especies (también en el SIA), vehículos de un CSV (la lista
    real, sólo en el equipo), y lo que exporta `herramientas/exportar_datos_app.py` de un teléfono de prueba
    con la demostración (sólo local). Lo de la aplicación entra con la cuenta del servicio, en una
    transacción. Los identificadores que no son UUID (cuentas de prueba, demostración) toman un UUID fijo
    derivado de ellos.
  · **Resultado:** las diez tablas del teléfono caben sin cambios —ningún campo de más ni de menos— y
    cumplen todas las reglas y llaves. PostGIS ubica los 17,479 árboles y las 1,305 jornadas igual que la
    aplicación. La captura real calcula la ubicación sobre el punto ya redondeado a seis decimales
    (`SRP.mapa.colocar`), igual que el servidor.
  · **Defecto encontrado y corregido en la demostración** (M451): 178 duplicados simulados copiaban el punto
    del árbol anterior y no su ubicación, y en tres puntos a centímetros de un límite la ubicación se
    calculaba antes de redondear. No afecta a la captura real.

- **D256. Opacidad de las colonias en campo y sustitución en morado, sin la especie del perdido (bloque 184).**
  05-10-2026. Peticiones de Liber, aprobadas sobre un ejemplo del antes y el después.
  · **Opacidad:** el botón de capas de los mapas de Nuevo registro y de la ficha de la jornada lleva, bajo
    «Colonias de la jornada», la barra de opacidad (10 a 100 %, empieza en 45 %), la misma en los dos
    mapas y recordada en el teléfono. Con las colonias apagadas, la barra se apaga. Sustituye lo que D245
    decía de que en campo no hay opacidad que elegir; los niveles siguen siendo sólo de Supervisión.
  · **Sustitución en morado**, el color del árbol sustituto en el mapa: franja fija «Sustituyendo árbol» con
    especie, folio y motivo del árbol perdido; el aviso y el marco del formulario en morado; «Guardar
    sustituto» (en verde, el color de guardar) y «Cancelar sustitución».
  · **Nada del árbol perdido llega precargado.** Antes llegaba la especie, y se podía guardar el sustituto
    sin mirarla. Ahora queda vacía y el primer botón rápido es «La misma: …» —también si el perdido era una
    especie escrita—. La ubicación ya llegaba vacía y sigue así.
  · **Se descartaron:** la fotografía obligatoria al sustituir (la fotografía nunca es obligatoria) y una
    marca en el mapa de dónde estaba el árbol perdido (Liber prefiere el mapa sin ella).

- **D257. Ajustes de captura en el teléfono (bloque 185).**
  05-10-2026. Reportes de Liber al probar en iPhone.
  · **Al iniciar la jornada la pantalla vuelve arriba:** quedaba a la altura de «Iniciar jornada», al fondo del
    formulario, y se veían «Guardar» y el pie. El foco sigue en «Registrar ubicación del punto».
  · **«Jornada completa»:** su título recibe el foco para el lector de pantalla, sin el marco de foco, como
    los títulos de las vistas (aplica a todo título de nivel 2 que recibe foco por programa). La ventana
    mide lo que su contenido; en iPhone, al cerrarse el teclado, llegó a tomar por un instante todo el alto
    con huecos entre sus partes: si un navegador vuelve a estirarla, el contenido queda junto arriba.
  · **«Cancelar edición» y «Cancelar sustitución»** ocupan el mismo ancho que «Guardar», debajo de él.

- **D258. Registrar jornada sin repeticiones y «Jornada completa» con el cierre primero (bloque 186).**
  06-10-2026. Peticiones de Liber.
  · **Escala de prioridad:** el nivel de la colonia va resaltado y su nombre en negritas; ya no se repite
    debajo «Media · colonia» (la colonia ya está en su campo). Debajo sólo se escribe algo cuando no hay
    nivel que resaltar («Detecte la ubicación…», «Sin dato en la capa de prioridad»).
  · **Dirección de la jornada:** «Calle y número, entre calles o tramo» pasa al texto de ejemplo del campo;
    se quita la línea de ayuda. Sustituye a lo que D165 decía de esa línea.
  · **«Campos que viajan a la base»:** en Registrar jornada se veían dos, la de la jornada y la del árbol
    (con sus campos: sustituye_id, motivo_sustitucion, foto_id…), porque la del árbol estaba fuera de su
    formulario y no se ocultaba con él. Ahora sólo se ve la del formulario que está a la vista. Cada una
    enseña los campos de su tabla que no están en pantalla, con lo que se capturó y lo que el sistema pone
    por detrás.
  · **«Especifique la especie»** lleva el asterisco de obligatorio; ya no se podía guardar vacía.
  · **«Revise antes de guardar»** dice el programa sin «El de la jornada».
  · **«Jornada completa»:** «Cerrar jornada» va primero y «Seguir registrando» después; el texto dice
    «Registró los N árboles previstos en la jornada «…»».

- **D259. Fase 2 del servidor: acceso con cuentas propias (bloque 187).**
  06-10-2026. Lo decidido en D249 y D250, construido en `servidor/src/`.
  · **Servicio en Express**, montable en el backend central del SIA (`crearRutas`) o solo (`npm run
    iniciar`). La cuenta de la base es `srp_servicio`; en desarrollo, la de administración local la asume
    al conectar (`SRP_ROL`).
  · **Contraseñas:** scrypt (N 32768, r 8, p 1) con sal de 16 bytes; el texto guardado lleva algoritmo y
    parámetros. Nueva contraseña: al menos 10 caracteres, letras y números, sin el correo, distinta de la
    anterior. Temporal de doce caracteres sin letras que se confunden, en tres grupos, para dictarla.
  · **Sesión:** testigo al azar de 32 bytes en una cookie sólo HTTP, `SameSite=Strict`, con ruta `/api/srp`
    y segura en el SIA; la base guarda su resumen SHA-256. Vence tras 12 horas sin uso o a los 7 días.
    Se confía en un salto de intermediario para saber que la petición llegó cifrada.
  · **Bloqueo:** 5 intentos fallidos seguidos, 15 minutos. Una cuenta inexistente y una contraseña
    equivocada responden igual y tardan lo mismo. Lo demás (cuenta o institución desactivada, temporal
    vencida) sólo se dice con la contraseña correcta.
  · **Cuentas:** alta, restablecimiento y activación, sólo por la Administración global, con las reglas del
    formulario de Usuarios y su renglón de bitácora. La temporal se responde una sola vez y vale 72 horas.
    La Administración no se desactiva a sí misma. La edición de los demás datos de la cuenta va con los
    permisos (fase 3).
  · **Primera cuenta** de una base nueva: `npm run cuenta-inicial`, que crea también la Secretaría y el área
    del SIA si faltan, y se niega si ya hay Administración global.
  · Plazos, largo mínimo y bloqueo son parámetros de entorno; se moverán a Configuración › Parámetros
    cuando los parámetros vivan en la base.

- **D260. La ubicación de la jornada es obligatoria (bloque 188).**
  06-10-2026. Liber: se registraba una jornada sin coordenadas. Sustituye lo que D122 decía de que, sin
  tocar el botón, la jornada se guardaba sin punto.
  · «Registrar jornada» lleva «Ubicación de la jornada *» sobre «Detectar ubicación de la jornada». Sin
    punto —del GPS o de «Capturar coordenadas a mano»— no se registra: el error lo dice bajo el botón y en el
    resumen, y se va en cuanto hay punto.
  · «Editar jornada» no cambia la ubicación; la carga masiva ya ubica cada jornada. Las jornadas
    anteriores a esta regla pueden no tener punto, por eso `lat` y `lng` siguen admitiendo nulos.
  · El servidor rechazará una jornada nueva sin punto (validación de la recepción, fase 4).
  · **La prioridad junto a la colonia** (misma petición de Liber): en la tarjeta de Jornadas, en la franja
    de la jornada (activa o del registro que se edita) y en la ficha, el lugar se dice «Alcaldía · Col. … ·
    ■ Alta · dirección»: la muestra del color y el nombre del nivel entre la colonia y la dirección. Se quita
    el renglón aparte «Colonia de prioridad …». Sin dato de prioridad no se pone nada. El lector de pantalla
    oye «prioridad alta».
  · **«Editar registro» sin el recuadro** «Está editando el registro del … capturado por …»: la franja fija
    «Editando registro» con el folio ya lo dice. La sustitución conserva el suyo, que dice la fecha del
    sustituto y la jornada donde se guarda.

- **D261. La ventana «Sustituir árbol» en morado y con otros textos (bloque 188).**
  06-10-2026. Petición de Liber; eligió la variante B.
  · Franja de arriba e icono de intercambio junto al título en morado, el color del sustituto en el mapa.
    El botón «Registrar el sustituto» sigue azul (avanzar).
  · Texto: «El … (folio, fecha) se perdió por alguna razón. El nuevo árbol se registra en la misma jornada y
    queda en el mapa en morado.» La pregunta pasa a «Razón de la sustitución *».
  · La fecha no cambia: desde el día en que se plantó el árbol perdido —nunca antes del día de la jornada— y
    hasta hoy. Liber pidió que el mínimo fuera el día de la jornada; con la explicación (en una jornada de
    varios días permitiría fechar el sustituto antes que el árbol que reemplaza) aceptó dejarla igual.

- **D262. «Lo que viaja a la base de datos», una sola sección en todas las pantallas que guardan (bloque 188).**
  06-10-2026. Petición de Liber, aprobada sobre un ejemplo. Sólo en la versión de prueba.
  · Sustituye a «Campos que viajan a la base y no se ven en pantalla». En Nuevo registro, Editar, Sustituir,
    el detalle del árbol, Registrar jornada, la ficha de la jornada, el cierre del reporte, Usuarios y
    Catálogos dice lo mismo y en el mismo orden: **dónde se guarda** (la base del teléfono y su tabla; el
    esquema `srp` del servidor y su tabla), **lo que se ve en pantalla** con la etiqueta donde se captura
    (del diccionario de datos), **lo que no se ve** con de dónde sale, y el renglón de **bitácora** que se
    escribe en el mismo acto, cuando se escribe. Un valor muy largo (la fotografía) se recorta y dice cuánto mide.
  · **Defecto corregido:** en Registrar jornada no se desplegaba. Al tocar su título justo después de
    escribir en un campo, el campo avisaba su cambio y la sección se volvía a pintar entre que el dedo bajaba
    y subía. Ahora se actualiza su contenido sin reemplazarla.
  · El diccionario en el navegador (`js/esquema.js`) lleva ahora, por campo, dónde se ve en pantalla.

- **D263. El programa de la jornada, también a un toque (bloque 189).**
  07-10-2026. Petición de Liber tras probar en el teléfono; aprobada sobre un ejemplo.
  · En Registrar jornada, sobre la lista de programas, tres chips: «Reforestación Urbana» siempre primero,
    por ser el programa más común, y después los que más ha usado quien inicia la jornada; si ha usado
    pocos, completan los del catálogo en su orden. La lista completa sigue debajo.
  · Tocar un chip elige ese programa en la lista; elegir en la lista marca su chip. Con un solo programa
    posible (una alcaldía, una empresa privada) ya viene puesto y no hay chips.

- **D264. La confirmación «Registro exitoso» dura un segundo (bloque 189).**
  07-10-2026. Petición de Liber: tapaba la pantalla demasiado tiempo. Antes, segundo y medio.
  · En «Jornada completa» la nota dice ahora «Si se plantaron más árboles, siga registrando; al cerrar se
    ajusta la cantidad prevista.» Liber preguntó qué pasa con la cantidad prevista si se siguen
    registrando árboles: ya estaba resuelto (al pasar de lo previsto se confirma una vez por jornada, y al
    cerrar se ofrece actualizar la cantidad a lo registrado); faltaba decirlo en la ventana.

- **D265. Mapa en campo: deslizador de opacidad más grande y simbología sólo cuando explica algo (bloque 189).**
  07-10-2026. Petición de Liber tras probar en el teléfono.
  · El deslizador nativo era delgado y su botón chico. Ahora la barra es gruesa, el botón de 28 px, el
    área de toque de 44 px y, en el panel de campo, va en su propio renglón a todo lo ancho.
  · La simbología bajo el mapa («Colonia de la jornada, de prioridad: …») repetía lo que ya dice la
    jornada junto a su colonia. Sólo aparece cuando hay colonias de dos o más niveles en el mapa.

- **D266. En «Datos de cierre de la jornada», el cabo no ve el campo Encargado (bloque 189).**
  07-10-2026. Petición de Liber, para acortar la pantalla.
  · El cabo es el encargado de su propio reporte: se guarda (`encargado_id`) y el reporte lo imprime,
    pero no se le muestra. Quien ve a varias personas (coordinación, administración) sigue eligiéndolo
    entre los cabos con registros ese día: para ellos es una elección, no un dato repetido.

- **D267. La versión nueva también llega con la app abierta, y se avisa al aplicarla (bloque 190).**
  07-10-2026. Liber preguntó si la página podía recargarse sola al publicar una versión, o pedir al usuario
  que refresque. Ya se recargaba sola (al abrir, al volver a la app o al recuperar la señal; baja la versión
  completa y recarga cuando no interrumpe nada). Quedaban dos huecos:
  · Con la app abierta y al frente no se volvía a preguntar. Ahora se pregunta también cada 15 minutos,
    sólo si la app está a la vista; es una consulta de pocos kilobytes.
  · La recarga era silenciosa. Ahora, tras recargar por una versión nueva, un aviso verde dice «Se
    actualizó a la versión …», una sola vez.
  · No se pide al usuario que refresque: en campo es un toque más y la recarga sola ya espera a que no
    haya ventana abierta, árbol a medias ni edición en curso.

- **D268. «Seguir registrando» ya es la respuesta a «¿Lo registra de todos modos?» (bloque 190).**
  07-10-2026. Liber preguntó si, al seguir registrando con los árboles previstos completos, había que pedir
  antes la nueva cantidad prevista. Se le recomendó que no: en ese momento casi nunca se sabe cuántos más
  habrá, y al cerrar ya se sabe el número exacto (ahí se ofrece «Actualizar a N», D264). Aceptó.
  · Lo que sobraba era la pregunta del árbol siguiente: tocar «Seguir registrando» ya dice que habrá más.
    Ahora cuenta como esa respuesta y el árbol de más se guarda sin preguntar.
  · Si «Jornada completa» se cierra de otro modo (Escape), la pregunta se queda: puede ser un árbol
    registrado dos veces por error.
  · El orden de los botones no cambia: «Cerrar jornada» primero (D258), por ser lo más común.

- **D269. El horario de la jornada pasa a Conciliación (bloque 190).**
  07-10-2026. Liber preguntó qué significaban las horas del renglón de la ficha y si convenía mostrarlas o
  sólo guardarlas para analizar tiempos. Ya se guardaban todas: `fecha_inicio`, `fecha_registro` de cada
  árbol y `fecha_cierre`.
  · El renglón de arriba de la ficha queda corto: ya no lleva las horas del primer y el último árbol, y del
    cierre sólo dice «cerrada».
  · En Conciliación, un renglón «Horario: 17:49 a 19:42 (1 h 53 min) · cerrada hoy a las 19:48 · 57 min
    entre árbol y árbol en promedio». En una jornada de varios días sólo dice el cierre: las noches
    deformarían la duración y el promedio.
  · Es la hora de captura, no la de plantación: si se captura todo al final, mide la captura.
  · El análisis entre jornadas (promedios por cabo, programa o mes) espera a que la app lea del servidor,
    en Supervisión, como el conteo de frutales.

- **D270. Lo que sobraba en las pantallas, fuera (bloque 191).**
  07-10-2026. Liber pidió revisar todas las pantallas, ventanas y mensajes con todas las cuentas y variantes;
  la revisión está en `docs/REVISION-PANTALLAS.md`. Aprobó A, B, C, D4, E, F, G y H; D1, D2 y D3 quedan pendientes.
  · **A1.** El pie de cada sección sólo dice la versión. «Restablecer datos de prueba» y «Datos de
    demostración» pasan a la ventana «Datos de prueba», en el menú de la cuenta.
  · **A2.** Sin párrafos que repiten el título (Registrar jornada, Jornadas, Fotografías, Configuración,
    Acerca del sistema). Mi avance y Supervisión dicen sólo la regla: «Sólo cuentan las jornadas cerradas.»
  · **A3.** En Usuarios y Catálogos sólo se marca lo inactivo.
  · **A4.** «Quitar filtros» sólo con algo filtrado (faltaba en Registros).
  · **A5.** «Más filtros» en el mismo orden en todas las secciones: quién registró, especie, programa,
    alcaldía, institución.
  · **A6, A7.** Sin «Fase 2» ni «Etapa 1» en Parámetros y Acerca del sistema; el mapa base dice «Esri
    (provisional)» hasta conectar CARTO.
  · **B.** Registrar jornada: sin la ayuda que repetía el ejemplo del nombre; lo detectado en un renglón
    («Cuauhtémoc · Col. CENTRO IV · ■ Muy alta») en lugar de dos cajas y la escala de cinco niveles (que
    desaparece); avisos de ubicación cortos; «Fecha» en lugar de «Fecha de la jornada de plantación»; la
    dirección con el mismo ejemplo dentro del campo al iniciar y al editar.
  · **C.** La franja con lo previsto completo dice sólo «Siguiente: cerrar la jornada.» (o cuántos van de
    más). **Defecto corregido:** la etiqueta del punto en el mapa decía «PROVISIONAL» aunque el árbol ya
    tuviera folio; ahora dice la especie y el folio en cuanto llega.
  · **D4.** Con todos los pasos hechos, la ficha dice «Todo listo: reporte generado …» y no «Jornada
    completa», que es la ventana de cuando se llega a lo previsto.
  · **E1.** Datos de cierre: «Todos opcionales: lo que quede vacío no sale en el reporte.»
  · **F.** Detalle del árbol sin renglones vacíos ni «Cabo» en los árboles propios; el folio lo asigna «el
    servidor» en el historial; «Sustituir» con un árbol plantado hoy dice la fecha en lugar de preguntarla.
  · **G1.** Un periodo sin jornadas cerradas da el mismo aviso corto a todos los perfiles, con las jornadas
    en curso y «Qué atender»; ya no un tablero en ceros.
  · **H1.** «¿Qué hacer sin internet?»: con envío, al cambiar de teléfono hay que enviar lo pendiente.

- **D271. Chips de programa: sólo el fijo y los usados (bloque 192).** Corrige D263.
  07-10-2026. Liber vio tres chips en una cuenta sin jornadas: cuando alguien había usado pocos programas,
  se completaban con los del catálogo, y eso no fue lo acordado. Ahora: «Reforestación Urbana» siempre y,
  después, sólo los programas que esa persona ya usó (los dos que más). Quien no ha usado otros ve un solo chip.

- **D272. El reporte, el informe y la tabla, corregidos según su revisión (bloque 192).**
  07-10-2026. Revisión de los archivos en `docs/REVISION-ARCHIVOS.md`; Liber aprobó P (salvo P6 y P7, por
  decidir), S y C. La plantilla de Excel (X) queda pendiente.
  · **Reporte de la jornada.** El croquis va primero, después los ejemplares y los totales; Personal y Datos
    del vehículo, al final: así el croquis cabe en la página 1 también en las jornadas de la Secretaría. La
    distribución de las especies va bajo los totales, sin sección propia. La cifra dice «nativas o
    endémicas». El crédito del mapa va sólo en el texto bajo el croquis, ya no también sobre la imagen.
    «Comentarios al iniciar» y «Observaciones del cierre».
  · **Informe de Supervisión.** Plurales bien dichos en los pendientes («1 eliminado»); «Por quién registró»
    en lugar de «Por cabo» (las coordinaciones también registran); «17 de 17» en un renglón; la primera
    semana de un mes se nombra por el día 1; las notas del final, juntas; la coordinación de otra
    institución dice cuál; «menos de 1 %» en lugar de «0 %»; el solicitante con su nombre completo
    («Alcaldía Iztapalapa», también en la pantalla); sin la palabra «etapa»; sin la tabla de trazabilidad
    en ceros.
  · **Tabla CSV.** La columna «Cabo» se llama «Quién registró».

- **D273. Alcaldías y solicitantes que se activan cuando hagan falta (bloque 193).**
  08-10-2026. Petición de Liber: tener todo dado de alta y activarlo cuando se pida usar el sistema.
  · **Alcaldías (Instituciones).** Ya no son fijas en su estado: se activan y desactivan desde su tuerca. Siguen
    sin agregarse, renombrarse ni eliminarse. Una alcaldía inactiva no deja entrar a sus cuentas y no se ofrece al
    dar de alta una cuenta; el formulario dice dónde activarla.
  · **De arranque**, en la versión real, las 16 inactivas. En la de prueba, Liber eligió dejar activas
    Iztapalapa y Coyoacán, que tienen cuentas de prueba y datos de demostración.
  · **Solicitantes.** De arranque, activos sólo la Oficina de la Secretaría, la Jefatura de Gobierno y SOBSE; los
    demás (SEGIAGUA, Diputadas y diputados y las 16 alcaldías) dados de alta e inactivos. Un solicitante inactivo
    no se ofrece en «Quién lo solicita», pero la jornada que ya lo tiene lo conserva.
  · **En un teléfono con datos**, lo que nadie activó ni editó toma el estado de arranque (sello de datos nuevo);
    una alcaldía con cuentas se queda activa, para no cortarles el acceso.
  · La versión real todavía no siembra catálogos en el teléfono: los recibirá del servidor. La regla queda en
    `docs/FASE2-Y-TRASPASO.md` (punto 30).

- **D274. Lo pendiente de las dos revisiones (bloque 194).**
  08-10-2026. Liber aprobó lo que quedaba de `docs/REVISION-PANTALLAS.md` y `docs/REVISION-ARCHIVOS.md`, y eligió en P6,
  P7 y X3.
  · **D1.** En el teléfono los filtros de Jornadas arrancan plegados, con el botón «Filtros» que dice cuántos hay y las
    fichas de lo filtrado, como en Registros; la lista queda arriba. En computadora, siempre abiertos.
  · **D2.** El renglón «Siguiente» de la ficha sólo sale cuando agrega algo: cuántos puntos hay por revisar, que una
    jornada cerrada está vacía, que todo está listo, o que lo hace otra persona. Quien puede hacerlo ya tiene el paso
    marcado y su botón. Los avisos al cerrar o revisar siguen diciendo qué sigue.
  · **D3.** A quien no puede hacer lo que sigue (el Directivo; la coordinación en «registrar»), el renglón le dice «(lo
    hace el cabo)».
  · **P6.** El reporte ya no imprime con qué capas se derivó el territorio: se guarda en cada árbol (`capa_version`).
  · **P7.** La colonia se queda como viene en la capa, en mayúsculas: es el dato oficial.
  · **X1, X2, X4.** La plantilla de carga ofrece listas para elegir en nombre científico, programa, tipo de institución
    e institución (avisan sin impedir, porque la carga reconoce alias), su hoja «Árboles» trae filtro, y las
    instrucciones dicen el límite de 20,000 renglones y que los árboles quedan a nombre de quien carga, en jornadas de
    carga histórica.
  · **X3.** La Secretaría es «Gobierno de la CDMX» en todo el sistema; el informe ya no dice «Secretaría».
  · Supervisión en pantalla: «Por quién registró», como el informe y la tabla.

- **D275. Comentarios del código sin la historia del proyecto (bloque 195).**
  08-10-2026. A pedido de Liber, antes de pasar al servidor y de entregar el código.
  · Los comentarios de `js/`, `css/estilos.css`, `index.html`, `sw.js` y `herramientas/` dicen qué hace el código, por
    qué así y qué cuidar. Se quitaron los números de decisión, de mejora y de bloque, quién pidió qué, lo que había
    antes y las notas entre Liber y Claude; esa historia vive en DECISIONES y BITACORA. Las referencias a la Norma y a
    las reglas (R…) se quedan: dicen qué regla vigente se cumple.
  · Se cambiaron sólo comentarios. Los textos que son código —las descripciones del espejo de campos, los comentarios
    de las columnas en `servidor/sql/02_tablas.sql` (salen de `datos/esquema.json`) y los mensajes de las
    herramientas— se dejaron como están. La única excepción es el encabezado que `generar_diccionario.py` escribe en
    `js/esquema.js`, que tenía que cambiar igual que el de `esquema.js` para que se regenere idéntico.
  · Los comentarios nuevos se escriben así: en presente y sin números de decisión ni de bloque.

- **D276. Sin historia ni nombres también en textos, datos y documentos de entrega (bloque 196).**
  08-10-2026. Liber pidió completar la limpieza de D275: también los textos que son código y todo lo que nombra a
  Liber o a Claude fuera de `docs/`.
  · Sin números de decisión, de mejora ni de bloque, y sin nombres: las descripciones del espejo de campos, los textos
    de las pruebas y de las auditorías, `datos/esquema.json` (y lo que sale de él: `js/esquema.js`,
    `datos/DICCIONARIO-DATOS.md` y `servidor/sql/02_tablas.sql`), `datos/MAPEO-CAMPOS.md`, `README.md`, las
    herramientas, los encabezados de las capas y del catálogo de especies, y `.gitignore`. La columna «referencia» de
    las reglas que esperan al servidor apunta ahora a un archivo o a FASE2-Y-TRASPASO, no a una decisión.
  · Se quedan los identificadores que son código: las reglas (`R-D01`, `S-05`…), las comprobaciones de la auditoría de
    la hoja (`D1`, `D2`, `D3`) y la etiqueta de la versión en el pie («Bloque N»), que sirve para saber qué versión
    tiene el teléfono.
  · `docs/` (DECISIONES, BITACORA, MEJORAS, revisiones y traspaso) se queda como está: es la historia del proyecto.
    Liber lo eligió sabiendo que el repositorio es público.

- **D277. El servidor con la forma de los módulos del SIA (bloque 197).**
  08-10-2026. Liber pidió revisar el backend del SIA y preparar el proyecto para que el SIA trabaje lo menos
  posible y todo quede como lo hace el SIA. La revisión y el plan están en `docs/ALINEACION-SIA.md`.
  · El SIA ya tiene un módulo `plantacion`, que sustituyó a un sistema anterior. El SRP va aparte, convive
    con él y lo sustituye cuando funcione; entonces el SIA retira el viejo (Liber).
  · Liber aprobó: el esquema sigue siendo `srp`, con la cuenta `srp_api` y la ruta `/api/srp`; el servicio
    pasa a TypeScript con la forma de los módulos del SIA. Queda abierta, para el SIA, dónde viven las
    cuentas de las personas.
  · Hecho en este bloque: los guiones pasan a `servidor/db/srp/` con la numeración del SIA; una sola cuenta,
    `srp_api`, en lugar de `srp_propietario` y `srp_servicio` (los objetos quedan a nombre de quien instala,
    como en el SIA); alcaldías, colonias del IECM y malla UGA se leen de `territorio` con
    `territorio_lectura`, sin copia propia; queda en `srp` sólo la capa de colonias prioritarias, que es otro
    marco de colonias (2,243); una segunda instalación se detiene sin tocar nada; la base local lleva una
    réplica de las tablas de `territorio`, que nunca se entrega.
  · Las capas de la aplicación van en orden de clave, y el servidor desempata por clave: en un punto sobre
    un borde compartido, el teléfono y el servidor eligen el mismo polígono.
  · La demostración no deja árboles fuera de la ciudad: en el límite con el Estado de México, el árbol que
    simula un error de captura (a unos 390 m de su sitio) podía salir de la capa de alcaldías y quedar sin
    alcaldía ni folio. Si sale, se queda en el punto del sitio. Apareció al cambiar el orden de las capas,
    porque la demostración elige colonias por su posición.

- **D278. Sin código muerto en la aplicación (bloque 198).**
  08-10-2026. Liber pidió una auditoría de limpieza antes de entregar: código que nada usa, comentarios y
  etiquetas de pruebas con historia, nombres de archivo y documentación. Sin subagentes, como manda la regla
  del proyecto; `servidor/` queda para después de la fase 2, que lo reescribe.
  · Se buscó lo que nada usa en todo el proyecto a la vez (JS, HTML, CSS, pruebas y herramientas), también
    con nombres armados al vuelo, con un analizador de JS, eslint (variables locales, código inalcanzable) y
    pyflakes. Se quitaron nueve funciones y propiedades sin uso, una variable local y dos imports de Python.
    Las 467 clases de la hoja se usan; no había archivos sin cargar ni nombrados por su historia.
  · Las etiquetas de las pruebas dicen sólo qué comprueban: sin «ya no» cuando habla de algo que se quitó del
    sistema, y sin claves de auditoría (A5, B8, M16…). Las reglas del folio (R1 a R8) se quedan: el código
    también las nombra.
  · La documentación técnica nombra la fuente vigente del catálogo de especies y los cinco archivos de `js/`
    que faltaban en el README.

- **D279. Auditoría integral de la aplicación antes del traspaso (bloque 199).**
  08-10-2026. Liber pidió una auditoría integral y profesional antes de pasar el sistema al SIA: ahora la
  aplicación y, al terminar sus fases, el servidor; los cuatro frentes (seguridad y datos personales,
  integridad, accesibilidad y uso en campo, código y rendimiento); corrigiendo sobre la marcha lo que no
  cambia pantallas ni decisiones. El informe está en `docs/AUDITORIA-INTEGRAL-APP.md`.
  · Corregido: identificadores UUID también sin `crypto.randomUUID`; mapas fijos sin marcador enfocable y
    como grupo con su etiqueta; la API fuera de la caché del service worker; el texto del periodo de los
    filtros en una sola función; el traspaso al día con `territorio`.
  · Para el SIA, en el § 4 del traspaso: compresión y caché del servidor web, y las cabeceras de seguridad
    que una etiqueta `<meta>` no puede poner (`frame-ancestors`, transporte, tipo, permisos).
  · Aceptado: los puntos encimados en el mapa de la jornada, por la excepción «equivalente» de WCAG 2.5.8.
  · Cobertura de las pruebas: 98.6 % de los renglones de `js/`, medida con el perfilador de V8. La medición encontró
    cuatro funciones sin uso dentro de objetos armados al vuelo (`fijarDia`, `etiqueta`, `contar`, `resumen`): quitadas.

- **D280. La sesión vence tras una semana sin uso (bloque 200).**
  09-10-2026. Liber: la sesión dura una semana; si en una semana no se entra, pide la contraseña otra vez. Sin
  límite total: quien entra al menos una vez por semana no vuelve a escribirla.
  · Cada uso renueva la semana (`expira_en` se recorre a lo más una vez por minuto). Desactivar la cuenta o su
    institución, o cambiar o restablecer la contraseña, sigue cerrando sus sesiones al instante.
  · La cookie dura 400 días, lo más que admiten los navegadores; quien decide si la sesión vale es el servidor.
  · Sustituye a las 12 horas sin uso y 7 días como máximo de D259. Parámetro: `SRP_SESION_INACTIVIDAD_DIAS`.

- **D281. El mes y el año, dentro de «Un periodo» (bloque 201).**
  09-10-2026. Liber propuso quitar «Este mes» y «Este año», porque se pueden elegir con «Un periodo»; eligió la
  variante de dejarlos dentro de «Un periodo» para que ver un mes no cueste unos siete toques.
  · Registros, Jornadas y Fotografías: la fila queda en cuatro atajos y un renglón (Todas · Hoy · Un día ·
    Un periodo). Dentro de «Un periodo», «Este mes», «Mes pasado» (nuevo) y «Este año» llenan Desde y Hasta
    y aplican; el que coincide con el rango aplicado queda marcado.
  · El periodo es un día o un rango: se retira el filtro interno por año y mes. Un mes o un año completos se
    nombran en la ficha por su nombre («Septiembre de 2026», «2026»). Supervisión y Mi avance no cambian.
