# Servidor del SRP

El servicio del Sistema de Registro de Plantaciones: recibe lo que capturan los teléfonos, da el acceso
con cuentas propias, emite los folios y responde las consultas de Supervisión. Se construye como módulo
independiente, para montarse en el servidor de aplicaciones del SIA (Node.js con Express) o correr como
servicio aparte, sobre PostgreSQL con PostGIS. Qué debe hacer está en `docs/FASE2-Y-TRASPASO.md`; cómo
se llega al SIA, en `docs/PLAN-TRASPASO-SIA.md`.

Estado: **la base de datos, con sus capas territoriales y sus datos de arranque**. El servicio en sí
(acceso, recepción, folio) viene en las fases siguientes.

## La base de datos

Todo vive en el esquema `srp`. Las diez tablas son las mismas del teléfono —mismos nombres de tabla y de
campo, sin capa de traducción— y se generan del diccionario de datos; lo que es propio del servidor va
aparte.

| Guion | Qué hace | Quién lo corre |
|---|---|---|
| `sql/00_cuentas.sql` | Crea las cuentas `srp_propietario` (dueña del esquema, no se conecta) y `srp_servicio` (la del servicio). Se puede repetir | Quien administra la base |
| `sql/01_esquema.sql` | Crea el esquema `srp` y la tabla de versiones. Falla si el esquema ya existe | Ídem, que asume la cuenta propietaria |
| `sql/02_tablas.sql` | Las diez tablas, con sus llaves, reglas, índices y comentarios. **Generado**: no se edita a mano | Ídem |
| `sql/03_acceso.sql` | Contraseñas (sólo derivadas con sal, nunca en claro) y sesiones (sólo el resumen del testigo) | Ídem |
| `sql/04_capas.sql` | Las cuatro capas territoriales en PostGIS, el índice espacial de árboles y jornadas, y `srp.derivar`, que da alcaldía, colonia y celda UGA de un punto con las mismas reglas que la aplicación | Ídem |
| `sql/05_permisos.sql` | Los permisos mínimos de `srp_servicio` y la versión 1 del esquema | Ídem |
| `sql/instalar.sql` | Corre los anteriores en orden, en una sola transacción | — |
| `sql/destruir_local.sql` | Borra el esquema y sus cuentas. **Sólo para la base local de desarrollo** | — |

`02_tablas.sql` sale de `datos/esquema.json` con `python herramientas/generar_sql.py`. Si el diccionario
cambia, se vuelve a generar; `pruebas/auditoria.py` falla si quedó atrasado.

Las tablas guardan latitud y longitud, como el teléfono. El punto geográfico se calcula con
`srp.punto(lat, lng)` y tiene índice espacial, sin agregar campos a las tablas.

### Permisos de la cuenta del servicio

- Usa el esquema, pero no crea, altera ni borra tablas, ni dentro ni fuera de él.
- Lee, agrega y cambia renglones de las tablas de datos, y borra sólo lo que el sistema permite borrar
  (un valor de catálogo o una cuenta sin uso, un lote de carga masiva, las sesiones).
- A la bitácora sólo le agrega renglones: no la edita ni la borra.
- Las capas territoriales sólo las lee; `srp.punto` y `srp.derivar` las puede usar.
- La cuenta que administra la base no ve los datos si no asume la cuenta propietaria.

### Instalar en un servidor

PostGIS debe estar instalado en la base (lo instala quien la administra). Conectado a esa base, como
quien la administra:

```
psql -h <servidor> -U <administrador> -d <base> -v ON_ERROR_STOP=1 -f sql/instalar.sql
```

Después se cargan las capas y el catálogo de especies, con la misma cuenta (variables `PGHOST`,
`PGDATABASE`, `PGUSER` y su contraseña en el archivo de contraseñas de PostgreSQL):

```
npm install
npm run cargar -- capas especies
```

Y el administrador le pone contraseña a `srp_servicio` (`ALTER ROLE srp_servicio PASSWORD '…'`) y la
entrega, fuera del repositorio, a quien configure el servicio. La conexión del servicio a la base va
cifrada.

## Cargar datos

`npm run cargar -- <orden>`:

| Orden | Qué carga | Dónde |
|---|---|---|
| `capas` | Las cuatro capas, de `assets/capas/` (las mismas de la aplicación). Las reemplaza completas | Local y SIA |
| `especies` | El catálogo de especies de la aplicación. Agrega las que falten, sin tocar las demás | Local y SIA |
| `vehiculos` | La lista de un CSV con columnas `placa`, `modelo` y `tipo`; por omisión, la real más reciente de `originales/`, que nunca entra al repositorio | Local; el SIA carga la suya |
| `app` | Lo que exporta `python herramientas/exportar_datos_app.py`: cuentas de prueba, catálogos de arranque y los datos de demostración, tal como los guarda un teléfono | **Sólo local** |
| `todo` | Las anteriores, las que tengan su archivo | — |
| `rehacer` | Destruye el esquema, lo instala y carga todo | **Sólo local** |

Lo de la aplicación entra con la cuenta del servicio, como llegará de los teléfonos, en una sola
transacción. Las cuentas de prueba y los datos de demostración no usan UUID, que es lo que guarda el
servidor: cada identificador así toma un UUID fijo derivado de él, el mismo en cada carga y en todas las
referencias. Si está la lista real de vehículos, las jornadas de demostración usan esos vehículos.

## Desarrollo local

Requisitos: Node.js 20 o posterior y PostgreSQL con PostGIS, de la misma versión mayor que la del servidor
de destino, con una base de desarrollo y una cuenta que pueda crear cuentas (no hace falta superusuario).
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
  reglas rechacen lo inválido y que la cuenta del servicio tenga sólo sus permisos, y destruye.
- `pruebas/datos.test.js`: carga todo y comprueba que cupo, que las capas estén completas y, sobre todo,
  que PostGIS ubique cada árbol y cada jornada igual que la aplicación (alcaldía, colonia y celda UGA).
  Se omite si no hay exportación de la aplicación.

Al terminar, la base local queda instalada y cargada.
