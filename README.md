# SRP — Sistema de Registro de Plantaciones (SEDEMA)

Prototipo en **Etapa 1**: el formulario funciona entero en el dispositivo, con datos de prueba y
sin servidor. La conexión con servidores y el resto de las etapas vienen después, cuando se
decida pasar a ellas.

La versión que corre se lee al pie de cada pantalla.

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
| coordinador@ejemplo.local | Coordinador | Ve y edita los registros de su cuadrilla; no elimina |
| cabo@ejemplo.local | Cabo | Registra, y ve, edita y elimina sólo los suyos |

El perfil de **Consulta** existe en el sistema pero todavía no tiene cuenta: se crea desde
Usuarios cuando haga falta. Ve todo y genera reportes, sin capturar ni modificar nada.

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
js/permisos.js        ÚNICO lugar con las reglas de cada perfil
js/almacen.js         Base del dispositivo (IndexedDB) y bitácora
js/sesion.js          Acceso; se sustituye al conectar el proveedor institucional
js/datos-ficticios.js Cuentas y catálogos de arranque
js/derivacion.js      Cruce punto-en-polígono (alcaldía, UGA, colonia)
js/folio.js           Patrón, validación y etiqueta del folio; no lo emite
js/conexion.js        Estado de la conexión, aviso de qué hacer con los registros, respaldo y restauración
sw.js                 Service worker: la app abre sin señal; versión = marca ?v= de index.html
manifest.webmanifest  Instalación en pantalla de inicio; iconos provisionales en assets/
js/referencias.js     Catálogos y cuentas en memoria
js/iconos.js          Iconos por significado (guardar, eliminar, editar, ubicar)
js/reportes.js       Cierre del parte del día y reporte PDF de la jornada
js/mapa.js, foto.js, formulario.js, registros.js, catalogos.js,
js/usuarios.js, app.js, util.js
assets/fuentes/       Capas tal como llegaron (alcaldías, malla UGA, colonias); no se editan
assets/capa-alcaldias.js, capa-uga.js, capa-colonias.js  Las mismas capas, compactadas para la aplicación (generadas)
assets/logo.js        Logotipo SEDEMA incrustado
js/espejo.js          Espejo de campos, sólo en la versión de prueba (se elimina al cerrar la Etapa 1)
vendor/               Bibliotecas incluidas localmente (Leaflet, jsPDF, Turf)
```

## Al cerrar un bloque: subir la marca de versión

En `index.html`, cada archivo propio se pide con `?v=0.0.0`. **Ese número se sube en todas las
etiquetas a la vez** antes de publicar. Es lo único que obliga al navegador de quien ya abrió el
sitio a descargar la versión nueva; sin eso sirve unos archivos de su memoria y otros de la red, y
esa mezcla no arranca. `js/config.js` lee ese mismo número de su propia dirección, así que la
versión se escribe en un solo lugar.

Si aun así alguien cae en una mezcla, el sistema lo detecta al abrir y explica cómo forzar la
recarga, en vez de quedarse en blanco.

## Si cambian los datos de arranque

`SELLO_DATOS`, en `js/config.js`, se cambia cada vez que cambian las cuentas o los catálogos de
arranque. El dispositivo guarda el sello con el que sembró; si no coincide, vuelve a sembrar y lo
avisa en pantalla. Sin ese sello, un teléfono que ya había abierto el sistema se queda con los
datos anteriores: así fue como, al renombrar los perfiles, todas las cuentas aparecieron como
«Consulta».

## El reporte del día

El reporte es el **parte de una jornada**, no de un periodo: el botón sólo genera con un día
elegido —el atajo «Hoy», o la misma fecha en «Desde» y «Hasta»—. Con mes o año queda apagado y la
nota de al lado dice qué falta.

Al pulsarlo se abre el **cierre del parte**: sitio, actividades, personal, apoyo, encargado,
observaciones, chófer, vehículo y hora de finalización. Todos opcionales y de escritura libre, y
los que quedan vacíos no se imprimen. El encargado no se escribe: para un cabo es él; para quien
ve a varias personas es una lista de los cabos que registraron ese día.

Los totales por especie, el total de ejemplares, el resumen por programa y la alcaldía del sitio
**se calculan** a partir de los registros. Un total tecleado es un total que se puede equivocar.

Lo capturado se guarda por día y cuadrilla en el almacén `cierres`: volver a generar el parte de
un día no obliga a escribirlo otra vez.

## La base del dispositivo, mientras sea prototipo

Toda la estructura vive en `MIGRACIONES[1]`, dentro de `js/almacen.js`, y los almacenes que el
código espera se declaran en `ALMACENES`, en el mismo archivo. Al abrir, el sistema comprueba que
estén todos; si falta alguno —porque el dispositivo ya había abierto una estructura anterior— la
base se rehace y se vuelve a sembrar. Sin esa comprobación, un almacén nuevo no aparecería nunca
en un teléfono que ya había entrado, y la pantalla fallaría sin decir por qué.

Mientras los datos sean ficticios, un cambio de estructura se hace ahí mismo y la base se rehace
sola; no se acumulan migraciones. **Esto deja de valer con el primer dato real**: a partir de ahí,
cada cambio es una migración numerada que conserva lo guardado, y la anterior no se toca.

Todo vive en el navegador de cada dispositivo. Borrar los datos del navegador borra los registros.
No hay respaldo ni envío a ningún servidor.

## Mapa

La capa base es imagen de satélite de Esri, con los nombres de vías y lugares encima. Las tres
capas se declaran en `CAPAS`, dentro de `js/config.js`; cambiar de proveedor es cambiar esa lista.
La atribución se muestra porque la licencia lo exige.

## Sin señal

La app funciona sin internet: GPS, captura, guardado (IndexedDB), lista y PDF viven en el
teléfono; sólo la imagen del mapa deja de cargar, y el sistema avisa y deja colocar el punto. Un
*service worker* (`sw.js`) guarda la app completa la primera vez que se abre con señal, para que
vuelva a abrir sin red; se registra con la misma marca `?v=` de `index.html`, así que **subir la
marca al cerrar un bloque sigue siendo lo único que hay que hacer** para que los teléfonos
actualicen (el worker nuevo reemplaza al viejo al abrir con señal). `manifest.webmanifest` permite
instalarla en la pantalla de inicio. En la Etapa 1 no hay servidor: los registros se quedan en el
dispositivo; el encabezado dice el estado de la conexión, Registros dice cuántos registros guarda
el dispositivo y qué hacer, y «Guardar respaldo» produce un archivo con todo (se restaura desde
las herramientas de prueba). Ver D71 y D72.

## Folio del ejemplar

Nomenclatura adoptada: `SRP-AAA-000-AAAA-00000` (sistema, celda UGA, año, consecutivo por celda y
año; 22 caracteres). La clave de especie queda fuera del folio. En la Etapa 1 **ningún registro
tiene folio**: lo asigna el servidor una sola vez al sincronizar, y la pantalla y el PDF dicen
PROVISIONAL. `js/folio.js` guarda el patrón, la validación y la etiqueta de campo —lo que el
servidor reutilizará—; la emisión no existe todavía y depende de que el SIA entregue la malla UGA
corregida y congelada (DECISIONES D67–D69 y pendientes).

## Capas territoriales

Las capas son del SIA. Los archivos originales viven en `assets/fuentes/` y no se tocan: son la
constancia de qué se recibió. La aplicación carga versiones compactadas —atributos mínimos, seis
decimales— que produce `pruebas/generar_capas.py`. **Nunca se editan a mano**: para cambiar una
capa se sustituye el original y se vuelve a correr el script, que valida cantidad de features,
claves únicas, anillos cerrados y sistema de referencia antes de escribir nada.

| Capa | Archivo original | Features | Clave | Qué guarda el registro |
|---|---|---|---|---|
| Alcaldías | `alcaldias_cdmx.json` | 16 | `cvegeo` INEGI | `alcaldia_cve` y `alcaldia` (nombre) |
| Malla UGA | `ugasdata.wgs84.json` | 1,624 hexágonos de ~1 km² | `CLAVE` (`TLP-318`) | `uga` |
| Colonias | `colonias_iecm2022.geojson` | 1,837 unidades territoriales del IECM 2022 | `CVEUT` (`10-001`) | `colonia_cve` y `colonia` (nombre) |

**Las tres capas son provisionales, para probar.** Antes de liberar la etapa hay que sustituir
los tres originales por los definitivos del SIA y volver a correr `generar_capas.py` (ver
DECISIONES, pendientes). La de colonias pesa 3 MB compactada —125 mil vértices— y es la que más
conviene revisar en peso al llegar la definitiva.

La capa de colonias no cubre el suelo de conservación (532 km² al sur sin colonia): un punto ahí
se guarda con `colonia` nula y la pantalla dice «Sin colonia (fuera de zona urbana)». Trae 215
solapes, casi siempre una unidad habitacional encima del pueblo que la rodea: gana el polígono más
pequeño. Doce colonias tienen el interior en otra alcaldía que la que declaran: la alcaldía sale de
su propia capa, nunca de la colonia (D62).

La capa de alcaldías trae, de origen, cinco huecos y tres solapes entre polígonos vecinos (el mayor
hueco de 1.2 ha, el mayor solape de 2.5 ha). No se corrigen aquí. En un solape gana el primer
polígono de la capa; en un hueco el registro se guarda sin alcaldía, con la versión de la capa, para
rederivarlo cuando se corrija. Al actualizar una capa se sube `meta.version` en `generar_capas.py`.

## Pruebas

Con el servidor local levantado (`python3 -m http.server 8099`):

| Archivo | Qué comprueba |
|---|---|
| `prueba.py` | Recorrido completo: acceso, captura, listados, filtros, PDF, catálogos y cuentas, en los tres perfiles |
| `auditoria.py` | Consistencia de lo guardado: perfiles válidos, autores existentes, referencias que apuntan a algo |
| `revisar.py` | Presentación en ocho combinaciones de ancho y zoom: desbordamiento, alto del mapa, tamaño de los controles y reglas anuladas |
| `prueba_datos_viejos.py` | Que un dispositivo con datos de prueba anteriores se corrija solo |
| `prueba_base_vieja.py` | Que un dispositivo con una estructura anterior arranque |

`DECISIONES.md` y `BITACORA.md` son la memoria formal del proyecto: qué se decidió y por qué, y
qué se hizo en cada bloque.
