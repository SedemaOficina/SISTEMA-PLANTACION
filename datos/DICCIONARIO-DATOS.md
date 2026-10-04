# Diccionario de datos e inventario de tablas

**Generado de `esquema.json` por `herramientas/generar_diccionario.py`: no se edita a mano.** Versión del esquema: 2026-10-03. Etapa 1 (Fase 1: dispositivo, sin servidor).

Qué guarda el sistema, tabla por tabla: cada campo con su tipo, si admite nulo, de dónde sale, qué valores admite y qué regla lo gobierna; qué se deriva sin verse en pantalla; qué se calcula y no se guarda; qué vive sólo en memoria mientras se captura; cómo se relacionan las tablas; y qué reglas aplican hoy en el dispositivo y cuáles esperan al servidor. `pruebas/auditoria.py` compara este esquema contra lo que el sistema guarda de verdad y contra los dominios del código, y avisa si algo sobra, falta o no está regenerado. `MAPEO-CAMPOS.md` sigue siendo la vista por pantalla (etiqueta ↔ campo, con la explicación larga de cada decisión); este documento es la vista por tabla, pensada para construir la base y la API de la Fase 2 sin volver a leer el código.

## 1. Dónde viven los datos

- **Motor:** IndexedDB del navegador: base `srp_db` en la versión de prueba y `srp_sia` en la real (SRP.CONFIG.DB_NOMBRE, según ES_FICTICIO), versión 8 (SRP.CONFIG.DB_VERSION). Nunca comparten datos.
- **Tablas (almacenes):** `plantaciones`, `usuarios`, `programas`, `areas`, `especies`, `vehiculos`, `instituciones`, `solicitantes`, `bitacora`, `jornadas`.

| Dónde | Qué guarda | En Fase 2 |
|---|---|---|
| localStorage `srp_sesion_usuario_id` | id de la cuenta con sesión abierta; el dispositivo queda fijo a esa cuenta (D06) | Lo sustituye el proveedor de identidad institucional; sólo cambia `autenticar()` en js/sesion.js |
| localStorage `srp_sello_datos` | sello de las cuentas y catálogos de ejemplo cargados en este teléfono (SRP.CONFIG.SELLO_DATOS); si no coincide y no hay nada capturado, se vuelven a cargar; si hay capturas, se conserva todo (D149) | Desaparece con ES_FICTICIO |
| localStorage `srp_contraste` | preferencia del modo sol (contraste alto) de este teléfono (D106) | Se conserva |
| localStorage `srp_secuencias_folio_prueba` | consecutivos del servidor simulado de folios, por celda (D110); por dispositivo | Desaparece: el consecutivo vive en el servidor |
| localStorage `srp_envios_prueba` | estado del envío simulado: ids de registros recibidos con su hora (D111) | Desaparece: lo sustituye la cola de envío real |
| localStorage `srp_sin_senal_prueba` | «Simular sin señal» de las herramientas de prueba (D111) | Desaparece con ES_FICTICIO |
| localStorage `srp_demo_quitados` | marca de que en este teléfono se quitaron los datos de demostración; la caja de demostración lo dice al volver a abrirla | Desaparece con ES_FICTICIO |
| Caché del service worker (sw.js) | copia de la aplicación para abrir sin señal; no guarda datos | Se conserva |
| localStorage `srp_borrador_arbol` | borrador del árbol a medio capturar (punto, especie, comentarios, fecha y fotografía), con la cuenta y la jornada a que pertenece; se borra al guardar o descartar el árbol | Se conserva |

## 2. Cómo leer la columna «Origen»

| Origen | Qué significa |
|---|---|
| Persona | Lo escribe o lo elige quien usa el sistema |
| Catálogo | Se elige de un catálogo administrable; se guarda la clave, no el texto |
| Capa | Se deriva del punto contra las capas del SIA; nadie lo teclea y no se ve como campo editable |
| Sistema | Lo pone el sistema: identificadores, fechas, marcas, cálculos |
| Sesión | Se toma de la cuenta con sesión abierta |
| Servidor | Lo asignará el servidor en Fase 2; en Fase 1 nace nulo |
| SIA | Viene del archivo fuente del SIA (catálogo de especies, capas) |
| Jornada | Se toma de la jornada en que está el árbol y cambia con ella (D119, D151) |
| Dispositivo | Lo toma el teléfono al detectar la ubicación, o se captura a mano |

## 3. Dominios (valores válidos y de dónde salen)

| Dominio | Valores | Fuente |
|---|---|---|
| `estatus_plantacion` | `activo` · `eliminado` · `sustituido` | js/formulario.js registroPrevisto() y guardarSustituto(); js/registros.js eliminar() |
| `motivo_sustitucion` | `VANDALISMO` · `IMPACTO_VEHICULAR` · `ROBO` · `MUERTE` · `OTRO` | js/config.js MOTIVOS_SUSTITUCION (D203) |
| `estatus_jornada` | `abierta` · `cerrada` | js/jornada-activa.js iniciarJornada() y cambiarEstatus() |
| `punto_origen` | `gps` · `mapa` · `manual` · `ajustado` | js/mapa.js ORIGENES |
| `perfil` | `CABO` · `COORDINADOR` · `DIRECTIVO` · `ADMIN` | js/permisos.js SRP.PERFILES (Consulta/VIEWER retirado en D87; DIRECTIVO, de sólo lectura, desde D224) |
| `tipo_catalogo` | `programa` · `area` · `especie` · `vehiculo` · `organizacion` · `solicitante` | js/catalogos.js ETIQUETA. No es un campo de la base: cada catálogo tiene su tabla (SRP.almacen.TABLA_DE_TIPO); en memoria, cada renglón lleva `tipo` para saber de cuál es |
| `tipo_distribucion` | `Nativa` · `Endémica` · `Exótica` · `Exótica-Invasora` | SNIB/CONABIO (EncicloVida); lista en index.html #cat-distribucion |
| `tipo_organizacion` | `Alcaldía` · `Gobierno de la CDMX` · `Empresa privada` · `Organización civil` | Lista fija en index.html #usr-tipo-org y #cat-tipo-org; js/referencias.js TIPOS_INSTITUCION |
| `tipo_solicitante` | `Dependencia de gobierno` · `Alcaldía` · `Congreso` · `Empresa` · `Organización civil` · `Escuela` · `Vecinos` | js/referencias.js TIPOS_SOLICITANTE; la lista de Catálogos › Solicitantes (#cat-tipo-sol) se llena de ahí |
| `accion_bitacora` | `CREADO` · `EDITADO` · `ELIMINADO` · `RESTAURADO` · `SUSTITUIDO` · `RELEVO` · `ACTIVADO` · `DESACTIVADO` · `FOLIO_ASIGNADO` | llamadas a SRP.bitacora.entrada() en formulario, registros, jornadas, catalogos, usuarios, reportes y folio (servidor simulado, D110) |
| `entidad_bitacora` | `plantacion` · `usuario` · `catalogo` · `jornada` · `carga` | ídem |
| `alcaldia_cve` | 16 claves `cvegeo` INEGI (09002…09017) | assets/capas/capa-alcaldias.js (SIA con base en INEGI, versión sia-2026-01-01; DEFINITIVA) |
| `uga` | 1,624 claves `AAA-000` de la malla hexagonal | assets/capas/capa-uga.js (SIA, versión sia-2026-09-22; definitiva, con 8 celdas de prefijo distinto a su alcaldía) |
| `colonia_cve` | Claves `CVEUT` del IECM 2022 (p. ej. `15-040`) | assets/capas/capa-colonias.js (IECM 2022, versión iecm-2022; definitiva) |
| `id_especie` | `ESP-0000`, consecutivo del SIA; hoy ESP-0001…ESP-0076 y las altas continúan en ESP-0077 | assets/catalogos/catalogo-especies.js (CGO_ESPECIES_REFORESTACION_URBANA, 22-09-2026) |
| `origen_jornada` | `PROGRAMADA` · `PEDIDO` | js/pedido.js ORIGENES |

## 4. Tablas

### 4.1 `plantaciones`

Un renglón por ejemplar plantado. Es el registro individual de campo; todo lo demás (partes, tableros, cifra pública) se construye encima (D38).

- **Llave:** `id`. **Índices:** `estatus`, `jornada_id`. **Pantalla:** Nuevo registro (alta y edición), Registros (lista, detalle), reporte de la jornada.
- **Campos:** 30.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID v4 | Ficha de revisión y aviso de guardado («Identificador») | Se fija al abrir la ficha de revisión y es el que se guarda (idPrevisto); no cambia al editar. En Fase 2 es la clave de idempotencia del envío (R4) |
| `estatus` | text | No | Sistema | dominio `estatus_plantacion` | No (los eliminados y sustituidos no se listan) | Nace `activo`; «Eliminar» lo marca `eliminado`, nunca borra (D11, Norma 7.4). Un registro eliminado sigue contando en el uso de catálogos y cuentas. «Sustituir» lo marca `sustituido` al guardar su sustituto (D203): deja de contar como plantado y conserva su historial |
| `cabo_id` | uuid | No | Sesión | → usuarios.id | No como campo; el encabezado dice quién tiene la sesión y la ficha lo repite («Cabo») | Quien captura. Al editar se conserva: el autor no cambia de manos aunque corrija un coordinador o la administración |
| `lat` | numeric(9,6) | No | Persona | Grados decimales WGS84, 6 decimales, dentro de CONFIG.MAPA.LIMITES | Coordenadas (sólo lectura) | Del botón de ubicación, de tocar el mapa o de la captura a mano; se cambia moviendo el punto, no tecleando. Fuera del ámbito de la CDMX el punto se rechaza |
| `lng` | numeric(9,6) | No | Persona | Ídem | Coordenadas (sólo lectura) | Ídem. Al guardar en GeoJSON el orden es [lng, lat] |
| `punto_origen` | text | No | Sistema | dominio `punto_origen` | «Cómo se obtuvo» (sólo lectura) | Lo determina la acción con la que se colocó el punto, no una elección. Es la prueba de cómo se obtuvo la coordenada cuando no hay fotografía |
| `gps_precision_m` | integer | Sí | Sistema | Metros, entero; null salvo con GPS | «Cómo se obtuvo» (±N m) | Existe si y sólo si punto_origen = gps: al mover el punto a mano se borra. La auditoría lo comprueba. En Fase 2 alimenta la regla de duplicados (D69) |
| `folio` | char(13) | Sí | Servidor | `AAA-000-00000` (SRP.folio.PATRON): clave de la celda UGA y consecutivo de la celda; UNIQUE. AAA es el prefijo de la celda, no la alcaldía del árbol (difieren en el 4.3 % del territorio, D152) | «Folio»: PROVISIONAL mientras sea nulo (R1) | Con datos reales, nulo en toda la Fase 1: lo asigna el servidor una sola vez al sincronizar (R3), es inmutable (R7) y no lleva la especie ni el año (D67). El consecutivo sale de una secuencia perpetua por celda, nunca de MAX+1 (R5–R6). Con datos de prueba lo llena el servidor simulado (D110), marcado «(simulado)» en pantalla y en cada renglón del PDF; su secuencia vive en cada teléfono y dos teléfonos pueden repetir números. Sin alcaldía o con capas incompletas no se emite (D152) |
| `especie_id` | char(8) | Sí | Catálogo | → especies.id (id_especie ESP-0000) | Especie (autocompletado por nombre común, científico y otros nombres) | Obligatoria salvo con «Otra especie», donde queda nula. El registro guarda sólo la clave; género, epíteto, distribución, forma de crecimiento, id_snib e id_enciclovida se obtienen del catálogo (D84) |
| `especie_otra` | text | No | Persona | Texto libre; '' salvo con «Otra especie» | Especifique la especie (aparece sólo al elegir «Otra especie») | Obligatoria cuando especie_id es nula. Se vacía al elegir una especie del catálogo |
| `alcaldia_cve` | char(5) | Sí | Capa | dominio `alcaldia_cve` | No | Derivada del punto contra la capa de alcaldías. Llave para unir con el esquema territorio del SIA. Nula si el punto cae en un hueco de la capa (se avisa, no se impide guardar) |
| `alcaldia` | text | Sí | Capa | Nombre de la alcaldía según la capa | Alcaldía (sólo lectura); «Sin alcaldía (territorio pendiente)» si es nula | Copia del nombre para leerse sin cargar la capa. Se rederiva cada vez que el punto se mueve; se puede rederivar en lote si la capa cambia (capa_version). Un punto dentro del margen del límite toma la alcaldía más cercana (D152) |
| `colonia_cve` | text | Sí | Capa | dominio `colonia_cve` | No | Nula fuera de la zona urbana (suelo de conservación): no es defecto (D62). En solape gana la colonia más pequeña |
| `colonia` | text | Sí | Capa | Nombre como viene en la capa, mayúsculas y tipo entre paréntesis | Colonia (sólo lectura): «Sin colonia en la capa» si es nula (D152) | Capa definitiva (IECM 2022): las colonias del IECM son la unidad oficial de reporte |
| `uga` | char(7) | Sí | Capa | dominio `uga` | No | Celda vigente del punto. Su prefijo es el de la celda y NO la alcaldía del punto (difieren en el 4.3 % del territorio); la alcaldía sale de su propia capa. Cambia si el punto se corrige; la celda con que se asignó el folio la congela el servidor (S-02) |
| `uga_borde_m` | integer | Sí | Capa | Metros enteros ≥ 0; nulo sin celda | Detalle › Datos del sistema («A N m del borde de la celda»); «Celda incierta» junto al folio si es menor que la precisión del GPS | Distancia del punto al borde de su celda UGA, al derivar (D152). Si es menor que gps_precision_m, la celda del folio podría ser la vecina: la pantalla lo dice y el servidor la confirma en la Fase 2 |
| `capa_version` | text | Sí | Capa | `alcaldias=v;uga=v;colonias=v` | Detalle › Datos del sistema («Capas») y pie del PDF (D152) | Con qué versión de cada capa se derivó; permite rehacer alcaldia/colonia/uga cuando el SIA entregue las capas definitivas |
| `programa_id` | text | No | Jornada | → programas.id | Ficha de revisión y detalle («Programa», el de la jornada); no se edita por árbol | Es el de su jornada (D151): se toma al registrar, cambia cuando cambia el de la jornada —también en los eliminados, en la misma transacción— y al mover el árbol toma el de su jornada nueva |
| `fecha_plantacion` | date | No | Persona | AAAA-MM-DD, ≤ hoy | Fecha de plantación (se muestra 21-SEP-2026). En el formulario se pide sólo si la jornada empezó antes de hoy; en «Sustituir», como fecha de la sustitución | El día en que se plantó el árbol, entre la fecha de su jornada y hoy. Arranca con la fecha de la jornada el día en que la jornada se inicia y con la de hoy los días siguientes; lo elegido se conserva para el árbol siguiente de la misma jornada. Un sustituto lleva la fecha de la sustitución, no anterior a la plantación del árbol perdido. Si cambia la fecha de la jornada, la toman los árboles del día de inicio (también los eliminados, en la misma transacción); al mover el árbol a otra jornada, la de la jornada nueva si era del día de inicio, y si no conserva la suya (nunca antes del inicio de la jornada nueva); al restaurarlo, la suya, salvo que la jornada empiece después |
| `jornada_id` | uuid | No | Sistema | → jornadas.id | Jornada (ficha de revisión y detalle) | La jornada activa al registrar (D119). Cambia sólo con «Mover a otra jornada» en Jornadas, que también ajusta fecha_plantacion y programa_id (D151) |
| `sustituye_id` | uuid | Sí | Sistema | → plantaciones.id | Detalle («Sustituye a») y marca «Sustituto» en tarjeta, ficha y mapa (punto morado) | Sólo en el árbol que reemplaza a uno perdido (D203); nulo en los demás. Se registra en la jornada del árbol perdido |
| `motivo_sustitucion` | text | Sí | Persona | dominio `motivo_sustitucion` | Ventana «Sustituir árbol» (obligatorio); detalle («Motivo de la sustitución») | Obligatorio en un sustituto; nulo en los demás (D203) |
| `motivo_sustitucion_otro` | varchar(120) | No | Persona | Texto libre ≤ 120; '' salvo con motivo OTRO | «Escriba el motivo», sólo con «Otro» | Obligatorio cuando motivo_sustitucion es OTRO (D203) |
| `sustituido_por_id` | uuid | Sí | Sistema | → plantaciones.id | Detalle («Sustituido por») | Sólo en el árbol perdido, junto con estatus `sustituido` (D203). Si se elimina el sustituto, vuelve a nulo y el árbol a `activo` |
| `comentarios` | varchar(500) | No | Persona | Texto libre ≤ 500; '' si no se escribe | Comentarios (opcional) | Reincorporado en D50. Entra al reporte PDF en «Comentarios por ejemplar», al final, sólo los árboles que lo tienen (D164). Registros anteriores a D50 no traen la llave y se leen como «Sin comentarios» |
| `foto_base64` | text | Sí | Persona | data:image/jpeg;base64,… ya comprimida (≤ 800×600, calidad 0.7) | Fotografía (opcional) | Incrustada en el registro en Fase 1. En Fase 2 sale a archivo, como en los otros módulos del SIA (pendiente «Dónde viven las fotografías») |
| `foto_id` | uuid | Sí | Sistema | UUID v4; null sin foto | No | Identificador de la imagen, para cuando viva como archivo |
| `fecha_registro` | timestamptz | No | Sistema | ISO 8601 con zona (-06:00) | Detalle | Cuándo se guardó por primera vez. Distinta de fecha_plantacion |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | Detalle e historial | Nula hasta la primera edición; también se pone al eliminar |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | Historial | Quién hizo la última edición (o la eliminación) |

### 4.2 `usuarios`

Cuentas del sistema. Una por persona; el perfil decide qué puede hacer (js/permisos.js, fuente única).

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Usuarios (sólo Administración global); Acceso.
- **Campos:** 13.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID v4 (las de arranque: u-admin-1, u-coord-1, u-cabo-1) | No | — |
| `correo` | text | No | Persona | Correo válido, en minúsculas, único | Correo | Identifica la cuenta y sirve para entrar; no se puede cambiar después. No tiene que ser institucional |
| `nombre_completo` | text | No | Persona | Texto, hasta 160: nombre y al menos un apellido | Nombre completo | Un solo campo. Sustituye a nombre, apellido_paterno y apellido_materno: al abrir, las cuentas que los tenían se unen aquí (js/almacen.js normalizar) |
| `organizacion_id` | text | No | Catálogo | → instituciones.id | Tipo de institución e Institución | La institución de la cuenta. En el alta se elige primero el tipo (Alcaldía, Gobierno de la CDMX, Empresa privada, Organización civil) y luego la institución de la lista; las que falten las agrega la Administración en Catálogos › Instituciones, a solicitud. Sólo SEDEMA (o-sedema) tiene área y ADMIN; las cuentas de fuera son CABO o COORDINADOR, y el cabo depende de un coordinador de su misma institución (D192). Al abrir, las cuentas sin institución quedan en SEDEMA |
| `area_id` | text | Sí | Catálogo | → areas.id (DGSANPAVA, Oficina de la Secretaría, Sistema de Información Ambiental, DGEIRA) | Área (sólo cuentas de la Secretaría) | Obligatoria en cuentas de SEDEMA; nula en las de otras organizaciones |
| `cargo_rol` | text | No | Persona | Texto libre | Cargo | Descriptivo; no gobierna permisos |
| `perfil` | text | No | Persona | dominio `perfil` | Perfil de captura | Decide alcance y acciones. Una cuenta de administración no puede quitarse a sí misma el perfil ADMIN. Un perfil desconocido queda sin permisos y se avisa (D87). ADMIN sólo en SEDEMA; fuera, CABO, COORDINADOR o DIRECTIVO (D192, D224) |
| `coordinadores_ids` | uuid[] | No | Persona | → usuarios.id con perfil COORDINADOR; [] si no tiene | Coordinadores (sólo cabos) | Sólo en cabos; puede tener más de uno, todos de su misma institución; [] en los demás perfiles. Es lo que define la cuadrilla: cada coordinador ve y edita los registros de los cabos que lo tienen asignado, nunca los de otra institución |
| `activo` | boolean | No | Persona | true/false | Estado | Inactiva no puede entrar; sus registros se conservan a su nombre. Con registros a su nombre no se elimina, se desactiva |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | Cuándo se dio de alta la cuenta; mismo nombre que en catálogos |
| `creado_por_id` | uuid | No | Sesión | → usuarios.id | No | Quién dio de alta la cuenta; mismo nombre que en catálogos |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |

### 4.3 `programas`

Los programas de plantación. La jornada elige uno y sus árboles lo toman (D151). Cada programa dice qué tipos de institución, además de la Secretaría, pueden usarlo (D193).

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Catálogos › Programas (sólo Administración global); se elige en Iniciar jornada.
- **Campos:** 9.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | UUID v4; los de arranque: p-refor, p-centro, p-palmeras, p-compensaciones | No | Es lo que guardan plantaciones.programa_id y jornadas.programa_id |
| `clave` | text | No | Persona | `[A-Z0-9_]{2,30}`, única | Clave | Se sugiere del nombre, editable antes de guardar, fija después |
| `nombre` | text | No | Persona | Texto, único | Nombre | — |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `tipos_organizacion` | varchar(30)[] | No | Persona | Lista de tipo_organizacion; [] = sólo SEDEMA | Quién puede usarlo (Catálogos › Programas) | Los tipos de institución que, además de SEDEMA, pueden elegir el programa al iniciar o editar una jornada; SEDEMA puede usar todos. Lo marca la Administración (D193). Un programa nuevo empieza vacío. De arranque: Reforestación Urbana, Alcaldía, Gobierno de la CDMX y Organización civil; Palmeras, Empresa privada; Centro Histórico y Compensaciones, vacío. Al abrir, un programa sin el dato recibe el de arranque o, si lo agregó la Administración, vacío |

### 4.4 `areas`

Las áreas de la Secretaría a las que pertenece una cuenta. Las cuentas de otras instituciones no llevan área.

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Catálogos › Áreas (sólo Administración global); se elige en Usuarios.
- **Campos:** 8.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | UUID v4; las de arranque: a-dgsanpava, a-oficina, a-sia, a-dgeira | No | Es lo que guarda usuarios.area_id |
| `clave` | text | No | Persona | `[A-Z0-9_]{2,30}`, única | Clave | Se sugiere del nombre, editable antes de guardar, fija después |
| `nombre` | text | No | Persona | Texto, único | Nombre | — |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |

### 4.5 `especies`

El catálogo de especies: el real del SIA (D84), 76 de arranque, más las que agregue la Administración. Lleva los datos taxonómicos y las llaves externas al SNIB y a EncicloVida.

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Catálogos › Especies (sólo Administración global); se elige en Nuevo registro.
- **Campos:** 14.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | dominio `id_especie` | No | Es la propia clave ESP-0000. Es lo que guarda plantaciones.especie_id |
| `clave` | text | No | Sistema | dominio `id_especie` | Clave | Consecutivo ESP-0000 que asigna el sistema; nunca se escribe ni se reutiliza |
| `nombre` | text | No | Persona | Texto, único | Nombre común | Es el nombre_comun del catálogo del SIA: la etiqueta de campo |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id; null en las especies del SIA | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601; en las especies del SIA, la fecha de corte | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `nombre_cientifico` | varchar(140) | No | Persona | Género + epíteto, sin autoría ni subgénero; único | Nombre científico (y entre paréntesis en Nuevo registro) | Validado: inicial mayúscula y al menos dos palabras |
| `otros_nombres_comunes` | varchar(400) | No | Persona | Nombres separados por coma y espacio; '' si no hay | Otros nombres comunes; en Nuevo registro sólo como criterio de búsqueda («también: Fresno») | Un mismo nombre puede señalar a varias especies: la búsqueda las ofrece todas, nunca resuelve sola |
| `tipo_distribucion` | text | No | Persona | dominio `tipo_distribucion` | Tipo de distribución (Catálogos) | Campo del SNIB; sustituye a Nativa/Introducida |
| `formadecrecimiento` | varchar(100) | No | Persona | Árbol · Arbusto · Palma · Liana · Hierba · Sufrútice, varios separados por coma y espacio; '' si no hay | Forma de crecimiento (Catálogos) | Literal de la ficha técnica |
| `id_snib` | varchar(16) | Sí | Persona | Número + ANGIO o GIMNO (IdCAT) | Id SNIB (Catálogos) | Llave externa al Catálogo Taxonómico de la Biota; puede venir vacía (Quercus rubra) |
| `id_enciclovida` | integer | Sí | Persona | Entero | Id EncicloVida (Catálogos) | Llave para reconsultar la ficha (enciclovida.mx/especies/{id}.json); más completa que el IdCAT |

### 4.6 `vehiculos`

Los vehículos de las cuadrillas (D162). Se eligen en el cierre de la jornada, que copia placa, modelo y tipo. En la versión de prueba llevan placas ficticias; los reales se cargan en el servidor.

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Catálogos › Vehículos (sólo Administración global); se elige en el cierre de la jornada.
- **Campos:** 10.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | «v-» más la placa sin espacios en los de arranque; UUID v4 en los que se agreguen | No | Es lo que guarda jornadas.vehiculo_id |
| `clave` | text | No | Sistema | La placa sin espacios ni guiones; única | No | Sale de la placa al darlo de alta y no se muestra; dos placas que sólo difieren en espacios son la misma (D162) |
| `nombre` | text | No | Persona | Texto, único | Placa | Es la placa, en mayúsculas: «PRU 005» (D162). Se copia a jornadas.vehiculo_placa |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id; null en los vehículos de arranque | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `modelo` | varchar(40) | No | Persona | Texto, inicial mayúscula: «Dodge», «Internacional» | Modelo | Obligatorio. Se copia a jornadas.vehiculo_modelo al elegir la placa en el cierre (D162) |
| `tipo_vehiculo` | varchar(30) | No | Persona | Texto, inicial mayúscula: Pipa · Pick up · Doble cabina · Estacas · Redilas · Grúa; se proponen los que ya hay | Tipo | Obligatorio. Agrupa la lista de placas del cierre y se copia a jornadas.vehiculo_tipo (D162) |

### 4.7 `instituciones`

Las instituciones que ejecutan plantaciones y tienen cuentas: la Secretaría, las 16 alcaldías, otras dependencias, empresas y organizaciones civiles (D186). De ellas depende el alcance de un directivo de fuera de la Secretaría (D224).

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Catálogos › Instituciones (sólo Administración global); se elige en Usuarios.
- **Campos:** 9.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | UUID v4; las de arranque: o-sedema, o-paot, o-sobse, o-green-cover, o-reforestamos, o-alc-09002…o-alc-09017 | No | Es lo que guardan usuarios.organizacion_id y jornadas.organizacion_id |
| `clave` | text | No | Sistema | `[A-Z0-9_]{2,30}`, única | No | La pone el sistema a partir del nombre y no se muestra |
| `nombre` | text | No | Persona | Texto, único | Nombre | Único entre todas; las alcaldías sin la palabra «Alcaldía» (la pone la pantalla) |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `tipo_organizacion` | varchar(30) | No | Persona | dominio `tipo_organizacion` | Tipo de institución (Usuarios, al dar de alta; Catálogos › Instituciones, al agregarla) | Obligatorio: se elige al agregarla en Catálogos (nunca Alcaldía: las 16 son fijas) y no cambia. Las alcaldías se guardan sin la palabra «Alcaldía» en el nombre |

### 4.8 `solicitantes`

Quién pide un pedido especial (D217). No son quienes plantan ni tienen cuentas: por eso van aparte de las instituciones.

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Catálogos › Solicitantes (sólo Administración global); se elige en Iniciar jornada › Quién lo solicita.
- **Campos:** 9.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | UUID v4; los de arranque: s-alc-09002…s-alc-09017, s-oficina-secretaria, s-sobse, s-segiagua, s-jefatura, s-diputados | No | Es lo que guarda jornadas.solicitante_id |
| `clave` | text | No | Sistema | `[A-Z0-9_]{2,30}`, única | No | La pone el sistema a partir del nombre y no se muestra |
| `nombre` | text | No | Persona | Texto, único | Nombre | Único entre todos; las alcaldías sin la palabra «Alcaldía»: su tipo las agrupa en la lista |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `tipo_solicitante` | varchar(30) | No | Persona | dominio `tipo_solicitante` | Tipo de solicitante (Catálogos › Solicitantes) | Obligatorio. Agrupa la lista «Quién lo solicita» y la tabla del catálogo. Se elige al agregarlo y se puede corregir después |

### 4.9 `bitacora`

Quién, cuándo y qué, en cada alta, edición, eliminación, activación y desactivación (Norma 7.7, D10). Sólo se escribe; se lee en el historial del detalle de cada registro.

- **Llave:** `id`. **Índices:** `entidad_id`. **Pantalla:** Historial del detalle de un registro.
- **Campos:** 9.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID v4 | No | — |
| `fecha` | timestamptz | No | Sistema | ISO 8601 | Historial | — |
| `usuario_id` | uuid | No | Sesión | → usuarios.id | No | — |
| `usuario_nombre` | text | No | Sesión | Nombre completo | Historial | Copia a propósito: si la cuenta se elimina, el historial sigue diciendo quién actuó |
| `perfil` | text | No | Sesión | dominio `perfil` | Historial | Con qué perfil actuó en ese momento |
| `accion` | text | No | Sistema | dominio `accion_bitacora` | Historial | — |
| `entidad` | text | No | Sistema | dominio `entidad_bitacora` | No | — |
| `entidad_id` | text | No | Sistema | id de la tabla correspondiente | No | Se escribe en la misma transacción que el dato (guardarConBitacora) |
| `detalle` | text | No | Sistema | Texto; '' si no aplica | Historial | En una edición, la lista de campos que cambiaron |

### 4.10 `jornadas`

Una jornada de plantación: se declara antes de registrar el primer árbol (D119). Agrupa los registros, lleva la conciliación y la revisión, y guarda los datos de cierre del reporte (antes en la tabla cierres, retirada en el bloque 62).

- **Llave:** `id`. **Índices:** `cabo_id`. **Pantalla:** Nuevo registro → «Iniciar jornada»; Jornadas; ficha de la jornada → «Generar reporte» → «Datos de cierre».
- **Campos:** 41.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID | No | Se fija al iniciar la jornada |
| `nombre` | text | No | Persona | Texto libre, hasta 120 | Nombre de la jornada | Obligatorio al iniciar: el parque, la calle o el sitio. Es el nombre de la tarjeta en Jornadas y el «Jornada:» del reporte (D119) |
| `ubicacion` | text | No | Persona | Texto libre, hasta 200; '' si no se escribe | Dirección de la jornada | Calle y número, entre calles o tramo (D165; antes dirección, parque o referencia, D120); la etiqueta pasó a «Dirección de la jornada» (D143). Va al reporte bajo el nombre de la jornada |
| `programa_id` | text | No | Persona | → programas.id | Programa (Iniciar jornada) | Obligatorio al iniciar (D130). Sus árboles lo toman siempre (D151): al registrar, al cambiarlo aquí y al moverlos a esta jornada. SEDEMA elige todos; las demás instituciones, los que tienen marcado su tipo en programas.tipos_organizacion (D193). Con un solo programa posible viene ya elegido |
| `lat` | numeric(9,6) | Sí | Dispositivo | Grados decimales WGS84, 6 decimales; nulo sin ubicación | Detectar ubicación de la jornada, o «Capturar coordenadas a mano» | Latitud del punto de la jornada: detectado con el GPS al iniciar (D122) o escrito a mano cuando no hubo señal (D143). No es la de ningún árbol |
| `lng` | numeric(9,6) | Sí | Dispositivo | Grados decimales WGS84, 6 decimales; nulo sin ubicación; siempre negativa | Detectar ubicación de la jornada, o «Capturar coordenadas a mano» | Longitud del punto de la jornada (D122, D143) |
| `punto_origen` | text | Sí | Sistema | 'gps' o 'manual'; nulo sin ubicación | (nota bajo el botón) | Cómo se obtuvo el punto de la jornada: con «Detectar ubicación» (gps) o escribiendo las coordenadas cuando no hubo señal en el sitio (manual) (D143). Lo determina la acción, no una elección |
| `gps_precision_m` | integer | Sí | Dispositivo | Metros enteros; nulo sin detección o con el punto escrito a mano | (nota bajo el botón) | Margen del GPS al detectar (D122). Existe sólo si punto_origen es gps |
| `alcaldia_cve` | text | Sí | Sistema | cvegeo INEGI (09012); nulo sin detección o en hueco | — | Derivada de la capa de alcaldías con el punto detectado (D122) |
| `alcaldia` | text | Sí | Sistema | Nombre de la alcaldía; nulo sin detección | Alcaldía | Va a la franja de la jornada, a Jornadas y al reporte (D122). No sustituye a la alcaldía de cada árbol |
| `colonia_cve` | text | Sí | Sistema | CVEUT IECM; nulo sin detección o donde la capa no tiene colonia | — | Derivada de la capa de colonias con el punto detectado (D122) |
| `colonia` | text | Sí | Sistema | Nombre de la colonia; nulo sin detección | Colonia | Va a la franja, a Jornadas y al reporte (D122) |
| `fecha` | date | No | Persona | AAAA-MM-DD, no posterior a hoy | Fecha de la jornada de plantación (el día en que empieza) | Día en que empieza la jornada. Sus árboles llevan cada uno su fecha de plantación, desde este día: una jornada puede durar varios días. Al cambiarla, la toman los árboles plantados el día de inicio; no puede quedar después de un árbol plantado otro día |
| `comentarios` | text | No | Persona | Texto libre, hasta 500; '' si no se escribe | Comentarios | Van al reporte como «Comentarios de la jornada» (D119) |
| `cabo_id` | uuid | No | Sesión | → usuarios.id | No | Titular: quien inició la jornada. No cambia con un relevo; cada árbol queda a nombre de quien lo capturó |
| `organizacion_id` | text | No | Sesión | → instituciones.id | No (el reporte la dice si no es SEDEMA) | La institución que ejecuta la jornada: la de quien la inicia. Se fija al iniciar y no cambia aunque la cuenta cambie de organización. Al abrir, las jornadas sin organización quedan en SEDEMA (asignarOrganizacion). Las de otras instituciones no llevan chófer ni vehículo |
| `estatus` | text | No | Sistema | dominio `estatus_jornada` | Franja de la jornada; Jornadas | Se cierra desde la franja o la revisión; se reabre desde la revisión o con «Registrar árbol» (D119, D153) |
| `fecha_inicio` | timestamptz | No | Sistema | ISO 8601 | No | Ordena las jornadas del día: «Jornada 2 de 3» |
| `fecha_cierre` | timestamptz | Sí | Sistema | ISO 8601 | Jornadas: «Cerrada a las 15:40» en la ficha y «cerrada el lunes 22 de septiembre a las 15:40» en el detalle | Nulo mientras está abierta |
| `encargado_id` | uuid | Sí | Sesión | → usuarios.id | Encargado | Para un cabo es él mismo (no se pregunta); quien ve a varias personas lo elige sólo entre los cabos con registros ese día (D57) |
| `relevo_id` | uuid | Sí | Persona | → usuarios.id | Jornadas › Relevo de cabo | El cabo que registra en lugar del titular: lo elige la coordinación entre los cabos activos de su cuadrilla y de la institución de la jornada, con la jornada abierta. Nulo: registra el titular. Sólo quien registra en la jornada (este cabo o, sin relevo, el titular) agrega árboles en ella |
| `relevos` | objeto[] | No | Sistema | [{ cabo_id → usuarios.id, fecha ISO 8601, por_id → usuarios.id }]; [] sin relevos | No como campo; la ficha y el reporte dicen el relevo | Cada relevo hecho, también el que devuelve la jornada al titular: a quién se pasó, cuándo y quién lo hizo. Quien estuvo en un relevo sigue viendo la jornada y todos sus árboles, aunque sólo edita los suyos |
| `origen` | text | No | Persona | dominio `origen_jornada` | Iniciar jornada › Origen de la jornada; Editar jornada | De dónde viene la jornada: PROGRAMADA (del programa de trabajo) o PEDIDO (pedido especial de otra instancia). Es obligatorio y no trae valor por omisión: quien inicia la jornada lo elige, y se corrige en «Editar jornada». Es de la jornada, no del árbol: los árboles lo toman de ella al leerse. Una jornada sin el dato se lee como PROGRAMADA. Las de carga masiva nacen PROGRAMADA |
| `solicitante_id` | text | Sí | Persona | → solicitantes.id | Iniciar jornada › Quién lo solicita; Editar jornada | Quién solicita el pedido especial, del catálogo de solicitantes (Catálogos › Solicitantes), que es aparte del de instituciones. No es quien ejecuta (organizacion_id): quien pide no es quien planta. Nulo si la jornada es programada o si la instancia no está en el catálogo. Obligatorio, este o solicitante_otro, cuando origen = PEDIDO |
| `solicitante_otro` | text | No | Persona | Texto ≤ 120; '' si no aplica | Iniciar jornada › Nombre de la instancia; Editar jornada | El nombre de la instancia que solicita cuando no está en el catálogo («Otra instancia»). Vacío con solicitante_id o en una jornada programada |
| `pedido_descripcion` | text | No | Persona | Texto ≤ 200; '' si no aplica | Iniciar jornada › Descripción del pedido; Editar jornada | De qué se trata el pedido especial; obligatoria con origen «Pedido especial». Vacío en una jornada programada. No se pide oficio ni folio de la solicitud |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id; nulo sin ediciones | No | Nulo hasta la primera edición, como en las demás tablas |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601; nulo sin ediciones | No | Nulo hasta la primera edición, como en las demás tablas |
| `arboles_previstos` | integer | No | Persona | Entero 1–9999 | Árboles que se van a plantar (Iniciar jornada) | Obligatorio al iniciar: cuántos árboles se van a plantar. Jornadas compara los registrados contra los previstos (faltan o sobran) y el reporte los imprime |
| `puntos_revisados` | uuid[] | No | Persona | → plantaciones.id; [] si nadie ha revisado | Jornadas → «Está bien» en un punto con aviso | Puntos con aviso (duplicado, lejos, precisión) que alguien confirmó como correctos (D112); el aviso deja de contarse, no se borra. Al mover un árbol a otra jornada su marca sale de ésta (D151) |
| `reporte_en` | timestamptz | Sí | Sistema | ISO 8601; nulo si no se ha generado o si dejó de estar vigente | Jornadas: tarjeta «Reporte: fecha y hora» o «Sin reporte todavía», y filtro «Reporte» | Se fija cuando el PDF se entrega (se descarga o se comparte), no al abrir la vista previa. Vuelve a nulo, con constancia en la bitácora, si la jornada se reabre o si uno de sus árboles se elimina, restaura, edita, mueve o sustituye: el reporte se genera de nuevo |
| `carga_id` | uuid | Sí | Sistema | UUID v4 del lote de carga masiva; nulo en las jornadas iniciadas en campo | No se muestra; el nombre de la jornada dice «Carga histórica» | Lo pone la carga masiva de Configuración (D196): todas las jornadas de un mismo archivo llevan la misma clave, que también es el entidad_id del renglón «carga» de la bitácora. Una jornada con carga_id no se cuenta como «sin reporte» en Supervisión |
| `personal` | text | No | Persona | Texto libre | Personal participante | Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío (D192) |
| `apoyo` | text | No | Persona | Texto libre, varias líneas | Personal de apoyo | Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío (D192) |
| `observaciones` | text | No | Persona | Texto libre | Observaciones | Aquí se explica a mano una diferencia contra los árboles previstos |
| `chofer` | text | No | Persona | Texto libre | Chófer | Sólo en jornadas de SEDEMA; en las de otras instituciones no se pide y queda vacío |
| `vehiculo_modelo` | text | No | Catálogo | Copia de vehiculos.modelo del vehículo elegido; '' sin vehículo | (se ve en la ficha bajo la lista de vehículos) | Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174). La migración 4 quitó lo escrito a mano y el `vehiculo` de antes del bloque 20 |
| `vehiculo_placa` | text | No | Catálogo | Copia de vehiculos.nombre (la placa) del vehículo elegido; '' sin vehículo | Vehículo (lista de placas) | Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174) |
| `vehiculo_tipo` | text | No | Catálogo | Copia de vehiculos.tipo_vehiculo del vehículo elegido; '' sin vehículo | (se ve en la ficha bajo la lista de vehículos) | Se copia del catálogo al guardar el cierre (D162); ya no se escribe a mano (D174) |
| `vehiculo_id` | text | Sí | Persona | → vehiculos.id | Vehículo (lista de placas o botones de los más usados) | El vehículo del catálogo; nulo sin vehículo. Con él se cuentan los que más usa cada encargado (D162). Sólo del catálogo: sin «Otro vehículo» (D174) |
| `hora` | time | No | Persona | HH:MM; '' si no se elige | Hora de finalización (selector) | — |

## 5. Relaciones entre tablas

| De | A | Cardinalidad | Regla |
|---|---|---|---|
| plantaciones.cabo_id | usuarios.id | N:1 | Obligatoria. Define el alcance: un cabo ve los suyos; un coordinador, los de los cabos que lo tienen en coordinadores_ids |
| plantaciones.editado_por_id | usuarios.id | N:1 | Opcional |
| plantaciones.especie_id | especies.id | N:1 | Nula sólo con «Otra especie» (entonces especie_otra obligatoria; es lo que la bandeja de especies de la Fase 2 resuelve) |
| plantaciones.programa_id | programas.id | N:1 | Obligatoria; siempre la de su jornada (D151) |
| plantaciones.alcaldia_cve / colonia_cve / uga | capas del SIA (alcaldías, colonias, UGA) | N:1 | No son llaves foráneas en la base del dispositivo: son derivaciones del punto, con capa_version para rehacerlas |
| usuarios.coordinadores_ids | usuarios.id | N:M | Sólo con perfil CABO; cada elemento apunta a una cuenta COORDINADOR de su institución |
| usuarios.area_id | areas.id | N:1 | Obligatoria |
| usuarios.creado_por_id / editado_por_id | usuarios.id | N:1 | — |
| programas, areas, especies, vehiculos, instituciones y solicitantes: creado_por_id / editado_por_id | usuarios.id | N:1 | Nulo en las especies que vienen del SIA |
| jornadas.cabo_id / encargado_id / relevo_id / editado_por_id | usuarios.id | N:1 | cabo_id es el titular, quien inició la jornada (D119); relevo_id, el cabo que registra en su lugar tras un relevo |
| plantaciones.jornada_id | jornadas.id | N:1 | Cada árbol nace en la jornada activa y toma su fecha y su programa (D119, D151); «Mover a otra jornada» la cambia. Una jornada que tiene árboles, aun eliminados, no se borra |
| jornadas.programa_id | programas.id | N:1 | Obligatoria; sus árboles la toman (D151) |
| jornadas.puntos_revisados | plantaciones.id | N:M | Lista de ids; sólo árboles de la misma jornada |
| bitacora.entidad_id | plantaciones.id / usuarios.id / jornadas.id o el id del catálogo (programas, areas, especies, vehiculos, instituciones, solicitantes) según entidad | N:1 | Sin restricción de integridad: la bitácora sobrevive a la eliminación de la entidad |
| bitacora.usuario_id | usuarios.id | N:1 | Sin restricción: conserva usuario_nombre por si la cuenta desaparece |
| jornadas.vehiculo_id | vehiculos.id | N:1 | Opcional. La jornada guarda además una copia de placa, modelo y tipo: el reporte no cambia si después se corrige el catálogo (D162) |
| usuarios.organizacion_id | instituciones.id | N:1 | Obligatoria. Fuera de SEDEMA sólo hay cabos, sin área ni coordinador, así que nadie ve registros de otra institución |
| jornadas.organizacion_id | instituciones.id | N:1 | Obligatoria. Se copia de la cuenta que inicia la jornada; sus árboles son de esa organización (en la Fase 2, el servidor filtra por ella) |
| jornadas.solicitante_id | solicitantes.id | N:1 | Opcional: sólo en un pedido especial cuya instancia está en el catálogo. Un solicitante que aparece en alguna jornada no se elimina del catálogo; se desactiva |
| plantaciones.sustituye_id / sustituido_por_id | plantaciones.id | 1:1 | Un árbol perdido tiene a lo más un sustituto y el sustituto apunta a él; los dos se escriben en la misma operación (D203) |

## 6. Campos que se derivan sin capturarse

Se guardan en la tabla, pero nadie los teclea: salen de otro dato o de la sesión.

| Campo | Se deriva de | Cuándo | Se ve como |
|---|---|---|---|
| plantaciones.alcaldia_cve, alcaldia | lat, lng contra assets/capas/capa-alcaldias.js | Cada vez que el punto se coloca o se mueve (js/derivacion.js derivar); al editar, con el punto vigente | Alcaldía como campo de sólo lectura |
| plantaciones.colonia_cve, colonia | lat, lng contra assets/capas/capa-colonias.js (la más pequeña si hay solape) | Ídem | Colonia como campo de sólo lectura |
| plantaciones.uga | lat, lng contra assets/capas/capa-uga.js | Ídem | No se ve |
| plantaciones.capa_version | meta.version de cada capa cargada | Ídem | No se ve |
| plantaciones.punto_origen, gps_precision_m | La acción con la que se colocó el punto (botón GPS, toque en el mapa, captura a mano, arrastre) | Al colocar el punto | «Cómo se obtuvo» |
| plantaciones.cabo_id | La sesión | En el alta; se conserva al editar | Encabezado y ficha |
| plantaciones.foto_id | La imagen comprimida | Al elegir la foto | Ficha de la foto |
| especies.clave | Máximo ESP-0000 en uso + 1 | Al abrir el alta | Clave (sólo lectura) |
| jornadas.encargado_id | La sesión si es cabo; elección entre cabos con registros ese día si no | Al abrir el cierre | Encargado |
| bitacora.usuario_id, usuario_nombre, perfil | La sesión | En cada movimiento | Historial |

## 7. Lo que se calcula y no se guarda

| Qué | A partir de | Dónde se usa |
|---|---|---|
| Nombre común y científico de la especie, nombre del programa, nombre del cabo | Los ids contra los catálogos y las cuentas (SRP.ref) | Lista, detalle, ficha, PDF |
| Folio en pantalla y PDF (PROVISIONAL mientras folio sea nulo) y etiqueta de campo folio · especie · alcaldía · fecha | SRP.folio.texto / etiqueta | Ficha, lista, PDF |
| Totales del parte: ejemplares, conteo por especie, resumen por programa, alcaldía del sitio | Las plantaciones del día | PDF (Norma 10.2: nunca se capturan) |
| Uso de cada valor de catálogo y de cada cuenta (N registros) | Conteo de plantaciones (incluidos eliminados) | Catálogos y Usuarios; decide si se puede eliminar |
| Cuenta de registros guardados en el dispositivo (alcance de la sesión) | plantaciones activas que alcanza el perfil | Pastilla de conexión y aviso de guardado |
| Alcance y acciones permitidas | perfil contra SRP.PERFILES | Toda la interfaz; en Fase 2 se impone en el servidor |
| `dentro` (el punto cae en alguna alcaldía) | derivar() | Sólo para avisar de un hueco de capa; no se guarda |
| El PDF del parte del día | jornada + sus plantaciones; no se guarda el archivo, se regenera | Reporte de la jornada (D58, D70) |
| Prioridad de reforestación de la colonia donde cae el árbol (Muy alta a Muy baja, o sin dato) y prioridad de la jornada (el nivel donde cayó la mayoría de sus árboles; en empate, el más alto; sin árboles, la de su punto) | El punto del árbol contra la capa de colonias prioritarias (SRP.prioritarias.de); en un solape, el polígono más pequeño. La de la jornada, SRP.prioritarias.deJornada | Iniciar jornada, Nuevo registro, lista y ficha de Jornadas (con filtro), reporte de la jornada (vista previa y PDF), Supervisión, informe PDF y CSV |

### Indicadores de supervisión (D157)

Un solo cálculo (`js/indicadores.js`) para la pestaña Supervisión o Mi avance y para los informes por periodo en PDF y CSV. Se calculan cada vez; no se guardan. El SIA debe calcularlos igual en la Fase 2.

| Indicador | Cómo se calcula | Dónde se usa |
|---|---|---|
| Periodo | Semana de lunes a domingo; mes y año de calendario; un rango de fechas; o todo el registro. Se avanza y se retrocede de uno en uno | Supervisión, Mi avance, informes |
| Jornadas cerradas | Jornadas con estatus «cerrada» que empezaron en el periodo o que tienen árboles plantados en él, del alcance de quien consulta y con los filtros de alcaldía, programa y quien registró (el titular o un cabo con árboles en la jornada) | Cifras, por cabo, informes |
| Jornadas en curso | Jornadas abiertas que empezaron en el periodo o tienen árboles plantados en él. Se dicen aparte y no se suman: una jornada abierta todavía cambia | Cifras, informes |
| Árboles plantados | Árboles activos (no eliminados) de las jornadas cerradas, cuya fecha de plantación cae en el periodo: una jornada de varios días reparte sus árboles en sus días, y un sustituto cuenta el día de la sustitución. Con alcaldía, sólo los de esa alcaldía; con quien registró, sólo los que capturó; en «Mi avance» del cabo, sólo los suyos | Cifras, gráfica, tablas, informes, CSV |
| Avance contra lo previsto | Todos los árboles de las jornadas cerradas que tienen árboles previstos, de cualquier día, ÷ suma de sus previstos, en por ciento: la meta es de la jornada | Cifras, por cabo, informes |
| Árboles por jornada | Árboles plantados ÷ jornadas cerradas, con un decimal | Cifras, informes |
| Cabos que trabajaron | Cabos distintos con al menos una jornada cerrada en el periodo, frente a los asignados: la cuadrilla de la coordinación, o los cabos activos para la administración. Con institución elegida, sólo los cabos de esa institución | Cifras, por cabo, informes |
| Especies y nativas | Especies distintas entre los árboles plantados; nativa es la de distribución «Nativa» o «Endémica» en el catálogo (SNIB/CONABIO), en por ciento de los árboles | Cifras, por especie, informes |
| Alcaldías y colonias | Alcaldías y colonias distintas de los árboles plantados, tal como las derivó el sistema del punto | Cifras, por alcaldía, mapa, informes |
| Por institución | Árboles plantados y jornadas de cada institución que ejecutó (la organizacion_id de la jornada; sin dato, SEDEMA). Lo de alcaldías, PAOT, SOBSE, empresas y organizaciones civiles suma al total de la Ciudad. Con el filtro de institución sólo cuentan sus jornadas, sus árboles y sus cabos; sólo la Administración lo tiene, porque las demás cuentas ven únicamente su institución | Por institución (Administración, con más de una institución), filtro de Supervisión, informes, CSV («Institución que ejecuta») |
| Calidad del dato | Árboles con fotografía; ubicados con GPS, en el mapa o a mano; precisión mediana del GPS | Calidad del dato, informes |
| Qué atender | Jornadas abiertas de días anteriores (sin importar el periodo); jornadas cerradas del periodo con puntos marcados sin revisar; jornadas cerradas del periodo sin reporte | Qué atender, por cabo, informes |
| Trazabilidad | Árboles eliminados en el periodo (por la fecha de su eliminación) y ediciones de árboles que registra la bitácora en el periodo. Se cuentan aparte y no cambian la cifra de árboles | Calidad del dato, por cabo, informes |
| Serie | Árboles y jornadas cerradas por día en una semana, por semana en un mes, por mes en un año; en un rango, por día hasta 31 días, por semana hasta 26 semanas y después por mes | Gráfica de avance, informes |
| Por prioridad de la colonia | Árboles plantados del periodo según la prioridad de la colonia donde cae su punto en la capa de colonias prioritarias (cinco niveles y «sin dato»); «alta y muy alta» suma los dos niveles superiores. Se calcula al consultar, con la versión vigente de la capa: si la capa cambia, la cifra cambia | Supervisión (tabla y mapa), informe PDF, CSV |

## 8. Estado efímero (vive sólo en memoria mientras se usa la pantalla)

Nada de esto llega a la base tal cual; es lo que el formulario necesita mientras se captura y desaparece con la acción que se indica.

| Dónde | Qué es | Cuándo desaparece |
|---|---|---|
| SRP.formulario.estado.idPrevisto | UUID que se fija al abrir la ficha de revisión y se convierte en plantaciones.id al guardar | Al guardar, al cancelar o al ir a Registros; el siguiente registro genera otro |
| SRP.formulario.estado.territorio | Resultado de derivar() del punto vigente (incluye `dentro`) | Al limpiar el formulario; se vuelve a calcular con cada punto |
| SRP.formulario.estado.foto / fotoId / fotoNombre / fotoBytes | La imagen comprimida en memoria antes de guardar | Al quitar la foto o limpiar; se vuelven null / '' / 0 |
| SRP.formulario.estado.especieId | La especie elegida (o `__otra__`) | Se anula en cuanto se teclea en el campo; sin ella el registro no pasa la validación |
| SRP.formulario.estado.editando | El registro que se está corrigiendo (copia completa) | Al guardar o cancelar la edición |
| SRP.mapa.lat / lng / origen / precision | El punto vigente y cómo se obtuvo | Al limpiar; `precision` se borra al mover el punto sin GPS |
| SRP.reportes.contexto | {registros, fecha, cabo_id, previo} de lo que se va a reportar | Al cerrar el diálogo de cierre |
| SRP.registros.filtro y periodoAbierto | Estado de los filtros (Hoy/Todos/periodo, año, mes, cabo) | Al entrar de nuevo a la vista se reinicia a Hoy |
| SRP.catalogos.uso, SRP.usuarios.uso | Conteos de uso calculados al abrir la vista | Se recalculan en cada preparar() |
| SRP.catalogos.claveTocada / editando | Si la persona escribió la clave a mano; qué valor se edita | Al cerrar el diálogo |
| SRP.ref.catalogos / usuarios / catalogoPorId / usuarioPorId | Copias en memoria de las dos tablas de referencia | Se recargan con recargar() tras cada cambio |
| SRP.sesion.usuario | La cuenta con sesión abierta (objeto completo) | Al cerrar sesión; el id persiste en localStorage |

## 9. Campos condicionales (aparecen o se vacían según otro dato)

| Campo | Aparece | Se vacía |
|---|---|---|
| plantaciones.especie_otra | Sólo al elegir «Otra especie» | Al elegir una especie del catálogo ('') |
| plantaciones.especie_id | Con especie del catálogo | Con «Otra especie» (null) |
| plantaciones.gps_precision_m | Sólo con punto_origen = gps | Al tocar el mapa, capturar a mano o arrastrar (null) |
| plantaciones.foto_base64, foto_id | Al elegir una foto | Al quitarla (null, null) |
| usuarios.coordinadores_ids | Sólo con perfil CABO | Al cambiar a otro perfil; al cambiar de institución quedan sólo los de la nueva ([] si ninguno) |
| especies.nombre_cientifico … id_enciclovida | Sólo en tipo = especie | No existen en programas ni áreas |
| vehiculos.modelo, tipo_vehiculo | Sólo en tipo = vehiculo | No existen en programas, áreas ni especies |
| usuarios.area_id | Sólo con organización SEDEMA | Al elegir otra organización (null) |
| jornadas.chofer, vehiculo_id, vehiculo_placa, vehiculo_modelo, vehiculo_tipo | Sólo en jornadas de SEDEMA | En jornadas de otras instituciones el cierre no los ofrece, quedan vacíos y el reporte no los imprime |
| instituciones.tipo_organizacion | Sólo en tipo = organizacion | No existe en los demás catálogos |
| solicitantes.tipo_solicitante | Sólo en tipo = solicitante | No existe en los demás catálogos |
| programas.tipos_organizacion | Sólo en tipo = programa | No existe en los demás catálogos; [] en un programa = sólo SEDEMA |
| jornadas.personal, apoyo | Sólo en jornadas de SEDEMA (D192) | En jornadas de otras instituciones el cierre no los ofrece, quedan vacíos y el reporte no los imprime |
| plantaciones.motivo_sustitucion_otro | Sólo con motivo «Otro» al sustituir | Con cualquier otro motivo ('') |
| jornadas.solicitante_id / solicitante_otro / pedido_descripcion | Sólo con origen «Pedido especial»; solicitante_otro, sólo con «Otra instancia» | Al volver a «Programada» (nulo y '') |

## 10. Reglas y validaciones vigentes (Fase 1, en el dispositivo)

| Id | Tabla | Regla | Dónde vive |
|---|---|---|---|
| R-P01 | plantaciones | Ubicación obligatoria (GPS, toque en el mapa o captura a mano) y dentro de la Ciudad de México: la unión de las alcaldías más MARGEN_AMBITO_M (100 m), no la caja de CONFIG.MAPA.LIMITES, que sólo es el primer filtro (D152). Al tocar el mapa se pide acercamiento ZOOM_TOQUE (17) o más | js/derivacion.js dentroDelAmbito(); js/mapa.js colocar(), alTocar(); js/formulario.js validar() |
| R-P02 | plantaciones | Especie obligatoria: de la lista de activas, o «Otra especie» con texto | js/formulario.js validar() |
| R-P03 | plantaciones | El programa es el de la jornada (D151): no se elige por árbol. Al iniciar la jornada se elige entre los programas activos. SEDEMA elige todos; cada tipo de institución, los que tienen marcado su tipo en programas.tipos_organizacion, que la Administración cambia en Catálogos › Programas (D193) | js/formulario.js programaDeJornada(); js/jornada-activa.js iniciarJornada(); js/referencias.js programasPara() |
| R-P04 | plantaciones | Fecha de plantación obligatoria, no posterior a hoy ni anterior a la fecha de su jornada | js/formulario.js validar(); campo-fecha.max |
| R-P05 | plantaciones | Comentarios hasta 500 caracteres | index.html maxlength |
| R-P06 | plantaciones | La foto se comprime a ≤ 800×600 JPEG 0.7 antes de guardarse; el peso se calcula de la propia foto cuando se necesita (SRP.foto.pesoDe) | js/foto.js comprimir(); CONFIG.FOTO |
| R-P07 | plantaciones | Territorio (alcaldía, colonia, UGA, uga_borde_m, capa_version) se rederiva con cada movimiento del punto; nunca se teclea. Junto al límite, la alcaldía más cercana y un aviso; sin colonia se dice «Sin colonia en la capa». Si al editar el territorio cambia, la bitácora lo registra (D152) | js/formulario.js alMoverPunto(), guardar(); js/derivacion.js |
| R-P08 | plantaciones | gps_precision_m existe si y sólo si punto_origen = gps | js/mapa.js colocar(); pruebas/auditoria.py |
| R-P09 | plantaciones | El formulario arranca en blanco en cada registro: nada se hereda del anterior (ni programa, ni punto). La fecha de plantación arranca según la jornada (o la elegida antes en esa misma jornada, que está a la vista) | js/formulario.js limpiar(), nuevoRegistro() |
| R-P10 | plantaciones | Al editar se conservan id, cabo_id, fecha_registro y folio; se actualizan fecha_ultima_edicion y editado_por_id, y la bitácora lista los campos cambiados y, si el punto se movió, de dónde a dónde | js/formulario.js registroPrevisto(), guardar() |
| R-P11 | plantaciones | Eliminar marca estatus = eliminado (con bitácora); nunca se borra el renglón | js/registros.js eliminar() |
| R-P12 | plantaciones | Folio y campos folio_* nacen nulos; con datos reales no se tocan en el dispositivo y la pantalla y el PDF dicen PROVISIONAL. Con datos de prueba los llena el servidor simulado (D110), sólo si el registro tiene alcaldía y las tres capas (D152) | js/folio.js puedeEmitir(), emitirPendientes(); js/formulario.js registroPrevisto() |
| R-P13 | plantaciones | El GPS se escucha hasta GPS_AFINAR_MS (8 s) y el punto queda con la lectura más precisa; se detiene al llegar a precisión buena, al revisar o guardar, o si la persona coloca el punto a mano (D152) | js/mapa.js ubicar(), detenerAfinado() |
| R-P14 | plantaciones | La aplicación no abre sin las capas de alcaldías, UGA y colonias y la biblioteca del cruce (D152) | js/app.js comprobarVersionCompleta(); js/derivacion.js capasCompletas() |
| R-A01 | todas | Alcance por perfil: CABO ve/edita/elimina los suyos; COORDINADOR registra, ve, edita y elimina los de sus cabos y los suyos (D155), y elimina jornadas vacías (D151); DIRECTIVO sólo ve y descarga (reportes ya generados, tablas y fotografías): en SEDEMA, todo; en otra institución, lo de la suya, por jornadas.organizacion_id y por la institución de quien capturó el árbol (D224); ADMIN todo, no captura. Un perfil desconocido no alcanza nada. Cada acción que escribe lo exige al empezar, no sólo esconde el botón (D151) | js/permisos.js PERFILES, ACCIONES, exigir() (fuente única); la interfaz sólo lo refleja |
| R-A02 | todas | Toda alta, edición, eliminación, activación y desactivación escribe bitácora en la misma transacción | js/almacen.js guardarConBitacora(), borrarConBitacora() |
| R-U01 | usuarios | Tipo de institución, institución, nombre completo (nombre y al menos un apellido), correo válido y único (insensible a mayúsculas/acentos), área, cargo y perfil válido obligatorios; el correo no cambia después | js/usuarios.js validar() |
| R-U02 | usuarios | coordinadores_ids sólo con perfil CABO, uno o varios, todos de su misma institución; con otro perfil queda vacío | js/usuarios.js guardar() |
| R-U03 | usuarios | Una cuenta de administración no puede quitarse a sí misma el perfil ADMIN | js/usuarios.js validar() |
| R-U04 | usuarios | Si otro renglón la nombra no se elimina: se desactiva (D151). Cuenta en todas las tablas: árboles (también eliminados), jornadas como cabo, encargado o quien la creó o editó, cabos que coordina y cuentas o catálogos que dio de alta o editó. Inactiva no puede entrar; sus registros siguen a su nombre | js/referencias.js usosDe(); js/usuarios.js eliminar(), cambiarEstado(); js/sesion.js autenticar() |
| R-U05 | usuarios | Institución obligatoria, elegida por tipo de la lista (no se crea desde el alta). Fuera de SEDEMA: sin área, perfil CABO y sin coordinador. Quien coordina cabos no cambia de institución hasta reasignarlos. Una cuenta cuya institución está desactivada no entra, tampoco con la sesión abierta | js/usuarios.js validar(), guardar(); js/sesion.js autenticar(), leer(); js/referencias.js accesoOrganizacion() |
| R-C01 | programas, areas, especies, vehiculos, instituciones, solicitantes | Nombre obligatorio y único en su tabla; clave `[A-Z0-9_]{2,30}` única en su tabla (programas y áreas), fija después de guardar | js/catalogos.js validar() |
| R-C02 | especies | Especies: científico obligatorio con formato «Genus epíteto» y único; clave ESP-0000 consecutiva que asigna el sistema; id = clave; género y epíteto derivados; id_snib `número+ANGIO\|GIMNO`; id_enciclovida entero | js/catalogos.js validar(), guardar(), siguienteClaveEspecie() |
| R-C03 | programas, areas, especies, vehiculos, instituciones, solicitantes | Con uso en cualquier tabla —árboles, también eliminados; jornadas; cuentas— no se elimina: se desactiva (D151). Inactivo deja de ofrecerse; lo ya guardado no cambia | js/referencias.js usosDe(); js/catalogos.js eliminar(), cambiarEstado() |
| R-C04 | especies | Las 76 especies del SIA se siembran desde assets/catalogos/catalogo-especies.js (generado del Excel); para cambiarlas se corrige el Excel y se regenera | herramientas/generar_especies.py; js/datos-ficticios.js |
| R-C05 | instituciones | Instituciones: cuatro tipos fijos. Sólo la Administración las agrega (a solicitud, en Catálogos › Instituciones: tipo —nunca Alcaldía— y nombre único; la clave la pone el sistema), las renombra y las desactiva (desactivar corta el acceso de sus cuentas); no se eliminan. Las 16 alcaldías son fijas y SEDEMA no se desactiva. De arranque: SEDEMA, PAOT, SOBSE (Gobierno de la CDMX), Green Cover (Empresa privada), Reforestamos México, A.C. (Organización civil) y las 16 alcaldías (id o-alc-<cvegeo>). Áreas de arranque: DGSANPAVA, Oficina de la Secretaría, Sistema de Información Ambiental y DGEIRA; en un teléfono con capturas, las cuentas del área retirada «Dirección de Infraestructura Verde» pasan a DGSANPAVA. Programas de arranque: Reforestación Urbana, Centro Histórico, Palmeras y Compensaciones; «Jornadas de voluntariado» se retiró (D192): en un teléfono con capturas se desactiva si alguna jornada o árbol lo usa, y si no, se quita | js/catalogos.js esFija(), validar(), guardar(), cambiarEstado(); js/datos-ficticios.js; js/almacen.js completarCatalogos() |
| R-C06 | solicitantes | Solicitantes: quién pide un pedido especial. Catálogo aparte del de instituciones: un solicitante no tiene cuentas ni ejecuta jornadas. Sólo la Administración los agrega, edita y desactiva (Catálogos › Solicitantes): nombre único, tipo de la lista fija de siete (Alcaldía, Dependencia de gobierno, Congreso, Empresa, Organización civil, Escuela, Vecinos) y clave que pone el sistema; sin uso se eliminan. De arranque: las 16 alcaldías (id s-alc-<cvegeo>, sin la palabra «Alcaldía»), Secretaría de Obras y Servicios (SOBSE), Secretaría de Gestión Integral del Agua (SEGIAGUA), Jefatura de Gobierno (Dependencia de gobierno) y Diputadas y diputados (Congreso). «Quién lo solicita» los ofrece agrupados por tipo y, al final, «Otra instancia» | js/catalogos.js validar(), guardar(); js/referencias.js TIPOS_SOLICITANTE, nombreSolicitante(), ordenSolicitantes(); js/pedido.js opciones(); js/datos-ficticios.js |
| R-J01 | jornadas | Sólo se elimina sin ningún árbol, ni eliminado: los eliminados se conservan como constancia y siguen apuntando a ella. La eliminan quien la inició, su coordinador o administración (D132, D151) | js/jornadas.js eliminarJornada(), pintarDetalle() |
| R-J02 | jornadas | Al cambiar su programa, todos sus árboles —también los eliminados— lo toman en la misma transacción que la jornada; al cambiar su fecha, la toman los árboles plantados el día de inicio y los de otros días conservan la suya (la jornada no puede empezar después de ellos). Un árbol movido toma el programa de su jornada nueva y la fecha si era del día de inicio; su marca de revisado sale | js/jornadas.js guardarEdicion(), mover(); js/registros.js restaurar(); js/almacen.js guardarJuntos() |
| R-J05 | jornadas | Relevo de cabo: sólo la coordinación, en una jornada abierta de su alcance, la pasa a un cabo activo de su cuadrilla y de la institución de la jornada, o se la devuelve al titular. Registra en la jornada sólo quien la tiene a su cargo (relevo_id o, sin relevo, cabo_id); el titular no cambia y el relevo queda en relevos y en la bitácora (RELEVO) | js/permisos.js jornada.relevo, jornada.registrar; js/jornadas.js relevar(); js/jornada-activa.js abiertas() |
| R-J06 | jornadas | Pedido especial: una jornada con origen PEDIDO lleva quién lo solicita, del catálogo de solicitantes (solicitante_id) o escrito (solicitante_otro); una programada lleva los tres datos del pedido vacíos. El origen no cambia quién ejecuta ni el programa. Una jornada que traía una institución como solicitante pasa, al abrir el sistema, al solicitante que le corresponde o queda escrita como «Otra instancia» | js/pedido.js leer() y errores(); js/jornada-activa.js iniciarJornada(); js/jornadas.js guardarEdicion(); js/almacen.js normalizar() |
| R-R01 | jornadas | El reporte es de una jornada declarada: reúne las plantaciones activas con ese jornada_id; regenerar la misma jornada reabre sus datos de cierre (D119) | js/reportes.js refrescarVista(), abrir(), cierreDeJornada() |
| R-R02 | jornadas | Todos los campos del cierre son opcionales y ninguno se prellena; el encargado sale de la sesión o se elige entre los cabos con registros ese día | js/reportes.js prepararEncargado() |
| R-F01 | plantaciones | Filtros de Registros: Hoy / Todos / Un periodo (Desde ≤ Hasta, entra con Aplicar), Año y Mes sólo con registros, Cabo según alcance; ningún control mueve el foco solo (D82) | js/registros.js |
| R-D01 | todas | Siembra: al abrir con sello distinto de CONFIG.SELLO_DATOS se vuelven a cargar cuentas y catálogos de ejemplo sólo si no hay nada capturado (árboles, jornadas o bitácora); si lo hay, se conserva todo. Una base a la que le falta un almacén, o de una versión posterior, se rehace conservando lo que tenía (D149; sólo con ES_FICTICIO) | js/almacen.js sembrarSiVacio(); js/config.js |

## 11. Reglas que esperan al servidor (Fase 2)

| Id | Qué | Detalle | Referencia |
|---|---|---|---|
| S-01 | Cola de envío | Cada registro guardado queda en cola (guardado → enviado → con error); envío automático en segundo plano con señal, «Enviar ahora», y nada se borra del dispositivo hasta que el servidor confirme (qué se queda después, en S-11). Requiere dos campos nuevos en plantaciones: identificador del servidor y marca de envío (retirados en D17 por no tener uso todavía) | DECISIONES, pendiente «Cola de envío al servidor»; D83 |
| S-02 | Emisión del folio | Tabla de secuencias por celda UGA, perpetua y monotónica (sin reinicio por ejercicio, administración ni versión); lectura e incremento atómicos, nunca MAX(folio)+1 ni COUNT+1; asignación en transacción con plantaciones.id como clave de idempotencia (R3–R6). Sólo con la malla UGA corregida, versionada y congelada. El servidor vuelve a derivar la celda con la coordenada recibida y no confía en la del teléfono; si el punto está más cerca del borde que su precisión (uga_borde_m), decide la celda con la regla que fije el SIA (D152). Al asignarlo, el servidor guarda congelados la celda UGA, la versión de capas y el punto con que lo asignó (R8): son columnas del servidor, no del teléfono. | D67; js/folio.js; pendiente «Emisión del folio» |
| S-03 | Integridad referencial y unicidad en la base | FK de todas las relaciones de arriba, que son las mismas con que el dispositivo cuenta el uso antes de eliminar (D151); UNIQUE en plantaciones.folio, usuarios.correo, clave y nombre de cada tabla de catálogo (programas, areas, especies, vehiculos, instituciones, solicitantes), especies.nombre_cientifico; CHECK de los dominios; la bitácora sin FK a propósito | Esta tabla de relaciones |
| S-04 | Permisos en el servidor | Las reglas de js/permisos.js (PERFILES y ACCIONES, D151) se imponen en la API en cada operación (Norma 7.1); la pantalla sólo las refleja. Autenticación con el proveedor institucional: sólo cambia autenticar() en js/sesion.js | js/permisos.js; D05 |
| S-05 | Posible duplicado | Aviso al sincronizar cuando otro registro cae a menos de la incertidumbre combinada de ambos puntos (suma de gps_precision_m, piso 4 m), en el servidor; nunca con 4 m fijos | D69 |
| S-06 | Bandeja de especies fuera de catálogo | Donde el SIA resuelve cada «Otra especie» (especie_id nula y especie_otra escrita): alta en el catálogo (siguiente ESP-0000) o reasignación a una existente; al resolverse cambia especie_id, nunca el folio. Si la bandeja necesita estados propios (p. ej. rechazada), son del servidor | D68 |
| S-07 | Fotografías a archivo | foto_base64 sale del renglón y se guarda como archivo referido por foto_id, como en los otros módulos del SIA | Pendiente «Dónde viven las fotografías» |
| S-08 | Rederivación territorial por versión de capa | Al sustituir alcaldías, UGA y colonias por las definitivas, se recalculan alcaldia_cve, alcaldia, colonia_cve, colonia y uga de todo registro cuyo capa_version sea anterior; folio_* no se toca | Pendiente «sustituir las tres capas» |
| S-09 | Datos de prueba separados | La versión de prueba guarda en su propia base (`srp_db`) y la real en otra (`srp_sia`): nunca conviven en un teléfono ni se envían como reales. El servidor de producción arranca limpio y sólo recibe de la versión real | CONFIG.ES_FICTICIO |
| S-11 | Qué guarda el teléfono | En el teléfono sólo quedan: lo que no se ha enviado, hasta que el servidor confirme la recepción; los árboles de la jornada abierta, enviados o no, hasta cerrarla y generar su reporte; y los catálogos, especies, vehículos y la cuenta. Las jornadas cerradas, el historial y las fotografías recibidas viven sólo en el servidor y se consultan y editan ahí, con señal. Detalle en FASE2-Y-TRASPASO.md | js/envio.js; js/almacen.js |
| S-12 | Organizaciones externas | Alcaldías, PAOT, SOBSE, empresas y organizaciones civiles usan el sistema con cuentas de cabo que da de alta la Secretaría a solicitud. El servidor filtra por organizacion_id: una cuenta nunca recibe registros de otra institución. Carga en la base real el catálogo de instituciones de arranque (SEDEMA o-sedema, PAOT, SOBSE, Green Cover, Reforestamos México y las 16 alcaldías o-alc-<cvegeo>). Rechaza el acceso de cuentas cuya institución esté desactivada. Lo que plantan suma a las cifras de la Ciudad. Pendientes: acceso para cuentas externas (el proveedor institucional puede no cubrir a empresas ni organizaciones civiles), aviso de privacidad que cubra a su personal y convenio o carta responsiva por institución | DECISIONES D186 a D189; FASE2-Y-TRASPASO |
| S-13 | Jornada de varios días y relevo de cabo | El servidor acepta en una jornada abierta árboles de días posteriores a su fecha, con fecha_plantacion entre jornadas.fecha y la fecha de recepción, y sólo de quien la tiene a su cargo (relevo_id o, sin relevo, cabo_id); la sustitución, de quien tenga el árbol perdido en su alcance. Al hacer un relevo entrega la jornada abierta y sus árboles al teléfono del cabo que la recibe, y el teléfono del titular deja de poder registrar en ella. Rechaza un relevo que no venga de la coordinación del titular o hacia un cabo de otra cuadrilla o institución. Avisa del relevo a los dos cabos en su teléfono (al que recibe la jornada y al que deja de registrar en ella, y al titular cuando vuelve a él): hoy el aviso sale al entrar, en el equipo donde se hizo el relevo | DECISIONES D204, D205; FASE2-Y-TRASPASO |
| S-14 | Pedido especial | El servidor guarda el origen de la jornada (PROGRAMADA o PEDIDO) y valida lo mismo que el teléfono: un pedido lleva solicitante, del catálogo de solicitantes (solicitante_id) o escrito (solicitante_otro), y su descripción (pedido_descripcion), obligatoria; y una programada lleva los tres datos del pedido vacíos. La base real carga los solicitantes de arranque (Oficina de la Secretaría, SOBSE, SEGIAGUA, Jefatura de Gobierno, 16 alcaldías, Diputadas y diputados) con sus tipos. El solicitante no da acceso a la jornada: la ve quien la ejecuta y quien la supervisa | D210, D217, D219 |
| S-15 | Jornada íntegra y alcance por institución | El servidor entrega a quien tiene una jornada a su cargo (titular, cabo en relevo y coordinación) todos sus árboles activos, los haya capturado quien los haya capturado: el reporte, la conciliación y el avance de la jornada se calculan con todos. Los permisos de edición y eliminación siguen siendo por árbol. El alcance se decide por la institución de la jornada (jornadas.organizacion_id), no por la institución o la coordinación actual de quien capturó: al cambiar una cuenta de institución o de coordinación, lo que plantó para la anterior no pasa a la nueva. Un cabo que recibió un relevo y ya devolvió la jornada conserva la lectura, no la edición: editar, cerrar, reabrir y generar el reporte corresponden al titular, al cabo con el relevo vigente y a la coordinación | Auditoría integral del 02-10-2026; FASE2-Y-TRASPASO |
| S-16 | Escrituras parciales y folio inmutable | Cada operación modifica sólo los campos que le corresponden sobre el registro vigente en el servidor, nunca sobrescribe el registro completo con la copia que tenía el teléfono: cerrar una jornada no borra las marcas de revisión hechas entre tanto y editar o eliminar un árbol no toca su folio. El folio se asigna una sola vez; ninguna operación posterior lo cambia ni lo anula. El servidor rechaza una escritura hecha sobre una versión anterior del registro y devuelve la vigente | Auditoría integral del 02-10-2026; FASE2-Y-TRASPASO |
| S-17 | Árboles eliminados y registro de cambios | El servidor ofrece la consulta de árboles y jornadas eliminados dentro del alcance de la cuenta, con su historial, y permite restaurarlos a quien puede eliminarlos. El registro de cambios incluye árboles y jornadas además de cuentas, catálogos y cargas, y guarda de cada cambio el valor anterior y el nuevo, la cuenta, la fecha y hora y el identificador del dispositivo. La eliminación pide un motivo | Auditoría integral del 02-10-2026; FASE2-Y-TRASPASO |
| S-18 | Cola de envío por operación | La cola del teléfono envía cada operación, no sólo los árboles activos: altas, ediciones, eliminaciones, restauraciones, sustituciones, jornadas, cierres, reaperturas y relevos. El indicador de pendientes cuenta todas. La cola simulada de la Etapa 1 (js/envio.js) sólo considera árboles activos y sirve de referencia para los estados y avisos, no para el alcance | Auditoría integral del 02-10-2026; FASE2-Y-TRASPASO |

## 12. Capas y catálogos externos que alimentan campos

| Capa | Archivo | Versión | Alimenta | Estado |
|---|---|---|---|---|
| alcaldías | assets/capas/capa-alcaldias.js (fuente originales/alcaldias_cdmx.json, con metadato en originales/documentacion/) | sia-2026-01-01 | alcaldia_cve, alcaldia | Definitiva: 16 polígonos, sin solapes ni huecos (bloque 38) |
| malla UGA | assets/capas/capa-uga.js (fuente originales/UGA_CDMX.geojson) | sia-2026-09-22 | uga (y la celda congelada del folio, en el servidor) | Definitiva según el SIA; misma geometría que la anterior. Siguen 8 celdas cuyo prefijo no es la alcaldía de su centro (TLP-040, TLP-085, IZP-005, IZP-011, COY-054, MIH-001, MIH-002, IZC-021): no afecta la alcaldía del registro, que sale de su propia capa |
| colonias | assets/capas/capa-colonias.js (fuente originales/colonias_iecm2022.geojson) | iecm-2022 | colonia_cve, colonia | Definitiva desde el 28-09-2026: las colonias del IECM 2022 son la unidad oficial de reporte. Nueve geometrías se ajustan a la rejilla de seis decimales para que sigan válidas (D152). En el 1.25 % del territorio la colonia cruza el límite de su alcaldía; la alcaldía siempre sale de su propia capa |
| colonias prioritarias | assets/capas/capa-prioritarias.js (fuente originales/colonias_prioritarias_reforestacion.geojson) | priorizacion-2026-10-01 | Nada que se guarde: la capa en los mapas, la prioridad del punto en pantalla y el indicador «Por prioridad de la colonia» | Capa de referencia del modelo de priorización (Liber, 01-10-2026): 2,243 colonias, prioridad 0 (Muy baja) a 4 (Muy alta). Se publican sólo colonia, alcaldía y prioridad. Sus colonias no son las unidades territoriales del IECM; polígonos simplificados (15 vértices en promedio) con 6.5 km² de solapes, donde gana el más pequeño; nueve geometrías ajustadas a la rejilla. Por confirmar con el SIA: versión oficial y geometría completa |
| catálogo de especies | assets/catalogos/catalogo-especies.js (fuente originales/CGO_ESPECIES_REFORESTACION_URBANA_2026-09-22.xlsx) | 2026-09-22 | especies | Definitivo (D84) |

## 13. Borrador de tablas para la Fase 2 (PostgreSQL)

Traducción directa del esquema, para no rediseñarlo desde cero. Los tipos son los de la columna «Tipo»; las llaves foráneas, las de la sección 5. Las tablas se crean tal cual —son las mismas en el teléfono y en el servidor, cada catálogo en la suya— y se agregan las dos columnas de la cola de envío (S-01) y la tabla de secuencias del folio (S-02) cuando toque.

```sql
CREATE TABLE plantaciones (
  id                       uuid           NOT NULL,
  estatus                  text           NOT NULL,
  cabo_id                  uuid           NOT NULL,
  lat                      numeric(9,6)   NOT NULL,
  lng                      numeric(9,6)   NOT NULL,
  punto_origen             text           NOT NULL,
  gps_precision_m          integer        NULL,
  folio                    char(13)       NULL,
  especie_id               char(8)        NULL,
  especie_otra             text           NOT NULL,
  alcaldia_cve             char(5)        NULL,
  alcaldia                 text           NULL,
  colonia_cve              text           NULL,
  colonia                  text           NULL,
  uga                      char(7)        NULL,
  uga_borde_m              integer        NULL,
  capa_version             text           NULL,
  programa_id              text           NOT NULL,
  fecha_plantacion         date           NOT NULL,
  jornada_id               uuid           NOT NULL,
  sustituye_id             uuid           NULL,
  motivo_sustitucion       text           NULL,
  motivo_sustitucion_otro  varchar(120)   NOT NULL,
  sustituido_por_id        uuid           NULL,
  comentarios              varchar(500)   NOT NULL,
  foto_base64              text           NULL,
  foto_id                  uuid           NULL,
  fecha_registro           timestamptz    NOT NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  editado_por_id           uuid           NULL,
  PRIMARY KEY (id)
);
CREATE INDEX plantaciones_estatus ON plantaciones (estatus);
CREATE INDEX plantaciones_jornada_id ON plantaciones (jornada_id);

CREATE TABLE usuarios (
  id                       uuid           NOT NULL,
  correo                   text           NOT NULL,
  nombre_completo          text           NOT NULL,
  organizacion_id          text           NOT NULL,
  area_id                  text           NULL,
  cargo_rol                text           NOT NULL,
  perfil                   text           NOT NULL,
  coordinadores_ids        uuid[]         NOT NULL,
  activo                   boolean        NOT NULL,
  fecha_creacion           timestamptz    NOT NULL,
  creado_por_id            uuid           NOT NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  editado_por_id           uuid           NULL,
  PRIMARY KEY (id)
);

CREATE TABLE programas (
  id                       text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  tipos_organizacion       varchar(30)[]  NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE areas (
  id                       text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  PRIMARY KEY (id)
);

CREATE TABLE especies (
  id                       text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  nombre_cientifico        varchar(140)   NOT NULL,
  otros_nombres_comunes    varchar(400)   NOT NULL,
  tipo_distribucion        text           NOT NULL,
  formadecrecimiento       varchar(100)   NOT NULL,
  id_snib                  varchar(16)    NULL,
  id_enciclovida           integer        NULL,
  PRIMARY KEY (id)
);

CREATE TABLE vehiculos (
  id                       text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  modelo                   varchar(40)    NOT NULL,
  tipo_vehiculo            varchar(30)    NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE instituciones (
  id                       text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  tipo_organizacion        varchar(30)    NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE solicitantes (
  id                       text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  tipo_solicitante         varchar(30)    NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE bitacora (
  id                       uuid           NOT NULL,
  fecha                    timestamptz    NOT NULL,
  usuario_id               uuid           NOT NULL,
  usuario_nombre           text           NOT NULL,
  perfil                   text           NOT NULL,
  accion                   text           NOT NULL,
  entidad                  text           NOT NULL,
  entidad_id               text           NOT NULL,
  detalle                  text           NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX bitacora_entidad_id ON bitacora (entidad_id);

CREATE TABLE jornadas (
  id                       uuid           NOT NULL,
  nombre                   text           NOT NULL,
  ubicacion                text           NOT NULL,
  programa_id              text           NOT NULL,
  lat                      numeric(9,6)   NULL,
  lng                      numeric(9,6)   NULL,
  punto_origen             text           NULL,
  gps_precision_m          integer        NULL,
  alcaldia_cve             text           NULL,
  alcaldia                 text           NULL,
  colonia_cve              text           NULL,
  colonia                  text           NULL,
  fecha                    date           NOT NULL,
  comentarios              text           NOT NULL,
  cabo_id                  uuid           NOT NULL,
  organizacion_id          text           NOT NULL,
  estatus                  text           NOT NULL,
  fecha_inicio             timestamptz    NOT NULL,
  fecha_cierre             timestamptz    NULL,
  encargado_id             uuid           NULL,
  relevo_id                uuid           NULL,
  relevos                  objeto[]       NOT NULL,
  origen                   text           NOT NULL,
  solicitante_id           text           NULL,
  solicitante_otro         text           NOT NULL,
  pedido_descripcion       text           NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  arboles_previstos        integer        NOT NULL,
  puntos_revisados         uuid[]         NOT NULL,
  reporte_en               timestamptz    NULL,
  carga_id                 uuid           NULL,
  personal                 text           NOT NULL,
  apoyo                    text           NOT NULL,
  observaciones            text           NOT NULL,
  chofer                   text           NOT NULL,
  vehiculo_modelo          text           NOT NULL,
  vehiculo_placa           text           NOT NULL,
  vehiculo_tipo            text           NOT NULL,
  vehiculo_id              text           NULL,
  hora                     time           NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX jornadas_cabo_id ON jornadas (cabo_id);

```

