# Bitácora de bloques

## Bloque 1 — Cascarón funcional con datos ficticios (21-09-2026)
Etapa 1 de la norma. Estado: **cerrado**.

**Qué se construyó:** acceso y alta de registrador; cuatro perfiles simulados; registro con mapa,
GPS, captura manual de coordenadas, cruce territorial, autocompletado de especie, «Otra especie»,
foto comprimida y resumen previo; listado con filtros por mes y rango; edición con historial;
eliminación con constancia; PDF con logotipo y resumen por programa; editor de catálogos con
bloqueo de eliminación en uso, activar/desactivar y bitácora.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 32 comprobaciones en los cuatro
perfiles, sin errores de consola; auditorías de código sin uso, hojas de estilo (sin selectores
duplicados, sin colores fuera de :root) y contraste (todo ≥4.5:1 en texto).

**Hallazgo abierto:** guinda y color de error tienen la misma luminancia (1.15:1 entre sí). Se
distinguen por tono, por texto explícito y por borde; nunca sólo por color. Revisar al fijar paleta final.

**Eliminado del esquema previo y por qué:** ver DECISIONES D12 y D17.

## Bloque 2 — Filtro de periodo y claves sugeridas (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.2.0.

**Petición de Liber:** (1) el sistema opera hasta 2030 y los chips de mes sueltos se vuelven
inmanejables, «quizás separar»; (2) al agregar en catálogos debe sugerirse una clave por
defecto, siempre en mayúsculas, en todos los catálogos.

**Qué se construyó:** filtro de periodo con tres atajos (Este mes, Mes pasado, Este año) más
listas de Año y Mes, con el rango Desde/Hasta para casos finos; el mes lista sólo los meses con
registros del año elegido; elegir periodo limpia el rango y al revés. Clave sugerida a partir del
nombre en programas, áreas y especies, con sufijo si la clave ya existe, mayúsculas forzadas al
escribir, y sin resugerir una vez que se edita a mano o al editar un valor existente.

**Eliminado y por qué:** la fila de chips de mes (`#filtro-meses`) y la función `pintarMeses()`,
sustituidas por el nuevo filtro (D19). No queda rastro en código, textos ni documentación.

**Defecto encontrado y corregido durante la prueba:** al elegir Año o Mes en las listas, los chips
de atajo se quedaban marcados y la pantalla mostraba dos periodos distintos a la vez.

**Corrección menor de la misma pasada:** la columna Uso de Catálogos decía «1 registros»; ahora
concuerda en singular y plural, también en el aviso de eliminación bloqueada.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 47 comprobaciones en los
cuatro perfiles, sin errores de consola; auditorías de hojas de estilo (sin clases sin uso, sin
selectores duplicados, sin colores fuera de `:root`, un solo `!important`, el de reduced-motion),
código sin uso, identificadores del HTML y textos.

## Bloque 3 — Publicación en la cuenta institucional (21-09-2026)
Etapa 1. Estado: **abierto**, a la espera del envío al repositorio.

**Por qué:** en el teléfono, la ubicación GPS y la cámara sólo funcionan en una dirección
`https://`. Sin publicar no hay prueba de campo, que es el uso real del sistema.

**Qué se hizo:** repositorio git iniciado en la carpeta del proyecto, con dos entregas que
reproducen la historia documentada arriba (v0.1.0 y v0.2.0) y destino
`SedemaOficina/SISTEMA-PLANTACION`. Se verificó que los archivos de la versión probada llegaron
intactos a la entrega (huellas md5 idénticas en los diez archivos principales).

**Fuera del repositorio** (`.gitignore`): `historial/`, `_to_delete/`, y basura del sistema
operativo. Las copias fechadas se conservan en disco pero ya no hacen falta: el historial lo
lleva git.

**Falta para cerrar el bloque:** enviar al repositorio, activar la publicación, abrirlo desde el
teléfono y verificar que GPS y cámara respondan.
