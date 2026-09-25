# SRP — Sistema de Registro de Plantaciones (SEDEMA)

Prototipo en **Etapa 1**: el formulario funciona entero en el dispositivo, con datos de prueba y
sin servidor. La conexión con servidores y el resto de las etapas vienen después, cuando se
decida pasar a ellas.

La versión que corre se lee al pie de cada pantalla.

## Cómo se usa

1. **Registrar jornada** (pestaña Nuevo registro). Antes de registrar árboles se declara la jornada:
   nombre del sitio, programa, fecha, meta de árboles y, si se quiere, la ubicación y la dirección.
   El programa y la fecha son de la jornada: todos sus árboles los toman (D119, D151).
2. **Nuevo árbol.** Con la jornada activa: ubicación (GPS, toque en el mapa o coordenadas a mano),
   especie, comentarios y fotografía opcional. «Guardar» registra de una vez; sólo si hay algo que
   revisar (precisión baja, punto lejano, posible duplicado) abre la ficha de revisión.
3. **Jornadas.** Cada jornada con su mapa y lista numerados, sus avisos y la conciliación con la
   meta. Ahí se revisan los puntos, se cierra la jornada y se mueve o elimina un árbol.
4. **Reportes.** De cada jornada cerrada: datos de cierre, vista previa y PDF con croquis.
5. **Fotografías** (coordinación y administración): las fotos de los registros, con descarga en ZIP.
6. **Registros**: la lista de árboles con filtros, detalle, edición y eliminación que se deshace.
   **Catálogos** y **Usuarios**, sólo para la Administración global.

## Cómo abrirlo

**En la computadora.** Doble clic en `index.html` sirve para mirar, pero para probar de verdad
conviene servirlo: `python3 -m http.server 8099` dentro de esta carpeta, y abrir
`http://127.0.0.1:8099/`. Así el navegador lo trata igual que al sitio publicado.

**En el teléfono.** La ubicación y la cámara sólo funcionan en una dirección `https://`, así que
hay que abrir el sitio publicado: https://sedemaoficina.github.io/SISTEMA-PLANTACION/

**Publicar un cambio.** Abrir GitHub Desktop, revisar que el commit esté hecho y pulsar
«Push origin». El sitio se actualiza solo en uno o dos minutos.

## Cuentas de arranque

El sistema arranca con tres cuentas y **ninguna plantación**: se llena con lo que se capture.

| Correo | Perfil | Qué puede hacer |
|---|---|---|
| administracion@ejemplo.local | Administración global | Ve, edita y elimina todo, y lleva Catálogos y Usuarios. **No captura registros** |
| coordinador@ejemplo.local | Coordinador | Registra, y ve y edita los registros de su cuadrilla; no elimina registros, sí jornadas vacías |
| cabo@ejemplo.local | Cabo | Registra, y ve, edita y elimina sólo los suyos |

Quien captura en campo es un **cabo**; quien lo dirige, un **coordinador**. En el código son
`CABO` y `COORDINADOR`, y los campos son `cabo_id` en las plantaciones y `coordinador_id` en las
cuentas.

## Cómo se entra

Con **correo y contraseña**. Nadie se da de alta solo: las cuentas las crea la Administración
global desde la pestaña Usuarios.

**La contraseña todavía no se verifica.** Comprobarla en el navegador sería seguridad aparente,
porque cualquiera puede leer el código de la página; lo único que se comprueba es que el correo
corresponda a una cuenta dada de alta y activa. La verificación real la hará el proveedor
institucional más adelante, y entonces se sustituye sólo `autenticar()`, en `js/sesion.js`.

Mientras `ES_FICTICIO` sea `true` (en `js/config.js`), la pantalla de acceso ofrece además entrar
como cuenta de prueba, y el pie de página deja cambiar de cuenta y restablecer los datos. Todo eso
desaparece al poner `ES_FICTICIO: false`.

## Estructura

```
index.html            Pantallas y marca de versión de los archivos
css/estilos.css       Estilos (orden fijo por bloques; ver el encabezado del archivo)
js/config.js          ÚNICO lugar con valores configurables
js/permisos.js        ÚNICO lugar con las reglas de cada perfil y lo que exige cada acción (D151)
js/almacen.js         Base del dispositivo (IndexedDB) y bitácora
js/sesion.js          Acceso; se sustituye al conectar el proveedor institucional
js/datos-ficticios.js Cuentas y catálogos de arranque
js/derivacion.js      Cruce punto-en-polígono (alcaldía, UGA, colonia)
js/folio.js           Patrón, validación y etiqueta del folio; sólo lo emite el servidor simulado de prueba (D110)
js/conexion.js        Estado de la conexión y del teléfono (guía), respaldo del alcance y restauración validada
js/esquema.js         Generado de esquema.json por pruebas/generar_diccionario.py: no se edita a mano (D150)
js/validar.js         Revisa cada renglón que entra por un respaldo contra el esquema; la misma revisión que hará el servidor
js/envio.js           Envío al servidor simulado con datos de prueba: cola, avisos de atraso, «Simular sin señal» (D111)
js/croquis.js         Croquis de la jornada para el reporte: puntos numerados sobre imagen de satélite o fondo liso (D115)
js/jornada-activa.js  La jornada se declara antes de registrar: inicio, franja, cambiar, cerrar, salvaguarda de distancia (D119)
js/galeria.js         Sección Fotografías (coordinación y administración): rejilla, foto grande, descarga y ZIP (D118)
js/jornadas.js        Sección Jornadas: mapa y lista numerados de un día de trabajo, avisos y conciliación con el cierre (D112)
sw.js                 Service worker: la app abre sin señal; versión = marca ?v= de index.html
manifest.webmanifest  Instalación en pantalla de inicio; iconos definitivos en assets/ (D90)
js/referencias.js     Catálogos y cuentas en memoria; quién usa cada valor, en todas las tablas (D151)
js/iconos.js          Iconos por significado; los del set de iconografía CDMX se extraen con pruebas/extraer_iconos.py (D88)
js/reportes.js       Cierre del parte del día y reporte PDF de la jornada
js/mapa.js, foto.js, formulario.js, registros.js, catalogos.js,
js/usuarios.js, app.js, util.js
assets/fuentes/       Capas, catálogo de especies y set de iconografía CDMX tal como llegaron; no se editan
assets/capa-alcaldias.js, capa-uga.js, capa-colonias.js  Las mismas capas, compactadas para la aplicación (generadas)
assets/catalogo-especies.js  Catálogo real de especies (76), generado por pruebas/generar_especies.py
assets/encabezado-ru-sia.png, encabezado-ru-sia-movil.png  Logotipo Gobierno CDMX · SEDEMA · SIA · Reforestación Urbana (encabezado y PDF; versión SIA · Reforestación Urbana hasta 767 px)
assets/icono-192.png, icono-512.png, icono-512-maskable.png, apple-touch-icon.png  Icono de la app: emblema del programa sobre guinda (D90)
js/espejo.js          Espejo de campos, sólo en la versión de prueba (se elimina al cerrar la Etapa 1)
esquema.json          Fuente única del modelo de datos (D86)
DICCIONARIO-DATOS.md  Inventario de tablas y diccionario de datos, generado de esquema.json
MAPEO-CAMPOS.md       Campos vistos por pantalla: etiqueta ↔ campo, obligatorio, origen
vendor/               Bibliotecas incluidas localmente (Leaflet, jsPDF, Turf)
vendor/fuentes/       Cabin y Roboto en woff2 (subconjunto latino, ~110 KB); la identidad se ve igual sin señal (D87)
```

## Al cerrar un bloque: subir la marca de versión

En `index.html`, cada archivo propio se pide con `?v=0.0.0`. **Ese número se sube en todas las
etiquetas a la vez** antes de publicar. Es lo único que obliga al navegador de quien ya abrió el
sitio a descargar la versión nueva; sin eso sirve unos archivos de su memoria y otros de la red, y
esa mezcla no arranca. `js/config.js` lee ese mismo número de su propia dirección, así que la
versión se escribe en un solo lugar.

Si aun así alguien cae en una mezcla, el sistema lo detecta al abrir y explica cómo forzar la
recarga, en vez de quedarse en blanco.

**Si el bloque tocó algún campo** (nuevo, retirado, otro dominio, otra regla): se actualiza
`esquema.json`, se regenera el diccionario con `python3 pruebas/generar_diccionario.py` y se
ajusta `MAPEO-CAMPOS.md`. No es opcional: `pruebas/auditoria.py` falla si el esquema y el
sistema no guardan lo mismo o si el diccionario no está regenerado (D86).

## Si cambian los datos de arranque

`SELLO_DATOS`, en `js/config.js`, se cambia cada vez que cambian las cuentas o los catálogos de
arranque. El dispositivo guarda el sello con el que cargó los datos de ejemplo; si no coincide y
**no hay nada capturado** (árboles, jornadas o bitácora), los vuelve a cargar y lo avisa. Si hay
capturas, **no se borra nada** (D149): en la Etapa 1 el teléfono es la única copia. Por eso un
cambio en la forma de los datos ya no se resuelve con el sello, sino con una migración numerada
en `js/almacen.js` que traslada lo guardado antes de retirar nada.

## El reporte de la jornada

El reporte es el **parte de una jornada** (D119, D134), no de un día ni de un periodo: un día puede
tener varias jornadas. Se genera desde Reportes, que lista las jornadas cerradas con árboles, o
desde la ficha de la jornada. Primero se piden los **datos de cierre de la jornada**: personal,
apoyo, encargado, observaciones, chófer, vehículo y hora de finalización. Todos opcionales y de
escritura libre, y los que quedan vacíos no se imprimen. El encargado no se escribe: para un cabo
es él; para quien ve a varias personas se elige entre los cabos con registros ese día. Luego se
abre la **vista previa**, con el mismo contenido que tendrá el PDF, y desde ahí se genera el PDF.

Los totales por especie, el total de ejemplares, el resumen por programa y la alcaldía del sitio
**se calculan** a partir de los registros. Un total tecleado es un total que se puede equivocar.

Lo capturado se guarda en la propia jornada (almacén `jornadas`, D119): volver a generar el
reporte de una jornada no obliga a escribirlo otra vez.

## La base del dispositivo

La estructura vive en migraciones numeradas (`MIGRACIONES` en `js/almacen.js`; hoy van tres) y los
almacenes que el código espera se declaran en `ALMACENES`. **Lo capturado no se borra solo** (D149):
un cambio de estructura es una migración nueva que traslada lo guardado antes de retirar nada; una
base a la que le falta un almacén, o de una versión posterior, se rehace conservando cada renglón;
y el sello de datos sólo vuelve a cargar las cuentas y catálogos de ejemplo cuando no hay nada
capturado. Al guardar el primer árbol se pide al navegador que no desaloje lo guardado.

En la Etapa 1 todo vive en el navegador de cada teléfono: borrar los datos del navegador borra los
registros. Por eso la guía «¿Qué hacer sin internet?» dice si lo guardado está protegido y cuándo
fue el último respaldo, y el cierre de cada jornada lo recuerda.

## Mapa

La capa base es imagen de satélite de Esri, con los nombres de vías y lugares encima. Las tres
capas se declaran en `CAPAS`, dentro de `js/config.js`; cambiar de proveedor es cambiar esa lista
y el dominio en la política de seguridad de `index.html`. Cada mapa —captura, jornada, ficha de
revisión y detalle— muestra el crédito de cada capa tal como lo declara su servicio y «Powered by
Esri»; el croquis del PDF lo lleva al pie (D152). La licencia y el token de Esri están pendientes
de confirmar antes de operar (D5 de la auditoría).

## Sin señal

La app funciona sin internet: GPS, captura, guardado (IndexedDB), lista y PDF viven en el
teléfono; sólo la imagen del mapa deja de cargar, y el sistema avisa y deja colocar el punto. Un
*service worker* (`sw.js`) guarda la app completa la primera vez que se abre con señal, para que
vuelva a abrir sin red; se registra con la misma marca `?v=` de `index.html`, así que **subir la
marca al cerrar un bloque sigue siendo lo único que hay que hacer** para que los teléfonos
actualicen (el worker nuevo reemplaza al viejo al abrir con señal). `manifest.webmanifest` permite
instalarla en la pantalla de inicio. En la Etapa 1 no hay servidor: los registros se quedan en el
dispositivo; la pastilla del encabezado dice el estado de la conexión y del envío simulado, y al
tocarla abre la guía con el estado del teléfono. «Guardar respaldo» (menú de la cuenta) produce un
archivo con lo que alcanza quien respalda —sus árboles y jornadas con su bitácora— y avisa que
contiene datos personales; se restaura desde las herramientas de prueba, que validan cada renglón,
sólo aceptan lo del alcance de quien restaura y piden confirmación (D150). Ver D71, D72, D149 y D150.

## Folio del ejemplar

Nomenclatura adoptada: `AAA-000-00000` (celda UGA y consecutivo de la celda; 13 caracteres). El
consecutivo corre en una secuencia perpetua por celda que no se reinicia nunca. La clave de especie queda fuera del folio. En la Etapa 1 **ningún registro
tiene folio**: lo asigna el servidor una sola vez al sincronizar, y la pantalla y el PDF dicen
PROVISIONAL. `js/folio.js` guarda el patrón, la validación y la etiqueta de campo —lo que el
servidor reutilizará—; la emisión no existe todavía y depende de que el SIA entregue la malla UGA
corregida y congelada (DECISIONES D67–D69 y pendientes).

## Modelo de datos

`esquema.json` es la fuente única del modelo: las cinco tablas del dispositivo con cada campo
(tipo, nulo, origen, dominio, si se ve en pantalla, regla), los dominios y de dónde salen, las
relaciones, los campos derivados del punto o de la sesión, lo que se calcula y no se guarda, el
estado que vive sólo en memoria, los campos condicionales, las reglas vigentes con el archivo donde
viven y las que esperan al servidor. `DICCIONARIO-DATOS.md` se genera de ahí y trae además el
borrador de tablas PostgreSQL para la Fase 2. `MAPEO-CAMPOS.md` es la misma información vista por
pantalla (etiqueta ↔ campo). Los tres se auditan (D86).

## Catálogo de especies

Las especies son las reales del SIA: `CGO_ESPECIES_REFORESTACION_URBANA` (76 especies, verificadas
ficha por ficha contra EncicloVida/CONABIO el 22-09-2026). El Excel vive en `assets/fuentes/` y
`pruebas/generar_especies.py` lo convierte en `assets/catalogo-especies.js`, que se siembra en el
almacén `catalogos` tal cual: **la clave es el `id_especie` (`ESP-0001`…) y es la única llave por
la que se enlazan las plantaciones**; el nombre común es la etiqueta de campo; el tipo de
distribución (Endémica · Nativa · Exótica · Exótica-Invasora), la forma de crecimiento y los
identificadores de CONABIO (`id_snib`, `id_enciclovida`) viajan con la especie y no se copian al
registro. El formulario busca por nombre común, científico y **otros nombres comunes**, y dice por
cuál coincidió, porque un mismo nombre («Fresno», «Colorín») señala a más de una especie. Las
altas nuevas desde Catálogos reciben el consecutivo siguiente (`ESP-0077`…). Para cambiar una
especie del catálogo se corrige el Excel y se vuelve a correr el script; las altas y ediciones
hechas en Catálogos viven en el almacén del dispositivo. Ver D84 y MAPEO-CAMPOS.

## Capas territoriales

Las capas son del SIA. Los archivos originales viven en `assets/fuentes/` y no se tocan: son la
constancia de qué se recibió. La aplicación carga versiones compactadas —atributos mínimos, seis
decimales— que produce `pruebas/generar_capas.py`. **Nunca se editan a mano**: para cambiar una
capa se sustituye el original y se vuelve a correr el script, que valida cantidad de features,
claves únicas, anillos cerrados y sistema de referencia antes de escribir nada.

| Capa | Archivo original | Features | Clave | Qué guarda el registro |
|---|---|---|---|---|
| Alcaldías | `alcaldias_cdmx.json` (definitiva; metadato en `fuentes/documentacion/`) | 16 | `cvegeo` INEGI | `alcaldia_cve` y `alcaldia` (nombre) |
| Malla UGA | `UGA_CDMX.geojson` (definitiva) | 1,624 hexágonos de ~1 km² | `clave` (`TLP-318`) | `uga` |
| Colonias | `colonias_iecm2022.geojson` | 1,837 unidades territoriales del IECM 2022 | `CVEUT` (`10-001`) | `colonia_cve` y `colonia` (nombre) |

**Alcaldías y UGA son las definitivas del SIA (bloque 38, D92). Colonias sigue siendo de prueba**
y se sustituye antes de liberar la etapa (ver DECISIONES, pendientes). La de colonias pesa 3 MB compactada —125 mil vértices— y es la que más
conviene revisar en peso al llegar la definitiva.

La capa de colonias no cubre el suelo de conservación (532 km² al sur sin colonia) ni 31 km²
urbanos: un punto ahí se guarda con `colonia` nula y la pantalla dice «Sin colonia en la capa»
(D152). `generar_capas.py` ajusta cada geometría a la rejilla de seis decimales sin romperla y se
detiene si alguna queda inválida (el redondeo simple dejaba nueve colonias inválidas). Trae 215
solapes, casi siempre una unidad habitacional encima del pueblo que la rodea: gana el polígono más
pequeño. Doce colonias tienen el interior en otra alcaldía que la que declaran: la alcaldía sale de
su propia capa, nunca de la colonia (D62).

La capa definitiva de alcaldías no tiene huecos ni solapes (la anterior traía cinco y tres). Las
reglas se conservan por si una entrega futura los trae: en un solape gana el primer polígono; en un
hueco el registro se guarda sin alcaldía, con la versión de la capa, para rederivarlo. La malla UGA
definitiva tiene la misma geometría que la anterior y conserva ocho celdas cuyo prefijo no es la
alcaldía de su centro; no afecta al registro, cuya alcaldía sale de su propia capa. Al actualizar una
capa se sube `meta.version` en `generar_capas.py`.

**Dónde se acepta un punto (D152).** En la unión de las 16 alcaldías, con 100 m de margen
(`MAPA.MARGEN_AMBITO_M`): un árbol junto al límite cuyo GPS cae unos metros afuera toma la alcaldía
más cercana y la pantalla lo dice. La caja de `MAPA.LIMITES` sólo es el límite del mapa y el primer
filtro. La aplicación no abre si falta alguna de las tres capas; un registro sin alcaldía o sin las
tres capas en su `capa_version` no recibe folio (nunca `EXT-000` por una capa ausente). El folio
empieza con el **prefijo de la celda UGA, que no es la alcaldía del árbol** en el 4.3 % del
territorio. El detalle y el PDF dicen con qué capas se derivó cada registro, y si el punto quedó más
cerca del borde de su celda que la precisión del GPS, lo marca como «celda incierta».

## Pruebas

Requieren Python 3 con Playwright y Chromium (`pip install playwright` y `python3 -m playwright
install chromium`). Desde la carpeta del proyecto, con el servidor local levantado:

```
python3 -m http.server 8099 --bind 127.0.0.1      (en otra terminal)
python3 pruebas/prueba.py        # unos 10 minutos; al final dice «fallas: 0 de N»
python3 pruebas/auditoria.py
python3 pruebas/revisar.py
```

| Archivo | Qué comprueba |
|---|---|
| `prueba.py` | Recorrido completo: acceso, captura, listados, filtros, PDF, catálogos y cuentas, en los tres perfiles; también el ciclo de la base (sello, versión) y el respaldo alterado |
| `auditoria.py` | Consistencia de lo guardado y del modelo: esquema contra lo que se guarda, diccionario y `js/esquema.js` regenerados, dominios, vocabulario |
| `revisar.py` | Presentación en ocho combinaciones de ancho y zoom: desbordamiento, alto del mapa, tamaño de los controles y reglas anuladas |

## Salida a producción: lista de verificación

Nada de esto se hace en la Etapa 1; se deja escrito para no descubrirlo tarde (D150).

1. `ES_FICTICIO: false` en `js/config.js`. Apaga la banda de datos ficticios, la entrada de
   prueba, el cambio de perfil, las herramientas del pie (restaurar y restablecer ni siquiera se
   conectan), el envío y el folio simulados y el espejo de campos.
2. Conectar el proveedor institucional de identidad (`AUTENTICACION.PROVEEDOR` y
   `autenticar()` en `js/sesion.js`). Mientras siga «simulado», con `ES_FICTICIO: false` **el acceso
   queda cerrado**: nadie entra con cualquier contraseña.
3. Servidor de la Fase 2 con las reglas que hoy viven sólo en el teléfono: permisos en cada
   operación (`ACCIONES` en `js/permisos.js` es la lista), validación del esquema (`js/validar.js`
   es la referencia), llaves foráneas con las mismas relaciones con que el teléfono cuenta el uso
   antes de eliminar (`usosDe()` en `js/referencias.js`), bitácora propia, folio.
4. Capas definitivas de alcaldías, UGA y colonias (`pruebas/generar_capas.py`).
5. Mapa base con licencia confirmada; si cambia el dominio, también en la política de seguridad
   de `index.html`.
6. Aviso de privacidad publicado y reglas de conservación de fotos y datos del personal.
7. Retirar el espejo de campos siguiendo el encabezado de `js/espejo.js` y correr las pruebas: la
   app ya no lo exige al arrancar, y las pruebas comprueban que abre y funciona sin él (D153).

`DECISIONES.md` y `BITACORA.md` son la memoria formal del proyecto: qué se decidió y por qué, y
qué se hizo en cada bloque.
