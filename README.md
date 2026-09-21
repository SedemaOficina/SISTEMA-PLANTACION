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
| administracion@ejemplo.local | Administración global | Todo, más las pestañas Catálogos y Usuarios |
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
js/derivacion.js      Cruce punto-en-polígono (alcaldía, colonia, UGA)
js/referencias.js     Catálogos y cuentas en memoria
js/iconos.js          Iconos por significado (guardar, eliminar, editar, ubicar)
js/mapa.js, foto.js, formulario.js, registros.js, reportes.js, catalogos.js,
js/usuarios.js, app.js, util.js
assets/capas-ficticias.js  Capas geográficas FICTICIAS (sustituir por las reales)
assets/logo.js        Logotipo SEDEMA incrustado
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

## La base del dispositivo, mientras sea prototipo

Toda la estructura vive en `MIGRACIONES[1]`, dentro de `js/almacen.js`. Mientras los datos sean
ficticios, un cambio de estructura se hace ahí mismo y la base se rehace sola; no se acumulan
migraciones. **Esto deja de valer con el primer dato real**: a partir de ahí, cada cambio es una
migración numerada que conserva lo guardado, y la anterior no se toca.

Todo vive en el navegador de cada dispositivo. Borrar los datos del navegador borra los registros.
No hay respaldo ni envío a ningún servidor.

## Mapa

La capa base es imagen de satélite de Esri, con los nombres de vías y lugares encima. Las tres
capas se declaran en `CAPAS`, dentro de `js/config.js`; cambiar de proveedor es cambiar esa lista.
La atribución se muestra porque la licencia lo exige.

## Sustituir las capas geográficas

Reemplazar `assets/capas-ficticias.js` conservando `SRP.CAPAS` y estos atributos:
- `alcaldias_colonias`: polígonos de colonia en EPSG:4326 con `cve_alc`, `alcaldia`, `cve_col`, `colonia`.
- `uga`: polígonos de la malla con `id_uga`.

Cada capa lleva `meta` con origen, versión y fecha de corte.

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
