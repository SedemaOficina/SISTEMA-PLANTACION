# Alineación del servidor del SRP con el backend del SIA

Revisión del 08-10-2026 contra el repositorio del backend del SIA, y del 12-10-2026 con lo que el SIA
pidió a otros proyectos (sección 6). El objetivo: que el SIA pueda copiar el módulo del SRP a su backend
casi sin tocarlo, con la misma forma que sus otros módulos. Este documento no lleva direcciones, cuentas
de equipo, versiones ni detalles de seguridad de la infraestructura del SIA.

## 1. Cómo trabaja el backend del SIA

- **El cifrado termina antes del SIA.** Un intermediario de gobierno recibe el HTTPS y lo reenvía; adentro
  todo viaja sin cifrar y el intermediario no avisa por cabecera que la petición llegó cifrada. Por eso la
  cookie del SRP es segura por configuración, no por lo que diga la petición.
- **Un servidor web es la puerta.** Sirve los sitios estáticos (la aplicación del SRP lo es) y reenvía
  `/api/` al backend. Ahí viven las cabeceras de seguridad, la compresión y los límites de velocidad y de
  subida, y ahí se corta una petición a la API que tarda más de un minuto.
- **La base vive aparte**, sin salida a internet, y sólo acepta conexiones cifradas de cuentas de servicio
  desde el servidor de aplicaciones.
- **Una base, un esquema por proyecto.** Todos los proyectos viven en la misma base. Cada proyecto tiene
  su esquema y su propia cuenta de servicio, `<esquema>_api`, sin superusuario y con un límite de
  conexiones. Esa cuenta sólo alcanza su esquema: la de un proyecto no puede leer otro, y eso se prueba
  ejecutando como la cuenta.
- **El marco territorial es compartido.** Alcaldías, colonias y malla UGA viven en el esquema
  `territorio`, de sólo lectura, y cada módulo lo lee con el rol de grupo `territorio_lectura`. Su regla:
  si el dato existiría aunque el programa no existiera, es de `territorio` y no se copia. Antes hubo tres
  copias que no coincidían.
- **Los guiones SQL** de cada módulo van en `db/<módulo>/`, numerados (`01-<módulo>-esquema`,
  `02-<módulo>-sobre-territorio`, `03-<módulo>-rol-y-grants`). Los corre quien administra la base. Cada
  guion de permisos termina con lo que debe funcionar y lo que debe fallar al correrlo como la cuenta.
- **Un solo proceso Express**, en TypeScript, empacado en un archivo. Cada módulo vive en
  `src/modulos/<módulo>/` y entrega `crearRutas<Módulo>(pool)`, que se monta en `/api/<módulo>`.
- **Una conexión por módulo**, con sus variables `<MÓDULO>_DB_USER` y `<MÓDULO>_DB_PASS`. Sin ellas el
  proceso no arranca: no hay cuenta de respaldo.
- **La base hace el trabajo.** Disparadores recalculan alcaldía, colonia y celda del punto, asignan el folio
  con una tabla contador y escriben la bitácora. Express valida la forma, pone lo que el cliente no decide y
  traduce los errores; lo interno nunca llega a la persona.
- **Fotografías** como archivos fuera de lo publicado, revisadas por su contenido y servidas por una ruta.
- **Cuentas de personas** en el esquema `acceso`: funcionarios con permiso por recurso, sesiones cortas,
  bitácora que no se edita ni se borra, y altas manuales por un guion que genera la contraseña y su hash
  en el equipo de quien administra.
- **Ya hay un módulo de plantación**, `plantacion`, que reemplazó a un sistema anterior en PHP. El SRP es
  otro módulo, aparte: convive con él sin tocarlo y lo sustituye cuando funcione; entonces el SIA retira
  el viejo.

## 2. Decisiones

| # | Decisión | Estado |
|---|---|---|
| 1 | El esquema se llama `srp`, la cuenta `srp_api` y la ruta `/api/srp`: siglas, como `jpv`, `irs` o `caec`, sin chocar con `plantacion` | Aprobada (08-10-2026) |
| 2 | El servicio pasa a TypeScript con la forma de los módulos del SIA, para copiarse tal cual | Aprobada (08-10-2026) |
| 3 | Dónde viven las cuentas de las personas: en el SRP (las da de alta la Administración global desde la aplicación) o en `acceso` del SIA | **Inclinada a esquema propio**: falta el acuerdo por escrito. Hay precedente: el 21-10-2026 el SIA instaló el Tablero de Categorías de Protección con cuentas propias que opera la Oficina de la Secretaría desde su vista de administración; el SIA sólo mantiene el servidor (D324) |

Al revisar otro proyecto con personas externas (enlaces de alcaldías, cientos de cuentas, altas que da la
oficina sin depender del SIA), el SIA se inclinó por el esquema propio, siempre que quede por escrito quién
opera las cuentas; el SIA sólo mantiene el servidor. Es el caso del SRP. Propuesta para el acuerdo: las
cuentas viven en `srp`; altas, bajas y restablecimientos los hace la Administración global del SRP
(SEDEMA) desde la aplicación. Mientras se firma, las cuentas usan el formato de contraseña y de sesión de
`acceso`, para que mudarlas, si un día se decide, sea copiar renglones sin pedir contraseñas nuevas.

## 3. Fases

1. **Hecha (bloque 197).** Guiones en `servidor/db/srp/` con la numeración del SIA. Una sola cuenta,
   `srp_api`, que hereda `territorio_lectura` y no tiene ningún permiso directo fuera de `srp`.
   `srp.derivar` lee `territorio`. Del SRP sólo queda la capa propia, las colonias prioritarias (2,243, otro
   marco de colonias). La base local lleva una réplica de las tablas de `territorio`
   (`servidor/db/local/territorio.sql`) que nunca se entrega. Las capas de la aplicación van en orden de
   clave, para que el teléfono y el servidor desempaten igual en un borde.
2. **Hecha (bloque 208).** El servicio en TypeScript, en `servidor/src/modulos/srp/`, con
   `crearRutasSrp(pool)`, conexión por `SRP_DB_USER` y `SRP_DB_PASS`, y errores traducidos como en el SIA.
   Sin dependencias que el SIA no use ya; las mismas versiones de TypeScript, `tsup` y Express. El paquete,
   como lo revisa el SIA (6.9): diff que aplica limpio sobre la versión vigente de `sia-backend`, los
   archivos completos, `npm run typecheck` sin errores y el binario del SIA probado con el módulo adentro.
   El diff lleva líneas del repositorio del SIA, así que vive sólo en `servidor/local/`, que no se sube.
   Va al SIA **para revisión**, en la versión de prueba 0.9.64 (D289): la primera instalación será la
   versión 1, con el sistema completo. **La versión 1 está lista** (bloque 235, D315): el paquete para
   instalar, sobre la versión vigente de `sia-backend` al 17-10-2026, con la aplicación real, los datos de
   arranque y el manual de la Administración global. La versión 1.1 (21-10-2026, D321 y D322) la sustituye,
   con las correcciones de la auditoría del 19-10-2026 y sus ajustes de pantalla, sobre la versión de
   `sia-backend` del 21-10-2026.
3. **El acceso con los formatos del SIA.** Ya hechos (bloque 206): contraseña con scrypt N=16384, r=8,
   p=1, en base64url; testigo de sesión de 32 bytes con su resumen sha256 en hexadecimal; la cookie
   `sia_srp_sesion`; y, en la fase 2, la primera cuenta con un guion que sólo imprime el SQL. Hechos en el
   bloque 210:
   - el registro de entradas y salidas, `srp.bitacora_acceso`, con la forma de `acceso.bitacora` y la
     procedencia del módulo común del SIA (`src/comun/procedencia.ts`), que se importa y no se copia;
   - los permisos de cada perfil impuestos en el servidor, con las reglas de la aplicación;
   - la consulta de jornadas y árboles, cada quien lo de su alcance;
   - y, en el bloque 211, los seis catálogos, que administra la Administración global con las reglas de
     la aplicación.

   El límite por procedencia (6.2) quedó hecho en el bloque 233, cuando el SIA corrigió su módulo común; la
   edición de cuentas, en el 232.
4. **La recepción como la hace el SIA.** Hecha. Hecho en el bloque 212: la recepción de jornadas y
   árboles nuevos, por envíos de hasta 100 operaciones, cada una de mucho menos de un minuto (6.3).
   - El punto se vuelve a ubicar y el folio se asigna en la misma transacción que recibe el árbol, con
     un contador por celda que sólo avanza y lo que se congela al asignarlo.
   - Un disparador impide cambiar o anular un folio, y la bitácora ya no se edita ni se borra (bloque 206).

   Hecho en el bloque 213: editar, eliminar, restaurar, sustituir y mover árboles, sin escribir sobre una
   versión vieja.

   Hecho en el bloque 214: la vida de la jornada (editarla, cerrarla, reabrirla, sus datos de cierre, el
   reporte, el relevo, los puntos revisados y eliminarla).

   Hecho en el bloque 215: las fotografías como archivos, con su estimado de espacio (6.11).

   Hecho en el bloque 229 (D309): la carga masiva por tandas, que desde el bloque 238 se arman por peso para
   caber en 100 KB.

   Lo que baja al teléfono llega por páginas de 2,000 y vive sólo en memoria (D301): no se escribe en la
   base del teléfono. Falta medirlo en un iPhone real.

## 4. Preguntas para el SIA

1. Cuentas de las personas: ¿cada proyecto con las suyas o todas en `acceso`? Si van en `acceso`, ¿la
   Administración del SRP puede dar de alta, activar y desactivar desde la aplicación, o cada alta la hace
   el SIA?
2. `territorio.colonias_iecm_2022`: ¿su columna de geometría se llama `geom`? (Se cargó desde un
   shapefile.)
3. `territorio.malla_uga_1km`: ¿es la versión final que el SIA entregó el 22-09-2026? El folio depende de
   ella. Y `territorio.alcaldia`: ¿es la misma capa de alcaldías que usa el SRP?
4. ¿Les parecen bien el esquema `srp`, la cuenta `srp_api` y la ruta `/api/srp`?
5. La aplicación es una página estática que se instala en el teléfono: ¿dónde la publican, junto a su
   API? ¿La API va en `/api/srp` o colgada de la ruta de la aplicación, como Categorías de Protección?
6. ¿Cuál es el límite de subida del servidor web para `/api/`? De él dependen las tandas de la carga
   masiva y las fotografías.

## 5. Lo que no se copia

- Los comentarios con historia (fechas, números de decisión, incidentes): el código del SRP dice qué hace
  y por qué; la historia vive en DECISIONES y BITACORA.
- Las sesiones de 30 minutos que se cierran con el navegador: un cabo trabaja horas en campo, a veces sin
  señal. En el SRP la sesión vence tras una semana sin uso; cada uso renueva la semana (decisión de Liber,
  09-10-2026).

## 6. Lo que el SIA ya pidió a otros proyectos

En octubre de 2026 el SIA revisó dos paquetes de Liber (Reforestación, el modelo de priorización, y el
Tablero de Categorías de Protección) antes de instalarlos. Lo que pidió corregir, y las conversaciones con su
equipo, aplican igual al SRP:

| # | Lo que pide el SIA | El SRP hoy | Cuándo |
|---|---|---|---|
| 1 | Un mismo 401, con el mismo mensaje y el mismo tiempo, si el correo no existe, la cuenta está inactiva o bloqueada o la contraseña es mala: si no, se averigua qué correos tienen cuenta | Así responde: 401 con el mismo mensaje, verificando la contraseña también en la cuenta bloqueada o desactivada. Sólo a quien escribió la contraseña correcta se le dice que su temporal venció | **Hecho** (bloque 206) |
| 2 | Límite de intentos por procedencia: contar sólo los fallidos, y tomar la dirección de la persona descartando los saltos conocidos, no la última de `X-Forwarded-For`, que es el intermediario y es la misma para todos. El SIA lo corrige en su módulo común (`src/comun/procedencia.ts`): se importa de ahí, no se copia | Las entradas fallidas se cuentan por dirección, con la de `procedencia.ts` del SIA, que ya salta sus intermediarios: pasadas 30 en 15 minutos (`SRP_INTENTOS_POR_PROCEDENCIA`), esa dirección espera (429) sin que se verifique nada. El bloqueo por cuenta sigue igual | **Hecho** (bloque 233) |
| 3 | Cada petición termina en menos de un minuto: el servidor web corta la API después. Una alta masiva de cuentas con un hash lento perdía las contraseñas temporales | La carga masiva va por tandas de hasta 300 árboles y 80 KB (5,000 en 14 s, medido en el bloque 229) y el envío, por lotes de hasta 100 operaciones; en la base, cada consulta de `srp_api` se cancela a los 50 s | **Hecho** (bloques 229 y 233) |
| 4 | El hash de contraseñas con los parámetros de `acceso` (scrypt N=2^14): con 2^17, diez accesos simultáneos ocupaban 1.3 GB de una memoria que comparten todos los módulos | Igual que `acceso`: `scrypt$16384$8$1$sal$derivada` en base64url, sal de 16 bytes, 64 de derivada, texto en NFKC. Las guardadas antes siguen verificando | **Hecho** (bloque 206) |
| 5 | La cookie con su ruta acotada, nunca `/`: con `/` viaja a todas las aplicaciones del dominio | `Path=/api/srp` | Bien |
| 6 | Sesiones propias de cada aplicación: con una tabla común, «cerrar sesiones» cierra también las de otra | Tabla propia, `srp.sesiones` | Bien |
| 7 | Bitácora que no se edita ni se borra, por disparador y no sólo por permisos; nada que la recorte | Disparadores que impiden editarla, borrarla o vaciarla, también a quien administra la base | **Hecho** (bloque 206) |
| 8 | Fragmento del servidor web: `absolute_redirect off` en las redirecciones; sin `Strict-Transport-Security`, que se decide para todo el dominio; la entrada de sesión con su límite de velocidad | `servidor/servidor-web/srp.conf`, con la ruta pública por confirmar (pregunta 5); desde el bloque 244, `location ^~ /srp/`, como el Tablero de Categorías de Protección, y la comprobación de `/srp/sw.js` al instalar | **Hecho** (bloques 206 y 244) |
| 9 | El paquete: ZIP con su `.sha256`, un manifiesto que cubra todas las carpetas, el cambio a `sia-backend` como diff que aplique limpio sobre su versión vigente más los archivos completos, y `npm run typecheck` sin errores | `herramientas/empaquetar.py` arma el manifiesto, el ZIP y su `.sha256`; el diff aplica limpio sobre la versión vigente y `npm run typecheck` no da errores dentro de `sia-backend` | **Hecho** (bloque 208) |
| 10 | Instalar primero la base y las variables y después el código: un módulo sin sus variables detiene el backend entero. Cada módulo en un despliegue aparte, con respaldo de la base antes | La guía de instalación de `servidor/README.md` lleva ese orden | **Hecho** (bloque 206) |
| 11 | Fotografías fuera de las carpetas publicadas, en el servidor de aplicaciones, cuyo disco es limitado y lo comparten todos los módulos | Archivos en la carpeta `SRP_FOTOS_DIR`, fuera de la base y de lo publicado, con su registro en `srp.fotografias`; `GET /fotos/uso` dice cuánto ocupan y cuánto ocuparían en un año. Estimado: un cabo con fotografía en cada árbol, de 300 a 600 MB al año | **Hecho** (bloque 215). Falta que el SIA diga la carpeta y su respaldo |
| 12 | El aviso de privacidad se confirma con la Unidad de Transparencia | Consultado: no se requiere (D249, D321) | Falta su respuesta por escrito, como constancia; el paquete lo dice en «Lo que falta antes de operar» |
| 13 | No publicar una tercera capa de colonias si sus datos caben en una que ya existe (el marco de unidades territoriales 2020 o el catálogo IECM 2022) | Prioritarias: 2,243 colonias del modelo de priorización, capa propia | **Pendiente de Liber**: de qué catálogo salen las 2,243, y si la prioridad puede ir como campo de una capa del SIA |
| 14 | La caché de teselas tiene una cuota que comparten todas las capas: no se precargan niveles amplios | El mapa base es externo y las capas viajan con la aplicación | Sin efecto hoy |
| 15 | Sin servidor de correo: la contraseña no se recupera, se restablece; la administración da una temporal de un solo uso que se cambia al primer acceso | Así funciona | Bien |
