# Servidor del SRP

El servicio del Sistema de Registro de Plantaciones: recibe lo que capturan los teléfonos, da el acceso
con cuentas propias, emite los folios y responde las consultas de Supervisión. Se construye como módulo
independiente, para montarse en el servidor de aplicaciones del SIA (Node.js con Express) o correr como
servicio aparte, sobre PostgreSQL con PostGIS. Qué debe hacer está en `docs/FASE2-Y-TRASPASO.md`; cómo
se llega al SIA, en `docs/PLAN-TRASPASO-SIA.md`.

Estado: **la base de datos, con sus capas territoriales y sus datos de arranque, y el acceso con cuentas
propias**. La recepción de jornadas y árboles, los permisos por perfil y el folio vienen en las fases
siguientes.

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
| `db/srp/01-srp-esquema.sql` | Comprueba que estén PostGIS, `territorio` y `territorio_lectura`; crea el esquema `srp` y la tabla de versiones. Si el esquema ya está instalado, se detiene sin tocar nada |
| `db/srp/02-srp-tablas.sql` | Las diez tablas, con sus llaves, reglas, índices y comentarios. **Generado**: no se edita a mano |
| `db/srp/03-srp-acceso.sql` | Contraseñas (sólo derivadas con sal, nunca en claro) y sesiones (sólo el resumen del testigo) |
| `db/srp/04-srp-sobre-territorio.sql` | La capa propia (colonias prioritarias), el índice espacial de árboles y jornadas, y `srp.derivar`, que da alcaldía, colonia y celda UGA de un punto sobre `territorio`, con las mismas reglas que la aplicación |
| `db/srp/05-srp-rol-y-grants.sql` | La cuenta `srp_api`, sin contraseña, con sus permisos mínimos y `territorio_lectura`; la versión 1 del esquema. Al final, la verificación para correr como la cuenta: lo que debe funcionar y lo que debe fallar |
| `db/srp/instalar.sql` | Corre los anteriores en orden, en una sola transacción |

Todos los corre quien administra la base, que queda como dueño de lo que se crea. `02-srp-tablas.sql` sale
de `datos/esquema.json` con `python herramientas/generar_sql.py`; si el diccionario cambia, se vuelve a
generar, y `pruebas/auditoria.py` falla si quedó atrasado.

Las tablas guardan latitud y longitud, como el teléfono. El punto geográfico se calcula con
`srp.punto(lat, lng)` y tiene índice espacial, sin agregar campos a las tablas. Donde dos polígonos
empatan en un borde gana la clave menor, en el servidor y en la aplicación, que lleva sus capas en orden
de clave.

### Permisos de srp_api

- Usa el esquema, pero no crea, altera ni borra tablas, ni dentro ni fuera de él.
- Lee, agrega y cambia renglones de las tablas de datos, y borra sólo lo que el sistema permite borrar
  (un valor de catálogo o una cuenta sin uso, un lote de carga masiva, las sesiones).
- A la bitácora sólo le agrega renglones: no la edita ni la borra.
- Lee `territorio` y la capa propia; `srp.punto` y `srp.derivar` las puede usar. No escribe en ninguna.
- No tiene ningún permiso directo fuera de `srp`.

### Instalar en el SIA

Conectado a la base como quien la administra, desde `db/srp/`:

```
psql -d <base> -v ON_ERROR_STOP=on -f instalar.sql
```

Después, en este orden, porque el backend no arranca el módulo sin su cuenta:

1. Contraseña de `srp_api` de forma interactiva (`\password srp_api` en psql), para que no quede en
   ningún registro.
2. Su entrada cifrada en la configuración de acceso de PostgreSQL.
3. `SRP_DB_USER` y `SRP_DB_PASS` en el archivo de entorno del backend.
4. El backend con el módulo.
5. La capa propia y el catálogo de especies: `npm run cargar -- capas especies`.

## El servicio: acceso y cuentas

`npm run iniciar` lo arranca solo, en `SRP_PUERTO` (3100), bajo `/api/srp`. Para montarlo en el backend
central del SIA se usa `crearRutas({ grupo, config })` de `src/app.js`. La configuración, toda por
variables de entorno, está explicada en `src/config.js`.

| Ruta | Qué hace | Quién |
|---|---|---|
| `POST /acceso/entrar` | Correo y contraseña; abre la sesión con una cookie sólo HTTP, del mismo sitio y sólo para la API | Cualquiera |
| `POST /acceso/salir` | Cierra la sesión de este equipo | Con sesión |
| `GET /acceso/yo` | La cuenta de la sesión y si debe cambiar su contraseña | Con sesión |
| `POST /acceso/contrasena` | Cambia la contraseña; cierra las demás sesiones de la cuenta | Con sesión |
| `POST /cuentas` | Alta con contraseña temporal, que se responde una sola vez | Administración global |
| `POST /cuentas/:id/restablecer` | Otra contraseña temporal; cierra las sesiones de la cuenta | Administración global |
| `POST /cuentas/:id/estado` | Activa o desactiva; desactivar cierra sus sesiones | Administración global |

- **Contraseñas:** sólo se guarda lo que deriva scrypt, con sal, nunca la contraseña. Al menos 10
  caracteres, con letras y números, sin el correo. No hay servicio de correo: la Administración global
  da una temporal de un solo uso (vale 72 horas) y la persona la cambia al primer acceso; mientras tanto
  no puede hacer nada más.
- **Bloqueo:** 5 intentos fallidos seguidos bloquean la cuenta 15 minutos, o hasta que la Administración
  restablezca la contraseña. Una cuenta que no existe y una contraseña equivocada responden lo mismo.
- **Sesiones:** vencen tras una semana sin uso; cada uso renueva la semana y no hay límite total. Una
  sesión vencida responde `SESION_VENCIDA`: la aplicación vuelve a pedir la contraseña sin perder lo
  capturado. Desactivar la cuenta o su institución, o cambiar o restablecer la contraseña, cierra sus
  sesiones. La cookie dura 400 días, lo más que admiten los navegadores: quien decide es el servidor.
- **Primera cuenta:** en una base recién instalada, quien la administra crea la primera Administración
  global con `npm run cuenta-inicial -- <correo> "<nombre completo>" "<cargo>"`; la contraseña temporal
  se escribe una sola vez en pantalla. Las demás cuentas se dan de alta desde la aplicación.

Los plazos, el largo mínimo y el bloqueo son parámetros (`src/config.js`): se cambian sin tocar código.

## Cargar datos

`npm run cargar -- <orden>`:

| Orden | Qué carga | Dónde |
|---|---|---|
| `territorio` | La réplica de `territorio` (alcaldías, malla UGA y colonias del IECM), de `assets/capas/`. Si encuentra capas que no cargó el SRP, no toca nada | **Sólo local** |
| `capas` | La capa propia, las colonias prioritarias, de `assets/capas/`. La reemplaza completa | Local y SIA |
| `especies` | El catálogo de especies de la aplicación. Agrega las que falten, sin tocar las demás | Local y SIA |
| `vehiculos` | La lista de un CSV con columnas `placa`, `modelo` y `tipo`; por omisión, la real más reciente de `originales/`, que nunca entra al repositorio | Local; el SIA carga la suya |
| `app` | Lo que exporta `python herramientas/exportar_datos_app.py`: cuentas de prueba, catálogos de arranque y los datos de demostración, tal como los guarda un teléfono | **Sólo local** |
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

Las pruebas:

- `pruebas/esquema.test.js`: instala en limpio, comprueba que las tablas sean las del diccionario, que las
  reglas rechacen lo inválido y que `srp_api` tenga sólo sus permisos —`territorio` de sólo lectura,
  nada directo fuera de `srp`—, y destruye.
- `pruebas/acceso.test.js`: levanta el servicio y lo usa como la aplicación: entrar, salir, alta con
  temporal, cambio obligatorio, bloqueo, restablecimiento, desactivación, institución desactivada,
  vencimiento de la sesión y de la temporal.
- `pruebas/datos.test.js`: carga todo y comprueba que cupo, que las capas estén completas y, sobre todo,
  que PostGIS, leyendo `territorio`, ubique cada árbol y cada jornada igual que la aplicación (alcaldía,
  colonia y celda UGA).
  Se omite si no hay exportación de la aplicación.

Al terminar, la base local queda instalada y cargada.
