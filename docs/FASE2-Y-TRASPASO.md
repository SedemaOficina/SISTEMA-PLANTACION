# Fase 2 y traspaso al SIA

Este archivo reúne, en un solo lugar, lo que debe saber y hacer quien reciba el SRP para montarlo
en los servidores de la Secretaría. Es el punto de partida del programador: qué construir en el
servidor, qué es simulado en la Etapa 1 y hay que reemplazar, qué debe entregar el SIA antes, qué
falta decidir y cómo se prepara el paquete de traspaso.

Se mantiene al día en cada bloque: toda decisión nueva sobre la Fase 2 o el traspaso se escribe
aquí, además de en `DECISIONES.md`. El detalle técnico de cada campo está en `datos/esquema.json` (y en
`datos/DICCIONARIO-DATOS.md`, que se genera de él); las reglas de la Fase 2 del esquema son las `S-nn`
que se citan abajo.

Estado al 03-10-2026: versión 0.9.26 (Bloque 159). Base del teléfono versión 7: `srp_db` en pruebas, `srp_sia` en la real.

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
| 8 | Posible duplicado (S-05) | Avisar al recibir cuando otro registro cae a menos de la incertidumbre combinada de ambos puntos (suma de precisiones, piso 4 m). Aviso, no bloqueo. | Decidido | En el teléfono sólo hay avisos dentro de la jornada (`js/jornadas.js`). |
| 9 | Bandeja de especies (S-06) | Donde el SIA resuelve cada «Otra especie»: alta en el catálogo o reasignación a una existente. | Decidido | `especie_id` vacío y `especie_otra` escrita en `plantaciones`; si la bandeja necesita estados propios, son del servidor. |
| 10 | Fotografías a archivo (S-07) | Sacar la foto del renglón y guardarla como archivo referido por `foto_id`. | Decidido | Hoy van dentro del registro (`foto_base64`). |
| 11 | Rederivación territorial (S-08) | Con las capas definitivas, recalcular alcaldía, colonia y celda UGA de todo registro según su `capa_version`. | Decidido | `js/derivacion.js`. |
| 12 | Datos de prueba separados (S-09) | El servidor de producción arranca limpio y sólo recibe de la versión real. | Decidido | La versión de prueba guarda en `srp_db` y la real en `srp_sia` (`SRP.CONFIG.DB_NOMBRE`); nunca conviven en un teléfono. Ya no hay marca de prueba en las tablas. |
| 13 | Supervisión con todos los cabos | Supervisión, informes y CSV leen del servidor los datos de todas las cuadrillas e instituciones; la Administración los desglosa y filtra por organización (D187). Las consultas de Registros y Jornadas aceptan también especie, programa, alcaldía, tipo de institución e institución (D200); tipo e institución sólo para la Administración global. Para llenar las listas, el servidor responde también los valores disponibles de cada filtro dados los demás (D202). | Decidido | `js/indicadores.js`, `js/supervision.js`, `js/informes.js` (hoy, sólo lo que hay en el teléfono). |
| 14 | Instituciones externas (S-12, D186–D192) | Alcaldías, Gobierno de la CDMX (PAOT, SOBSE…), empresas y organizaciones civiles registran con cuentas de cabo y de coordinación que da de alta la Secretaría a solicitud; sólo SEDEMA tiene área y Administración global. El cabo depende de uno o varios coordinadores de su misma institución (`coordinadores_ids`), y el servidor lo valida: el alcance de «su cuadrilla» se decide por pertenencia a esa lista. El servidor filtra por `organizacion_id`: una cuenta nunca recibe registros de otra institución. Carga en la base real el catálogo de instituciones de arranque (SEDEMA `o-sedema`, PAOT, SOBSE, Green Cover, Reforestamos México y las 16 alcaldías `o-alc-<cvegeo>`, fijas). Rechaza el acceso de cuentas cuya institución esté desactivada. El nombre de la cuenta va en `nombre_completo`. Lo que plantan suma a las cifras de la Ciudad. El servidor también impone los programas por tipo de institución, leyendo `catalogos.tipos_organizacion` de cada programa (SEDEMA, todos; de arranque: Reforestación Urbana para alcaldías, Gobierno de la CDMX y organizaciones civiles; Palmeras para empresas; D193), y rechaza personal, chófer y vehículo en jornadas que no son de SEDEMA. Sólo la Administración cambia `tipos_organizacion`. «Jornadas de voluntariado» no se carga en la base real. | Decidido | `js/usuarios.js` (reglas de la cuenta), `js/sesion.js` y `accesoOrganizacion()` en `js/referencias.js` (acceso), `js/datos-ficticios.js` (arranque). |
| 15 | Parámetros del sistema (D195) | Guardar en el servidor los parámetros que hoy muestra Configuración › Parámetros (distancias de los avisos de jornada, niveles de precisión, margen del límite, espera del GPS, hora de atraso, reintento, fotografía y renglones por página) y repartirlos a todos los teléfonos; sólo la Administración global los cambia, y cada cambio va a la bitácora. Mientras, se leen de `js/config.js`. | Decidido | `SRP.configuracion.parametros()` en `js/configuracion.js` (lista y textos) y `js/config.js` (valores). |
| 16 | Carga masiva del histórico (D196) | Recibir el lote que hoy arma el teléfono (o el archivo, con la misma revisión de `js/carga.js`) y guardarlo en una transacción: jornadas con `carga_id`, árboles y el renglón `carga` de la bitácora; emitir los folios. El histórico es **por árbol**. Validar igual que el teléfono: especie del catálogo por nombre científico, punto dentro de la Ciudad, fecha no futura, programa, tipo e institución existentes, sin repetidos, y sin árboles que ya estén en la base con la misma huella (punto con seis decimales, especie, fecha e institución; D199). Deshacer un lote completo por `carga_id` en una transacción, con su renglón `ELIMINADO` de la entidad `carga` en la bitácora (D199). Por decidir: si lo cargado debe verse también en las cuentas de la institución (hoy queda a nombre de quien carga). | Decidido | `js/carga.js` (reglas, agrupación y guardado), `js/excel.js` (lectura y escritura de Excel). |
| 17 | Sustitución de árboles (D203) | Recibir el sustituto y el original en una sola operación: el sustituto con `sustituye_id`, `motivo_sustitucion` (VANDALISMO, IMPACTO_VEHICULAR, ROBO, MUERTE, OTRO) y `motivo_sustitucion_otro` (obligatorio con OTRO); el original con estatus `sustituido` y `sustituido_por_id`. Validar que el original esté `activo`, sin sustituto y en el alcance de quien sustituye. El sustituto va en la jornada del original, con la fecha de la sustitución (no anterior a la plantación del original; D204), recibe su propio folio y cuenta como plantado en el periodo de esa fecha; los informes dicen las sustituciones por motivo. Al eliminar el sustituto, el original vuelve a `activo`. | Decidido | `js/registros.js` (`sustituir`, `eliminar`, `restaurar`), `js/formulario.js` (`guardarSustituto`). |
| 18 | Jornada de varios días y relevo de cabo (D204) | Aceptar en una jornada abierta árboles de días posteriores, cada uno con su `fecha_plantacion` entre `jornadas.fecha` y el día en que se recibe, y sólo de quien la tiene a su cargo: `relevo_id` o, sin relevo, `cabo_id` (S-13). Al cambiar la fecha de una jornada, aplicarla sólo a los árboles del día de inicio y rechazarla si queda después de un árbol de otro día. Relevo: aceptarlo sólo de la coordinación del titular, hacia un cabo activo de su cuadrilla y de la institución de la jornada, con la jornada abierta; guardar `relevo_id`, agregar el renglón a `relevos` y a la bitácora (`RELEVO`); entregar la jornada abierta y todos sus árboles al teléfono del cabo que la recibe y dejar de aceptar árboles del titular mientras dure; avisar del relevo a los dos cabos en su teléfono (hoy el aviso sale al entrar, en el equipo donde se hizo el relevo: `SRP.activa.avisarRelevos()`, D205). Los indicadores cuentan cada árbol en el periodo de su fecha y con su autor. | Decidido | `js/permisos.js` (`jornada.registrar`, `jornada.relevo`, `personasDe`), `js/jornadas.js` (`relevar`, `guardarEdicion`, `mover`), `js/jornada-activa.js` (`abiertas`, `fechaInicial`), `js/indicadores.js`. |
| 19 | Colonias prioritarias (D206) | Publicar la capa de colonias prioritarias como capa del SIA, con versión y geometría completas (la recibida es simplificada), y calcular en el servidor el indicador «Por prioridad de la colonia» con el punto de cada árbol. Decidir si la prioridad se congela con el árbol al recibirlo (como la celda UGA) o se recalcula con la capa vigente: hoy se recalcula al consultar y no se guarda. Lo mismo la prioridad de la jornada (la de la mayoría de sus árboles; D207), que se imprime en el reporte de la jornada: si la capa cambia, un reporte regenerado puede decir otra prioridad. Marginación, población y pobreza no se publican en el sitio. | Por decidir | `js/prioritarias.js`, `herramientas/generar_capas.py`, `js/indicadores.js` (`prioridad`). |
| 20 | Pedido especial (D210, D217) | Guardar en `jornadas` el origen (`PROGRAMADA` o `PEDIDO`), `solicitante_id` (→ catálogo de solicitantes, `catalogos.tipo = solicitante`, aparte del de instituciones; lleva `tipo_solicitante` de una lista fija de siete), `solicitante_otro` y `pedido_descripcion`, y validar lo mismo que el teléfono: un pedido lleva solicitante (del catálogo o escrito) y descripción, obligatoria, y una programada lleva los tres vacíos (S-14). El solicitante no da acceso: quien pide no ve la jornada por pedirla, ni tiene cuenta por estar en el catálogo; si se quiere que la vea, es una decisión de permisos aparte. Decidir si «Otra instancia» se da de alta en el catálogo al recibirla o se queda como texto. Cargar en la base real los solicitantes de arranque (Oficina de la Secretaría, SOBSE, SEGIAGUA, Jefatura de Gobierno, 16 alcaldías, Diputadas y diputados) | Pendiente | `js/pedido.js`; `js/referencias.js` `TIPOS_SOLICITANTE`; `js/datos-ficticios.js`; `js/jornada-activa.js` `iniciarJornada()`; `js/jornadas.js` `guardarEdicion()` |
| 21 | Jornada íntegra y alcance por institución (S-15) | Entregar a quien tiene la jornada a su cargo todos sus árboles activos, los capture quien los capture: reporte, conciliación y avance se calculan con todos; los permisos de edición siguen por árbol. Decidir el alcance por `jornadas.organizacion_id`, no por la institución o coordinación actual de quien capturó. El cabo de un relevo ya devuelto conserva la lectura, no la edición. | Decidido | En el teléfono, el titular sólo ve los árboles que él capturó (`jornadasAlcance()` en `js/jornadas.js`), el alcance de la coordinación sale de los `coordinadores_ids` actuales del autor y `personasDe()` en `js/permisos.js` da edición a todos los relevos. No se corrige en la Etapa 1. |
| 22 | Escrituras parciales y folio inmutable (S-16) | Aplicar sólo los campos que cambia cada operación sobre el registro vigente; rechazar la escritura hecha sobre una versión anterior y devolver la vigente. El folio se asigna una vez y ninguna operación lo cambia ni lo anula. | Decidido | En el teléfono, cerrar la jornada desde la franja, eliminar desde una lista y guardar una edición escriben la copia que estaba en memoria (`js/jornada-activa.js`, `js/registros.js`, `js/formulario.js`). |
| 23 | Eliminados y registro de cambios (S-17) | Consulta de árboles y jornadas eliminados con su historial y «Restaurar»; registro de cambios con árboles y jornadas, valor anterior y nuevo, cuenta, fecha y hora e identificador del dispositivo; motivo de la eliminación. | Decidido | En el teléfono lo eliminado sólo se restaura desde el aviso «Deshacer»; el Registro de cambios muestra cuentas, catálogos y cargas, y la bitácora guarda los nombres de los campos, no sus valores. |
| 24 | Cola de envío por operación (S-18) | Enviar cada operación: altas, ediciones, eliminaciones, restauraciones, sustituciones, jornadas, cierres, reaperturas y relevos. | Decidido | La cola simulada de `js/envio.js` sólo considera árboles activos: sirve de referencia para estados y avisos, no para el alcance. |
| 25 | Vigencia del reporte (D215) | Fijar `reporte_en` cuando se recibe el reporte entregado y anularlo en la misma transacción que reabra la jornada o que elimine, restaure, edite, mueva o sustituya uno de sus árboles, con su renglón de bitácora. Dos altas idénticas de jornada en el mismo instante se tratan como una sola (clave de la operación). | Decidido | `js/reportes.js` (`marcarGenerado`, `caducar`) y `js/jornada-activa.js` (`cambiarEstatus`, `volverACerrar`). |

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
| Acceso | `autenticar()` en `js/sesion.js` con proveedor «simulado»; con `ES_FICTICIO: false` el acceso queda cerrado. | Conectar el proveedor institucional de identidad (`AUTENTICACION.PROVEEDOR`). |
| Envío | Servidor simulado en `js/envio.js`; nada sale del teléfono. | Sustituir por la API real conservando estados, avisos y reintentos. |
| Folio | Emisión simulada por celda en `js/folio.js`, con consecutivos en `localStorage`. | La emite el servidor (apartado 1, fila 3). |
| Cuentas y catálogos de arranque | `js/datos-ficticios.js`; vehículos de prueba, con placas ficticias, en `assets/catalogos/catalogo-vehiculos.js`. | Cargar los reales en el servidor. La lista real de vehículos (16, placa, modelo y tipo) está en `originales/vehiculos_reales_2026-09-26.csv`, fuera del repositorio: nunca se publica en el sitio. Las 76 especies de `assets/catalogos/catalogo-especies.js` ya son el catálogo real del SIA (se generan con `herramientas/generar_especies.py`). |
| Datos de demostración | `js/demostracion.js` (ids `demo-`). | Retirar al cerrar la Etapa 1. |
| Reinicio de los datos de prueba | `SELLO_REINICIO` en `js/config.js` y `reiniciar()` en `js/almacen.js`: un teléfono con un sello anterior vuelve a empezar aunque tenga capturas (D190). | Retirar con `ES_FICTICIO`: con datos reales nunca se borra lo capturado. |
| Espejo de campos | `js/espejo.js`. | Retirarlo siguiendo su encabezado; las pruebas comprueban que la app abre sin él. |
| Claves de prueba en `localStorage` | `srp_secuencias_folio_prueba`, `srp_envios_prueba`, `srp_sin_senal_prueba`, `srp_demo_quitados`, `srp_sello_datos`. | Desaparecen con `ES_FICTICIO`. |

## 4. Qué debe entregar el SIA antes de operar

- Las tres capas ya son definitivas: alcaldías y UGA del SIA, y colonias del IECM 2022, que son la unidad oficial de reporte. Falta que el SIA confirme las ocho claves UGA con prefijo distinto a su alcaldía antes de emitir folios. Una capa nueva se carga con `herramientas/generar_capas.py`.
- Mapa base de producción con licencia confirmada (hoy Esri); si cambia el dominio, también en la política de seguridad de `index.html`.
- Aviso de privacidad: el sistema guarda nombre completo, correo, institución, área y cargo del personal, y fotos con ubicación. Debe cubrir también al personal de alcaldías, PAOT, SOBSE, empresas y organizaciones civiles (D186).
- Acceso para cuentas de fuera de la Secretaría: confirmar si el proveedor institucional de identidad cubre a alcaldías, PAOT y SOBSE, y cómo entran empresas y organizaciones civiles.
- Convenio o carta responsiva con cada institución externa antes de darle cuentas; el sistema no guarda su referencia (D188), vive en el expediente.
- Dónde viven las fotografías (archivo y disco), límites de nginx y HTTPS para pruebas internas.
- Si existe un módulo `plantacion` previo en el SIA, cómo se integra.

## 5. Decisiones abiertas

| Tema | Opciones | Recomendación |
|---|---|---|
| Mapa base de producción | Esri con licencia u otro proveedor | — |
| Colonias | En el teléfono o sólo en el servidor | — |
| Doble conteo | Regla de duplicados en el servidor más bandeja | — |
| Histórico cargado y cuentas de la institución | Hoy lo cargado queda a nombre de quien carga y sólo lo ve la Administración; podría asignarse al coordinador de la institución para que lo vean sus cuentas | Decidir antes de cargar el histórico real (D196) |
| Historial de git | Los archivos originales del SIA y, del bloque 100 al 117, las placas reales siguen en el historial: dejarlo, reescribirlo, repositorio nuevo y limpio, o resolverlo en el traspaso | Resolverlo en el traspaso: el SIA recibe una copia sin historial y, con el sistema en sus servidores, el repositorio de GitHub se archiva y se hace privado. Si no se quiere esperar, repositorio nuevo y limpio con el mismo nombre (el sitio conserva su dirección) |

## 6. Paquete de traspaso (al cerrar la Etapa 1)

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
