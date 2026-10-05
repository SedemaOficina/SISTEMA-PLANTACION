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
| Dominio | Dominio público de la Secretaría con HTTPS; el certificado lo administra y renueva la ADIP | La ruta `/srp/` bajo ese dominio. HTTPS es requisito: sin él no hay GPS, cámara ni trabajo sin señal |
| Servidor web | Proxy inverso que reparte el tráfico y sirve sitios estáticos, con historial de versiones publicadas; el cifrado termina en él | Los archivos de la aplicación (HTML, CSS, JS, capas, iconos). Es el servidor más holgado |
| Servidor de aplicaciones | Backend central en Node.js con Express; cada módulo tiene su cuenta de base de datos y no ve los datos de los demás | El servicio del SRP, construido en este proyecto (`servidor/`), con su propia cuenta de servicio. Puede montarse como módulo del backend central o correr aparte: lo confirma el SIA |
| Base de datos | PostgreSQL con PostGIS, conexiones cifradas obligatorias, un esquema por sistema, respaldos diarios y semanales con restauración probada | El esquema `srp`, con las diez tablas del SRP más las de usuarios y sesiones |
| Correo | No hay servicio de correo | Nada: el restablecimiento de contraseñas lo hace la Administración global |
| Marco territorial | Esquema `territorio` compartido: 16 alcaldías y 1,817 unidades territoriales | No lo consume: alcaldías, colonias y malla UGA viajan con el SRP y son las mismas del SIA (apartado 3) |
| Servidor de mapas | GeoServer con servicios WMS, WFS y WMTS públicos | Nada por ahora: el mapa base es CARTO para calles y Esri para satélite (D251) |
| Acceso de administración | Sólo por la red privada de gobierno | Lo opera el SIA; el SRP no requiere acceso de administración desde fuera |

Ya existe en el SIA un módulo y un esquema de plantación. **El SRP no los reutiliza** (decisión del
03-10-2026): entra como proyecto nuevo, con su propio esquema, su propia ruta y su propia cuenta de
servicio, todos con el nombre `srp` (D249). Qué pasa con el módulo anterior —se conserva, se archiva o se migra su contenido—
lo decide el SIA y no condiciona este plan.

## 2. Arquitectura de destino

```
Teléfono (navegador, trabaja sin señal)
   │  HTTPS
   ▼
Dominio de la Secretaría
   ├── /srp/               archivos de la aplicación        → servidor web
   ├── /api/srp/           acceso, recepción, consulta      → servicio del SRP
   │                              ├── esquema srp           → base de datos
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
   Se conecta a la base con cifrado.
5. **Sesión con cookie.** Mismo dominio, cookie sólo HTTP, segura y del mismo sitio. El servidor de
   aplicaciones recibe HTTP del intermediario, así que confía en su cabecera para saber que la petición
   llegó cifrada. Las cuentas son propias del SRP (correo y contraseña); no hay servicio externo de
   autenticación ni de correo.
6. **Sin datos de prueba en producción.** La versión real usa otra base en el teléfono (`srp_sia`) y el
   servidor arranca vacío.

## 3. Verificación de capas (requisito previo)

El SRP deriva alcaldía, colonia y celda UGA de cada árbol con tres capas incluidas en la aplicación. Si
el servidor deriva con capas distintas, un mismo punto puede quedar en otra colonia o recibir otro folio.
**Verificación hecha el 05-10-2026 (D251): las tres capas son las mismas.** Las capas viajan con el SRP y el
servidor las carga en su esquema `srp`; no consume las de `territorio`.

| Capa | En el SRP | En `territorio` | Estado |
|---|---|---|---|
| Alcaldías | 16 polígonos, versión `sia-2026-01-01`, clave `cvegeo` | Capa de alcaldías del servidor de mapas del SIA | **Igual**: mismas 16 claves y superficie; diferencia máxima de borde de 0.1 m (redondeo a seis decimales) |
| Colonias | **1,837** polígonos, IECM 2022, clave `clave` | Archivo que entregó el SIA | **Igual**: el archivo es idéntico al original del SRP. Las 1,817 unidades territoriales de `territorio` son otra capa; el SRP no la usa |
| Malla UGA | 1,624 celdas, versión `sia-2026-09-22`; define el folio | Archivo que entregó el SIA | **Igual**: archivo idéntico al original del SRP. Las ocho celdas con prefijo distinto a su alcaldía son correctas (D249) |
| Colonias prioritarias | 2,243 polígonos, geometría simplificada | — | El SIA la publica completa (fila 19 de `FASE2-Y-TRASPASO.md`) |

Cómo se compara, sin mover archivos pesados:

1. `datos/HUELLA-CAPAS.md` y `datos/HUELLA-CAPAS.json` describen las capas del SRP: cuántos polígonos,
   qué claves, superficie y centroide de cada uno. Se generan con `python3 herramientas/huella_capas.py`.
2. El SIA corre en su base la consulta que viene al final de `datos/HUELLA-CAPAS.md`, una vez por capa.
3. `python3 herramientas/huella_capas.py resultado.json` dice qué claves faltan, cuáles sobran y qué
   polígonos cambiaron de superficie o de lugar.

Regla de decisión: si las capas difieren, **manda la del SIA**, y la aplicación se regenera con ella
(`herramientas/generar_capas.py`). Con datos de prueba no hay nada que rederivar; si el cambio ocurre con
datos reales, aplica la rederivación por `capa_version` (regla S-08). Si en el futuro el SIA
publica una versión nueva de alguna capa, se repite esta comparación.

## 4. Fases

Cada fase tiene un criterio de salida; no se pasa a la siguiente sin cumplirlo.

| Fase | Qué se hace | Responsable | Criterio de salida |
|---|---|---|---|
| **0. Acuerdos** | Forma de montaje del servicio (módulo del backend central o servicio aparte), quién crea el esquema y la cuenta de servicio, cómo se instala una versión nueva, límites del servidor web, ambiente de pruebas. Mapa base de producción. Ya decididos: nombre `srp` para proyecto, esquema y ruta; acceso con cuentas propias; sin aviso de privacidad (D249) | Oficina de la Secretaría y SIA | Las decisiones del apartado 6, por escrito |
| **1. Capas** | Verificación del apartado 3 | SRP, con los archivos del SIA | **Cumplida el 05-10-2026**: las tres capas son iguales (D251) |
| **2. Base de datos** | Esquema `srp` con las diez tablas, las de usuarios y sesiones, llaves foráneas, índices, secuencia del folio por celda y columnas de la cola de envío. Permisos de la cuenta de servicio. Alta en los respaldos | SRP (guion SQL, probado en una base local) y SIA (ejecución) | El esquema existe, la cuenta sólo ve lo suyo y `territorio` en lectura, y una restauración de prueba lo incluye |
| **3. Servicios** | Servicio del SRP en `servidor/`: usuarios y sesión, catálogos, recepción idempotente de jornadas y árboles, folio, validación, permisos, bitácora, fotografías, bandeja de duplicados, consultas de Supervisión | SRP (desarrollo y pruebas locales), con `FASE2-Y-TRASPASO.md` como especificación; el SIA lo instala | Las filas del apartado 1 de ese archivo resueltas o diferidas por escrito |
| **4. Aplicación** | Sustituir lo simulado (apartado 3 de `FASE2-Y-TRASPASO.md`): acceso, envío y folio. `ES_FICTICIO: false`. Publicar en la ruta. Retirar demostración y espejo de campos | SRP (cambios y pruebas contra el servicio local) y SIA (publicación) | La aplicación abre en la ruta definitiva, instala, trabaja sin señal y envía al volver la señal |
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
- Catálogo real de especies (79, con paleta vegetal y fruto comestible). La lista real de vehículos está fuera del repositorio y se entrega aparte.

**Falta, del lado del SRP**

- El servicio (`servidor/`): guion SQL, usuarios y sesión, permisos, recepción, folio, bandeja de
  duplicados, y la adaptación de la aplicación para usarlo. Paquete de instalación con instrucciones
  para el SIA.
- Repositorio nuevo y limpio con el mismo nombre (D249).
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
| 1 | Nombre del proyecto, ruta y esquema | — | **Decidido: `srp`** para los tres (D249) |
| 2 | Proveedor de identidad | Llave CDMX, directorio institucional o cuentas propias | **Decidido: cuentas propias** con correo y contraseña, en una base de usuarios que construye el SRP; alta y restablecimiento por la Administración global, sin servicio de correo (D249) |
| 3 | Mapa base | Esri con cuenta y clave restringida al dominio; ortofoto propia por GeoServer; OpenStreetMap de respaldo | **Decidido: CARTO para calles y Esri gratuito para satélite**; la clave de CARTO la guarda el servidor (D251) |
| 4 | Fotografías | Volumen de datos del servidor de aplicaciones; almacenamiento de objetos de la ADIP | Volumen de datos, fuera de carpeta pública, con ampliación solicitada antes del piloto (apartado 7) |
| 5 | Colonias | Las 1,837 del IECM 2022 o las 1,817 de `territorio` | **Decidido: las 1,837 del IECM 2022**, confirmadas con el archivo que entregó el SIA (D251) |
| 6 | Módulo de plantación existente | Conservar, archivar o migrar su contenido | **Decidido: convive con el SRP** hasta que éste opere; entonces se carga como histórico (fila 16) o se archiva (D251) |
| 7 | Aviso de privacidad | — | **Decidido: no se requiere** (consultado; D249) |
| 8 | Montaje del servicio | Módulo del backend central o servicio aparte | Lo decide el SIA; el servicio se construye para admitir las dos formas |
| 9 | Esquema y cuenta de servicio | Los crea el SIA con el guion del SRP, o el proyecto | Que los cree el SIA con el guion: mantiene su patrón de un esquema y una cuenta por sistema |

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
| Capas distintas entre teléfono y servidor | Árboles en otra colonia; folios de otra celda | Verificadas iguales (apartado 3); el servidor usa las mismas capas que la app |
| Proveedor de identidad que no cubre instituciones externas | Alcaldías y empresas sin acceso | Decisión 2 de la fase 0; cuentas propias como salida |
| Disco de fotografías insuficiente | El servidor rechaza capturas a media temporada | Ampliación previa y monitoreo con alerta al 70 % |
| Fotografías sin respaldo | Pérdida irreversible de evidencia | Respaldo propio del volumen antes de operar |
| Reenvíos que duplican | Doble conteo de árboles | El `id` de cada registro es la clave de idempotencia (S-01); se prueba en el piloto |
| iPhone no envía con la aplicación cerrada | Datos retenidos en el teléfono | La aplicación lo avisa; el procedimiento de cierre de jornada pide abrirla con señal |
| Administración sólo por red privada | Una falla de acceso detiene despliegues, no la captura | La aplicación sigue trabajando sin señal y envía después |
| Repositorio público con historial | Archivos originales y, en un tramo, placas reales siguen en el historial | Repositorio nuevo y limpio con el mismo nombre al iniciar la fase de servidor (D249); el repositorio se archiva y se hace privado en la fase 6 |
| Contraseñas sin servicio de correo | Una persona que olvida su contraseña no puede recuperarla sola | Restablecimiento por la Administración global con contraseña temporal de un solo uso |

## 9. Siguiente paso

Enviar al SIA este plan, `FASE2-Y-TRASPASO.md` y la huella de capas, y pedir: el esquema `srp`, la cuenta
de servicio, el lugar en el servidor de aplicaciones y la ruta; y respuesta a las decisiones 8 y 9 del
apartado 6. Las capas ya están verificadas (fase 1). Mientras responde, el servicio se
construye y se prueba en una base local (fases 2 y 3).
