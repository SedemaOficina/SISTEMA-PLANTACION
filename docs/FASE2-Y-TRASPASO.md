# Fase 2 y traspaso al SIA

Este archivo reúne, en un solo lugar, lo que debe saber y hacer quien reciba el SRP para montarlo
en los servidores de la Secretaría. Es el punto de partida del programador: qué construir en el
servidor, qué es simulado en la Etapa 1 y hay que reemplazar, qué debe entregar el SIA antes, qué
falta decidir y cómo se prepara el paquete de traspaso.

Se mantiene al día en cada bloque: toda decisión nueva sobre la Fase 2 o el traspaso se escribe
aquí, además de en `DECISIONES.md`. El detalle técnico de cada campo está en `datos/esquema.json` (y en
`datos/DICCIONARIO-DATOS.md`, que se genera de él); las reglas de la Fase 2 del esquema son las `S-nn`
que se citan abajo.

Estado al 05-10-2026: versión 0.9.41 (Bloque 175). **La Etapa 1 quedó cerrada con esta versión (D249)**. Base del teléfono versión 9: `srp_db` en pruebas, `srp_sia` en la real.

**El servidor se construye en este proyecto**, en la carpeta `servidor/`, como módulo independiente que
puede montarse en el backend central del SIA o correr como servicio aparte, según responda el SIA. Se
prueba con PostgreSQL y PostGIS locales de la misma versión mayor que la del SIA. El nombre del
proyecto, de su esquema y de su ruta es **`srp`** (D249).

---

## 1. Qué construir en el servidor

| # | Tema | Qué debe hacer el servidor | Estado | Dónde está hoy en el código |
|---|---|---|---|---|
| 1 | Recepción y cola de envío (S-01) | Recibir cada árbol y cada jornada; el `id` (UUID) de cada registro es la clave de idempotencia: un reenvío no duplica. Confirmar la recepción para que el teléfono lo marque como recibido. | Decidido | `js/envio.js` simula la cola completa con datos de prueba: estados «por enviar», «cambios» y «recibido»; envío automático al guardar, al entrar, al volver la señal y cada minuto; «Enviar ahora». |
| 2 | Qué guarda el teléfono (S-11) | Ver el apartado 2. El servidor es la única fuente de verdad; el teléfono es copia de trabajo. | Decidido | Hoy el teléfono guarda todo, porque no hay servidor. |
| 3 | Folio del ejemplar (S-02, reglas R1–R8) | Emitir el folio `AAA-000-00000` una sola vez al recibir el registro: celda UGA + consecutivo de una secuencia perpetua por celda (nunca `MAX+1`, nunca se reinicia). Inmutable. Guardar en el servidor, congelados al asignarlo, la celda, la versión de capas y el punto con que se asignó (R8); el teléfono sólo recibe el folio. | Decidido; condicionado a capas definitivas | `js/folio.js` (patrón, validación, etiqueta y emisión simulada). |
| 4 | Validación de cada renglón | Revisar todo lo que llega contra `datos/esquema.json`: tipos, nulos, dominios, referencias, punto dentro de la CDMX, foto que sea imagen. | Decidido | El teléfono ya no trae validador de archivos; la revisión que hacía `js/validar.js` hasta el bloque 112 queda en el historial de git como referencia. |
| 5 | Permisos (S-04) | Imponer en cada operación las reglas de `js/permisos.js` (`PERFILES` y `ACCIONES`); la pantalla sólo las refleja. | Decidido | `js/permisos.js`. |
| 6 | Integridad y unicidad (S-03) | Llaves foráneas con las relaciones del esquema; no eliminar lo que está en uso (un catálogo o una cuenta con registros se desactiva). | Decidido | `usosDe()` en `js/referencias.js`. |
| 7 | Bitácora | Registrar quién, cuándo y qué en cada alta, edición, eliminación y activación, del lado del servidor. | Decidido | `bitacora` en el teléfono; `js/almacen.js` la escribe en la misma operación que el dato. |
| 8 | Posible duplicado y doble conteo (S-05, D249) | Avisar al recibir cuando otro registro cae a menos de la incertidumbre combinada de ambos puntos (suma de precisiones, piso 4 m). Aviso, no bloqueo. **Doble conteo entre instituciones:** si el registro cercano es de otra institución, el servidor acepta el árbol y lo marca en una **bandeja de revisión de duplicados** que atiende la Administración global; ninguna de las dos instituciones ve los datos de la otra por esa marca. | Decidido | En el teléfono sólo hay avisos dentro de la jornada (`js/jornadas.js`). |
| 9 | Bandeja de especies (S-06) | Donde el SIA resuelve cada «Otra especie»: alta en el catálogo o reasignación a una existente. | Decidido | `especie_id` vacío y `especie_otra` escrita en `plantaciones`; si la bandeja necesita estados propios, son del servidor. |
| 10 | Fotografías a archivo (S-07) | Sacar la foto del renglón y guardarla como archivo referido por `foto_id`. | Decidido | Hoy van dentro del registro (`foto_base64`). |
| 11 | Rederivación territorial (S-08) | Con las capas definitivas, recalcular alcaldía, colonia y celda UGA de todo registro según su `capa_version`. | Decidido | `js/derivacion.js`. |
| 12 | Datos de prueba separados (S-09) | El servidor de producción arranca limpio y sólo recibe de la versión real. | Decidido | La versión de prueba guarda en `srp_db` y la real en `srp_sia` (`SRP.CONFIG.DB_NOMBRE`); nunca conviven en un teléfono. Ya no hay marca de prueba en las tablas. |
| 13 | Supervisión con todos los cabos | Supervisión, informes y CSV leen del servidor los datos de todas las cuadrillas e instituciones; la Administración los desglosa y filtra por organización (D187). Las consultas de Registros y Jornadas aceptan también especie, programa, alcaldía e institución (D200, D226); la institución sólo para la Administración global. El periodo llega como día, rango o año y mes. Para llenar las listas, el servidor responde también los valores disponibles de cada filtro dados los demás (D202). | Decidido | `js/indicadores.js`, `js/supervision.js`, `js/informes.js` (hoy, sólo lo que hay en el teléfono). |
| 14 | Instituciones externas (S-12, D186–D192) | Alcaldías, Gobierno de la CDMX (PAOT, SOBSE…), empresas y organizaciones civiles registran con cuentas de cabo y de coordinación que da de alta la Secretaría a solicitud; sólo SEDEMA tiene área y Administración global. El cabo depende de uno o varios coordinadores de su misma institución (`coordinadores_ids`), y el servidor lo valida: el alcance de «su cuadrilla» se decide por pertenencia a esa lista. El servidor filtra por `organizacion_id`: una cuenta nunca recibe registros de otra institución. Carga en la base real el catálogo de instituciones de arranque (SEDEMA `o-sedema`, PAOT, SOBSE, Green Cover, Reforestamos México y las 16 alcaldías `o-alc-<cvegeo>`, fijas). Rechaza el acceso de cuentas cuya institución esté desactivada. El nombre de la cuenta va en `nombre_completo`. Lo que plantan suma a las cifras de la Ciudad. El servidor también impone los programas por tipo de institución, leyendo `catalogos.tipos_organizacion` de cada programa (SEDEMA, todos; de arranque: Reforestación Urbana para alcaldías, Gobierno de la CDMX y organizaciones civiles; Palmeras para empresas; D193), y rechaza personal, chófer y vehículo en jornadas que no son de SEDEMA. Sólo la Administración cambia `tipos_organizacion`. «Jornadas de voluntariado» no se carga en la base real. | Decidido | `js/usuarios.js` (reglas de la cuenta), `js/sesion.js` y `accesoOrganizacion()` en `js/referencias.js` (acceso), `js/datos-ficticios.js` (arranque). |
| 15 | Parámetros del sistema (D195) | Guardar en el servidor los parámetros que hoy muestra Configuración › Parámetros (distancias de los avisos de jornada, niveles de precisión, margen del límite, espera del GPS, hora de atraso, reintento, fotografía y renglones por página) y repartirlos a todos los teléfonos; sólo la Administración global los cambia, y cada cambio va a la bitácora. Mientras, se leen de `js/config.js`. | Decidido | `SRP.configuracion.parametros()` en `js/configuracion.js` (lista y textos) y `js/config.js` (valores). |
| 16 | Carga masiva del histórico (D196) | Recibir el lote que hoy arma el teléfono (o el archivo, con la misma revisión de `js/carga.js`) y guardarlo en una transacción: jornadas con `carga_id`, árboles y el renglón `carga` de la bitácora; emitir los folios. El histórico es **por árbol**. Validar igual que el teléfono: especie del catálogo por nombre científico, punto dentro de la Ciudad, fecha no futura, programa, tipo e institución existentes, sin repetidos, y sin árboles que ya estén en la base con la misma huella (punto con seis decimales, especie, fecha e institución; D199). Deshacer un lote completo por `carga_id` en una transacción, con su renglón `ELIMINADO` de la entidad `carga` en la bitácora (D199). **El histórico cargado queda a nombre de la Administración global** (D249). | Decidido | `js/carga.js` (reglas, agrupación y guardado), `js/excel.js` (lectura y escritura de Excel). |
| 17 | Sustitución de árboles (D203) | Recibir el sustituto y el original en una sola operación: el sustituto con `sustituye_id`, `motivo_sustitucion` (VANDALISMO, IMPACTO_VEHICULAR, ROBO, MUERTE, OTRO) y `motivo_sustitucion_otro` (obligatorio con OTRO); el original con estatus `sustituido` y `sustituido_por_id`. Validar que el original esté `activo`, sin sustituto y en el alcance de quien sustituye. El sustituto va en la jornada del original, con la fecha de la sustitución (no anterior a la plantación del original; D204), recibe su propio folio y cuenta como plantado en el periodo de esa fecha; los informes dicen las sustituciones por motivo. Al eliminar el sustituto, el original vuelve a `activo`. | Decidido | `js/registros.js` (`sustituir`, `eliminar`, `restaurar`), `js/formulario.js` (`guardarSustituto`). |
| 18 | Jornada de varios días y relevo de cabo (D204) | Aceptar en una jornada abierta árboles de días posteriores, cada uno con su `fecha_plantacion` entre `jornadas.fecha` y el día en que se recibe, y sólo de quien la tiene a su cargo: `relevo_id` o, sin relevo, `cabo_id` (S-13). Al cambiar la fecha de una jornada, aplicarla sólo a los árboles del día de inicio y rechazarla si queda después de un árbol de otro día. Relevo: aceptarlo sólo de la coordinación del titular, hacia un cabo activo de su cuadrilla y de la institución de la jornada, con la jornada abierta; guardar `relevo_id`, agregar el renglón a `relevos` y a la bitácora (`RELEVO`); entregar la jornada abierta y todos sus árboles al teléfono del cabo que la recibe y dejar de aceptar árboles del titular mientras dure; avisar del relevo a los dos cabos en su teléfono (hoy el aviso sale al entrar, en el equipo donde se hizo el relevo: `SRP.activa.avisarRelevos()`, D205). Los indicadores cuentan cada árbol en el periodo de su fecha y con su autor. | Decidido | `js/permisos.js` (`jornada.registrar`, `jornada.relevo`, `personasDe`), `js/jornadas.js` (`relevar`, `guardarEdicion`, `mover`), `js/jornada-activa.js` (`abiertas`, `fechaInicial`), `js/indicadores.js`. |
| 19 | Colonias prioritarias (D206, D244, D249, D250) | Publicar la capa de colonias prioritarias como capa del SIA, con versión y geometría completas (la recibida es simplificada), y calcular en el servidor el indicador «Por prioridad de la colonia»: cada árbol cuenta en la prioridad de la colonia donde quedó plantado, aunque su jornada se haya ubicado en otra (D244); la jornada tiene una sola prioridad, la de la colonia donde se ubicó, y así se dice en su ficha y su reporte (D233). **La prioridad se congela con el árbol al recibirlo**, junto con la versión de la capa con que se calculó: si la capa cambia, los árboles ya recibidos conservan la suya. **La de la jornada, que imprime su reporte, también se congela al recibirla**, con la versión de la capa (D250): un reporte regenerado dice la misma prioridad. Hoy el teléfono las recalcula al consultar y no las guarda. Marginación, población y pobreza no se publican en el sitio. | Decidido | `js/prioritarias.js`, `herramientas/generar_capas.py`, `js/indicadores.js` (`prioridad`). |
| 20 | Solicitud (D217, D229) | Guardar en `jornadas` `solicitante_id` (→ tabla `solicitantes`, aparte de la de instituciones; lleva `tipo_solicitante` de una lista fija de siete), `solicitante_otro` y `solicitud_descripcion` (texto en varios renglones), y validar lo mismo que el teléfono: una jornada del programa «Solicitud» (id `p-solicitud`) lleva solicitante, del catálogo o escrito, y descripción, obligatoria; una jornada de otro programa lleva los tres vacíos (S-14). No hay campo de origen: lo dice el programa, y los árboles de una solicitud cuentan en ese programa. El solicitante no da acceso: quien solicita no ve la jornada por solicitarla, ni tiene cuenta por estar en el catálogo; si se quiere que la vea, es una decisión de permisos aparte. Decidir si «Otra instancia» se da de alta en el catálogo al recibirla o se queda como texto. Cargar en la base real el programa «Solicitud» y los solicitantes de arranque (Oficina de la Secretaría, SOBSE, SEGIAGUA, Jefatura de Gobierno, 16 alcaldías, Diputadas y diputados) | Pendiente | `js/solicitud.js`; `js/referencias.js` (`nombreSolicitante`, `TIPOS_SOLICITANTE`); migración 9 en `js/almacen.js`. |
| 21 | Jornada íntegra y alcance por institución (S-15) | Entregar a quien tiene la jornada a su cargo todos sus árboles activos, los capture quien los capture: reporte, conciliación y avance se calculan con todos; los permisos de edición siguen por árbol. Decidir el alcance por `jornadas.organizacion_id`, no por la institución o coordinación actual de quien capturó. El cabo de un relevo ya devuelto conserva la lectura, no la edición. | Decidido | En el teléfono, el titular sólo ve los árboles que él capturó (`jornadasAlcance()` en `js/jornadas.js`), el alcance de la coordinación sale de los `coordinadores_ids` actuales del autor y `personasDe()` en `js/permisos.js` da edición a todos los relevos. No se corrige en la Etapa 1. |
| 22 | Escrituras parciales y folio inmutable (S-16) | Aplicar sólo los campos que cambia cada operación sobre el registro vigente; rechazar la escritura hecha sobre una versión anterior y devolver la vigente. El folio se asigna una vez y ninguna operación lo cambia ni lo anula. | Decidido | En el teléfono, cerrar la jornada desde la franja, eliminar desde una lista y guardar una edición escriben la copia que estaba en memoria (`js/jornada-activa.js`, `js/registros.js`, `js/formulario.js`). |
| 23 | Eliminados y registro de cambios (S-17) | Consulta de árboles y jornadas eliminados con su historial y «Restaurar»; registro de cambios con árboles y jornadas, valor anterior y nuevo, cuenta, fecha y hora e identificador del dispositivo; motivo de la eliminación. | Decidido | En el teléfono lo eliminado sólo se restaura desde el aviso «Deshacer»; el Registro de cambios muestra cuentas, catálogos y cargas, y la bitácora guarda los nombres de los campos, no sus valores. |
| 24 | Cola de envío por operación (S-18) | Enviar cada operación: altas, ediciones, eliminaciones, restauraciones, sustituciones, jornadas, cierres, reaperturas y relevos. | Decidido | La cola simulada de `js/envio.js` sólo considera árboles activos: sirve de referencia para estados y avisos, no para el alcance. |
| 25 | Vigencia del reporte (D215) | Fijar `reporte_en` cuando se recibe el reporte entregado y anularlo en la misma transacción que reabra la jornada o que elimine, restaure, edite, mueva o sustituya uno de sus árboles, con su renglón de bitácora. Dos altas idénticas de jornada en el mismo instante se tratan como una sola (clave de la operación). | Decidido | `js/reportes.js` (`marcarGenerado`, `caducar`) y `js/jornada-activa.js` (`cambiarEstatus`, `volverACerrar`). |
| 26 | Mismas tablas en el teléfono y en el servidor (D225) | Crear las diez tablas del esquema tal cual: `plantaciones`, `jornadas`, `usuarios`, `bitacora` y los seis catálogos, cada uno en la suya (`programas`, `areas`, `especies`, `vehiculos`, `instituciones`, `solicitantes`). Cada tabla se envía y se recibe con su mismo nombre y sus mismos campos: no hay capa de traducción. Las llaves foráneas apuntan a la tabla de cada catálogo. | Decidido | `SRP.almacen.TABLA_DE_TIPO` y la migración 8 en `js/almacen.js`; `datos/esquema.json`. En memoria cada renglón de catálogo lleva `tipo` para la pantalla; no se guarda ni se envía. |
| 27 | Especies escritas (D232) | Dar a la Administración global la lista de lo escrito en `especie_otra` sobre los árboles de todas las instituciones, no sólo los del dispositivo, agrupada como en la pantalla y con su descarga. Es consulta: no cambia registros. | Decidido | `js/especies-revision.js` (`leer`, `descargar`). En la Etapa 1 la lista sale de los árboles que hay en el dispositivo de quien administra. |
| 28 | Usuarios y acceso (D249, D250) | **Base propia de usuarios, con correo y contraseña**; el módulo de usuarios se construye en este proyecto y no depende de un servicio externo de autenticación. El correo sólo identifica la cuenta: **no hay servicio de correo**. La Administración global da de alta cada cuenta con una contraseña temporal de un solo uso, que se cambia obligatoriamente al primer acceso. Las contraseñas se guardan con un algoritmo de derivación lento y con sal, nunca en claro ni con un resumen simple. Bloqueo temporal tras varios intentos fallidos. **Restablecimiento:** lo hace sólo la Administración global, que entrega otra contraseña temporal de un solo uso; las coordinaciones no restablecen (D250). Al desactivar una cuenta o su institución se cierran sus sesiones. **Sesión con cookie** sólo HTTP, segura y del mismo sitio; el cifrado termina antes del servidor de aplicaciones, así que la sesión confía en la cabecera del intermediario. **Sin señal:** quien ya inició sesión sigue capturando; si la sesión venció cuando vuelve la señal, el envío pide de nuevo la contraseña sin perder lo capturado. | Decidido | `js/sesion.js` (`autenticar()`, con proveedor «simulado»), `js/usuarios.js` (reglas de la cuenta), `AUTENTICACION` en `js/config.js`. |
| 29 | Paleta vegetal y fruto comestible (D252) | Guardar en `especies` `paleta_vegetal` (Sí · No) y `fruto_comestible` (Sí · No · Por determinar), los dos obligatorios en toda alta y edición; validar el dominio. Supervisión e informes cuentan los árboles con fruto comestible (M343), con el periodo y los filtros de siempre. | Decidido | `js/catalogos.js` (`PALETA`, `FRUTO`, `marcasEspecie`), `herramientas/generar_especies.py`. |

## 2. Qué guarda el teléfono (S-11)

Decisión del 28-09-2026. No se implementa en la Etapa 1: hoy el teléfono es la única copia y el
envío es simulado, así que borrar lo «enviado» sería perderlo.

| Qué | Dónde vive |
|---|---|
| Lo que no se ha enviado | En el teléfono, hasta que el servidor confirme la recepción. |
| Árboles de la jornada abierta, enviados o no | En el teléfono, hasta cerrar la jornada y generar su reporte. Sin esto, con señal intermitente, el mapa, el conteo contra los previstos, los avisos de duplicados y el reporte quedarían incompletos. |
| Catálogos, especies, vehículos y la cuenta | En el teléfono, siempre, para capturar sin señal. |
| Jornadas cerradas, historial y fotografías recibidas | Sólo en el servidor. Se consultan y editan ahí, con señal: editar un árbol de hace un mes va directo al servidor, que valida y deja su bitácora. Sin señal la app dice «Sin señal: sólo puede ver y corregir lo que aún no se envía». |

Efectos: el teléfono no acumula historial ni fotos; un teléfono perdido sólo expone la jornada del
día; Registros, Jornadas y Supervisión pasan a leer del servidor lo enviado. En iPhone el navegador
no envía con la app cerrada: los datos salen cuando el cabo abre la app con señal.

## 3. Qué es simulado y hay que reemplazar

| Pieza | Hoy (Etapa 1) | Qué hacer |
|---|---|---|
| Datos de prueba | `ES_FICTICIO: true` en `js/config.js`: banda de datos ficticios, entrada de prueba, cambio de perfil, herramientas del pie, espejo de campos. | `ES_FICTICIO: false` apaga todo eso y usa la base real `srp_sia`, vacía y distinta de la de prueba. |
| Acceso | `autenticar()` en `js/sesion.js` con proveedor «simulado»; con `ES_FICTICIO: false` el acceso queda cerrado. | Conectar el acceso con correo y contraseña contra la base propia de usuarios del servidor (fila 28, `AUTENTICACION.PROVEEDOR`); agregar en Cuentas el botón «Restablecer contraseña» para la Administración global. |
| Envío | Servidor simulado en `js/envio.js`; nada sale del teléfono. | Sustituir por la API real conservando estados, avisos y reintentos. |
| Folio | Emisión simulada por celda en `js/folio.js`, con consecutivos en `localStorage`. | La emite el servidor (apartado 1, fila 3). |
| Cuentas y catálogos de arranque | `js/datos-ficticios.js`; vehículos de prueba, con placas ficticias, en `assets/catalogos/catalogo-vehiculos.js`. | Cargar los reales en el servidor. La lista real de vehículos (16, placa, modelo y tipo) está en `originales/vehiculos_reales_2026-09-26.csv`, fuera del repositorio: nunca se publica en el sitio. Las 79 especies de `assets/catalogos/catalogo-especies.js` ya son el catálogo real del SIA, con su paleta vegetal y su fruto comestible (se generan con `herramientas/generar_especies.py`). |
| Datos de demostración | `js/demostracion.js` (ids `demo-`). | Retirar al cerrar la Etapa 1. |
| Reinicio de los datos de prueba | `SELLO_REINICIO` en `js/config.js` y `reiniciar()` en `js/almacen.js`: un teléfono con un sello anterior vuelve a empezar aunque tenga capturas (D190). | Retirar con `ES_FICTICIO`: con datos reales nunca se borra lo capturado. |
| Espejo de campos | `js/espejo.js`. | Retirarlo siguiendo su encabezado; las pruebas comprueban que la app abre sin él. |
| Claves de prueba en `localStorage` | `srp_secuencias_folio_prueba`, `srp_envios_prueba`, `srp_sin_senal_prueba`, `srp_demo_quitados`, `srp_sello_datos`. | Desaparecen con `ES_FICTICIO`. |

## 4. Qué debe entregar el SIA antes de operar

- Las tres capas son definitivas y **están verificadas contra las del SIA** (D251): alcaldías y UGA del SIA, y colonias del IECM 2022 (1,837), que son la unidad oficial de reporte. Las claves de las ocho celdas UGA con prefijo distinto a su alcaldía son correctas (D249). Una capa nueva se carga con `herramientas/generar_capas.py`.
- Mapa base de producción (D251): **CARTO para «Calles»** y **Esri, en su modalidad gratuita, para «Satélite»**; confirmar los términos de uso de cada uno. La clave de CARTO la guarda el servidor, en su configuración fuera del repositorio, y la app pide las teselas a través de él: nunca va en el código de la app ni en el repositorio. El dominio de cada proveedor que llegue directo al teléfono se agrega a la política de seguridad de `index.html`.
- Convenio o carta responsiva con cada institución externa antes de darle cuentas; el sistema no guarda su referencia (D188), vive en el expediente.
- Dónde viven las fotografías (archivo y disco) y su respaldo: viven fuera de la base y no entran a su respaldo. El espacio disponible alcanza para el piloto, no para la operación plena.
- Límites del servidor web: tamaño de subida y peticiones por minuto.
- El módulo y el esquema de plantación que ya existen en el SIA no se reutilizan: el SRP entra como proyecto nuevo, con su esquema, su ruta y su cuenta de servicio (03-10-2026), todos con el nombre `srp` (D249). Al SIA se le pide el esquema `srp`, una cuenta de servicio de permisos mínimos, el lugar en el servidor de aplicaciones y la ruta. El módulo de usuarios lo trae el SRP: no se pide al SIA.
- Preguntas al SIA para la construcción: si el SRP entra como módulo del backend central o como servicio aparte, y con qué convenciones; la versión de Node.js del servidor de aplicaciones; quién crea el esquema y la cuenta de servicio (el SIA con el guion que entrega el SRP, o el proyecto); cómo se instala una versión nueva y quién lo hace; si hay ambiente de pruebas separado.
- Ya no aplican: el aviso de privacidad (consultado; no se requiere, D249) y el proveedor institucional de identidad (el acceso es con cuentas propias, fila 28).
- Las capas viajan con el SRP: el servidor las carga en su esquema `srp` y no depende de las del esquema `territorio`. Las 1,817 unidades territoriales de `territorio` son otra capa y el SRP no la usa (D251).
- El orden de todo lo anterior, con responsables y criterios de salida, está en `docs/PLAN-TRASPASO-SIA.md`.

## 5. Decisiones abiertas

| Tema | Opciones | Recomendación |
|---|---|---|
| Fotografías | Espacio y respaldo del volumen donde vivan | Ampliación solicitada antes de la operación plena |
| Módulo de plantación actual del SIA, al final | Cuando el SRP opere: cargar su contenido como histórico (fila 16) o archivarlo. Hasta entonces conviven (D251) | — |
| Frutales (M343) | Marcar en el catálogo qué especies son frutales: de dónde sale la marca (el catálogo del SIA no la trae) y dónde se muestra | En trabajo de Liber |

Ya decididas (D249 a D251): colonias del IECM 2022 y capas verificadas; mapa base con CARTO y Esri; doble conteo entre instituciones (fila 8), histórico cargado a nombre de la
Administración global (fila 16), prioridad congelada con el árbol y con la jornada (fila 19, D250), acceso con cuentas propias
y restablecimiento sólo por la Administración global (fila 28, D250) y repositorio: uno nuevo y limpio con el mismo nombre al iniciar la fase de servidor, para
que los archivos originales del SIA y las placas reales que quedaron en el historial no pasen a él; el
sitio conserva su dirección.

## 6. Lista de verificación antes de entregar al SIA

Lo que hoy es de prueba y no debe llegar a producción. Los detalles están en el apartado 3.

- [ ] `ES_FICTICIO: false`. Con eso desaparecen la banda «Datos ficticios de prueba», «Entrar como
      usuario de prueba», el cambio de perfil, «Simular sin señal», «Restablecer datos de prueba» y
      «Campos que viajan a la base y no se ven en pantalla».
- [ ] La entrada como usuario de prueba permite entrar sin contraseña: nunca en producción. Sí puede
      conservarse en el ambiente de pruebas del SIA, con `ES_FICTICIO: true`.
- [ ] Retirar los datos de demostración (`js/demostracion.js`) y sus botones.
- [ ] **Vehículos: los del catálogo de la app son ficticios** (placas inventadas). Cargar en el
      servidor la lista real, que está en `originales/` y no se publica.
- [ ] Cuentas, áreas, instituciones y solicitantes de arranque (`js/datos-ficticios.js`) son de
      ejemplo: cargar los reales en el servidor.
- [ ] El catálogo de especies sí es el real (79 especies: 76 de la paleta vegetal y 3 fuera de ella); no se sustituye.
- [ ] Conectar el acceso con cuentas propias (correo y contraseña), la API de envío y la emisión de folios.
- [ ] Ninguna cuenta de arranque con contraseña conocida: cada una con contraseña temporal de un solo uso.

## 7. Paquete de traspaso (al cerrar la Etapa 1)

Se hace en un solo bloque, cuando la Etapa 1 deje de cambiar, para no hacer trabajo doble:

1. `ESPECIFICACION.md` con sólo las reglas vigentes, ordenadas por módulo (captura, jornadas,
   reportes, permisos, datos, folio, sin señal, Fase 2), con identificadores estables y marcando
   qué implementa el servidor. Absorbe este archivo.
2. `docs/DECISIONES.md`, `docs/BITACORA.md` y `docs/MEJORAS.md` pasan a `docs/historial/` como archivo de auditoría.
3. `README.md` para el programador: cómo correr la app y las pruebas, qué es simulado (apartado 3) y
   la guía de integración con el servidor (apartados 1 y 2).
4. Comentarios del código en presente, sin números de decisión, mejora o bloque ni historia; se
   quedan las referencias a reglas de negocio (p. ej. R1–R8 del folio). Desde el bloque 114 los
   comentarios nuevos ya se escriben así.
5. Una prueba de auditoría que falle si queda en el código un número de decisión, de mejora o de
   bloque, o un «antes…».
6. Fuera del paquete lo que sólo sirvió al proceso de la Etapa 1 (herramientas y notas de sesión).
