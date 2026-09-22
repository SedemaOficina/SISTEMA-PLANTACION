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
| D19 | El filtro de periodo son tres atajos (Este mes, Mes pasado, Este año) más listas de Año y Mes; el rango Desde/Hasta queda para casos finos | Definido por Liber: el sistema opera hasta 2030 y una fila de chips de mes sueltos deja de servir al acumularse los años |
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
| D45 | `colonia` se guarda nula hasta que exista capa, y la pantalla lo dice como pendiente, no como falla | No hay capa de colonias. Mezclar una alcaldía real con una colonia ficticia haría pasar por real un dato inventado |
| D46 | `capa_version` guarda la versión de cada capa por separado (`alcaldias=…;uga=…`) | Las dos llegaron juntas hoy, pero no tienen por qué actualizarse juntas; con una sola versión no se sabría cuál cambió |
| D47 | El prefijo de la clave UGA no se usa como alcaldía del punto | En la frontera, la celda pertenece a una alcaldía y el punto a otra: 9 celdas tienen su centro en una alcaldía distinta de la de su prefijo. La alcaldía sale de su propia capa |
| D48 | El botón de ubicación lleva el icono de ubicación en sus dos estados; el estado de corrección se distingue por el color dorado y por el texto «Actualizar…» | Definido por Liber (sustituye la parte del lápiz de D28). El lápiz decía «editar» pero el botón no edita: vuelve a tomar la posición del GPS. El color sigue sin ir solo porque el texto cambia |
| D49 | Con «Capturar coordenadas a mano» desplegado, el botón de ubicación se oculta; reaparece al cerrarlo | Definido por Liber. Dos formas de fijar el punto a la vista al mismo tiempo confunden en campo; una regla CSS de respaldo (`:has`) lo oculta aunque falle el JS |
| D50 | Se reincorpora `comentarios` al registro de plantación: texto libre opcional, hasta 500 caracteres | Definido por Liber. **Modifica D17**, que lo retiró por no tener uso declarado (Norma 1.8); ahora lo tiene: observaciones del cabo sobre el sitio o el ejemplar. Sigue fuera del reporte PDF hasta la validación de reportes (ver pendientes) |
| D51 | En el selector de programa, «Reforestación Urbana» va primero y el resto en orden alfabético; sigue sin preselección | Definido por Liber: es el programa de casi toda la captura en campo. Se ordena por la clave `REFOR_URBANA`, no por el nombre, para que sobreviva a un cambio de redacción |
| D52 | La pestaña dice «Nuevo registro» y el formulario ya no repite el título; en edición el título sí se muestra («Editar registro») | Definido por Liber. En alta, pestaña y título decían lo mismo; en edición el contexto cambia respecto a la pestaña y hay que decirlo |
| D40 | Espejo de campos al pie del formulario, sólo con datos de prueba: enseña los campos que llegan a la base sin tener lugar en la pantalla, más la entrada de bitácora que se escribiría. **Se elimina al cerrar la Etapa 1** (`js/espejo.js`, su sección en `index.html` y el bloque `.espejo` del CSS; nada más depende de él) | Definido por Liber, para llevar control visual mientras se afina la interfaz. No reconstruye el registro: lee el mismo objeto que escribe Guardar (`registroPrevisto()`), y su lista de campos es lo que queda al restar los visibles, así que un campo nuevo aparece solo. Lo que aún no existe —identificador, marcas de tiempo— se nombra como pendiente en vez de inventarse |

## Pendientes de decisión

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
- [pendiente] **Reportes PDF (`js/reportes.js`).** Liber los validará en conjunto una vez terminado el formulario; hasta entonces no se modifican. Queda por decidir ahí si el campo «Comentarios» (opcional, hasta 500 caracteres) entra al reporte y en qué forma: columna truncada o reporte de detalle por registro
