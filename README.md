# SRP — Sistema de Registro de Plantaciones (SEDEMA)

[![Pruebas](https://github.com/SedemaOficina/SISTEMA-PLANTACION/actions/workflows/pruebas.yml/badge.svg)](https://github.com/SedemaOficina/SISTEMA-PLANTACION/actions/workflows/pruebas.yml)

El formulario funciona entero en el dispositivo. Con datos de prueba no habla con ningún servidor.
Con datos reales (`ES_FICTICIO: false`) entra con las cuentas del servicio del SRP (`servidor/`), que
instala el SIA. La conexión está completa desde la versión 1 (`docs/FASE2-Y-TRASPASO.md`): entrar, bajar
catálogos, cuentas y parámetros, ver lo ya enviado, que llega del servidor, y enviar lo que se captura.

La versión que corre se lee en la franja fija de arriba de cada pantalla.

## Cómo se usa

1. **Registrar jornada** (pestaña Nuevo registro). Antes de registrar árboles se declara la jornada:
   nombre del sitio, programa, fecha, árboles que se van a plantar y, si se quiere, la ubicación y la dirección.
   Si la jornada atiende una solicitud de otra instancia (SOBSE, una alcaldía), se elige el programa
   **Solicitud especial** y se dicen quién lo solicita, del catálogo de solicitantes, y de qué se trata.
   El programa es de la jornada: todos sus árboles lo toman. La fecha es el día en que
   empieza: la jornada puede seguir abierta varios días y cada árbol lleva la fecha en que se plantó.
2. **Nuevo árbol.** Con la jornada activa: ubicación (GPS, toque en el mapa o coordenadas a mano),
   especie, comentarios y fotografía opcional; si la jornada empezó otro día, también la fecha de
   plantación y si quedó en suelo o en macetón (empieza en «Suelo»). «Guardar» registra de una vez; sólo si hay algo que
   revisar (precisión baja, punto lejano, posible duplicado) abre la ficha de revisión.
3. **Jornadas.** Cada jornada con su mapa y lista numerados, sus avisos y la conciliación con los
   árboles previstos. Ahí se revisan los puntos y se cierra la jornada; al cerrar con puntos por revisar se
   ofrece revisarlos primero, uno tras otro, y al terminar vuelve a preguntar. La tuerca de cada punto edita, mueve a
   otra jornada, sustituye o elimina el árbol (un error de captura se corrige sin salir de la
   jornada). La coordinación hace ahí el **relevo de cabo**: pasa la jornada abierta a otro cabo de
   su institución, que sigue registrando en ella; el titular no cambia. En una jornada que abrió ella
   misma marca **cabos de apoyo**: la jornada es **compartida** y varios cabos registran a la vez, cada
   uno desde su teléfono, hasta que tocan «Terminar mi parte». La ficha de cada
   jornada cerrada trae **«Generar reporte»**: datos de cierre, vista previa y PDF con croquis, sin
   salir de Jornadas; el vehículo se elige por su placa y el modelo y el tipo se ponen solos. El
   filtro «Reporte» deja las jornadas con reporte generado o sin generar. No hay sección Reportes.
4. **Supervisión** (coordinación y administración, primera sección al entrar) o **Mi avance** (el
   cabo, al final de su barra): lo plantado por semana, mes, año o rango, con filtros de alcaldía,
   programa y cabo; cuentan sólo las jornadas cerradas. Arriba, cifras, «Qué atender», descargas y
   gráfica; debajo, cada desglose plegado con su dato principal: por cabo, institución, alcaldía y
   prioridad con mapa, por calle (red vial y quién la atiende), especie, programa y calidad del dato. De ahí salen los
   **informes** semanal, mensual, anual o por alcaldía en PDF con membrete, y la tabla de árboles en
   CSV para Excel. Dentro están las **Fotografías** de los registros, con descarga en ZIP. Lo que es de un
   solo cabo (lo que descarga el cabo, o con el filtro «Quién registró») lleva su nombre en el nombre del archivo.
6. **Registros**: la lista de árboles con filtros, detalle (sin folio, con la calle), edición y eliminación que se deshace.
   **Configuración**, sólo para la Administración global, última pestaña de la barra de secciones:
   **Usuarios**, **Catálogos** (programas, áreas, especies, vehículos, instituciones y solicitantes),
   **Parámetros** (se editan con datos reales; con datos de prueba, sólo consulta), **Registro de cambios**, **Carga masiva** del histórico desde
   Excel o CSV, que no vuelve a cargar lo que ya está y se deshace por lote, y **Acerca del sistema**. El catálogo de especies se descarga en Excel con la forma del libro de origen del SIA; desde Catálogos › Especies se abre **Especies escritas** (lo que se escribió en «Otra especie», para revisarlo fuera).
7. **Instituciones**. Además de la Secretaría registran las alcaldías, otras
   dependencias del Gobierno de la CDMX (PAOT, SOBSE), empresas (Green Cover) y organizaciones
   civiles (Reforestamos México), con cuentas de cabo y de coordinación que da de alta la
   Secretaría: primero el tipo de institución, luego la institución, y el nombre completo en un solo
   campo. La Coordinación trabaja con todos los cabos de su institución. Las instituciones nuevas las
   agrega la Administración en Catálogos. Cada cuenta y cada jornada llevan su institución;
   ninguna ve lo de otra. Programas: SEDEMA, todos; las demás, los que la Administración marca en
   Catálogos › Programas (de arranque: alcaldías, Gobierno de la CDMX y organizaciones civiles,
   Reforestación Urbana, y el Gobierno de la CDMX también Centro Histórico; empresas, Palmeras). El cierre de las de fuera es encargado,
   observaciones y hora: personal, chófer y vehículo sólo los captura SEDEMA. Lo que plantan suma
   al total de la Ciudad; Supervisión y los informes de la Administración lo desglosan y filtran
   por institución.

## Cómo abrirlo

**En la computadora.** Doble clic en `index.html` sirve para mirar, pero para probar de verdad
conviene servirlo: `python3 pruebas/servir.py` dentro de esta carpeta, y abrir
`http://127.0.0.1:8099/`. Así el navegador lo trata igual que al sitio publicado. (No `http.server`: deja
muy pocas conexiones en espera y en Windows rechaza archivos al abrir.)

**En el teléfono.** La ubicación y la cámara sólo funcionan en una dirección `https://`, así que
hay que abrir el sitio publicado: https://sedemaoficina.github.io/SISTEMA-PLANTACION/

**Publicar un cambio.** Abrir GitHub Desktop, revisar que el commit esté hecho y pulsar
«Push origin». El sitio se actualiza solo en uno o dos minutos.
Un teléfono que ya tiene la aplicación sigue con su versión guardada hasta que la nueva termina de
bajar completa; entonces cambia sola al abrirla con señal. Si la descarga se corta, no cambia nada y
se reintenta la próxima vez. Un árbol a medio capturar se guarda como borrador y vuelve al abrir; lo
mismo «Registrar jornada» a medio llenar y los datos de cierre de una jornada.

## Cuentas de arranque

El sistema arranca con trece cuentas de prueba y **ninguna plantación**: se
llena con lo que se capture.

| Correo | Institución | Perfil | Qué puede hacer |
|---|---|---|---|
| administracion@ejemplo.local | SEDEMA (Sistema de Información Ambiental) | Administración global | Ve, edita y elimina todo, y lleva Catálogos y Usuarios. **No captura registros** |
| direccion@ejemplo.local | SEDEMA (DGSANPAVA) | Directivo | Ve jornadas, registros, fotografías y avance de toda la Ciudad y descarga los reportes ya generados. **No registra ni modifica** |
| coordinador@ejemplo.local | SEDEMA (DGSANPAVA) | Coordinador | Registra, y ve, edita y elimina los registros de todos los cabos de su institución; elimina también las jornadas vacías, hace el relevo de cabo en una jornada abierta y abre jornadas compartidas |
| cabo@ejemplo.local | SEDEMA (DGSANPAVA) | Cabo | Registra, y ve, edita y elimina sólo los suyos; descarga sus fotografías desde «Mi avance» |
| direccion.alcaldia@ejemplo.local | Alcaldía Iztapalapa | Directivo | Igual que un directivo, sólo con lo de su institución |
| coordinador.alcaldia@ejemplo.local | Alcaldía Iztapalapa | Coordinador | Igual que un coordinador, sólo con los cabos de su institución; sin área |
| cabo.alcaldia@ejemplo.local | Alcaldía Iztapalapa | Cabo | Igual que un cabo; sin área; en el cierre, sin personal, chófer ni vehículo. Programa: Reforestación Urbana |
| coordinador.gobierno@ejemplo.local | PAOT (Gobierno de la CDMX) | Coordinador | Ídem coordinador de fuera |
| cabo.gobierno@ejemplo.local | PAOT (Gobierno de la CDMX) | Cabo | Ídem cabo de fuera. Programas: Reforestación Urbana y Centro Histórico |
| coordinador.empresa@ejemplo.local | Green Cover (Empresa privada) | Coordinador | Ídem coordinador de fuera |
| cabo.empresa@ejemplo.local | Green Cover (Empresa privada) | Cabo | Ídem cabo de fuera. Programa: Palmeras |
| coordinador.civil@ejemplo.local | Reforestamos México, A.C. (Organización civil) | Coordinador | Ídem coordinador de fuera |
| cabo.civil@ejemplo.local | Reforestamos México, A.C. (Organización civil) | Cabo | Ídem cabo de fuera. Programa: Reforestación Urbana |

Quien captura en campo es un **cabo**; quien lo dirige, un **coordinador**; quien sólo ve —subdirecciones,
direcciones de área y generales—, un **directivo** (`DIRECTIVO`); el SIA es la **Administración global**. En el código son
`CABO` y `COORDINADOR`, y el cabo de cada árbol es `cabo_id`. Las cuentas no llevan coordinadores: la Coordinación
alcanza a todos los cabos de su institución.

## Cómo se entra

Con **correo y contraseña**. Nadie se da de alta solo: las cuentas las crea la Administración
global desde Usuarios, en Configuración.

**Con datos de prueba, la contraseña no se verifica.** Comprobarla en el navegador sería seguridad
aparente, porque cualquiera puede leer el código de la página. Lo único que se comprueba es que el correo
corresponda a una cuenta dada de alta y activa.

**Con datos reales, la verifica el servicio del SRP**, en `/api/srp` del mismo sitio:
- El servicio abre la sesión con una cookie sólo HTTP, que la aplicación no ve.
- Al entrar bajan los catálogos, la cuenta, las cuentas que cada quien ve (sin correo, salvo la
  Administración global) y los parámetros. Eso se queda en el teléfono para trabajar sin señal.
- Lo ya enviado —jornadas y árboles del alcance de cada quien— llega del servidor y vive sólo en memoria
  mientras la aplicación está abierta: el teléfono no acumula historial (`js/remoto.js`). Sin señal se ve
  sólo lo que aún no se envía: Registros y Jornadas lo dicen con una franja, y Supervisión y Fotografías,
  que se arman con lo enviado, enseñan sólo un aviso.
- Las fotografías de lo enviado se piden al servidor cuando se ven o se descargan, y ni el teléfono ni el
  navegador guardan copia (`js/foto.js`). Una que el servidor no tiene no se ve rota: en su lugar queda la
  miniatura vacía.
- **El envío** (`js/cola.js`). Cada cambio a una jornada o a un árbol se anota en la cola de envío, en la
  misma transacción que el cambio, como la operación del servidor que le corresponde.
  - La cola se envía sola: al guardar, al volver la señal, al volver a la aplicación y cada minuto; «Enviar
    ahora» la fuerza.
  - El servidor responde con el folio y lo que pone él; la fotografía sube después de su árbol.
  - Lo que el servidor no acepta se queda en el teléfono con su motivo y no se vuelve a enviar solo: la
    franja de arriba lo dice y en «Revisar» la persona decide qué hacer con cada cambio —enviarlo otra vez,
    quedarse con lo del servidor, corregirlo, eliminarlo o descartarlo— (`js/rechazos.js`).
  - Al cerrar la jornada y entregar su reporte, lo recibido sale del teléfono, como pide S-11.
  - Si la sesión vence con un árbol a medias, se avisa y se pide entrar al guardarlo.
  - Se trabaja en una pestaña a la vez (`js/turno.js`): la que quedó atrás se detiene con un aviso y «Usar
    aquí». Lo que salió sin respuesta se reenvía tal como salió, y la fotografía sólo sale de la cola cuando
    el servicio la confirma.
- **Las cuentas** las da de alta y cambia la Administración global en el servidor (`js/usuarios.js`), que las
  revisa con las mismas reglas. El alta y «Restablecer contraseña» dan una contraseña temporal que se ve una
  sola vez, para dársela a la persona en persona o por teléfono. Desactivar cierra sus sesiones; eliminar sólo
  se puede con una cuenta que no aparece en nada y nunca entró al sistema, y eso lo cuenta el servidor.
- **Los catálogos** los cambia la Administración global en el servidor (`js/catalogos.js`): cada alta,
  edición, activación o eliminación va allá, que la revisa con las mismas reglas y la anota en su bitácora,
  y el teléfono guarda lo que responde. El uso de cada valor lo cuenta el servidor. Sin conexión se
  consultan, pero no cambian.
- **Los parámetros** son del servidor, iguales para todos los teléfonos: la Administración global los cambia
  en Configuración › Parámetros, con «Editar» en cada valor, y cada teléfono recibe el cambio la próxima vez
  que se conecta. Con datos de prueba sólo se consultan.
- **La bandeja de posibles duplicados** (`js/duplicados.js`), en Configuración: las parejas de árboles de la
  misma especie, de instituciones distintas, casi en el mismo lugar, que el servidor anota sin decirle nada a
  ninguna de las dos. La Administración global revisa cada una —con su mapa y sus dos árboles— y dice si es el
  mismo árbol o si son distintos.
- **La carga masiva** (`js/carga.js`) revisa el archivo en el teléfono, como siempre, y lo sube al servidor por
  tandas, que lo vuelve a revisar y da el folio de cada árbol; nada se ve hasta que llega entero. Las cargas
  hechas las lista el servidor, y «Deshacer carga» quita el lote de la vista y de las cifras.
- **La bitácora** de lo enviado está en el servidor: el historial de cada árbol y el Registro de cambios de
  Configuración se leen de allá, con lo del teléfono que aún espera envío. Sin conexión queda lo del teléfono,
  y el Registro de cambios lo dice.
- Al volver a abrir se entra sin esperar, también sin señal, con los últimos parámetros. Si hay señal, el
  servicio confirma la sesión, se pone al día lo que se queda en el teléfono y se trae lo enviado.
- Si la sesión venció o la cerró la Administración, se vuelve a pedir la contraseña sin perder lo
  guardado.
- «Cerrar sesión» cierra también la del servicio.
- Quien entra con la contraseña temporal que le dio la Administración escribe una propia antes de seguir
  («Cambie su contraseña»): la aplicación dice qué pide —al menos 10 caracteres, letras y números, que no
  contenga su correo— y el servicio la vuelve a revisar. Puede salir sin cambiarla.

Todo eso vive en `js/sesion.js`, `js/servidor.js` y `js/remoto.js`.

Mientras `ES_FICTICIO` sea `true` (en `js/config.js`), la pantalla de acceso ofrece además entrar
como cuenta de prueba, y el pie de página deja cambiar de cuenta y restablecer los datos. Todo eso
desaparece al poner `ES_FICTICIO: false`.

**Datos de demostración.** Hasta abajo, en el pie, «Cargar datos de demostración» agrega casi
tres años de trabajo inventado (enero de 2024 a hoy): unas 1,450 jornadas y 22,000 árboles de la
Secretaría y de una institución de cada tipo —las alcaldías Iztapalapa y Coyoacán, PAOT, SOBSE,
Green Cover, Reforestamos México y una empresa de demostración—, con los cuatro programas, unas 40
jornadas compartidas y 20 con relevo (hoy quedan abiertas una compartida que coordina Estela Ramírez
y una con relevo que empezó Julián Ortega). Registran
todas las cuentas de prueba que capturan (cabos y coordinadores, de SEDEMA y de fuera) y 16 cuentas
de demostración, para probar Supervisión, Mi avance y los informes con volumen. Con
«Cambiar usuario (pruebas)», en el menú de la cuenta, se entra como cualquiera de sus cuentas (apellido «Demo»). «Quitar datos de
demostración» los borra sin tocar lo capturado; después, «Recuperar datos de demostración» los
vuelve a cargar iguales. Todo lo cargado lleva identificador «demo-» (`js/demostracion.js`).

## Estructura

La raíz es el sitio publicado; las carpetas de documentos, datos, herramientas y pruebas viajan en
el repositorio pero la app no las carga.

```
index.html              Pantallas y marca de versión de los archivos
sw.js                   Service worker: la app abre sin señal; versión = marca ?v= de index.html
manifest.webmanifest    Instalación en pantalla de inicio; iconos en assets/
README.md               Este archivo
VERSION                 El número de versión, el mismo de la marca ?v=; la franja de arriba lo muestra

css/estilos.css         Estilos (orden fijo por bloques; ver el encabezado del archivo)

js/                     La aplicación, un archivo por tema
  config.js             ÚNICO lugar con valores configurables (distancias, precisión, versión, base)
  permisos.js           ÚNICO lugar con las reglas de cada perfil y lo que exige cada acción
  almacen.js            Base del dispositivo (IndexedDB), migraciones y bitácora
  servidor.js           Cómo se habla con el servicio del SRP (/api/srp): cada pedido dice si respondió, si faltó conexión o qué no aceptó
  remoto.js             Lo que viene del servidor: catálogos, cuentas y parámetros, que se quedan; lo enviado, sólo en memoria; los avisos cuando falta
  cola.js               La cola de envío con datos reales: qué se anota con cada cambio, cómo se envía y qué hace el teléfono con la respuesta
  turno.js              Una pestaña a la vez: la que quedó atrás se detiene con su aviso y «Usar aquí»
  reloj.js              La hora del teléfono contra la del servidor: una franja ámbar si no cuadra
  rechazos.js           Lo que el servidor no aceptó: la ventana «Revisar» y lo que la persona decide con cada cambio
  duplicados.js         La bandeja de posibles duplicados entre instituciones, que revisa la Administración global
  sesion.js             Acceso: simulado con datos de prueba; con datos reales, las cuentas del servicio (correo y contraseña)
  derivacion.js         Cruce punto-en-polígono (alcaldía, UGA, colonia)
  prioritarias.js       Colonias prioritarias para reforestar: prioridad de la jornada y de su colonia, y la capa en los mapas
  folio.js              Patrón, validación y etiqueta del folio; sólo lo emite el servidor simulado de prueba
  calles.js             La calle de cada árbol: cómo se enseña y se cuenta; con datos de prueba, el servidor simulado la calcula
  conexion.js           Estado de la conexión (guía «¿Qué hacer sin internet?»)
  envio.js              Envío al servidor simulado con datos de prueba: cola, avisos de atraso, «Simular sin señal»
  esquema.js            Generado de datos/esquema.json por herramientas/generar_diccionario.py: no se edita a mano
  referencias.js        Catálogos y cuentas en memoria; quién usa cada valor, en todas las tablas
  jornada-activa.js     La jornada se declara antes de registrar: inicio, franja, cambiar, cerrar
  jornadas.js           Sección Jornadas: mapa y lista de un día de trabajo, avisos y conciliación
  formulario.js         Nuevo árbol y edición
  registros.js          Sección Registros y detalle del registro
  reportes.js           Datos de cierre y reporte PDF de la jornada
  croquis.js            Croquis del reporte: puntos numerados sobre imagen de satélite o fondo liso
  supervision.js, indicadores.js, informes.js   Supervisión, sus cifras y los informes PDF y CSV
  filtros.js            Zona de filtros de Fotografías: buscar, periodo, listas dependientes, fichas
  galeria.js            Sección Fotografías: rejilla, foto grande, descarga y ZIP
  catalogos.js, usuarios.js                     Administración de catálogos y cuentas
  configuracion.js      Configuración (Administración global): una tarjeta por apartado, parámetros y registro de cambios
  especies-revision.js  Especies escritas en «Otra especie», para revisarlas (desde Catálogos › Especies)
  carga.js, excel.js    Carga masiva de árboles anteriores desde Excel o CSV, y lectura y escritura de .xlsx
  solicitud.js          Jornadas del programa «Solicitud especial»: quién lo solicita y de qué se trata
  mapa.js, foto.js, iconos.js, util.js, app.js  Mapa, fotografía, iconos, utilidades y arranque
  datos-ficticios.js    Cuentas de prueba y lo que siembra la versión de prueba (sólo versión de prueba)
  herramientas-prueba.js  Entrar con una cuenta de prueba, «Datos de prueba», «Restablecer» y la franja de datos
                        ficticios (sólo versión de prueba)
  demostracion.js       Datos de demostración del pie (sólo versión de prueba)
  espejo.js             Espejo de campos (sólo versión de prueba)
                        La copia real que se publica en el SIA no lleva estos cuatro, ni sus bloques de index.html
                        (herramientas/preparar_produccion.py)

assets/
  capas/                capa-alcaldias.js, capa-uga.js, capa-colonias.js y capa-prioritarias.js: capas compactadas (generadas)
  calles/               Copia ligera de la capa de calles, en 97 celdas de unos 4 km (sólo versión de prueba, generada)
  catalogos/            catalogo-especies.js (79 especies del SIA, generado), catalogos-arranque.js (los programas, áreas,
                        instituciones y solicitantes reales con que arranca el sistema) y catalogo-vehiculos.js (sólo
                        versión de prueba, placas ficticias)
  encabezado-ru-sia.png, encabezado-ru-sia-movil.png   Logotipo para el encabezado y el PDF
  icono-192.png, icono-512.png, icono-512-maskable.png, apple-touch-icon.png   Icono de la app

vendor/                 Bibliotecas incluidas localmente; versiones y licencias en vendor/LICENCIAS.md
  fuentes/              Cabin y Roboto en woff2 para la pantalla (subconjunto latino, ~110 KB) y Roboto en TTF
                        (normal, negrita y cursiva; latino extendido, ~100 KB) para incrustarla en los PDF

datos/                  El modelo de datos
  esquema.json          Fuente única del modelo de datos
  DICCIONARIO-DATOS.md  Inventario de tablas y diccionario de datos, generado de esquema.json
  HUELLA-CAPAS.md       Cuenta, claves, superficie y centroides de las capas, para compararlas con las del SIA
  HUELLA-CAPAS.json     Lo mismo, para leerlo con un programa (lo escribe herramientas/huella_capas.py)
  MAPEO-CAMPOS.md       Campos vistos por pantalla: etiqueta ↔ campo, obligatorio, origen

docs/                   Memoria del proyecto
  FASE2-Y-TRASPASO.md   Lo que el programador del SIA debe construir, reemplazar y decidir
  PLAN-TRASPASO-SIA.md  Cómo se llega a los servidores del SIA: fases, responsables, decisiones y riesgos
  ALINEACION-SIA.md     Cómo trabaja el backend del SIA, cómo se alinea el servidor del SRP y lo que el SIA pidió a otros proyectos
  GUIA-PROYECTOS-SIA.md  Guía para empezar un proyecto nuevo pensando desde el principio en el SIA
  AUDITORIA-INTEGRAL-APP.md  Auditoría de la aplicación: seguridad, integridad, accesibilidad, rendimiento y código
  AUDITORIA-COMPLETA.md  Auditoría de todo el proyecto: archivos, código, reglas, diseño, textos, botones y avisos
  REVISION-SERVIDOR.md  Revisión del servidor: seguridad, integridad, alineación con el SIA y mediciones
  AUDITORIA-2026-10-19.md  Auditoría profesional del 19-10-2026, con su evidencia y el seguimiento de las correcciones
  FALLAS-COMPARTIDAS.md  Fallas de componentes del SIA que usa el SRP, para el equipo del SIA
  manual/               Los dos manuales en PDF, con su fuente y sus capturas: el del personal (cabos, coordinación y dirección;
                        manual-personal.html, capturas-personal/) y el de la Administración global (manual-administracion.html, capturas/)
  REVISION-PANTALLAS.md, REVISION-ARCHIVOS.md   Revisiones de las pantallas y de los archivos que se descargan
  DECISIONES.md         Decisiones numeradas (Dnn)
  BITACORA.md           Qué cambió en cada bloque y cómo se verificó
  MEJORAS.md            Tablero de mejoras (Mnn)

herramientas/           Generan archivos del sitio a partir de originales/ y de datos/
  generar_capas.py      originales/*.geojson → assets/capas/
  generar_calles.py     calles_cdmx.gpkg del paquete calles-cdmx → assets/calles/ (la copia ligera)
  huella_capas.py       assets/capas/ → datos/HUELLA-CAPAS.md y .json; con un archivo, compara contra otra fuente
  generar_especies.py   Excel de especies del SIA → assets/catalogos/catalogo-especies.js
  generar_diccionario.py  datos/esquema.json → datos/DICCIONARIO-DATOS.md y js/esquema.js
  generar_sql.py        datos/esquema.json → servidor/db/srp/02-srp-tablas.sql (las tablas del servidor)
  exportar_datos_app.py La base de un teléfono de prueba con la demostración → servidor/local/datos-app.json, para cargarla en la base local
  extraer_iconos.py     Set de iconografía CDMX (.ai) → trazados para js/iconos.js
  manual_personal.py    Capturas de la aplicación con datos reales, contra el servicio local, y el PDF del manual del personal (docs/manual/)
  manual_administracion.py  Lo mismo para el manual de la Administración global
  manual_pdf.py         El PDF de los dos manuales: versión y fecha en la portada, el membrete arriba de cada página y las capturas en JPEG;
                        con --version X (en los dos programas), el manual de esa versión antes de que el proyecto la lleve
  preparar_produccion.py  La copia de la aplicación que se publica en el SIA: datos reales y sin los archivos de prueba
  empaquetar.py         Una carpeta → paquete para el SIA: manifiesto con la suma de cada archivo, ZIP y su .sha256; pide VERSION (0.N sólo con --revision); se detiene ante archivos de trabajo y avisos sin revisar (AVISOS-REVISADOS.txt)

pruebas/                prueba.py (recorrido completo) y por_tramos.py (el mismo, por tramos), prueba_conexion.py (con datos reales, contra el servicio local) y su apoyo_servidor.mjs, auditoria.py (auditoría), auditoria_css.py (hoja de estilos), revisar.py (presentación), servir.py (el servidor local para correrlas, que reenvía /api/ al servicio) y requisitos.txt (bibliotecas)

servidor/               El servicio del SRP (TypeScript sobre Node.js, y PostgreSQL con PostGIS): guiones SQL del esquema srp (db/srp/), el módulo para el backend del SIA (src/modulos/srp/), la primera cuenta (deploy/), fragmento del servidor web (servidor-web/) y sus pruebas; ver servidor/README.md

originales/             Capas, catálogos e iconografía tal como llegaron; no se editan ni se publican
                        (.gitignore); ver originales/LEEME.md

.github/workflows/      pruebas.yml: las pruebas de la aplicación en cada subida, en un equipo de GitHub
```

## Al cerrar un bloque: subir la marca de versión

En `index.html`, cada archivo propio se pide con `?v=0.0.0`. **Ese número se sube en todas las
etiquetas a la vez** antes de publicar. Es lo único que obliga al navegador de quien ya abrió el
sitio a descargar la versión nueva; sin eso sirve unos archivos de su memoria y otros de la red, y
esa mezcla no arranca. `js/config.js` lee ese mismo número de su propia dirección, así que la
versión se escribe en un solo lugar del código.

**El archivo `VERSION`, en la raíz, lleva el mismo número** (lo pide la guía del SIA, sección 8); la prueba
falla si no coincide con la marca. Ese número se ve siempre en la franja fija de arriba. Hasta la 0.9.78 decía
«Versión de prueba 0.9.N»; desde la versión 1, la que se entrega al SIA para instalar, dice «Versión» y el número de `VERSION`
(hoy, «Versión 1.4.6»).

**Las pruebas de GitHub, en verde.** Cada subida corre la prueba completa en GitHub (`.github/workflows/pruebas.yml`;
el indicador de arriba dice cómo salió la última). Antes de cerrar un bloque se revisa que la corrida del commit
anterior haya salido en verde, y la verificación de la bitácora dice su número y su resultado. Una corrida en rojo
se resuelve antes de seguir: no se acumula.

Si aun así alguien cae en una mezcla, el sistema lo detecta al abrir y explica cómo forzar la
recarga, en vez de quedarse en blanco.

**Si el bloque tocó algún campo** (nuevo, retirado, otro dominio, otra regla): se actualiza
`datos/esquema.json`, se regenera el diccionario con `python3 herramientas/generar_diccionario.py` y se
ajusta `datos/MAPEO-CAMPOS.md`. No es opcional: `pruebas/auditoria.py` falla si el esquema y el
sistema no guardan lo mismo o si el diccionario no está regenerado.

**Si el bloque tocó una pantalla:** en el cierre se dice qué se agregó y qué se pudo quitar. Cada
control nuevo tiene que ganarse su lugar: `pruebas/auditoria.py` cuenta los filtros de cada vista y
falla si alguna pide más de ocho, o más de cuatro a la vista.

## Si cambian los datos de arranque

`SELLO_DATOS`, en `js/config.js`, se cambia cada vez que cambian las cuentas o los catálogos de
arranque. El dispositivo guarda el sello con el que cargó los datos de ejemplo; si no coincide y
**no hay nada capturado** (árboles, jornadas o bitácora), los vuelve a cargar y lo avisa. Si hay
capturas, **no se borra nada**: con datos de prueba el teléfono es la única copia. Por eso un
cambio en la forma de los datos se resuelve con una migración numerada en `js/almacen.js`, que
traslada lo guardado antes de retirar nada, y no con el sello.

## El reporte de la jornada

El reporte es el **parte de una jornada**, no de un día ni de un periodo: un día puede
tener varias jornadas. Se genera desde la ficha de la jornada, en Jornadas. Primero se piden los **datos de cierre de la jornada**: personal,
apoyo, encargado, observaciones, chófer, vehículo y hora de finalización. La hora es obligatoria: sin ella no
sale la vista previa. Los demás son opcionales, y los que quedan vacíos no se imprimen. El **vehículo** sale del catálogo: se elige la placa,
agrupada por tipo, y el modelo y el tipo se ponen solos; arriba aparecen, a un toque, los tres que
más ha usado el encargado. Sólo se eligen vehículos del catálogo: uno prestado o rentado se da de alta primero en Catálogos. El catálogo lo
lleva la Administración en Catálogos › Vehículos (`assets/catalogos/catalogo-vehiculos.js` trae 16 de
prueba con placas ficticias; las reales no se publican: van sólo en el guion de datos de arranque del paquete
de instalación). El encargado no se escribe: para un cabo
es él; para quien ve a varias personas se elige entre los cabos con registros ese día. Luego se
abre la **vista previa**, con el mismo contenido que tendrá el PDF, y desde ahí se genera el PDF.

**El PDF va por secciones:** arriba el nombre del cabo y cinco cifras (árboles plantados,
previstos, avance, especies y porcentaje de nativas); luego 1) datos de identificación de la jornada
(nombre, día completo —«Jueves 25 de septiembre de 2026»—, alcaldía, colonia, dirección, programa,
árboles previstos, hora de finalización, comentarios y observaciones), 2) personal (participantes, apoyo
y chófer), 3) datos del vehículo (tipo, modelo y placas), 4) croquis, que encuadra todos los puntos
y aparta los números que se enciman, 5) ejemplares plantados (número, especie, nombre científico,
el sitio si algún árbol quedó en macetón, la calle si el servidor ya la puso, precisión, el comentario si algún árbol lo tiene y la fecha si la jornada duró varios días; sin coordenada ni folio: dónde quedó
cada árbol lo dice el croquis), 6) totales por especie con su distribución y porcentaje y 7)
distribución de las especies en una barra (el conteo por especie ya lo da la tabla de totales y el avance contra lo previsto, la franja de cifras). Cada
dato dice su nombre en negritas.

Los totales por especie, los porcentajes, el total de ejemplares y las gráficas **se calculan** a
partir de los registros. Un total tecleado es un total que se puede equivocar.

Lo capturado se guarda en la propia jornada (almacén `jornadas`): volver a generar el
reporte de una jornada no obliga a escribirlo otra vez.

## La base del dispositivo

La estructura vive en migraciones numeradas (`MIGRACIONES` en `js/almacen.js`; hoy van diez) y los
almacenes que el código espera se declaran en `ALMACENES`. **Lo capturado no se borra solo**:
un cambio de estructura es una migración nueva que traslada lo guardado antes de retirar nada; una
base a la que le falta un almacén, o de una versión posterior, se rehace conservando cada renglón;
y el sello de datos sólo vuelve a cargar las cuentas y catálogos de ejemplo cuando no hay nada
capturado. Al guardar el primer árbol se pide al navegador que no desaloje lo guardado.

Con datos de prueba todo vive en el navegador de cada teléfono; con datos reales, lo que aún no se envía.
Borrar los datos del navegador borra eso. Por eso la guía «¿Qué hacer sin internet?» pide no borrar los datos del navegador y,
cuando hay registros en cola, dice cuántos son y de qué días. No hay respaldo en el teléfono: proteger lo capturado es
tarea del servidor y de su cola de envío (`js/cola.js`).

## Mapa

Hay dos mapas base, los dos de Esri: «Satélite», la imagen con los nombres de vías y lugares encima, y
«Calles». Sus capas se declaran en `CAPAS` y `CAPAS_CALLES`, dentro de `js/config.js`; cambiar de proveedor es cambiar esa lista
y el dominio en la política de seguridad de `index.html`. Cada mapa —captura, jornada, ficha de
revisión y detalle— muestra el crédito de cada capa tal como lo declara su servicio y «Powered by
Esri»; el croquis del PDF lo lleva al pie. Para producción está decidido CARTO para «Calles», con su clave en
el servidor, y Esri en su modalidad gratuita para «Satélite» (D251). Falta el paso de CARTO por el servidor
y confirmar los límites de uso de Esri.

## Sin señal

La app funciona sin internet: GPS, captura, guardado (IndexedDB), lista y PDF viven en el
teléfono; sólo la imagen del mapa deja de cargar, y el sistema avisa y deja colocar el punto. Un
*service worker* (`sw.js`) guarda la app completa la primera vez que se abre con señal, para que
vuelva a abrir sin red; se registra con la misma marca `?v=` de `index.html`, así que **subir la
marca al cerrar un bloque sigue siendo lo único que hay que hacer** para que los teléfonos
actualicen (el worker nuevo reemplaza al viejo al abrir con señal). `manifest.webmanifest` permite
instalarla en la pantalla de inicio. Con datos de prueba no hay servidor: los registros se quedan en el
dispositivo y el envío es simulado; con datos reales salen al servidor. La pastilla del encabezado dice el
estado de la conexión y del envío, y al
tocarla abre la guía con el estado del teléfono. No hay respaldo dentro del teléfono: lo capturado
se protege enviándolo al servidor.

## Folio del ejemplar

Nomenclatura adoptada: `AAA-000-00000` (celda UGA y consecutivo de la celda; 13 caracteres). El
consecutivo corre en una secuencia perpetua por celda que no se reinicia nunca. La clave de especie queda fuera del folio. **El folio lo da el servidor**, una sola
vez, al recibir el árbol, y no cambia (D292); mientras no llega, la pantalla y el PDF dicen PROVISIONAL.
Con datos de prueba lo da el servidor simulado. `js/folio.js` guarda el patrón, la validación y la
etiqueta de campo.

## Modelo de datos

`datos/esquema.json` es la fuente única del modelo: las diez tablas del dispositivo —árboles, jornadas, cuentas, bitácora y los seis catálogos, cada uno en la suya— con cada campo
(tipo, nulo, origen, dominio, si se ve en pantalla, regla), los dominios y de dónde salen, las
relaciones, los campos derivados del punto o de la sesión, lo que se calcula y no se guarda, el
estado que vive sólo en memoria, los campos condicionales, las reglas vigentes con el archivo donde
viven y las que esperan al servidor. `datos/DICCIONARIO-DATOS.md` se genera de ahí y trae además el
borrador de tablas PostgreSQL para la Fase 2. `datos/MAPEO-CAMPOS.md` es la misma información vista por
pantalla (etiqueta ↔ campo). Los tres se auditan.

## Catálogo de especies

Las especies son las reales del SIA, del libro `16._Registro_plantaciones_catalogos_05_10_2026.xlsx`: 79 especies,
las 76 de la paleta vegetal de la Secretaría (verificadas ficha por ficha contra EncicloVida/CONABIO el
22-09-2026) y tres fuera de ella; cada una dice si es de la paleta y si su fruto es comestible. El Excel vive en `originales/` (no se publica) y
`herramientas/generar_especies.py` lo convierte en `assets/catalogos/catalogo-especies.js`, que se siembra en el
almacén `especies` tal cual: **la clave es el `id_especie` (`ESP-0001`…) y es la única llave por
la que se enlazan las plantaciones**; el nombre común es la etiqueta de campo; el tipo de
distribución (Endémica · Nativa · Exótica · Exótica-Invasora), la forma de crecimiento y los
identificadores de CONABIO (`id_snib`, `id_enciclovida`) viajan con la especie y no se copian al
registro. El formulario busca por nombre común, científico y **otros nombres comunes**, y dice por
cuál coincidió, porque un mismo nombre («Fresno», «Colorín») señala a más de una especie. Las
altas nuevas desde Catálogos reciben el consecutivo siguiente (hoy, `ESP-0080`). Para cambiar una
especie del catálogo se corrige el Excel y se vuelve a correr el script; las altas y ediciones
hechas en Catálogos viven en el almacén del dispositivo. Ver MAPEO-CAMPOS.

## Capas territoriales

Las capas son del SIA. Los archivos originales viven en `originales/`, fuera del sitio publicado,
y no se tocan: son la constancia de qué se recibió. La aplicación carga versiones compactadas —atributos mínimos, seis
decimales— que produce `herramientas/generar_capas.py`. **Nunca se editan a mano**: para cambiar una
capa se sustituye el original y se vuelve a correr el script, que valida cantidad de features,
claves únicas, anillos cerrados y sistema de referencia antes de escribir nada.

| Capa | Archivo original | Features | Clave | Qué guarda el registro |
|---|---|---|---|---|
| Alcaldías | `alcaldias_cdmx.json` (definitiva; metadato en `originales/documentacion/`) | 16 | `cvegeo` INEGI | `alcaldia_cve` y `alcaldia` (nombre) |
| Malla UGA | `UGA_CDMX.geojson` (definitiva) | 1,624 hexágonos de ~1 km² | `clave` (`TLP-318`) | `uga` |
| Colonias | `colonias_iecm2022.geojson` | 1,837 unidades territoriales del IECM 2022 | `CVEUT` (`10-001`) | `colonia_cve` y `colonia` (nombre) |

**Las tres capas son definitivas:** alcaldías y UGA del SIA y colonias del IECM 2022, la unidad oficial
de reporte. La de colonias pesa 3 MB compactada —125 mil vértices— y se queda en el teléfono, para ver la
colonia sin señal; el servidor vuelve a derivar con las de `territorio` (D251, D277).

La capa de colonias no cubre el suelo de conservación (532 km² al sur sin colonia) ni 31 km²
urbanos: un punto ahí se guarda con `colonia` nula y la pantalla dice «Sin colonia en la capa».
`generar_capas.py` ajusta cada geometría a la rejilla de seis decimales sin romperla y se
detiene si alguna queda inválida (el redondeo simple dejaba nueve colonias inválidas). Trae 215
solapes, casi siempre una unidad habitacional encima del pueblo que la rodea: gana el polígono más
pequeño. Doce colonias tienen el interior en otra alcaldía que la que declaran: la alcaldía sale de
su propia capa, nunca de la colonia.

La capa definitiva de alcaldías no tiene huecos ni solapes (la anterior traía cinco y tres). Las
reglas se conservan por si una entrega futura los trae: en un solape gana el primer polígono; en un
hueco el registro se guarda sin alcaldía, con la versión de la capa, para rederivarlo. La malla UGA
definitiva tiene la misma geometría que la anterior y conserva ocho celdas cuyo prefijo no es la
alcaldía de su centro; no afecta al registro, cuya alcaldía sale de su propia capa. Al actualizar una
capa se sube `meta.version` en `generar_capas.py`.

**Dónde se acepta un punto.** En la unión de las 16 alcaldías, con 100 m de margen
(`MAPA.MARGEN_AMBITO_M`): un árbol junto al límite cuyo GPS cae unos metros afuera toma la alcaldía
más cercana y la pantalla lo dice. La caja de `MAPA.LIMITES` sólo es el límite del mapa y el primer
filtro. La aplicación no abre si falta alguna de las tres capas; un registro sin alcaldía o sin las
tres capas en su `capa_version` no recibe folio (nunca `EXT-000` por una capa ausente). El folio
empieza con el **prefijo de la celda UGA, que no es la alcaldía del árbol** en el 4.3 % del
territorio. El detalle y el PDF dicen con qué capas se derivó cada registro, y si el punto quedó más
cerca del borde de su celda que la precisión del GPS, lo marca como «celda incierta».

## La calle de cada árbol

Cada árbol dice en qué calle quedó, entre qué calles va esa cuadra, si es vialidad primaria, calle
secundaria o carretera, y quién la atiende. La pone el servidor al recibir el árbol y cada vez que se
corrige su punto, con la capa de calles de la Ciudad de México, `territorio.calles` del SIA (paquete
calles-cdmx 1.0.0 definitivo, aprobado por Liber el 25-10-2026): el tramo más cercano, a 40 m o menos
(`servidor/db/srp/09-srp-calles.sql`). Nadie la escribe. La capa de toda la ciudad no cabe en el
teléfono: el teléfono la enseña en el detalle, la columna «Calle» del reporte, «Por red vial» del
informe y de Supervisión, y cuatro columnas del CSV. La jornada no lleva calle.

- **Sin la capa** el servidor no falla: el árbol queda «por asignar». Después de instalar la capa, o una
  versión nueva, quien administra la base corre `CALL srp.recalcular_calles();`. La versión de la capa es la que el SIA
  tiene por vigente en `territorio.version_capa`.
- **En la versión de prueba** no hay servidor: el servidor simulado (`js/calles.js`) la calcula al enviar,
  con las mismas reglas, sobre una copia ligera de la capa (`assets/calles/`, 18.8 MB en 97 celdas de
  unos 4 km, 5.2 MB comprimidos). Cada árbol baja sólo la celda de su punto. La copia lleva sólo lo que usa
  el SRP: trazo, clave, nombre, entre qué calles, red vial, tipo de vía, quién la atiende y la llave del
  nombre. La versión del SIA no la lleva (`herramientas/preparar_produccion.py`).
- **Fuente:** `calles-cdmx-1.0.0.zip` (sha256 `64ac222da6721e2f2f6e9be322ebc1a98b359db50e27f4307f370348df36a973`),
  su `datos/calles_cdmx.gpkg` (sha256 `9ecc12364a88d5a0ccf1af183af4e459d9af663c08a4be31a09f52d77cae400f`),
  del proyecto calles-cdmx. Se regenera con `python herramientas/generar_calles.py [ruta del gpkg]`.
- **Cita obligatoria**, en el pie de «Por red vial» y en `assets/calles/indice.json`: elaborado por SEDEMA
  con información del INEGI (Marco Geoestadístico, Encuesta Intercensal 2025; Red Nacional de Caminos 2025,
  con SICT e IMT) y de SEMOVI (Vialidades primarias de la Ciudad de México, Portal de Datos Abiertos, CC BY
  4.0, y el ACUERDO/CCV/016/3ORD/SEPTIEMBRE/2024). Licencias: Términos de Libre Uso de la Información del
  INEGI y CC BY 4.0. SEDEMA unió, partió y clasificó los tramos y homologó sus nombres; esas
  transformaciones no son del INEGI ni de SEMOVI.

## La jornada compartida

Para los eventos masivos, varios cabos registran en una misma jornada (D334, pedido en la prueba en campo como
TD-01). La abre la Coordinación, el mismo día del evento, y queda como su titular. Desde la 1.4.1 se abre
compartida desde el mismo formulario: «¿Quién registra en esta jornada?», «Sólo yo» o «Varios cabos», y con «Varios
cabos» se marcan ahí a los cabos activos de su institución (D335). Después se agregan o quitan con «Cabos de apoyo»,
en la franja de la jornada activa o en su ficha; la ventana trae a la vista cómo funciona.

- **Los cabos de apoyo** reciben la jornada en su teléfono la siguiente vez que tienen señal, con un aviso al
  entrar. Registran como siempre; cada árbol queda a su nombre. Ven la jornada completa, pero sólo corrigen sus
  árboles, y no cambian los datos de la jornada ni la cierran. Al acabar tocan **«Terminar mi parte»**: lo suyo se
  envía y la jornada sale de su lista. La Coordinación puede quitarlos o volver a marcarlos.
- **Al cerrar**, cada cabo de apoyo que no ha terminado es un pendiente más, con cuántos árboles suyos llegaron y a
  qué hora el último: avisa, no impide. Con señal, la Coordinación trae antes la jornada al día del servidor
  (`GET /jornadas/:id`).
- **El reporte** dice «Jornada compartida, coordina:», el renglón «Cabos de apoyo» con los árboles de cada uno y la
  columna «Cabo» en la tabla de ejemplares.
- **Para encontrarlas**, «Más filtros» trae «Tipo de jornada» (Todas, Compartidas o No compartidas) en Registros,
  Jornadas y Supervisión, para todos los perfiles: el cabo ve las compartidas en que participó. En Jornadas la
  tarjeta dice «compartida con N cabos»; el informe de Supervisión dice el filtro, y su CSV trae la columna «Jornada
  compartida». Fotografías se queda con sus ocho filtros (D226): ahí la compartida se elige en «Jornada».
- **En el servidor** son dos operaciones: `jornada.compartir`, que lleva sólo los cabos que entran y salen (si
  mientras tanto uno terminó su parte, no se deshace), y `jornada.terminar`, que no cambia la versión de la jornada
  para no chocar con lo que la Coordinación tenga por enviar. La lista va en `jornadas.cabos_apoyo`.

Desde la misma versión, **la Coordinación trabaja con todos los cabos de su institución** (D333): los ve, corrige y
elimina sus registros, y los elige para relevos y jornadas compartidas. Usuarios ya no asigna coordinadores.

## Pruebas

Requieren Python 3 con Playwright, Chromium y cuatro bibliotecas más (pypdf, Pillow, openpyxl y
shapely), listadas en `pruebas/requisitos.txt`. Se corren desde la carpeta del proyecto, esté donde
esté, con el servidor local levantado:

```
pip install -r pruebas/requisitos.txt
python3 -m playwright install chromium
python3 pruebas/servir.py        (en otra terminal; no http.server: rechaza conexiones al abrir)
python3 pruebas/por_tramos.py    # la prueba completa por tramos, unos 45 minutos, sola
python3 pruebas/auditoria.py     # unos 2 minutos
python3 pruebas/revisar.py       # unos 2 minutos
python3 pruebas/prueba_conexion.py   # unos 5 minutos; con la base local del servidor cargada
```

`por_tramos.py` corre `prueba.py` en tramos, cada uno en su propio proceso: un tramo que se detiene se anota,
con el renglón de `prueba.py` donde se detuvo, y los demás siguen. Al final dice «tramos: N · comprobaciones: N ·
fallas: 0 · tramos detenidos: 0». Con
`--lista` muestra los tramos, con `--solo 3,7` corre algunos, y con `--lento 4` el navegador corre como en un
equipo cuatro veces más lento: así salen las esperas que sólo alcanzan en un equipo rápido. `prueba.py` se
puede correr también de una pieza. Las cuatro salen con 1 si algo falla.

En cada subida a GitHub corren solas, en un equipo de GitHub con Linux, la sintaxis de los guiones, la hoja de
estilos, la consistencia, la presentación y la prueba completa por tramos (`.github/workflows/pruebas.yml`). Si
algo falla, la subida queda marcada con una ✗. El resumen de la prueba completa queda en la página de la
corrida, y el resultado de cada tramo, en sus «Artifacts». Ahí no
hay `originales/` (no se sube): lo que se compara con ellos se omite y se dice. El servicio y la base de datos
se prueban en el equipo de desarrollo (`npm test` y `prueba_conexion.py`).

`servir.py` reenvía lo que va a `/api/` al servicio del SRP de esta computadora, como lo hace el servidor
web del SIA: la aplicación y su servicio quedan en el mismo sitio. `prueba_conexion.py` arranca su propio
servicio y su propio servidor (puertos 3109 y 8098). Abre la aplicación con `ES_FICTICIO: false` sólo en el
navegador de la prueba, sin cambiar el archivo, y crea y quita sus cuentas en la base local.

Los archivos que `prueba.py` descarga o fabrica (PDF, CSV, hojas de cálculo) quedan en una carpeta
temporal del equipo (`srp_pruebas`). Dos variables de entorno cambian lo que viene de fábrica:
`SRP_BASE`, la dirección de la aplicación (`http://127.0.0.1:8099/`), y `SRP_SALIDA`, la carpeta de
esos archivos. El servidor debe servir la carpeta del proyecto: `prueba.py` levanta además un
segundo servidor propio en el puerto 8094 para probar el cambio de versión.

Otras dos variables sirven para probar lo que no se ve con Chromium un día cualquiera:
- `SRP_MOTOR=webkit` corre con el motor de Safari (`python3 -m playwright install webkit`). El de
  Playwright para Windows no tiene campo de fecha ni sirve sin red con el service worker, así que la
  suite completa no pasa en él; sí sus secciones que no dependen de eso. Firefox (`firefox`) también se
  puede elegir.
- `SRP_HOY=AAAA-MM-DD` corre como si ese fuera el día, en Python y en el navegador. El lunes 1 de enero
  de 2029 prueba a la vez el inicio de semana, de mes y de año.

Cada carga de la app espera la marca `data-listo` que pone `js/app.js` al terminar de arrancar, no un
tiempo fijo.

| Archivo | Qué comprueba |
|---|---|
| `prueba.py` | Recorrido completo: acceso, captura, listados, filtros, PDF, catálogos y cuentas, en los tres perfiles; también el ciclo de la base (sello, versión) y la seguridad ante datos alterados |
| `por_tramos.py` | `prueba.py` en tramos independientes, con su tiempo máximo cada uno; `--lento` simula un equipo lento |
| `auditoria.py` | Consistencia de lo guardado y del modelo: esquema contra lo que se guarda, diccionario y `js/esquema.js` regenerados, dominios, vocabulario |
| `auditoria_css.py` | La norma de la hoja de estilos: colores sólo en `:root`, sin `#id` ni `!important`, medidas con token, una regla por selector, sin clases ni variables sin uso, sin estilos en línea. Corre dentro de `auditoria.py`; con `--todo` lista cada caso |
| `revisar.py` | Presentación en ocho combinaciones de ancho y zoom: desbordamiento, alto del mapa, tamaño de los controles y reglas anuladas |
| `prueba_conexion.py` | La aplicación con datos reales contra el servicio local: entrar, los mensajes al no poder, lo que baja, lo enviado en memoria y sus avisos sin señal o con falla del servidor, los parámetros, volver a abrir con y sin señal, la sesión vencida, la contraseña temporal que se cambia por una propia, «Cerrar sesión», cuánto tarda la Administración en traer todo, y el envío real: jornada y árboles capturados en la pantalla, con folio y fotografía, sin señal, una corrección, un rechazo y lo que sale del teléfono al cerrar; y lo que el servidor no aceptó, resuelto desde «Revisar»: enviar otra vez, quedarse con lo del servidor, corregir, eliminar y descartar; los catálogos de la Administración en el servidor, el historial del árbol y el Registro de cambios desde la bitácora del servidor, Parámetros cambiados por la Administración, la bandeja de posibles duplicados, la carga masiva: subir, deshacer, volver a cargar y sin conexión, y Usuarios: el alta con su contraseña temporal, entrar con ella, editar, «Restablecer contraseña», desactivar, eliminar y sin conexión |

## Salida a producción y Fase 2

Todo lo que hay que construir en el servidor, lo que es simulado y hay que reemplazar, lo que debe
entregar el SIA, las decisiones abiertas y el paquete de traspaso está reunido en
**`docs/FASE2-Y-TRASPASO.md`**. Nada de eso se hace en la Etapa 1.

`docs/DECISIONES.md` y `docs/BITACORA.md` son la memoria formal del proyecto: qué se decidió y por qué, y
qué se hizo en cada bloque.
