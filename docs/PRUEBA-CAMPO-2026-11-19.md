# Prueba en campo del 19-11-2026

Primera prueba en campo con la aplicación conectada al servidor del SIA, con la versión 1.0.1 instalada. El equipo
registró 93 árboles con 14 teléfonos y entregó sus observaciones el 21-11-2026. Aquí van sus resultados, sin nombres
de personas, y qué bloque atendió cada observación. Lo decidido está en `docs/DECISIONES.md` (D348 a D351).

## Precisión del GPS por teléfono

La precisión es la que reportó la aplicación en cada captura, en metros.

| # | Teléfono | Registros | Precisión registrada | Rango | Observación del equipo |
|---|---|---|---|---|---|
| 1 | Motorola G72 | 9 | 10, 8, 7, 6, 3 | 3 a 10 | Mejora conforme se estabiliza |
| 2 | Redmi Note 13 Pro (equipo 1) | 3 | 15, 23 | 15 a 23 | Baja precisión |
| 3 | Redmi 13C | 10 | 50 a 100 | 50 a 100 | No apto para registro |
| 4 | Honor (modelo por confirmar) | 6 | 15 a 7 | 7 a 15 | Precisión media |
| 5 | Cubot KingKong ES | 5 | 5, 10 | 5 a 10 | Sólo abría la galería, no la cámara |
| 6 | Samsung Galaxy A33 | 12 | 14, 50 | 14 a 50 | Muy variable |
| 7 | iPhone 17 | 5 | 16, 5, 4, 2 | 2 a 16 | Alta precisión tras estabilizar |
| 8 | Oppo (modelo por confirmar) | 5 | 7 a 13 | 7 a 13 | Precisión media |
| 9 | Honor 400 | 5 | 7, 6, 8, 7, 6 | 6 a 8 | Consistente |
| 10 | Redmi Note 13 Pro (equipo 2) | 6 | 10 a 15, 20 | 10 a 20 | Baja precisión |
| 11 | Motorola Edge 70 | 5 | 6, 8 | 6 a 8 | Consistente |
| 12 | Redmi Note 13 Pro (equipo 3) | 5 | 14, 12, 15 | 12 a 15 | Baja precisión |
| 13 | Oppo Reno 12 | 9 | 3 a 5 | 3 a 5 | Mejor desempeño |
| 14 | Moto G24 | 8 | 5, 10, 12 | 5 a 12 | Precisión media |
| | **Total** | **93** | | | |

En el manual del personal (sección 2) se nombran como **modelos con baja precisión en la prueba** el Redmi 13C, el Redmi
Note 13 Pro y el Samsung Galaxy A33, como pidió Liber. La aplicación no impide guardar con baja precisión: lo avisa y
pide revisar el punto.

## Lo que pidió el equipo y dónde quedó

| Observación | Qué se hizo | Bloque y versión |
|---|---|---|
| Separación mínima entre árboles de 3 m | «Puntos duplicados» arranca en 3 m, y el aviso al guardar compara sólo con la misma especie | 270 (1.0.4) y 271 (1.0.5) |
| Girar el mapa con dos dedos | Pendiente | Segunda etapa (1.1.0) |
| Tamaño del pin | El equipo lo quería más chico: una mira de 16 px con el punto al centro, sin la etiqueta flotante | 270 (1.0.4) |
| Capa de colonias activa por omisión | Empieza apagada al abrir la aplicación, en los mapas de campo; se enciende con el botón de capas | 270 (1.0.4) |
| Mapa base de mayor resolución | Pendiente: falta saber si el SIA tiene una ortofoto y si se acepta un proveedor con clave y costo | Segunda etapa (1.1.0) |
| «El servidor no aceptó 1 cambio» al hacer un relevo | Era la versión vieja de la jornada en el teléfono de la Coordinación: la ventana la trae al día y el relevo se reenvía solo si sólo cambió otra cosa | 269 (1.0.3) |
| El cabo no podía registrar en un evento especial | Faltaba «Registrar árbol» en la ficha para el cabo de apoyo, y Nuevo registro seguía en su otra jornada | 268 (1.0.2) |
| Color distinto para las jornadas de relevo o compartidas | Franja y fondo verde azulado en la lista de Jornadas, con «Relevo: ahora registra usted» o «Compartida: usted es cabo de apoyo» | 268 (1.0.2) |
| Tiempo de actualización entre perfiles | Lo nuevo llega solo cada 2 minutos, pidiendo sólo lo que cambió; franja «Al día a las…» y «Actualizar»; el tiempo va en los manuales | 269 (1.0.3) y 271 |
| La cámara del Cubot | «Tomar foto» y «Galería» | 270 (1.0.4) |
