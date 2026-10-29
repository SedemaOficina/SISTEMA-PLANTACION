# Servidor del SRP

El servicio del Sistema de Registro de Plantaciones: recibe lo que capturan los teléfonos, da el acceso
con cuentas propias, emite los folios y responde las consultas de Supervisión. Se construye como módulo
independiente, para montarse en el servidor de aplicaciones del SIA (Node.js con Express) o correr como
servicio aparte, sobre PostgreSQL con PostGIS. Qué debe hacer está en `docs/FASE2-Y-TRASPASO.md`; cómo
se llega al SIA, en `docs/PLAN-TRASPASO-SIA.md`.

Estado: **versión 1, el sistema completo**, en TypeScript y con la forma de un módulo de `sia-backend`: el
acceso con cuentas propias, los permisos por perfil e institución, la administración de cuentas, catálogos y
parámetros, la recepción de jornadas y árboles con su folio, las fotografías, la bandeja de posibles
duplicados, la carga masiva y las consultas. Se entrega al SIA en un paquete de instalación (abajo, «Instalar
en el SIA»).

## El código

| | |
|---|---|
| `src/modulos/srp/` | **El módulo**, lo único que viaja al SIA: se copia tal cual a `sia-backend/src/modulos/srp/`. `crearRutasSrp(pool)` da sus rutas; el backend central lo monta en `/srp/api` con su propia conexión, la de `SRP_DB_USER` y `SRP_DB_PASS` |
| `src/independiente.ts` | El módulo fuera del SIA, para desarrollo y pruebas: la conexión local (con el archivo de contraseñas del equipo y, si se pide, asumiendo `srp_api`) y una aplicación que lo monta |
| `src/comun/procedencia.ts` | Fuera del SIA, sustituye al módulo común de procedencia de `sia-backend`, que el módulo importa para su registro de entradas y su límite por procedencia, con el mismo criterio: la dirección es la primera que no es de un intermediario propio. No viaja: en el SIA se usa el suyo |
| `src/iniciar.ts` | Arranca el módulo solo |
| `deploy/srp-cuenta-inicial.mjs` | La primera Administración global: imprime el SQL del alta, sin dependencias |
| `datos-arranque.js` | El guion SQL de los datos de arranque que va al SIA: catálogos de arranque, especies, vehículos y la capa propia |
| `bd.js`, `cargar.js` | La conexión de quien administra la base local y la carga de datos |
| `dist/` | Lo que compila `tsup`; no se guarda en el repositorio |

Se escribe como el resto de `sia-backend`: Express 5, TypeScript estricto con la misma configuración
(`tsconfig.check.json`) y empaquetado con `tsup`. Los errores los traduce `errores.ts`, como en los demás
módulos: la persona ve un mensaje claro, el detalle sólo va al registro del servidor, y una base caída
responde 503.

| Orden | Qué hace |
|---|---|
| `npm run typecheck` | Revisa los tipos, como lo hace el SIA antes de compilar |
| `npm run build` | Compila a `dist/` |
| `npm test` | Compila y corre las pruebas contra la base local |
| `npm run iniciar` | Compila y arranca el módulo solo |

## La base de datos

El SRP vive en la base compartida del SIA como un módulo más, con la misma forma que los demás: su propio
esquema, `srp`, y su propia cuenta de servicio, `srp_api`, que no ve los esquemas de otros proyectos. Las
capas que no son del programa —alcaldías, colonias del IECM y malla UGA— las lee del esquema compartido
`territorio`, de sólo lectura, con el rol de grupo `territorio_lectura`; el SRP no guarda copia. Las diez
tablas son las mismas del teléfono —mismos nombres de tabla y de campo, sin capa de traducción— y se
generan del diccionario de datos; lo que es propio del servidor va aparte.

Los guiones están en `db/srp/`, con la numeración de los módulos del SIA, para copiarse tal cual a su
repositorio:

| Guion | Qué hace |
|---|---|
| `db/srp/01-srp-esquema.sql` | Comprueba que estén PostGIS, `territorio` y `territorio_lectura`; crea el esquema `srp`, la tabla de versiones y el sello de los datos (`srp.sello`). Si el esquema ya está instalado, se detiene sin tocar nada |
| `db/srp/02-srp-tablas.sql` | Las diez tablas, con sus llaves, reglas, índices y comentarios. **Generado**: no se edita a mano |
| `db/srp/03-srp-acceso.sql` | Contraseñas (sólo derivadas con sal, nunca en claro), sesiones (sólo el resumen del testigo) y el registro de entradas; las dos bitácoras, que sólo crecen, y `srp.recortar_acceso`, la única excepción: borra el registro de entradas y las sesiones terminadas de hace más de un año |
| `db/srp/04-srp-sobre-territorio.sql` | La capa propia (colonias prioritarias), el índice espacial de árboles y jornadas, `srp.derivar`, que da alcaldía, colonia y celda UGA de un punto sobre `territorio` con las mismas reglas que la aplicación, el folio (la secuencia de cada celda y lo que se congela con cada folio) y la prioridad de la colonia, congelada con cada árbol y cada jornada |
| `db/srp/05-srp-fotografias.sql` | El registro de las fotografías: de qué árbol es cada una, su tipo, su peso, su huella y quién la mandó. Los archivos viven fuera de la base |
| `db/srp/06-srp-parametros.sql` | Los parámetros que la Administración global cambió; los de arranque los dice el módulo |
| `db/srp/07-srp-duplicados.sql` | `srp.vecinos`, que busca los árboles cercanos de la misma especie que podrían ser el mismo, y la bandeja de posibles duplicados entre instituciones |
| `db/srp/08-srp-cargas.sql` | Los lotes de carga masiva: subiendo (no se ven), completos (se ven) o deshechos (ocultos, con sus árboles eliminados), y `srp.de_carga_oculta`, que dice si una jornada no se ve |
| `db/srp/09-srp-calles.sql` | La calle de cada árbol sobre `territorio.calles`: `srp.calle`, con la versión vigente de la capa (`srp.version_calles`: la de `territorio.version_capa` y, si el SIA no la registró ahí, la del paquete), el disparador que la pone al recibir el árbol y al corregir su punto, y el procedimiento `srp.recalcular_calles`, para después de instalar la capa, por tandas de 2,000 confirmadas una por una. Sin la capa, el árbol queda por asignar |
| `db/srp/10-srp-rol-y-grants.sql` | La cuenta `srp_api`, sin contraseña, con sus permisos mínimos y `territorio_lectura`; la versión 1 del esquema. Al final, la verificación para correr como la cuenta: lo que debe funcionar y lo que debe fallar |
| `db/srp/instalar.sql` | Corre los anteriores en orden, en una sola transacción |
| `db/srp/vaciar-tras-prueba.sql` | **No es de la instalación.** Se corre una sola vez, después de la prueba en campo con datos ficticios: `psql -d <base> -v ON_ERROR_STOP=on -v confirmar=VACIAR-SRP -f vaciar-tras-prueba.sql`. Sin la confirmación no toca nada. Borra jornadas, árboles, registros de fotografías, folios (vuelven a empezar en 1), duplicados, prioridades, cargas y lo que la bitácora dice de ellos; conserva cuentas, catálogos, parámetros y el registro de entradas; cambia el sello de los datos. La carpeta `SRP_FOTOS_DIR` se vacía aparte. La cuenta del servicio no lo puede correr |

Todos los corre quien administra la base, que queda como dueño de lo que se crea. `02-srp-tablas.sql` sale
de `datos/esquema.json` con `python herramientas/generar_sql.py`; si el diccionario cambia, se vuelve a
generar, y `pruebas/auditoria.py` falla si quedó atrasado.

Las tablas guardan latitud y longitud, como el teléfono. El punto geográfico se calcula con
`srp.punto(lat, lng)` y tiene índice espacial, sin agregar campos a las tablas. Donde dos polígonos
empatan en un borde gana la clave menor, en el servidor y en la aplicación, que lleva sus capas en orden
de clave.

### Permisos de srp_api

- Usa el esquema, pero no crea, altera ni borra tablas, ni dentro ni fuera de él.
- Lee, agrega y cambia renglones de las tablas de datos, y borra sólo lo que el sistema permite borrar: un
  valor de catálogo o una cuenta sin uso, y una jornada sin árboles. Un árbol no se borra: se marca
  eliminado; una sesión se cierra; un lote de carga masiva se marca deshecho. Al borrar una cuenta, la base
  se lleva su contraseña y sus sesiones.
- Cada consulta suya termina en 50 segundos o se cancela (`statement_timeout`): el servidor web corta la API
  al minuto, y así nada sigue corriendo en la base después.
- Lee y cambia los parámetros, y agrega registros de fotografías sin cambiarlos ni borrarlos.
- Anota en la bandeja los posibles duplicados y los marca revisados; no los borra.
- Avanza la secuencia de folios de cada celda y agrega folios; un folio emitido no lo cambia ni lo borra,
  y los disparadores lo impiden también a quien administra la base.
- A las bitácoras, la de cambios y la de entradas, sólo les agrega renglones: no las edita ni las borra.
  Sus disparadores lo impiden también a quien administra la base. Una cuenta que ya intentó entrar no se
  elimina: su registro de entradas la sostiene, y se desactiva.
- Una vez al día, con la primera entrada, llama a `srp.recortar_acceso()`: el registro de entradas y las sesiones
  terminadas se guardan un año. Es la única excepción del disparador de la bitácora, y sólo esa función la hace.
- Lee `territorio` y la capa propia; `srp.punto`, `srp.derivar`, `srp.prioridad`, `srp.especie_clave` y
  `srp.vecinos` las puede usar. No escribe en ninguna.
- No tiene ningún permiso directo fuera de `srp`.

### Instalar en el SIA

En este orden, que es el que pide el SIA: un módulo sin sus variables detiene el backend entero, así que
la base y las variables van antes que el código. Un módulo por despliegue.

1. **Respaldo de la base.**
2. **Guiones**, conectado a la base como quien la administra, desde `db/srp/`:
   `psql -d <base> -v ON_ERROR_STOP=on -f instalar.sql`. Corre todo en una transacción y se detiene sin
   tocar nada si el esquema ya estaba instalado.
3. **La cuenta:** contraseña de `srp_api` de forma interactiva (`\password srp_api` en psql), para que no
   quede en ningún registro; su entrada cifrada sólo desde el servidor de aplicaciones; y `SRP_DB_USER` y
   `SRP_DB_PASS` en el archivo de entorno del backend.
   **Las fotografías:** una carpeta en el servidor de aplicaciones, fuera de lo que se publica, donde el
   backend pueda escribir, con su propio respaldo, y `SRP_FOTOS_DIR` con su ruta. Sin ella el módulo
   arranca igual y las fotografías responden que no están disponibles.
4. **Verificación:** la del final de `10-srp-rol-y-grants.sql`, corrida como `srp_api`.
5. **La calle:** si `territorio.calles` ya está instalada, `CALL srp.recalcular_calles();` como quien administra la base, fuera de
   una transacción abierta: confirma cada tanda de 2,000 árboles, y si se interrumpe, se vuelve a correr y sigue. Si la capa se
   instala después, se corre entonces. En la base local de desarrollo, la capa se instala con el `instalar.sql` del paquete
   calles-cdmx (`db/territorio_calles/`); las pruebas del servidor la necesitan.
5. **Datos de arranque:** `psql -d <base> -v ON_ERROR_STOP=on -f srp-datos-arranque.sql`, como quien
   administra la base. El guion lo escribe `node datos-arranque.js <guion.sql> <vehiculos.csv>`: los
   programas, áreas, instituciones y solicitantes de `assets/catalogos/catalogos-arranque.js`, las especies,
   los vehículos del CSV y la capa propia. Va en una transacción y agrega lo que falte, así que correrlo otra
   vez no cambia nada. Lleva las placas reales: vive sólo en el paquete.
6. **El código:** `src/modulos/srp/` en `sia-backend`, su conexión en `src/db.ts` y su montaje en
   `src/index.ts`; `npm run typecheck`, `npm run build` y el despliegue. Al arrancar, el backend reporta
   el módulo conectado como `srp_api`, sin superusuario.
7. **El servidor web y la aplicación:** `servidor-web/srp.conf`, que el SIA integra (rutas de disco y
   destino suyos, y `location ^~ /srp/`, para que ninguna regla de expresión regular del `server` se quede con
   archivos de la aplicación), y la copia de la aplicación que arma `python herramientas/preparar_produccion.py
   <carpeta>`: con datos reales y sin los archivos de prueba. Después, `/srp/sw.js` debe responder JavaScript:
   si responde `text/html`, el servidor da la página que da a cualquier dirección que no conoce y el bloque
   no se aplicó.
8. **La primera cuenta:** con `deploy/srp-cuenta-inicial.mjs` (ver abajo).

**Revertir**, en el orden contrario. Un paso que falla al instalar se detiene ahí: `instalar.sql` corre en una
transacción y no deja nada a medias, y se vuelve al respaldo del paso 1.

1. **El servidor web:** quitar `srp.conf` y recargar. La aplicación deja de publicarse; lo que los teléfonos
   no enviaron se queda en ellos.
2. **El backend:** desplegar el binario anterior, o deshacer el cambio (`git apply -R backend/srp.diff`),
   compilar y desplegar. Sin el módulo, las variables `SRP_*` no se leen.
3. **La base:** restaurar el respaldo del paso 1. Sólo antes de operar: después, restaurarlo borra lo que el
   SRP recibió desde entonces. Ya en operación se revierte el código y la base se queda.
4. **Las fotografías:** la carpeta de `SRP_FOTOS_DIR` va con la base. Si se restauró el respaldo de antes de
   instalar, se puede retirar.

El paquete (hoy, el de la versión 1.1) lleva todo eso: `app/`, `db/srp/`, `datos/srp-datos-arranque.sql`, `backend/`
(el diff y los archivos completos), `deploy/`, `servidor-web/`, el manual de la Administración global en
`manual/`, `VERSION` y su `LEEME.md` con estos pasos, agrupados en cinco. El paquete se arma con
`python herramientas/empaquetar.py <carpeta>`: escribe el manifiesto
con la suma de cada archivo de todas las carpetas, el ZIP y su `.sha256`. Antes de escribir nada se detiene
si el paquete trae archivos de trabajo (respaldos, temporales, bitácoras) o si algún archivo parece llevar una
dirección interna, una llave o una contraseña. Un aviso revisado que no es un secreto se anota en
`AVISOS-REVISADOS.txt`, en la raíz del paquete, con la suma del archivo y el motivo; si el archivo cambia, el
aviso vuelve a detenerlo. La lista viaja en el paquete. Pide `VERSION` en la raíz del paquete y la misma
versión en su LEEME: un paquete para instalar va en 1 o más; uno que el SIA sólo revisa puede ir en 0.N,
con `--revision` y diciéndolo en el LEEME. El cambio a `sia-backend` (un diff y los
archivos completos) se arma sobre una copia del repositorio del SIA y lleva líneas suyas: vive sólo en
`servidor/local/`, que no se sube.

**La entrega va por GitHub** (D325), como la del Tablero de Categorías de Protección: el paquete es un repositorio
privado aparte, `srp-sia`, cuya copia de trabajo es `servidor/local/srp-sia/`. Cada entrega es un commit con su
etiqueta `entrega-AAAA-MM-DD`, y el SIA la baja por la etiqueta. Para una entrega nueva se actualizan los archivos,
se corre `empaquetar.py` sobre esa carpeta (se salta `.git`; el ZIP que escribe al lado queda como copia), y se
suben sólo `main` y la etiqueta nueva. Su `.gitattributes` guarda cada archivo tal cual: sin él, git en Windows
cambiaría los saltos de renglón y las sumas del manifiesto no coincidirían en el SIA. El diff y los archivos
completos se arman sobre una copia de `sia-backend` bajada con `git -c core.autocrlf=false archive`, para que
sus archivos queden byte por byte como en su repositorio.

## El servicio: acceso, cuentas, catálogos, consultas y recepción

En el SIA lo monta el backend central como los demás módulos: `app.use("/api/srp", crearRutasSrp(poolSrp))`. El
navegador lo ve en `/srp/api/`, dentro de la ruta de la aplicación: el servidor web pasa `/srp/api/` a `/api/srp/`, como
con Categorías, y la cookie va acotada a `/srp/api` (`SRP_RUTA`). Fuera del SIA, `npm run iniciar` lo arranca solo, en
`SRP_PUERTO` (3100), bajo `/api/srp`, y `pruebas/servir.py` hace la misma traducción. La configuración, toda por
variables de entorno, está explicada en `src/modulos/srp/config.ts`. Las respuestas de error llevan
`{ codigo, mensaje }`: el código lo lee la aplicación y el mensaje lo ve la persona.

| Ruta | Qué hace | Quién |
|---|---|---|
| `POST /acceso/entrar` | Correo y contraseña; abre la sesión con una cookie sólo HTTP, del mismo sitio y sólo para la API | Cualquiera |
| `POST /acceso/salir` | Cierra la sesión de este equipo | Con sesión |
| `GET /acceso/yo` | La cuenta de la sesión y si debe cambiar su contraseña | Con sesión |
| `POST /acceso/contrasena` | Cambia la contraseña; cierra las demás sesiones de la cuenta | Con sesión |
| `POST /cuentas` | Alta con contraseña temporal, que se responde una sola vez | Administración global |
| `PUT /cuentas/:id` | Edición: nombre, institución, área, cargo, perfil y coordinadores, con la versión de la cuenta; el correo no cambia | Administración global |
| `POST /cuentas/:id/restablecer` | Otra contraseña temporal; cierra las sesiones de la cuenta | Administración global |
| `POST /cuentas/:id/estado` | Activa o desactiva; desactivar cierra sus sesiones. La última Administración global activa no se desactiva | Administración global |
| `GET /cuentas/usos` | En qué aparece cada cuenta: árboles, jornadas, otras cuentas (y los cabos que coordina), catálogos y si ya entró al sistema | Administración global |
| `DELETE /cuentas/:id` | Elimina una cuenta que no aparece en nada y nunca entró; la que aparece, se desactiva | Administración global |
| `GET /catalogos` | Los seis catálogos completos, también lo inactivo | Con sesión |
| `GET /catalogos/:tabla/usos` | Cuántos árboles, jornadas y cuentas usan cada valor | Administración global |
| `POST /catalogos/:tabla` | Alta de un valor | Administración global |
| `PUT /catalogos/:tabla/:id` | Edición (en instituciones, sólo el nombre), con la versión del valor | Administración global |
| `POST /catalogos/:tabla/:id/estado` | Activa o desactiva | Administración global |
| `DELETE /catalogos/:tabla/:id` | Elimina un valor sin uso | Administración global |
| `POST /envios` | Lo que manda el teléfono: jornadas y árboles nuevos, con su folio, y lo que después se les hace | Según la operación |
| `PUT /fotos/:id` | La fotografía de un árbol; `id` es su `foto_id`. Se revisa entera y se guarda sin los datos de la cámara | Quien puede editar el árbol |
| `GET /fotos/:id` | La fotografía | Quien ve el árbol y descarga fotografías |
| `GET /fotos/uso` | Cuántas fotografías hay, cuánto ocupan y cuánto ocuparían en un año | Administración global |
| `GET /cuentas` | Las cuentas que ve cada quien, para decir quién registró qué; sólo la Administración global ve el correo | Con sesión |
| `GET /parametros` | Los parámetros, con su valor vigente, el de arranque y su rango | Con sesión |
| `PUT /parametros/:clave` | Cambia un parámetro para todos los teléfonos | Administración global |
| `GET /duplicados` | La bandeja de posibles duplicados entre instituciones, por páginas | Administración global |
| `POST /duplicados/revision` | Marca parejas como el mismo árbol o árboles distintos | Administración global |
| `GET /jornadas` | Las jornadas de su alcance, por páginas | Con sesión |
| `GET /jornadas/:id` | Una jornada de su alcance con los árboles que ve de ella, para tenerla al día sin traer todo | Con sesión |
| `GET /plantaciones` | Los árboles de su alcance, por páginas, sin la fotografía | Con sesión |
| `GET /plantaciones/:id/historial` | Lo que se le hizo a un árbol, en orden; de otro árbol, como si no existiera | Quien ve el árbol |
| `PUT /cargas/:id/tandas/:n` | Una tanda de un lote de carga masiva, hasta 400 árboles con las jornadas que estrena; todo o nada. Una carga a la vez | Administración global |
| `POST /cargas/:id/completa` | El lote llegó entero: desde ahora se ve | Administración global |
| `GET /cargas` | Los lotes de carga masiva, lo más reciente primero | Administración global |
| `DELETE /cargas/:id` | Deshace un lote: lo oculta y elimina sus árboles, sin borrar nada | Administración global |
| `GET /cambios` | El registro de cambios de cuentas, catálogos y parámetros, y las cargas masivas, lo más reciente primero, por páginas | Administración global |

- **Contraseñas:** sólo se guarda lo que deriva scrypt, con sal, nunca la contraseña, en el formato del
  módulo `acceso` del SIA (`scrypt$16384$8$1$sal$derivada`, en base64url): si un día las cuentas se mudan
  a `acceso`, se copian sin pedir contraseñas nuevas. Al menos 10 caracteres, con letras y números, sin el
  correo. No hay servicio de correo: la Administración global
  da una temporal (vale 72 horas) que sólo sirve para entrar a escribir una propia; mientras tanto no se
  puede hacer nada más.
- **Bloqueo:** 5 intentos fallidos seguidos bloquean la cuenta 15 minutos, o hasta que la Administración
  restablezca la contraseña. Cada intento se anota en la base antes de verificar la contraseña, en un solo
  paso: muchos intentos al mismo tiempo no pasan del máximo. Escribir mal la contraseña actual al
  cambiarla cuenta igual.
- **Límite por procedencia:** las entradas fallidas también se cuentan por dirección. Pasadas 30 en 15
  minutos, esa dirección recibe 429 («Hubo demasiados intentos fallidos desde esta conexión…») sin que se
  verifique nada, y lo que espera no se anota. La dirección la da el módulo común de procedencia del SIA;
  si un día diera la misma para todos, `SRP_INTENTOS_POR_PROCEDENCIA=0` apaga el límite.
- **Toda entrada fallida responde igual**, con el mismo 401 y el mismo tiempo: el correo no existe, la
  cuenta o su institución están desactivadas, la cuenta está bloqueada o la contraseña es mala. Así lo hace
  `acceso`: si se distinguieran, se sabría qué correos tienen cuenta. Sólo a quien escribió la contraseña
  correcta se le dice que su temporal venció.
- **Sesiones:** un testigo de 32 bytes en la cookie `sia_srp_sesion`; en la base, sólo su resumen sha256 en
  hexadecimal, como en `acceso`. Vencen tras una semana sin uso; cada uso renueva la semana y no hay límite
  total. Una
  sesión vencida responde `SESION_VENCIDA`: la aplicación vuelve a pedir la contraseña sin perder lo
  capturado. Desactivar la cuenta o su institución, o cambiar o restablecer la contraseña, cierra sus
  sesiones. La cookie dura 400 días, lo más que admiten los navegadores: quien decide es el servidor.
- **Primera cuenta:** como da las suyas el SIA. En una base recién instalada, quien la administra corre
  `node deploy/srp-cuenta-inicial.mjs <correo> "<nombre completo>" "<cargo>" | psql -d <base> -v ON_ERROR_STOP=on`
  en su propia terminal. El guion calcula el resumen en ese equipo e imprime sólo el SQL del alta; la
  contraseña temporal sale una sola vez, por la salida de errores, y nunca toca la base. Se niega si ya
  hay una Administración global: las demás cuentas se dan de alta desde la aplicación.

- **Registro de entradas:** cada intento de entrar, logrado o no, cada bloqueo, cada salida y cada cambio
  de contraseña queda en `srp.bitacora_acceso`, con la procedencia y el navegador, como en `acceso.bitacora`
  del SIA. Un correo sin cuenta se anota tal como se intentó; lo que no tiene forma de correo, como «(no es un
  correo)», para que una contraseña escrita en ese campo no quede guardada. La procedencia la da el módulo común
  del SIA. Se guarda un año.

Los plazos, el largo mínimo, el bloqueo y el límite por procedencia son variables de entorno
(`src/modulos/srp/config.ts`): se cambian sin tocar código. Un valor mal escrito no detiene el backend: se
usa el de arranque y se avisa en el registro del servidor.

### Catálogos

Programas, áreas, especies, vehículos, instituciones y solicitantes (`:tabla` es el nombre de su tabla),
con las reglas del editor de catálogos de la aplicación (`js/catalogos.js`). Una prueba compara la
validación con la de la aplicación caso por caso.

- La clave de instituciones, solicitantes y vehículos la pone el sistema: la de las dos primeras sale del
  nombre y se completa con `_2`, `_3`… si ya existe; la del vehículo es la placa sin espacios. La de
  especies es el consecutivo `ESP-0000`, que también es su identificador. La de programas y áreas la da
  quien administra.
- Los nombres no se repiten aunque cambien acentos o mayúsculas; las placas, aunque cambien los espacios.
- Un valor con uso no se elimina: se desactiva, deja de ofrecerse y los registros que lo usan no cambian.
  Al intentarlo, se dice dónde aparece: «aparece en 12 árboles y 3 jornadas».
- Las instituciones no se eliminan, y su tipo se fija al darlas de alta. Las 16 alcaldías ya vienen
  dadas de alta: no se agregan ni se renombran, sólo se activan y desactivan. La Secretaría no se
  desactiva.
- Cada cambio va a la bitácora como lo anota la aplicación: alta, edición con los campos que cambiaron,
  activación, desactivación y eliminación.

### Recepción y folio

`POST /envios` recibe hasta 100 operaciones por vez (el teléfono manda hasta 80 KB de JSON por envío: el backend del
SIA corta el JSON en 100 KB), en el orden en que se hicieron, cada una con el nombre
de la acción de permisos que la autoriza, o de lo que hace: para las jornadas, `jornada.crear`,
`jornada.editar`, `jornada.cerrar`, `jornada.reabrir`, `jornada.revisar`, `jornada.cierre`,
`jornada.reporte`, `jornada.relevo`, `jornada.compartir`, `jornada.terminar` y `jornada.eliminar`; para los árboles, `registro.crear`,
`registro.editar`, `registro.eliminar`, `registro.restaurar`, `registro.sustituir` y `registro.mover`. La
lista completa, con lo que lleva cada una, está al principio de `src/modulos/srp/recepcion.ts`. Cada operación va en su
propia transacción, así que una rechazada no detiene a las demás. La respuesta dice, para cada una, si
quedó recibida —con el renglón como lo guardó el servidor— o rechazada y por qué, con los mensajes de los
formularios de la aplicación. Reenviar una operación ya recibida no duplica nada: el id del registro es la
clave, y la respuesta es la misma.

**El sello de los datos.** `POST /acceso/entrar` y `GET /acceso/yo` responden también el sello de `srp.sello`, y el
teléfono lo manda en la cabecera `X-SRP-Sello` con todo lo que envía (`src/modulos/srp/sello.ts`). El guion de vaciado
lo cambia: un envío con el sello de antes se responde `409 SELLO_DISTINTO`, con el vigente, y el teléfono borra lo que
guardaba en lugar de reenviarlo. Sin cabecera se atiende como siempre; el acceso no se revisa.

- El servidor no se queda con lo que calcula el teléfono: vuelve a ubicar el punto con `srp.derivar`, y
  pone el autor, la institución, el estado y el programa del árbol, que es el de su jornada.
- La jornada se revisa como en «Iniciar jornada»: nombre, punto dentro de la Ciudad, programa disponible
  para la institución, solicitud completa con «Solicitud especial», árboles previstos y fecha no futura.
- El árbol, como en «Registrar árbol»: punto, especie del catálogo o escrita, y fecha entre el inicio de
  la jornada y hoy. Sólo lo recibe de quien tiene la jornada a su cargo.
- El folio se asigna al recibir el árbol, en la misma transacción: la celda UGA del punto (`EXT-000` si
  quedó fuera de la malla) y el consecutivo de esa celda. La secuencia se lee e incrementa en un solo
  paso y sólo avanza; nunca se calcula con el folio más alto. En `srp.folios` se congelan la celda, la
  versión de capas y el punto con que se asignó. Al llegar una celda a 99,999, deja de dar folios y el
  árbol se recibe PROVISIONAL, con aviso, hasta que el SIA decida. Un folio no cambia ni se borra.
- Al cargar datos que ya traen folio, como la demostración, cada folio queda registrado y la secuencia
  de su celda sigue después del más alto.
- La fotografía no viaja en el envío: tiene su propia ruta (abajo).
- La prioridad de la colonia de la capa propia donde cae el punto se congela con cada árbol y cada jornada al
  recibirlos, con la versión de la capa (`srp.prioridades`): si la capa cambia, lo ya recibido conserva la
  suya, y un reporte regenerado dice la misma. Sólo se vuelve a calcular si se corrige el punto de un árbol.
  El árbol cuenta en la prioridad de la colonia donde quedó; la jornada, en la de la colonia donde se ubicó.
- Si el árbol cae muy cerca de otro de la misma especie y de otra jornada, puede ser el mismo registrado dos
  veces: se recibe
  igual y se avisa, o va a la bandeja si el otro es de otra institución (abajo).

Lo que cambia un árbol que ya está en el servidor sigue las reglas de la aplicación:
- **Editar:** llegan sólo los campos que cambiaron y se aplican sobre lo vigente. El territorio se vuelve a
  calcular y el folio no cambia. La bitácora dice qué campos cambiaron, de dónde a dónde se movió el punto
  y si cambió su territorio.
- **Eliminar:** se marca, no se borra. Sin su sustituto, el árbol que había sustituido vuelve a contar.
- **Restaurar:** vuelve con el programa de su jornada y su fecha, salvo que la jornada ahora empiece
  después. Un sustituto que vuelve deja otra vez sustituido a su original.
- **Sustituir:** el sustituto entra en la jornada del original, con la fecha en que se planta, su motivo
  y su propio folio, y el original pasa a «sustituido», en una sola operación.
- **Mover:** a otra jornada del mismo cabo. Toma su programa, y su fecha si era del día de inicio. La
  jornada de origen pierde la marca de «revisado» de ese punto.

En todos los casos:
- Sólo se aplican sobre lo que está en el alcance de quien los hace.
- El reporte de la jornada afectada deja de estar vigente, en la misma transacción.
- Lo que cambió de otros registros vuelve en `otras`.

Lo que se le hace a una jornada que ya está en el servidor, también con las reglas de la aplicación:
- **Editar:** sus árboles toman el programa nuevo y, los plantados el día de inicio, también la fecha
  nueva, en la misma transacción. La jornada no puede empezar después de un árbol plantado otro día.
- **Cerrar y reabrir:** reabrirla deja sin vigencia su reporte.
- **Datos de cierre y reporte entregado:** sólo de una jornada cerrada. El vehículo sale del catálogo y
  su placa, modelo y tipo se copian en la jornada. Personal, apoyo, chófer y vehículo sólo se piden en
  las jornadas de la Secretaría. El encargado de un cabo es él mismo.
- **Relevo:** la coordinación pasa una jornada abierta a otro cabo activo de su cuadrilla y de la
  institución de la jornada, o se la devuelve al titular. Desde entonces registra en ella el cabo del
  relevo, y el titular no.
- **Eliminar:** sólo una jornada sin árboles; los eliminados también cuentan.

**Versión.** Cada cambio trae la versión del registro que conocía el teléfono: el momento de su último cambio
en el servidor, o el de su alta, tal como vino en la respuesta anterior. Si alguien lo cambió mientras
tanto, no se escribe: se responde `VERSION_VIEJA` con el árbol como está ahora. Un reenvío de un cambio que
ya se aplicó se reconoce y no se repite. Lo mismo vale para las cuentas y los valores de catálogo que edita la
Administración global: dos Administraciones que editan lo mismo a la vez no escriben una encima de la otra.

**Lo que no puede ser.** Ninguna fecha de jornada o árbol antes del 01-OCT-2024, cuando empezó el programa. Una
fotografía es de un solo árbol. Un dato que la base no puede guardar —un texto más largo que su columna, un
número fuera de rango— responde `DATOS_INVALIDOS`, no un error interno. La última Administración global activa no
se desactiva, no se elimina ni deja de serlo. Y la carga masiva va una a la vez: mientras un lote sube, otro no
empieza, y un lote no se completa si otro, completado mientras subía, trajo los mismos árboles.

### Parámetros

Los que la aplicación muestra en Configuración › Parámetros —distancias de los avisos de jornada, niveles de
precisión del GPS, margen del límite de la Ciudad, espera del GPS, hora de atraso, reintento de envío,
tamaño de la fotografía y renglones por página— viven en el servidor y valen para todos los teléfonos a la
vez.

- Sus valores de arranque son los de `js/config.js`, y una prueba lo comprueba, junto con que sean
  justo los que muestra la pantalla.
- En la base sólo quedan los que la Administración global cambió (`srp.parametros`).
- Cada uno tiene su rango; los dos de renglones por página, sus opciones (10, 25, 50 o 100). La precisión
  buena tiene que ser menor que la aceptable.
- Cada cambio va a la bitácora, entre los de los catálogos: «Parámetro «Puntos duplicados»: 4 → 6 m».
- El servidor también los usa: la recepción toma el margen del límite de la Ciudad del parámetro.

Los del acceso (intentos, bloqueo, temporal, inactividad y largo de la contraseña) siguen en el entorno del
backend (`src/modulos/srp/config.ts`).

### Fotografías

Las fotografías no viven en la base: cada una es un archivo en la carpeta `SRP_FOTOS_DIR`, fuera de lo que se
publica, nombrado por su id (el `foto_id` de su árbol). La base guarda sólo su registro, en
`srp.fotografias`. La carpeta se respalda aparte: el respaldo de la base no la incluye.

- Llega después de su árbol, de quien puede editarlo, como imagen tal cual (JPEG, PNG o WebP), hasta
  `SRP_FOTO_MAXIMO_KB` (1024). La aplicación las guarda a 800 × 600, y pesan entre 60 y 120 KB.
- No se reemplaza: una fotografía nueva lleva otro id. Reenviar la misma da la misma respuesta; otra
  distinta con el mismo id se rechaza. El archivo se escribe completo antes de registrarlo.
- La descarga quien ve el árbol y puede descargar fotografías; para los demás no existe. Se pide cada vez
  que se ve: la respuesta dice `no-store`, así que el navegador no guarda copia y el teléfono no acumula
  fotografías (S-11).
- **Espacio:** a 60–120 KB cada una, mil árboles con fotografía ocupan de 60 a 120 MB. Un cabo con
  fotografía en cada árbol junta de 300 a 600 MB al año. `GET /fotos/uso` dice cuánto ocupan de verdad y
  cuánto ocuparían en un año al ritmo de los últimos 30 días, para pedir el espacio a tiempo.

### Posibles duplicados

Al recibir un árbol —nuevo, sustituto, restaurado o con el punto corregido— `srp.vecinos` busca otro árbol
activo, de la misma especie y de otra jornada, a menos de la incertidumbre combinada de los dos puntos: la suma
de sus precisiones de GPS, nunca menos que el parámetro «Puntos duplicados» (4 m). Un punto puesto en el mapa
o escrito no trae precisión, así que cuenta el piso. Los de la misma jornada los revisa el teléfono con sus
propios avisos.

La especie es la del catálogo o, si se escribió en «Otra especie», ese texto sin acentos ni mayúsculas
(`srp.especie_clave`). Dos árboles distintos a pocos metros son lo normal en una banqueta o un parque; el mismo
árbol registrado dos veces casi siempre lleva la misma especie. Con los datos de demostración, la bandeja pasa
de unas 350 parejas a unas 30.

- **De la misma institución:** el árbol se recibe con el aviso en `duplicado`: la distancia y, si quien lo
  mandó puede ver el otro árbol, su folio, su especie y su jornada. Si no lo puede ver, sólo la distancia.
- **De otra institución:** el árbol se recibe sin decir nada, y la pareja va a la bandeja que atiende la
  Administración global (`srp.duplicados`). Ninguna de las dos instituciones ve esa marca ni los datos de
  la otra: tampoco va a la bitácora, que se ve en el historial de cada árbol.
- Es un aviso, nunca un rechazo. Se toma sólo el más cercano de cada lado, y cada pareja entra una sola vez,
  para que la bandeja no se llene. Un reenvío da el mismo aviso.

La bandeja (`GET /duplicados?estado=pendientes|revisados|todos`) trae de cada pareja la distancia al
detectarla y la de ahora, y de cada árbol su folio, especie, fecha, punto, precisión, institución, cabo y
jornada. Pendiente es lo que no se ha revisado y tiene los dos árboles activos: si se elimina uno, ya no
cuenta dos veces; si se restaura, vuelve. `POST /duplicados/revision` marca una o varias parejas como el
mismo árbol (`mismo`) o árboles distintos (`distintos`), con una nota. Una revisión no se cambia y guarda
quién la hizo y cuándo. Si son el mismo árbol, se elimina uno de los dos como cualquier otro registro.

La acción `duplicado.revisar` está en las acciones de los dos lados (`permisos.ts` y `js/permisos.js`): la
aplicación tiene la pantalla de la bandeja (`js/duplicados.js`). `ACCIONES_DEL_SERVIDOR` queda vacía, para lo
que algún día exista sólo en el servidor.

### Permisos de cada perfil

`src/modulos/srp/permisos.ts` tiene las reglas de la aplicación (`js/permisos.js`): los perfiles, lo que
alcanza cada uno y lo que exige cada acción. Aquí se imponen; la pantalla sólo las refleja. Una prueba las
compara una por una con las de la aplicación, así que si cambia una regla, cambia en los dos lados.

| Perfil | Ve y toca |
|---|---|
| Cabo | Lo suyo: sus jornadas, las que recibió en relevo y sus árboles. De una jornada donde estuvo de relevo sin ser el titular, ve todos sus árboles |
| Coordinador | Lo suyo y lo de los cabos que lo tienen asignado |
| Directivo | De la Secretaría, todo; de otra institución, sólo lo de la suya. Sólo ve |
| Administración global | Todo; administra cuentas, catálogos y parámetros, y revisa la bandeja de posibles duplicados. No captura |

**Qué cuentas ve cada quien** (`GET /cuentas`):
- La Administración global, todas, con su correo, para administrarlas.
- Los demás, sin correo ni fechas:
  - el directivo de la Secretaría, todas; el de otra institución, las de la suya;
  - la coordinación, la suya, las de su cuadrilla y las de sus coordinadores;
  - el cabo, la suya y las de sus coordinadores;
  - y, en todos los casos, quien aparezca en las jornadas y los árboles que ve: titulares, relevos,
    encargados y quien los editó.

Las consultas aplican el alcance en la base, sin traer todo a memoria. Van por páginas, en orden de
identificador: `?despues=<id del último>&limite=<n>` (500 por omisión, hasta 2000), y la respuesta dice
desde dónde sigue (`siguiente`), o `null` al terminar. Las filas llevan los campos del teléfono, con las
fechas en texto ISO 8601 en UTC; la fotografía tendrá su propia ruta.

## Cargar datos

`npm run cargar -- <orden>`:

| Orden | Qué carga | Dónde |
|---|---|---|
| `territorio` | La réplica de `territorio` (alcaldías, malla UGA y colonias del IECM), de `assets/capas/`. Si encuentra capas que no cargó el SRP, no toca nada | **Sólo local** |
| `capas` | La capa propia, las colonias prioritarias, de `assets/capas/`. La reemplaza completa | **Sólo local**; al SIA va en el guion de datos de arranque |
| `especies` | El catálogo de especies de la aplicación. Agrega las que falten, sin tocar las demás | **Sólo local**; ídem |
| `vehiculos` | La lista de un CSV con columnas `placa`, `modelo` y `tipo`; por omisión, la real más reciente de `originales/`, que nunca entra al repositorio | **Sólo local**; ídem |
| `arranque` | El mismo guion que va al SIA (`datos-arranque.js`), con el CSV más reciente: catálogos de arranque, especies, vehículos y la capa si está vacía. Agrega lo que falte | Local |
| `app` | Lo que exporta `python herramientas/exportar_datos_app.py`: cuentas de prueba, catálogos de arranque y los datos de demostración, tal como los guarda un teléfono. Sus fotografías quedan como archivos en `servidor/local/fotos`, como las deja el servidor | **Sólo local** |
| `todo` | Las anteriores, las que tengan su archivo | — |
| `rehacer` | Destruye el esquema, lo instala y carga `territorio` y todo | **Sólo local** |

Lo de la aplicación entra con `srp_api`, como llegará de los teléfonos, en una sola
transacción. Las cuentas de prueba y los datos de demostración no usan UUID, que es lo que guarda el
servidor: cada identificador así toma un UUID fijo derivado de él, el mismo en cada carga y en todas las
referencias. Si está la lista real de vehículos, las jornadas de demostración usan esos vehículos.

## Desarrollo local

Requisitos: Node.js 20 o posterior y PostgreSQL con PostGIS, de la misma versión mayor que la del servidor
de destino, con una base de desarrollo y una cuenta que pueda crear cuentas (no hace falta superusuario).
La base local lleva una réplica de las tablas de `territorio` que lee el SRP (`db/local/territorio.sql`),
con los mismos nombres y columnas que en el SIA; se crea al instalar y nunca se entrega.
La contraseña de esa cuenta va en el archivo de contraseñas de PostgreSQL del equipo
(`%APPDATA%\postgresql\pgpass.conf` en Windows, `~/.pgpass` en los demás), nunca en el código. Por omisión
se usa la base `srp_local` en `127.0.0.1` con la cuenta `srp_local_admin`; se cambia con `PGHOST`,
`PGPORT`, `PGDATABASE` y `PGUSER`.

```
cd servidor
npm install
python ../herramientas/exportar_datos_app.py
npm run cargar -- rehacer
npm test
```

**La aplicación con su servicio.** Para usarlos juntos en esta computadora, como quedarán en el SIA:
`SRP_COOKIE_SEGURA=no SRP_ROL=srp_api npm run iniciar` aquí, y `python pruebas/servir.py` en la carpeta del
proyecto. Ese servidor sirve la aplicación en `http://127.0.0.1:8099/` y reenvía `/srp/api/` al servicio. La
aplicación habla con el servicio sólo con `ES_FICTICIO: false`. `pruebas/prueba_conexion.py` lo hace así en
su navegador, sin cambiar el archivo.

Las pruebas corren una tras otra, y cada una tiene diez minutos para terminar. Primero
`esquema.test.js`, que deja instalados los guiones de `db/srp/` tal como están: las demás corren sobre
esa base y nunca sobre una instalación anterior. Le sigue `datos.test.js`, y después las demás.

- `pruebas/esquema.test.js`: instala en limpio, comprueba que las tablas sean las del diccionario, que las
  reglas rechacen lo inválido y que `srp_api` tenga sólo sus permisos —`territorio` de sólo lectura,
  nada directo fuera de `srp`, sin borrar árboles, contraseñas ni sesiones, y con su tope de 50 segundos—,
  que las bitácoras no se editen ni se vacíen, y que el guion de la primera
  cuenta dé una sola, con el resumen de la temporal que entrega; y destruye.
- `pruebas/acceso.test.js`: levanta el servicio y lo usa como la aplicación: entrar, salir, alta con
  temporal, cambio obligatorio, bloqueo (también con intentos simultáneos), restablecimiento,
  desactivación, institución desactivada, vencimiento de la sesión y de la temporal, y el registro de
  entradas; editar una cuenta con las reglas del formulario, y eliminar sólo la que no aparece en nada (una
  que ya entró, o que coordina a un cabo, no se elimina); el límite por procedencia; el tope a la
  contraseña actual al cambiarla; y un valor de configuración mal escrito.
- `pruebas/catalogos.test.js`: carga el editor de catálogos de la aplicación tal cual y compara su
  validación con la del servidor, caso por caso; luego da de alta, edita, activa, desactiva y elimina por
  las rutas, y revisa la bitácora y que lo que cuenta como uso sean las llaves foráneas de la base.
- `pruebas/parametros.test.js`: compara los parámetros con `js/config.js` y con la pantalla de
  Parámetros, los cambia por su ruta y comprueba que la recepción use el margen del límite de la Ciudad.
- `pruebas/fotografias.test.js`: sube y baja fotografías. Comprueba que lleguen después de su árbol y
  de quien puede editarlo, que queden como archivo con su registro y su huella, que no se reemplacen, ni
  aun con dos envíos al mismo tiempo, quién las descarga, el uso de espacio, y qué pasa si falta el archivo o la carpeta.
- `pruebas/recepcion.test.js`: manda jornadas y árboles como el teléfono. Comprueba:
  - qué pone el servidor;
  - el folio por celda, aun con envíos simultáneos y en el tope de 99,999;
  - que reenviar no duplica;
  - que cada regla rechaza con el mensaje de la aplicación, también el largo de cada texto, y que un folio
    no cambia; un árbol PROVISIONAL recibe el suyo al editarlo;
  - editar, eliminar, restaurar, sustituir y mover, cada uno con su bitácora, el reporte que deja de estar
    vigente y el alcance de cada perfil;
  - editar la jornada y su efecto en los árboles, cerrarla, reabrirla, sus datos de cierre, el reporte, el
    relevo, los puntos revisados y eliminarla;
  - que una versión vieja no escribe;
  - la prioridad de la colonia que se congela, y que se conserva aunque cambie la capa.
- `pruebas/cargas.test.js`: un lote en tandas, cada árbol con su folio y nada visible hasta completarlo; cada
  renglón revisado con las reglas de la aplicación; deshacer sin borrar, y volver a cargar; sólo la
  Administración.
- `pruebas/historial.test.js`: el historial de un árbol, en orden y sólo para quien lo ve, y el registro de
  cambios, sólo para la Administración y por páginas; las fechas, al milésimo de segundo.
- `pruebas/duplicados.test.js`: el aviso de posible duplicado con la suma de las precisiones y su piso, sólo
  entre árboles de la misma especie, lo que dice según quién lo manda, la pareja entre instituciones que va a la bandeja sin que se entere nadie,
  y la bandeja: quién la ve, la revisión, y los árboles eliminados, restaurados o corregidos.
- `pruebas/permisos.test.js`: carga `js/permisos.js` tal cual y lo compara con el servidor: cada perfil,
  cada acción y cientos de registros armados para los casos de borde; la consulta en la base, con todas
  las cuentas, jornadas y árboles que haya; las rutas, por páginas, como las usará la aplicación; y qué
  cuentas ve cada perfil, con correo sólo para la Administración.
- `pruebas/datos.test.js`: carga todo y comprueba que cupo, que las capas estén completas y, sobre todo,
  que PostGIS, leyendo `territorio`, ubique cada árbol y cada jornada igual que la aplicación (alcaldía,
  colonia y celda UGA).
  Se omite si no hay exportación de la aplicación.

Al terminar, la base local queda instalada y cargada.
