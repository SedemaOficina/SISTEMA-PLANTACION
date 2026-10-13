# Bibliotecas y fuentes incluidas

Todo lo de esta carpeta se sirve desde el propio sitio (sin CDN), para que la app funcione sin señal.
Al actualizar una biblioteca, se cambia aquí su versión.

| Archivo | Qué es | Versión | Licencia |
|---|---|---|---|
| `leaflet.js`, `leaflet.css` | Leaflet: mapas | 1.9.4 | BSD de 2 cláusulas |
| `leaflet-gesture-handling.min.js`, `.min.css` | Leaflet Gesture Handling: dos dedos para mover el mapa | 1.2.2 (idéntico byte a byte al publicado) | MIT |
| `turf-pip.min.js` | Turf, punto en polígono (`@turf/boolean-point-in-polygon`, compilado) | 6.x: el código incluido es el mismo de la 6.2.0 a la 6.5.0 | MIT |
| `jspdf.umd.min.js` | jsPDF: generación del PDF | 4.2.1 | MIT |
| `jspdf.plugin.autotable.min.js` | jsPDF-AutoTable: tablas del PDF | 5.0.8 | MIT |
| `fuentes/cabin.woff2` | Cabin (títulos), subconjunto latino | — | SIL Open Font License 1.1 (`fuentes/Cabin-OFL.txt`) |
| `fuentes/roboto-*.woff2` | Roboto (texto en pantalla), subconjunto latino | — | SIL Open Font License 1.1 (`fuentes/Roboto-OFL.txt`) |
| `fuentes/roboto-regular.ttf`, `roboto-bold.ttf`, `roboto-italic.ttf` | Roboto para incrustar en los PDF: instancias fijas (peso 400 y 700) de la fuente variable de `google/fonts` (`ofl/roboto`), reducidas a latino básico y extendido (U+0020–017F) y puntuación | 3 (fuente variable) | SIL Open Font License 1.1 (`fuentes/Roboto-OFL.txt`) |

Revisado el 12-10-2026: Leaflet, jsPDF y jsPDF-AutoTable están en su versión más reciente. Turf 7 cambia el
cálculo interno del punto en polígono; no hace falta subir mientras la derivación dé lo mismo que el servidor.
