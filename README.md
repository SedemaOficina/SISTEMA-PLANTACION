# SRP — Sistema de Registro de Plantaciones (SEDEMA)

Prototipo en **Etapa 1**: el formulario funciona entero en el dispositivo, con datos de prueba y
sin servidor. La conexión con servidores y el resto de las etapas vienen después, cuando se
decida pasar a ellas.

La versión que corre se lee al pie de cada pantalla.

## Cómo se usa

1. **Registrar jornada** (pestaña Nuevo registro). Antes de registrar árboles se declara la jornada:
   nombre del sitio, programa, fecha, árboles que se van a plantar y, si se quiere, la ubicación y la dirección.
   Se marca también su **origen**: programada o pedido especial de otra instancia (SOBSE, una
   alcaldía), con quién lo solicita, del catálogo de solicitantes (D210, D217).
   El programa es de la jornada: todos sus árboles lo toman (D151). La fecha es el día en que
   empieza: la jornada puede seguir abierta varios días y cada árbol lleva la fecha en que se plantó
   (D204).
2. **Nuevo árbol.** Con la jornada activa: ubicación (GPS, toque en el mapa o coordenadas a mano),
   especie, comentarios y fotografía opcional; si la jornada empezó otro día, también la fecha de
   plantación. «Guardar» registra de una vez; sólo si hay algo que
   revisar (precisión baja, punto lejano, posible duplicado) abre la ficha de revisión.
3. **Jornadas.** Cada jornada con su mapa y lista numerados, sus avisos y la conciliación con los
   árboles previstos. Ahí se revisan los puntos y se cierra la jornada; la tuerca de cada punto edita, mueve a
   otra jornada, sustituye o elimina el árbol (un error de captura se corrige sin salir de la
   jornada). La coordinación hace ahí el **relevo de cabo**: pasa la jornada abierta a otro cabo de
   su cuadrilla, que sigue registrando en ella; el titular no cambia (D204). La ficha de cada
   jornada cerrada trae **«Generar reporte»**: datos de cierre, vista previa y PDF con croquis, sin
   salir de Jornadas; el vehículo se elige por su placa y el modelo y el tipo se ponen solos. El
   filtro «Reporte» deja las jornadas con reporte generado o sin generar. No hay sección Reportes.
4. **Supervisión** (coordinación y administración, primera sección al entrar) o **Mi avance** (el
   cabo, al final de su barra): lo plantado por semana, mes, año o rango, con filtros de alcaldía,
   programa y cabo; cuentan sólo las jornadas cerradas. Cifras, «Qué atender», gráfica, por cabo,
   por alcaldía con mapa, por especie y programa, y calidad del dato (D157, D158). De ahí salen los
   **informes** semanal, mensual, anual o por alcaldía en PDF con membrete, y la tabla de árboles en
   CSV para Excel (D159). Dentro están las **Fotografías** de los registros, con descarga en ZIP.
6. **Registros**: la lista de árboles con filtros, detalle, edición y eliminación que se deshace.
   **Configuración** (D195), sólo para la Administración global, desde el menú de la cuenta:
   **Usuarios**, **Catálogos** (programas, áreas, especies, vehículos, instituciones y solicitantes),
   **Parámetros** (sólo consulta), **Registro de cambios**, **Carga masiva** del histórico desde
   Excel o CSV (D196), que no vuelve a cargar lo que ya está y se deshace por lote (D199), y **Acerca del sistema**. El catálogo de especies se descarga en Excel.
7. **Instituciones** (D186–D193). Además de la Secretaría registran las alcaldías, otras
   dependencias del Gobierno de la CDMX (PAOT, SOBSE), empresas (Green Cover) y organizaciones
   civiles (Reforestamos México), con cuentas de cabo y de coordinación que da de alta la
   Secretaría: primero el tipo de institución, luego la institución, y el nombre completo en un solo
   campo. El cabo depende de uno o varios coordinadores de su misma institución. Las instituciones nuevas las
   agrega la Administración en Catálogos (D189). Cada cuenta y cada jornada llevan su institución;
   ninguna ve lo de otra. Programas: SEDEMA, todos; las demás, los que la Administración marca en
   Catálogos › Programas (de arranque: alcaldías, Gobierno de la CDMX y organizaciones civiles,
   Reforestación Urbana; empresas, Palmeras; D193). El cierre de las de fuera es encargado,
   observaciones y hora: personal, chófer y vehículo sólo los captura SEDEMA. Lo que plantan suma
   al total de la Ciudad; Supervisión y los informes de la Administración lo desglosan y filtran
   por institución.

## Cómo abrirlo

**En la computadora.** Doble clic en `index.html` sirve para mirar, pero para probar de verdad
conviene servirlo: `python3 -m http.server 8099` dentro de esta carpeta, y abrir
`http://127.0.0.1:8099/`. Así el navegador lo trata igual que al sitio publicado.

**En el teléfono.** La ubicación y la cámara sólo funcionan en una dirección `https://`, así que
hay que abrir el sitio publicado: https://sedemaoficina.github.io/SISTEMA-PLANTACION/

**Publicar un cambio.** Abrir GitHub Desktop, revisar que el commit esté hecho y pulsar
«Push origin». El sitio se actualiza solo en uno o dos minutos.
Un teléfono que ya tiene la aplicación sigue con su versión guardada hasta que la nueva termina de
bajar completa; entonces cambia sola al abrirla con señal. Si la descarga se corta, no cambia nada y
se reintenta la próxima vez. Un árbol a medio capturar se guarda como borrador y vuelve al abrir.

## Cuentas de arranque

El sistema arranca con once cuentas de prueba (D190, D192) y **ninguna plantación**: se
llena con lo que se capture.

| Correo | Institución | Perfil | Qué puede hacer |
|---|---|---|---|
| administracion@ejemplo.local | SEDEMA (Sistema de Información Ambiental) | Administración global | Ve, edita y elimina todo, y lleva Catálogos y Usuarios. **No captura registros** |
| coordinador@ejemplo.local | SEDEMA (DGSANPAVA) | Coordinador | Registra, y ve, edita y elimina los registros de su cuadrilla; elimina también las jornadas vacías y hace el relevo de cabo en una jornada abierta |
| cabo@ejemplo.local | SEDEMA (DGSANPAVA) | Cabo | Registra, y ve, edita y elimina sólo los suyos; descarga sus fotografías desde «Mi avance» |
| coordinador.alcaldia@ejemplo.local | Alcaldía Iztapalapa | Coordinador | Igual que un coordinador, sólo con los cabos de su institución; sin área |
| cabo.alcaldia@ejemplo.local | Alcaldía Iztapalapa | Cabo | Igual que un cabo; sin área; en el cierre, sin personal, chófer ni vehículo. Programa: Reforestación Urbana |
| coordinador.gobierno@ejemplo.local | PAOT (Gobierno de la CDMX) | Coordinador | Ídem coordinador de fuera |
| cabo.gobierno@ejemplo.local | PAOT (Gobierno de la CDMX) | Cabo | Ídem cabo de fuera. Programa: Reforestación Urbana |
| coordinador.empresa@ejemplo.local | Green Cover (Empresa privada) | Coordinador | Ídem coordinador de fuera |
| cabo.empresa@ejemplo.local | Green Cover (Empresa privada) | Cabo | Ídem cabo de fuera. Programa: Palmeras |
| coordinador.civil@ejemplo.local | Reforestamos México, A.C. (Organización civil) | Coordinador | Ídem coordinador de fuera |
| cabo.civil@ejemplo.local | Reforestamos México, A.C. (Organización civil) | Cabo | Ídem cabo de fuera. Programa: Reforestación Urbana |

Quien captura en campo es un **cabo**; quien lo dirige, un **coordinador**. En el código son
`CABO` y `COORDINADOR`, y los campos son `cabo_id` en las plantaciones y `coordinadores_ids` (una lista) en las
cuentas.

## Cómo se entra

Con **correo y contraseña**. Nadie se da de alta solo: las cuentas las crea la Administración
global desde Usuarios, en el menú de la cuenta.

**La contraseña todavía no se verifica.** Comprobarla en el navegador sería seguridad aparente,
porque cualquiera puede leer el código de la página; lo único que se comprueba es que el correo
corresponda a una cuenta dada de alta y activa. La verificación real la hará el proveedor
institucional más adelante, y entonces se sustituye sólo `autenticar()`, en `js/sesion.js`.

Mientras `ES_FICTICIO` sea `true` (en `js/config.js`), la pantalla de acceso ofrece además entrar
como cuenta de prueba, y el pie de página deja cambiar de cuenta y restablecer los datos. Todo eso
desaparece al poner `ES_FICTICIO: false`.

**Datos de demostración (D160).** Hasta abajo, en el pie, «Cargar datos de demostración» agrega casi
tres años de trabajo inventado (enero de 2024 a hoy): unas 1,300 jornadas y 17,000 árboles de la
Secretaría y de una institución de cada tipo —las alcaldías Iztapalapa y Coyoacán, PAOT, SOBSE,
Green Cover, Reforestamos México y una empresa de demostración—, con los cuatro programas. Registran
todas las cuentas de prueba que capturan (cabos y coordinadores, de SEDEMA y de fuera) y 16 cuentas
de demostración (D194), para probar Supervisión, Mi avance y los informes con volumen. Con
«Cambiar usuario (pruebas)», en el menú de la cuenta, se entra como cualquiera de sus cuentas (apellido «Demo»). «Quitar datos de
demostración» los borra sin tocar lo capturado; después, «Recuperar datos de demostración» los
vuelve a cargar iguales. Todo lo cargado lleva identificador «demo-» (`js/demostracion.js`).

## Estructura

La raíz es el sitio publicado; las carpetas de documentos, datos, herramientas y pruebas viajan en
el repositorio pero la app no las carga.

```
index.html              Pantallas y marca de versión de los archivos
sw.js                   Service worker: la app abre sin señal; versión = marca ?v= de index.html
manifest.webmanifest    Instalación en pantalla de inicio; iconos en assets/ (D90)
README.md               Este archivo

css/estilos.css         Estilos (orden fijo por bloques; ver el encabezado del archivo)

js/                     La aplicación, un archivo por tema
  config.js             ÚNICO lugar con valores configurables (distancias, precisión, versión, base)
  permisos.js           ÚNICO lugar con las reglas de cada perfil y lo que exige cada acción (D151)
  almacen.js            Base del dispositivo (IndexedDB), migraciones y bitácora
  sesion.js             Acceso; se sustituye al conectar el proveedor institucional
  derivacion.js         Cruce punto-en-polígono (alcaldía, UGA, colonia)
  prioritarias.js       Colonias prioritarias para reforestar: capa en los mapas, prioridad del punto y conteo por nivel (D206)
  folio.js              Patrón, validación y etiqueta del folio; sólo lo emite el servidor simulado de prueba (D110)
  conexion.js           Estado de la conexión (guía «¿Qué hacer sin internet?»)
  envio.js              Envío al servidor simulado con datos de prueba: cola, avisos de atraso, «Simular sin señal» (D111)
  esquema.js            Generado de datos/esquema.json por herramientas/generar_diccionario.py: no se edita a mano
  referencias.js        Catálogos y cuentas en memoria; quién usa cada valor, en todas las tablas (D151)
  jornada-activa.js     La jornada se declara antes de registrar: inicio, franja, cambiar, cerrar (D119)
  jornadas.js           Sección Jornadas: mapa y lista de un día de trabajo, avisos y conciliación (D112)
  formulario.js         Nuevo árbol y edición
  registros.js          Sección Registros y detalle del registro
  reportes.js           Datos de cierre y reporte PDF de la jornada
  croquis.js            Croquis del reporte: puntos numerados sobre imagen de satélite o fondo liso (D115)
  supervision.js, indicadores.js, informes.js   Supervisión, sus cifras y los informes PDF y CSV
  filtros.js            Zona de filtros de Fotografías: buscar, periodo, listas dependientes, fichas (D205)
  galeria.js            Sección Fotografías: rejilla, foto grande, descarga y ZIP (D118)
  catalogos.js, usuarios.js                     Administración de catálogos y cuentas
  mapa.js, foto.js, iconos.js, util.js, app.js  Mapa, fotografía, iconos, utilidades y arranque
  datos-ficticios.js    Cuentas y catálogos de arranque de la versión de prueba
  demostracion.js       Datos de demostración del pie (sólo versión de prueba; se retira al cerrar la Etapa 1)
  espejo.js             Espejo de campos (sólo versión de prueba; se retira al cerrar la Etapa 1)

assets/
  capas/                capa-alcaldias.js, capa-uga.js, capa-colonias.js y capa-prioritarias.js: capas compactadas (generadas)
  catalogos/            catalogo-especies.js (76 especies del SIA, generado) y catalogo-vehiculos.js (de prueba, placas ficticias)
  encabezado-ru-sia.png, encabezado-ru-sia-movil.png   Logotipo para el encabezado y el PDF
  icono-192.png, icono-512.png, icono-512-maskable.png, apple-touch-icon.png   Icono de la app (D90)

vendor/                 Bibliotecas incluidas localmente; versiones y licencias en vendor/LICENCIAS.md
  fuentes/              Cabin y Roboto en woff2 para la pantalla (subconjunto latino, ~110 KB) y Roboto en TTF
                        (normal, negrita y cursiva; latino extendido, ~100 KB) para incrustarla en los PDF

datos/                  El modelo de datos
  esquema.json          Fuente única del modelo de datos (D86)
  DICCIONARIO-DATOS.md  Inventario de tablas y diccionario de datos, generado de esquema.json
  MAPEO-CAMPOS.md       Campos vistos por pantalla: etiqueta ↔ campo, obligatorio, origen

docs/                   Memoria del proyecto
  FASE2-Y-TRASPASO.md   Lo que el programador del SIA debe construir, reemplazar y decidir
  DECISIONES.md         Decisiones numeradas (Dnn)
  BITACORA.md           Qué cambió en cada bloque y cómo se verificó
  MEJORAS.md            Tablero de mejoras (Mnn)

herramientas/           Generan archivos del sitio a partir de originales/ y de datos/
  generar_capas.py      originales/*.geojson → assets/capas/
  generar_especies.py   Excel de especies del SIA → assets/catalogos/catalogo-especies.js
  generar_diccionario.py  datos/esquema.json → datos/DICCIONARIO-DATOS.md y js/esquema.js
  extraer_iconos.py     Set de iconografía CDMX (.ai) → trazados para js/iconos.js

pruebas/                prueba.py (recorrido completo), auditoria.py (auditoría), auditoria_css.py (hoja de estilos), revisar.py (presentación) y requisitos.txt (bibliotecas)

originales/             Capas, catálogos e iconografía tal como llegaron; no se editan ni se publican
                        (.gitignore, D164); ver originales/LEEME.md
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
`datos/esquema.json`, se regenera el diccionario con `python3 herramientas/generar_diccionario.py` y se
ajusta `datos/MAPEO-CAMPOS.md`. No es opcional: `pruebas/auditoria.py` falla si el esquema y el
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
tener varias jornadas. Se genera desde la ficha de la jornada, en Jornadas. Primero se piden los **datos de cierre de la jornada**: personal,
apoyo, encargado, observaciones, chófer, vehículo y hora de finalización. Todos opcionales, y
los que quedan vacíos no se imprimen. El **vehículo** sale del catálogo (D162): se elige la placa,
agrupada por tipo, y el modelo y el tipo se ponen solos; arriba aparecen, a un toque, los tres que
más ha usado el encargado. Sólo se eligen vehículos del catálogo: uno prestado o rentado se da de alta primero en Catálogos (D174). El catálogo lo
lleva la Administración en Catálogos › Vehículos (`assets/catalogos/catalogo-vehiculos.js` trae 16 de
prueba con placas ficticias; las reales no se publican y se cargan en el servidor en la Fase 2). El encargado no se escribe: para un cabo
es él; para quien ve a varias personas se elige entre los cabos con registros ese día. Luego se
abre la **vista previa**, con el mismo contenido que tendrá el PDF, y desde ahí se genera el PDF.

**El PDF va por secciones (D163):** arriba el nombre del cabo y cinco cifras (árboles plantados,
previstos, avance, especies y porcentaje de nativas); luego 1) datos de identificación de la jornada
(nombre, día completo —«Jueves 25 de septiembre de 2026»—, alcaldía, colonia, dirección, programa,
árboles previstos, hora de finalización, comentarios y observaciones), 2) personal (participantes, apoyo
y chófer), 3) datos del vehículo (tipo, modelo y placas), 4) croquis, que encuadra todos los puntos
y aparta los números que se enciman, 5) ejemplares plantados (número, especie, nombre científico,
coordenada y precisión; sin folio), 6) totales por especie con su distribución y porcentaje, 7)
distribución de las especies en una barra (el conteo por especie ya lo da la tabla de totales y el avance contra lo previsto, la franja de cifras) y 8) comentarios por ejemplar: sólo
los árboles que tienen comentario, con su número y especie; si ninguno tiene, no sale (D164). Cada
dato dice su nombre en negritas.

Los totales por especie, los porcentajes, el total de ejemplares y las gráficas **se calculan** a
partir de los registros. Un total tecleado es un total que se puede equivocar.

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
registros. Por eso la guía «¿Qué hacer sin internet?» pide no borrar los datos del navegador y,
cuando hay registros en cola, dice cuántos son y de qué días (D183). No hay respaldo en el teléfono (D175): proteger lo capturado es
tarea del servidor y de su cola de envío en la Fase 2.

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
tocarla abre la guía con el estado del teléfono. El respaldo del teléfono («Guardar respaldo» y
«Restaurar respaldo») se retiró en el bloque 113 (D175, revoca D72). Ver D71, D149 y D175.

## Folio del ejemplar

Nomenclatura adoptada: `AAA-000-00000` (celda UGA y consecutivo de la celda; 13 caracteres). El
consecutivo corre en una secuencia perpetua por celda que no se reinicia nunca. La clave de especie queda fuera del folio. En la Etapa 1 **ningún registro
tiene folio**: lo asigna el servidor una sola vez al sincronizar, y la pantalla y el PDF dicen
PROVISIONAL. `js/folio.js` guarda el patrón, la validación y la etiqueta de campo —lo que el
servidor reutilizará—; la emisión no existe todavía y depende de que el SIA entregue la malla UGA
corregida y congelada (DECISIONES D67–D69 y pendientes).

## Modelo de datos

`datos/esquema.json` es la fuente única del modelo: las cinco tablas del dispositivo con cada campo
(tipo, nulo, origen, dominio, si se ve en pantalla, regla), los dominios y de dónde salen, las
relaciones, los campos derivados del punto o de la sesión, lo que se calcula y no se guarda, el
estado que vive sólo en memoria, los campos condicionales, las reglas vigentes con el archivo donde
viven y las que esperan al servidor. `datos/DICCIONARIO-DATOS.md` se genera de ahí y trae además el
borrador de tablas PostgreSQL para la Fase 2. `datos/MAPEO-CAMPOS.md` es la misma información vista por
pantalla (etiqueta ↔ campo). Los tres se auditan (D86).

## Catálogo de especies

Las especies son las reales del SIA: `CGO_ESPECIES_REFORESTACION_URBANA` (76 especies, verificadas
ficha por ficha contra EncicloVida/CONABIO el 22-09-2026). El Excel vive en `originales/` (no se publica, D164) y
`herramientas/generar_especies.py` lo convierte en `assets/catalogos/catalogo-especies.js`, que se siembra en el
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

Las capas son del SIA. Los archivos originales viven en `originales/`, fuera del sitio publicado
(D164), y no se tocan: son la constancia de qué se recibió. La aplicación carga versiones compactadas —atributos mínimos, seis
decimales— que produce `herramientas/generar_capas.py`. **Nunca se editan a mano**: para cambiar una
capa se sustituye el original y se vuelve a correr el script, que valida cantidad de features,
claves únicas, anillos cerrados y sistema de referencia antes de escribir nada.

| Capa | Archivo original | Features | Clave | Qué guarda el registro |
|---|---|---|---|---|
| Alcaldías | `alcaldias_cdmx.json` (definitiva; metadato en `originales/documentacion/`) | 16 | `cvegeo` INEGI | `alcaldia_cve` y `alcaldia` (nombre) |
| Malla UGA | `UGA_CDMX.geojson` (definitiva) | 1,624 hexágonos de ~1 km² | `clave` (`TLP-318`) | `uga` |
| Colonias | `colonias_iecm2022.geojson` | 1,837 unidades territoriales del IECM 2022 | `CVEUT` (`10-001`) | `colonia_cve` y `colonia` (nombre) |

**Las tres capas son definitivas:** alcaldías y UGA del SIA (bloque 38, D92) y colonias del IECM 2022, la unidad oficial
de reporte (bloque 117, D180). La de colonias pesa 3 MB compactada —125 mil vértices—: si se queda en el teléfono o sólo
en el servidor está en `docs/FASE2-Y-TRASPASO.md`.

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

Requieren Python 3 con Playwright, Chromium y cuatro bibliotecas más (pypdf, Pillow, openpyxl y
shapely), listadas en `pruebas/requisitos.txt`. Se corren desde la carpeta del proyecto, esté donde
esté, con el servidor local levantado:

```
pip install -r pruebas/requisitos.txt
python3 -m playwright install chromium
python3 -m http.server 8099 --bind 127.0.0.1      (en otra terminal)
python3 pruebas/prueba.py        # de 25 a 35 minutos; al final dice «fallas: 0 de N»
python3 pruebas/auditoria.py     # unos 2 minutos
python3 pruebas/revisar.py       # unos 2 minutos
```

Los archivos que `prueba.py` descarga o fabrica (PDF, CSV, hojas de cálculo) quedan en una carpeta
temporal del equipo (`srp_pruebas`). Dos variables de entorno cambian lo que viene de fábrica:
`SRP_BASE`, la dirección de la aplicación (`http://127.0.0.1:8099/`), y `SRP_SALIDA`, la carpeta de
esos archivos. El servidor debe servir la carpeta del proyecto: `prueba.py` levanta además un
segundo servidor propio en el puerto 8094 para probar el cambio de versión.

| Archivo | Qué comprueba |
|---|---|
| `prueba.py` | Recorrido completo: acceso, captura, listados, filtros, PDF, catálogos y cuentas, en los tres perfiles; también el ciclo de la base (sello, versión) y la seguridad ante datos alterados |
| `auditoria.py` | Consistencia de lo guardado y del modelo: esquema contra lo que se guarda, diccionario y `js/esquema.js` regenerados, dominios, vocabulario |
| `auditoria_css.py` | La norma de la hoja de estilos: colores sólo en `:root`, sin `#id` ni `!important`, medidas con token, una regla por selector, sin clases ni variables sin uso, sin estilos en línea. Corre dentro de `auditoria.py`; con `--todo` lista cada caso |
| `revisar.py` | Presentación en ocho combinaciones de ancho y zoom: desbordamiento, alto del mapa, tamaño de los controles y reglas anuladas |

## Salida a producción y Fase 2

Todo lo que hay que construir en el servidor, lo que es simulado y hay que reemplazar, lo que debe
entregar el SIA, las decisiones abiertas y el paquete de traspaso está reunido en
**`docs/FASE2-Y-TRASPASO.md`**. Nada de eso se hace en la Etapa 1.

`docs/DECISIONES.md` y `docs/BITACORA.md` son la memoria formal del proyecto: qué se decidió y por qué, y
qué se hizo en cada bloque.
