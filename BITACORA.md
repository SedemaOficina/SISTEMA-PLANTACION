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
