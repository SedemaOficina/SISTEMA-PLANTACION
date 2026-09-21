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

## Bloque 4 — Acceso con cuenta y administración de usuarios (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.3.0.

**Petición de Liber:** (1) la pantalla inicial debe ser un acceso con usuario y contraseña,
simulado por ahora, y el alta de registrador sale de ahí: va dentro, para dar de alta usuarios;
(2) quien registra lo hace varias veces en una sesión, así que debe haber un botón de agregar
registro nuevo; (3) el control de ubicación debe estar en el mapa, en guinda, en lugar del botón
de abajo, conservando la captura manual de coordenadas.

**Qué se construyó:** acceso con correo y contraseña; pestaña «Usuarios» sólo para la
Administración global, con alta, edición, activación, desactivación y eliminación de cuentas,
asignación de perfil, área y jefe, y buscador; panel de confirmación tras guardar con «Agregar
registro nuevo», que conserva programa, fecha y ubicación; control de ubicación dentro del mapa,
abajo a la derecha, con aviso de que está buscando señal.

**Eliminado y por qué:** el formulario de alta de registrador de la pantalla de acceso y
`SRP.sesion.registrarNuevo()`, sustituidos por el alta desde Usuarios (D30); el botón «Usar mi
ubicación» de debajo del mapa, sustituido por el control dentro del mapa (D36); el aviso flotante
«Registro guardado», que repetía lo que ya dice el panel (Norma 9.4). Sin rastro en código,
textos ni documentación.

**Declarado en pantalla:** la contraseña no se verifica todavía. Comprobarla en el navegador es
seguridad aparente; el aviso está en la pantalla de acceso mientras `ES_FICTICIO` sea true, y la
razón queda en el comentario de `autenticar()` (Norma 9.6).

**Datos ficticios:** los usuarios ahora llevan correo en `@ejemplo.local`; se agregó una cuenta
desactivada y se dejó a una persona sin apellido materno, ambos como casos de prueba.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 77 comprobaciones en los
cinco perfiles de prueba, sin errores de consola; auditorías de hojas de estilo, código sin uso,
identificadores y textos, todas limpias.
