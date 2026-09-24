# Diccionario de datos e inventario de tablas

**Generado de `esquema.json` por `pruebas/generar_diccionario.py`: no se edita a mano.** Versión del esquema: 2026-09-22b. Etapa 1 (Fase 1: dispositivo, sin servidor).

Qué guarda el sistema, tabla por tabla: cada campo con su tipo, si admite nulo, de dónde sale, qué valores admite y qué regla lo gobierna; qué se deriva sin verse en pantalla; qué se calcula y no se guarda; qué vive sólo en memoria mientras se captura; cómo se relacionan las tablas; y qué reglas aplican hoy en el dispositivo y cuáles esperan al servidor. `pruebas/auditoria.py` compara este esquema contra lo que el sistema guarda de verdad y contra los dominios del código, y avisa si algo sobra, falta o no está regenerado. `MAPEO-CAMPOS.md` sigue siendo la vista por pantalla (etiqueta ↔ campo, con la explicación larga de cada decisión); este documento es la vista por tabla, pensada para construir la base y la API de la Fase 2 sin volver a leer el código.

## 1. Dónde viven los datos

- **Motor:** IndexedDB del navegador, base `srp_db` (SRP.CONFIG.DB_NOMBRE), versión 1.
- **Tablas (almacenes):** `plantaciones`, `usuarios`, `catalogos`, `bitacora`, `jornadas`.

| Dónde | Qué guarda | En Fase 2 |
|---|---|---|
| localStorage `srp_sesion_usuario_id` | id de la cuenta con sesión abierta; el dispositivo queda fijo a esa cuenta (D06) | Lo sustituye el proveedor de identidad institucional; sólo cambia `autenticar()` en js/sesion.js |
| localStorage `srp_sello_datos` | sello con el que se sembró (SRP.CONFIG.SELLO_DATOS); si no coincide, se vuelve a sembrar | Desaparece con ES_FICTICIO |
| Caché del service worker (sw.js) | copia de la aplicación para abrir sin señal; no guarda datos | Se conserva |
| Respaldo `SRP_respaldo_AAAA-MM-DD_<usuario>.json` | {sistema, version, generado, usuario_id, es_ficticio, resumen{registros, con_foto, foto_bytes}, plantaciones[], usuarios[], catalogos[], bitacora[], jornadas[]}: las cinco tablas con el mismo esquema (D87) | El mismo archivo es lo que el servidor recibiría |

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

## 3. Dominios (valores válidos y de dónde salen)

| Dominio | Valores | Fuente |
|---|---|---|
| `estatus_plantacion` | `activo` · `eliminado` | js/formulario.js registroPrevisto(); js/registros.js eliminar() |
| `punto_origen` | `gps` · `mapa` · `manual` · `ajustado` | js/mapa.js ORIGENES |
| `especie_estatus` | `VALIDADA` · `PENDIENTE_VALIDACION` | js/formulario.js valores() (D68) |
| `perfil` | `CABO` · `COORDINADOR` · `ADMIN` | js/permisos.js SRP.PERFILES (Consulta/VIEWER retirado en D87) |
| `tipo_catalogo` | `programa` · `area` · `especie` | js/catalogos.js ETIQUETA |
| `tipo_distribucion` | `Nativa` · `Endémica` · `Exótica` · `Exótica-Invasora` | SNIB/CONABIO (EncicloVida); lista en index.html #cat-distribucion |
| `accion_bitacora` | `CREADO` · `EDITADO` · `ELIMINADO` · `RESTAURADO` · `ACTIVADO` · `DESACTIVADO` · `FOLIO_ASIGNADO` | llamadas a SRP.bitacora.entrada() en formulario, registros, catalogos, usuarios, reportes y folio (servidor simulado, D110) |
| `entidad_bitacora` | `plantacion` · `usuario` · `catalogo` · `jornada` | ídem |
| `alcaldia_cve` | 16 claves `cvegeo` INEGI (09002…09017) | assets/capa-alcaldias.js (SIA con base en INEGI, versión sia-2026-01-01; DEFINITIVA) |
| `uga` | 1,624 claves `AAA-000` de la malla hexagonal | assets/capa-uga.js (SIA, versión sia-2026-09-22; definitiva, con 8 celdas de prefijo distinto a su alcaldía) |
| `colonia_cve` | Claves `CVEUT` del IECM 2022 (p. ej. `15-040`) | assets/capa-colonias.js (IECM 2022, versión iecm-2022-prueba; de prueba) |
| `id_especie` | `ESP-0000`, consecutivo del SIA; hoy ESP-0001…ESP-0076 y las altas continúan en ESP-0077 | assets/catalogo-especies.js (CGO_ESPECIES_REFORESTACION_URBANA, 22-09-2026) |

## 4. Tablas

### 4.1 `plantaciones`

Un renglón por ejemplar plantado. Es el registro individual de campo; todo lo demás (partes, tableros, cifra pública) se construye encima (D38).

- **Llave:** `id`. **Índices:** `cabo_id`, `fecha_plantacion`, `estatus`. **Pantalla:** Nuevo registro (alta y edición), Registros (lista, detalle), Reportes (parte del día).
- **Campos:** 35.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID v4 | Ficha de revisión y aviso de guardado («Identificador») | Se fija al abrir la ficha de revisión y es el que se guarda (idPrevisto); no cambia al editar. En Fase 2 es la clave de idempotencia del envío (R4) |
| `estatus` | text | No | Sistema | dominio `estatus_plantacion` | No (los eliminados no se listan) | Nace `activo`; «Eliminar» lo marca `eliminado`, nunca borra (D11, Norma 7.4). Un registro eliminado sigue contando en el uso de catálogos y cuentas |
| `es_ficticio` | boolean | No | Sistema | true/false | No | Copia de CONFIG.ES_FICTICIO al guardar. Permite depurar los datos de prueba antes de liberar |
| `cabo_id` | uuid | No | Sesión | → usuarios.id | No como campo; el encabezado dice quién tiene la sesión y la ficha lo repite («Cabo») | Quien captura. Al editar se conserva: el autor no cambia de manos aunque corrija un coordinador o la administración |
| `lat` | numeric(9,6) | No | Persona | Grados decimales WGS84, 6 decimales, dentro de CONFIG.MAPA.LIMITES | Coordenadas (sólo lectura) | Del botón de ubicación, de tocar el mapa o de la captura a mano; se cambia moviendo el punto, no tecleando. Fuera del ámbito de la CDMX el punto se rechaza |
| `lng` | numeric(9,6) | No | Persona | Ídem | Coordenadas (sólo lectura) | Ídem. Al guardar en GeoJSON el orden es [lng, lat] |
| `punto_origen` | text | No | Sistema | dominio `punto_origen` | «Cómo se obtuvo» (sólo lectura) | Lo determina la acción con la que se colocó el punto, no una elección. Es la prueba de cómo se obtuvo la coordenada cuando no hay fotografía |
| `gps_precision_m` | integer | Sí | Sistema | Metros, entero; null salvo con GPS | «Cómo se obtuvo» (±N m) | Existe si y sólo si punto_origen = gps: al mover el punto a mano se borra. La auditoría lo comprueba. En Fase 2 alimenta la regla de duplicados (D69) |
| `lat_original` | numeric(9,6) | No | Sistema | Como lat | No | Dónde quedó el punto la primera vez; no cambia al editar ni al arrastrar |
| `lng_original` | numeric(9,6) | No | Sistema | Como lng | No | Ídem |
| `folio` | char(13) | Sí | Servidor | `AAA-000-00000` (SRP.folio.PATRON): celda UGA y consecutivo de la celda; UNIQUE | «Folio»: PROVISIONAL mientras sea nulo (R1) | Nulo en toda la Fase 1. Lo asigna el servidor una sola vez al sincronizar (R3), es inmutable (R7) y no lleva la especie ni el año (D67). El consecutivo sale de una secuencia perpetua por celda, nunca de MAX+1 (R5–R6). Condiciones para emitirlo en DECISIONES, pendientes |
| `folio_uga` | char(7) | Sí | Servidor | uga o `EXT-000` | No | La celda que quedó dentro del folio, congelada al asignarlo (R8). Distinta de `uga`, que es la vigente |
| `folio_capa_version` | text | Sí | Servidor | Como capa_version | No | Versión de las capas con que se derivó el folio; congelada (R8) |
| `folio_lat` | numeric(9,6) | Sí | Servidor | Como lat | No | Coordenada empleada al asignar el folio; congelada (R8) |
| `folio_lng` | numeric(9,6) | Sí | Servidor | Como lng | No | Ídem |
| `especie_id` | char(8) | Sí | Catálogo | → catalogos.id con tipo = especie (id_especie ESP-0000) | Especie (autocompletado por nombre común, científico y otros nombres) | Obligatoria salvo con «Otra especie», donde queda nula. El registro guarda sólo la clave; género, epíteto, distribución, forma de crecimiento, id_snib e id_enciclovida se obtienen del catálogo (D84) |
| `especie_otra` | text | No | Persona | Texto libre; '' salvo con «Otra especie» | Especifique la especie (aparece sólo al elegir «Otra especie») | Obligatoria cuando especie_id es nula. Se vacía al elegir una especie del catálogo |
| `especie_estatus` | text | No | Sistema | dominio `especie_estatus` | No | VALIDADA con especie del catálogo; PENDIENTE_VALIDACION con «Otra especie» hasta que el SIA la resuelva desde la bandeja (Fase 2). Al resolverse cambia este atributo, nunca el folio (D68) |
| `alcaldia_cve` | char(5) | Sí | Capa | dominio `alcaldia_cve` | No | Derivada del punto contra la capa de alcaldías. Llave para unir con el esquema territorio del SIA. Nula si el punto cae en un hueco de la capa (se avisa, no se impide guardar) |
| `alcaldia` | text | Sí | Capa | Nombre de la alcaldía según la capa | Alcaldía (sólo lectura) | Copia del nombre para leerse sin cargar la capa. Se rederiva cada vez que el punto se mueve; se puede rederivar en lote si la capa cambia (capa_version) |
| `colonia_cve` | text | Sí | Capa | dominio `colonia_cve` | No | Nula fuera de la zona urbana (suelo de conservación): no es defecto (D62). En solape gana la colonia más pequeña |
| `colonia` | text | Sí | Capa | Nombre como viene en la capa, mayúsculas y tipo entre paréntesis | Colonia (sólo lectura): «Sin colonia (fuera de zona urbana)» si es nula | Capa de prueba (IECM 2022): se sustituye antes de liberar la etapa |
| `uga` | char(7) | Sí | Capa | dominio `uga` | No | Celda vigente del punto. El prefijo NO es la alcaldía del punto (difieren en la frontera); la alcaldía sale de su propia capa. Cambia si el punto se corrige; folio_uga no |
| `capa_version` | text | Sí | Capa | `alcaldias=v;uga=v;colonias=v` | No | Con qué versión de cada capa se derivó; permite rehacer alcaldia/colonia/uga cuando el SIA entregue las capas definitivas |
| `programa_id` | text | No | Catálogo | → catalogos.id con tipo = programa | Programa (lista; Reforestación Urbana primero) | Obligatorio; sin preselección |
| `fecha_plantacion` | date | No | Jornada | AAAA-MM-DD, ≤ hoy | Fecha de plantación (se muestra 21-SEP-2026) | Se hereda de la jornada activa al registrar (D119); «Mover a otra jornada» la ajusta. No posterior a hoy |
| `jornada_id` | uuid | No | Sistema | → jornadas.id | Jornada (ficha de revisión y detalle) | La jornada activa al registrar (D119). Cambia sólo con «Mover a otra jornada» en Jornadas, que también ajusta fecha_plantacion |
| `comentarios` | varchar(500) | No | Persona | Texto libre ≤ 500; '' si no se escribe | Comentarios (opcional) | Reincorporado en D50. Todavía no entra al parte PDF (pendiente de validación de reportes). Registros anteriores a D50 no traen la llave y se leen como «Sin comentarios» |
| `foto_base64` | text | Sí | Persona | data:image/jpeg;base64,… ya comprimida (≤ 800×600, calidad 0.7) | Fotografía (opcional) | Incrustada en el registro en Fase 1. En Fase 2 sale a archivo, como en los otros módulos del SIA (pendiente «Dónde viven las fotografías») |
| `foto_id` | uuid | Sí | Sistema | UUID v4; null sin foto | No | Identificador de la imagen, para cuando viva como archivo |
| `foto_nombre` | text | No | Persona | Nombre del archivo elegido; '' sin foto | Ficha de la foto | — |
| `foto_bytes` | integer | No | Sistema | Bytes de la imagen ya comprimida; 0 sin foto | Ficha de la foto (peso) | No es el peso del archivo original |
| `fecha_registro` | timestamptz | No | Sistema | ISO 8601 con zona (-06:00) | Detalle | Cuándo se guardó por primera vez. Distinta de fecha_plantacion |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | Detalle e historial | Nula hasta la primera edición; también se pone al eliminar |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | Historial | Quién hizo la última edición (o la eliminación) |

### 4.2 `usuarios`

Cuentas del sistema. Una por persona; el perfil decide qué puede hacer (js/permisos.js, fuente única).

- **Llave:** `id`. **Índices:** ninguno. **Pantalla:** Usuarios (sólo Administración global); Acceso.
- **Campos:** 15.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID v4 (las de arranque: u-admin-1, u-coord-1, u-cabo-1) | No | — |
| `correo` | text | No | Persona | Correo válido, en minúsculas, único | Correo | Identifica la cuenta y sirve para entrar; no se puede cambiar después. No tiene que ser institucional |
| `nombre` | text | No | Persona | Texto | Nombre(s) | — |
| `apellido_paterno` | text | No | Persona | Texto | Apellido paterno | — |
| `apellido_materno` | text | No | Persona | Texto; '' si no tiene | Apellido materno (opcional) | Opcional a propósito: hay personas que no lo tienen (pendiente: confirmar) |
| `area_id` | text | No | Catálogo | → catalogos.id con tipo = area | Área | — |
| `cargo_rol` | text | No | Persona | Texto libre | Cargo y rol | Descriptivo; no gobierna permisos |
| `perfil` | text | No | Persona | dominio `perfil` | Perfil | Decide alcance y acciones. Una cuenta de administración no puede quitarse a sí misma el perfil ADMIN. Un perfil desconocido queda sin permisos y se avisa (D87) |
| `coordinador_id` | uuid | Sí | Persona | → usuarios.id con perfil COORDINADOR | Coordinador (sólo con perfil Cabo) | Se pone nulo si el perfil no es CABO. Es lo que define la cuadrilla: el coordinador ve y edita los registros de los cabos que lo tienen asignado |
| `activo` | boolean | No | Persona | true/false | Estado | Inactiva no puede entrar; sus registros se conservan a su nombre. Con registros a su nombre no se elimina, se desactiva |
| `es_ficticio` | boolean | No | Sistema | true/false | No | — |
| `fecha_alta` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `alta_por_id` | uuid | No | Sesión | → usuarios.id | No | Quién dio de alta la cuenta |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |

### 4.3 `catalogos`

Los tres catálogos administrables en una sola tabla, distinguidos por `tipo`: programas, áreas y especies. Las especies son el catálogo real del SIA (D84) y llevan campos adicionales.

- **Llave:** `id`. **Índices:** `tipo`. **Pantalla:** Catálogos (sólo Administración global); alimentan Nuevo registro (especie, programa) y Usuarios (área).
- **Campos:** 19.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | text | No | Sistema | UUID v4 en programas y áreas (los de arranque: p-refor, p-centro, a-div, a-sia); en especies es la propia clave ESP-0000 | No | Es lo que guardan plantaciones.especie_id, plantaciones.programa_id y usuarios.area_id |
| `tipo` | text | No | Sistema | dominio `tipo_catalogo` | Pestaña | Lo fija la pestaña en la que se está |
| `clave` | text | No | Persona | Programas y áreas: `[A-Z0-9_]{2,30}`, única por tipo. Especies: id_especie | Clave | Programas y áreas: se sugiere del nombre, editable antes de guardar, fija después. Especies: consecutivo ESP-0000 que asigna el sistema; nunca se escribe ni se reutiliza |
| `nombre` | text | No | Persona | Texto, único por tipo | Nombre / Nombre común | En especies es el nombre_comun del catálogo del SIA: la etiqueta de campo |
| `activo` | boolean | No | Persona | true/false | Estado | Inactivo deja de ofrecerse; los registros que ya lo usan no cambian. Con uso no se elimina (D08) |
| `es_ficticio` | boolean | No | Sistema | true/false | No | Falso en las 76 especies del catálogo real; verdadero en lo creado en modo de prueba |
| `creado_por_id` | uuid | Sí | Sesión | → usuarios.id; null en las especies del SIA | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601; en las especies del SIA, la fecha de corte | No | — |
| `editado_por_id` | uuid | Sí | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | Sí | Sistema | ISO 8601 | No | — |
| `nombre_cientifico` *(sólo especie)* | varchar(140) | No | Persona | Género + epíteto, sin autoría ni subgénero; único | Nombre científico (y entre paréntesis en Nuevo registro) | Sólo especies. Validado: inicial mayúscula y al menos dos palabras |
| `genero` *(sólo especie)* | varchar(60) | No | Sistema | Una palabra, inicial mayúscula | No | Sólo especies. Primera palabra del nombre científico; se deriva al guardar |
| `especie` *(sólo especie)* | varchar(80) | No | Sistema | Epíteto; admite rango infraespecífico | No | Sólo especies. Lo que sigue al género; se deriva al guardar |
| `otros_nombres_comunes` *(sólo especie)* | varchar(400) | No | Persona | Nombres separados por coma y espacio; '' si no hay | Otros nombres comunes; en Nuevo registro sólo como criterio de búsqueda («también: Fresno») | Sólo especies. Un mismo nombre puede señalar a varias especies: la búsqueda las ofrece todas, nunca resuelve sola |
| `tipo_distribucion` *(sólo especie)* | text | No | Persona | dominio `tipo_distribucion` | Tipo de distribución (Catálogos) | Sólo especies. Campo del SNIB; sustituye a Nativa/Introducida |
| `formadecrecimiento` *(sólo especie)* | varchar(100) | No | Persona | Árbol · Arbusto · Palma · Liana · Hierba · Sufrútice, varios separados por coma y espacio; '' si no hay | Forma de crecimiento (Catálogos) | Sólo especies. Literal de la ficha técnica |
| `id_snib` *(sólo especie)* | varchar(16) | Sí | Persona | Número + ANGIO o GIMNO (IdCAT) | Id SNIB (Catálogos) | Sólo especies. Llave externa al Catálogo Taxonómico de la Biota; puede venir vacía (Quercus rubra) |
| `id_enciclovida` *(sólo especie)* | integer | Sí | Persona | Entero | Id EncicloVida (Catálogos) | Sólo especies. Llave para reconsultar la ficha (enciclovida.mx/especies/{id}.json); más completa que el IdCAT |
| `nota_discrepancia` *(sólo especie)* | varchar(700) | No | SIA | Texto que inicia con CORREGIDO · SIN CAMBIO · SIN REGISTRO · PENDIENTE DE DECISIÓN; '' si no hay | No | Sólo especies. Rastro de auditoría del catálogo; viene del Excel y no se edita en pantalla |

### 4.4 `bitacora`

Quién, cuándo y qué, en cada alta, edición, eliminación, activación y desactivación (Norma 7.7, D10). Sólo se escribe; se lee en el historial del detalle de cada registro.

- **Llave:** `id`. **Índices:** `entidad_id`. **Pantalla:** Historial del detalle de un registro.
- **Campos:** 10.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID v4 | No | — |
| `es_ficticio` | boolean | No | Sistema | true/false | No | Copia de CONFIG.ES_FICTICIO (D87): la depuración de datos de prueba también alcanza a esta tabla |
| `fecha` | timestamptz | No | Sistema | ISO 8601 | Historial | — |
| `usuario_id` | uuid | No | Sesión | → usuarios.id | No | — |
| `usuario_nombre` | text | No | Sesión | Nombre completo | Historial | Copia a propósito: si la cuenta se elimina, el historial sigue diciendo quién actuó |
| `perfil` | text | No | Sesión | dominio `perfil` | Historial | Con qué perfil actuó en ese momento |
| `accion` | text | No | Sistema | dominio `accion_bitacora` | Historial | — |
| `entidad` | text | No | Sistema | dominio `entidad_bitacora` | No | — |
| `entidad_id` | text | No | Sistema | id de la tabla correspondiente | No | Se escribe en la misma transacción que el dato (guardarConBitacora) |
| `detalle` | text | No | Sistema | Texto; '' si no aplica | Historial | En una edición, la lista de campos que cambiaron |

### 4.5 `jornadas`

Una jornada de plantación: se declara antes de registrar el primer árbol (D119). Agrupa los registros, lleva la conciliación y la revisión, y guarda los datos de cierre del reporte (antes en la tabla cierres, retirada en el bloque 62).

- **Llave:** `id`. **Índices:** `cabo_id`, `fecha`, `estatus`. **Pantalla:** Nuevo registro → «Iniciar jornada»; Jornadas; Reportes → «Datos de cierre».
- **Campos:** 31.

| Campo | Tipo | Nulo | Origen | Dominio / formato | Se ve en pantalla | Regla |
|---|---|---|---|---|---|---|
| `id` | uuid | No | Sistema | UUID | No | Se fija al iniciar la jornada |
| `es_ficticio` | boolean | No | Sistema | true/false | No | Copia de CONFIG.ES_FICTICIO (D87) |
| `nombre` | text | No | Persona | Texto libre, hasta 120 | Nombre de la jornada | Obligatorio al iniciar: el parque, la calle o el sitio. Es el nombre de la tarjeta en Jornadas y el «Jornada:» del reporte (D119) |
| `ubicacion` | text | No | Persona | Texto libre, hasta 200; '' si no se escribe | Ubicación de la jornada | Dirección, parque o referencia (D120). Va al reporte bajo el nombre de la jornada |
| `lat` | real | Sí | Dispositivo | Grados decimales; nulo sin detección | Detectar ubicación de la jornada | Latitud de donde se tocó «Detectar ubicación» al iniciar (D122). No es la de ningún árbol |
| `lng` | real | Sí | Dispositivo | Grados decimales; nulo sin detección | Detectar ubicación de la jornada | Longitud de la detección (D122) |
| `gps_precision_m` | integer | Sí | Dispositivo | Metros enteros; nulo sin detección | (nota bajo el botón) | Margen del GPS al detectar (D122) |
| `alcaldia_cve` | text | Sí | Sistema | cvegeo INEGI (09012); nulo sin detección o en hueco | — | Derivada de la capa de alcaldías con el punto detectado (D122) |
| `alcaldia` | text | Sí | Sistema | Nombre de la alcaldía; nulo sin detección | Alcaldía | Va a la franja de la jornada, a Jornadas y al reporte (D122). No sustituye a la alcaldía de cada árbol |
| `colonia_cve` | text | Sí | Sistema | CVEUT IECM; nulo sin detección o fuera de zona urbana | — | Derivada de la capa de colonias con el punto detectado (D122) |
| `colonia` | text | Sí | Sistema | Nombre de la colonia; nulo sin detección | Colonia | Va a la franja, a Jornadas y al reporte (D122) |
| `fecha` | date | No | Persona | AAAA-MM-DD, no posterior a hoy | Fecha de la jornada de plantación | Los árboles la heredan como fecha_plantacion (D119) |
| `comentarios` | text | No | Persona | Texto libre, hasta 500; '' si no se escribe | Comentarios | Van al reporte como «Comentarios de la jornada» (D119) |
| `cabo_id` | uuid | No | Sesión | → usuarios.id | No | Quien inició la jornada; sus árboles quedan a su nombre |
| `estatus` | text | No | Sistema | abierta \| cerrada | Franja de la jornada; Jornadas | Se cierra desde la franja o la revisión; se reabre desde la revisión o con «Registrar faltante» (D119) |
| `fecha_inicio` | timestamptz | No | Sistema | ISO 8601 | No | Ordena las jornadas del día: «Jornada 2 de 3» |
| `fecha_cierre` | timestamptz | Sí | Sistema | ISO 8601 | No | Nulo mientras está abierta |
| `encargado_id` | uuid | Sí | Sesión | → usuarios.id | Encargado | Para un cabo es él mismo (no se pregunta); quien ve a varias personas lo elige sólo entre los cabos con registros ese día (D57) |
| `creado_por_id` | uuid | No | Sesión | → usuarios.id | No | — |
| `fecha_creacion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `editado_por_id` | uuid | No | Sesión | → usuarios.id | No | — |
| `fecha_ultima_edicion` | timestamptz | No | Sistema | ISO 8601 | No | — |
| `arboles_plantados` | integer | Sí | Persona | 0–9999; nulo si la cuadrilla no lo anotó | Jornadas → «Árboles plantados según la cuadrilla» | Conciliación de la jornada (D112): se compara con los registros activos del día y el cabo; el reporte dice si cuadra. Nunca sustituye al conteo de registros |
| `puntos_revisados` | uuid[] | No | Persona | → plantaciones.id; [] si nadie ha revisado | Jornadas → «Está bien» en un punto con aviso | Puntos con aviso (duplicado, lejos, precisión) que alguien confirmó como correctos (D112); el aviso deja de contarse, no se borra |
| `personal` | text | No | Persona | Texto libre | Personal de SEDEMA participante | — |
| `apoyo` | text | No | Persona | Texto libre, varias líneas | Personal de apoyo | — |
| `observaciones` | text | No | Persona | Texto libre | Observaciones | Aquí se explica a mano una diferencia contra la meta |
| `chofer` | text | No | Persona | Texto libre | Chófer | — |
| `vehiculo_modelo` | text | No | Persona | Texto libre | Modelo del vehículo | Un cierre anterior al bloque 20 traía `vehiculo` en un solo campo: se muestra aquí |
| `vehiculo_placa` | text | No | Persona | Texto libre | Placa | — |
| `hora` | time | No | Persona | HH:MM; '' si no se elige | Hora de finalización (selector) | — |

## 5. Relaciones entre tablas

| De | A | Cardinalidad | Regla |
|---|---|---|---|
| plantaciones.cabo_id | usuarios.id | N:1 | Obligatoria. Define el alcance: un cabo ve los suyos; un coordinador, los de los cabos con coordinador_id = él |
| plantaciones.editado_por_id | usuarios.id | N:1 | Opcional |
| plantaciones.especie_id | catalogos.id (tipo especie) | N:1 | Nula sólo con «Otra especie» (entonces especie_otra obligatoria y especie_estatus = PENDIENTE_VALIDACION) |
| plantaciones.programa_id | catalogos.id (tipo programa) | N:1 | Obligatoria |
| plantaciones.alcaldia_cve / colonia_cve / uga | capas del SIA (alcaldías, colonias, UGA) | N:1 | No son llaves foráneas en la base del dispositivo: son derivaciones del punto, con capa_version para rehacerlas |
| usuarios.coordinador_id | usuarios.id | N:1 | Sólo con perfil CABO; apunta a una cuenta COORDINADOR |
| usuarios.area_id | catalogos.id (tipo area) | N:1 | Obligatoria |
| usuarios.alta_por_id / editado_por_id | usuarios.id | N:1 | — |
| catalogos.creado_por_id / editado_por_id | usuarios.id | N:1 | Nulo en las especies que vienen del SIA |
| jornadas.cabo_id / encargado_id / creado_por_id / editado_por_id | usuarios.id | N:1 | cabo_id es quien inició la jornada (D119) |
| plantaciones.jornada_id | jornadas.id | N:1 | Cada árbol nace en la jornada activa y hereda su fecha (D119); «Mover a otra jornada» la cambia |
| bitacora.entidad_id | plantaciones.id / usuarios.id / catalogos.id / jornadas.id según entidad | N:1 | Sin restricción de integridad: la bitácora sobrevive a la eliminación de la entidad |
| bitacora.usuario_id | usuarios.id | N:1 | Sin restricción: conserva usuario_nombre por si la cuenta desaparece |

## 6. Campos que se derivan sin capturarse

Se guardan en la tabla, pero nadie los teclea: salen de otro dato o de la sesión.

| Campo | Se deriva de | Cuándo | Se ve como |
|---|---|---|---|
| plantaciones.alcaldia_cve, alcaldia | lat, lng contra assets/capa-alcaldias.js | Cada vez que el punto se coloca o se mueve (js/derivacion.js derivar); al editar, con el punto vigente | Alcaldía como campo de sólo lectura |
| plantaciones.colonia_cve, colonia | lat, lng contra assets/capa-colonias.js (la más pequeña si hay solape) | Ídem | Colonia como campo de sólo lectura |
| plantaciones.uga | lat, lng contra assets/capa-uga.js | Ídem | No se ve |
| plantaciones.capa_version | meta.version de cada capa cargada | Ídem | No se ve |
| plantaciones.punto_origen, gps_precision_m | La acción con la que se colocó el punto (botón GPS, toque en el mapa, captura a mano, arrastre) | Al colocar el punto | «Cómo se obtuvo» |
| plantaciones.especie_estatus | especie_id nula o no | Al guardar | No se ve |
| plantaciones.lat_original, lng_original | lat, lng del primer guardado | Sólo en el alta | No se ve |
| plantaciones.cabo_id | La sesión | En el alta; se conserva al editar | Encabezado y ficha |
| plantaciones.foto_bytes, foto_id | La imagen comprimida | Al elegir la foto | Ficha de la foto |
| catalogos.genero, especie | nombre_cientifico | Al guardar una especie | No se ven |
| catalogos.clave (especie) | Máximo ESP-0000 en uso + 1 | Al abrir el alta | Clave (sólo lectura) |
| jornadas.encargado_id | La sesión si es cabo; elección entre cabos con registros ese día si no | Al abrir el cierre | Encargado |
| bitacora.usuario_id, usuario_nombre, perfil | La sesión | En cada movimiento | Historial |

## 7. Lo que se calcula y no se guarda

| Qué | A partir de | Dónde se usa |
|---|---|---|
| Nombre común y científico de la especie, nombre del programa, nombre del cabo | Los ids contra catalogos y usuarios (SRP.ref) | Lista, detalle, ficha, PDF |
| Folio en pantalla y PDF (PROVISIONAL mientras folio sea nulo) y etiqueta de campo folio · especie · alcaldía · fecha | SRP.folio.texto / etiqueta | Ficha, lista, PDF |
| Totales del parte: ejemplares, conteo por especie, resumen por programa, alcaldía del sitio | Las plantaciones del día | PDF (Norma 10.2: nunca se capturan) |
| Uso de cada valor de catálogo y de cada cuenta (N registros) | Conteo de plantaciones (incluidos eliminados) | Catálogos y Usuarios; decide si se puede eliminar |
| Cuenta de registros guardados en el dispositivo (alcance de la sesión) | plantaciones activas que alcanza el perfil | Pastilla de conexión, aviso de guardado, Reportes (D83) |
| Alcance y acciones permitidas | perfil contra SRP.PERFILES | Toda la interfaz; en Fase 2 se impone en el servidor |
| `dentro` (el punto cae en alguna alcaldía) | derivar() | Sólo para avisar de un hueco de capa; no se guarda |
| Registros con fotografía y peso acumulado (para la solicitud de disco a ADIP) | plantaciones activas con foto_base64; suma de foto_bytes | Reportes → «Registros en este dispositivo», y resumen del respaldo (D87) |
| El PDF del parte del día | jornada + sus plantaciones; no se guarda el archivo, se regenera | Reportes (D58, D70) |

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
| plantaciones.foto_base64, foto_id, foto_nombre, foto_bytes | Al elegir una foto | Al quitarla (null, null, '', 0) |
| usuarios.coordinador_id | Sólo con perfil CABO | Al cambiar a otro perfil (null) |
| catalogos.nombre_cientifico … nota_discrepancia | Sólo en tipo = especie | No existen en programas ni áreas |

## 10. Reglas y validaciones vigentes (Fase 1, en el dispositivo)

| Id | Tabla | Regla | Dónde vive |
|---|---|---|---|
| R-P01 | plantaciones | Ubicación obligatoria (botón GPS, toque en el mapa o captura a mano) y dentro del ámbito de la CDMX (CONFIG.MAPA.LIMITES) | js/formulario.js validar(); js/mapa.js colocar() |
| R-P02 | plantaciones | Especie obligatoria: de la lista de activas, o «Otra especie» con texto | js/formulario.js validar() |
| R-P03 | plantaciones | Programa obligatorio, sin preselección; sólo programas activos (más el del registro que se edita, aunque esté inactivo) | js/formulario.js llenarProgramas(), validar() |
| R-P04 | plantaciones | Fecha de plantación obligatoria y no posterior a hoy; arranca vacía en cada registro | js/formulario.js validar(); campo-fecha.max |
| R-P05 | plantaciones | Comentarios hasta 500 caracteres | index.html maxlength |
| R-P06 | plantaciones | La foto se comprime a ≤ 800×600 JPEG 0.7 antes de guardarse; foto_bytes es el peso comprimido | js/foto.js comprimir(); CONFIG.FOTO |
| R-P07 | plantaciones | Territorio (alcaldía, colonia, UGA, capa_version) se rederiva con cada movimiento del punto; nunca se teclea. Sin alcaldía se guarda y se avisa; sin colonia es normal fuera de zona urbana | js/formulario.js alMoverPunto(); js/derivacion.js |
| R-P08 | plantaciones | gps_precision_m existe si y sólo si punto_origen = gps | js/mapa.js colocar(); pruebas/auditoria.py |
| R-P09 | plantaciones | El formulario arranca en blanco en cada registro: nada se hereda del anterior (ni programa, ni fecha, ni punto) | js/formulario.js limpiar(), nuevoRegistro() |
| R-P10 | plantaciones | Al editar se conservan id, cabo_id, lat_original/lng_original, fecha_registro y los folio*; se actualizan fecha_ultima_edicion y editado_por_id, y la bitácora lista los campos cambiados | js/formulario.js registroPrevisto(), guardar() |
| R-P11 | plantaciones | Eliminar marca estatus = eliminado (con bitácora); nunca se borra el renglón | js/registros.js eliminar() |
| R-P12 | plantaciones | Folio y campos folio_* nacen nulos y no se tocan en el dispositivo; la pantalla y el PDF dicen PROVISIONAL | js/folio.js; js/formulario.js registroPrevisto() |
| R-A01 | todas | Alcance por perfil: CABO ve/edita/elimina los suyos; COORDINADOR registra, ve y edita los de sus cabos, no elimina; ADMIN todo, no captura. Un perfil desconocido no alcanza nada | js/permisos.js (fuente única); la interfaz sólo lo refleja |
| R-A02 | todas | Toda alta, edición, eliminación, activación y desactivación escribe bitácora en la misma transacción | js/almacen.js guardarConBitacora(), borrarConBitacora() |
| R-U01 | usuarios | Nombre, apellido paterno, correo válido y único (insensible a mayúsculas/acentos), área, cargo y perfil válido obligatorios; el correo no cambia después | js/usuarios.js validar() |
| R-U02 | usuarios | coordinador_id sólo con perfil CABO; con otro perfil se pone nulo | js/usuarios.js guardar() |
| R-U03 | usuarios | Una cuenta de administración no puede quitarse a sí misma el perfil ADMIN | js/usuarios.js validar() |
| R-U04 | usuarios | Con registros a su nombre no se elimina: se desactiva. Inactiva no puede entrar; sus registros siguen a su nombre | js/usuarios.js eliminar(), cambiarEstado(); js/sesion.js autenticar() |
| R-C01 | catalogos | Nombre obligatorio y único por tipo; clave `[A-Z0-9_]{2,30}` única por tipo (programas y áreas), fija después de guardar | js/catalogos.js validar() |
| R-C02 | catalogos | Especies: científico obligatorio con formato «Genus epíteto» y único; clave ESP-0000 consecutiva que asigna el sistema; id = clave; género y epíteto derivados; id_snib `número+ANGIO\|GIMNO`; id_enciclovida entero | js/catalogos.js validar(), guardar(), siguienteClaveEspecie() |
| R-C03 | catalogos | Con uso (registros o cuentas) no se elimina: se desactiva. Inactivo deja de ofrecerse; lo ya guardado no cambia | js/catalogos.js eliminar(), cambiarEstado() |
| R-C04 | catalogos | Las 76 especies del SIA se siembran desde assets/catalogo-especies.js (generado del Excel); para cambiarlas se corrige el Excel y se regenera | pruebas/generar_especies.py; js/datos-ficticios.js |
| R-R01 | jornadas | El reporte es de una jornada declarada: reúne las plantaciones activas con ese jornada_id; regenerar la misma jornada reabre sus datos de cierre (D119) | js/reportes.js refrescarVista(), abrir(), cierreDeJornada() |
| R-R02 | jornadas | Todos los campos del cierre son opcionales y ninguno se prellena; el encargado sale de la sesión o se elige entre los cabos con registros ese día | js/reportes.js prepararEncargado() |
| R-F01 | plantaciones | Filtros de Registros: Hoy / Todos / Un periodo (Desde ≤ Hasta, entra con Aplicar), Año y Mes sólo con registros, Cabo según alcance; ningún control mueve el foco solo (D82) | js/registros.js |
| R-D01 | todas | Siembra: al abrir con sello distinto de CONFIG.SELLO_DATOS se restablecen las cinco tablas con los datos de arranque (sólo con ES_FICTICIO) | js/almacen.js sembrarSiVacio(); js/config.js |
| R-D02 | plantaciones, jornadas, bitacora | Respaldo: archivo JSON con las cinco tablas y un resumen de fotografías; restaurar sólo agrega lo que no existe (por id), nunca sobreescribe | js/conexion.js respaldar(), restaurar() |

## 11. Reglas que esperan al servidor (Fase 2)

| Id | Qué | Detalle | Referencia |
|---|---|---|---|
| S-01 | Cola de envío | Cada registro guardado queda en cola (guardado → enviado → con error); envío automático en segundo plano con señal, «Enviar ahora», y nada se borra del dispositivo hasta que el servidor confirme. Requiere dos campos nuevos en plantaciones: identificador del servidor y marca de envío (retirados en D17 por no tener uso todavía) | DECISIONES, pendiente «Cola de envío al servidor»; D83 |
| S-02 | Emisión del folio | Tabla de secuencias por celda UGA, perpetua y monotónica (sin reinicio por ejercicio, administración ni versión); lectura e incremento atómicos, nunca MAX(folio)+1 ni COUNT+1; asignación en transacción con plantaciones.id como clave de idempotencia (R3–R6); se congelan folio_uga, folio_capa_version, folio_lat, folio_lng (R8). Sólo con la malla UGA corregida, versionada y congelada | D67; js/folio.js; pendiente «Emisión del folio» |
| S-03 | Integridad referencial y unicidad en la base | FK de todas las relaciones de arriba; UNIQUE en plantaciones.folio, usuarios.correo, catalogos (tipo, clave), catalogos (tipo, nombre), catalogos.nombre_cientifico; CHECK de los dominios; la bitácora sin FK a propósito | Esta tabla de relaciones |
| S-04 | Permisos en el servidor | Las reglas de js/permisos.js se imponen en la API (Norma 7.1); la pantalla sólo las refleja. Autenticación con el proveedor institucional: sólo cambia autenticar() en js/sesion.js | js/permisos.js; D05 |
| S-05 | Posible duplicado | Aviso al sincronizar cuando otro registro cae a menos de la incertidumbre combinada de ambos puntos (suma de gps_precision_m, piso 5 m), en el servidor; nunca con 5 m fijos | D69 |
| S-06 | Bandeja de especies fuera de catálogo | Donde el SIA resuelve cada PENDIENTE_VALIDACION: alta en el catálogo (siguiente ESP-0000) o reasignación a una existente; al resolverse cambia especie_id y especie_estatus, nunca el folio | D68 |
| S-07 | Fotografías a archivo | foto_base64 sale del renglón y se guarda como archivo referido por foto_id, como en los otros módulos del SIA | Pendiente «Dónde viven las fotografías» |
| S-08 | Rederivación territorial por versión de capa | Al sustituir alcaldías, UGA y colonias por las definitivas, se recalculan alcaldia_cve, alcaldia, colonia_cve, colonia y uga de todo registro cuyo capa_version sea anterior; folio_* no se toca | Pendiente «sustituir las tres capas» |
| S-09 | Depuración de datos de prueba | Antes de liberar: eliminar todo renglón con es_ficticio = true en las cinco tablas (desde D87 jornadas y bitacora también llevan la marca) | CONFIG.ES_FICTICIO |
| S-10 | Restauración por el servidor | El respaldo del dispositivo se entrega al servidor con el mismo esquema; restaurar deja de vivir en las herramientas de prueba | js/conexion.js |

## 12. Capas y catálogos externos que alimentan campos

| Capa | Archivo | Versión | Alimenta | Estado |
|---|---|---|---|---|
| alcaldías | assets/capa-alcaldias.js (fuente assets/fuentes/alcaldias_cdmx.json, con metadato en assets/fuentes/documentacion/) | sia-2026-01-01 | alcaldia_cve, alcaldia | Definitiva: 16 polígonos, sin solapes ni huecos (bloque 38) |
| malla UGA | assets/capa-uga.js (fuente assets/fuentes/UGA_CDMX.geojson) | sia-2026-09-22 | uga (y folio_uga en Fase 2) | Definitiva según el SIA; misma geometría que la anterior. Siguen 8 celdas cuyo prefijo no es la alcaldía de su centro (TLP-040, TLP-085, IZP-005, IZP-011, COY-054, MIH-001, MIH-002, IZC-021): no afecta la alcaldía del registro, que sale de su propia capa |
| colonias | assets/capa-colonias.js (fuente assets/fuentes/colonias_iecm2022.geojson) | iecm-2022-prueba | colonia_cve, colonia | De prueba: cartografía electoral del IECM 2022, no un catálogo del SIA |
| catálogo de especies | assets/catalogo-especies.js (fuente assets/fuentes/CGO_ESPECIES_REFORESTACION_URBANA_2026-09-22.xlsx) | 2026-09-22 | catalogos (tipo especie) | Definitivo (D84) |

## 13. Borrador de tablas para la Fase 2 (PostgreSQL)

Traducción directa del esquema, para no rediseñarlo desde cero. Los tipos son los de la columna «Tipo»; las llaves foráneas, las de la sección 5. Las cinco tablas se crean tal cual y se agregan las dos columnas de la cola de envío (S-01) y la tabla de secuencias del folio (S-02) cuando toque.

```sql
CREATE TABLE plantaciones (
  id                       uuid           NOT NULL,
  estatus                  text           NOT NULL,
  es_ficticio              boolean        NOT NULL,
  cabo_id                  uuid           NOT NULL,
  lat                      numeric(9,6)   NOT NULL,
  lng                      numeric(9,6)   NOT NULL,
  punto_origen             text           NOT NULL,
  gps_precision_m          integer        NULL,
  lat_original             numeric(9,6)   NOT NULL,
  lng_original             numeric(9,6)   NOT NULL,
  folio                    char(13)       NULL,
  folio_uga                char(7)        NULL,
  folio_capa_version       text           NULL,
  folio_lat                numeric(9,6)   NULL,
  folio_lng                numeric(9,6)   NULL,
  especie_id               char(8)        NULL,
  especie_otra             text           NOT NULL,
  especie_estatus          text           NOT NULL,
  alcaldia_cve             char(5)        NULL,
  alcaldia                 text           NULL,
  colonia_cve              text           NULL,
  colonia                  text           NULL,
  uga                      char(7)        NULL,
  capa_version             text           NULL,
  programa_id              text           NOT NULL,
  fecha_plantacion         date           NOT NULL,
  jornada_id               uuid           NOT NULL,
  comentarios              varchar(500)   NOT NULL,
  foto_base64              text           NULL,
  foto_id                  uuid           NULL,
  foto_nombre              text           NOT NULL,
  foto_bytes               integer        NOT NULL,
  fecha_registro           timestamptz    NOT NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  editado_por_id           uuid           NULL,
  PRIMARY KEY (id)
);
CREATE INDEX plantaciones_cabo_id ON plantaciones (cabo_id);
CREATE INDEX plantaciones_fecha_plantacion ON plantaciones (fecha_plantacion);
CREATE INDEX plantaciones_estatus ON plantaciones (estatus);

CREATE TABLE usuarios (
  id                       uuid           NOT NULL,
  correo                   text           NOT NULL,
  nombre                   text           NOT NULL,
  apellido_paterno         text           NOT NULL,
  apellido_materno         text           NOT NULL,
  area_id                  text           NOT NULL,
  cargo_rol                text           NOT NULL,
  perfil                   text           NOT NULL,
  coordinador_id           uuid           NULL,
  activo                   boolean        NOT NULL,
  es_ficticio              boolean        NOT NULL,
  fecha_alta               timestamptz    NOT NULL,
  alta_por_id              uuid           NOT NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  editado_por_id           uuid           NULL,
  PRIMARY KEY (id)
);

CREATE TABLE catalogos (
  id                       text           NOT NULL,
  tipo                     text           NOT NULL,
  clave                    text           NOT NULL,
  nombre                   text           NOT NULL,
  activo                   boolean        NOT NULL,
  es_ficticio              boolean        NOT NULL,
  creado_por_id            uuid           NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NULL,
  fecha_ultima_edicion     timestamptz    NULL,
  nombre_cientifico        varchar(140)   NOT NULL,
  genero                   varchar(60)    NOT NULL,
  especie                  varchar(80)    NOT NULL,
  otros_nombres_comunes    varchar(400)   NOT NULL,
  tipo_distribucion        text           NOT NULL,
  formadecrecimiento       varchar(100)   NOT NULL,
  id_snib                  varchar(16)    NULL,
  id_enciclovida           integer        NULL,
  nota_discrepancia        varchar(700)   NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX catalogos_tipo ON catalogos (tipo);

CREATE TABLE bitacora (
  id                       uuid           NOT NULL,
  es_ficticio              boolean        NOT NULL,
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
  es_ficticio              boolean        NOT NULL,
  nombre                   text           NOT NULL,
  ubicacion                text           NOT NULL,
  lat                      real           NULL,
  lng                      real           NULL,
  gps_precision_m          integer        NULL,
  alcaldia_cve             text           NULL,
  alcaldia                 text           NULL,
  colonia_cve              text           NULL,
  colonia                  text           NULL,
  fecha                    date           NOT NULL,
  comentarios              text           NOT NULL,
  cabo_id                  uuid           NOT NULL,
  estatus                  text           NOT NULL,
  fecha_inicio             timestamptz    NOT NULL,
  fecha_cierre             timestamptz    NULL,
  encargado_id             uuid           NULL,
  creado_por_id            uuid           NOT NULL,
  fecha_creacion           timestamptz    NOT NULL,
  editado_por_id           uuid           NOT NULL,
  fecha_ultima_edicion     timestamptz    NOT NULL,
  arboles_plantados        integer        NULL,
  puntos_revisados         uuid[]         NOT NULL,
  personal                 text           NOT NULL,
  apoyo                    text           NOT NULL,
  observaciones            text           NOT NULL,
  chofer                   text           NOT NULL,
  vehiculo_modelo          text           NOT NULL,
  vehiculo_placa           text           NOT NULL,
  hora                     time           NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX jornadas_cabo_id ON jornadas (cabo_id);
CREATE INDEX jornadas_fecha ON jornadas (fecha);
CREATE INDEX jornadas_estatus ON jornadas (estatus);

```

