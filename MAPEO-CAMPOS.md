# Mapeo de campos

Qué se guarda, con qué nombre, si es obligatorio y de dónde sale cada dato. Un campo aparece
completo en el módulo que lo origina; donde se reutiliza se anota con una remisión, para no
describir dos veces la misma cosa y que las dos descripciones acaben diciendo cosas distintas.

Este documento se comprueba solo: `pruebas/auditoria.py` compara esta lista contra los campos que
el sistema guarda de verdad y avisa si alguno sobra o falta.

Mientras dure la Etapa 1, la pantalla de registro lleva al pie un **espejo de campos** que enseña
en vivo los que aquí aparecen con «—» en la columna de etiqueta: los que viajan a la base sin tener
lugar en la interfaz. Sale del mismo objeto que se guarda, así que es la forma más rápida de ver
que este documento y el sistema dicen lo mismo. Desaparece al cerrar la etapa.

## Cómo leer la columna «Origen»

| Origen | Qué significa |
|---|---|
| **Persona** | Lo escribe o lo elige quien usa el sistema |
| **Catálogo** | Se elige de un catálogo administrable; se guarda la clave, no el texto |
| **Capa geográfica** | Se deriva del punto contra las capas; nadie lo teclea |
| **Sistema** | Lo pone el sistema: identificadores, fechas de registro, marcas de edición |
| **Sesión** | Se toma de quien tiene la sesión abierta |

---

## Módulo: Registro de plantación

Pantalla **Registrar**. Almacén `plantaciones`.

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
| Alcaldía | `alcaldia` | No | Capa geográfica | Sale del punto contra `alcaldias_colonias`. Campo de sólo lectura; no se teclea ni se edita |
| Colonia | `colonia` | No | Capa geográfica | Ídem, también de sólo lectura |
| — | `uga` | No | Capa geográfica | Del punto contra la malla UGA. No se muestra en la ficha |
| — | `capa_version` | No | Sistema | Versión de la capa con la que se derivó, para saber con qué geometría se resolvió |
| Especie | `especie_id` | Sí | Catálogo | Remite a `catalogos.id` con `tipo = especie`. Vacío cuando se eligió «Otra especie» |
| Especifique la especie | `especie_otra` | Sólo con «Otra especie» | Persona | Texto libre, para lo que no está en el catálogo |
| Programa | `programa_id` | Sí | Catálogo | Remite a `catalogos.id` con `tipo = programa` |
| Fecha de plantación | `fecha_plantacion` | Sí | Persona | `AAAA-MM-DD`. Arranca **sin valor**: se elige a propósito en cada registro, nunca se hereda del anterior. No puede ser posterior a hoy. Se muestra como 21-SEP-2026 |
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
| Perfil | `perfil` | Sí | Persona | `CABO`, `COORDINADOR`, `ADMIN` o `VIEWER`. Es lo que decide qué puede hacer |
| Coordinador | `coordinador_id` | Sólo para perfil CABO | Persona | Remite a `usuarios.id`. Quien lo tiene asignado ve sus registros |
| Estado | `activo` | Sí | Persona | Una cuenta inactiva no puede entrar; sus registros se conservan |
| — | `es_ficticio` | Sí | Sistema | |
| — | `fecha_alta`, `alta_por_id` | Sí | Sistema | Cuándo y quién dio de alta la cuenta |
| — | `fecha_ultima_edicion`, `editado_por_id` | No | Sistema | |

---

## Módulo: Catálogos

Pantalla **Catálogos**, sólo Administración global. Almacén `catalogos`. Los tres catálogos
comparten estructura; las especies añaden dos campos.

| Etiqueta en pantalla | Campo | Obligatorio | Origen | Notas |
|---|---|---|---|---|
| — | `id` | Sí | Sistema | UUID |
| — | `tipo` | Sí | Sistema | `programa`, `area` o `especie`. Lo fija la pestaña en la que se está |
| Clave | `clave` | Sí | Persona | Se sugiere a partir del nombre, en mayúsculas y sin acentos; editable antes de guardar, fija después. Es la llave con la que se unirán los datos |
| Nombre / Nombre común | `nombre` | Sí | Persona | Único dentro de su tipo |
| Nombre científico | `nombre_cientifico` | Sí, sólo en especies | Persona | Único entre las especies |
| Grupo | `grupo` | Sí, sólo en especies | Persona | `Nativa` o `Introducida`. [pendiente] Por validar con el área técnica |
| Estado | `activo` | Sí | Persona | Un valor inactivo deja de ofrecerse; los registros que ya lo usan no cambian |
| — | `es_ficticio` | Sí | Sistema | |
| — | `fecha_creacion`, `creado_por_id` | Sí | Sistema | |
| — | `fecha_ultima_edicion`, `editado_por_id` | No | Sistema | |

**Uso:** el catálogo de **especies** y el de **programas** alimentan el formulario de registro; el
de **áreas** alimenta el alta de cuentas. Ninguno se elimina si tiene uso: se desactiva.

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
| `accion` | Sí | Sistema | `CREADO`, `EDITADO`, `ELIMINADO`, `ACTIVADO` o `DESACTIVADO` |
| `entidad` | Sí | Sistema | `plantacion`, `usuario` o `catalogo` |
| `entidad_id` | Sí | Sistema | A qué registro se refiere |
| `detalle` | No | Sistema | Qué cambió; en una edición, la lista de campos |

---

## Campos que se reutilizan entre módulos

| Campo | Se origina en | Se reutiliza en |
|---|---|---|
| `usuarios.id` | Cuentas | `plantaciones.cabo_id`, `plantaciones.editado_por_id`, `usuarios.coordinador_id`, `usuarios.alta_por_id`, `catalogos.creado_por_id`, `bitacora.usuario_id` |
| `catalogos.id` (especie) | Catálogos | `plantaciones.especie_id` |
| `catalogos.id` (programa) | Catálogos | `plantaciones.programa_id` |
| `catalogos.id` (área) | Catálogos | `usuarios.area_id` |
| `activo` | Cuentas y Catálogos | Mismo significado en los dos: deja de ofrecerse o de poder entrar, sin borrar nada |
| `es_ficticio` | Todos | Marca de dato de prueba, en los cuatro almacenes |
| `fecha_ultima_edicion` + `editado_por_id` | Todos | Mismo par en plantaciones, cuentas y catálogos |

---

## Lo que todavía no existe

| Campo previsto | Para qué | Cuándo |
|---|---|---|
| Folio legible del árbol | Un identificador que la gente pueda dictar por teléfono | [pendiente] Fase 2 |
| Identificador del servidor | Para relacionar el registro del dispositivo con el del servidor | [pendiente] Fase 2 |
| Marca de envío | Saber qué registros ya subieron | [pendiente] Fase 2 |

Ninguno de los tres se guarda todavía: un campo sin uso es una promesa de que el sistema hace algo
que no hace.
