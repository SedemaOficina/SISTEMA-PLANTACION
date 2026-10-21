# Fallas de componentes compartidos del SIA

Registro fijo de las fallas que el SRP encuentra en componentes del SIA que no son suyos: los módulos comunes
del backend, los esquemas compartidos, las capas y el servidor web. Es para el equipo del SIA.

Una falla así no se parcha en una copia del componente. Si urge, el SRP la rodea en su propio código y lo dice
aquí; la corrección la hace el SIA en su componente.

| # | Componente | Qué pasaba | Cómo se vio | Rodeo en el SRP | Aviso | Estado |
|---|---|---|---|---|---|---|
| 1 | Módulo común de procedencia del backend (`src/comun/procedencia.ts`) | Tomaba como dirección de la persona la última de `X-Forwarded-For`, que es la del intermediario: daba la misma para todos | Al preparar el límite de intentos fallidos por procedencia (`docs/REVISION-SERVIDOR.md`, hallazgo 1) | Ninguno: el límite esperó a la corrección | No hizo falta: el SIA ya lo tenía identificado al revisar otros proyectos (`docs/ALINEACION-SIA.md`, § 6, fila 2) | Corregido por el SIA el 16-10-2026. El SRP lo usa desde el bloque 233 (D313) |

## Cómo se agrega una

1. Comprobar que la falla es del componente y no del SRP, con una prueba que la repita.
2. Anotarla aquí con su evidencia, sin direcciones, nombres de equipo ni versiones de la infraestructura.
3. Avisar al SIA y anotar cuándo y por qué medio.
4. Si urge, rodearla en el código del SRP, nunca en una copia del componente, y decirlo en «Rodeo en el SRP».
5. Cuando el SIA la corrija, anotar la fecha y quitar el rodeo.
