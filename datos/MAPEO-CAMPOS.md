# Mapeo de campos

Qué se guarda, con qué nombre, si es obligatorio y de dónde sale cada dato. Un campo aparece
completo en el módulo que lo origina; donde se reutiliza se anota con una remisión, para no
describir dos veces la misma cosa y que las dos descripciones acaben diciendo cosas distintas.

Este documento se comprueba solo: `pruebas/auditoria.py` compara esta lista contra los campos que
el sistema guarda de verdad y avisa si alguno sobra o falta. La vista por tabla —tipos, llaves,
índices, dominios, relaciones, reglas y el borrador de la base de la Fase 2— está en
`DICCIONARIO-DATOS.md`, generado de `esquema.json` (D86).

Mientras dure la Etapa 1, la pantalla de registro lleva al pie un **espejo de campos** que enseña
en vivo los que aquí aparecen con «—» en la columna de etiqueta: los que viajan a la base sin tener
lugar en la interfaz. Sale del mismo objeto que se guarda, así que es la forma más rápida de ver
que este documento y el sistema dicen lo mismo. Desaparece al cerrar la etapa.

## Cómo leer la columna «Origen»

| Origen | Qué significa |
|---|---|
| **Persona** | Lo escribe o lo elige quien usa el sistema |
| **Catálogo** | Se elige de un catálogo administrable; se guarda la clave, no el texto |
| **Capa geográfica** | Se deriva del punto contra las capas del SIA (`originales/`, compactadas por `herramientas/generar_capas.py`); nadie lo teclea |
| **Sistema** | Lo pone el sistema: identificadores, fechas de registro, marcas de edición |
| **Sesión** | Se toma de quien tiene la sesión abierta |

---

## Módulo: Registro de plantación

Pantalla **Nuevo registro**. Almacén `plantaciones`.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| Identificador | `id` | Sí | Sistema | UUID. Se fija al abrir la ficha de revisión y es el que se guarda. No se edita. [pendiente] En Fase 2 convivirá con un folio legible |
| — | `estatus` | Sí | Sistema | `activo`, `eliminado` o `sustituido`. Eliminar marca, no borra; un árbol con sustituto pasa a `sustituido` y deja de contar como plantado (D203) |
| — (el encabezado dice quién tiene la sesión) | `cabo_id` | Sí | Sesión | Remite a `usuarios.id`. No es un campo del formulario: se toma de la sesión. Al editar conserva al cabo que capturó, no a quien corrige |
| Coordenadas (latitud, longitud) | `lat` | Sí | Persona | Del botón de ubicación, de tocar el mapa o de la captura manual. Campo de sólo lectura: se cambia moviendo el punto |
| Coordenadas (latitud, longitud) | `lng` | Sí | Persona | Ídem. Los dos se muestran juntos en un solo campo |
| Cómo se obtuvo el punto | `punto_origen` | Sí | Sistema | `gps`, `mapa`, `manual` o `ajustado`. Lo determina la acción con que se colocó el punto, no una elección de quien captura. Campo de sólo lectura |
| Cómo se obtuvo el punto | `gps_precision_m` | No | Sistema | Margen de error en metros que reporta el aparato. **Existe si y sólo si `punto_origen` es `gps`**: al mover el punto a mano el margen deja de describirlo y se borra, para que nunca pueda leerse como la precisión de una coordenada señalada con el dedo. La auditoría comprueba esta regla |
| Folio | `folio` | No | Servidor | `AAA-000-00000` (13 caracteres): clave de la celda UGA y consecutivo perpetuo de la celda (D67). `AAA` es el **prefijo de la celda, no la alcaldía** del árbol (D152). Único en la base. Con datos reales, **nulo en toda la Etapa 1**: lo asigna el servidor una sola vez al sincronizar (R3), y la pantalla muestra PROVISIONAL (R1). Con datos de prueba lo llena el servidor simulado y se marca «(simulado)» en pantalla y en cada renglón del PDF (D110, D152). Inmutable (R7) |
| — | `jornada_id` | Sí | Sistema | La jornada activa al registrar (D119); cambia con «Mover a otra jornada» en **Jornadas** |
| «Sustituye a» (detalle) | `sustituye_id` | No | Sistema | Sólo en un sustituto: remite al árbol perdido (`plantaciones.id`). El sustituto se registra en la jornada del árbol perdido y se pinta en morado (D203) |
| Razón de la sustitución | `motivo_sustitucion` | No | Persona | `VANDALISMO`, `IMPACTO_VEHICULAR`, `ROBO`, `MUERTE` u `OTRO`; obligatorio al sustituir (D203) |
| Escriba el motivo | `motivo_sustitucion_otro` | Sí | Persona | Texto con motivo «Otro»; vacío en los demás (D203) |
| «Sustituido por» (detalle) | `sustituido_por_id` | No | Sistema | Sólo en el árbol perdido: su sustituto. Vuelve a nulo si el sustituto se elimina (D203) |
| — | `alcaldia_cve` | No | Capa geográfica | Clave INEGI `cvegeo` de la alcaldía (p. ej. `09015`). Es la llave para unir con el esquema `territorio` del SIA; el nombre se guarda aparte para leerse sin cargar la capa |
| Alcaldía | `alcaldia` | No | Capa geográfica | Nombre, del punto contra la capa `alcaldias` del SIA (16 polígonos). Campo de sólo lectura. Un punto que cae fuera del límite, a menos de 100 m, toma la alcaldía más cercana y se avisa (D152); más lejos no se acepta. Nulo sólo si el territorio no se pudo derivar: entonces no recibe folio |
| — | `colonia_cve` | No | Capa geográfica | Clave `CVEUT` de la unidad territorial del IECM (p. ej. `15-040`); llave para unir con la capa. Nulo fuera de la zona urbana |
| Colonia | `colonia` | No | Capa geográfica | Nombre como viene en la capa: mayúsculas y tipo entre paréntesis, `SAN MIGUEL (BARR)` (D62). Nulo donde la capa no tiene colonia (suelo de conservación y 31 km² urbanos), y la pantalla dice «Sin colonia en la capa» (D152). **Capa definitiva (IECM 2022)**: las colonias del IECM son la unidad oficial de reporte (D180) |
| — | `uga` | No | Capa geográfica | Clave del hexágono de la malla UGA del SIA (~1 km², 1,624 celdas), p. ej. `TLP-318`. **El prefijo no es la alcaldía del punto**: es la alcaldía a la que se asignó la celda, y en la frontera difieren. La alcaldía sale de su propia capa |
| — | `uga_borde_m` | No | Capa geográfica | Metros del punto al borde de su celda UGA (D152). Si es menor que la precisión del GPS, la ficha y el detalle dicen «Celda incierta»: el servidor confirmará la celda |
| — | `capa_version` | No | Sistema | Versión de cada capa con la que se derivó, p. ej. `alcaldias=sia-2026-01-01;uga=sia-2026-09-22;colonias=iecm-2022`. Permite rehacer el dato cuando una capa cambie |
| Especie | `especie_id` | Sí | Catálogo | Remite a `especies.id`: la clave `ESP-0000` del catálogo del SIA (D84). Vacío cuando se eligió «Otra especie». En pantalla se elige por nombre común, científico o cualquiera de los otros nombres comunes; sólo viaja la clave |
| Especifique la especie | `especie_otra` | Sólo con «Otra especie» | Persona | Texto libre, para lo que no está en el catálogo. La Administración global lo consulta agrupado en Configuración › Especies escritas |
| Programa | `programa_id` | Sí | Jornada | Remite a `programas.id`. Es el de su jornada (D151): no se pide por árbol, cambia cuando cambia el de la jornada y al mover el árbol toma el de la nueva. Se lee en la ficha de revisión y en el detalle |
| Fecha de plantación | `fecha_plantacion` | Sí | Persona | `AAAA-MM-DD`, el día en que se plantó el árbol, entre la fecha de su jornada y hoy (D204). Se pide sólo si la jornada empezó antes de hoy; arranca con la fecha de la jornada el día que se inicia y con la de hoy los días siguientes. Un sustituto lleva la fecha de la sustitución. Si cambia la fecha de la jornada, la toman los árboles del día de inicio. Se muestra como 21-SEP-2026 |
| Comentarios | `comentarios` | No | Persona | Texto libre, hasta 500 caracteres: observaciones del sitio o del ejemplar. Cadena vacía si no se escribe nada; los registros anteriores a su reincorporación (D50) no traen la llave y se leen como «Sin comentarios». En el reporte PDF, en «Comentarios por ejemplar» (D164) |
| Fotografía | `foto_base64` | No | Persona | La imagen ya comprimida, incrustada. [pendiente] En Fase 2 sale del registro y se guarda como archivo, siguiendo la práctica que el SIA ya usa en sus otros módulos |
| — | `foto_id` | No | Sistema | UUID de la fotografía |
| — | `fecha_registro` | Sí | Sistema | Cuándo se guardó |
| — | `fecha_ultima_edicion` | No | Sistema | Nulo mientras no se edite |
| — | `editado_por_id` | No | Sistema | Remite a `usuarios.id`. Quién hizo la última edición |

**Por qué se guarda el origen del punto.** La fotografía es opcional y en campo la mayoría de los
registros no va a llevarla. Eso convierte a la coordenada en la prueba de que el árbol existe, y no
todas las coordenadas valen lo mismo: una tomada con el aparato junto al árbol no es una señalada
en el mapa desde una oficina. El sistema siempre supo cuál de las cuatro fue; lo que faltaba era
escribirlo. Es un dato que sólo existe en el instante de la captura y no se reconstruye después.

**Campos que se muestran pero no se guardan aquí:** el nombre común y el científico de la especie,
y el nombre del programa, salen del catálogo cada vez que se pintan. Si se corrige un nombre en
Catálogos, se corrige en todos los registros y en el PDF.

**Campos de la especie que viajan a la base sin verse en pantalla:** el registro guarda sólo
`especie_id`; con esa clave el SIA obtiene del catálogo, sin que se copien al registro, el
nombre científico (del que salen género y epíteto), el tipo de distribución (`tipo_distribucion`), la forma
de crecimiento (`formadecrecimiento`) y las llaves externas de CONABIO (`id_snib`,
`id_enciclovida`). No se duplican en el registro a propósito: si el SIA corrige un dato del
catálogo, queda corregido para todas las plantaciones (D84).

---

## Módulo: Cuentas de usuario

Pantalla **Usuarios**, sólo Administración global. Almacén `usuarios`.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| — | `id` | Sí | Sistema | UUID |
| Tipo de institución e Institución | `organizacion_id` | Sí | Catálogo | Primero el tipo (Alcaldía · Gobierno de la CDMX · Empresa privada · Organización civil), luego la institución de ese tipo; remite a `catalogos.id` con `tipo = organizacion`. Sólo se elige de la lista: las nuevas las agrega la Administración en Catálogos › Instituciones. Fuera de SEDEMA la cuenta es de cabo o de coordinación, sin área; el cabo depende de un coordinador de su misma institución (D192) |
| Área | `area_id` | Sólo en SEDEMA | Catálogo | Remite a `areas.id`: DGSANPAVA, Oficina de la Secretaría, Sistema de Información Ambiental, DGEIRA; nula en cuentas de otras instituciones |
| Nombre completo | `nombre_completo` | Sí | Persona | Nombre y apellidos en un solo campo (antes eran tres; al abrir se unen) |
| Correo | `correo` | Sí | Persona | Identifica la cuenta y sirve para entrar. Único. No se puede cambiar después |
| Cargo | `cargo_rol` | Sí | Persona | Texto libre; descriptivo, no gobierna permisos |
| Perfil de captura | `perfil` | Sí | Persona | `CABO`, `COORDINADOR`, `DIRECTIVO` o `ADMIN`. Es lo que decide qué puede hacer. `DIRECTIVO` sólo ve y descarga: en la Secretaría, todo; en otra institución, lo de la suya (D224). Consulta (`VIEWER`) se retiró en D87 |
| Coordinadores | `coordinadores_ids` | Sólo para cabos | Persona | Lista de `usuarios.id`, uno o varios, de la misma institución. Cada coordinador asignado ve y edita sus registros; sin ninguno, la lista va vacía |
| Estado | `activo` | Sí | Persona | Una cuenta inactiva no puede entrar; sus registros se conservan |
| — | `fecha_creacion`, `creado_por_id` | Sí | Sistema | Cuándo y quién dio de alta la cuenta (los mismos nombres que en catálogos) |
| — | `fecha_ultima_edicion`, `editado_por_id` | No | Sistema | |

---

## Módulo: Catálogos

Pantalla **Catálogos**, sólo Administración global, con una pestaña por catálogo. **Cada catálogo
tiene su tabla** (D225): `programas`, `areas`, `especies`, `vehiculos`, `instituciones` y
`solicitantes`, las mismas en el teléfono y en el servidor. Las seis comparten los campos de la
primera tabla de abajo; las especies añaden los del catálogo del SIA; los vehículos, su modelo y su
tipo (D162); las instituciones y los solicitantes, su tipo; los programas, quién puede usarlos.

| Pestaña | Tabla | Campos propios |
|---|---|---|
| Programas | `programas` | `tipos_organizacion` |
| Áreas | `areas` | — |
| Especies | `especies` | `nombre_cientifico`, `otros_nombres_comunes`, `tipo_distribucion`, `formadecrecimiento`, `id_snib`, `id_enciclovida` |
| Vehículos | `vehiculos` | `modelo`, `tipo_vehiculo` |
| Instituciones | `instituciones` | `tipo_organizacion` |
| Solicitantes | `solicitantes` | `tipo_solicitante` |

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| — | `id` | Sí | Sistema | UUID en programas y áreas. **En especies es la propia clave `ESP-0000`** (D84) |
| Clave | `clave` | Sí | Persona / Sistema | Programas y áreas: se sugiere a partir del nombre, en mayúsculas y sin acentos; editable antes de guardar, fija después. **Especies: consecutivo `ESP-0000` que asigna el sistema** (siguiente al mayor en uso, sin importar el orden alfabético); nunca se escribe ni se reutiliza. Es la llave con la que se unen los datos |
| Nombre / Nombre común | `nombre` | Sí | Persona | Único dentro de su tipo. En especies corresponde al *nombre_comun* del catálogo del SIA: la etiqueta que reconoce el personal en campo |
| Estado | `activo` | Sí | Persona | Un valor inactivo deja de ofrecerse; los registros que ya lo usan no cambian |
| — | `fecha_creacion`, `creado_por_id` | Sí | Sistema | En las especies del catálogo: fecha de corte del SIA y creador nulo |
| — | `fecha_ultima_edicion`, `editado_por_id` | No | Sistema | |

**Sólo en especies** (libro `16._Registro_plantaciones_catalogos_05_10_2026.xlsx`, 79 especies: las 76 de la
paleta vegetal, verificadas contra EncicloVida/CONABIO el 22-09-2026, y tres fuera de ella; se genera con
`herramientas/generar_especies.py`, D84):

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Se ve en el formulario de registro | Notas |
|---|---|---|---|---|---|
| Nombre científico | `nombre_cientifico` | Sí | Persona | Sí, entre paréntesis | Género + epíteto, sin autoría ni subgénero: «Quercus rugosa». Único |
| Tipo de distribución | `tipo_distribucion` | Sí | Persona | No | `Endémica` · `Nativa` · `Exótica` · `Exótica-Invasora`, campo del SNIB. Sustituye a Nativa/Introducida |
| Otros nombres comunes | `otros_nombres_comunes` | No | Persona | Sólo como criterio de búsqueda | Separados por coma y espacio, hasta cinco. **Se buscan** en el formulario de registro y en Catálogos; la lista dice por cuál coincidió («también: Fresno»). Un mismo nombre puede señalar a varias especies, así que nunca resuelve solo |
| Forma de crecimiento | `formadecrecimiento` | No | Persona | No | Literal de la ficha técnica: `Árbol, Arbusto`… Puede traer varios |
| ¿Pertenece a la paleta vegetal de la Secretaría? | `paleta_vegetal` | Sí | Persona | Sí, como «Fuera de la paleta vegetal» bajo el nombre | `Sí` · `No`. En Catálogos, marca ámbar «Fuera de la paleta» y filtro «Mostrar». No impide registrar |
| ¿Su fruto es comestible? | `fruto_comestible` | Sí | Persona | No | `Sí` · `No` · `Por determinar`, sin valor de inicio al dar de alta. En Catálogos, marca gris «Fruto comestible» y filtro «Mostrar». Captura manual del área técnica |
| Id SNIB (IdCAT) | `id_snib` | No | Persona | No | Número + `ANGIO` o `GIMNO`. Llave externa al SNIB; puede venir vacío (Quercus rubra) |
| Id EncicloVida | `id_enciclovida` | No | Persona | No | Entero. Llave para reconsultar la ficha por API y enlazarla; más completa que el IdCAT |

**Sólo en vehículos** (los de las cuadrillas, entregados por Liber el 26-09-2026, D162). La placa
va en `nombre` («Placa» en pantalla), en mayúsculas; la clave es la placa sin espacios y no se
muestra.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| Modelo | `modelo` | Sí | Persona | La marca como se conoce en la cuadrilla: «Dodge», «Internacional». Se copia a la jornada al elegir la placa |
| Tipo | `tipo_vehiculo` | Sí | Persona | Pipa · Pick up · Doble cabina · Estacas · Redilas · Grúa; al escribir se proponen los que ya hay. Agrupa la lista de placas del cierre |

**Sólo en instituciones** (pestaña «Instituciones»: agregar a solicitud, renombrar y desactivar). De arranque: SEDEMA
(`o-sedema`), PAOT y SOBSE (Gobierno de la CDMX), Green Cover (Empresa privada), Reforestamos
México, A.C. (Organización civil) y las 16 alcaldías (`o-alc-` más su cvegeo INEGI), fijas y
guardadas sin la palabra «Alcaldía». Las demás las agrega aquí la Administración, a solicitud; en
el alta de cuentas sólo se eligen. La clave la pone el sistema y no se muestra.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| Tipo de institución | `tipo_organizacion` | Sí | Persona | Alcaldía · Gobierno de la CDMX · Empresa privada · Organización civil. Se elige al agregarla (nunca Alcaldía) y no cambia |
| Tipo de solicitante | `tipo_solicitante` | Sí | Persona | Sólo solicitantes (pestaña «Solicitantes»). Alcaldía · Dependencia de gobierno · Congreso · Empresa · Organización civil · Escuela · Vecinos. Agrupa la lista «Quién lo solicita»; se puede corregir después (D217) |
| Quién puede usarlo (programas) | `tipos_organizacion` | Sí | Persona | Sólo programas. Tipos de institución que, además de SEDEMA, pueden elegirlo al iniciar una jornada; vacío = sólo SEDEMA (D193) |

**Uso:** el catálogo de **especies** alimenta el formulario de registro; el de **programas**, el
inicio de la jornada; el de **áreas**, el alta de cuentas; el de **vehículos**, el cierre del reporte; el de **instituciones**, el alta de cuentas; el de **solicitantes**, «Quién lo solicita» de una jornada del programa «Solicitud». Ninguno se elimina si algún árbol
(también eliminado), jornada o cuenta lo usa: se desactiva (D151).

---

## Módulo: Bitácora

No tiene pantalla propia: se escribe sola y se lee en el historial del detalle de cada registro.
Almacén `bitacora`. No se edita desde el sistema.

| Campo | Obligatorio | Origen | Notas |
|---|---|---|---|
| `id` | Sí | Sistema | UUID |
| `fecha` | Sí | Sistema | Momento del movimiento |
| `usuario_id` | Sí | Sesión | Remite a `usuarios.id` |
| `usuario_nombre` | Sí | Sesión | Copia del nombre **a propósito**: si la cuenta se elimina, el historial debe seguir diciendo quién actuó |
| `perfil` | Sí | Sesión | Con qué perfil actuó en ese momento |
| `accion` | Sí | Sistema | `CREADO`, `EDITADO`, `ELIMINADO`, `RESTAURADO`, `SUSTITUIDO`, `RELEVO`, `ACTIVADO`, `DESACTIVADO`, `FOLIO_ASIGNADO` |
| `entidad` | Sí | Sistema | `plantacion`, `usuario`, `catalogo`, `jornada`, `carga` |
| `entidad_id` | Sí | Sistema | A qué registro se refiere |
| `detalle` | No | Sistema | Qué cambió; en una edición, la lista de campos |

---

## Módulo: Jornada (inicio, revisión y cierre del reporte)

La jornada se declara en **Nuevo registro → «Iniciar jornada»** antes del primer árbol (D119);
se revisa en **Jornadas** y sus datos de cierre se capturan en **su ficha → «Generar reporte» → «Datos de cierre»**.
Almacén `jornadas` (sustituye a `cierres` desde el bloque 62). Lo que ya vive en los registros
—especies, conteos, alcaldía— no se pregunta, se calcula (D58).

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| No se muestra | `id` | Sí | Sistema | UUID; los árboles lo llevan en `plantaciones.jornada_id` |
| Nombre de la jornada | `nombre` | Sí | Persona | Nombre de la jornada: el parque, la calle o el sitio. Es el nombre de la tarjeta en Jornadas y el «Jornada:» del reporte |
| Dirección de la jornada | `ubicacion` | No | Persona | «Dirección de la jornada» (D143): dirección, parque o referencia (D120); va al reporte bajo el nombre |
| Programa | `programa_id` | Sí | Persona | Programa de la jornada (D130). Sus árboles lo toman siempre y cambian con él (D151). SEDEMA elige todos; las demás instituciones, los que tienen marcado su tipo en el catálogo (`tipos_organizacion`, D193). Con uno solo posible viene ya elegido. Con varios, sobre la lista van chips: Reforestación Urbana siempre y, después, hasta dos de los que ya usó quien inicia la jornada (D263, D271) |
| «Ubicación de la jornada»: «Detectar ubicación de la jornada» o «Capturar coordenadas a mano» | `lat`, `lng`, `gps_precision_m` | Sí (D260) | Dispositivo | Punto de la jornada: la posición del teléfono al tocar «Detectar ubicación de la jornada» (D122) o las coordenadas escritas en «Capturar coordenadas a mano» cuando no hubo señal (D143). Sin punto la jornada no se registra; sólo las jornadas anteriores a esa regla pueden no tenerlo. `gps_precision_m` sólo existe con GPS. No es el punto de ningún árbol |
| No como campo: nota bajo el botón de ubicación | `punto_origen` | No | Sistema | Cómo se obtuvo el punto de la jornada: `gps` (Detectar ubicación) o `manual` (coordenadas escritas) (D143); nulo sin ubicación |
| Alcaldía y Colonia | `alcaldia_cve`, `alcaldia`, `colonia_cve`, `colonia` | No | Sistema | Derivados del punto detectado con las capas de alcaldías y colonias (D122); van a la franja, a Jornadas y al reporte junto a la ubicación escrita |
| Fecha | `fecha` | Sí | Persona | Día en que empieza la jornada, `AAAA-MM-DD`, no posterior a hoy. Cada árbol lleva su propia fecha de plantación, desde este día (D204) |
| Comentarios | `comentarios` | No | Persona | Se escriben al iniciar; van al reporte como «Comentarios de la jornada» |
| No como campo: «Quién registró» en filtros y tarjeta | `cabo_id` | Sí | Sesión | Titular: quien inició la jornada; no cambia con un relevo |
| Relevo de cabo (ficha de la jornada) | `relevo_id` | No | Persona | Remite a `usuarios.id`: el cabo que registra en lugar del titular tras un relevo de la coordinación (D204); nulo, registra el titular |
| No como campo: la ficha y el reporte dicen el relevo | `relevos` | Sí | Sistema | Lista de los relevos hechos: a qué cabo se pasó, cuándo y quién lo hizo; `[]` sin relevos (D204) |
| Quién lo solicita | `solicitante_id` | No | Persona | Remite a `solicitantes.id`: quién solicita la jornada; no es quien ejecuta ni es una institución con cuentas. Se pide con el programa «Solicitud»; nulo con otro programa o si la instancia no está en el catálogo (D217, D229) |
| Nombre de la instancia | `solicitante_otro` | Sí | Persona | Nombre de la instancia que solicita cuando no está en el catálogo; `''` si no aplica (D229) |
| Descripción de la solicitud | `solicitud_descripcion` | Sí | Persona | De qué se trata la solicitud, en varios renglones; obligatoria con el programa «Solicitud», `''` con otro (D229) |
| No como campo: «Institución» en filtros; el reporte la dice si no es la Secretaría | `organizacion_id` | Sí | Sesión | La institución que ejecuta: la de quien inicia la jornada. No cambia después. En jornadas de otras instituciones el cierre no pide chófer ni vehículo, y el reporte dice «Institución que ejecuta» |
| «Abierta» o «Cerrada» (franja y tarjeta) | `estatus` | Sí | Sistema | `abierta` o `cerrada`; se cierra desde la franja o la revisión, se reabre desde la revisión o con «Registrar árbol» |
| No se muestra: ordena «Jornada 2 de 3» | `fecha_inicio` | Sí | Sistema | Ordena las jornadas del día: «Jornada 2 de 3» |
| «Cerrada a las 15:40» (tarjeta y ficha) | `fecha_cierre` | No | Sistema | Nulo mientras está abierta. Se muestra en Jornadas: «Cerrada a las 15:40» en la ficha (con el día si se cerró otro) y el día en letra en el detalle |
| Encargado | `encargado_id` | No | Sesión o Persona | Remite a `usuarios.id`. Para un cabo es él mismo y en el cierre no se le muestra (D266); quien ve a varias personas lo elige entre los cabos con registros en la jornada (D57) |
| Personal participante | `personal` | No | Persona | Nombres, como se acostumbra escribirlos. Sólo en jornadas de SEDEMA (D192) |
| Personal de apoyo | `apoyo` | No | Persona | Personal de otra institución; varias líneas. Sólo en jornadas de SEDEMA (D192) |
| Observaciones | `observaciones` | No | Persona | Una por renglón |
| Chófer | `chofer` | No | Persona | Sólo en jornadas de SEDEMA |
| No como campo: se ve bajo la lista de vehículos | `vehiculo_modelo` | No | Catálogo | Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174). Sustituye a `vehiculo` (bloque 20) |
| Vehículo | `vehiculo_placa` | No | Catálogo | La placa del vehículo elegido en la lista (D162, D174) |
| No como campo: se ve bajo la lista de vehículos | `vehiculo_tipo` | No | Catálogo | El tipo del vehículo elegido (Estacas, Pipa…), copiado del catálogo (D174) |
| Vehículo | `vehiculo_id` | No | Persona | Remite a `vehiculos.id` del vehículo elegido; nulo sin vehículo (sólo del catálogo, D174). Con él se cuentan los que más usa cada encargado, que se ofrecen a un toque |
| Hora de finalización | `hora` | No | Persona | Hora de finalización, `HH:MM` del selector de hora; el PDF le agrega «h» |
| Árboles que se van a plantar | `arboles_previstos` | Sí | Persona | Árboles que se van a plantar, escrito al iniciar la jornada; Jornadas y el reporte comparan los registrados contra los previstos |
| «Está bien» en un punto con aviso (ficha de la jornada) | `puntos_revisados` | Sí | Persona | Puntos con aviso que alguien marcó «Está bien» en **Jornadas**; lista de `plantaciones.id` (D112) |
| «Sin reporte todavía» o «Reporte:» con su fecha y hora (tarjeta); filtro «Reporte» | `reporte_en` | No | Sistema | Cuándo se generó el reporte de la jornada (D134); nulo si no se ha generado |
| No se muestra | `carga_id` | No | Sistema | Lote de carga masiva que creó la jornada (D196); nulo en las jornadas iniciadas en campo |
| No se muestra | `editado_por_id` | No | Sesión | Quién la cambió por última vez; vacío hasta la primera edición |
| No se muestra | `fecha_ultima_edicion` | No | Sistema | Vacío hasta la primera edición |

---

## Campos que se reutilizan entre módulos

| Campo | Se origina en | Se reutiliza en |
|---|---|---|
| `usuarios.id` | Cuentas | `plantaciones.cabo_id`, `plantaciones.editado_por_id`, `usuarios.coordinadores_ids`, `usuarios.creado_por_id`, `usuarios.editado_por_id`, `creado_por_id` de las seis tablas de catálogo, `catalogos.editado_por_id`, `bitacora.usuario_id`, `jornadas.cabo_id`, `jornadas.encargado_id`, `jornadas.relevo_id`, `jornadas.editado_por_id` |
| `especies.id` (= clave `ESP-0000`) | Catálogo del SIA | `plantaciones.especie_id` |
| `programas.id` | Catálogos | `jornadas.programa_id`, y de ahí `plantaciones.programa_id` (D151) |
| `jornadas.id` | Jornadas | `plantaciones.jornada_id` |
| `areas.id` | Catálogos | `usuarios.area_id` |
| `instituciones.id` | Catálogos | `usuarios.organizacion_id`, `jornadas.organizacion_id` |
| `solicitantes.id` | Catálogos | `jornadas.solicitante_id` |
| `activo` | Cuentas y Catálogos | Mismo significado en los dos: deja de ofrecerse o de poder entrar, sin borrar nada |
| `fecha_ultima_edicion` + `editado_por_id` | Todos | Mismo par en plantaciones, cuentas, catálogos y jornadas |

---

## Lo que todavía no existe

| Campo previsto | Para qué | Cuándo |
|---|---|---|
| Emisión del folio | Tabla de secuencias por celda y año, asignación en transacción con el UUID como clave de idempotencia (R3–R6) | [pendiente] Fase 2, y sólo con la malla UGA corregida y congelada (DECISIONES, pendientes). La estructura ya está en el registro (bloque 23) |
| Bandeja de especies fuera de catálogo | Donde el SIA resuelve cada `PENDIENTE_VALIDACION`: alta o reasignación | [pendiente] Fase 2, con los catálogos |
| Posible duplicado | Aviso al sincronizar cuando otro registro cae a menos de la incertidumbre combinada de ambos puntos (suma de sus `gps_precision_m`, piso 4 m) | [pendiente] Fase 2, en el servidor (D69) |
| Clave de campo del ejemplar | La que el personal usa en los partes a mano (`CIZ_366`) | **Descartado** por Liber (D87): no entra como atributo |
| Colonia del parte | No se pide en el cierre: sale del punto de cada registro, como la alcaldía; un campo libre sería una segunda fuente | Resuelto en el bloque 21 con la capa de colonias |
| Identificador del servidor | Para relacionar el registro del dispositivo con el del servidor | [pendiente] Fase 2 |
| Marca de envío | Saber qué registros ya subieron | [pendiente] Fase 2 |

Ninguno de los tres se guarda todavía: un campo sin uso es una promesa de que el sistema hace algo
que no hace.
