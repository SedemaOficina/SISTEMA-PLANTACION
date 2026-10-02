# Bibliotecas y fuentes incluidas

Todo lo de esta carpeta se sirve desde el propio sitio (sin CDN), para que la app funcione sin señal.
Al actualizar una biblioteca, se cambia aquí su versión.

| Archivo | Qué es | Versión | Licencia |
|---|---|---|---|
| `leaflet.js`, `leaflet.css` | Leaflet: mapas | 1.9.4 | BSD de 2 cláusulas |
| `leaflet-gesture-handling.min.js`, `.min.css` | Leaflet Gesture Handling: dos dedos para mover el mapa | por confirmar (el archivo no la dice) | MIT |
| `turf-pip.min.js` | Turf, punto en polígono (`@turf/boolean-point-in-polygon`, compilado) | por confirmar (el archivo no la dice) | MIT |
| `jspdf.umd.min.js` | jsPDF: generación del PDF | 4.2.1 | MIT |
| `jspdf.plugin.autotable.min.js` | jsPDF-AutoTable: tablas del PDF | 5.0.8 | MIT |
| `fuentes/cabin.woff2` | Cabin (títulos), subconjunto latino | — | SIL Open Font License 1.1 (`fuentes/Cabin-OFL.txt`) |
| `fuentes/roboto-*.woff2` | Roboto (texto), subconjunto latino | — | SIL Open Font License 1.1 según Google Fonts; falta agregar su archivo de licencia |

Pendiente para el paquete de traspaso: confirmar las dos versiones que faltan y agregar el archivo
de licencia de Roboto.
