# Plan de traspaso al SIA

Qué hay que hacer, en qué orden y quién, para que el SRP opere en los servidores de la Secretaría.
Complementa a `FASE2-Y-TRASPASO.md`, que dice **qué** debe hacer el servidor; este archivo dice **cómo
se llega**. Elaborado el 03-10-2026 con la descripción de la infraestructura que entregó el SIA.

Este repositorio es público. Aquí no se escriben direcciones de red, nombres de equipo, cuentas ni
versiones exactas de los servidores: esos datos viven en la documentación interna del SIA.

---

## 1. Punto de partida

| Pieza | Qué ofrece el SIA | Qué usa el SRP |
|---|---|---|
| Dominio | Dominio público de la Secretaría con HTTPS; el certificado lo administra y renueva la ADIP | Una ruta propia bajo ese dominio. HTTPS es requisito: sin él no hay GPS, cámara ni trabajo sin señal |
| Servidor web | Proxy inverso que reparte el tráfico y sirve sitios estáticos, con historial de versiones publicadas | Los archivos de la aplicación (HTML, CSS, JS, capas, iconos). Es el servidor más holgado |
| Servidor de aplicaciones | Backend central en Node.js con Express; cada módulo tiene su cuenta de base de datos y no ve los datos de los demás | Un módulo nuevo para el SRP, con su propia cuenta de servicio |
| Base de datos | PostgreSQL con PostGIS, conexiones cifradas, un esquema por sistema, respaldos diarios y semanales con restauración probada | Un esquema nuevo con las diez tablas del SRP |
| Marco territorial | Esquema `territorio` compartido: 16 alcaldías y 1,817 unidades territoriales | Alcaldías, colonias y malla UGA, previa verificación (apartado 3) |
| Servidor de mapas | GeoServer con servicios WMS, WFS y WMTS públicos | Opcional: ortofoto propia como mapa base, en lugar de Esri |
| Acceso de administración | Sólo por la red privada de gobierno | Lo opera el SIA; el SRP no requiere acceso de administración desde fuera |

Ya existe en el SIA un módulo y un esquema de plantación. **El SRP no los reutiliza** (decisión del
03-10-2026): entra como proyecto nuevo, con otro nombre, su propio esquema, su propia ruta y su propia
cuenta de servicio. Qué pasa con el módulo anterior —se conserva, se archiva o se migra su contenido—
lo decide el SIA y no condiciona este plan.

## 2. Arquitectura de destino

```
Teléfono (navegador, trabaja sin señal)
   │  HTTPS
   ▼
Dominio de la Secretaría
   ├── /<ruta>/            archivos de la aplicación        → servidor web
   ├── /api/<ruta>/        recepción, consulta y permisos   → módulo nuevo del backend
   │                              ├── esquema <esquema>     → base de datos
   │                              ├── esquema territorio    → sólo lectura
   │                              └── fotografías           → volumen de datos, fuera de carpeta pública
   └── /geoserver/         mapa base propio (opcional)      → servidor de mapas
```

Criterios:

1. **Mismo origen.** La aplicación y su API viven bajo el mismo dominio. La política de seguridad de
   `index.html` ya sólo permite conexiones al propio sitio: no hay que abrirla.
2. **Mismas tablas en el teléfono y en el servidor.** Las diez tablas de `datos/esquema.json` se crean
   tal cual; cada una se envía y se recibe con su nombre y sus campos. No hay capa de traducción.
3. **El servidor es la fuente de verdad.** Emite el folio, valida cada renglón, impone los permisos y
   escribe la bitácora. La pantalla sólo refleja.
4. **Mínimo privilegio.** La cuenta de servicio del SRP escribe en su esquema y sólo lee `territorio`.
5. **Sin datos de prueba en producción.** La versión real usa otra base en el teléfono (`srp_sia`) y el
   servidor arranca vacío.

## 3. Verificación de capas (requisito previo)

El SRP deriva alcaldía, colonia y celda UGA de cada árbol con tres capas incluidas en la aplicación. Si
el servidor deriva con capas distintas, un mismo punto puede quedar en otra colonia o recibir otro folio.
Antes de consumir `territorio` hay que comprobar que son las mismas.

| Capa | En el SRP | En `territorio` | Estado |
|---|---|---|---|
| Alcaldías | 16 polígonos, versión `sia-2026-01-01`, clave `cvegeo` | 16 alcaldías | Por comparar |
| Colonias | **1,837** polígonos, IECM 2022, clave `clave` | **1,817** unidades territoriales | **No coinciden en número: hay que conciliar antes de avanzar** |
| Malla UGA | 1,624 celdas, versión `sia-2026-09-22`; define el folio | No se menciona en `territorio` | Confirmar que está publicada y con qué nombre |
| Colonias prioritarias | 2,243 polígonos, geometría simplificada | — | El SIA la publica completa (fila 19 de `FASE2-Y-TRASPASO.md`) |

Cómo se compara, sin mover archivos pesados:

1. `datos/HUELLA-CAPAS.md` y `datos/HUELLA-CAPAS.json` describen las capas del SRP: cuántos polígonos,
   qué claves, superficie y centroide de cada uno. Se generan con `python3 herramientas/huella_capas.py`.
2. El SIA corre en su base la consulta que viene al final de `datos/HUELLA-CAPAS.md`, una vez por capa.
3. `python3 herramientas/huella_capas.py resultado.json` dice qué claves faltan, cuáles sobran y qué
   polígonos cambiaron de superficie o de lugar.

Regla de decisión: si las capas difieren, **manda la del SIA**, y la aplicación se regenera con ella
(`herramientas/generar_capas.py`). Con datos de prueba no hay nada que rederivar; si el cambio ocurre con
datos reales, aplica la rederivación por `capa_version` (regla S-08). Pendiente aparte: las ocho celdas
UGA cuyo prefijo no corresponde a su alcaldía, que el SIA debe confirmar antes de emitir folios.

## 4. Fases

Cada fase tiene un criterio de salida; no se pasa a la siguiente sin cumplirlo.

| Fase | Qué se hace | Responsable | Criterio de salida |
|---|---|---|---|
| **0. Acuerdos** | Nombre del proyecto, ruta de publicación, nombre del esquema y de la cuenta de servicio. Proveedor de identidad y si cubre a instituciones externas. Aviso de privacidad. Mapa base de producción | Oficina de la Secretaría y SIA | Las decisiones del apartado 6, por escrito |
| **1. Capas** | Verificación del apartado 3; conciliación de colonias; confirmación de la malla UGA | SIA, con la huella que entrega el SRP | Las tres capas dan «IGUAL», o la aplicación se regeneró con las del SIA |
| **2. Base de datos** | Esquema nuevo con las diez tablas, llaves foráneas, índices, secuencia del folio por celda y columnas de la cola de envío. Permisos de la cuenta de servicio. Alta en los respaldos | SIA | El esquema existe, la cuenta sólo ve lo suyo y `territorio` en lectura, y una restauración de prueba lo incluye |
| **3. Servicios** | Módulo nuevo en el backend: acceso, catálogos, recepción idempotente de jornadas y árboles, folio, validación, permisos, bitácora, fotografías, consultas de Supervisión | SIA (desarrollo), con `FASE2-Y-TRASPASO.md` como especificación | Las 26 filas de su apartado 1 resueltas o diferidas por escrito |
| **4. Aplicación** | Sustituir lo simulado (apartado 3 de `FASE2-Y-TRASPASO.md`): acceso, envío y folio. `ES_FICTICIO: false`. Publicar en la ruta. Retirar demostración y espejo de campos | SIA, con acompañamiento | La aplicación abre en la ruta definitiva, instala, trabaja sin señal y envía al volver la señal |
| **5. Piloto** | Una cuadrilla, una semana, datos reales. Teléfonos iPhone y Android. Revisión diaria de lo recibido contra lo capturado | Oficina de la Secretaría, Reforestación Urbana y SIA | Cero árboles perdidos o duplicados; folios consecutivos por celda; reporte de jornada conforme |
| **6. Operación** | Alta de cuentas y catálogos reales, vehículos incluidos. Carga del histórico. Monitoreo de disco de fotografías. Archivo del repositorio público | SIA | Todas las cuadrillas capturan en producción; el repositorio de GitHub queda privado y archivado |

Las fases 1 y 2 pueden correr en paralelo. La 3 es la de mayor esfuerzo y la que fija el calendario.

## 5. Qué está listo y qué falta

**Listo en este repositorio**

- Aplicación completa de captura, jornadas, reportes, supervisión, catálogos, cuentas y permisos, con
  pruebas automáticas y auditorías (`pruebas/`).
- Modelo de datos: `datos/esquema.json`, diccionario (`datos/DICCIONARIO-DATOS.md`) con el borrador de
  tablas para PostgreSQL, y mapeo de campos a pantalla (`datos/MAPEO-CAMPOS.md`).
- Especificación del servidor: `docs/FASE2-Y-TRASPASO.md`.
- Reglas de permisos en un solo archivo (`js/permisos.js`), para replicarlas en el servidor.
- Huella de capas y herramienta de comparación (apartado 3).
- Catálogo real de especies (76). La lista real de vehículos está fuera del repositorio y se entrega aparte.

**Falta, del lado del SRP**

- Paquete de traspaso (apartado 7 de `FASE2-Y-TRASPASO.md`): especificación consolidada, comentarios sin
  historia, documentación de proceso al archivo. Se hace cuando la Etapa 1 deje de cambiar.
- Prueba en iPhone y Android reales.
- Pendientes de pantalla que conviene cerrar antes: revisión de Supervisión y «Mi avance», y confirmación
  escrita al eliminar una cuenta o un valor de catálogo.

**Falta, del lado del SIA**

- Todo el apartado 4 de `FASE2-Y-TRASPASO.md` y las fases 1 a 4 de este plan.

## 6. Decisiones que hay que tomar en la fase 0

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| 1 | Nombre del proyecto, ruta y esquema | — | Un solo nombre corto para los tres, en minúsculas y sin acentos, distinto del módulo existente |
| 2 | Proveedor de identidad | Llave CDMX, directorio institucional o cuentas propias del SIA | El que cubra también a alcaldías, PAOT, SOBSE, empresas y organizaciones civiles; si ninguno, cuentas propias con alta por la Administración global |
| 3 | Mapa base | Esri con cuenta y clave restringida al dominio; ortofoto propia por GeoServer; OpenStreetMap de respaldo | Ortofoto propia si el SIA tiene una vigente: sin costo ni dependencia externa. Requiere caché de teselas y disco para ella |
| 4 | Fotografías | Volumen de datos del servidor de aplicaciones; almacenamiento de objetos de la ADIP | Volumen de datos, fuera de carpeta pública, con ampliación solicitada antes del piloto (apartado 7) |
| 5 | Colonias | Las 1,837 del IECM 2022 o las 1,817 de `territorio` | La que el SIA declare oficial; el SRP se regenera con ella |
| 6 | Módulo de plantación existente | Conservar, archivar o migrar su contenido | Archivar si no tiene datos en uso; si los tiene, cargarlos como histórico (fila 16) |
| 7 | Aviso de privacidad | — | Requisito para el piloto: el sistema guarda nombre, correo, institución y cargo del personal, y fotografías con ubicación |

## 7. Capacidad

- **Fotografías.** Cada árbol lleva una, de 800 × 600 px, del orden de 100 a 150 KB. Diez mil árboles
  ocupan entre 1 y 1.5 GB; cien mil, entre 10 y 15 GB. El volumen de datos del servidor de aplicaciones
  se comparte con otros sistemas: **dimensionarlo y, en su caso, solicitar ampliación a la ADIP antes del
  piloto**, con la meta anual de plantación como sustento.
- **Base de datos.** Sin fotografías, cada árbol pesa menos de 1 KB. Cien mil árboles con su bitácora caben
  en decenas de MB: no requiere ampliación.
- **Servidor de aplicaciones.** Verificar el espacio libre de su disco de sistema antes de instalar el
  módulo nuevo.
- **Servidor web y de mapas.** Holgados para los archivos de la aplicación (menos de 10 MB). La caché de
  teselas, si se usa ortofoto propia, sí requiere disco.
- **Respaldos.** El esquema nuevo entra al respaldo de la base. Las fotografías viven fuera de la base:
  hay que confirmar que ese volumen queda cubierto por un respaldo.

## 8. Riesgos

| Riesgo | Efecto | Cómo se atiende |
|---|---|---|
| Capas distintas entre teléfono y servidor | Árboles en otra colonia; folios de otra celda | Apartado 3, antes de la fase 2 |
| Proveedor de identidad que no cubre instituciones externas | Alcaldías y empresas sin acceso | Decisión 2 de la fase 0; cuentas propias como salida |
| Disco de fotografías insuficiente | El servidor rechaza capturas a media temporada | Ampliación previa y monitoreo con alerta al 70 % |
| Fotografías sin respaldo | Pérdida irreversible de evidencia | Respaldo propio del volumen antes de operar |
| Reenvíos que duplican | Doble conteo de árboles | El `id` de cada registro es la clave de idempotencia (S-01); se prueba en el piloto |
| iPhone no envía con la aplicación cerrada | Datos retenidos en el teléfono | La aplicación lo avisa; el procedimiento de cierre de jornada pide abrirla con señal |
| Administración sólo por red privada | Una falla de acceso detiene despliegues, no la captura | La aplicación sigue trabajando sin señal y envía después |
| Repositorio público con historial | Archivos originales y, en un tramo, placas reales siguen en el historial | El SIA recibe una copia sin historial; el repositorio se archiva y se hace privado en la fase 6 |

## 9. Siguiente paso

Enviar al SIA este plan, `FASE2-Y-TRASPASO.md` y la huella de capas, y pedir dos cosas: el resultado de la
consulta de capas (fase 1) y una reunión para las decisiones de la fase 0.
