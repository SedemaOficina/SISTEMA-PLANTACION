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
| **Capa geográfica** | Se deriva del punto contra las capas del SIA (`assets/fuentes/`, compactadas por `pruebas/generar_capas.py`); nadie lo teclea |
| **Sistema** | Lo pone el sistema: identificadores, fechas de registro, marcas de edición |
| **Sesión** | Se toma de quien tiene la sesión abierta |

---

## Módulo: Registro de plantación

Pantalla **Nuevo registro**. Almacén `plantaciones`.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| Identificador | `id` | Sí | Sistema | UUID. Se fija al abrir la ficha de revisión y es el que se guarda. No se edita. [pendiente] En Fase 2 convivirá con un folio legible |
| — | `estatus` | Sí | Sistema | `activo` o `eliminado`. Eliminar marca, no borra |
| — | `es_ficticio` | Sí | Sistema | Verdadero mientras `ES_FICTICIO` lo esté |
| — (el encabezado dice quién tiene la sesión) | `cabo_id` | Sí | Sesión | Remite a `usuarios.id`. No es un campo del formulario: se toma de la sesión. Al editar conserva al cabo que capturó, no a quien corrige |
| Coordenadas (latitud, longitud) | `lat` | Sí | Persona | Del botón de ubicación, de tocar el mapa o de la captura manual. Campo de sólo lectura: se cambia moviendo el punto |
| Coordenadas (latitud, longitud) | `lng` | Sí | Persona | Ídem. Los dos se muestran juntos en un solo campo |
| Cómo se obtuvo el punto | `punto_origen` | Sí | Sistema | `gps`, `mapa`, `manual` o `ajustado`. Lo determina la acción con que se colocó el punto, no una elección de quien captura. Campo de sólo lectura |
| Cómo se obtuvo el punto | `gps_precision_m` | No | Sistema | Margen de error en metros que reporta el aparato. **Existe si y sólo si `punto_origen` es `gps`**: al mover el punto a mano el margen deja de describirlo y se borra, para que nunca pueda leerse como la precisión de una coordenada señalada con el dedo. La auditoría comprueba esta regla |
| — | `lat_original`, `lng_original` | Sí | Sistema | Dónde quedó el punto la primera vez, antes de cualquier arrastre |
| Folio | `folio` | No | Servidor | `AAA-000-00000` (13 caracteres): celda UGA y consecutivo perpetuo de la celda (D67). Único en la base. **Nulo en toda la Etapa 1**: lo asigna el servidor una sola vez al sincronizar (R3), y la pantalla muestra PROVISIONAL (R1). Inmutable (R7). Nomenclatura en D67; condiciones para emitirlo en pendientes |
| — | `folio_uga` | No | Servidor | La celda que quedó dentro del folio, congelada al asignarlo (R8). Distinta de `uga`, que es la vigente y sí cambia si el punto se corrige |
| — | `folio_capa_version` | No | Servidor | Versión de las capas con que se derivó el folio; congelada (R8) |
| — | `folio_lat`, `folio_lng` | No | Servidor | Coordenada empleada al asignar el folio; congelada (R8) |
| — | `jornada_id` | Sí | Sistema | La jornada activa al registrar (D119); cambia con «Mover a otra jornada» en **Jornadas** |
| — | `especie_estatus` | Sí | Sistema | `VALIDADA` si la especie es del catálogo; `PENDIENTE_VALIDACION` con «Otra especie» (D68). Lo resuelve el SIA desde la bandeja de especies fuera de catálogo (Fase 2); al resolverse cambia el atributo, nunca el folio |
| — | `alcaldia_cve` | No | Capa geográfica | Clave INEGI `cvegeo` de la alcaldía (p. ej. `09015`). Es la llave para unir con el esquema `territorio` del SIA; el nombre se guarda aparte para leerse sin cargar la capa |
| Alcaldía | `alcaldia` | No | Capa geográfica | Nombre, del punto contra la capa `alcaldias` del SIA (16 polígonos). Campo de sólo lectura. Nulo sólo si el punto cayera en un hueco de la capa: se guarda igual y se avisa |
| — | `colonia_cve` | No | Capa geográfica | Clave `CVEUT` de la unidad territorial del IECM (p. ej. `15-040`); llave para unir con la capa. Nulo fuera de la zona urbana |
| Colonia | `colonia` | No | Capa geográfica | Nombre como viene en la capa: mayúsculas y tipo entre paréntesis, `SAN MIGUEL (BARR)` (D62). Nulo en suelo de conservación, y la pantalla dice «Sin colonia (fuera de zona urbana)». **Capa de prueba (IECM 2022)**: se sustituye antes de liberar la etapa. [pendiente] Confirmar con el SIA si la unidad oficial es colonia o unidad territorial |
| — | `uga` | No | Capa geográfica | Clave del hexágono de la malla UGA del SIA (~1 km², 1,624 celdas), p. ej. `TLP-318`. **El prefijo no es la alcaldía del punto**: es la alcaldía a la que se asignó la celda, y en la frontera difieren. La alcaldía sale de su propia capa |
| — | `capa_version` | No | Sistema | Versión de cada capa con la que se derivó, p. ej. `alcaldias=sia-2026-01-01;uga=sia-2026-09-22;colonias=iecm-2022-prueba`. Permite rehacer el dato cuando una capa cambie |
| Especie | `especie_id` | Sí | Catálogo | Remite a `catalogos.id` con `tipo = especie`: la clave `ESP-0000` del catálogo del SIA (D84). Vacío cuando se eligió «Otra especie». En pantalla se elige por nombre común, científico o cualquiera de los otros nombres comunes; sólo viaja la clave |
| Especifique la especie | `especie_otra` | Sólo con «Otra especie» | Persona | Texto libre, para lo que no está en el catálogo |
| Programa | `programa_id` | Sí | Catálogo | Remite a `catalogos.id` con `tipo = programa` |
| Fecha de plantación | `fecha_plantacion` | Sí | Jornada | `AAAA-MM-DD`. Desde el bloque 62 se hereda de la jornada activa (D119): ya no se pide por árbol. Se muestra como 21-SEP-2026 |
| Comentarios | `comentarios` | No | Persona | Texto libre, hasta 500 caracteres: observaciones del sitio o del ejemplar. Cadena vacía si no se escribe nada; los registros anteriores a su reincorporación (D50) no traen la llave y se leen como «Sin comentarios» |
| Fotografía | `foto_base64` | No | Persona | La imagen ya comprimida, incrustada. [pendiente] En Fase 2 sale del registro y se guarda como archivo, siguiendo la práctica que el SIA ya usa en sus otros módulos |
| — | `foto_id` | No | Sistema | UUID de la fotografía |
| — | `foto_nombre` | No | Persona | Nombre del archivo que se eligió |
| — | `foto_bytes` | No | Sistema | Peso de la imagen **ya comprimida**, no del archivo original |
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
género (`genero`), el epíteto (`especie`), el tipo de distribución (`tipo_distribucion`), la forma
de crecimiento (`formadecrecimiento`) y las llaves externas de CONABIO (`id_snib`,
`id_enciclovida`). No se duplican en el registro a propósito: si el SIA corrige un dato del
catálogo, queda corregido para todas las plantaciones (D84).

---

## Módulo: Cuentas de usuario

Pantalla **Usuarios**, sólo Administración global. Almacén `usuarios`.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| — | `id` | Sí | Sistema | UUID |
| Correo | `correo` | Sí | Persona | Identifica la cuenta y sirve para entrar. Único. No se puede cambiar después |
| Nombre(s) | `nombre` | Sí | Persona | |
| Apellido paterno | `apellido_paterno` | Sí | Persona | |
| Apellido materno | `apellido_materno` | No | Persona | Opcional a propósito: hay personas que no lo tienen |
| Área | `area_id` | Sí | Catálogo | Remite a `catalogos.id` con `tipo = area` |
| Cargo y rol | `cargo_rol` | Sí | Persona | Texto libre; descriptivo, no gobierna permisos |
| Perfil | `perfil` | Sí | Persona | `CABO`, `COORDINADOR` o `ADMIN`. Es lo que decide qué puede hacer. Consulta (`VIEWER`) se retiró en D87 |
| Coordinador | `coordinador_id` | Sólo para perfil CABO | Persona | Remite a `usuarios.id`. Quien lo tiene asignado ve sus registros |
| Estado | `activo` | Sí | Persona | Una cuenta inactiva no puede entrar; sus registros se conservan |
| — | `es_ficticio` | Sí | Sistema | |
| — | `fecha_alta`, `alta_por_id` | Sí | Sistema | Cuándo y quién dio de alta la cuenta |
| — | `fecha_ultima_edicion`, `editado_por_id` | No | Sistema | |

---

## Módulo: Catálogos

Pantalla **Catálogos**, sólo Administración global. Almacén `catalogos`. Los tres catálogos
comparten estructura; las especies añaden los campos del catálogo del SIA.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| — | `id` | Sí | Sistema | UUID en programas y áreas. **En especies es la propia clave `ESP-0000`** (D84) |
| — | `tipo` | Sí | Sistema | `programa`, `area` o `especie`. Lo fija la pestaña en la que se está |
| Clave | `clave` | Sí | Persona / Sistema | Programas y áreas: se sugiere a partir del nombre, en mayúsculas y sin acentos; editable antes de guardar, fija después. **Especies: consecutivo `ESP-0000` que asigna el sistema** (siguiente al mayor en uso, sin importar el orden alfabético); nunca se escribe ni se reutiliza. Es la llave con la que se unen los datos |
| Nombre / Nombre común | `nombre` | Sí | Persona | Único dentro de su tipo. En especies corresponde al *nombre_comun* del catálogo del SIA: la etiqueta que reconoce el personal en campo |
| Estado | `activo` | Sí | Persona | Un valor inactivo deja de ofrecerse; los registros que ya lo usan no cambian |
| — | `es_ficticio` | Sí | Sistema | **Falso en las 76 especies del catálogo real**; verdadero en lo creado en modo de prueba |
| — | `fecha_creacion`, `creado_por_id` | Sí | Sistema | En las especies del catálogo: fecha de corte del SIA y creador nulo |
| — | `fecha_ultima_edicion`, `editado_por_id` | No | Sistema | |

**Sólo en especies** (catálogo `CGO_ESPECIES_REFORESTACION_URBANA`, 76 especies verificadas
contra EncicloVida/CONABIO el 22-09-2026; se genera con `pruebas/generar_especies.py`, D84):

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Se ve en el formulario de registro | Notas |
|---|---|---|---|---|---|
| Nombre científico | `nombre_cientifico` | Sí | Persona | Sí, entre paréntesis | Género + epíteto, sin autoría ni subgénero: «Quercus rugosa». Único |
| — | `genero` | Sí | Sistema | No | Primera palabra del nombre científico; se deriva al guardar |
| — | `especie` | Sí | Sistema | No | Epíteto (lo que sigue al género; admite rango infraespecífico). Se deriva al guardar |
| Tipo de distribución | `tipo_distribucion` | Sí | Persona | No | `Endémica` · `Nativa` · `Exótica` · `Exótica-Invasora`, campo del SNIB. Sustituye a Nativa/Introducida |
| Otros nombres comunes | `otros_nombres_comunes` | No | Persona | Sólo como criterio de búsqueda | Separados por coma y espacio, hasta cinco. **Se buscan** en el formulario de registro y en Catálogos; la lista dice por cuál coincidió («también: Fresno»). Un mismo nombre puede señalar a varias especies, así que nunca resuelve solo |
| Forma de crecimiento | `formadecrecimiento` | No | Persona | No | Literal de la ficha técnica: `Árbol, Arbusto`… Puede traer varios |
| Id SNIB (IdCAT) | `id_snib` | No | Persona | No | Número + `ANGIO` o `GIMNO`. Llave externa al SNIB; puede venir vacío (Quercus rubra) |
| Id EncicloVida | `id_enciclovida` | No | Persona | No | Entero. Llave para reconsultar la ficha por API y enlazarla; más completa que el IdCAT |
| — | `nota_discrepancia` | No | SIA | No | Rastro de auditoría del catálogo (CORREGIDO · SIN CAMBIO · SIN REGISTRO). Viene del Excel; no se edita en pantalla |

**Uso:** el catálogo de **especies** y el de **programas** alimentan el formulario de registro; el
de **áreas** alimenta el alta de cuentas. Ninguno se elimina si tiene uso: se desactiva.

---

## Módulo: Bitácora

No tiene pantalla propia: se escribe sola y se lee en el historial del detalle de cada registro.
Almacén `bitacora`. No se edita desde el sistema.

| Campo | Obligatorio | Origen | Notas |
|---|---|---|---|
| `id` | Sí | Sistema | UUID |
| `es_ficticio` | Sí | Sistema | Marca de dato de prueba (D87) |
| `fecha` | Sí | Sistema | Momento del movimiento |
| `usuario_id` | Sí | Sesión | Remite a `usuarios.id` |
| `usuario_nombre` | Sí | Sesión | Copia del nombre **a propósito**: si la cuenta se elimina, el historial debe seguir diciendo quién actuó |
| `perfil` | Sí | Sesión | Con qué perfil actuó en ese momento |
| `accion` | Sí | Sistema | `CREADO`, `EDITADO`, `ELIMINADO`, `ACTIVADO` o `DESACTIVADO` |
| `entidad` | Sí | Sistema | `plantacion`, `usuario`, `catalogo` o `jornada` |
| `entidad_id` | Sí | Sistema | A qué registro se refiere |
| `detalle` | No | Sistema | Qué cambió; en una edición, la lista de campos |

---

## Módulo: Jornada (inicio, revisión y cierre del reporte)

La jornada se declara en **Nuevo registro → «Iniciar jornada»** antes del primer árbol (D119);
se revisa en **Jornadas** y sus datos de cierre se capturan en **Reportes → «Datos de cierre»**.
Almacén `jornadas` (sustituye a `cierres` desde el bloque 62). Lo que ya vive en los registros
—especies, conteos, alcaldía— no se pregunta, se calcula (D58).

| Campo | Obligatorio | Origen | Notas |
|---|---|---|---|
| `id` | Sí | Sistema | UUID; los árboles lo llevan en `plantaciones.jornada_id` |
| `es_ficticio` | Sí | Sistema | Marca de dato de prueba (D87) |
| `nombre` | Sí | Persona | Nombre de la jornada: el parque, la calle o el sitio. Es el nombre de la tarjeta en Jornadas y el «Jornada:» del reporte |
| `ubicacion` | No | Persona | Dirección, parque o referencia (D120); va al reporte bajo el nombre |
| `programa_id` | Sí | Persona | Programa de la jornada (D130); cada árbol lo hereda en el formulario y puede cambiarlo |
| `lat`, `lng`, `gps_precision_m` | No | Dispositivo | Posición del teléfono al tocar «Detectar ubicación de la jornada» (D122); nulos si no se tocó. No es el punto de ningún árbol |
| `alcaldia_cve`, `alcaldia`, `colonia_cve`, `colonia` | No | Sistema | Derivados del punto detectado con las capas de alcaldías y colonias (D122); van a la franja, a Jornadas y al reporte junto a la ubicación escrita |
| `fecha` | Sí | Persona | Fecha de la jornada de plantación, `AAAA-MM-DD`, no posterior a hoy; los árboles la heredan |
| `comentarios` | No | Persona | Se escriben al iniciar; van al reporte como «Comentarios de la jornada» |
| `cabo_id` | Sí | Sesión | Quien inició la jornada |
| `estatus` | Sí | Sistema | `abierta` o `cerrada`; se cierra desde la franja o la revisión, se reabre desde la revisión o con «Registrar faltante» |
| `fecha_inicio` | Sí | Sistema | Ordena las jornadas del día: «Jornada 2 de 3» |
| `fecha_cierre` | No | Sistema | Nulo mientras está abierta |
| `encargado_id` | No | Sesión o Persona | Remite a `usuarios.id`. Para un cabo es él mismo; quien ve a varias personas lo elige entre los cabos con registros en la jornada (D57) |
| `personal` | No | Persona | Nombres, como se acostumbra escribirlos |
| `apoyo` | No | Persona | Personal de otra institución; varias líneas |
| `observaciones` | No | Persona | Una por renglón |
| `chofer` | No | Persona | |
| `vehiculo_modelo` | No | Persona | Sustituye a `vehiculo` (bloque 20) |
| `vehiculo_placa` | No | Persona | |
| `hora` | No | Persona | Hora de finalización, `HH:MM` del selector de hora; el PDF le agrega «h» |
| `meta_arboles` | Sí | Persona | Árboles que se van a plantar, escrito al iniciar la jornada (D131); Jornadas y el reporte comparan contra la meta |
| `puntos_revisados` | Sí | Persona | Puntos con aviso que alguien marcó «Está bien» en **Jornadas**; lista de `plantaciones.id` (D112) |
| `reporte_en` | No | Sistema | Cuándo se generó el reporte de la jornada (D134); nulo si no se ha generado |
| `creado_por_id` | Sí | Sesión | Quién inició la jornada |
| `fecha_creacion` | Sí | Sistema | |
| `editado_por_id` | Sí | Sesión | Quién la cambió por última vez |
| `fecha_ultima_edicion` | Sí | Sistema | |

---

## Campos que se reutilizan entre módulos

| Campo | Se origina en | Se reutiliza en |
|---|---|---|
| `usuarios.id` | Cuentas | `plantaciones.cabo_id`, `plantaciones.editado_por_id`, `usuarios.coordinador_id`, `usuarios.alta_por_id`, `catalogos.creado_por_id`, `bitacora.usuario_id`, `jornadas.encargado_id`, `jornadas.cabo_id` |
| `catalogos.id` (especie, = clave `ESP-0000`) | Catálogo del SIA | `plantaciones.especie_id` |
| `catalogos.id` (programa) | Catálogos | `plantaciones.programa_id` |
| `catalogos.id` (área) | Catálogos | `usuarios.area_id` |
| `activo` | Cuentas y Catálogos | Mismo significado en los dos: deja de ofrecerse o de poder entrar, sin borrar nada |
| `es_ficticio` | Todos | Marca de dato de prueba, en las cinco tablas (jornadas y bitácora desde D87) |
| `fecha_ultima_edicion` + `editado_por_id` | Todos | Mismo par en plantaciones, cuentas, catálogos y jornadas |

---

## Lo que todavía no existe

| Campo previsto | Para qué | Cuándo |
|---|---|---|
| Emisión del folio | Tabla de secuencias por celda y año, asignación en transacción con el UUID como clave de idempotencia (R3–R6) | [pendiente] Fase 2, y sólo con la malla UGA corregida y congelada (DECISIONES, pendientes). La estructura ya está en el registro (bloque 23) |
| Bandeja de especies fuera de catálogo | Donde el SIA resuelve cada `PENDIENTE_VALIDACION`: alta o reasignación | [pendiente] Fase 2, con los catálogos |
| Posible duplicado | Aviso al sincronizar cuando otro registro cae a menos de la incertidumbre combinada de ambos puntos (suma de sus `gps_precision_m`, piso 5 m) | [pendiente] Fase 2, en el servidor (D69) |
| Clave de campo del ejemplar | La que el personal usa en los partes a mano (`CIZ_366`) | **Descartado** por Liber (D87): no entra como atributo |
| Colonia del parte | No se pide en el cierre: sale del punto de cada registro, como la alcaldía; un campo libre sería una segunda fuente | Resuelto en el bloque 21 con la capa de colonias |
| Identificador del servidor | Para relacionar el registro del dispositivo con el del servidor | [pendiente] Fase 2 |
| Marca de envío | Saber qué registros ya subieron | [pendiente] Fase 2 |

Ninguno de los tres se guarda todavía: un campo sin uso es una promesa de que el sistema hace algo
que no hace.
