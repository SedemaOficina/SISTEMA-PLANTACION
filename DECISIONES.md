# Decisiones del proyecto SRP

| # | Decisión | Motivo |
|---|---|---|
| D01 | Dos fases: Fase 1 local sin servidor; Fase 2 servidor, API y sincronización | Probar el flujo de campo antes de invertir en infraestructura |
| D02 | Cuatro perfiles: Registrador, Jefe de registradores, Administración global (SIA), Consulta | Definido por Liber, 21-09-2026 |
| D03 | Jefe edita registros de su equipo; en producción aparece en Fase 2 | Definido por Liber |
| D04 | Los cuatro perfiles se simulan desde Fase 1 | Definido por Liber: estructura lista antes de datos reales |
| D05 | Usuarios en tabla USUARIOS de la base (Fase 2); en Fase 1, almacén `usuarios` | Definido por Liber |
| D06 | Registrador se da de alta con nombre, apellidos, área y cargo-rol; queda fijo en el dispositivo | Cada dispositivo = un registrador |
| D07 | Editor de catálogos sólo para Administración global, en pestaña «Catálogos» | Definido por Liber |
| D08 | Un valor de catálogo con uso no se elimina: se desactiva | Auditoría completa; los registros conservan su valor |
| D09 | Catálogos iniciales: programas Reforestación Urbana y Centro Histórico; áreas Dirección de Infraestructura Verde y Coordinación del SIA | Definido por Liber |
| D10 | Toda alta, edición, eliminación, activación y desactivación queda en bitácora (quién, cuándo, perfil, campos) | Norma 7.7; definido por Liber |
| D11 | Eliminar un registro lo marca `eliminado`; no se borra | Norma 7.4: un solo camino de retiro, con constancia |
| D12 | Los registros guardan identificadores de especie, programa y registrador, no sus nombres | Fuente única: renombrar en catálogo actualiza todo. Sustituye el esquema previo que copiaba nombres |
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

- [pendiente] **Icono de la app instalada**: los `assets/icono-192.png` y `icono-512.png` son
  provisionales (fondo guinda y monograma SRP); sustituir por el icono de la identidad gráfica
- [pendiente] **Tipografías sin señal**: Cabin y Roboto se cargan de Google Fonts; sin red el
  teléfono usa su tipografía del sistema. Alojarlas en `vendor/` si se quiere la identidad
  completa sin conexión (pesan ~200 KB)

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
- [pendiente] **Clave de campo del ejemplar** (`CIZ_366`, la que pintan en la placa): sigue sin
  decidir si entra como atributo para conciliar lo ya plantado

- [pendiente] **Antes de liberar esta etapa: sustituir las tres capas** —alcaldías, malla UGA y colonias— por las definitivas del SIA, con fuente y fecha de corte confirmadas, y volver a correr `pruebas/generar_capas.py`. Las tres cargadas hoy son para probar: alcaldías y UGA traen los defectos medidos en el bloque 15, y colonias es la cartografía electoral del IECM 2022, no un catálogo del SIA. Al sustituirlas se sube `meta.version` y se rederivan los registros existentes. Anotado por Liber, 22-09-2026

### Para resolver antes de montar en los servidores del SIA

- [pendiente] **El módulo `plantacion` que ya existe.** El backend del SIA tiene un módulo Plantación y `bd_csia` un esquema `plantacion`. Liber confirma que es un antecesor mal construido que el SRP sustituye. Antes de descartarlo hay que revisar **si su catálogo de especies ya tiene claves en uso**, para no estrenar claves distintas para las mismas especies (ver D22–D24)
- [pendiente] **Dónde viven las fotografías.** Hoy van incrustadas en el registro. Deben salir a archivo, como ya hace el SIA en sus otros módulos. Sin eso, ni el teléfono del cabo ni el volumen del servidor .196 aguantan: quedan ~6 GB libres, que a 100 KB por imagen cubren unos 60 mil archivos
- [pendiente] **Cuánto disco pedir a ADIP.** Depende de qué proporción suba foto: 10% son ~5 GB, 20% ~10 GB, 30% ~15 GB para la meta de 500 mil. ADIP autoriza con uso real medido, así que **el sistema debe reportar desde el primer mes cuántos registros llevan foto y cuánto pesan**, para que la solicitud sea una proyección con evidencia y no una estimación
- [pendiente] **Colonia o unidad territorial.** Ya llegaron alcaldías y UGA; falta la capa de colonias o de unidades territoriales. El esquema `territorio` del SIA tiene 1,817 unidades territoriales. Confirmar cuál es la unidad oficial de reporte y pedir esa capa; mientras, `colonia` se guarda nula (D45)
- [pendiente] **Fuente y fecha de corte de las dos capas recibidas.** Los atributos de alcaldías (`cvegeo`, `nomgeo`, `shape_area`, `region`) apuntan al Marco Geoestadístico del INEGI más campos propios; confirmar y anotar en `generar_capas.py`
- [pendiente] **Reportar al SIA los cinco huecos y tres solapes de la capa de alcaldías**, con sus coordenadas (en `BITACORA.md`, Bloque 15). El mayor hueco, de 1.2 ha, está cerca de 19.4838, -99.1499; el mayor solape, GAM–VCA, de 2.5 ha
- [pendiente] **Capas reales de colonias y malla UGA: origen, fecha de corte y área responsable** → resuelto para UGA; queda colonias (arriba)
- [pendiente] **Límites de nginx.** El servidor web tiene configurados límites de velocidad y de tamaño de subida. Con decenas de cuadrillas subiendo fotos a la vez se tocan; conocer el límite antes, no el primer día
- [pendiente] **HTTPS y geolocalización.** El navegador sólo entrega la posición del GPS en contexto seguro. Hacia el ciudadano hay HTTPS porque ADIP lo termina, pero una prueba por HTTP dentro de la red interna dejará el botón de ubicación sin responder, y parecerá un defecto del sistema
- [pendiente] **El sitio aún no se declara apto para difusión pública masiva.** Aclarar si montar el SRP ahí cuenta como difusión pública, dado que el personal de campo entra por el dominio público

### Para resolver en el diseño del programa

- [pendiente] **Qué cuenta como plantado.** ¿El árbol puesto en tierra o el árbol vivo a los seis meses? Si se va a reportar supervivencia, hace falta un **registro de seguimiento**: un evento posterior sobre el mismo árbol. Afecta el diseño desde ahora, porque obliga a que el identificador pueda recibir visitas posteriores y no sólo el alta
- [pendiente] **Cómo se evita el doble conteo**, con dos cuadrillas registrando el mismo árbol o un árbol repuesto contado dos veces
- [pendiente] **¿Una fotografía por árbol o por jornada?** A una por árbol, la meta de 500 mil son ~50 GB; a una por frente de trabajo (≈1 por cada 30 árboles), ~1.7 GB. Es una decisión de programa, no de sistema, y es la diferencia entre pedir un volumen nuevo a ADIP o caber en lo que ya hay

- [pendiente] ¿El apellido materno debe ser obligatorio? Hoy es opcional: hay personas que no lo tienen
- [pendiente] ¿Puede una persona editar sus propios datos, o sólo la Administración global?
- [pendiente] ¿El Jefe de registradores también registra plantaciones? ¿Puede eliminar? (hoy: registra sí, elimina no)
- [pendiente] Proveedor de mapa base para producción (OpenStreetMap no admite uso institucional intensivo)
- [pendiente] Validación del catálogo de especies y su clasificación Nativa / Introducida por el área técnica
- [pendiente] Formato de las claves del catálogo real de especies, para confirmar que no choquen con las generadas
- [pendiente] Cuenta institucional para el repositorio y la publicación (Norma 1.7)
- [pendiente] Aviso de privacidad: el sistema recaba nombre, área y cargo del personal (Norma 1.8)
- [pendiente] Los tres campos del punto ocupan ~240 px en teléfono mientras están vacíos. Se dejan siempre visibles para que el formulario no salte a media captura; revisar con personal en campo si conviene plegarlos hasta que haya punto
- [pendiente] **El campo «Comentarios» del registro** (opcional, hasta 500 caracteres) todavía no entra al reporte. Queda por decidir en qué forma: columna truncada en la tabla de ejemplares, o un reporte de detalle aparte. La reserva de no tocar `js/reportes.js` hasta terminar el formulario queda levantada por D55–D58, que Liber pidió expresamente

- [pendiente] **Clave de campo del ejemplar.** Los partes que hoy se escriben a mano numeran cada árbol con un prefijo del sitio y un consecutivo: `CIZ_366`, `GMP_196`, `UDG_01`. Es el identificador que el personal dicta, pinta en la placa y usa para hablar entre sí, y el sistema no tiene dónde guardarlo: el reporte numera los ejemplares 1..n dentro del parte, que sirve para leerlo pero no para volver a encontrar un árbol. Es el tercer identificador de la Norma 1.2 —el del sistema de origen—, y sin él no se puede conciliar lo ya plantado con lo que capture el SRP

- [pendiente] **Colonia en el parte.** El cierre no la pide: no hay capa de colonias (D45) ni catálogo, y un campo libre más sería una segunda fuente para un dato que el sistema va a derivar. Mientras tanto, quien la necesite la escribe dentro del sitio. Se resuelve cuando llegue la capa

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

- **D67. Nomenclatura del folio: `SRP-AAA-000-AAAA-00000`.** Cuatro segmentos congelados al
  asignar —sistema, celda UGA por cruce contra la malla vigente al alta, año de asignación,
  consecutivo de cinco dígitos por celda y año—, 22 caracteres. La clave de especie queda fuera
  del identificador y se conserva como atributo: un ejemplar puede reidentificarse cuantas veces
  haga falta y puede registrarse sin especie de catálogo sin que el folio cambie. `EXT-000` es la
  celda reservada para un punto fuera de la malla. Definido por Liber en su análisis de
  nomenclatura (22-09-2026).
- **D68. Reglas de operación adoptadas (R1–R10 del análisis).** R1: el registro nace con UUID y
  la pantalla dice PROVISIONAL hasta sincronizar. R2: nada definitivo —placa, rótulo, reporte—
  sale de un registro provisional; el PDF lo advierte. R3: el folio se asigna una sola vez, en el
  servidor, en una transacción. R4: el UUID es la clave de idempotencia. R5–R6: consecutivo de
  una tabla de secuencias que sólo avanza; los huecos se aceptan, la reutilización no; unicidad en
  base. R7: inmutable ante cualquier corrección. R8: al asignar se congelan folio, celda, versión
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
