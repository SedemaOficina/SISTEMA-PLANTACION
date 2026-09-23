# Bitácora de bloques

## Bloque 1 — Cascarón funcional con datos ficticios (21-09-2026)
Etapa 1 de la norma. Estado: **cerrado**.

**Qué se construyó:** acceso y alta de registrador; cuatro perfiles simulados; registro con mapa,
GPS, captura manual de coordenadas, cruce territorial, autocompletado de especie, «Otra especie»,
foto comprimida y resumen previo; listado con filtros por mes y rango; edición con historial;
eliminación con constancia; PDF con logotipo y resumen por programa; editor de catálogos con
bloqueo de eliminación en uso, activar/desactivar y bitácora.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 32 comprobaciones en los cuatro
perfiles, sin errores de consola; auditorías de código sin uso, hojas de estilo (sin selectores
duplicados, sin colores fuera de :root) y contraste (todo ≥4.5:1 en texto).

**Hallazgo abierto:** guinda y color de error tienen la misma luminancia (1.15:1 entre sí). Se
distinguen por tono, por texto explícito y por borde; nunca sólo por color. Revisar al fijar paleta final.

**Eliminado del esquema previo y por qué:** ver DECISIONES D12 y D17.

## Bloque 2 — Filtro de periodo y claves sugeridas (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.2.0.

**Petición de Liber:** (1) el sistema opera hasta 2030 y los chips de mes sueltos se vuelven
inmanejables, «quizás separar»; (2) al agregar en catálogos debe sugerirse una clave por
defecto, siempre en mayúsculas, en todos los catálogos.

**Qué se construyó:** filtro de periodo con tres atajos (Este mes, Mes pasado, Este año) más
listas de Año y Mes, con el rango Desde/Hasta para casos finos; el mes lista sólo los meses con
registros del año elegido; elegir periodo limpia el rango y al revés. Clave sugerida a partir del
nombre en programas, áreas y especies, con sufijo si la clave ya existe, mayúsculas forzadas al
escribir, y sin resugerir una vez que se edita a mano o al editar un valor existente.

**Eliminado y por qué:** la fila de chips de mes (`#filtro-meses`) y la función `pintarMeses()`,
sustituidas por el nuevo filtro (D19). No queda rastro en código, textos ni documentación.

**Defecto encontrado y corregido durante la prueba:** al elegir Año o Mes en las listas, los chips
de atajo se quedaban marcados y la pantalla mostraba dos periodos distintos a la vez.

**Corrección menor de la misma pasada:** la columna Uso de Catálogos decía «1 registros»; ahora
concuerda en singular y plural, también en el aviso de eliminación bloqueada.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 47 comprobaciones en los
cuatro perfiles, sin errores de consola; auditorías de hojas de estilo (sin clases sin uso, sin
selectores duplicados, sin colores fuera de `:root`, un solo `!important`, el de reduced-motion),
código sin uso, identificadores del HTML y textos.

## Bloque 4 — Acceso con cuenta y administración de usuarios (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.3.0.

**Petición de Liber:** (1) la pantalla inicial debe ser un acceso con usuario y contraseña,
simulado por ahora, y el alta de registrador sale de ahí: va dentro, para dar de alta usuarios;
(2) quien registra lo hace varias veces en una sesión, así que debe haber un botón de agregar
registro nuevo; (3) el control de ubicación debe estar en el mapa, en guinda, en lugar del botón
de abajo, conservando la captura manual de coordenadas.

**Qué se construyó:** acceso con correo y contraseña; pestaña «Usuarios» sólo para la
Administración global, con alta, edición, activación, desactivación y eliminación de cuentas,
asignación de perfil, área y jefe, y buscador; panel de confirmación tras guardar con «Agregar
registro nuevo», que conserva programa, fecha y ubicación; control de ubicación dentro del mapa,
abajo a la derecha, con aviso de que está buscando señal.

**Eliminado y por qué:** el formulario de alta de registrador de la pantalla de acceso y
`SRP.sesion.registrarNuevo()`, sustituidos por el alta desde Usuarios (D30); el botón «Usar mi
ubicación» de debajo del mapa, sustituido por el control dentro del mapa (D36); el aviso flotante
«Registro guardado», que repetía lo que ya dice el panel (Norma 9.4). Sin rastro en código,
textos ni documentación.

**Declarado en pantalla:** la contraseña no se verifica todavía. Comprobarla en el navegador es
seguridad aparente; el aviso está en la pantalla de acceso mientras `ES_FICTICIO` sea true, y la
razón queda en el comentario de `autenticar()` (Norma 9.6).

**Datos ficticios:** los usuarios ahora llevan correo en `@ejemplo.local`; se agregó una cuenta
desactivada y se dejó a una persona sin apellido materno, ambos como casos de prueba.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 77 comprobaciones en los
cinco perfiles de prueba, sin errores de consola; auditorías de hojas de estilo, código sin uso,
identificadores y textos, todas limpias.

## Bloque 5 — Marca de versión en los archivos (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.3.1.

**Hallazgo de Liber, en su teléfono y en su computadora:** tras publicar el Bloque 4, el navegador
que ya había abierto el sitio mostraba una página casi vacía con la versión anterior en el pie; en
una ventana de incógnito abría bien. El navegador servía unos archivos de su memoria y otros de la
red, y esa mezcla no arranca.

**Qué se hizo:** cada archivo propio se pide con una marca `?v=` en `index.html`, que sube al
cerrar cada bloque; el navegador ve una dirección distinta y no puede reutilizar la anterior.
`js/config.js` lee ese número de su propia dirección, así que la versión se escribe en un solo
lugar. Y si aun así alguien cae en una mezcla, al abrir se comprueba que estén las piezas de la
versión actual y se explica en pantalla cómo forzar la recarga, en vez de quedar en blanco.

**Por qué importa más allá de hoy:** el mismo problema habría aparecido en el teléfono de cada
técnico en cada publicación, y como no da error visible, se habría diagnosticado como «la app no
sirve».

**Verificación:** recorrido automatizado de 79 comprobaciones, sin errores de consola, incluidas
dos nuevas: que todos los archivos propios lleven marca y que la versión del pie salga de ella.
Se probó además el caso de versión mezclada, forzándolo, y muestra el aviso.

## Bloque 6 — Mapa de satélite, fotografía y lenguaje de los botones (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.4.0.

**Peticiones de Liber:** (1) capa base de satélite con las calles visibles, sin otra capa; (2) un
solo botón de fotografía que despliegue el menú del teléfono, como en la imagen que envió; (3) la
ficha de revisión con botón para corregir cada dato, vista del mapa con el punto y la fotografía,
más el identificador, que no se edita, y con la ubicación corregible sólo volviendo a colocar el
punto; (4) el aviso de guardado como modal que sustituye a la ficha; (5) botones con carga
psicológica: guardar en verde con palomita, eliminar en rojo con bote de basura, corregir en otro
color con lápiz.

**Qué se construyó:** imagen de satélite de Esri con los nombres de vías y lugares encima, con su
atribución; un solo selector de fotografía sin `capture`, de modo que el teléfono ofrece su menú
nativo, y el botón cambia de «Agregar» a «Cambiar fotografía» según haya foto; ficha de revisión
con mapa de sólo lectura, fotografía, identificador y un botón de corregir por dato, que cierra la
ficha y deja el foco donde se corrige; aviso de guardado como modal con los dos caminos;
paleta por significado con icono y palabra en cada acción.

**Medición de color (Norma 8.4):** verde 6.50:1, rojo 6.54:1 y dorado oscuro 5.89:1 sobre blanco,
todos por encima del mínimo. Entre sí, en cambio, hay 1.01 a 1.30:1: en luminancia son casi el
mismo color, así que quien no distingue el tono depende del icono y del texto. Por eso ninguna
acción va sólo con color. El rojo de error se unificó con el de eliminar (#B3261E).

**Eliminado y por qué:** la capa de OpenStreetMap y `MOSAICOS_URL`, sustituidas por `CAPAS`; los
dos botones de fotografía y sus dos selectores; el panel de guardado en línea, ahora modal; la
clase `.btn-editar-solido`, que quedó sin uso.

**Defecto encontrado y corregido durante la prueba:** el mapa de la ficha de revisión seguía vivo
al cerrarla, y su marcador se contaba junto con el del mapa principal.

**Ajuste de la misma pasada:** en el teléfono, los botones de cada registro pasaron de una columna
a la derecha a una fila debajo, y el rango de fechas se plegó en «Más filtros»: entre ambas cosas,
los registros vuelven a caber en la primera pantalla.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 99 comprobaciones, sin
errores de consola; auditorías de estilos, código sin uso, identificadores y textos, limpias.

**No verificado aquí:** que las teselas de satélite carguen. La red de esta sesión bloquea el
dominio del proveedor; se comprueba al abrir el sitio desde el teléfono.

## Bloque 7 — Ajuste de presentación y ubicación a petición (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.4.1.

**Hallazgos de Liber probando en el sitio publicado**, con capturas de escritorio y de teléfono:
el mapa se estiraba verticalmente al alejar el zoom del navegador; el botón de fotografía y
varios elementos quedaban desfasados entre escritorio y teléfono; en la ficha de revisión el
botón de lápiz ocupaba más de lo necesario; la ubicación se pedía sola al entrar, y debe ser
acción de la persona. Aparte, pidió el campo Registrador arriba del mapa.

**Defecto de fondo encontrado al medir:** la página se podía arrastrar de lado en la pantalla de
registro, en todos los anchos probados. La causa era de especificidad: `.campo input { width: 100% }`
y `.oculto-visual` tienen la misma, y ganaba la primera, así que el selector de archivo —invisible—
medía todo el ancho de la ventana y empujaba el documento. Corregido con `.campo .oculto-visual`,
que gana por especificidad y no por orden, con la razón anotada junto a la regla.

**Qué se ajustó:** alto del mapa acotado con `clamp`; ancho máximo por vista, 44 rem para
formularios y 78 rem para las pantallas de tabla, de modo que la de usuarios ya no se corta;
encabezado, pestañas y pie alineados a un ancho fijo, para que la barra superior no salte al
cambiar de pestaña; los botones de una fila de tabla dejan de apilarse en pantalla ancha; el campo
de fecha deja de centrarse y desbordar en Safari de iPhone; el botón de fotografía deja de ocupar
todo el ancho en monitor; la ficha usa la palabra «Editar»; y la ubicación sólo se obtiene al tocar
el control, con el mapa diciendo qué hacer mientras tanto.

**Cómo se verificó:** recorrido automatizado de 103 comprobaciones, sin errores de consola, más una
revisión de presentación en ocho combinaciones de ancho y zoom —360, 390, 768, 1280 y 1920 px, y
1280 px con zoom al 50, 67 y 200 %— midiendo en cada una si la página se arrastra de lado, cuánto
mide el mapa y si algún control queda por debajo del tamaño tocable. Las tres medidas quedaron
limpias. Auditorías de estilos, código sin uso, identificadores y textos, también.

**Eliminado:** la clase `.btn-icono`, que quedó sin uso al pasar la ficha a botones con palabra.

## Bloque 8 — Cabo y coordinador, campos obligatorios y flujo de captura (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.5.0. Base de datos en versión 2.

**Peticiones de Liber:** asterisco en los campos obligatorios; chip de «Hoy» con la fecha, y que sea
el filtro por omisión; cambiar «registrador» por **cabo** y «jefe de registradores» por
**coordinador** en plataforma, código y campos; etiqueta «Estás registrando como:»; un botón propio
para registrar la ubicación, retirando el control de dentro del mapa, con la captura manual justo
debajo; alcaldía y colonia sin botón de editar en la ficha; el foco en el botón de ubicación al
empezar otro registro; y que al cerrar un dato el foco pase solo al siguiente.

**El renombre es también una migración.** Cambiarlo sólo en el código habría dejado a cada
dispositivo ya usado con `registrador_id` y `jefe_id`, de modo que un cabo dejaría de ver sus
propios registros y un coordinador su cuadrilla, sin error visible. La migración 2 renombra el
índice, traduce los campos de plantaciones y cuentas, y ajusta el perfil guardado en la bitácora
para que el historial siga siendo legible, sin tocar qué se hizo ni cuándo. La migración 1 se dejó
intacta, con la nomenclatura anterior, porque los dispositivos que la corrieron tienen esa
estructura exacta.

Se escribió una prueba aparte (`prueba_migracion.py`) que construye una base como la dejó la
versión anterior, abre la aplicación y comprueba las nueve cosas que deben cumplirse: que la base
suba a la versión 2, que el índice se renombre, que cada plantación conserve a su autor, que no se
pierda ningún otro dato, que el perfil y el coordinador se traduzcan, que la bitácora conserve
acción y fecha, y que el cabo migrado entre y siga viendo su registro. Las nueve pasan.

**Cambio en cómo se prueba:** las pruebas pasan de abrir el archivo directamente a servirlo en
`http://127.0.0.1:8099/`. Con `file://` no es posible preparar la base antes de que arranque la
aplicación, que es justo lo que hacía falta para probar la actualización entre versiones. De paso,
el navegador trata el sistema como en el sitio publicado.

**Avance del foco:** sólo se avanza cuando la respuesta quedó cerrada —una especie elegida de la
lista, un programa seleccionado, un punto tomado con el botón— nunca mientras se escribe ni
mientras se arrastra el marcador. Arrebatar el foco a media palabra sería peor que no avanzar.

**Eliminado:** el control de ubicación de dentro del mapa y su estilo; los botones de editar de
alcaldía y colonia en la ficha.

**Verificación:** sintaxis de todos los .js; recorrido automatizado de 116 comprobaciones, sin
errores de consola; prueba de migración, 9 comprobaciones; revisión de presentación en ocho
combinaciones de ancho y zoom; auditorías de estilos, código sin uso, identificadores y textos.
Una comprobación nueva verifica que ningún campo obligatorio se quede sin asterisco.

## Bloque 9 — Ficha de la fotografía, fechas legibles y base sin migraciones (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.5.1.

**Peticiones de Liber:** el campo de fotografía como una ficha de archivo —zona de carga, y debajo
miniatura, nombre, peso y papelera— para poder quitarla si fue la equivocada; que al elegir una
especie el campo quede con el nombre común y el científico, como en el catálogo; que las fechas se
muestren como 21-SEP-2026; y borrar lo acumulado para empezar sin migraciones, porque todo son
datos de prueba.

**Sobre la base sin migraciones.** Se consolidó la estructura definitiva en una sola, se retiró la
migración anterior y su prueba, y se añadió lo que faltaba: un dispositivo que ya abrió una
estructura posterior no puede abrirla hacia atrás, así que la base se descarta y se rehace. Eso
vale **sólo mientras todo sea ficticio**, y queda dicho junto al código y en las decisiones: con
el primer dato real, cada cambio de estructura vuelve a ser una migración que conserva lo
guardado. La prueba correspondiente (`prueba_base_vieja.py`) construye una base con una estructura
muy posterior, abre el sistema y comprueba que arranca, que queda en la estructura de ahora y que
los datos de prueba se siembran de nuevo.

**Sobre el peso de la fotografía:** se muestra el de la imagen ya comprimida. Enseñar el tamaño
del archivo original sería decir un número que no corresponde a nada de lo que se guarda.

**Defecto encontrado y corregido:** la zona de carga no apilaba su icono y sus textos, porque
`.campo label { display: block }` vencía a `.zona-foto` por tener la misma especificidad y venir
después. Es el segundo caso igual en dos bloques, así que la revisión de presentación incorpora
ahora una comprobación que declara qué debe valer cada regla de disposición y avisa cuando otra la
anula, en las ocho combinaciones de ancho y zoom.

**Verificación:** sintaxis; 124 comprobaciones del recorrido, sin errores de consola; prueba de
base anterior, 4 comprobaciones; revisión de presentación con la comprobación nueva; auditorías de
estilos, código sin uso, identificadores y textos.

## Bloque 11 — Fichas legibles y la administración deja de capturar (21-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.5.3.

**Peticiones de Liber, sobre capturas de la ficha de revisión y del detalle:** el pin es tan grande
que tapa lo que hay alrededor del punto, en los dos mapas; la fotografía debe verse abajo, en el
renglón donde se la nombra, en lugar del texto con su peso; la nota del final está demasiado junta
al resto; las etiquetas de campo deben ir en negritas para distinguirlas de un vistazo; el detalle
de un registro debe parecerse a la ficha —mapa, etiquetas en negritas, fotografía e historial
abajo—; y la Administración global no debe tener módulo de Registrar.

**Sobre lo último:** quien registra en campo es el cabo, y el registro tiene que quedar a nombre de
quien plantó el árbol, no de quien administra el sistema. La Administración conserva el resto:
ve, edita y elimina cualquier registro, y lleva catálogos y cuentas.

**Qué se hizo:** pin de 24×32 px anclado en la punta, que es la que marca la coordenada; la
fotografía pasa a su propio renglón al final de ambas fichas; aire alrededor de la nota; etiquetas
en negritas; y el detalle rehecho con la misma estructura y las mismas clases que la ficha de
revisión, de modo que quien revisa un registro guardado ve lo mismo, en el mismo orden, que quien
lo capturó.

**Una pieza que estaba duplicada:** el mapa de sólo lectura se escribía en el formulario y habría
que haberlo repetido en el detalle. Se movió a `SRP.mapa.estatico()`, que ambos usan. Cada ficha
destruye su mapa al cerrarse: uno vivo dentro de un diálogo oculto sigue consumiendo y, como ya se
vio en el Bloque 6, su marcador se cuenta junto con el del mapa principal.

**Eliminado:** las clases propias del detalle, que quedaron sin uso al adoptar las de la ficha.

**También en este bloque:** cerrar sesión y cambiar de usuario pasan al encabezado, junto al
nombre y el perfil, y desaparecen del pie. En teléfono el bloque de usuario baja a su propia fila
para que los dos botones quepan en línea en vez de apilarse; el encabezado queda en 138 px.

**Ajuste en la revisión de presentación:** recorría todas las vistas con la Administración, que ya
no tiene Registrar, de modo que medía un mapa de cero píxeles. Ahora cada vista se revisa con el
perfil que la tiene, y avisa si alguna no abre.

**Verificación:** 120 comprobaciones del recorrido, diez de ellas nuevas sobre el orden y el peso
visual de las fichas y sobre los botones de sesión; 35 de auditoría de consistencia; la revisión
de presentación en ocho combinaciones de ancho y zoom; y las auditorías de estilos, código sin
uso, identificadores y textos.

---

## Bloque 12 — Mapeo de campos, escala de énfasis y formulario en blanco

**Documento de mapeo de campos.** `MAPEO-CAMPOS.md` reúne, módulo por módulo, la etiqueta que se
ve en pantalla, el nombre con que se guarda, si es obligatorio y de dónde sale el dato: de la
persona, de un catálogo, de la capa geográfica, del sistema o de la sesión. Los campos no se
escribieron de memoria: se extrajeron ejecutando el sistema y capturando un árbol. Lleva además
una tabla de lo que se reutiliza entre módulos y otra de lo previsto que todavía no existe, porque
un campo sin uso es una promesa de que el sistema hace algo que no hace.

El documento se comprueba solo. La auditoría compara la lista contra los campos que el sistema
guarda de verdad, en los dos sentidos: lo que se guarda tiene que estar escrito, y lo escrito tiene
que existir. Un documento de campos que nadie comprueba envejece en silencio y acaba mintiendo.

**Escala de énfasis.** Liber señaló que «Registrar ubicación del punto» y «Capturar coordenadas a
mano» eran las dos guindas y parecían del mismo tipo. La corrección no fue de ese caso sino de la
regla: hay tres niveles en toda la aplicación —guinda relleno para la acción principal, guinda de
contorno para la alterna del mismo rango, gris subrayado para lo de apoyo— y el guinda queda
reservado a los dos primeros. Se revisó dónde más pasaba lo mismo: los dos desplegables
(«Capturar coordenadas a mano» y «Más filtros»), los botones de texto («Mostrar más», «Cancelar
edición», «Restablecer datos de prueba») y la insignia del perfil, que con contorno guinda se leía
como un botón secundario siendo una etiqueta que no se pulsa.

**Cerrar sesión y cambiar de usuario** pasan a texto clicable, sin caja, con un punto medio entre
los dos. En el encabezado no hay acción principal que sostener.

**El botón de ubicación distingue capturar de corregir.** Sin punto es la acción principal: guinda
relleno, icono de ubicación, «Registrar ubicación del punto». Con punto puesto ya no se captura
sino que se corrige, y se ve como todo lo que se corrige en el sistema: dorado, lápiz y
«Actualizar ubicación con mi posición». El color nunca va solo (Norma 8.4).

**El formulario arranca en blanco, y vuelve a blanco.** La fecha de plantación ya no se rellena con
la de hoy y el programa no se preselecciona aunque el catálogo tenga uno solo. «Agregar registro
nuevo» limpia todo: especie, programa, fecha, fotografía, coordenadas escritas a mano, derivación
territorial y punto. Antes conservaba programa, fecha y ubicación porque los árboles de una jornada
suelen compartirlos; en campo eso se convierte en el dato del árbol anterior guardado sin que nadie
lo note, y la coordenada heredada es el peor de los casos, porque se ve bien estando mal. Lo único
que sobrevive es el encuadre del mapa, que no es un dato y no se guarda en ningún lado.

**Los datos del punto son campos del formulario.** Coordenadas, alcaldía y colonia salen del
recuadro que colgaba del mapa y pasan a campos de sólo lectura, con su etiqueta, donde están los
demás datos del registro. Bajo el mapa queda únicamente el aviso de lo que ocurrió —si hubo señal,
con qué precisión, qué hacer si falló—, ya sin repetir la coordenada. Son `<output>` y no
`<input readonly>` porque su contenido es texto: así el lector de pantalla anuncia el cambio en
cuanto el punto se mueve.

**Eliminado:** el campo «Estás registrando como» y la nota del asterisco en la pantalla de
registro. El encabezado ya dice quién tiene la sesión abierta, y en edición el aviso de la franja
dice quién capturó el registro. Como la nota explicaba el asterisco, lo obligatorio pasa a
anunciarse también con el atributo `required`, que es lo que lee un lector de pantalla.

**Verificación:** 134 comprobaciones del recorrido completo, catorce de ellas nuevas sobre la
escala de énfasis, los campos del punto, la fecha sin valor y el formulario en blanco —esta última
enumera el estado entero y falla nombrando qué quedó sucio, no comprobando campo por campo—; 37 de
auditoría, dos de ellas la comparación del mapeo contra la realidad; la revisión de presentación en
ocho combinaciones de ancho y zoom; y las dos pruebas de migración de datos y base anteriores.

---

## Bloque 13 — De dónde salió la coordenada, y cómo se llama la cifra

Este bloque no nació de un defecto sino de una conversación sobre la meta del programa: 500 mil
árboles a 2030, con una fotografía que es opcional y que, según la operación real, la mayoría de
los registros no va a llevar.

**Si la fotografía no es la prueba, la coordenada lo es.** Y hasta ahora el sistema trataba todas
las coordenadas por igual. Guardaba `lat` y `lng`, pero tiraba dos datos que ya tenía en la mano:

- **La precisión del GPS.** El aparato la devuelve en cada lectura y el sistema la mostraba en
  pantalla —«precisión ±112 m»— sin guardarla. Un punto con ±8 m y uno con ±500 m quedaban
  idénticos en la base, y no lo son: el segundo puede estar a cinco cuadras del árbol.
- **De dónde salió el punto.** Hay cuatro caminos —el botón de GPS, tocar el mapa, teclear
  coordenadas y arrastrar el pin— y el registro no distinguía ninguno. No es lo mismo un punto
  tomado con el aparato junto al árbol que uno colocado desde una oficina tres días después.

Ahora se guardan `punto_origen` y `gps_precision_m`, y se ven en la pantalla de captura, en la
ficha de revisión y en el detalle. Son datos que sólo existen en el instante de la captura: si no
se escriben entonces, no se reconstruyen nunca.

**La regla que los sostiene:** la precisión se guarda **si y sólo si** el origen es `gps`. Al
mover el punto a mano, el margen del aparato deja de describirlo y se borra, en vez de quedarse
junto a una coordenada nueva insinuando una exactitud que ya no tiene. La auditoría comprueba esa
equivalencia en cada corrida, en los cuatro orígenes.

**Cómo se llama la cifra.** Operativamente no se alcanzará a registrar todo lo que se plante, así
que el número del sistema y el número del programa van a diferir, y la diferencia será grande. El
reporte ahora se titula «Reporte de árboles registrados», su total dice «árboles registrados» y
lleva al pie una línea que lo delimita: la cifra corresponde a lo registrado dentro del filtro y no
equivale al total plantado. Es una etiqueta que no cuesta nada y protege a quien firme el documento.

**Calidad de la ubicación en el reporte.** El PDF informa qué proporción de los registros se ubicó
con GPS. Una columna por renglón habría abultado la tabla; una cifra al pie dice lo mismo y se
compara entre periodos.

**La auditoría del mapeo se ganó el sueldo.** Al agregar los dos campos, la comprobación que
compara `MAPEO-CAMPOS.md` contra lo que el sistema guarda de verdad falló nombrándolos, antes de
que el documento envejeciera en silencio. Para eso se escribió.

**Decisiones y pendientes.** Se registraron las decisiones D33 a D39 y se abrió en `DECISIONES.md`
una sección de pendientes para antes de montar en los servidores del SIA: el módulo `plantacion`
antecesor y sus claves de especies, la salida de la fotografía a archivo, el disco que habrá que
pedirle a ADIP según la proporción que suba foto, colonia contra unidad territorial, los límites de
nginx, el contexto seguro que exige la geolocalización, y el estado de difusión pública del sitio.
Más tres decisiones de programa: qué cuenta como plantado, cómo se evita el doble conteo y si la
fotografía es por árbol o por jornada.

**Verificación:** 140 comprobaciones del recorrido, seis de ellas nuevas sobre los cuatro orígenes
del punto y la regla de la precisión; 39 de auditoría, dos nuevas sobre el origen y la
equivalencia; la revisión de presentación en ocho combinaciones de ancho y zoom; y las dos pruebas
de migración. Se revisó además el PDF generado, renglón por renglón.

---

## Bloque 14 — Espejo de campos para la versión de prueba

Liber pidió ver, al pie del formulario, los campos que llegan a la base sin tener lugar en la
pantalla: identificadores, marcas de tiempo, el punto original, la UGA, la versión de la capa.
Es control visual mientras se afina la interfaz, y **desaparece al cerrar la Etapa 1**.

**Cómo se construyó para que no mienta.** Un panel así es fácil de hacer mal: se escribe una lista
de campos a mano, se pintan valores calculados aparte, y a las dos semanas enseña algo distinto de
lo que se guarda. Se evitó de dos maneras:

- No reconstruye el registro. Se extrajo de `guardar()` la armadura del objeto a
  `registroPrevisto()`, y ahora **los dos —Guardar y el espejo— leen el mismo objeto**. Si el espejo
  enseña un valor, ese valor es el que se escribe.
- No tiene lista de campos ocultos. Tiene una lista de los **visibles** —los que sí están en la
  pantalla— y el espejo es lo que queda al restar. Un campo nuevo aparece solo, sin que nadie se
  acuerde de agregarlo. La prueba cierra el círculo: entre visibles y espejo no puede faltar ningún
  campo del registro, y falla nombrando el que falte.

**Lo que aún no existe se nombra, no se inventa.** `registroPrevisto()` pone la hora actual en las
marcas de tiempo para tener el objeto completo; enseñar esa hora cambiando con cada tecla haría
creer que ya está fijada. El espejo dice «(se fija al guardar)» o «(se fija al revisar)» donde
corresponde, en el registro y en la entrada de bitácora.

**En edición cambia de cara:** `cabo_id` conserva al cabo que capturó aunque edite el coordinador,
`editado_por_id` enseña a quien está editando, y la bitácora anuncia EDITADO. Se comprobó con la
cabo editando lo suyo y con el coordinador editando lo ajeno.

**Para quitarlo cuando llegue el momento:** borrar `js/espejo.js` y su `<script>`, la sección
`#espejo-campos` de `index.html` y el bloque `.espejo` del CSS. Está marcado en los tres lugares
y nada más depende de él: no escribe en ningún almacén ni participa en la validación.

**Ajuste de presentación:** en teléfono el título de cada tabla se rompía palabra por palabra por
la combinación de `table-layout: fixed` con el apilado en bloque; el `caption` pasa también a
bloque en esa anchura.

**Verificación:** 150 comprobaciones del recorrido, diez nuevas sobre el espejo —cobertura total de
campos, valores reales, actualización en vivo sin recargar, y las dos caras de la edición—; 39 de
auditoría; la revisión de presentación en ocho combinaciones de ancho y zoom; y las dos pruebas de
migración.

---

## Bloque 15 — Capas reales del SIA: alcaldías y malla UGA

Llegaron los dos GeoJSON. Antes de tocar código se revisaron los dos archivos completos:
estructura, sistema de referencia, atributos, claves, geometrías y topología.

**Lo que traen.** Alcaldías: 16 MultiPolygon en EPSG:4326, un polígono cada uno, con `cvegeo`
(clave INEGI, `09012`), `nomgeo` y `clv_mun` (`TLP`); 17,414 vértices y coordenadas con hasta 11
decimales. UGA: 1,624 hexágonos de 1 km² exacto (0.998–1.001), un solo atributo `CLAVE` con la
forma `TLP-318`; el prefijo es una de las 16 claves de alcaldía. Sin claves repetidas, sin
geometrías inválidas, sin anillos abiertos. La malla cubre toda la ciudad y se sale 140 km² por
los bordes, como corresponde a una malla regular.

**Lo que traen de defecto, medido.** Entre polígonos vecinos de alcaldías hay **tres solapes**
—GAM–VCA de 25,203 m², CUH–GAM de 6,044 m², GAM–AZC de 27 m²— y **cinco huecos**: uno de
12,272 m² cerca de 19.4838, -99.1499, y cuatro menores de 339, 94, 12 y 9 m². Son de la fuente y
se reportan al SIA; el sistema no los corrige. Además, 9 hexágonos tienen su centro en una
alcaldía distinta de la de su prefijo, y 152 lo tienen fuera de toda alcaldía: son celdas de
frontera. Consecuencia de diseño: **el prefijo de la UGA no es la alcaldía del punto** (D47).

**Cómo entran al sistema.** Los originales se guardan intactos en `assets/fuentes/`, con su
suma de verificación anotada abajo. La aplicación carga versiones compactadas que produce
`pruebas/generar_capas.py`: atributos mínimos, seis decimales (~11 cm, por debajo de la exactitud
de cualquier capa de límites), sin indentación. El script valida la entrega antes de escribir
—cantidad de features, claves únicas, anillos cerrados, que las coordenadas caigan en la CDMX,
que todo prefijo de UGA sea una alcaldía— y si algo no cuadra se detiene sin generar a medias.
Se probó incrustar la caja de cada feature y se descartó: eran 80 KB de números que se deducen
de los que ya viajan; la derivación las calcula al cargar en un milisegundo.

**Peso.** 390 KB de alcaldías y 423 KB de UGA. Se cargan una vez y quedan en la memoria del
navegador con la marca de versión. Derivar un punto cuesta 0.05 ms en promedio gracias al
descarte por caja; la primera derivación, que calcula las cajas, 5 ms.

**Qué cambia en el registro.** Se guarda `alcaldia_cve` (la clave INEGI, llave para unir con el
SIA) además del nombre; `uga` pasa a ser la clave real del hexágono; `capa_version` guarda la
versión de cada capa por separado; `colonia` queda nula, y la pantalla lo dice como pendiente,
no como falla. Un punto en un hueco de la capa se guarda sin alcaldía, con aviso, y con la
versión para rederivarlo cuando el SIA corrija la capa: un árbol real no se queda sin registrar
por un defecto de la geometría (D43, D44).

**Las reglas quedan escritas en la prueba.** Puntos conocidos —Zócalo, Ajusco, Milpa Alta— con
su alcaldía, su clave INEGI y su UGA; el punto interior del hueco mayor, que deriva UGA y
versión pero no alcaldía; el solape GAM–VCA, que deriva siempre el mismo polígono; un punto
fuera de la ciudad; y el costo por derivación. La auditoría comprueba que las claves cargadas
sean exactamente las del original del SIA, en las dos capas, y que ninguna plantación ni capa
sea ya ficticia.

**Retirado:** `assets/capas-ficticias.js`. No se borró: está en `_to_delete/`, que git ya no
sigue, para que Liber lo elimine a mano. El sello de datos cambia para que los dispositivos de
prueba vuelvan a sembrar y no queden registros derivados con la capa ficticia junto a los reales.

**Sumas de verificación de los originales (MD5):**
`39b969b9203e3604b711d42dea0bcf73  alcaldias_cdmx.json`,
`8de0e914d1c5cdca1815a09a7a2481e3  ugasdata.wgs84.json`.

**Verificación:** 161 comprobaciones del recorrido, once nuevas sobre las capas; 44 de auditoría,
cinco nuevas; la revisión de presentación en ocho combinaciones de ancho y zoom; y las dos pruebas
de migración.

## Bloque 22 — Registros legible, filtros a una altura y el espejo en tres lugares (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.3.

**Qué cambió.** Cada renglón de Registros dice ahora «Capulín *(Prunus serotina subsp.
capuli)*» y «Cuauhtémoc, CENTRO IV» (D65). El bloque de filtros pone las etiquetas a la
izquierda de su control: chips, listas, «Reiniciar» y las fechas de «Un periodo» quedan en una
misma altura, en escritorio en una sola fila y en teléfono partido en dos o tres. La nota del
botón de reporte decía «dentro de Más filtros», que ya no existe; ahora dice «en Un periodo». Y
«Se reportarán los 1 registro» pasa a «Se reportará el registro del…».

**El espejo, en tres lugares (D66).** Hasta hoy sólo el formulario enseñaba los campos que
viajan a la base sin verse. Ahora también el detalle de un registro (plegado al pie, con los 14
campos guardados que la ficha no muestra: `es_ficticio`, `estatus`, `lat_original`,
`lng_original`, `alcaldia_cve`, `colonia_cve`, `uga`, `capa_version`, `foto_id`, `foto_nombre`,
`foto_bytes`, `fecha_registro`, `fecha_ultima_edicion`, `editado_por_id`) y el cierre del parte
(plegado antes de «Generar reporte», con los siete que no se capturan más la entrada de
bitácora, repintado con cada tecla). Para que el del cierre no pudiera mentir, `aceptar()` dejó
de armar el objeto a mano: ahora lo pide a `cierrePrevisto()`, el mismo que lee el espejo. Las
notas del espejo se completaron con `colonia_cve`, `foto_nombre` y `foto_bytes`.

**Verificación:** sintaxis; 194 comprobaciones del recorrido (cuatro nuevas: renglón con
científico y colonia, espejo del detalle con `colonia_cve`, espejo del cierre con sus siete
campos, y que lo escrito en el cierre entra al objeto que se guarda), sin errores de consola; 45 de
auditoría; presentación sin desbordes; sin selectores duplicados, clases ni ids sin uso; sin
rastro del texto «Más filtros». Marca de versión 0.6.3.

## Bloque 23 — Folio: la estructura entra, la emisión espera (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.4.

**De dónde viene.** Del análisis de nomenclatura de Liber: folio `SRP-AAA-000-AAAA-00000`, con la
clave de especie fuera del identificador, asignación única en el servidor al sincronizar, UUID
como clave de idempotencia, tabla de secuencias que sólo avanza, inmutabilidad y baja lógica
(D67, D68). El análisis condiciona la emisión a que el SIA entregue la malla UGA corregida y
congelada; por eso en esta etapa **entra la estructura y no la emisión**.

**Qué cambió.** Nuevo `js/folio.js` con el patrón, la validación, `armar()` (con `EXT-000` para
un punto fuera de la malla) y la etiqueta de campo `folio · especie · alcaldía · fecha`: es el
código que el servidor reutilizará. El registro nace con cinco campos nulos —`folio`,
`folio_uga`, `folio_capa_version`, `folio_lat`, `folio_lng`— que se congelan al asignar (R8) y
quedan aparte de `uga`, que sigue siendo la vigente. `especie_estatus` marca `VALIDADA` o
`PENDIENTE_VALIDACION` («Otra especie» deja de ser un problema del identificador y pasa a ser un
pendiente de catálogo). La ficha de revisión, el detalle, cada renglón de Registros y la tabla de
ejemplares del PDF muestran **PROVISIONAL** donde irá el folio (R1), y el PDF advierte que un
parte con registros provisionales no sustituye al definitivo (R2). El espejo enseña los cinco
campos con la leyenda «lo asigna el servidor al sincronizar».

**Lo que se difiere, y por qué, quedó escrito.** En DECISIONES (pendientes) están las cinco
condiciones del SIA para emitir folios, la bandeja de especies fuera de catálogo y la validación
de duplicados. Esta última con la regla corregida (D69): el análisis proponía 5 m fijos, pero el
GPS del teléfono da 5–10 m a cielo abierto y 15–30 entre edificios, y los árboles van cada 3–8 m;
la regla del servidor será la incertidumbre combinada de ambos puntos, con piso de 5 m para
puntos a mano o en el mapa. El insumo —`gps_precision_m`— ya se guarda desde el bloque 13.

**Verificación:** sintaxis; 201 comprobaciones del recorrido (siete nuevas: patrón, armado y
largo del folio, PROVISIONAL en pantalla, cinco campos nulos al nacer, `especie_estatus` en los
dos casos, y que ningún campo nuevo queda fuera del espejo), sin errores de consola; 45 de
auditoría (MAPEO-CAMPOS al día con los seis campos); presentación sin desbordes; el PDF generado
en la prueba trae la columna Folio, PROVISIONAL en cada renglón y la advertencia. Marca de
versión 0.6.4.

## Bloque 24 — El parte de cualquier día (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.5.

**Qué cambió (D70).** Selector «Día del parte» junto al botón de reporte: elegir una fecha filtra
la lista a ese día y habilita el reporte, sin pasar por «Un periodo» con Desde = Hasta. El
selector no admite fechas futuras y se sincroniza con el filtro: al tocar «Hoy» muestra hoy; con
«Todos» queda vacío y el botón apagado, con la nota que lo explica. La edición del parte no es
nueva —el cierre se reabre con lo capturado—, pero nadie lo sabía: la nota ahora lo dice.

**Verificación:** sintaxis; 204 comprobaciones del recorrido (tres nuevas: una fecha pasada
filtra y habilita, ningún atajo queda marcado, el cierre es del día elegido), sin errores de
consola; 45 de auditoría; presentación sin desbordes. Marca de versión 0.6.5.

## Bloque 25 — Sin señal: la app abre, y quien registra sabe qué hacer (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.6.

**De dónde viene.** Liber preguntó si el formulario funciona sin internet y pidió que quien
registra lo sepa y sepa qué hacer cuando tenga señal. Funcionaba a medias: con la app abierta sí;
cerrada y sin señal, dependía de la caché del navegador; y nada en pantalla decía que los
registros se quedan en el teléfono ni que borrar el navegador los pierde.

**Qué cambió (D71, D72).** `sw.js` guarda la app completa (34 archivos, capas incluidas) con la
marca de versión de `index.html`; la página va primero a la red y, sin ella, a lo guardado.
Manifiesto e iconos provisionales para instalarla. `js/conexion.js`: indicador «Con conexión» /
«Sin conexión · puede seguir registrando» en el encabezado; aviso en Registros con cuántos
registros guarda el dispositivo y qué hacer según haya o no señal; pantalla «¿Qué hacer sin
internet?» de cinco pasos; «Guardar respaldo» (plantaciones, cierres y bitácora, mismo esquema)
entregado como el PDF, y «Restaurar respaldo» en las herramientas de prueba, que sólo agrega lo
que no existe. `entregar()` de reportes se generalizó a `entregarArchivo()` para que el respaldo
y el PDF salgan por la misma puerta.

**Verificación:** sintaxis; 215 comprobaciones del recorrido (once nuevas), sin errores de
consola: el worker guarda la app con la marca `srp-0.6.6`; con la red apagada la página vuelve a
abrir en la misma versión; el encabezado y el aviso cambian de texto; el respaldo lleva las tres
tablas y se restaura en un contexto limpio (0 → 4) sin duplicar al repetir. 45 de auditoría;
presentación sin desbordes; sin selectores duplicados, clases, ids ni colores fuera de `:root`.
Marca de versión 0.6.6.

**Pendientes anotados:** icono definitivo de la identidad gráfica; tipografías alojadas en
`vendor/` si se quiere la identidad completa sin señal.

## Bloque 26 — Tres ajustes del formulario en teléfono (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.7.

**Qué cambió.** «Revisar y guardar» pasa a verde con icono de disco, 56 px de alto y ancho
completo en teléfono (D73); nuevo icono `disco` en `iconos.js`. En la ficha de revisión, el título
y los botones Guardar y Corregir van en una cabecera pegajosa: no se pierden al desplazar (D74).
En Registros, «Un periodo» abre el selector de Desde, Desde encadena a Hasta y Hasta aplica el
periodo (D75); `abrirSelector()` usa `showPicker()` cuando el navegador lo permite y deja el
foco si no.

**Verificación:** sintaxis; 220 comprobaciones del recorrido (cinco nuevas: color, icono, alto y
ancho del botón; cabecera fija con el botón visible tras desplazar; foco en Desde, paso a Hasta y
aplicación automática), sin errores de consola; 45 de auditoría; presentación sin desbordes; sin
selectores duplicados ni clases sin uso. Marca de versión 0.6.7.

## Bloque 27 — Editar la especie desde la ficha (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.8.

**Qué cambió (D76).** `filtrarEspecies()` ofrece la lista completa mientras haya una especie
elegida; al teclear, `especieId` se anula y vuelve a filtrar. Una línea, con su porqué en el
código.

**Verificación:** sintaxis; 222 comprobaciones (dos nuevas: Editar especie vuelve al campo con
texto y lista completa; al teclear filtra), sin errores de consola; 45 de auditoría. Marca de
versión 0.6.8.

## Bloque 28 — La ficha sin «Corregir» (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.9.

**Qué cambió (D77).** Se retira «Corregir» de la ficha de revisión; queda «Guardar» y una × de
«Cerrar sin guardar» junto al título. Nuevo icono `cerrar`. La prueba que usaba el color de
«Corregir» como referencia del dorado ahora lee el token `--editar` directamente.

**Verificación:** sintaxis; 223 comprobaciones (una nueva: la × cierra y no existe Corregir), sin
errores de consola; 45 de auditoría; presentación sin desbordes. Marca de versión 0.6.9.

## Bloque 29 — La ficha bien apilada y Registros por bloques (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.10.

**Ficha de revisión (D78).** Auditoría de superposiciones hecha como usuario en teléfono: el
mapa se pintaba sobre la cabecera fija en Safari y ocultaba «Guardar»; el foco abría en la ×; el
desplazamiento se encadenaba con la página; la altura del diálogo excedía la pantalla con la barra
de iOS. Cuatro correcciones de estilo y una de marcado (título con `tabindex="-1"` y `autofocus`).
La prueba mide con `elementFromPoint` que sobre la cabecera sólo está la cabecera, y comprueba
aislamiento, foco y contención.

**Registros (D79).** Cuatro bloques titulados: Filtrar, lista, Parte del día, Registros en este
dispositivo. Nueva clase `.bloque` (filete y separación); el `h2` de cada bloque usa
`.titulo-bloque`, que ya existía.

**Verificación:** sintaxis; 224 comprobaciones (una nueva de apilamiento y foco; la del aviso
comprueba también los tres títulos), sin errores de consola; 45 de auditoría; presentación sin
desbordes en ocho combinaciones; sin selectores duplicados ni clases sin uso. Marca de versión
0.6.10.

## Bloque 30 — La conexión se nota (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.11.

**Qué cambió (D80).** El indicador de conexión pasa de texto gris a pastilla con icono (`senal`,
`sinSenal`), color por estado y etiqueta accesible; es un botón que abre la guía de qué hacer sin
internet, con lo que la guía queda a un toque en la pantalla principal.

**Verificación:** sintaxis; 225 comprobaciones (una nueva: la pastilla abre la guía), sin errores
de consola; presentación sin desbordes. Marca de versión 0.6.11.

## Bloque 31 — Reportes aparte, sin saltos de foco, la cuenta a la vista (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.12.

**Reportes (D81).** Nueva pestaña y vista `vista-reportes` con dos bloques: «Parte del día»
(`pdf-dia` con máximo hoy, `pdf-cabo` sólo para quien ve a varias personas, nota con cuántos
registros se reportarán y botón que se apaga sin registros) y «Registros en este dispositivo»
(aviso, respaldo, guía). `SRP.reportes` gana `preparar`, `registrosAlcance`, `registrosDelDia`,
`refrescarVista` y `generarDesdeVista`; `registros.js` pierde toda la lógica de reporte y el
`descripcionFiltro()` muerto. `app.js` prepara la vista al entrar y la incluye en la comprobación
de versión completa.

**Sin saltos de foco (D82).** Fuera `ORDEN_FOCO`/`avanzarFoco` y sus tres llamadas en
formulario.js; fuera el encadenado Desde → Hasta → Aplicar y `abrirSelector` en registros.js;
fuera los saltos perfil → coordinador y área → cargo en usuarios.js.

**La cuenta a la vista (D83).** `SRP.conexion.contarGuardados()` alimenta la pastilla («Con
conexión · N guardados»), el bloque de Reportes y la nueva línea `dlg-guardado-dispositivo` del
aviso de guardado. La pastilla se refresca al entrar, al guardar y al eliminar.

**Evaluación de KoboToolbox.** A petición de Liber se comparó su cola de envío sin conexión: lo
que aplica hoy entró como D83; lo que exige servidor quedó especificado en el pendiente «Cola de
envío al servidor (Fase 2)». Liber entregó además el catálogo real de especies (76), que se
carga en el bloque 32; queda anotado con sus dos decisiones abiertas.

**Verificación:** sintaxis; 229 comprobaciones (Reportes: bloques, día por omisión, cabo según
alcance, botón que se apaga; D82: seis; D83: tres), sin errores de consola; 45 de auditoría;
presentación sin desbordes en ocho combinaciones, ahora con la vista Reportes. Marca de versión
0.6.12.

## Bloque 32 — Catálogo real de especies (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.13.

**Qué cambió (D84).** `assets/fuentes/CGO_ESPECIES_REFORESTACION_URBANA_2026-09-22.xlsx` y
`pruebas/generar_especies.py` → `assets/catalogo-especies.js` (76 especies, `meta` con fuente,
fecha de corte y siguiente clave). `datos-ficticios.js` siembra ese catálogo en lugar de las 24
especies inventadas; `SELLO_DATOS` sube a `2026-09-22-catalogo-especies`. `referencias.js` gana
`especieCoincide()` (nombre, científico, otros nombres), que usan el autocompletado del
formulario (con «también: …») y el buscador de Catálogos. `catalogos.js`: tabla con
Distribución y otros nombres; alta de especie con clave `ESP-0000` consecutiva y fija, tipo de
distribución, otros nombres, forma de crecimiento, id SNIB e id EncicloVida validados, género y
epíteto derivados; `grupo` desaparece. `espejo.js` anota qué viaja con `especie_id`.

**Documentación.** MAPEO-CAMPOS: módulo Catálogos reescrito con los campos de especie y la
columna «se ve en el formulario de registro»; en Registro, apartado de campos de la especie que
viajan sin verse. README: sección «Catálogo de especies». DECISIONES: D84 y dos pendientes
resueltos.

**Verificación:** sintaxis; 237 comprobaciones (ocho nuevas: 76 especies, búsqueda por otro
nombre con aviso, nombres que señalan a varias, tabla con distribución, cuatro Quercus, búsqueda
en Catálogos por otros nombres, clave consecutiva fija, validaciones y guardado de la especie
nueva, inactiva fuera del formulario), sin errores de consola; 45 de auditoría con el mapeo al
día; presentación sin desbordes. Marca de versión 0.6.13.

## Bloque 33 — Inventario de tablas y diccionario de datos (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.14 (sólo cambia la marca y la etapa; no hay cambios
funcionales).

**Qué se hizo (D86).** `esquema.json` nuevo: 5 tablas, 94 campos con tipo, nulo, origen,
dominio, pantalla y regla; 12 dominios con su fuente en el código; 13 relaciones; 14 campos
derivados; 7 cálculos que no se guardan; 12 estados efímeros; 8 campos condicionales; 27 reglas
de Fase 1 con el archivo donde viven; 10 reglas de Fase 2; 4 capas/catálogos externos.
`pruebas/generar_diccionario.py` lo convierte en `DICCIONARIO-DATOS.md` (13 secciones, con el
borrador de tablas PostgreSQL). `pruebas/auditoria.py` gana 30 comprobaciones: almacenes,
campos por tabla, llaves e índices, dominios contra el código, acciones y entidades de bitácora,
relaciones, diccionario regenerado y rastro de términos superados en la documentación vigente.
Prueba negativa hecha: quitar un campo o un valor del esquema hace fallar la auditoría.

**Auditoría de la documentación (pedida por Liber).** Hallazgos y qué se hizo: (1) D02–D06 y
D12 seguían con «registrador» y «jefe de registradores»: se anotan como superadas y se registra
D85; el pendiente sobre el «Jefe» se reescribe con el término vigente. (2) MAPEO decía que
`es_ficticio` está «en los cuatro almacenes»: son tres (plantaciones, usuarios, catalogos); cierres
y bitácora no la llevan, queda como pendiente de decisión. (3) El perfil Consulta (`VIEWER`) sigue
en el código sin cuenta, mientras Liber cuenta tres perfiles: pendiente de decisión, no se retira
sin confirmar. (4) El respaldo no lleva usuarios ni catalogos: pendiente. (5) `programa_id` y
`area_id` se tipifican como texto (los ids de arranque no son UUID). README: sección «Modelo de
datos» y regla en «Al cerrar un bloque».

**Verificación:** sintaxis; 237 comprobaciones del recorrido; 81 de auditoría; presentación sin
desbordes. Marca de versión 0.6.14.

## Bloque 34 — Decisiones del Excel y tipografías locales (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.15.

**Qué cambió (D87).** `permisos.js`: fuera `VIEWER`; `SRP.SIN_PERMISOS` para perfiles
desconocidos (alcance `ninguno`, que `alcanza()` respeta); Coordinador confirmado como registra sí
/ elimina no. `reportes.js` y `almacen.js`: `es_ficticio` en cierres y bitácora. `conexion.js`:
respaldo y restauración sobre `SRP.almacen.ALMACENES` (cinco tablas), `resumenFotos()` y
`registrosPropios()`; el aviso del dispositivo dice cuántos llevan fotografía y cuánto pesan.
`formulario.js`: la lista de especies sin tope de ocho; placeholder «Toque para ver la lista o
escriba para buscar». Tipografías: `vendor/fuentes/` (cabin.woff2 variable 400–700,
roboto-regular/medium/bold.woff2, OFL de Cabin), `@font-face` en `estilos.css`, sin Google Fonts
en `index.html`, lista explícita en `sw.js`. `SELLO_DATOS` sube.

**Documentación.** esquema.json (perfil con tres valores, `es_ficticio` en dos tablas más, respaldo
con cinco tablas, dos cálculos nuevos), diccionario regenerado, MAPEO (perfil, cierres, bitácora,
clave de campo descartada), README (cuentas, estructura, sin Consulta), DECISIONES (D87, diez
pendientes cerrados, cuatro reabiertos o mantenidos con la decisión de Liber).

**Verificación:** sintaxis; 241 comprobaciones (cuatro nuevas: tres perfiles, respaldo de cinco
tablas con resumen, `es_ficticio` en cierres y bitácora, contador de fotografías), sin errores de
consola; 81 de auditoría (perfiles a tres, esquema al día); presentación sin desbordes. El service
worker guarda 39 archivos, tipografías incluidas. Marca de versión 0.6.15.

## Bloque 35 — Iconografía institucional (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.16.

**Qué cambió (D88).** `assets/fuentes/ICONOS_SET_CDMX_2024-2030.ai` (fuente) y
`pruebas/extraer_iconos.py` (agrupa los 300 trazados del PDF embebido, los numera y normaliza los
elegidos). `js/iconos.js`: basura, cerrar, ubicación, cámara y ver tomados del set; `ojo` → `ver`
(`registros.js`). La cámara de la zona de fotografía deja de ser SVG en línea en `index.html` y la
pone `formulario.js` desde `SRP.ICONOS` (`#icono-foto`). Para elegirlos se entregó a Liber una
propuesta HTML con las opciones y una hoja índice numerada del set.

**Verificación:** sintaxis; 241 comprobaciones sin errores de consola; 81 de auditoría;
presentación sin desbordes; el extractor reproduce exactamente los cinco trazados de iconos.js.
Marca de versión 0.6.16.

## Bloque 36 — Más iconos, logotipo del programa e icono de la app (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.17.

**Iconos (D89).** Trece iconos más del set en `js/iconos.js` (extraídos con
`pruebas/extraer_iconos.py`, cuya `SELECCION` los documenta por número) y `SRP.ICONOS.poner()`;
`SRP.app.ponerIconos()` los coloca al arrancar en etiquetas del acceso, botón Entrar, nombre de
la cuenta, las cinco pestañas (ahora en columna icono + texto), ayuda sin internet, buscar,
agregar, dar de alta y avisos informativos. CSS: pestañas en columna, iconos en etiquetas y
avisos.

**Logotipo e icono (D90).** `assets/encabezado-ru.png` (1400 px, completo) y
`assets/encabezado-ru-movil.png` (recorte) en un `<picture>` con corte a 480 px; ambos con
marca `?v=` (la móvil vía `preload`) para que el worker los guarde. El PDF carga el completo con
`cargarLogo()` y calcula su alto por proporción. `assets/icono-192.png`, `icono-512.png`,
`icono-512-maskable.png` y `apple-touch-icon.png` generados del emblema en blanco;
`manifest.webmanifest` con `purpose` separado. `assets/logo.js` fuera de `index.html` y movido a
`_to_delete/`.

**Verificación:** sintaxis; 241 comprobaciones sin errores de consola; 81 de auditoría;
presentación sin desbordes en ocho combinaciones (encabezado con logotipo nuevo incluido); el
worker guarda 41 archivos. Marca de versión 0.6.17.

## Bloque 37 — Ventanas con cabecera fija (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.18.

**Qué cambió (D91).** `index.html`: cabecera `.dialogo-cabecera` (título con foco inicial, ×
`.dialogo-cerrar`, acción) en `dlg-detalle`, `dlg-cierre`, `dlg-catalogo`, `dlg-usuario` y
`dlg-senal`; fuera los botones Cancelar/Cerrar/Entendido del pie. `app.js`: un solo manejador para
todas las ×. `registros.js`: botón Editar en el detalle según `puedeEditar`. Se retiran los
manejadores sueltos de cancelar en catálogos, usuarios, reportes y conexión, y el foco forzado al
abrir el cierre. Icono de la pestaña Registros: árbol #214.

**Verificación:** 243 comprobaciones (dos nuevas: las cinco ventanas con cabecera fija, × y sin
Cancelar; Editar en el detalle), sin errores de consola; auditoría y presentación sin hallazgos.
Marca de versión 0.6.18.

## Bloque 38 — Capas definitivas de alcaldías y UGA (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.19.

**Diagnóstico (D92).** Alcaldías nuevas: 16 válidos, 0 solapes, 0 huecos (antes 3 y 5); el punto
del hueco de 1.2 ha (19.4838, -99.1499) ahora es Gustavo A. Madero. UGA nueva: 1,624 celdas,
geometría igual a la anterior, ocho prefijos distintos a su alcaldía, cobertura total, sin
traslapes. **Qué cambió:** `assets/fuentes/alcaldias_cdmx.json` y `UGA_CDMX.geojson` definitivos;
anteriores en `_to_delete/fuentes-anteriores/`; `assets/fuentes/documentacion/` con metadato,
diccionario y SLD. `generar_capas.py`: lee GeoJSON por renglones, convierte Polygon a
MultiPolygon, prefijo por clave INEGI, campo `clave` de la UGA, versiones `sia-2026-01-01` y
`sia-2026-09-22`. `derivacion.js` y `referencias.js`: comentarios al día. Prueba del hueco y del
solape reescritas para comprobar la corrección; auditoría lee las fuentes nuevas. Esquema,
diccionario, MAPEO, README y DECISIONES al día.

**Verificación:** 243 comprobaciones sin errores de consola, 81 de auditoría, presentación sin
desbordes. Marca de versión 0.6.19.

## Bloque 39 — La cuenta en un menú (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.20.

**Qué cambió (D93).** `index.html`: `#btn-cuenta` con `#menu-cuenta` (nombre, perfil, Cerrar
sesión, Cambiar usuario de prueba); los ids de siempre se conservan. `app.js`: `menuCuenta()`,
cierre al tocar fuera y con Escape, etiqueta accesible con nombre y perfil. `conexion.js`: la
palabra «guardados» en su propio `span`, oculto en teléfono. CSS: encabezado en una fila,
botón redondo, menú desplegable, pastilla sin partirse. Pruebas: abren el menú antes de salir;
tres comprobaciones nuevas (menú plegado, contenido al abrir, Escape).

**Verificación:** 244 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones; sin desborde a 320, 360 y 390 px. Marca de versión 0.6.20. El logotipo se encoge con su proporción cuando falta ancho (visto a 640 px con zoom al 200 %).

## Bloque 40 — Acciones de renglón en una tuerca (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.21.

**Qué cambió (D94).** `iconos.js`: icono `tuerca` y `menuAcciones(id, etiqueta, items)`, que
arma la tuerca y un menú de opciones que conservan `data-accion` y `data-id` (los módulos
atienden el clic sin cambios). `registros.js`, `catalogos.js` y `usuarios.js` usan el menú.
`app.js`: `iniciarMenusAcciones()` abre, coloca con `position: fixed`, sigue la tuerca al
desplazar, cierra al elegir, fuera o con Escape, y recorre con flechas. CSS de tuerca y menú.
Pruebas: ayudante `accion()` que abre la tuerca antes de elegir; cuatro comprobaciones nuevas
(tuerca por renglón y menú cerrado, opciones con icono, foco a la primera, Escape).

**Verificación:** 247 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes. Marca de versión 0.6.21.

## Bloque 41 — Estilo único de atajos y filtros (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.22.

**Qué cambió (D95).** Maqueta previa con dos variantes; Liber eligió la A (activo suave).
`index.html`: encabezado de grupo `.grupo-cab` con «Reiniciar filtros»; clase `.zona-filtros`
en los filtros de Registros, Reportes, Catálogos y Usuarios; «Aplicar» primario; texto guía del
buscador de especies. CSS: variables `--borde-filtro`, `--fondo-campo`, `--radio-filtro`;
atajos en rejilla de ancho igual; campos grises con cuadrito de flecha o calendario (SVG en la
hoja) y lupa del set CDMX; filtros en teléfono de dos en dos. `registros.js`: la fecha de «Hoy»
en su propio renglón con coma oculta. `app.js`: la fecha de filtro abre el calendario al tocarla;
la lupa ya no se pone en la etiqueta. Pruebas: la del atajo de hoy lee el texto completo; una
comprobación nueva del estilo (activo suave, anchos iguales, cuadritos, Reiniciar en el
encabezado, Aplicar primario).

**Verificación:** 249 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.22.

## Bloque 42 — Guardar a la mano, precisión del GPS y estados vacíos (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.23.

**Qué cambió (D96, D97).** `index.html`: clase `barra-guardar` en las acciones del formulario;
`#registros-vacio`; salidas de la cuenta como `menu-opcion`. `config.js`: `PRECISION_BUENA_M` y
`PRECISION_ACEPTABLE_M`. `mapa.js`: `nivelPrecision()`, `mostrarPrecision()` y `dibujarMargen()`
(círculo Leaflet que se borra con puntos no GPS y al limpiar). `registros.js`: `pintarVacio()` y
`quitarFiltros()`. CSS de barra fija, estado vacío, insignia de precisión y menú de cuenta.
Pruebas: ocho comprobaciones nuevas (tres niveles de precisión y el caso manual, barra fija,
vacío ausente con datos, filtro sin resultados y «Quitar filtros») y la de cerrar sesión
reescrita para el renglón de texto.

**Verificación:** 257 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.23.

## Bloque 43 — Formulario revisado en iPhone (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.24.

**Origen:** capturas de Liber del formulario en su iPhone 17 (v0.6.22).

**Qué cambió (D98).** `index.html`: botones de programa sobre la lista, botón «Hoy» junto a la
fecha, etiqueta de coordenadas abreviada (el resto para lector de pantalla). `formulario.js`:
`iniciarProgramas()`, `pintarProgramas()`, `enfocar()` (errores y corrección llevan al control
visible), `darEspacioALista()`, clase `con-foto`. CSS: todos los `:hover` pasan a
`@media (hover: hover)`; foco guinda en campos; ficha compacta del punto; fecha con «Hoy»;
zona de foto reducida; `.campo .oculto-visual` sin relleno ni borde. `revisar.py` ignora
controles ocultos a propósito. Pruebas: siete comprobaciones nuevas (botones de programa sin
preselección y con un toque, «Hoy», foco guinda, zona de foto reducida, ficha compacta, lista
de especies sin opción marcada) y la del foco del programa reescrita.

**Verificación:** 264 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.24.

## Bloque 44 — Ficha de revisión revisada en iPhone (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.25.

**Origen:** capturas de Liber del formulario lleno y de la ficha de revisión (v0.6.24).

**Qué cambió (D99).** `index.html`: «Guardar» en `.dialogo-pie` al final de la ficha; atributos
`spellcheck`, `autocorrect` y `autocapitalize` en los campos de especie. `formulario.js`: filas
de la ficha en el orden del formulario, apartado «Datos del sistema» y `textoOrigenRevision()`
con la insignia de precisión. CSS: `.dialogo-pie` y `.revision-sistema`. Pruebas: cuatro
comprobaciones nuevas (campos de especie sin corrector, Guardar al pie fijo y a todo el ancho,
orden con Folio e Identificador al final, insignia en «Cómo se obtuvo»). Se crea `MEJORAS.md`
con columna de prioridad.

**Verificación:** 268 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.25.

## Bloque 45 — Lista de registros, filtros y tablas (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.26.

**Origen:** capturas de Liber de Mis registros, menú de la tuerca, detalle y edición (v0.6.25),
más M05, M07, M10 y M11 de la lista de diseño.

**Qué cambió (D100).** `index.html`: botón `#btn-filtros`, `#filtros-activos`, panel
`#panel-filtros`, cajas de Año y Mes con id, «Editar» del detalle en `#detalle-pie`.
`registros.js`: tarjeta con miniatura, clic en tarjeta abre el detalle, `pintarFichas()`,
`plegarFiltros()`, Año/Mes ocultos con el periodo abierto, detalle reordenado con «Datos del
sistema». `formulario.js`: `textoOrigenRevision()` sin consejo para el detalle. `app.js`: la
pestaña Registros se marca al editar. `util.js`: `ordenable()` y `ordenarFilas()`, usados por
`catalogos.js` y `usuarios.js`. CSS: tarjeta, fichas, botón de filtros, panel plegado en
≤700 px, encabezado fijo y ordenable, punto de estado, mismo ancho de vistas. Pruebas: ayudante
`abrir_filtros()` y ocho comprobaciones nuevas.

**M33 (menú de la tuerca lejos de la tuerca):** verificado con captura normal del iPhone; el
menú sale junto a su tuerca. Era efecto de la captura de página completa. Sin falla.

**Verificación:** 276 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.26.

## Bloque 46 — Avisos con «Deshacer», vista previa del parte y nombre del PDF (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.27.

**Qué cambió (D101, D102).** `util.js`: `anunciar(mensaje, tipo, op)` con icono, × y
«Deshacer». `registros.js`: deshacer eliminar (`restaurar()`) y reiniciar filtros
(`volverAFiltro()`). `formulario.js`: deshacer quitar foto. `catalogos.js` y `usuarios.js`:
deshacer activar/desactivar. `index.html`: botón del cierre al pie como «Ver vista previa»;
ventana `#dlg-previa`. `reportes.js`: `htmlPrevia()`, botones Generar PDF y Corregir,
`nombreArchivo()`. CSS: aviso arriba con fondo oscuro y colores propios de contraste; hoja de
vista previa. Pruebas: nueve comprobaciones nuevas (aviso arriba con × y Deshacer, Deshacer de
eliminar y de reiniciar filtros con bitácora, vista previa con apartados y sin los vacíos,
Corregir vuelve al cierre, nombre del archivo).

**Verificación:** 285 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.27.

## Bloque 47 — Parte del día: PDF más claro y ligero, cierre más ágil (22-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.28.

**Origen:** PDF real y capturas de Reportes enviados por Liber (v0.6.26).

**Qué cambió (D103).** `reportes.js`: `gruposPersonal()` para el PDF y la vista previa;
Total y encabezado de Ejemplares a la derecha; `compress: true` y `logoJPEG()`; botón «Ahora».
`index.html`: logística del cierre reacomodada con `#btn-hora-ahora`. CSS: `campo-doble-fijo`,
cabo a todo el ancho en Reportes en teléfono, cifras y listas de la vista previa. Pruebas: seis
comprobaciones nuevas (fila Modelo/Placa, «Ahora», orden del personal, Total a la derecha,
peso del PDF menor a 150 KB) y dos ajustadas.

**Verificación:** 290 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones; PDF de prueba de 60 KB. Marca de versión 0.6.28.

## Bloque 48 — Registros sin filtro de inicio, «reporte» en vez de «parte» y Reportes simplificado (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.29.

**Qué cambió (D104).** `registros.js`: inicio y reinicio en Todos; un solo atajo marcado.
`index.html`: panel de filtros abierto de inicio; `data-vacio` en fecha de plantación, Desde,
Hasta y hora de finalización; «parte» → «reporte»; se retira el bloque del dispositivo de
Reportes; «Guardar respaldo» en el menú de la cuenta. `app.js`: `iniciarVacios()`.
`conexion.js`: sin el botón de ayuda de Reportes; respaldo cierra el menú. `reportes.js`,
`espejo.js`, `almacen.js`: textos. CSS: texto guía de campos vacíos; se quita el contorno de
«Un periodo» abierto. Pruebas: siete comprobaciones nuevas y las de inicio en Hoy, bloque del
dispositivo y respaldo reescritas.

**Verificación:** 294 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.29.

## Bloque 49 — Catálogos y Usuarios en teléfono (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.30.

**Origen:** revisión M24 hecha con capturas propias en tamaño iPhone (perfil de administración)
y petición de Liber sobre la ficha «Hoy» repetida.

**Qué cambió (D105).** `catalogos.js` y `usuarios.js`: clases `c-titulo`, `c-sub`,
`c-movil-oculta`, `c-acciones` y celda `c-resumen`; clic en la tarjeta abre la edición;
contadores `#cat-cuenta` y `#usr-cuenta`. `index.html`: notas de una línea, `tabla-tarjetas`,
Guardar al pie en las dos ventanas. `registros.js`: fichas visibles sólo con el panel plegado.
CSS: tarjeta compacta en ≤480 px, contador, fichas condicionadas. Pruebas: cuatro
comprobaciones nuevas (contador de especies, tarjeta abre edición con Guardar al pie, tarjeta de
usuario compacta con contador, ficha «Hoy» sólo plegado) y una ajustada.

**Verificación:** 298 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.30.

## Bloque 50 — Modo sol (alto contraste) (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.31.

**Qué cambió (D106).** `index.html`: interruptor `#btn-contraste` (role=switch) en el menú de la
cuenta. `config.js`: `CLAVE_CONTRASTE`. `app.js`: `iniciarContraste()`. CSS: variables
redefinidas en `:root[data-contraste="alto"]`, trazos y pesos del modo, `--texto-guia` para
placeholder y campos vacíos, interruptor. Pruebas: tres comprobaciones nuevas (interruptor
apagado de inicio, activar pone texto negro y guarda la preferencia, se apaga) y el puntero se
retira tras usar el menú para no alterar la prueba de énfasis.

**Verificación:** 301 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.31.

## Bloque 51 — Navegación abajo, estado de cuentas y forma de crecimiento (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.32.

**Qué cambió (D107).** CSS: barra de secciones fija abajo en ≤700 px con `--alto-nav`, barra de
guardar encima, `body` con relleno inferior; `campos-grises` extiende el estilo de los filtros
al cierre; `chips-multi`; leyenda y fieldset sin margen. `index.html`: `#usr-estado`,
`#cat-forma-botones` con el campo `#cat-forma` oculto, `campos-grises` en el cierre.
`catalogos.js`: `FORMAS`, `pintarFormas()`, `alternarForma()`. `usuarios.js`: filtro por estado.
Pruebas: siete comprobaciones nuevas.

**Verificación:** 308 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.32.

## Bloque 52 — Crédito del mapa y autollenado de Safari (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.33.

**Qué cambió (D108).** `mapa.js`: prefijo sin bandera y crédito que se despliega al tocarlo.
`app.js`: `campoClave()` retira y devuelve el campo de contraseña; `sinAutollenado()`. CSS:
crédito en un renglón en ≤700 px. Pruebas: tres comprobaciones nuevas y la de atribución lee el
texto completo.

**Verificación:** 311 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.33.

## Bloque 53 — Equilibrio en computadora (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.34.

**Qué cambió (D109).** `index.html`: envolturas `.registrar-columnas` y `.registrar-ubicacion`
en Nuevo registro. CSS: rejilla de dos columnas, mapa más alto y Reportes centrado en ≥1024 px.
`revisar.py` admite mapa de hasta 530 px en computadora. Pruebas: dos comprobaciones nuevas
(columnas en Nuevo registro, Reportes centrado).

**Verificación:** 313 comprobaciones sin errores de consola; 81 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.34.

## Bloque 54 — Nomenclatura del folio: `AAA-000-00000` (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.35.

**De dónde viene.** Decisión del SIA acordada con Liber: el folio pierde el prefijo de sistema y
el año, redundantes con la base (el origen y el ejercicio ya son campos). La entrada del bloque 23
se conserva como historia; la redacción vigente está en D67 y en las R5–R6 ampliadas de D68.

**Qué cambió.** `js/folio.js`: `PATRON` `/^[A-Z]{3}-\d{3}-\d{5}$/`, `LARGO` 13, `TECHO` 99 999;
`armar(uga, consecutivo)` sin año y con rechazo de consecutivos fuera de 1–99 999; cabecera
reescrita. `esquema.json`: `folio` pasa de char(22) a char(13), dominio nuevo con UNIQUE,
regla y S-02 con la secuencia perpetua y monotónica, S-03 con UNIQUE en `plantaciones.folio`.
`DICCIONARIO-DATOS.md` regenerado. `MAPEO-CAMPOS.md` y `README.md` con la nomenclatura nueva.
`DECISIONES.md`: D67 reescrita con constancia de sustitución, R5–R6 de D68 ampliadas con la
condición dura y la regla de desbordamiento, ejemplo del pendiente de las claves UGA corregido.
`auditoria.py`: tres comprobaciones nuevas (esquema en 13 caracteres y único, patrón del código,
ningún rastro del formato anterior fuera de la bitácora). Pruebas: la del folio reescrita y dos
nuevas (el formato anterior ya no valida; consecutivo fuera de rango se rechaza).

**Lo que no cambia.** Especie fuera del folio; asignación única en el servidor e inmutable (R7);
UUID como clave de idempotencia (R4); `EXT-000` fuera de la malla; el folio identifica al
ejemplar (R10); baja lógica (R9); campos congelados (R8); en Etapa 1 folio nulo y PROVISIONAL
en pantalla y PDF; emisión en Fase 2 condicionada a las capas definitivas del SIA.

**Verificación:** 315 comprobaciones sin errores de consola; 84 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.35.
