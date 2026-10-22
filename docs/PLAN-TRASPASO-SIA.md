# Plan de traspaso al SIA

Qué hay que hacer, en qué orden y quién, para que el SRP opere en los servidores de la Secretaría.
Complementa a `FASE2-Y-TRASPASO.md`, que dice **qué** debe hacer el servidor; este archivo dice **cómo
se llega**. Elaborado el 03-10-2026 con la descripción de la infraestructura que entregó el SIA; al día al
22-10-2026.

Este repositorio es público. Aquí no se escriben direcciones de red, nombres de equipo, cuentas ni
versiones exactas de los servidores: esos datos viven en la documentación interna del SIA.

---

## 1. Punto de partida

| Pieza | Qué ofrece el SIA | Qué usa el SRP |
|---|---|---|
| Dominio | Dominio público de la Secretaría con HTTPS; el certificado lo administra y renueva la ADIP | La ruta `/srp/` bajo ese dominio. HTTPS es requisito: sin él no hay GPS, cámara ni trabajo sin señal |
| Servidor web | Proxy inverso que reparte el tráfico y sirve sitios estáticos, con historial de versiones publicadas; el cifrado termina en él | Los archivos de la aplicación (HTML, CSS, JS, capas, iconos). Es el servidor más holgado |
| Servidor de aplicaciones | Backend central en Node.js con Express; cada módulo tiene su cuenta de base de datos y no ve los datos de los demás | El servicio del SRP, construido en este proyecto (`servidor/`) como módulo del backend central (`src/modulos/srp/`), con su propia cuenta de servicio, `srp_api` (D277) |
| Base de datos | PostgreSQL con PostGIS, conexiones cifradas obligatorias, un esquema por sistema, respaldos diarios y semanales con restauración probada | El esquema `srp`, con las diez tablas del SRP más las de usuarios y sesiones |
| Correo | No hay servicio de correo | Nada: el restablecimiento de contraseñas lo hace la Administración global |
| Marco territorial | Esquema `territorio` compartido: alcaldías, colonias del IECM 2022, malla UGA y 1,817 unidades territoriales | Lee alcaldías, colonias y malla UGA, con `territorio_lectura` (D277). La aplicación lleva copias iguales para trabajar sin señal (apartado 3) |
| Servidor de mapas | GeoServer con servicios WMS, WFS y WMTS públicos | Nada por ahora. El mapa base decidido es CARTO para calles y Esri para satélite (D251); hoy los dos son de Esri |
| Acceso de administración | Sólo por la red privada de gobierno | Lo opera el SIA; el SRP no requiere acceso de administración desde fuera |

Ya existe en el SIA un módulo y un esquema de plantación. **El SRP no los reutiliza** (decisión del
03-10-2026): entra como proyecto nuevo, con su propio esquema, su propia ruta y su propia cuenta de
servicio, todos con el nombre `srp` (D249). El módulo anterior convive con el SRP hasta que éste opere;
entonces se carga como histórico o se archiva (D251).

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
**Verificación hecha el 05-10-2026 (D251): las tres capas son las mismas.** La aplicación lleva sus copias para
derivar sin señal, y el servidor lee las de `territorio` (D277); el resultado del servidor manda.

| Capa | En el SRP | En `territorio` | Estado |
|---|---|---|---|
| Alcaldías | 16 polígonos, versión `sia-2026-01-01`, clave `cvegeo` | Capa de alcaldías del servidor de mapas del SIA | **Igual**: mismas 16 claves y superficie; diferencia máxima de borde de 0.1 m (redondeo a seis decimales) |
| Colonias | **1,837** polígonos, IECM 2022, clave `clave` | Archivo que entregó el SIA | **Igual**: el archivo es idéntico al original del SRP. Las 1,817 unidades territoriales de `territorio` son otra capa; el SRP no la usa |
| Malla UGA | 1,624 celdas, versión `sia-2026-09-22`; define el folio | Archivo que entregó el SIA | **Igual**: archivo idéntico al original del SRP. Las ocho celdas con prefijo distinto a su alcaldía son correctas (D249) |
| Colonias prioritarias | 2,243 polígonos, geometría simplificada | — | Capa propia del SRP, `srp.capa_prioritarias`, que cargan los datos de arranque. Si la prioridad puede ir como campo de una capa del SIA lo decide Liber (`docs/ALINEACION-SIA.md`, § 6, fila 13) |

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
| **5. Piloto** | Una cuadrilla, una semana, datos reales. Teléfonos iPhone y Android. Revisión diaria de lo recibido contra lo capturado. Antes de empezar, el SIA confirma por escrito el respaldo diario del esquema `srp`, con su restauración de prueba, y el de la carpeta de fotografías. Cada día: la Coordinación descarga la tabla de Supervisión en CSV y las fotografías en ZIP a una carpeta de la Secretaría; nadie termina el día sin que la pastilla diga «Al día»; en iPhone, la aplicación va en la pantalla de inicio (D323) | Oficina de la Secretaría, Reforestación Urbana y SIA | Cero árboles perdidos o duplicados; folios consecutivos por celda; reporte de jornada conforme |
| **6. Operación** | Alta de cuentas y catálogos reales, vehículos incluidos. Carga del histórico. Monitoreo de disco de fotografías. Archivo del repositorio público | SIA | Todas las cuadrillas capturan en producción; el repositorio de GitHub queda privado y archivado |

Al 21-10-2026, lo que toca al SRP de las fases 2 a 4 está hecho y va en el paquete de la versión 1.1 (D315,
D321, D322): falta que el SIA lo instale. Después siguen el piloto y la operación.

## 5. Qué está listo y qué falta

**Listo en este repositorio**

- Guion SQL del esquema `srp` (fase 2 de este plan, del lado del SRP): `servidor/db/srp/instalar.sql`, con
  la forma de los módulos del SIA (cuenta `srp_api`, capas de `territorio`), probado en una base local; ver
  `servidor/README.md` y `docs/ALINEACION-SIA.md` (D254, D277). La derivación de alcaldía, colonia y celda
  UGA en el servidor lee `territorio` y está comprobada contra la aplicación con 17,479 árboles (D255).

- Aplicación completa de captura, jornadas, reportes, supervisión, catálogos, cuentas y permisos, con
  pruebas automáticas y auditorías (`pruebas/`).
- Modelo de datos: `datos/esquema.json`, diccionario (`datos/DICCIONARIO-DATOS.md`) con el borrador de
  tablas para PostgreSQL, y mapeo de campos a pantalla (`datos/MAPEO-CAMPOS.md`).
- Especificación del servidor: `docs/FASE2-Y-TRASPASO.md`.
- Reglas de permisos en un solo archivo (`js/permisos.js`), para replicarlas en el servidor.
- Huella de capas y herramienta de comparación (apartado 3).
- Catálogo real de especies (79, con paleta vegetal y fruto comestible). La lista real de vehículos está fuera del repositorio y se entrega aparte.

- El servicio (`servidor/`) y la aplicación conectada a él: cuentas y sesión, permisos, recepción, folio,
  fotografías, parámetros, bandeja de duplicados y carga masiva (D292 a D312). El paquete de instalación con
  sus instrucciones, desde la versión 1 (D315), corregido con los siete bloques de la auditoría del 19-10-2026
  (D316 a D322).
- Las pruebas corren en GitHub en cada subida (D320).

**Falta, del lado del SRP**

- Paquete de traspaso (apartado 7 de `FASE2-Y-TRASPASO.md`): la especificación consolidada
  (`ESPECIFICACION.md`) y la documentación de proceso al archivo (`docs/historial/`). Los comentarios sin
  historia ya están (D275, D276). Se hace al terminar las correcciones de la auditoría del 19-10-2026.
- El paso de las teselas de CARTO por el servidor, con su clave (D251). Hoy «Calles» es de Esri.
- Prueba en iPhone y Android reales.
- Las pruebas automáticas también en WebKit (Safari).

**Falta, del lado del SIA**

- Instalar el paquete, cuyo LEEME trae los pasos y las preguntas abiertas, y lo del apartado 4 de
  `FASE2-Y-TRASPASO.md`. Después, con la Secretaría, el piloto y la operación (fases 5 y 6).

## 6. Decisiones que hay que tomar en la fase 0

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| 1 | Nombre del proyecto, ruta y esquema | — | **Decidido: `srp`** para los tres (D249) |
| 2 | Proveedor de identidad | Llave CDMX, directorio institucional o cuentas propias | **Decidido: cuentas propias** con correo y contraseña, en una base de usuarios que construye el SRP; alta y restablecimiento por la Administración global, sin servicio de correo (D249). El SIA se inclina por el esquema propio; falta el acuerdo por escrito de quién opera las cuentas (`docs/ALINEACION-SIA.md`, decisión 3). Hay precedente: el Tablero de Categorías de Protección, instalado el 21-10-2026 con cuentas que opera la Secretaría (D324) |
| 3 | Mapa base | Esri con cuenta y clave restringida al dominio; ortofoto propia por GeoServer; OpenStreetMap de respaldo | **Decidido: CARTO para calles y Esri gratuito para satélite**; la clave de CARTO la guarda el servidor (D251) |
| 4 | Fotografías | Volumen de datos del servidor de aplicaciones; almacenamiento de objetos de la ADIP | **Decidido: archivos en el servidor de aplicaciones**, fuera de lo publicado (D295); la ampliación se solicita antes de la operación plena (apartado 7) |
| 5 | Colonias | Las 1,837 del IECM 2022 o las 1,817 de `territorio` | **Decidido: las 1,837 del IECM 2022**, confirmadas con el archivo que entregó el SIA (D251) |
| 6 | Módulo de plantación existente | Conservar, archivar o migrar su contenido | **Decidido: convive con el SRP** hasta que éste opere; entonces se carga como histórico (fila 16) o se archiva (D251) |
| 7 | Aviso de privacidad | — | **Decidido: no se requiere** (consultado con la Unidad de Transparencia; D249, D321). Falta su respuesta por escrito, como constancia |
| 8 | Montaje del servicio | Módulo del backend central o servicio aparte | **Aprobado: módulo del backend central** (`src/modulos/srp/`), con la forma de los módulos del SIA (08-10-2026, D277) |
| 9 | Esquema y cuenta de servicio | Los crea el SIA con el guion del SRP, o el proyecto | Así va en el paquete: el SIA corre `instalar.sql`, como en sus demás módulos |

## 7. Capacidad

- **Fotografías.** Son opcionales, una por árbol, de 800 × 600 px y entre 60 y 120 KB. Diez mil árboles con
  fotografía ocupan de 0.6 a 1.2 GB; cien mil, de 6 a 12 GB. El disco del servidor de aplicaciones se
  comparte con otros sistemas: alcanza para el piloto, y **la ampliación se solicita a la ADIP antes de la
  operación plena**, con lo que mida `GET /api/srp/fotos/uso` en el piloto.
- **Base de datos.** Sin fotografías, cada árbol pesa menos de 1 KB. Cien mil árboles con su bitácora caben
  en decenas de MB: no requiere ampliación.
- **Servidor de aplicaciones.** Verificar el espacio libre de su disco de sistema antes de instalar el
  módulo nuevo.
- **Servidor web y de mapas.** Holgados para los archivos de la aplicación (menos de 10 MB). La caché de
  teselas, si se usa ortofoto propia, sí requiere disco.
- **Respaldos.** El esquema nuevo entra al respaldo de la base. Las fotografías viven fuera de la base:
  hay que confirmar, antes del piloto, que ese volumen queda cubierto por un respaldo (D323).

## 8. Riesgos

| Riesgo | Efecto | Cómo se atiende |
|---|---|---|
| Capas distintas entre teléfono y servidor | Árboles en otra colonia; folios de otra celda | Verificadas iguales (apartado 3); el servidor usa las mismas capas que la app |
| Proveedor de identidad que no cubre instituciones externas | Alcaldías y empresas sin acceso | Decisión 2 de la fase 0; cuentas propias como salida |
| Disco de fotografías insuficiente | El servidor rechaza capturas a media temporada | Ampliación previa y monitoreo con alerta al 70 % |
| Fotografías sin respaldo | Pérdida irreversible de evidencia | Respaldo propio del volumen antes del piloto (D323) |
| Falla de la base durante el piloto | Se pierde lo recibido desde el último respaldo: el teléfono no guarda lo enviado (S-11) | Respaldo diario con restauración de prueba, confirmado antes del piloto, y la descarga diaria de la Coordinación (D323) |
| Reenvíos que duplican | Doble conteo de árboles | El `id` de cada registro es la clave de idempotencia (S-01); se prueba en el piloto |
| iPhone no envía con la aplicación cerrada | Datos retenidos en el teléfono | La aplicación lo avisa; el procedimiento de cierre de jornada pide abrirla con señal |
| Administración sólo por red privada | Una falla de acceso detiene despliegues, no la captura | La aplicación sigue trabajando sin señal y envía después |
| Repositorio público con historial | Archivos originales y, en un tramo, placas reales en el historial | Atendido: el repositorio es nuevo y limpio desde el 02-10-2026 (D253); se archiva y se hace privado en la fase 6 |
| Contraseñas sin servicio de correo | Una persona que olvida su contraseña no puede recuperarla sola | Restablecimiento por la Administración global con contraseña temporal de un solo uso |

## 9. Siguiente paso

Entregar al SIA el paquete de la versión 1.1, que trae sus instrucciones de instalación, y pedirle las
respuestas de sus «Preguntas abiertas», entre ellas la del respaldo (pregunta 7). Con el sistema instalado y
el respaldo confirmado, el piloto (fase 5).
