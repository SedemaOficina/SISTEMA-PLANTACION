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

## Bloque 55 — Folio simulado con datos de prueba (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.36.

**Qué cambió (D110).** `js/folio.js`: `simulado()`, `leerSecuencias()`, `siguiente()`,
`emitirPendientes()` y `textoLargo()`. `config.js`: `CLAVE_SECUENCIAS_PRUEBA`. Emisión al guardar
(`formulario.js`, que además muestra el folio en «Registro guardado»), al entrar (`app.js`) y al
volver la señal (`conexion.js`). `registros.js`: el detalle escribe «(simulado)» y el historial
escribe las acciones sin guion bajo. `reportes.js`: aviso de folios simulados en vista previa y
PDF. `esquema.json`: acción de bitácora `FOLIO_ASIGNADO`; diccionario regenerado. Pruebas: la de
R8 comprueba el nacimiento en nulo con `registroPrevisto()` y cuatro nuevas (asignación y
congelamiento, bitácora y unicidad desde la secuencia, texto «(simulado)», sin conexión no se
emite).

**Verificación:** 319 comprobaciones sin errores de consola; 84 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.36.

## Bloque 56 — Envío al servidor simulado con datos de prueba (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.37.

**Qué cambió (D111).** Nuevo `js/envio.js`: cola, estados, envío con demora y corte, franja de
atraso, guía con la cola, «Simular sin señal», reintento por minuto y al volver a la app.
`config.js`: `CLAVE_ENVIOS_PRUEBA`, `CLAVE_SIN_SENAL_PRUEBA`, `DEMORA_ENVIO_PRUEBA_MS`,
`REINTENTO_ENVIO_MS`, `HORA_CIERRE_JORNADA`. `conexion.js`: `enLinea()` obedece a «Simular sin
señal»; pastilla con «por enviar», «Al día», «Enviando…» y atraso en rojo. `formulario.js`:
«Registro guardado» dice «Enviando…» y luego enviado con hora o por enviar; la edición vuelve a
la cola. `registros.js`: marca «Por enviar», fila «Envío» en el detalle y corrección de la lista
en su lugar tras un envío (repintar cerraba el menú de la tuerca). `app.js`: envío al entrar.
`index.html`: franja, cola en la guía, interruptor en el menú. Estilos de pastilla, franja y
marca. Pruebas: se actualizan las de la pastilla y el aviso de guardado (D83) y se agregan 16
de D111 (envío al guardar, atraso con fecha, «Enviar ahora» sin señal, envío solo al volver la
señal, marca y folio en la tarjeta, detalle, reenvío de cambios, interruptor y corte a medio envío).

**Verificación:** 335 comprobaciones sin errores de consola; 84 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.37.

## Bloque 57 — Jornadas y el atajo «Un día» (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.38.

**Qué cambió (D112, D113).** Nuevo `js/jornadas.js`: agrupación por fecha y cabo con partición
por sitio, avisos (duplicado, lejos, precisión), mapa Leaflet con pines numerados, conciliación
guardada en el cierre, «Está bien», regreso a la jornada tras ver, editar o eliminar. `index.html`:
pestaña y vista «Jornadas», chip «Un día» en Registros. `config.js`: `JORNADA` (3, 150, 500 m).
`reportes.js`: un cabo guarda el cierre con su id; la conciliación sale en la vista previa y el
PDF; el cierre conserva `arboles_sembrados` y `puntos_revisados`. `registros.js`: «Un día»,
eliminar/restaurar refrescan Jornadas. `formulario.js` y `app.js`: la edición vuelve a Jornadas.
`iconos.js`: icono de mapa. `esquema.json`: dos campos en cierres; diccionario y MAPEO al día.
Pruebas: 30 nuevas (sección, barra inferior, atajos, tarjeta, mapa y lista numerados, avisos,
conciliación y su guardado, selección cruzada, eliminar duplicado, «Está bien», ver/editar y
regreso, reporte con conciliación, «Un día» en ambas vistas, llave del cierre); `revisar.py`
revisa Jornadas con una abierta.

**Verificación:** 366 comprobaciones sin errores de consola; 84 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.38.

## Bloque 58 — Vocabulario, iconos del menú y orden de secciones (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.39.

**Qué cambió (D114).** «Sembrados» → «plantados» en `index.html`, `jornadas.js`, `reportes.js`,
`espejo.js`, `esquema.json` (campo `arboles_plantados`), MAPEO y MEJORAS; diccionario regenerado.
`iconos.js`: `sol` y `salir`; `app.js` pone icono a las cinco opciones del menú de la cuenta.
`index.html`: pestañas en el orden Nuevo registro, Jornadas, Registros, Reportes. Pruebas: orden
de las pestañas e iconos del menú; auditoría: el término «sembrar» no aparece en pantalla,
reportes ni esquema (85 comprobaciones).

**Verificación:** 368 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.39.

## Bloque 59 — Croquis en el reporte y revisión de Jornadas (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.40.

**Qué cambió (D115, D116).** Nuevo `js/croquis.js` (Web Mercator, mosaicos con CORS y tiempo
límite, fondo liso de respaldo, puntos numerados, escala, norte, caché). `reportes.js`: apartado
«Croquis de la jornada» en vista previa (se llena cuando la imagen está) y PDF. `jornadas.js`:
zoom hasta 22, acciones con icono y color, subtítulo sin fecha repetida. `index.html`/`app.js`:
`.btn-cancelar` con tache en «Cancelar» y «Cancelar edición»; `autocomplete="off"` en el conteo.
`config.js`: `ZOOM_JORNADA`. Pruebas: croquis en vista previa y PDF (peso), encuadre, iconos de
las acciones, «Cancelar» en rojo.

**Verificación:** 374 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.40.

## Bloque 60 — La jornada es la unidad: varias en un día y un reporte por jornada (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.41.

**Qué cambió (D117).** `jornadas.js`: reparto secuencial por cercanía con correcciones a mano
(`corte()`), `jornadasDe(fecha, cabo)`, conciliación por jornada, tarjeta «Jornada 2 de 3».
`reportes.js`: `claveCierre(fecha, cabo, n)`, `cierreDeJornada()` con tres caminos, selector
«Jornada», `abrir()` con la jornada, «Jornada 2 de 3» en vista previa y PDF, `_J2` en el nombre
del archivo, sin «Todos los cabos». `formulario.js`: `corte_jornada` nace nulo. `index.html`:
selector y textos «Reporte de la jornada». `esquema.json`: `corte_jornada` en plantaciones;
`jornada_n` y `primer_registro_id` en cierres; MAPEO y diccionario al día. Pruebas: 14 nuevas
(tres sitios → tres jornadas, conciliación propia, llave del cierre, unir y deshacer, separar a
mano y su rastro, selector en Reportes, cierre y vista previa de la jornada 2, nombre `_J2`,
tarjeta con el sitio del cierre); se adaptan las del cierre y el coordinador.

**Verificación:** 388 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.41.

## Bloque 61 — Galería de fotografías y cierre sin «Actividades» (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.42.

**Qué cambió (D118).** Nuevo `js/galeria.js` (filtros, rejilla, foto grande, descarga, ZIP en modo
almacenar con CRC-32). `permisos.js`: `galeria`. `app.js`: sección, pestaña y candado. `iconos.js`:
`descargar`. `index.html`: vista, diálogo de foto, pestaña «Fotografías»; sale «Actividades
realizadas». `reportes.js`: CAMPOS sin `actividades`, ni en vista previa ni en PDF. `esquema.json`,
MAPEO y diccionario al día. Estilos de rejilla y foto grande. Pruebas: 8 nuevas (galería del
coordinador, cuenta y peso, foto grande con datos, descarga con nombre legible, «Ver registro»,
ZIP válido con JPEG, el cabo sin galería, cierre sin «Actividades»); `revisar.py` revisa la galería.

**Verificación:** 396 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.42.

## Bloque 62 — La jornada se declara antes de registrar (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.43.

**Qué cambió (D119).** Nuevo `js/jornada-activa.js` (inicio, franja, cambiar, cerrar, reabrir,
aviso de otro día, salvaguarda de distancia). `almacen.js`: base versión 2 con tabla `jornadas`,
sin `cierres`. `config.js`: sello de datos nuevo (arranque en blanco). `formulario.js`: fecha
heredada y oculta, `jornada_id`, comprobación de distancia, fila «Jornada» en la revisión.
`jornadas.js`: lee la tabla, «Mover a otra jornada», «Cerrar/Reabrir» en la revisión,
comentarios. `reportes.js`: jornadas por nombre, cierre en la jornada, «Jornada:» y «Comentarios
de la jornada» en vista previa y PDF, sin «Sitio». `registros.js` y `galeria.js`: fila «Jornada».
`espejo.js`, `esquema.json`, MAPEO y diccionario al día. `index.html`: panel «Iniciar jornada»,
franja, diálogos de cambiar y mover. Pruebas: 12 nuevas o reescritas (inicio con validación,
franja, fecha heredada, tres jornadas declaradas, mover con historial, reabrir/cerrar, selector
por nombre, cierre y reporte de la jornada); `revisar.py` inicia una jornada para revisar el
formulario.

**Verificación:** 402 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.43.

## Bloque 63 — Inicio de jornada: bloqueo real, «Hoy», ubicación y programa en lista (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.44.

**Qué cambió (D120).** `estilos.css`: `[hidden]` con `!important`; bloque duplicado del envío
retirado. `jornada-activa.js`: `exigir()`, «Hoy», fecha vacía al abrir, campo `ubicacion`, franja
con ubicación. `formulario.js`: ubicación y envío exigen jornada; `MAX_BOTONES_PROGRAMA` en 0
(lista desplegable). `reportes.js`: ubicación junto al nombre en vista previa y PDF. `index.html`:
«Hoy», texto guía y campo de ubicación. `espejo.js`, `esquema.json`, MAPEO y diccionario al día.
Pruebas: fecha vacía y «Hoy», ubicación guardada y en la franja, bloqueo del formulario sin
jornada (incluida la regla de computadora), programa en lista.

**Verificación:** 404 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.44.

## Bloque 64 — Colores de la revisión de jornada (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.45.

**Qué cambió (D121).** `jornadas.js`: botones de contorno por significado, iconos del pie,
«Cerrar/Reabrir» en guinda/dorado, corrección de la llamada a iconos. `jornada-activa.js`:
«Cerrar jornada» con candado en guinda. `app.js`: `confirmar()` pinta en guinda con candado.
`index.html`: texto guía «Cantidad». `estilos.css`: `.btn-exito-linea`, `.btn-peligro-linea`,
acciones del punto en segundo renglón en teléfono. Pruebas: clases y colores de los botones.

**Verificación:** 404 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.45.

## Bloque 65 — Ubicación de la jornada y ficha de revisión (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.46.

**Qué cambió (D122, D123).** `index.html`: botón «Detectar ubicación de la jornada», aviso y
datos de lectura Alcaldía/Colonia antes del campo de ubicación. `jornada-activa.js`:
`detectarUbicacion()`, `pintarDetectar()`, `lugarDe(j)`; la jornada guarda punto, precisión,
alcaldía y colonia; «Cambiar de jornada». `jornadas.js`, `reportes.js`: alcaldía y colonia de la
jornada en la lista, el detalle y el reporte. `referencias.js`: `especieDe` devuelve
`distribucion`. `formulario.js`: Folio bajo la Fotografía; distribución en la fila Especie.
`esquema.json`, `espejo.js`, `auditoria.py`: siete campos nuevos de jornadas; diccionario
regenerado. `estilos.css`: aviso de detección y línea de distribución. Pruebas: orden del botón,
detección con alcaldía y colonia, campo de texto intacto, campos nulos sin detección, ficha.

**Verificación:** 411 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.46.

## Bloque 66 — Sistema de botones (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.47.

**Qué cambió (D124, D125).** `estilos.css`: tokens `--acento`, `--acento-oscuro`, `--acento-suave`,
`--editar-borde`, `--neutro-borde`, `--neutro-fondo`, `--radio-pildora`; nuevos valores de verde,
rojo y ámbar; `btn-primario` pizarra, `btn-secundario` gris, `btn-editar` ámbar claro,
`btn-texto` sin subrayado, `.volver` con chevron, `.dialogo-cerrar` en círculo, tuerca con borde,
chips píldora con activo relleno, pestaña activa en acento, `.menu-editar`; franja de jornada con
acciones a todo lo ancho en teléfono. `index.html`: clases de «Enviar ahora», «Quitar foto»,
«Aplicar», «Mostrar más», «Corregir datos de cierre», «Hoy»/«Ahora» compactos, «Cerrar sesión»
en rojo. `app.js`: iconos de once botones fijos; Guardar con disco. `formulario.js`: «Editar» de
la ficha con lápiz. `iconos.js`: `menu-editar`. `catalogos.js`, `usuarios.js`: icono en
Desactivar/Activar. `jornadas.js`: el filtro se ajusta a la jornada que se cierra. Pruebas:
colores nuevos, D124 (acento, radio, píldoras, apoyo, volver) y D125.

**Verificación:** 413 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.47.

## Bloque 67 — Folio previsto en la ficha de revisión (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.48.

**Qué cambió (D126).** `folio.js`: `previsto(registro)`. `formulario.js`: `revisar()` asíncrono;
filas Fotografía, Folio (previsto o PROVISIONAL), Cabo; sin bloque «Datos del sistema». Pruebas:
el identificador se lee del estado, folio previsto con patrón y sin gastar secuencia, orden final.

**Verificación:** 411 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.48.

## Bloque 68 — Aviso «Registro guardado» (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.49.

**Qué cambió (D127).** `index.html`: el aviso lleva especie, lista de datos y línea de envío.
`formulario.js`: `pintarDatosGuardado()`; `enviarTrasGuardar` actualiza `#dlg-guardado-folio` y
pinta el envío con icono. `estilos.css`: `.guardado-especie`, `.guardado-datos`,
`.guardado-envio`. Pruebas: orden de datos, sin identificador, insignia de precisión, folio.

**Verificación:** 412 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.49.

## Bloque 69 — Fichas y filtros de Jornadas (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.50.

**Qué cambió (D128).** `index.html`: atajos Todas/Hoy/Un día/Un periodo, Desde/Hasta + Aplicar,
acordeón «Más filtros» con año, mes y cabo. `jornadas.js`: filtro con dia/desde/hasta/anio/mes/
cabo, `cumpleFiltro`, `llenarAnios/llenarMeses`, `cuando()`, `lugarDe()`, ficha nueva,
`miniatura(j, avisos)` con tono por aviso, total con árboles; D125 ajusta también el rango.
`estilos.css`: ficha (`.jornada-cab`, `.jornada-estatus`, `.jornada-cifras`…), `.chips-cuatro`,
`.acordeon-filtros`; chip activo oscuro bajo el cursor. Pruebas: orden de atajos, acordeón, orden y
contenido de la ficha, colores de estado, rango, año y mes.

**Verificación:** 420 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.50.

## Bloque 70 — «Más filtros» en Registros (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.51.

**Qué cambió (D129).** `index.html`: atajos Todos/Hoy/Un día/Un periodo y acordeón con año, mes y
cabo en Registros. `registros.js`: `sincronizarControles` pinta el resumen del acordeón y lo
esconde cuando no aplica. Pruebas: orden de atajos, acordeón, cabo dentro del acordeón.

**Verificación:** 421 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.51.

## Bloque 71 — Guardar en un toque (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.52.

**Qué cambió (D130).** `index.html`: Programa en «Iniciar jornada», franja `#franja-guardado`,
`#especies-recientes`, `#revision-avisos`; sin `dlg-guardado`. `formulario.js`:
`enviarFormulario()`, `avisos()`, `revisar(avisos)`, `mostrarGuardado` como franja,
`enviarTrasGuardar` sobre la franja, `pintarEspeciesRecientes()`, `heredarPrograma()`;
`guardar` sin la pregunta de distancia. `jornada-activa.js`: `llenarProgramas()`, programa en la
jornada y en la franja; `preparar` hereda programa y pinta especies; `confirmarDistancia`
retirado. `app.js`: comprobación de `franja-guardado`. `estilos.css`: franja, avisos, chips
recientes. `esquema.json`, `espejo.js`, `auditoria.py`, `MAPEO-CAMPOS.md`, diccionario:
`jornadas.programa_id`. Pruebas: programa obligatorio en la jornada y heredado; ficha sólo con
aviso (precisión ±40 m); franja de guardado con envío y folio; especies recientes; ayudantes
`iniciar_jornada` y `registrar` al flujo nuevo.

**Verificación:** 422 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.52.

## Bloque 72 — Meta de la jornada, panel de jornada y reportes cerrados (23-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.53.

**Qué cambió (D131).** `index.html`: campo «Árboles que se van a plantar»; panel de jornada con
rótulo y la franja de guardado dentro; título «Nuevo árbol»; conciliación con cifras y sin campo.
`jornada-activa.js`: meta obligatoria; franja con «n de meta»; rótulo; título del formulario.
`jornadas.js`: `metaDe()`, `estado()` con meta y estatus, cinco cifras, candado abierto,
conciliación sin campo (en curso/falta/sobra), «Reporte de la jornada» sólo cerrada; se retira
`guardarConteo`. `reportes.js`: botón deshabilitado y nota con la jornada abierta; texto de la
meta. `iconos.js`: `candadoAbierto`. `estilos.css`: panel, rótulo, título, seis columnas de
cifras, conciliación. `esquema.json`, `espejo.js`, `auditoria.py`, `MAPEO-CAMPOS.md`, diccionario:
`meta_arboles` en lugar de `arboles_plantados`. Pruebas: meta obligatoria y en la franja, panel y
título, conciliación con meta, cifras y candados, reporte bloqueado con jornada abierta.

**Verificación:** 425 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.53.

## Bloque 73 — Editar y eliminar jornada; programa heredado sin preguntar (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.54.

**Qué cambió (D132).** `index.html`: acciones de la ficha (estado, editar, eliminar) y
`dlg-editar-jornada`. `jornadas.js`: `abrirEditar`, `guardarEdicion` (herencia de fecha a los
árboles), `eliminarJornada`, permisos con `puedeEditar`. `formulario.js`: `heredarPrograma` oculta
`#caja-programa`; al editar se muestra. `estilos.css`: `.jornada-acciones-cab`. Pruebas: edición
con validación y herencia de fecha, eliminación de jornada vacía, campo de programa oculto;
ayudante `registrar` fija el programa en el dato; la prueba de eliminar elige un registro sin foto.

**Verificación:** 434 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.54.

## Bloque 74 — Salvaguardas de campo (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.55.

**Qué cambió (D133).** `app.js`: confirmación al salir con un árbol a medias. `formulario.js`:
`aMedias()`, confirmación de jornada de otro día antes de guardar. `jornada-activa.js`:
`textoCierre()` con pendientes y meta, aviso con acción al entrar, `confirmarOtroDia()`, `reabrir`
sólo activa si es propia. `jornadas.js`: cerrar/reabrir para quien alcanza la jornada, mismo texto
de cierre. `estilos.css`: el aviso flotante envuelve su acción. Pruebas: texto de cierre, confirmar
en jornada de otro día, salir con árbol a medias, coordinador cierra/reabre; ayudante `registrar`
atiende la confirmación y devuelve el id guardado.

**Verificación:** 443 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.55.

## Bloque 75 — Reportes por jornada cerrada y jornada en la tarjeta (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.56.

**Qué cambió (D134).** `index.html`: Reportes con atajos, cabo y `#pdf-lista`; sin día/selector/
botón únicos. `reportes.js`: `filtro`, `aplicarAtajo`, `pintarLista`, `preparar` con el pedido
directo al cierre; `reporte_en` al aceptar. `jornadas.js`: `irAlReporte` sin fecha. `registros.js`:
nombre de la jornada en la tarjeta. `app.js`: sin `btn-pdf`. `estilos.css`: `.reporte-ficha`,
`.registro-jornada`. `esquema.json`, `espejo.js`, `auditoria.py`, `MAPEO-CAMPOS.md`, diccionario:
`reporte_en`. Pruebas: lista de cerradas, atajos, un día, ficha con «Volver a generar», llegada
directa desde Jornadas, filtro por cabo; ayudante `reporte_de`.

**Verificación:** 448 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.56.

## Bloque 76 — Fotografías por jornada y saltos del PDF (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.57.

**Qué cambió (D135).** `index.html`: lista «Jornada» en la galería y atajos en orden común.
`galeria.js`: `filtro.jornada`, `llenarJornadas`, pie con la jornada, ZIP con nombre y fecha.
`reportes.js`: regla de salto de página ajustada al pie. `estilos.css`: `.galeria-jornada`.
Pruebas: orden de atajos, lista de jornadas, filtro y ZIP por jornada, limpieza al cambiar de día.

**Verificación:** 453 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.57.

## Bloque 77 — Notificaciones y espera (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.58.

**Qué cambió (D136).** `util.js`: `anunciar()` con tono «aviso», duración por largo del texto y
pausa con el puntero encima. `estilos.css`: `--aviso-aviso` y su filete e icono. Tono «aviso» en
`app.js`, `envio.js`, `jornada-activa.js` y `jornadas.js` (cinco mensajes informativos).
`formulario.js`: «Guardando…», aria-busy y candado contra doble toque en `enviarFormulario()` y
`guardar()`. `envio.js`: `conBoton()` para «Enviando…». `galeria.js`: «Armando…» y un cuadro
cedido antes del ZIP. `reportes.js`: «Generando reporte…» con aria-busy en la vista principal.
Pruebas: tonos, duración corta y larga, pausa con el puntero, doble toque (un solo árbol),
aria-busy del PDF, del ZIP y de «Enviar ahora».

**Verificación:** 471 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.58.

## Bloque 78 — Logotipo con el SIA (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.59.

**Qué cambió (D137).** Logotipo nuevo armado con piezas oficiales: el de Reforestación Urbana
(`assets/fuentes/logo-reforestacion-urbana/ru_color.png`) y el bloque del SIA (emblema y sigla) del
logotipo institucional `SIA_LOGO-07.png` (Drive del SIA), a la misma escala (escudo CDMX de igual
ancho), con la sigla alineada a «Secretaría del» y los filetes del original. Fuente en alta:
`assets/fuentes/logo-reforestacion-urbana/logo_sedema_sia_ru_color.png` (2963 × 263). Web:
`assets/encabezado-ru-sia.png` (1762 × 144, encabezado y PDF) y `assets/encabezado-ru-sia-movil.png`
(1114 × 228, SIA · Reforestación Urbana). `index.html`: rutas, texto alternativo y corte del
`<picture>` de 480 a 767 px (entre 481 y 767 px el completo quedaba de 17 a 27 px de alto).
`reportes.js`: el logotipo del PDF se fija por su alto (9.3 mm, el que tenía) y no por su ancho;
pasa de 90 a 114 mm de ancho. Los PNG anteriores, a `_to_delete/`.

**Verificación:** 471 comprobaciones sin errores de consola (en una corrida previa falló «aria-busy
se quita al terminar», que espera fija 1.5 s; falla igual con la 0.6.58 en el mismo equipo: es de
tiempo, no de este bloque). 85 de auditoría; presentación sin desbordes en ocho
combinaciones. Alto del logotipo medido: 24 px a 360, 30 px a 390, 40 px de 481 en adelante. PDF
revisado a la vista. Marca de versión 0.6.59.

## Bloque 79 — Pasos de la jornada (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.60.

**Qué cambió (D138).** `jornadas.js`: `PASOS`, `pasos()`, `htmlPasos()`, `siguiente()`,
`avisarCierre()`, `pintarPasos()`, `enfocarSiguiente()`, `irAPendiente()`, `cambiarEstado()`; el
aviso de «Está bien» dice qué sigue. `jornada-activa.js`: tira en el panel, «Meta cumplida…
Siguiente: cerrar», `pintarBotonIniciar()` y aviso al llegar a la ficha tras cerrar. `reportes.js`:
cierre del ciclo en el aviso del PDF y repintado de la lista. `index.html`: `#franja-pasos`,
`#franja-siguiente`, `#jornada-pasos`, `#jornada-siguiente`, `#btn-jornada-siguiente`.
`estilos.css`: `.pasos`, `.paso`, `.pasos-siguiente`, orden de la barra y mapas aislados.
Pruebas: botón con fecha de otro día, tira en cada paso, barra y foco tras cerrar, reabrir con
meta cumplida, duplicado a propósito para «Revisar puntos», ciclo completo hasta «Jornada
completa», mapa sin tapar la barra. La prueba de aria-busy del PDF ya no espera 1.5 s fijos: espera a
que termine (hasta 8 s), lo que resuelve la falla intermitente anotada en el Bloque 78.
Se trabajó en paralelo al Bloque 78 (logotipo con el SIA, otra sesión): nació como «78» y se
renumeró a 79 / D138 / 0.6.60, fusionado a tres vías sobre el 78 sin tocar sus cambios.

**Verificación:** 500 comprobaciones sin errores de consola; 85 de auditoría; presentación sin
desbordes en ocho combinaciones. Marca de versión 0.6.60.

## Bloque 80 — Confirmaciones (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.61.

**Qué cambió (D139).** `index.html`: `#dlg-confirmar` con título, pregunta, encabezado y lista de
viñetas, y nota. `app.js`: `confirmar()` acepta la forma estructurada; restablecer y descartar el
árbol la usan. `formulario.js`: `resumenAMedias()`. `jornada-activa.js`: `confirmacionCierre()`
(antes `textoCierre`) y la de otro día. `jornadas.js`: cerrar y eliminar jornada. `registros.js`:
eliminar sin confirmar, con el aviso que nombra el registro. `catalogos.js` y `usuarios.js`:
desactivar sin confirmar; eliminar, estructurado. `estilos.css`: `.confirmar-*`.
Pruebas: estructura y foco del diálogo, pendientes en viñetas, lo que se pierde al descartar,
restablecer con números y «Cancelar» sin efecto, forma corta, eliminar y desactivar sin diálogo
con «Deshacer», y que registros, catálogo y cuentas sólo confirmen al eliminar.

**Verificación:** 510 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.61.

## Bloque 81 — Campos (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.62.

**Qué cambió (D140).** `util.js`: `erroresEnCampos()`, `quitarErrorCampo()`,
`iniciarContadores()`, `pintarContador()`, `refrescarContadores()`. `app.js`: contadores al iniciar
y el error de un campo se quita al corregirlo; el acceso usa la función común. `formulario.js`,
`jornada-activa.js`, `jornadas.js`, `usuarios.js`, `catalogos.js`: la usan en su validación y al
limpiar; «Hoy» y la especie quitan su error. `mapa.js`: tomar la ubicación quita el suyo.
`index.html`: ayudas de meta y ubicación, «Hoy» en Editar jornada y meta y fecha en renglones
propios. `estilos.css`: `.campo-error`, `.ayuda-campo`, `.contador`. A pedido de Liber, el espejo
«Campos que viajan a la base y no se ven en pantalla» de Nuevo registro sale plegado, como los del
detalle y el cierre.
Pruebas: error bajo cada campo con icono y aria-describedby, igual al resumen; se quita al
corregir; ayudas enlazadas; contador oculto, visible y lleno; errores del árbol bajo el botón de
ubicación y la especie; «Hoy» en Editar jornada; errores limpios al reabrir el diálogo.

**Verificación:** 526 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.62.

## Bloque 82 — Tarjetas, secciones e iconos (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.63.

**Qué cambió (D141).** `iconos.js`: `TAMANOS`, `tamano()`, iconos `intercambio` y `reloj`; 56
llamadas pasan de números a chico/medio/grande. `util.js`: `htmlVacio()`. `registros.js`: tarjeta
con `.registro-meta` (fecha y estado) y lugar con icono; `htmlEstado()`; el vacío usa el patrón
común. `reportes.js`: tarjeta con estado, lugar y cifras; `#pdf-vacio` con «Ir a Jornadas».
`jornadas.js`: `iconoTono()`, icono en la etiqueta y en la conciliación, saltos de sección, cuenta
de puntos, vacío con salida y etiquetas cortas de la barra. `galeria.js`: vacío con salida.
`jornada-activa.js`: «Cambiar» con intercambio. `index.html`: subtítulos y `#jornada-saltos`,
`#pdf-vacio`. `estilos.css`: `.etiqueta`, `.registro-meta`, `.saltos`, `.titulo-seccion`, tarjeta
de Reportes en columna, menos aire en botones de barra y hover en acento.
Pruebas: tres tamaños de icono en cinco vistas, subtítulos, barra de saltos (teléfono sí,
computadora no) y su foco, iconos de resultado, botones de la barra en un renglón a 360 px,
anatomía de Registros y Reportes, «Cambiar» con intercambio, vacíos con salida en Jornadas,
Reportes y Fotografías.

**Verificación:** 542 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.63.

## Bloque 83 — Tablas y accesibilidad (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.64.

**Qué cambió (D142).** `formulario.js`: Ctrl/⌘+Enter guarda o confirma la ficha; 1–3 eligen las
especies recientes con el buscador vacío; `data-n` en las recientes. `index.html`: pista de atajos
y `aria-keyshortcuts` en Guardar. `catalogos.js` y `usuarios.js`: cuenta de inactivos.
`estilos.css`: columna ordenada en acento, pista de atajos sólo con puntero fino, modo sol en
etiquetas, cifras, pasos y avisos.
Pruebas: encabezado fijo al desplazar la tabla de especies, columna ordenada en acento, cuentas
con inactivos, modo sol en etiquetas y cifras, «1» elige la reciente sin escribirse, Ctrl+Enter
guarda y confirma la ficha de revisión, números normales con texto en el buscador, «Guardar»
vuelve en seguida con el envío en curso (`formulario.js`: el envío tras guardar ya no se espera).
Cierra el plan de la auditoría UX/UI (bloques 77–83).

**Verificación:** 553 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.64.

## Bloque 84 — Registrar jornada (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.65.

**Qué cambió (D143).** `index.html`: título «Registrar jornada», introducción nueva, sin la línea
de obligatorios, ayuda del nombre, «Capturar coordenadas a mano» en el panel y «Dirección de la
jornada» en el panel y en Editar jornada. `jornada-activa.js`: `aplicarCoordenadas()`, origen del
punto, desplegable abierto si el GPS falla, limpieza al volver al panel y `punto_origen` al guardar.
`esquema.json` (2026-09-24): `jornadas.punto_origen` y reglas de lat/lng/precisión y dirección;
`DICCIONARIO-DATOS.md` regenerado; `MAPEO-CAMPOS.md`, `espejo.js` y `auditoria.py` al día.
Pruebas: título, introducción, ayuda y etiqueta; coordenadas inválidas, fuera de la CDMX y válidas
(con coma decimal); la jornada guarda `manual` sin precisión; GPS guarda `gps`; sin permiso se abre
el desplegable; espejo del cierre con veintiséis campos.

**Verificación:** 563 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.65.

## Bloque 85 — Revisión de la ficha de la jornada (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.66.

**Qué cambió (D144).** `jornadas.js`: concordancia de la conciliación y candado abierto en
«Reabrir jornada». `conexion.js`, `usuarios.js`, `reportes.js`: singulares en el respaldo, el aviso
de cuenta con registros, el croquis y la meta del reporte. `estilos.css`: sin el margen de
`#btn-jornada-estado`.
Pruebas: jornada cerrada con un punto de precisión baja (la de la captura): conciliación en
singular, botones a la misma altura, candado en «Reabrir», meta de 1 árbol en el reporte. La
prueba de «Guardar» deshabilitado al enviar lee el estado en el mismo instante (era intermitente
desde que el guardado ya no espera al envío).

**Verificación:** 567 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.66.

## Bloque 86 — Sistema de ancho en tableta y computadora (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.67.

**Qué cambió (D145).** Revisión de las nueve vistas a 390, 820, 1366 y 1440 px, con capturas de
antes y después. `estilos.css`: nada se centra por su cuenta (panel de jornada, franja y «Nuevo
árbol» arrancan en el borde de la vista); el rótulo «Jornada activa» va solo en su renglón; bloque
nuevo «Sistema de ancho» (601 px en adelante): franja de la jornada en rejilla con botones a la
derecha sin partirse; vistas de formulario y lectura a todo lo ancho con ayudas de 62 caracteres;
en computadora «Registrar jornada» en dos columnas, ficha de la jornada con mapa fijo a la
izquierda y lista a la derecha, pasos y botones en un renglón, barra del pie en un renglón,
tarjetas de dos en dos en Jornadas, Registros y Reportes, entrada con tarjetas lado a lado,
miniaturas de Fotografías algo mayores y «Guardar» a lo ancho de su columna. Se quita el centrado
de Reportes (D109) y la pista de atajos con los números de las recientes. `index.html`: columnas
`ini-col-lugar`/`ini-col-plan` en el formulario de la jornada y `ficha-cuerpo` con
`ficha-col-mapa`/`ficha-col-lista` en la ficha (en teléfono no se notan); sin `.atajo-pista`.
`formulario.js`: sin el atajo 1-2-3 ni `data-n`; Ctrl+Enter se queda. `jornadas.js`: el encuadre del
mapa de la ficha deja margen bajo los botones de acercar.
Pruebas: ficha en una columna en teléfono y en dos en computadora (mapa fijo, pasos y botones en un
renglón, barra en un renglón); mismo borde izquierdo en Jornadas, Registros y Reportes; listas de
dos columnas a todo lo ancho en computadora y de una en teléfono; panel de la jornada activa a 820
y 1280 px (rótulo solo, «Cerrar jornada» en una línea a la derecha, panel, título y formulario en
el mismo borde); «Guardar» a lo ancho; «Registrar jornada» en dos columnas en computadora y en una
en teléfono; ningún punto bajo los botones de acercar; sin pista ni atajo numérico. La prueba de
Reportes centrado (D109) pasa a comprobar que arranca en el borde, como las demás.

**Verificación:** 579 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.67.

## Bloque 87 — Los pasos de la jornada, como indicador de avance (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.68.

**Qué cambió (D146).** `jornadas.js`: `htmlPasos()` arma cada paso con su círculo (`.paso-marca`,
con palomita si está hecho) y su nombre (`.paso-texto`); el número sale de un contador de la hoja
de estilos. `estilos.css`: fuera las píldoras; círculos, tramos entre pasos, nombre debajo, estados
hecho/actual/pendiente, tamaños del panel y de la ficha, tope de 30rem y modo sol.
Pruebas: con un estado fijo (dos hechos, «Revisar» actual) se comprueba que son círculos en un
renglón con el nombre debajo y sin borde de píldora; el actual en acento, los hechos con palomita,
el pendiente con su número; tramos verdes después de un paso hecho y gris después del actual; el
lector de pantalla no oye los números.

**Verificación:** 583 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.68.

## Bloque 88 — «Hoy» con el año en dos cifras y «Regenerar reporte» (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.69.

**Qué cambió (D147, D148).** `util.js`: `pintarChipHoy(el)` pinta el atajo con la fecha corta
(«24-SEP-26») y la coma oculta para el lector de pantalla. `registros.js`, `jornadas.js`,
`reportes.js` y `galeria.js` lo usan en lugar de repetir el mismo HTML cuatro veces. `estilos.css`:
la fecha del atajo no se parte y la fila de cuatro atajos lleva menos relleno lateral.
`reportes.js`: «Volver a generar» pasa a «Regenerar reporte». `iconos.js`: icono `regenerar` (flecha
en círculo), que reemplaza al lápiz en Reportes y en «Regenerar PDF» de la ficha (`jornadas.js`).
Pruebas: el atajo de Registros dice «Hoy, 24-SEP-26»; en Registros, Jornadas y Reportes la fecha
cabe en un renglón a 390 px; `formatearFecha` sigue dando el año completo. «Regenerar reporte» en
ámbar, con la flecha y sin lápiz; «Regenerar PDF» de la ficha con la flecha.

**Verificación:** 586 comprobaciones sin fallas; en consola, sólo una tesela de Esri que la red de la
sesión de pruebas bloqueó (ajeno al código); 85 de auditoría; presentación sin desbordes en ocho
combinaciones. Marca de versión 0.6.69.

## Bloque 89 — Blindaje de los datos en el teléfono (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.70.

**Qué cambió (D149).** `almacen.js`: `sembrarSiVacio()` devuelve qué hizo (`sembrado`, `igual`,
`resembrado`, `conservado`) y nunca vacía la base si hay capturas; `rehacerConservando()` y
`leerTodo()` rehacen la base sin perder renglones; `vigilarVersion()` y `onblocked`;
`cuidarAlmacenamiento()` (persistencia y aviso de espacio) y `estadoAlmacenamiento()`; comentarios
del encabezado al día (nombraban `ESTRUCTURA_VERSION`, que no existe). `util.js`: `mensajeError`,
`avisarError`, `proteger` y `redDeSeguridad`. Las acciones que escriben en `catalogos`, `usuarios`,
`jornada-activa`, `jornadas`, `registros`, `reportes`, `conexion` y `folio` se declaran protegidas al
final de cada módulo. `formulario.js`: mensaje de error veraz al guardar, `pintarEnvio()` y
persistencia tras guardar. `conexion.js`: estado del teléfono en la guía, fecha y resultado real
del respaldo, sugerencia de instalar en iPhone, registro del service worker que ya no se calla.
`jornada-activa.js`: recordatorio del respaldo al cerrar. `reportes.js`: el PDF que falla se avisa.
`app.js`: red de seguridad, avisos de arranque y la × de «Guardado» sin error. `sw.js`: la copia
guardada gana a un error del servidor. `foto.js`: pesos en GB. `index.html` y `estilos.css`: el
bloque de estado de la guía. `config.js`: `CLAVE_ULTIMO_RESPALDO`. `esquema.json`: versión 2 de la
base, regla de arranque nueva y las cinco claves de localStorage que faltaban declarar;
`DICCIONARIO-DATOS.md` regenerado. `README.md`: la sección del sello describe la regla nueva.
Pruebas: sello nuevo y sello perdido con capturas conservan árboles, jornadas y cuentas; una base
de versión posterior se rehace conservando y lo avisa; un teléfono sin capturas sí recarga los
datos de ejemplo; `persist()` se pide al guardar; la guía dice protección, espacio, arranque sin
señal y «Hace 3 días»; la confirmación de cierre recuerda el respaldo; cancelar el respaldo no
dice «guardado»; espacio lleno en una acción y al guardar un árbol; las 19 acciones protegidas; el
PDF que falla; la red de seguridad; la × de «Guardado».

**Verificación:** 601 comprobaciones sin errores de consola; 85 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.70.

## Bloque 90 — Respaldo seguro (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.71.

**Qué cambió (D150).** `index.html`: política de seguridad (CSP) y `referrer`; carga de
`js/esquema.js` y `js/validar.js`. `util.js`: `fotoSegura()`. Ids escapados en los atributos de
`app.js`, `catalogos.js`, `formulario.js`, `galeria.js`, `jornada-activa.js`, `jornadas.js`
(también `CSS.escape` en dos selectores), `registros.js`, `reportes.js` y `usuarios.js`; años y
meses de los filtros escapados; fotos validadas en Registros, Fotografías, la ficha de revisión y
la edición. `validar.js` (nuevo): tipos, obligatorios, dominios, referencias y reglas del ámbito,
la foto y datos reales contra de prueba; el resumen nombra el árbol por su folio y la referencia rota
en palabras. `esquema.js` (nuevo, generado). `generar_diccionario.py`:
`generar_js()`; `auditoria.py`: comprueba que `js/esquema.js` esté regenerado. `conexion.js`:
respaldo del alcance con aviso de datos personales; restauración validada, del alcance, con
confirmación, en una transacción y con renglón RESTAURADO; restaurar sólo se conecta en modo de
prueba; «(simulado)» en la pastilla. `envio.js`: «servidor simulado» en la guía. `sesion.js`: el
acceso simulado se cierra sin `ES_FICTICIO`; comentarios al día. `app.js`: restablecer sólo en
modo de prueba; `ESQUEMA` y `validar` en la revisión de arranque. `config.js`: `RESPALDO_MAX_MB`
y la advertencia del dominio del mapa. `esquema.json`: dominio `estatus_jornada`, relación de
`jornadas.programa_id`, respaldo y regla R-D02 nuevos; `DICCIONARIO-DATOS.md` regenerado.
`README.md`: estructura, base del dispositivo, sin señal, cómo correr las pruebas (quita dos
archivos de prueba que no existían) y lista de salida a producción.
Pruebas: la política de seguridad está declarada; un respaldo alterado con seis renglones malos
(fuera de la CDMX, otra cuadrilla, especie inexistente, foto que no es imagen, id con código,
estatus inventado) y una cuenta de administración intrusa sólo deja entrar el árbol y la jornada
válidos, con su RESTAURADO y sin ejecutar nada; un id y una foto con código ya guardados se pintan
como texto; un respaldo real no se mezcla con los de prueba; con `ES_FICTICIO` apagado el acceso
simulado no abre. Se ajustaron la prueba del respaldo (sólo el alcance, sin cuentas ni catálogos)
y la de restaurar (confirmación y alcance de quien restaura). `auditoria.py` revisa además que ni
la página ni el HTML que arma el código traigan estilos o manejadores en línea. Las esperas de
`prueba.py` preguntan desde fuera (`esperar()`): `wait_for_function` de Playwright se compila con
eval y la política la bloquea, lo que dejaba sin esperar al croquis y al PDF.

**Verificación:** 609 comprobaciones sin errores de consola; 87 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.71.

## Bloque 91 — Integridad de los datos (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.72.

**Qué cambió (D151).** `referencias.js`: `usosDe()`, `totalUsos()` y `textoUsos()`, leídos de las
relaciones del esquema. `permisos.js`: `eliminarJornadaVacia` en los tres perfiles (la coordinación
elimina jornadas vacías, decisión D1), `ACCIONES`, `puede()` y `exigir()`. `almacen.js`:
`guardarJuntos()`, varios cambios en una transacción. `catalogos.js` y `usuarios.js`: el uso se
cuenta en todas las tablas y se dice en palabras; permiso exigido al guardar, cambiar el estado y
eliminar; nadie se desactiva ni se elimina a sí mismo. `jornadas.js`: la edición propaga fecha y
programa a todos los árboles, también los eliminados, en la misma transacción (decisión D2);
`mover()` da fecha y programa de la jornada nueva, quita la marca de revisado de la de origen y
sólo acepta jornadas del mismo cabo; «Eliminar jornada» sólo sin ningún árbol, ni eliminado;
permisos exigidos al cerrar, reabrir, editar, revisar y eliminar. `registros.js`: permisos al
eliminar y restaurar; restaurar parte del renglón actual y lo devuelve con los datos de su
jornada. `jornada-activa.js`: permisos al iniciar, cerrar y reabrir; `cambiarEstatus()` y
`reabrir()` dicen si se hizo. `formulario.js` e `index.html`: sin campo de programa en el árbol
(`programaDeJornada()`); la ficha de revisión dice «El de la jornada»; permiso al guardar.
`reportes.js` y `galeria.js`: permiso al guardar el cierre y al armar el ZIP. `util.js` y `envio.js`:
el aviso del envío automático ya no tapa uno con «Deshacer». `usuarios.js`: la tarjeta del cabo dice «coordinador: …» (decía
«coordina …») y la del coordinador, «coordina a N cabos». `index.html`: notas de Catálogos y
Usuarios con la regla de uso nueva. `conexion.js`: el árbol
que entra por respaldo toma fecha y programa de su jornada. `index.html`: aviso de que el programa
se propaga al editar la jornada. `estilos.css`: `.revision-sub`. `esquema.json`: relaciones de
`jornadas.programa_id` y `jornadas.puntos_revisados`, reglas R-J01 y R-J02, R-P03, R-A01, R-U04,
R-C03, S-03 y S-04 al día, orígenes declarados; `DICCIONARIO-DATOS.md` regenerado. `MAPEO-CAMPOS.md`
y `README.md` al día.
Pruebas: revisión de integridad sobre todo lo capturado en la prueba principal (referencias,
fecha y programa iguales a los de la jornada, marcas de revisado); en una base nueva, cambiar el
programa y la fecha de una jornada los cambia en sus tres árboles, también el eliminado, con su
historial; restaurar devuelve el árbol con los datos actuales de su jornada; mover le da los de la
jornada nueva, quita su marca de revisado y no acepta la jornada de otro cabo; una jornada con un
árbol eliminado no se borra ni llamando la función; un cabo no desactiva un programa ni la cuenta
de administración, y un coordinador no elimina un registro, llamando las funciones; la
coordinación elimina una jornada vacía de su cuadrilla; un programa usado sólo por una jornada y
un coordinador con un cabo no se eliminan y el aviso dice por qué. Se ajustaron las pruebas del
programa en el formulario (ya no existe el campo) y el ayudante `registrar()` inicia otra jornada
cuando el árbol es de otro programa. La prueba del espacio lleno usa una acción que la cuenta de
coordinación sí tiene (cambiar el estado de su jornada): la de catálogos ahora se detiene antes
por falta de permiso.

**Verificación:** 632 comprobaciones sin errores de consola; 89 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.72.

## Bloque 92 — Territorio confiable (24-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.73.

**Qué cambió (D152).** `derivacion.js`: ámbito por la unión de las alcaldías con margen
(`dentroDelAmbito()`, `cercana()`, `distanciaBorde()`), `capasCompletas()`, y `derivar()` devuelve
`fuera_m` y `uga_borde_m`. `config.js`: `MARGEN_AMBITO_M`, `GPS_AFINAR_MS`, `ZOOM_TOQUE`,
`DUPLICADO_M` en 5, créditos de las tres capas y `CREDITO_PROVEEDOR`. `mapa.js`: `ponerCredito()` en
todos los mapas, GPS afinado (`ubicar()` con `watchPosition`, `detenerAfinado()`), `alTocar()` con
zoom mínimo y renglón de avisos `aviso()` separado de la precisión. `jornadas.js`: crédito común.
`formulario.js`: aviso junto al límite, `uga_borde_m`, cinco decimales, «celda incierta» en la
ficha, bitácora del territorio rederivado al editar y fin del afinado al revisar. `jornada-activa.js`:
coordenada redondeada, rechazo fuera de la ciudad y aviso junto al límite. `folio.js`:
`puedeEmitir()` y `celdaIncierta()`; prefijo de celda documentado. `referencias.js`: rótulos «Sin
colonia en la capa» y «Sin alcaldía (territorio pendiente)», `textoCapas()`. `registros.js`: celda
UGA y capas en el detalle, cinco decimales. `reportes.js`: «(simulado)» por renglón y nota de capas
en la vista previa y el PDF. `croquis.js`: crédito completo en renglones. `app.js`: capas exigidas
al arrancar y aviso sin «borre los datos». `index.html` y `estilos.css`: renglón `#mapa-aviso`.
`generar_capas.py`: geometrías válidas tras redondear; `capa-colonias.js` regenerada (nueve
colonias ajustadas; alcaldías y UGA idénticas). `auditoria.py`: geometrías válidas y créditos en
todos los mapas. `esquema.json`: campo `uga_borde_m`, folio, alcaldía, colonia, UGA, reglas R-P01,
R-P07, R-P12, R-P13, R-P14 y S-02, estado de la capa de colonias, orígenes; `DICCIONARIO-DATOS.md`
regenerado. `MAPEO-CAMPOS.md` y `README.md` al día.
Pruebas: Nezahualcóyotl, Huixquilucan, Naucalpan y Ecatepec se rechazan y el Zócalo no; a 39 m del
límite se acepta con la alcaldía más cercana y a 250 m no; los rótulos nuevos; la jornada y el árbol
junto al límite lo dicen; el GPS con ±60 m sigue escuchando, una lectura de ±8 m mueve el punto y
detiene la escucha, y una posterior ya no; un punto puesto a mano no lo mueve el GPS; a zoom 12 el
primer toque acerca y el segundo coloca; el aviso de imagen y la precisión conviven; créditos en el
mapa de captura y en el del detalle; el registro guarda `uga_borde_m`; el detalle dice celda y
capas; «celda incierta»; sin alcaldía o sin capas no hay folio ni `EXT-000`; editar con cambio de
territorio queda en el historial; sin la capa de colonias la app no abre y no sugiere borrar datos;
el reporte dice sus capas y marca cada folio simulado. Los datos de prueba insertados a mano llevan
ahora `capa_version`, como un registro real.

**Verificación:** 659 comprobaciones sin errores de consola; 91 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.73.

## Bloque 94 — Orden del código y los textos, primera parte (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.74.

**Qué cambió (D153).** `app.js`: espejo opcional al arrancar y fuera de la revisión de arranque;
«Quitar filtros»; iconos por nombre. `espejo.js`: instrucciones de retiro corregidas.
`index.html`: clase `franja-cerrar` en la × de la franja «Guardado»; «Registrar árbol»; «Quitar
filtros»; «Datos de cierre de la jornada»; título de primer nivel legible en Nuevo registro; banda
de datos ficticios dentro del encabezado; fecha oculta del árbol sin su botón «Hoy»; marca 0.6.74.
`estilos.css`: `.franja-cerrar` y crédito del mapa legible. `formulario.js`: título legible, sin el
botón «Hoy», comentarios al día. `jornadas.js`: `guardada`, `jornadaGuardada()`,
`guardarEnJornada()`, «dirección» en el aviso, índice por jornada, sin `jornadasDe()`.
`jornada-activa.js`: árboles de la jornada por su índice. `registros.js` y `galeria.js`: «Registrar
árbol», «Ver detalle», «Filtros quitados». `reportes.js`: pie del PDF por jornada. `almacen.js`:
migración 3. `config.js`: `DB_VERSION` 3. `iconos.js` y `extraer_iconos.py`: sin «ayuda».
`conexion.js` y `envio.js`: comentarios al día. `esquema.json`: versión 3 e índices;
`DICCIONARIO-DATOS.md` regenerado. `README.md`: cómo se usa, reporte de la jornada, mapa, base,
lista de salida a producción. `auditoria.py`: etiquetas retiradas.
Pruebas: sin el espejo (archivo, bloques y script) la app abre, registra un árbol, abre su detalle,
los datos de cierre y la vista previa, sin errores; la × de la franja la oculta sin error; título
legible, banda en el encabezado y etiquetas únicas; la base en la versión 3 con sus índices; una
base en la versión 2 sube a la 3 conservando árboles y jornadas. Se ajustaron los textos de las
pruebas que nombraban las etiquetas retiradas.

**Verificación:** 668 comprobaciones sin errores de consola; 92 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.74.

## Bloque 95 — La tuerca, subir al inicio y errores en la jornada (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.75.

**Qué cambió (D154).** `estilos.css`: la tuerca fija ancho y alto (círculo de 48 px) y en el
teléfono va a la orilla derecha de la fila de puntos; botón `btn-subir` flotante, con su borde en
modo sol y su estado al señalar; `html.sin-inercia` para cortar la inercia en pantallas táctiles.
`index.html`: botón «Subir al inicio»; marca 0.6.75. `app.js`: `alInicio()` (salto a la cima que
sobrevive a la inercia del iPhone) en cada cambio de sección; la pestaña actual sube a su inicio;
`iniciarSubir()` (aparece al bajar, se coloca encima de la navegación y de la barra fija, sigue los
cambios de alto de la página y al subir enfoca el título). `jornadas.js`: la ficha y la lista
empiezan arriba; la tuerca del punto ofrece Editar, Mover a otra jornada y Eliminar sin repetir
«Eliminar» de un duplicado. `iconos.js`: flecha «subir». `permisos.js`: la coordinación elimina lo
que capturó ella (`eliminarPropios`), no lo de sus cabos. `esquema.json` (R-A01), `README.md` y
`DICCIONARIO-DATOS.md` al día. `config.js`: Bloque 95.
Pruebas: el botón no se ve arriba; al bajar aparece redondo, encima de la navegación y de la barra
Guardar; al tocarlo sube y enfoca el título; al cambiar de sección desde abajo la nueva empieza
arriba y la pestaña actual sube; la tuerca es un círculo en Registros y en los puntos, alineada a la
derecha; la tuerca del punto lejano ofrece Editar, Mover y Eliminar; eliminarlo lo saca de la
jornada sin salir de la ficha y «Deshacer» lo devuelve; en un duplicado «Eliminar» no se repite;
«Editar» abre el árbol y al cancelar vuelve a la ficha; en la ficha el botón queda encima de la
barra «Siguiente»; la lista de jornadas empieza arriba al volver; la coordinación elimina su propio
árbol y no el del cabo.

**Verificación:** 687 comprobaciones sin errores de consola; 92 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.75.

## Bloque 94b — Estilos y código repetido (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.76.

**Qué cambió (D155, D156).** `permisos.js`: la coordinación elimina lo de su cuadrilla (D155).
`estilos.css`: reordenada según su norma (cada regla en su sección, tres cortes, una consulta por
corte, sin #id, sin 29 selectores muertos ni 11 duplicados, sombras y velos como variables, colores
del croquis y del PDF en :root, marcador del mapa con clases); encabezado con la norma completa.
`index.html`: clases en lugar de #id, tres vistas anchas, `tabindex` en los resúmenes de errores,
marca 0.6.76. `util.js`: `color()`, `colorBase()`, `rgb()`, `resumenErrores()`, `ocupado()`,
`opciones()`, `paresPersonas()`, `atajos`. `referencias.js`: `lugar()`. `reportes.js`: `modelo()`
que pintan `htmlPrevia()` y `generar()`, `colores()`. `mapa.js` y `croquis.js`: colores de la hoja.
`app.js`, `catalogos.js`, `formulario.js`, `jornada-activa.js`, `jornadas.js`, `usuarios.js`,
`registros.js`, `galeria.js`, `envio.js`: usan los comunes. `esquema.json` (R-A01), `README.md` y
`DICCIONARIO-DATOS.md` al día. `auditoria.py`: siete revisiones nuevas de la norma de la hoja y de
colores en el código. `config.js`: Bloque 94b.
Pruebas: la coordinación elimina lo de su cuadrilla y no lo de fuera; resumen de errores con título,
enlaces y foco; texto escapado en resúmenes y listas; botón ocupado; lugar en un solo formato;
colores desde :root, el del PDF igual con modo sol; barra de atajos; vista previa con el mismo modelo
que el PDF; marcador del mapa con la guinda de la hoja.
Huella visual (22 estados × 7 anchos, antes y después): iguales en 360, 390, 440, 768 y 1280 px salvo
lo buscado —el lugar con «Alcaldía» y las advertencias en la vista previa—; en 640 y 720 px, el
diseño de teléfono por la unión de cortes.

**Verificación:** 696 comprobaciones sin errores de consola; 99 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.76.

## Bloque 96 — Indicadores de supervisión (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.77.

**Qué cambió (D157).** `js/indicadores.js` (nuevo): periodos (semana de lunes a domingo, mes, año,
rango, todo; avanzar y retroceder), carga de lo que alcanza quien entra (jornadas con sus árboles,
eliminados y ediciones de la bitácora, cabos asignados) y el cálculo puro del modelo: cifras, calidad
del dato, serie, por cabo, por alcaldía, por colonia, por especie, por programa, jornadas del
periodo, en curso, qué atender, trazabilidad y el detalle por árbol para el CSV. `index.html`: carga
el módulo; marca 0.6.77. `app.js`: la revisión de arranque lo exige. `esquema.json`: sección
«indicadores»; `generar_diccionario.py` y `DICCIONARIO-DATOS.md`: su tabla. `config.js`: Bloque 96.
Pruebas: periodos (lunes a domingo, febrero y bisiesto, año, avanzar y retroceder, rango); con datos
conocidos, sólo cuentan las cerradas, la en curso aparte, avance contra la meta, por cabo y por
alcaldía con colonias, calidad del dato, qué atender, filtros de alcaldía y cabo, serie por día,
semana y mes, detalle por árbol; la coordinación supervisa a sus cabos asignados.

**Verificación:** 708 comprobaciones sin errores de consola; 99 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.77.

## Bloque 97 — Supervisión y Mi avance (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.78.

**Qué cambió (D158).** `js/supervision.js` (nuevo): periodo (semana, mes, año, rango, todo; anterior
y siguiente), filtros, cifras, qué atender, gráfica SVG con su tabla oculta, por cabo, mapa por
alcaldía sin mosaicos, colonias con una alcaldía, especies, programas, calidad del dato y jornadas
del periodo; de ahí se va a la ficha de una jornada o a las jornadas de un cabo. `index.html`: la
vista, la pestaña (Supervisión o Mi avance), sin pestañas de Fotografías, Catálogos y Usuarios,
Catálogos y Usuarios en el menú de la cuenta, «Supervisión» para volver desde Fotografías; marca
0.6.78. `app.js`: orden y nombre de la pestaña por perfil, entrada a Supervisión para quien
supervisa, Fotografías marca Supervisión, menú de administración, revisión de arranque.
`galeria.js`: botón para volver. `iconos.js`: «avance», «anterior» y «siguiente». `estilos.css`:
componentes de Supervisión, tabla corta que no se vuelve tarjeta, dos columnas en computadora.
`README.md`: cómo se usa. Pruebas del bloque que abrían Fotografías, Catálogos y Usuarios por su
pestaña, ahora por Supervisión y el menú; `registrar()` se asegura de estar en Nuevo registro.
Pruebas: barras por perfil (cabo, coordinación, administración) y a qué sección entra cada uno; Mi
avance cuenta la jornada cerrada y no la abierta; qué atender; periodos; filtro sin datos y quitar
filtros; mapa de 16 alcaldías con la que tiene árboles resaltada; sin desplazamiento lateral en el
teléfono; de «Qué atender» a la ficha; tabla por cabo y sus jornadas; Fotografías ida y vuelta;
cifras en un renglón en computadora.

**Verificación:** 734 comprobaciones sin errores de consola; 99 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.78.

## Bloque 98 — Informes por periodo en PDF y CSV (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.79.

**Qué cambió (D159).** `js/informes.js` (nuevo): el informe en PDF (membrete, título por periodo y
alcaldía, resumen, qué atender, avance, por cabo, por alcaldía o colonia, especies con total,
programas, jornadas, trazabilidad, notas, pie con página X de Y) y la tabla en CSV (un renglón por
árbol, BOM, comillas escapadas), con nombres de archivo que dicen qué son. `supervision.js`: botones
«Informe en PDF» y «Tabla en CSV», apagados si no hay qué informar. `reportes.js` e `index.html`:
apartado «Informes por periodo» en Reportes que lleva a Supervisión o Mi avance; marca 0.6.79.
`iconos.js`: «tabla». `app.js`: la revisión de arranque exige el módulo. `supervision.js`: el mapa
dice el crédito de la capa de alcaldías (la auditoría pide crédito en todos los mapas).
`auditoria.py`: la revisión de colores en el código mira colores de jsPDF, no cualquier arreglo de
tres números. `README.md`: los informes.
Pruebas: Reportes dice dónde están los informes y lleva ahí; el cabo descarga su informe semanal
(nombre, título, su nombre, sin tabla por cabo, peso); la coordinación, el mensual de una alcaldía
con colonias y tabla por cabo, y la tabla en CSV con un renglón por árbol y acentos; el CSV escapa
comillas y comas; sin jornadas cerradas no se ofrece informe ni tabla.

**Verificación:** 734 comprobaciones sin errores de consola; 99 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.79.

## Bloque 99 — Datos de demostración (25-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.80.

**Qué cambió (D160).** `js/demostracion.js` (nuevo): generador con semilla fija (siete cuentas, unas
550 jornadas y 7,000 árboles de enero de 2024 a hoy, temporada de lluvias y crecimiento anual,
colonias reales, territorio derivado, folios de la secuencia simulada, envíos, bitácora, eliminados,
editados y fotografías chicas dibujadas), carga en una sola transacción, retiro por rango de clave
«demo-» y «u-demo-» que conserva lo que tenga algo propio y limpia la bitácora y los envíos, y los
botones del pie con su confirmación, avance en porcentaje y aviso. `index.html`: apartado «Datos de
demostración» al pie; marca 0.6.80. `app.js`: iconos, arranque del módulo, se muestra con sesión y
se oculta en el acceso; la revisión de arranque exige el módulo. `supervision.js`: jornadas del
periodo y colonias cortadas en 15 con «Ver las N…» / «Ver sólo las 15…»; el periodo y los filtros se
reinician al entrar con otra cuenta. `folio.js`: la emisión simulada se detiene si la sesión se
cierra a medio envío. `estilos.css`: el apartado del pie y el botón de las listas largas.
`README.md`: cómo se usan.
Pruebas: el apartado no aparece en el acceso; con sesión, «Cargar» y «Quitar» apagado; la
confirmación dice cuánto se agrega; mientras carga no se puede quitar; lo cargado (jornadas,
árboles, años, cabos, cuentas, abiertas de antes y de hoy, sin reporte, eliminados, fotografías,
territorio, folios, bitácora) y que lo propio sigue ahí; Supervisión del año 2025 con siete cabos;
corte en 15 jornadas y en colonias, abrir y cerrar; informe anual de una alcaldía; al cambiar de
cuenta, semana en curso sin filtros; cuadrilla de cada coordinación; Mi avance de una cabo de
demostración; quitar deja lo propio, conserva la jornada con un árbol propio, su cabo y su
coordinación, y saca al acceso a quien usaba una cuenta quitada; «Recuperar» devuelve los mismos
datos; con datos reales no se carga nada.

**Verificación:** 760 comprobaciones sin errores de consola; 99 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.80.

## Bloque 99b — La versión publicada llega con una recarga (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.81.

**Qué cambió (D161).** `sw.js`: la página se pide a la red con `cache: 'no-cache'`, para que la
copia de 10 minutos que GitHub Pages permite guardar al navegador no tape una versión recién
publicada. `js/demostracion.js` y `README.md`: el aviso nombra el botón «Cambiar usuario
(pruebas)», como se llama en el menú. `index.html` y `js/config.js`: marca 0.6.81.
`MEJORAS.md`: cómo ver la versión nueva.
Pruebas: una copia de la app servida con «Cache-Control: max-age=600» queda con su service worker;
se cambia la página publicada y basta abrir la app una vez para verla (sin el cambio, la prueba
falla: reproduce lo que vio Liber); sin señal sigue abriendo. El aviso de la carga de
demostración nombra «Cambiar usuario (pruebas)». Dos fechas de una prueba anterior estaban
escritas a mano (21 y 22 de septiembre) y el 26 chocaban con la jornada de «hace cinco días»:
ahora son relativas a hoy (hace tres y cuatro días).

**Verificación:** 764 comprobaciones sin errores de consola; 99 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.81.

## Bloque 100 — Catálogo de vehículos en el reporte (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.82.

**Qué cambió (D162).** `assets/catalogo-vehiculos.js` (nuevo): los 16 vehículos de las cuadrillas.
`js/datos-ficticios.js`: los siembra con los demás catálogos. `js/almacen.js`: `completarCatalogos()`
agrega a un teléfono con capturas los catálogos que le falten, una vez por sello; `js/config.js`:
sello `2026-09-26-vehiculos`, marca «Bloque 100». `js/catalogos.js` e `index.html`: pestaña
Vehículos con placa, modelo y tipo (tipos propuestos al escribir), placa en mayúsculas, clave sin
espacios y oculta, validación de placa repetida. `js/reportes.js` e `index.html`: en el cierre, lista
de placas agrupada por tipo, modelo y tipo que se ponen solos, los tres vehículos que más usa el
encargado a un toque, «Otro vehículo» con sus tres campos, reconocimiento de placas escritas antes;
el reporte dice modelo, tipo y placa. `js/espejo.js`: nota de `vehiculo_id`. `js/demostracion.js`:
jornadas con vehículos del catálogo. `css/estilos.css`: el campo de vehículo, y los cuatro botones de Catálogos se parten en dos renglones en un teléfono chico (a 360 px ya no caben). `esquema.json` (y su
diccionario y `js/esquema.js` regenerados), `MAPEO-CAMPOS.md`, `README.md`: catálogo de vehículos,
`jornadas.vehiculo_id` y `jornadas.vehiculo_tipo`. `pruebas/auditoria.py`: `vehiculo_id` entre los
campos de la jornada.
Pruebas: los 16 vehículos en Catálogos con placa, modelo y tipo; alta con errores, placa repetida
sin espacio, alta correcta; en el cierre, placas agrupadas por tipo, frecuentes de la cabo en orden,
un toque y la lista ponen modelo y tipo, se guarda el vehículo con su copia, vista previa y PDF con
«Dodge · Estacas, placa PRU 005»; al regenerar ya viene elegido; «Otro vehículo»; placa escrita
antes reconocida o abierta como otro; frecuentes para la coordinación; uso en el catálogo que impide
eliminar; teléfono con capturas y sello anterior recibe los 16 vehículos sin perder jornadas; los
datos de demostración usan el catálogo. La prueba del cierre anterior elige «Otro vehículo» para
escribir su camioneta.

**Verificación:** 788 comprobaciones sin errores de consola; 100 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.82.

## Bloque 101 — El reporte de la jornada por secciones (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.83.

**Qué cambió (D163).** `js/reportes.js`: modelo nuevo del reporte (nombre del cabo, cinco cifras,
identificación, personal, vehículo, ejemplares sin folio con coordenada y precisión, totales con
distribución y porcentaje, gráficas y notas), vista previa y PDF con secciones numeradas en franja
guinda, datos en columnas con etiqueta en negritas, tablas y gráficas dibujadas; porcentajes que
suman 100; el croquis se reduce si cabe a dos tercios al final de la página. `js/croquis.js`:
acercamiento exacto (fraccionario, hasta 20) para llenar el lienzo, mosaicos ampliados y un nivel
más lejos si faltan, círculos que se achican con muchos puntos y números apartados con línea a su
punto. `js/util.js`: `fechaLarga()` («Jueves 25 de septiembre de 2026»). `css/estilos.css`: la
vista previa por secciones, cifras, datos, gráficas y su versión para teléfono chico.
`README.md`: el reporte. Marca 0.6.83.
Pruebas: fecha completa; cabo y cinco cifras; identificación con el día completo; personal y
vehículo; siete secciones en orden y numeradas; totales con distribución y porcentajes que suman
100, también en la gráfica; gráficas por especie, distribución y meta; etiquetas en negritas; la
vista previa no se sale de lado en el teléfono; el PDF con las siete secciones, sin folios y ligero;
cinco árboles a un par de metros (dos encimados) sin números encimados; encuadre exacto que llena el
croquis. Se ajustaron las pruebas anteriores del reporte a la estructura nueva.

**Verificación:** 802 comprobaciones sin errores de consola; 100 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.83.

## Bloque 102 — Comentarios por ejemplar, originales fuera del sitio y jsPDF al día (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.84.

**Qué cambió (D164).** `js/reportes.js`: `textoComentario()` y, en el modelo, `comentarios` (sólo
los árboles que lo tienen) y `notaEjemplares`; la vista previa y el PDF cierran con la sección
«Comentarios por ejemplar» y avisan debajo de los ejemplares. `css/estilos.css`: el comentario de
varios renglones los conserva. `assets/fuentes/` → `originales/` (fuera de git, `.gitignore`);
`pruebas/generar_capas.py`, `generar_especies.py` y `extraer_iconos.py` leen de ahí y se detienen
si falta; las capas y el catálogo generados de nuevo salen idénticos (sólo cambia el texto de su
origen). `pruebas/auditoria.py`: los originales no están en el sitio, `.gitignore` los deja fuera
y, si la copia no los tiene, se omite la comparación con aviso. `vendor/`: jsPDF 4.2.1 y AutoTable
5.0.8. `esquema.json` (regla de `comentarios`), DICCIONARIO-DATOS, MAPEO-CAMPOS y README. Marca 0.6.84.
Pruebas: jsPDF 4.2.1 con la tabla disponible; `assets/fuentes` ya no existe en el sitio; sin
comentarios la sección no sale ni se anuncia; con dos, es la última sección y trae sólo esos dos,
con su número, especie y el texto limpio; el aviso debajo de los ejemplares; el PDF cierra con los
comentarios. La prueba de las secciones del Bloque 101 acepta la octava cuando hay comentarios.

**Verificación:** 810 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.84.

## Bloque 103 — Ayudas más cortas al iniciar la jornada (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.85.

**Qué cambió (D165).** `index.html`: la ayuda de «Dirección de la jornada» queda en «Calle y número,
entre calles o tramo.»; «Árboles que se van a plantar» pierde su línea de ayuda al iniciar y en
«Editar jornada», con su `aria-describedby`. `esquema.json` (regla de `ubicacion`), DICCIONARIO-DATOS
y `js/espejo.js` con el texto nuevo. Marca 0.6.85.
Pruebas: las dos comprobaciones de D140 que tocaban estos campos se ajustaron: la dirección trae el
texto nuevo y enlazado; la meta no trae ayuda y, con error, sólo anuncia el error, también en
«Editar jornada».

**Verificación:** 810 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.85.

## Bloque 104 — Colores por significado; lo institucional, sólo en el PDF (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.86.

**Qué cambió (D166).** `css/estilos.css`: variables por rol (acento azul, `--atencion-relleno`,
`--cabeza-tabla`, `--gris-rayas`, neutros fríos) y las institucionales como `--pdf-guinda`,
`--pdf-dorado`, `--pdf-gris`, `--pdf-fila`, `--pdf-borde`, más `--dist-endemica` y `--dist-sin-dato`;
ninguna regla de pantalla usa ya guinda ni dorado; puntos, leyenda y miniatura con el semáforo
circular; corregir neutro; tablas, Supervisión, franja de edición, filtros, foco y banda de datos de
prueba con sus colores nuevos; el modo sol ya no redefine el dorado. `js/jornadas.js`: el tono `ok`
para el punto revisado en lista, mapa y miniatura (que ahora recibe los revisados). `js/reportes.js`
y `js/croquis.js`: leen `--pdf-*`; la gráfica de origen con colores lógicos y texto oscuro sobre los
tramos claros. `index.html`: leyenda de cuatro estados y `theme-color` blanco; `manifest.webmanifest`.
Comentarios de `mapa.js`, `jornada-activa.js` e `iconos.js` al día. Marca 0.6.86.
Pruebas: barrido de todas las pantallas (Registro, Jornadas y su detalle, Registros, Reportes,
Catálogos, Usuarios y Supervisión) sin guinda ni dorado fuera de la vista previa; colores y forma
circular de los cuatro estados del punto y anillo azul del elegido; leyenda; miniatura con revisados;
contraste de cada color de significado ≥ 4.5:1; corregir neutro; colores del PDF y de la gráfica de
origen; vista previa en guinda; el punto revisado en verde en la lista y el mapa. Se ajustaron 16
comprobaciones anteriores que fijaban pizarra, guinda o ámbar de corregir.

**Verificación:** 820 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.86.

## Bloque 105 — «Correcto», tuerca sin círculo y «Hoy» sin año ni mes (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.87.

**Qué cambió (D167).** `index.html`: en la leyenda del mapa de la jornada, «Sin aviso» → «Correcto»;
ids `caja-jornada-anio` y `caja-jornada-mes`. `css/estilos.css`: la tuerca sin círculo ni contorno.
`js/registros.js` y `js/jornadas.js`: año y mes sólo con «Todos»/«Todas»; el acordeón «Más filtros»
se oculta si no le queda nada y su resumen dice sólo lo disponible. Marca 0.6.87.
Pruebas: la leyenda espera «Correcto»; con «Hoy» (y en Jornadas también con «Un día») no hay año ni
mes, con «Todos»/«Todas» sí, en Registros y en Jornadas; la tuerca sin círculo, fondo ni contorno y
con 48 px de toque.

**Verificación:** 825 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.87.

## Bloque 106 — «Previstos», Supervisión con porcentajes y la barra contra el total (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.88.

**Qué cambió (D168).** `js/jornadas.js`, `js/jornada-activa.js`, `js/reportes.js`, `js/informes.js`,
`js/supervision.js`, `index.html` y `js/espejo.js`: «meta» → «previstos» en todo lo que se lee.
`js/supervision.js`: título con unidad, `conPct()` para el % del total, especies con barra, listas de
diez en diez (`CORTE` 10, `data-orden`, `data-vistas`). `js/informes.js`: % del total en alcaldía,
colonia, especie y programa, y título con unidad. `js/reportes.js`: `porcentajes()` con empates,
barra de especie contra el total con su nota, «Otras N especies» sólo con más de 11. `css/estilos.css`:
`.sup-esp-barra`. Marca 0.6.88.
Pruebas: empates en porcentajes (3 de 19 = 16 %); «Otras N especies» y la nota de la barra; en
Supervisión, «de lo previsto», la unidad de la gráfica, el % en las tres tablas y especies de diez en
diez con su barra; jornadas: 10, «Mostrar 10 más» suma diez y al final vuelve a 10. Se ajustaron las
comprobaciones anteriores con «meta» y el corte de 15.

**Verificación:** 833 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.88.

## Bloque 107 — El reporte: franja del cabo, comentarios en la tabla y precisión en color (26-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.89.

**Qué cambió (D169).** `js/reportes.js`: el modelo sin «Árboles previstos» en los datos, la tabla de
ejemplares con especie y nombre científico juntos, columna de comentario cuando la hay, nivel de
precisión (`nivelPrecision`) y nota de colores; sin `comentarios` ni `notaEjemplares`; la vista previa
y el PDF pintan la franja del cabo con los datos de la jornada (el PDF mide la franja antes de pintar
el fondo) y la precisión en color (`didParseCell`); totales por especie sin columna de nombre
científico. `css/estilos.css`: franja del cabo y colores de precisión en la vista previa. Marca 0.6.89.
`index.html`: sin la frase «Anote cuántos árboles se programaron para plantar» en «Registrar jornada»
(pedido de Liber).
Pruebas: franja con los datos antes de las cifras; seis secciones; columnas de ejemplares y de totales;
comentarios en su columna, sin sección; colores de precisión; el PDF con la franja y los comentarios
en la tabla. Se ajustaron las comprobaciones de los bloques 101 y 102.

**Verificación:** 837 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.89.

## Bloque 108 — Longitud con «−» fijo y pegar el par completo (27-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.90.

**Qué cambió (D170).** `js/util.js`: `SRP.util.coordenadas` (número con coma decimal y «−»
tipográfico, longitud siempre negativa, reconocimiento del par, reparto en los dos campos al pegar o
al salir del campo). `js/jornada-activa.js` y `js/formulario.js`: leen con ese módulo, reparten el par
antes de colocar el punto y el mensaje de ayuda da el ejemplo sin signo; al llenar el campo desde el
mapa, la longitud va sin signo. `index.html`: los dos campos de longitud con el «−» fijo, ejemplo
99.133200 y la etiqueta para lector de pantalla. `css/estilos.css`: `.campo-signo` y `.signo-fijo`.
Marca 0.6.90.
Pruebas: número con coma y espacios; longitud negativa con o sin signo, con «−» tipográfico o coma;
el par con coma, punto y coma, espacio o al revés, y un solo número no es par; el «−» pegado al campo
con teclado decimal; 99.1332 sin signo coloca el punto en Cuauhtémoc; pegar el par en Latitud llena
los dos; el par escrito en un campo se reparte al colocar; «Nuevo árbol» con el mismo campo.

**Verificación:** 846 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.90.

## Bloque 109 — Confirmación «Registro exitoso» que se cierra sola (27-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.91.

**Qué cambió (D171).** `index.html`: `#confirmacion-guardado` (aria-hidden; el aviso para lector de
pantalla sigue en la franja). `js/formulario.js`: `confirmarGuardado()` con `DURACION_CONFIRMACION`
1500 ms y vibración de 60 ms; tras `SRP.activa.preparar()` se cancela el desplazamiento pendiente de
`darEspacioALista` (ahora guarda su temporizador) y, dos cuadros después, la franja «Guardado» se
lleva al tope. `css/estilos.css`: `.confirmacion-*` y `scroll-margin-top` de la franja. Marca 0.6.91.
Pruebas (teléfono de 375 × 667): al guardar sale al centro «Registro exitoso Aile» con palomita y sin
atrapar toques; la franja queda completa en pantalla y el foco en «Registrar ubicación»; a los 1.5 s
la confirmación se cierra sola.
Añadido a pedido de Liber: bajo los campos de coordenadas a mano, en «Registrar jornada» y «Nuevo
árbol», una línea de ayuda dice que se puede pegar el par como lo copia Google Maps (con ejemplo) y
cómo copiarlo; va enlazada a los dos campos. Pruebas: el texto en los dos formularios y el ejemplo,
pegado en Longitud, llena los dos campos. También a pedido de Liber: bajo los datos del punto se quitó
«Los tres salen del punto en el mapa. Para cambiarlos hay que volver a colocarlo.» (y su regla de estilo).

**Verificación:** 852 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.91. (La nota quitada al final
se verificó en la corrida del Bloque 110.)

## Bloque 110 — Del mapa a la lista, «Generar reporte» único y la × del aviso (27-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.92.

**Qué cambió (D172).** `js/jornadas.js`: `centrarEnLista()` lleva el árbol tocado en el mapa al centro
del espacio libre; el botón del pie dice siempre «Generar reporte», acción principal. `js/reportes.js`:
el botón de cada ficha, siempre «Generar reporte». `css/estilos.css`: `.aviso` en rejilla, con
«Deshacer» bajo el texto en teléfono chico. Marca 0.6.92.
Pruebas (teléfono de 375 × 667 y computadora): tocar el último punto del mapa deja ese árbol a la vista,
sin barras encima; en Reportes todos los botones dicen «Generar reporte», también con reporte ya
generado, y «Regenerar» no aparece; el aviso con «Deshacer» deja la × arriba a la derecha y «Deshacer»
bajo el texto, y en computadora ambos en un renglón. Se ajustaron las comprobaciones de D148. En 360 px
«Registrar árbol» y «Generar reporte» caben en un renglón cada uno: en teléfono chico la barra
del pie lleva menos relleno y no parte la etiqueta (`css/estilos.css`, corte de 480 px); la prueba de
D141 ahora cuenta renglones y desbordes en lugar de exigir 48 px exactos.

**Verificación:** 858 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.92.

## Bloque 111 — Guía del mapa según el momento (27-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.93.

**Qué cambió (D173).** `index.html`: `#mapa-guia` bajo el mapa. `js/mapa.js`: `GUIA_SIN_PUNTO` y
`pintarGuia()`, llamada al colocar y al limpiar el punto. `js/formulario.js`: la línea de estado sin
punto usa `GUIA_SIN_PUNTO`. `css/estilos.css`: `.mapa-guia`. Marca 0.6.93.
Pruebas: sin punto, la línea dice cómo ponerlo y la guía de ajuste no se ve; con el punto, la guía dice
que se arrastra y que las coordenadas se actualizan solas; al limpiar el formulario vuelve la primera. Se ajustó la comprobación anterior de la línea del mapa y la
prueba del Bloque 109 acepta el aviso de «jornada de otro día» cuando corre cerca de la medianoche.

**Verificación:** 862 comprobaciones sin errores de consola; 102 de auditoría;
presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.93.

## Bloque 112 — Textos de coordenadas, espacios y vehículo sólo del catálogo (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.94.

**Qué cambió (D174).** `index.html`: nueva ayuda de coordenadas en los dos formularios; guía del mapa
como la dejó Liber en GitHub (sin la pregunta), con la errata y el comentario corregidos.
`js/formulario.js` y `js/jornada-activa.js`: el aviso de error dice «pegue las dos juntas». En la ficha
«Revise antes de guardar» (`js/formulario.js`), sin comentarios el renglón «Comentarios» ya no sale.
`css/estilos.css`: `.coord-manual > .btn` con margen arriba y `.campo-punto` con margen abajo: «Especie» ya
no queda pegada a la tabla de coordenadas, alcaldía y colonia (se había quedado sin aire al quitar la nota
del Bloque 109). Vehículo sólo del catálogo: `index.html` sin «Otro vehículo» ni sus tres campos;
`js/reportes.js` copia placa, modelo y tipo del catálogo al guardar el cierre; `js/jornada-activa.js`
crea la jornada con el vehículo vacío (los tres datos ya no llegan por `SRP.reportes.CAMPOS`); `js/almacen.js`, migración 4
(`DB_VERSION` 4 en `js/config.js`) que limpia lo escrito a mano; `esquema.json` (origen «Catálogo»),
DICCIONARIO-DATOS, `js/espejo.js`, MAPEO-CAMPOS y README. Marca 0.6.94.
Pruebas: «Colocar punto» a 16 px o más de la ayuda; el aviso de error con el texto nuevo; la ayuda con
el ejemplo de seis decimales; la guía empieza con «Arrastre el marcador»; «Especie» a 24 px o más de la tabla del punto;
la ficha de revisión sin comentarios no enseña ese renglón y con comentario sí; el cierre sin «Otro vehículo» ni
campos a mano; «Sin vehículo» deja los tres datos vacíos; una base en la versión 3 sube a la 4 enlazando la
placa que está en el catálogo y quitando lo que no, sin tocar lo demás. Se ajustaron las comprobaciones de
D162, del espejo del cierre (ahora treinta campos: los tres del vehículo viajan a la base sin verse) y
de la versión de la base.

**Verificación:** 870 comprobaciones sin errores de consola; 102 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.94.


## Bloque 113 — Sin respaldo en el teléfono (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.95.

**Qué cambió (D175).** `index.html`: sin «Guardar respaldo» en el menú de la cuenta, sin «Restaurar
respaldo (pruebas)» en el pie, sin `js/validar.js`; la guía «¿Qué hacer sin internet?» ya no habla de
respaldos y dice qué hacer antes de cambiar de teléfono. `js/conexion.js`: fuera `respaldar()`,
`restaurar()` y `textoUltimoRespaldo()`, y el renglón «Último respaldo»; al iniciar borra
`srp_ultimo_respaldo`. `js/jornada-activa.js`: la confirmación de cierre ya no recuerda el respaldo.
`js/config.js`: fuera `CLAVE_ULTIMO_RESPALDO` y `RESPALDO_MAX_MB`. `js/app.js`: `validar` sale de los
módulos que se comprueban al arrancar y `btn-respaldo` de los iconos del menú. `js/almacen.js` y
`js/util.js`: con el espacio lleno se pide liberar espacio del teléfono sin borrar los datos del
navegador. `js/validar.js` pasa a `_to_delete/`. `esquema.json`: base en versión 4, fuera la clave
`srp_ultimo_respaldo`, el archivo de respaldo, la regla R-D02 y la S-10 de Fase 2; DICCIONARIO-DATOS y
`js/esquema.js` regenerados. README, `pruebas/generar_diccionario.py` y `pruebas/auditoria.py` al día.
Marca 0.6.95.
Pruebas: el recorrido del respaldo (descarga, restauración en un teléfono limpio, respaldo alterado y
datos reales contra prueba) se sustituye por comprobar que ya no existen el botón, la restauración, el
validador ni la fecha guardada; la guía y la confirmación de cierre sin respaldo; las acciones protegidas
pasan de 19 a 17; la defensa contra un id o una foto con código se prueba metiendo el registro directo en
la base; la revisión de integridad lee las relaciones de `SRP.ESQUEMA`. Nueva sección `ctx35`: la fecha
vieja del último respaldo se limpia al abrir, ninguna pantalla menciona respaldos y el esquema del
navegador sigue cargado.

**Verificación:** 863 comprobaciones sin errores de consola; 102 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.95.

## Bloque 114 — Campos depurados, renombrados y archivo de Fase 2 (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.96.

**Qué cambió (D176, D177).** Migración 5 en `js/almacen.js` (`DB_VERSION` 5): quita de las especies
`genero`, `especie` y `nota_discrepancia`; de las jornadas, `creado_por_id` y `fecha_creacion`;
pasa `meta_arboles` (o el viejo `arboles_plantados`) a `arboles_previstos`; deja sin datos de edición
las jornadas que nunca se editaron, sin nulos el vehículo y con seis decimales el punto; en cuentas,
`fecha_alta`/`alta_por_id` pasan a `fecha_creacion`/`creado_por_id`. Código: `js/catalogos.js` ya no
deriva género ni epíteto; `js/jornada-activa.js` crea la jornada con `arboles_previstos`, sin quién la
creó ni cuándo, sin datos de edición y con el punto a seis decimales; `js/jornadas.js`
(`previstosDe()` sustituye a `metaDe()`, también en `js/indicadores.js`, `js/reportes.js` y
`js/jornada-activa.js`; el aviso de edición dice «árboles previstos»); `js/usuarios.js`,
`js/datos-ficticios.js` y `js/demostracion.js` con los nombres nuevos; `index.html` sin el campo
oculto del vehículo y `js/reportes.js` lee la lista; `js/conexion.js` sin `refrescarAvisoEnvio()` ni
`resumenFotos()`; `js/espejo.js` al día. `pruebas/generar_especies.py` ya no copia género, epíteto ni
nota de discrepancia y `assets/catalogo-especies.js` se regeneró. `esquema.json` (113 campos; regla
S-11 de Fase 2), DICCIONARIO-DATOS y MAPEO-CAMPOS al día. `pruebas/auditoria.py` toma los campos de
la jornada del código. Nuevo `FASE2-Y-TRASPASO.md`; el README apunta a él. Marca 0.6.96.
Pruebas: se ajustaron las que usaban los nombres viejos, el espejo del cierre (veintiocho campos), la
especie nueva (sin género ni epíteto) y la versión de la base. Nueva sección `ctx36`: una base en la
versión 4 sube a la 5 depurando especies, jornadas y cuentas sin perder datos; una jornada editada
conserva quién y cuándo; ya no existen el código muerto ni el campo oculto; las jornadas nuevas guardan
`arboles_previstos`.

**Verificación:** 870 comprobaciones sin errores de consola; 102 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.96.

## Bloque 115 — Listas paginadas, cierre más claro y Reportes sin informes (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.97.

**Qué cambió (D178).** `js/util.js`: `paginar()`, `pintarPaginador()` y `subirA()`, compartidos;
`LISTA_PAGINA` pasa a 10 en `js/config.js`. `js/jornadas.js`, `js/registros.js` y `js/reportes.js`
pintan sólo la página y conservan los totales de todo lo filtrado; la página vuelve a 1 sólo si cambia
el filtro. `index.html`: un `nav.paginador` bajo cada lista; fuera «Mostrar más»; Reportes con el título
«Reportes de jornada» y sin el bloque de informes; el cierre sin la clase de campos grises ni «Una por
renglón». `js/reportes.js`: las cajas de texto del cierre crecen con lo escrito. `css/estilos.css`:
estilos del paginador (y su versión de teléfono chico), cajas del cierre sin asa ni barra, la guía de
fechas se oculta al enfocar, y se quitan las reglas de campos grises que ya nadie usaba. Marca 0.6.97.
Pruebas: se ajustaron las de Reportes (título, sin informes; los informes se abren desde su pestaña).
Nueva sección `ctx37`: con 23 jornadas, Jornadas, Registros y Reportes muestran 10 por página con su
total arriba y «Mostrando…» abajo; «Siguiente», la lista de páginas y «Anterior» apagado en la primera;
volver del detalle conserva la página; el mismo filtro no regresa a la primera y uno distinto sí; el
cierre con cajas blancas, sin «Una por renglón» y sin barra propia; la guía de la fecha se quita al
enfocar.

**Verificación:** 881 comprobaciones sin errores de consola; 102 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.97.

## Bloque 116 — Sin marca de prueba y campos sin uso (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.98.

**Qué cambió (D179).** `js/config.js`: `DB_NOMBRE_PRUEBA` (`srp_db`) y `DB_NOMBRE_REAL` (`srp_sia`);
`DB_NOMBRE` se elige con `ES_FICTICIO`; `DB_VERSION` 6. `js/almacen.js`: migración 6 y la bitácora sin
marca de prueba. `js/formulario.js`: el árbol ya no lleva `es_ficticio`, punto original, `folio_*`,
nombre ni peso de foto ni estatus de especie; al editar, si el punto cambió, la bitácora dice de dónde a
dónde. `js/folio.js`: la emisión simulada sólo pone `folio`. `js/envio.js`, `js/registros.js`,
`js/galeria.js`, `js/espejo.js`, `js/catalogos.js`, `js/usuarios.js`, `js/jornada-activa.js`,
`js/datos-ficticios.js`, `js/demostracion.js`, `assets/catalogo-vehiculos.js` y
`assets/catalogo-especies.js` (regenerado): sin `es_ficticio`; la galería calcula el peso de la foto.
`esquema.json` (99 campos), `DICCIONARIO-DATOS.md`, `js/esquema.js`, `MAPEO-CAMPOS.md` y
`FASE2-Y-TRASPASO.md` al día. Marca 0.6.98. `pruebas/auditoria.py` toma los campos del árbol del propio
código, como ya hacía con la jornada. Pruebas ajustadas a la ausencia de esos campos. Nueva sección
`ctx38`: una base versión 5 con todos los campos retirados se migra a la 6 sin ellos y sin perder
registros ni `reporte_en`; la versión de prueba usa `srp_db` y la real usaría `srp_sia`; mover el punto
al editar deja «Punto: … → …» en la bitácora; Fotografías sigue diciendo el peso.

**Verificación:** 888 comprobaciones sin errores de consola; 102 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.98.

## Bloque 117 — Fecha de cierre a la vista y colonias definitivas (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.6.99.

**Qué cambió (D180).** `js/jornadas.js`: `textoCierre()` y su uso en la ficha (insignia y texto para
lector de pantalla) y en el subtítulo del detalle. `pruebas/generar_capas.py` y
`assets/capa-colonias.js` (regenerada, misma geometría): la capa de colonias es la definitiva, versión
`iecm-2022`. `js/almacen.js`: migración 7; `js/config.js`: `DB_VERSION` 7. Comentarios de
`js/derivacion.js`, `js/referencias.js` y `js/reportes.js` al día. `esquema.json` (regla de `colonia`,
fuente de `colonia_cve`, capa de colonias, pantalla de `fecha_cierre`), `DICCIONARIO-DATOS.md`,
`js/esquema.js`, `MAPEO-CAMPOS.md`, `README.md`, `FASE2-Y-TRASPASO.md` (sin las dos decisiones y con las
tres capas definitivas) y el pendiente de colonias en `DECISIONES.md`. Marca 0.6.99. Pruebas: las de
capas esperan `Colonias iecm-2022` sin «capa de prueba»; las de migraciones, la versión 7. Nueva sección
`ctx39`: una base versión 6 con `colonias=iecm-2022-prueba` sube a la 7 con `iecm-2022` sin tocar la
colonia; a 360 px, con hora de Ciudad de México, la ficha dice «Cerrada a las 15:40», «Cerrada el 23/09
a las 10:05», «Cerrada» sin hora y «Abierta»; el texto para lector de pantalla y el detalle lo dicen con
el día en letra; sin desbordes.

**Verificación:** 895 comprobaciones sin errores de consola; 102 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.6.99.

## Bloque 118 — Vehículos de prueba con placas ficticias (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.7.0.

**Qué cambió (D181).** `assets/catalogo-vehiculos.js`: 16 vehículos de prueba, «PRU 001» a «PRU 016»,
con los modelos y tipos de siempre; la lista real pasa a `originales/vehiculos_reales_2026-09-26.csv`
(fuera de git). `js/almacen.js`: `completarCatalogos()` retira los vehículos de arranque que ya no
vienen (sin uso se quitan, con uso se desactivan). `js/config.js`: sello `2026-09-28-placas-prueba`,
marca «Bloque 118». `js/catalogos.js`: el ejemplo de placa del aviso y del comentario es «1234 AB».
Sin placas reales en `DECISIONES.md`, `BITACORA.md`, `MEJORAS.md`, `esquema.json` y
`DICCIONARIO-DATOS.md`. `README.md` y `FASE2-Y-TRASPASO.md` (vehículos reales en el servidor,
historial de git, visto bueno) al día. Marca 0.7.0. `pruebas/auditoria.py`: el catálogo sólo trae
placas «PRU 000» y ninguna placa real aparece en lo que se publica. Pruebas con las placas nuevas.
Nueva sección `ctx40`: un teléfono nuevo recibe los 16 de prueba; uno con capturas y el sello anterior
agrega los que falten, quita el vehículo viejo sin uso, desactiva el que usa una jornada (que conserva
su copia) y no toca el que dio de alta la administración.

**Verificación:** 898 comprobaciones sin errores de consola; 104 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.7.0.

## Bloque 119 — El reporte de la jornada con dos gráficas (28-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.7.1.

**Qué cambió (D182).** `js/reportes.js`: el modelo del reporte ya no arma la gráfica de avance; la
vista previa y el PDF pintan sólo ejemplares por especie y distribución. `css/estilos.css`: fuera las
reglas de la barra de avance, que ya nadie usa. `README.md` y `FASE2-Y-TRASPASO.md` (sin la decisión
de las gráficas) al día. Marca 0.7.1. Pruebas: la vista previa trae dos gráficas con sus títulos y
ninguna barra de avance; el PDF no dice «Avance contra lo previsto».

**Verificación:** 898 comprobaciones sin errores de consola; 104 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.7.1.

## Bloque 120 — Correcciones de la revisión de pantallas (29-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.7.2.

**Qué cambió (D183).** `index.html`: sin la leyenda del asterisco (acceso, Catálogos, Usuarios); texto
nuevo de Registrar jornada; la guía sin conexión con el estado oculto por omisión. `css/estilos.css`:
fuera `.nota-obligatorio`; la nota bajo «Entrar» con separación. `js/jornada-activa.js`: «Cambiar
jornada», sin etiqueta accesible distinta del texto. `js/folio.js` y `js/formulario.js`: el folio sin
«(simulado)». `js/formulario.js`: `aMedias()` y `resumenAMedias()` cuentan la especie tecleada, «Otra
especie» y las coordenadas escritas. `js/conexion.js`: la guía sólo muestra el aviso de iPhone; fuera
`listaSinSenal()`. `js/almacen.js`: fuera `estadoAlmacenamiento()`. `js/envio.js`: la cola dice cuántos
registros y de qué días, y sólo aparece si hay alguno. Marca 0.7.2. Pruebas ajustadas (folio, cola,
guía, botón, texto de la jornada). Nueva sección `ctx41`: sin leyenda en ninguna pantalla y nota
separada de «Entrar»; texto de Registrar jornada; «Cambiar jornada»; especie tecleada y coordenadas
escritas cuentan como árbol a medias y cancelar conserva lo escrito; formulario vacío no pregunta;
franja «Guardado» sin «(simulado)»; la guía con tres registros en cola de dos días.

**Verificación:** 908 comprobaciones sin errores de consola; 104 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.7.2.

## Bloque 121 — Repositorio ordenado por carpetas (29-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.7.3.

**Qué cambió (D184).** Movidos con `git mv`: `datos/`, `docs/`, `herramientas/`, `assets/capas/` y
`assets/catalogos/`. Rutas al día en `index.html`, los cuatro generadores (salidas nuevas),
`pruebas/auditoria.py`, `datos/esquema.json`, `datos/MAPEO-CAMPOS.md`, `docs/FASE2-Y-TRASPASO.md`, los
comentarios de `js/` y el `README.md` (estructura reescrita por carpetas). Regenerados sin cambio de
datos: las tres capas, el catálogo de especies, `datos/DICCIONARIO-DATOS.md` y `js/esquema.js` (sólo
cambia la ruta en su encabezado). Nuevos `vendor/LICENCIAS.md` y `originales/LEEME.md`; `.gitignore`
con `__pycache__/`. Fuera del repositorio: `pruebas/AUDITORIA-BOTONES.html` y
`pruebas/MOCKUP-JORNADAS.html` a `historial/maquetas/`; `pruebas/prueba_base_vieja.py` y
`pruebas/prueba_datos_viejos.py` a `historial/pruebas-retiradas/`; las copias
`historial/2026-09-21_bloque1_cerrado`, `2026-09-21_bloque2_cerrado` y `2026-09-22-bloque19` a
`_to_delete/`. Marca 0.7.3.

**Verificación:** 908 comprobaciones sin errores de consola; 104 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.7.3.

## Bloque 122 — Dos programas nuevos (29-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.7.4.

**Qué cambió (D185).** `js/datos-ficticios.js`: programas `p-palmeras` y `p-voluntariado`; encabezado
al día (los vehículos ya son de prueba). `js/config.js`: sello `2026-09-29-programas`, marca «Bloque
122». `js/demostracion.js`: una de cada diez jornadas de demostración va a cada programa nuevo, sin
consumir azar de más. `datos/esquema.json` y `datos/DICCIONARIO-DATOS.md`: los ids de arranque. Marca
0.7.4. Nueva sección `ctx42`: Iniciar jornada ofrece los cuatro programas; un teléfono con capturas y
el sello anterior recibe los dos nuevos y conserva lo capturado.

**Verificación:** 911 comprobaciones sin errores de consola; 104 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.7.4.

## Bloque 123 — Organizaciones: alcaldías, PAOT, SOBSE y empresas (29-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.0.

**Qué cambió (D186).** Catálogo nuevo de organizaciones (`js/catalogos.js`, pestaña «Organizaciones»):
tipo, contrato o convenio y vigencia, obligatoria para empresas; SEDEMA no se desactiva. De arranque
(`js/datos-ficticios.js`): SEDEMA, PAOT, SOBSE y las 16 alcaldías. `js/usuarios.js`: campo
Organización (propone SEDEMA), área sólo en SEDEMA, sin Administración global fuera de SEDEMA,
coordinador de la misma organización, sin cambio de organización de quien coordina cabos, columna y
filtro de organización. `js/referencias.js`: `organizacionDe`, `esSedema`, `accesoOrganizacion`.
`js/sesion.js` y `js/app.js`: una organización desactivada o vencida deja fuera a sus cuentas, también
con la sesión abierta, y no se ofrecen en la entrada de prueba (que dice la organización de las de
fuera). `js/jornada-activa.js`: la jornada guarda `organizacion_id` de quien la inicia. `js/reportes.js`:
el cierre de una jornada de fuera oculta chófer y vehículo; el reporte dice «Organización que ejecuta»
y el contrato o convenio. `js/almacen.js`: `asignarOrganizacion()` al abrir deja en SEDEMA las cuentas y
jornadas sin organización. Se probó primero como migración 8 y pisaba lo que la 5 cambiaba en la misma
actualización; por eso corre al abrir y la base sigue en la versión 7. `js/espejo.js`: nota del campo.
`js/demostracion.js`: cuentas y jornadas de demostración en SEDEMA, sin cambiar sus totales.
`datos/esquema.json`: `usuarios.organizacion_id`, `jornadas.organizacion_id`, `catalogos.tipo_organizacion`,
`instrumento`, `vigente_hasta`; dominio `tipo_organizacion`; relaciones, condicionales, R-U05, R-C05 y
S-12. `datos/MAPEO-CAMPOS.md`, `datos/DICCIONARIO-DATOS.md`, `README.md` y `docs/FASE2-Y-TRASPASO.md`
(fila 14 y lo que debe entregar el SIA) al día. Marca 0.8.0. Nueva sección `ctx43` (21 comprobaciones).

**Verificación:** 932 comprobaciones sin errores de consola; 107 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.0.

## Bloque 124 — Supervisión, informes y tabla por organización (29-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.1.

**Qué cambió (D187).** `js/indicadores.js`: `organizacionDe()`, filtro `organizacion` (jornadas,
árboles eliminados y editados, cabos asignados), `porOrganizacion` con tipo, la organización en la
lista de jornadas y en cada renglón del detalle. `js/supervision.js` e `index.html`: filtro
«Organización» sólo para la Administración, apartado «Por organización» cuando plantó más de una, y
la organización en las jornadas de fuera. `js/informes.js`: título y nombre de archivo con la
organización elegida, tabla «Por organización» en el PDF y columna «Organización que ejecuta» en el
CSV. `js/catalogos.js` e `index.html`: contrato o convenio obligatorio para empresas.
`js/demostracion.js`: Alcaldía Iztapalapa y una empresa de demostración, en una segunda pasada con su
propia semilla (lo de la Secretaría sale idéntico: mismas 574 jornadas y los mismos árboles); la
empresa entra y sale con los datos. `datos/esquema.json`: indicador «Por organización».
`README.md`, `docs/FASE2-Y-TRASPASO.md` y el diccionario al día. Marca 0.8.1. Nueva sección `ctx44`
(9 comprobaciones); `ctx21` ajustada a 12 cuentas y 10 cabos de demostración, y `ctx23` revisa los vehículos sólo en los reportes de la Secretaría.

**Verificación:** 941 comprobaciones sin errores de consola; 107 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.1.

## Bloque 125 — Alta de cuentas por institución (29-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.2.

**Qué cambió (D188).** `index.html` y `js/usuarios.js`: el alta empieza por «Tipo de institución»
(cuatro fijos) y despliega «Institución» (o «Alcaldía», con las 16 sin repetir la palabra); «Agregar
otra…» pide el nombre de la institución nueva y la guarda con la cuenta en una sola operación
(`guardarJuntos`); «Nombre completo» en un campo; área sólo en SEDEMA; fuera de SEDEMA sólo perfil
Cabo y sin coordinador. `js/catalogos.js`: pestaña «Instituciones» sin «Agregar» ni «Eliminar», sólo
«Renombrar» y «Desactivar»; alcaldías fijas; sin contrato ni vigencia; `claveLibreDe()`.
`js/referencias.js`: `TIPOS_INSTITUCION`, `nombreOrganizacion()` antepone «Alcaldía», el acceso ya no
mira vigencia. `js/almacen.js`: `normalizar()` al abrir (sustituye a `asignarOrganizacion()`): institución
y nombre completo en las cuentas, institución en las jornadas, tipos, alcaldías y campos de antes en
las instituciones. `js/datos-ficticios.js`: 21 instituciones de arranque, cuentas con nombre completo.
`js/demostracion.js`: cabos de fuera sin coordinación. `js/util.js`: `nombreCompleto()` lee el campo
único. «Institución» en Supervisión, informes, CSV y reporte. Sello `2026-09-29-instituciones`.
`datos/esquema.json`, `datos/MAPEO-CAMPOS.md`, diccionario, `README.md` y `docs/FASE2-Y-TRASPASO.md` al
día. Marca 0.8.2. Secciones `ctx43` (instituciones, 18 comprobaciones) y `ctx44` (supervisión por
institución, 8) reescritas; el alta de ctx admin y la demostración de `ctx21` ajustadas.

**Verificación:** 937 comprobaciones sin errores de consola; 107 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.2.

## Bloque 126 — Áreas de la Secretaría e instituciones desde Catálogos (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.3.

**Qué cambió (D189).** `js/datos-ficticios.js`: áreas DGSANPAVA, Oficina de la Secretaría, Sistema
de Información Ambiental y DGEIRA; cuentas de prueba en DGSANPAVA; `areasRetiradas`.
`js/almacen.js`: `completarCatalogos()` pasa las cuentas del área retirada a su sustituta, la quita y
renombra las áreas de arranque que nadie editó. `js/demostracion.js`: cuentas de la Secretaría en
DGSANPAVA. `index.html` y `js/usuarios.js`: sin «Agregar otra…» ni el campo de institución nueva; aviso
«una institución nueva se agrega en Catálogos › Instituciones». `js/catalogos.js`: «Agregar
institución» vuelve, con tipo (sin Alcaldía) y nombre; la clave la pone el sistema; al renombrar el
tipo no cambia. Sello `2026-09-30-areas`. Esquema, mapeo, diccionario y README al día. Marca 0.8.3.
`ctx43` ajustada (20 comprobaciones: agregar institución, alta sin «Agregar otra…», áreas). Las pruebas del reporte toman una jornada de la Secretaría: según el día, la primera de la lista podía ser de la alcaldía de demostración, sin apartado de vehículo, y la numeración de secciones cambiaba.

**Verificación:** 939 comprobaciones sin errores de consola; 107 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.3.

## Bloque 127 — Una cuenta de prueba por tipo y reinicio de los datos de prueba (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.4.

**Qué cambió (D190).** `js/datos-ficticios.js`: siete cuentas de arranque (tres de la Secretaría y
un cabo por tipo de institución). `js/app.js`: la entrada de prueba ordena por Secretaría, perfil y
tipo de institución, con las cuentas de demostración en su grupo; aviso de reinicio.
`js/config.js`: sello `2026-09-30-usuarios` y `SELLO_REINICIO`. `js/almacen.js`: `reiniciar()` y el
caso `'reiniciado'` en `sembrarSiVacio()`. Pruebas: nueva sección `ctx45`; conteos de cuentas y
cabos ajustados; la prueba de vehículos de un teléfono anterior usa `sello-viejo`. Auditoría: siete
cuentas, área sólo en la Secretaría y la institución de cada cuenta en el catálogo. Marca 0.8.4.

**Verificación:** 944 comprobaciones sin errores de consola; 109 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.4.

## Bloque 128 — Programas por institución y cierre de empresas privadas (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.5.

**Qué cambió (D191).** `js/datos-ficticios.js`: programas «Palmeras» y «Compensaciones».
`js/config.js`: `PROGRAMAS_POR_TIPO_INSTITUCION` y sello `2026-09-30-programas`. `js/referencias.js`:
`programasPara()`. `js/jornada-activa.js` y `js/jornadas.js`: iniciar y editar jornada ofrecen sólo los
programas de la institución; al iniciar se comprueba. `index.html` y `js/reportes.js`: el cierre de
una empresa privada oculta y deja vacíos Personal participante y Personal de apoyo. `js/almacen.js`:
`completarCatalogos()` renombra también los programas de arranque sin editar. Esquema, mapeo y
diccionario al día. Marca 0.8.5. Nueva sección `ctx46`; `ctx42` con los cinco programas.

**Verificación:** 950 comprobaciones sin errores de consola; 109 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.5.

## Bloque 129 — Coordinación en cada institución, programas por tipo y cierre con personal sólo en SEDEMA (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.6.

**Qué cambió (D192).** `js/usuarios.js`: fuera de SEDEMA el perfil es cabo o coordinador; el cabo
elige coordinador de su misma institución y se valida. `js/config.js`: `PROGRAMAS_POR_TIPO_INSTITUCION`
para los cuatro tipos y sellos `2026-09-30b-coordinacion`. `js/referencias.js`: `programasPara()` da
todos a SEDEMA. `js/jornada-activa.js`: con un solo programa posible, viene elegido.
`js/datos-ficticios.js`: sin «Jornadas de voluntariado» (`programasRetirados`) y once cuentas.
`js/almacen.js`: `completarCatalogos()` retira los programas de arranque que ya no vienen.
`js/reportes.js`: el cierre de fuera oculta personal, apoyo, chófer y vehículo; el reporte dice la
institución que ejecuta también en SEDEMA y no imprime personal ni vehículo de fuera.
`js/app.js`: la entrada de prueba ordena las de fuera por tipo y perfil. `js/demostracion.js`:
cabos de Iztapalapa con su coordinador, sin personal en jornadas de fuera y Compensaciones en lugar
de voluntariado. Esquema, mapeo y diccionario al día. Marca 0.8.6. Nueva sección `ctx47`; `ctx42`,
`ctx43`, `ctx45` y `ctx46` ajustadas. Auditoría: once cuentas, coordinador de la misma institución y
Administración sólo en SEDEMA.

**Verificación:** 963 comprobaciones sin errores de consola; 111 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.6.

## Bloque 130 — Quién usa cada programa, en Catálogos (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.7.

**Qué cambió (D193).** `js/datos-ficticios.js`: cada programa de arranque con `tipos_organizacion`.
`js/config.js`: sin `PROGRAMAS_POR_TIPO_INSTITUCION`; sello `2026-09-30c-programas` (no reinicia).
`js/referencias.js`: `programasPara()` lee el catálogo; `textoUsoPrograma()`. `js/almacen.js`:
`normalizar()` completa `tipos_organizacion` en los programas que no lo tienen. `js/catalogos.js` e
`index.html`: «Quién puede usarlo» con botones de los cuatro tipos al agregar o editar un programa, y
la columna «Quién lo usa» en la lista. Esquema (101 campos), mapeo y diccionario al día. Marca 0.8.7.
Nueva sección `ctx48`.

**Verificación:** 972 comprobaciones sin errores de consola; 111 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.7.

## Bloque 131 — Demostración con todas las instituciones, perfiles y programas (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.8.

**Qué cambió (D194).** `js/demostracion.js`: tercera pasada `CUADRILLAS_INSTITUCIONES` con su semilla
y cuánto captura cada cuenta; seis cuentas de demostración nuevas; la institución de cada jornada
sale de la cuenta que la registra; los coordinadores sin coordinación corrigen lo suyo; vehículo
de respaldo para quien no tiene favoritos; texto del pie al día. Con el volumen nuevo salieron dos
fallas, corregidas: `js/supervision.js` descarta lo leído si mientras cargaba se salió o se cambió de
cuenta (antes pintaba los datos de la cuenta anterior); `js/indicadores.js`: «X de Y cabos
trabajaron» cuenta sólo cabos (con un coordinador que registra salía «4 de 3»). Marca 0.8.8. Nueva
sección `ctx49`; conteos de la demostración ajustados en `ctx21`, `ctx44` y `ctx45`.

**Verificación:** 980 comprobaciones sin errores de consola; 111 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.8.

## Bloque 132 — Configuración de la Administración global (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.8.9.

**Qué cambió (D195).** `js/configuracion.js` (nuevo): tarjetas con resumen, Parámetros (de
`SRP.CONFIG`), Registro de cambios (bitácora de `usuario` y `catalogo`, filtros, paginador) y Acerca
del sistema. `index.html`: entrada «Configuración» en el menú; vistas `configuracion`, `parametros`,
`cambios` y `acerca`; «Configuración» para volver en Usuarios y Catálogos. `js/app.js`: menú, candado
de las vistas nuevas e inicio del módulo. `css/estilos.css`: tarjetas, valores y renglones del
registro. La fecha del registro se da en la hora del dispositivo, igual que la hora. Marca 0.8.9.
Nueva sección `ctx50`; las pruebas que entraban por Catálogos y Usuarios del menú pasan por
Configuración.

**Verificación:** 990 comprobaciones sin errores de consola; 111 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.8.9.

## Bloque 133 — Catálogo de especies en Excel y carga masiva (30-09-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.0.

**Qué cambió (D196).** `js/excel.js` (nuevo): escribir .xlsx con `SRP.zip` y leer .xlsx (directorio
central y `DecompressionStream`) y CSV. `js/carga.js` (nuevo): plantilla, revisión, descarga de
problemas y carga en una transacción. `js/catalogos.js`: «Descargar en Excel» en Especies.
`index.html`: tarjeta y vista `carga`; botón del catálogo; «Cargas masivas» en el filtro del
Registro de cambios. `js/configuracion.js`: resumen de la tarjeta y la carga en el registro.
`js/permisos.js`: acción `carga.masiva`. `js/indicadores.js`: una jornada con `carga_id` no se cuenta
sin reporte. `js/jornada-activa.js`, `js/demostracion.js` y `js/espejo.js`: `carga_id`. Esquema
(campo `jornadas.carga_id` y entidad `carga` de la bitácora), mapeo y diccionario al día.
`css/estilos.css`: cifras y problemas de la revisión. Marca 0.9.0. Nueva sección `ctx51`; `ctx50`
con seis tarjetas.

**Verificación:** 1,004 comprobaciones sin errores de consola; 111 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.9.0.

## Bloque 134 — «Lejos del resto» frente al más cercano y aprobar todos los puntos (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.1.

**Qué cambió (D197).** `js/jornadas.js`: `avisos()` mide «lejos» contra el árbol más cercano (sale
`mediana()`, sin uso); `pintarConciliacion()` muestra «Marcar los N como revisados» con dos o más
pendientes y permiso de editar; `marcarTodosRevisados()` con confirmación, bitácora y «Deshacer».
`index.html` y `css/estilos.css`: el botón en la conciliación. `js/configuracion.js`: texto del
parámetro. Marca 0.9.1. Nueva sección `ctx52`.

**Verificación:** 1,010 comprobaciones sin errores de consola; 111 de auditoría sin hallazgos; presentación sin desbordes en ocho combinaciones. Marca de versión 0.9.1.

## Bloque 135 — Buscar jornadas por nombre y filtrar por revisión (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.2.

**Qué cambió (D198).** `index.html`: campo `#jornada-buscar` en los filtros de Jornadas. `js/jornadas.js`:
`filtro.texto`, búsqueda por palabras en `cumpleFiltro()`, aviso de vacío con lo buscado y «Ver
todas» que limpia la búsqueda. Filtro `#jornada-revision` (`filtro.revision`): `pendientesDe()` calcula
si la jornada tiene puntos por revisar o no cuadra con lo previsto, y `cumpleRevision()` aplica la
opción elegida. Los dos campos van en `.campo-doble`, que se apila en teléfono. Marca 0.9.2. Nueva
sección `ctx53`.

**Verificación:** prueba.py 1016 comprobaciones, 0 fallas (ctx53: 6); auditoria.py 111, 0 hallazgos; revisar.py sin problemas.

## Bloque 136 — La carga masiva reconoce lo ya cargado y se puede deshacer (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.3.

**Qué cambió (D199).** `js/carga.js`: `huella()`, `existentes()` y `revisar(filas, existentes)`
(error «Ya está en el sistema…», cuenta `yaEstaban` en el resumen); `lotes()`, `pintarLotes()`,
`deshacer(lote)` y `archivoDe()`; `cargar` y `deshacer` envueltas con `SRP.util.proteger`; el campo
del archivo se vacía al leerlo. `index.html`: apartado «Cargas hechas» (`#carga-lotes`,
`#carga-lotes-vacio`). `js/configuracion.js`: «Carga masiva deshecha» en el Registro de cambios y la
tarjeta cuenta sólo las cargas. `css/estilos.css`: botón del lote y lote deshecho tachado. Marca
0.9.3. Nueva sección `ctx54`. Origen: auditoría integral del 01-10-2026, hallazgo H2.

**Verificación:** prueba.py 1029 comprobaciones, 0 fallas (ctx54: 13); auditoria.py 111, 0 hallazgos; revisar.py sin problemas.

## Bloque 137 — Filtros por especie, programa, alcaldía e institución, y paginador nuevo (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.4.

**Qué cambió (D200, D201).** `js/util.js`: `llenarInstituciones()`, `elegirInstitucion()`, `llenarLista()` y
`enumerar()`. `js/registros.js`: `filtro` con especie, programa, alcaldía, tipo e institución;
`filtroVacio()`, `orgDe()`, `especieDe()`, `llenarListas()`, `llenarInstituciones()` y `elegidos()`
(fichas y resumen). `js/jornadas.js`: `filtro` con alcaldía, tipo e institución; `orgDe()`,
`alcaldiasFiltro()` y `llenarListas()`. `js/catalogos.js`: buscador y `#cat-filtro-tipo` en
Instituciones, lista agrupada por tipo. `index.html`: los selectores nuevos en «Más filtros» de
Registros y Jornadas, `#caja-cat-filtro-tipo` y `#cat-buscar-etiqueta`. `css/estilos.css`:
`.fila-botones > .campo` sin margen inferior (Usuarios y Catálogos alineados). Marca 0.9.4. Nueva
sección `ctx55`; dos pruebas anteriores del acordeón al día. `pruebas/auditoria.py`: comprobación
nueva de que ningún id se repita en `index.html` (el filtro de tipo de Catálogos nació con el id del
selector del formulario y lo dejaba sin responder; se llama `#cat-filtro-tipo`).
Paginador (D201): `SRP.util.tamPagina()`, `paginasVisibles()`, `paginar(lista, pagina, clave)` y
`pintarPaginador()` con botones de página, «Atrás», «Siguiente» y «Resultados por página»;
`CONFIG.TAMANOS_PAGINA`; estilos `.paginador-num`, `.paginador-salto` y `.paginador-tamano`. Pruebas
de paginación de `ctx37` al día.

**Verificación:** prueba.py 1047 comprobaciones, 0 fallas (ctx55: 17; ctx37 con el paginador nuevo); auditoria.py 112, 0 hallazgos; revisar.py sin problemas.

## Bloque 138 — Listas de filtro que dependen de las demás y Supervisión con su alcance (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.5.

**Qué cambió (D202).** `js/util.js`: `facetas()`, `tipoDe()`; `llenarLista()` y
`llenarInstituciones()` conservan lo elegido; `paresPersonas()` dice el perfil de la coordinación y
la Administración. `js/registros.js`: `VALORES`, `cumpleListas()` y `llenarListas()` con facetas,
llamada en cada `aplicar()`. `js/jornadas.js`: `cumpleListas()` y listas con facetas (quién registró
sale de las jornadas, no de los árboles). `js/supervision.js`: `cumple()`, `alcaldiasDe()`,
`llenarFiltros()` con facetas en cada `pintar()`, filtro `tipo` (`#sup-tipo`). `js/indicadores.js` y
`js/informes.js`: el tipo de institución filtra y titula. `index.html`: «Quién registró» en cinco
pantallas, `#caja-sup-tipo`, «Todo» en `#cmb-sobre`. Marca 0.9.5. Nueva sección `ctx56`. Origen:
auditoría de filtros del 01-10-2026 (F1, F2, F6, F9, F10).

**Verificación:** prueba.py 1058 comprobaciones, 0 fallas (ctx56: 9; ctx19, ctx20, ctx21, ctx44 y ctx49 al día con las listas nuevas); auditoria.py 112, 0 hallazgos; revisar.py sin problemas.

## Bloque 139 — Sustituir un árbol perdido y duplicados a 4 m (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.6.

**Qué cambió (D203).** `js/config.js`: `DUPLICADO_M` 4 y `MOTIVOS_SUSTITUCION`. `js/permisos.js`:
`registro.sustituir`. `js/registros.js`: `sustituir()`, `elegirMotivo()`, `seguirSustitucion()`,
`filasSustitucion()`; `eliminar()` y `restaurar()` devuelven o vuelven a sustituir al original en la
misma transacción. `js/formulario.js`: `estado.sustitucion`, `sustituir()`, `guardarSustituto()`; los
cuatro campos nuevos en `registroPrevisto()`; el original fuera del aviso de duplicado.
`js/jornadas.js`: `tonoPunto()` y la opción en la tuerca del punto. `js/referencias.js`:
`motivoSustitucion()`. `js/indicadores.js`, `js/supervision.js`, `js/informes.js`: sustitutos por
motivo y dos columnas en el CSV. `js/croquis.js`: punto morado. `js/carga.js` y `js/demostracion.js`:
los campos nuevos en nulo. `index.html`: `#dlg-sustituir`, `#btn-detalle-sustituir`, leyenda.
`css/estilos.css`: `--sustituto`, `--sustituto-fondo`, `[data-tono="sust"]`, `.marca-sustituto`.
`datos/esquema.json` (cuatro campos, dominio `motivo_sustitucion`, estatus `sustituido`, acción
`SUSTITUIDO`, relación), `DICCIONARIO-DATOS.md` regenerado y `MAPEO-CAMPOS.md`. Marca 0.9.6. Nueva
sección `ctx57`; dos pruebas al día con 4 m.

**Pendientes anotados (Liber):** los dos bloques de filtros que el plan llamaba 139 y 140 siguen por
hacer, con otro número: Reportes y Galería con el patrón completo, programa en Jornadas, perfil y tipo
en Usuarios (F3, F4, F5, F11); y la misma zona de filtros en los cinco módulos (F7, F8). Además, tres
peticiones para después (M333–M335): agregar árboles a una jornada en otro día; que otro cabo
registre en la jornada que inició un cabo distinto; y el mapa de colonias prioritarias de su modelo de
priorización.

**Verificación:** prueba.py 1070 comprobaciones, 0 fallas (ctx57: 12; tres pruebas anteriores al día con «Sustituir» y la leyenda); auditoria.py 114, 0 hallazgos; revisar.py sin problemas.


## Bloque 140 — Cada árbol con su fecha, jornada de varios días y relevo de cabo (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.7.

**Qué cambió (D204).** `js/jornada-activa.js`: `capturista()`, `abiertas()` por quien registra (titular o
relevo), `fechaInicial()`, `fechaElegida`, `pintarCampoFecha()`; `preparar()` pone la fecha según la
jornada o la sustitución; la confirmación de «Jornada de otro día» y el aviso al entrar dicen que se
puede seguir en ella; franja y «Cambiar jornada» con los días y el relevo; `relevo_id` y `relevos` al
iniciar. `js/formulario.js`: «Fecha de plantación» con «Hoy», validada entre el inicio de la jornada y
hoy; `sustituir()` recibe la fecha; guardar exige `jornada.registrar`; la ficha de revisión la lleva en
su renglón. `js/registros.js`: «Fecha de la sustitución» en `#dlg-sustituir`; `restaurar()` conserva
la fecha. `js/jornadas.js`: `jornadasAlcance()` con todos los árboles de una jornada en relevo y
`personas`; filtro «Quién registró» por titular o autor; lista y ficha con los días, el relevo y la
fecha de cada punto de otro día; `guardarEdicion()` y `mover()` con la regla del día de inicio;
`candidatosRelevo()`, `abrirRelevo()`, `relevar()`. `js/permisos.js`: `relevar` (sólo coordinación),
`personasDe()`, `jornada.registrar`, `jornada.relevo`. `js/util.js`: `diasJornada()`, `textoDias()`,
`fechaEnJornada()`. `js/indicadores.js`: árboles por su fecha de plantación y por su autor; jornadas
del periodo por inicio o por árboles; `soloDe` para «Mi avance». `js/supervision.js`: «Quién registró»
por personas. `js/reportes.js`: «Días de la jornada», «Relevo de cabo» y columna «Fecha». `index.html`:
`#caja-fecha-arbol`, `#sustituir-fecha`, `#btn-jornada-relevo`, `#dlg-relevo`. `css/estilos.css`:
`.lista-nota`. `js/carga.js`, `js/demostracion.js`, `js/espejo.js`: campos nuevos. `datos/esquema.json`
(`relevo_id`, `relevos`, acción `RELEVO`, R-P04, R-P09, R-J02, R-J05, S-13, indicadores),
`DICCIONARIO-DATOS.md` regenerado, `MAPEO-CAMPOS.md`, README y FASE2 (fila 18). Marca 0.9.7. Nueva
sección `ctx58`; la prueba sintética de indicadores da a sus árboles la fecha de su jornada.

**Corrección de Liber:** todo lo capturado hasta hoy es ficticio; el hallazgo H1 de la auditoría
(datos reales en la versión de prueba) deja de ser urgente. `SELLO_REINICIO` sigue sin cambiar.

**Verificación:** prueba.py 1101 comprobaciones, 0 fallas (ctx58: 31; tres pruebas anteriores al día con la fecha de plantación y los campos del relevo; una espera más firme en ctx44); auditoria.py 114, 0 hallazgos; revisar.py sin problemas.

## Bloque 141 — La misma zona de filtros en todos los módulos y aviso del relevo (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.8.

**Qué cambió (D205).** `js/filtros.js` (nuevo): `SRP.zonaFiltros.crear()`, zona compartida con
buscar, atajos, «Un periodo», «Más filtros», listas dependientes, fichas y «Quitar filtros» con
deshacer. `js/reportes.js` y `js/galeria.js` la usan (`zona`, `filtro` como lectura de `zona.filtro`);
se retiran sus atajos y listas propios. `js/jornadas.js`: filtro de programa, `fichas()`,
`quitarFiltros()`. `js/supervision.js`: fichas, «Quitar filtros» con deshacer, «Más filtros:».
`js/indicadores.js`: «Un periodo». `js/usuarios.js`: perfil y tipo de institución, `cumpleListas()`,
`llenarFiltros()`. `js/util.js`: `pintarFichas()`. `js/jornada-activa.js`: `avisarRelevos()`;
`js/app.js`: lo llama al entrar y `confirmar()` acepta `soloAceptar`. `js/registros.js`: la fecha de
la sustitución queda fija cuando el árbol perdido es de hoy. `index.html`: `#pdf-filtros`,
`#galeria-filtros`, fichas y «Quitar filtros» en Jornadas y Supervisión, `#jornada-programa`,
`#usr-filtro-perfil`, `#usr-filtro-tipo`. `css/estilos.css`: `.filtros-usuarios`. `esquema.json`
(S-13 con el aviso), `DICCIONARIO-DATOS.md`, FASE2 (fila 18), README. Marca 0.9.8. Nueva sección
`ctx59`; `ctx58` comprueba los avisos del relevo; ocho pruebas anteriores al día con los atajos y
los textos nuevos.

**Verificación:** prueba.py 1122 comprobaciones; la corrida completa dio 1 falla, que era de la propia prueba (contaba 6 listas en «Más filtros» de Jornadas y ahora son 7, con programa): se corrigió y se comprobó aparte (ctx59: 17; ctx58: 35, con los avisos del relevo); auditoria.py 114, 0 hallazgos; revisar.py sin problemas.

## Bloque 142 — Colonias prioritarias para reforestar (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.9.

**Qué cambió (D206).** `herramientas/generar_capas.py`: capa `prioritarias` (sólo colonia, alcaldía y
prioridad). `assets/capas/capa-prioritarias.js` (nueva, generada, 1 MB). `js/prioritarias.js` (nuevo):
`de()`, `textoPunto()`, `contar()`, `resumen()`, `pintar()`, `control()`, `alternar()`. `js/mapa.js` y
`js/jornadas.js`: control de la capa bajo el mapa; la ficha dice en qué prioridad cayeron los árboles.
`js/formulario.js`: «Prioridad de reforestación de la colonia». `js/indicadores.js`: `prioridad` y la
columna del detalle. `js/supervision.js`: apartado y `pintarMapaPrioridad()`. `js/informes.js`: apartado
del PDF y columna del CSV. `js/jornada-activa.js`: el mapa vuelve a medirse tras iniciar la jornada.
`index.html`: `#mapa-prioritarias`, `#dato-prioridad`, `#jornada-prioritarias`, `#jornada-prioridad`,
dos scripts. `css/estilos.css`: `--pri-0` a `--pri-4`, `.pri-*`. `esquema.json` (capa, calculado,
indicador), `DICCIONARIO-DATOS.md`, FASE2 (fila 19), README, `originales/LEEME.md`. `pruebas/auditoria.py`
revisa la geometría de las cuatro capas. Marca 0.9.9. Nueva sección `ctx60`.

**Verificación:** prueba.py 1133 comprobaciones; la corrida completa dio 2 fallas, las dos de la propia prueba (contaba cuatro campos de lectura del punto y ahora son cinco, con la prioridad; y una espera corta en ctx21 con la base de demostración): corregidas y comprobadas aparte (ctx60: 11; ctx21: 27, 0 fallas); auditoria.py 114, 0 hallazgos; revisar.py sin problemas.

## Bloque 143 — La prioridad en la jornada y en todos los informes (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.10.

**Qué cambió (D207).** `js/prioritarias.js`: `deJornada()`, `textoJornada()`, `insignia()`,
`opcionesFiltro()`, `claveFiltro()`, `textoFiltro()`. `js/jornada-activa.js`: `#ini-prioridad` al
detectar la ubicación y la prioridad en la franja. `js/jornadas.js`: `prioridad` en `jornadasAlcance()`,
marca en la tarjeta, en el encabezado de la ficha y en cada punto, filtro `prioridad` con su ficha.
`js/reportes.js`: filtro y marca en la lista; el modelo del reporte lleva «Prioridad de
reforestación», «Árboles por prioridad de la colonia», la columna «Prioridad» y la nota.
`js/indicadores.js`, `js/informes.js`, `js/supervision.js`: prioridad de cada jornada en la tabla
del informe y en la lista. `index.html`: `#ini-prioridad`, `#jornada-filtro-prioridad`.
`css/estilos.css`: `.pri-insignia`. `esquema.json` (calculado), `DICCIONARIO-DATOS.md`, FASE2 (fila 19).
Marca 0.9.10. Nueva sección `ctx61`.

**Verificación:** prueba.py 1144 comprobaciones. Primera corrida: se detuvo en ctx32 porque la lista de Jornadas tardaba al cruzar de una vez los árboles de todas las jornadas con la capa; la prioridad de la jornada pasó a calcularse sólo cuando se pide. Segunda corrida completa: 6 fallas, todas de pruebas que esperaban lo de antes (una lista más en «Más filtros», la columna «Prioridad» en la tabla de ejemplares, el encabezado de la ficha), puestas al día y comprobadas aparte (ctx25, ctx39, ctx59 y ctx61 en 0 fallas); auditoria.py 114, 0 hallazgos; revisar.py sin problemas.

## Bloque 144 — Paleta de prioridades (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.11.

**Qué cambió (D208).** `css/estilos.css`: variables `--p0` a `--p4` con la paleta que fijó Liber, en
lugar de `--pri-0` a `--pri-4`; `.pri-nivel-0` a `4` las usan. `js/prioritarias.js`: comentario al día.
`pruebas/prueba.py`: ctx60 comprueba los cinco colores. Marca 0.9.11.

**Verificación:** cambio sólo de colores: ctx60 (11) y ctx61 (11) en 0 fallas; auditoria.py 114, 0 hallazgos; revisar.py sin problemas. No se repitió la corrida completa (la última, del bloque 143, 1144 comprobaciones).

## Bloque 145 — Controles de la capa de prioridades sobre el mapa (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.12.

**Qué cambió (D209).** `js/prioritarias.js`: `control(mapa, { grupo, leyenda, interruptor, interactiva })`
arma sobre el mapa un botón de capas con su panel (interruptor, cinco niveles y opacidad); el ajuste
se guarda por grupo de mapas en `srp_capa_prioritarias`. `js/iconos.js`: icono `capas`. `js/mapa.js`,
`js/jornadas.js`, `js/supervision.js`: usan el control. `css/estilos.css`: `.pri-capas…`,
`.pri-sin-N`. `index.html`: sale la casilla de debajo del mapa. `pruebas/prueba.py`: ctx60 al día.

**Verificación:** se probó junto con el bloque 146 (una sola corrida completa): prueba.py 1167 comprobaciones, 0 fallas; auditoria.py 116, 0 hallazgos; revisar.py sin problemas.

## Bloque 146 — Origen de la jornada: programada o pedido especial (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.13.

**Qué cambió (D210).** Nuevo `js/pedido.js` (`SRP.pedido`): el bloque de campos «Origen de la jornada»
(el mismo en «Iniciar jornada» y «Editar jornada»), su lectura y validación, la marca de las tarjetas
y el filtro «Origen». `js/jornada-activa.js`: `iniciarJornada()` guarda `origen`, `solicitante_id`,
`solicitante_otro` y `pedido_descripcion`; la franja lo dice. `js/jornadas.js`: edición, tarjeta,
encabezado de la ficha y filtro. `js/reportes.js`: tarjeta, filtro y dos renglones en el reporte.
`js/indicadores.js`: `pedidos` (jornadas, árboles y solicitantes), filtro `origen` y tres columnas
en el detalle. `js/supervision.js` y `js/informes.js`: filtro, apartado «Pedidos especiales» y CSV.
`js/util.js`: `llenarLista` acepta un orden propio. `js/carga.js` y `js/demostracion.js`: las
jornadas nacen con el origen (la demostración trae pedidos de SOBSE, de una alcaldía y de una
instancia fuera del catálogo). `js/espejo.js`, `datos/esquema.json` (cuatro campos, dominio
`origen_jornada`, relación, R-J06, S-14), `DICCIONARIO-DATOS.md`, `MAPEO-CAMPOS.md`, `README.md`,
FASE2 (fila 20). No se pide oficio ni folio. Marca 0.9.13. Nueva sección `ctx62` (17 comprobaciones).
Pendiente anotado: M343, marcar las especies frutales en el catálogo.

**Verificación:** prueba.py 1167 comprobaciones. Primera corrida completa: 6 fallas, todas de pruebas que esperaban lo de antes (una lista más en «Más filtros», cuatro campos más en el espejo de la jornada, tres columnas más en el CSV), puestas al día. Segunda corrida completa: 0 fallas; auditoria.py 116, 0 hallazgos; revisar.py sin problemas.

## Bloque 147 — El panel de la capa cabe en el teléfono y auditoría de CSS (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.14.

**Qué cambió (D211).** `css/estilos.css`: `.pri-capas` en fila (el panel al lado del botón),
`.pri-capas-niveles` en dos columnas, `.pri-capas-opacidad` en un renglón, filas de 34 px.
`js/prioritarias.js`: al abrir, el panel toma como máximo el alto y el ancho del mapa.
`pruebas/prueba.py`: ctx60 comprueba que el panel cabe a 390 y a 320 px de ancho. Nueva
`pruebas/auditoria_css.py` (sólo lee). Pendientes anotados: M345, limpieza de la hoja. Marca 0.9.14.

**Verificación:** cambio de estilos del panel: ctx60 (18) en 0 fallas; auditoria.py 116, 0 hallazgos; revisar.py sin problemas. No se repitió la corrida completa (la última, del bloque 146, 1167 comprobaciones, 0 fallas). auditoria_css.py: norma dura, 14 hallazgos (selectores declarados dos veces, anteriores a este bloque).

## Bloque 148 — Limpieza de la hoja de estilos (01-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.15.

**Qué cambió (D212).** `css/estilos.css`: tokens nuevos (`--e-15`, `--e-25`, `--t-xxs`, `--radio-chico`,
`--radio-min`, `--radio-grande`, escala `--z-*`, `--dur-rapida`, `--dur-media`); 41 espacios, 18 radios,
4 tamaños de letra, 17 capas y 6 transiciones pasan a token; fuera `.aviso-envio`, `.campo-doble-fijo`
y `.filtros-fila` (siete reglas); lo propio de `.barra-jornada .btn` y `.franja-jornada-acciones .btn`
va en su regla; se unen `.btn-cancelar` y `.btn-peligro-linea`, `.jornada-titulo-caja` y `.jornada-datos`,
y los `thead` ocultos de las tablas en teléfono. `pruebas/auditoria_css.py`: criterios afinados (grupo
más caso propio, em relativos, bloques idénticos sólo del mismo componente) y código de salida;
`pruebas/auditoria.py` la corre. `README.md`. Marca 0.9.15.

**Verificación:** estilos calculados de todos los elementos comparados antes y después en 114 pantallas (164,226 elementos): sólo cambian los ajustes previstos, de 1 px o menos, y radios de píldora equivalentes; ningún cambio por orden de reglas. prueba.py 1168 comprobaciones, 0 fallas; auditoria.py 117, 0 hallazgos (incluye auditoria_css.py: norma de la hoja, 0 hallazgos); revisar.py sin problemas.

## Bloque 149 — Sin conexión: versión completa, pendientes y árbol a medias (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.16.

**Qué cambió (D213).** `sw.js`: si la red trae una versión distinta de la del worker, sirve la página
guardada; guarda los tres iconos del manifiesto. `js/conexion.js`: `buscarVersionNueva()` (pregunta la
versión publicada y registra su worker), `aplicarVersionNueva()` (recarga cuando no interrumpe).
`js/envio.js`: `enviar()` marca el envío en curso antes de cualquier espera (`_enviar()` hace el trabajo)
y refresca el indicador también sin señal. `js/formulario.js`: `guardarBorrador()`, `recuperarBorrador()`,
`quitarBorrador()`; `limpiar(conservarBorrador)`. `js/jornada-activa.js`: recupera el borrador al preparar
«Nuevo registro». `js/app.js`: `mostrarVista(nombre, desdeHistorial)` anota la sección en el historial y
atiende «atrás». `datos/esquema.json`: clave `srp_borrador_arbol` y reglas S-15 a S-18; diccionario y
`js/esquema.js` regenerados. `docs/FASE2-Y-TRASPASO.md`: filas 21 a 24. `pruebas/prueba.py`: ctx63. Marca 0.9.16.

**Verificación:** prueba.py 1182 comprobaciones, 0 fallas (ctx63, 14 nuevas: versión nueva incompleta y completa, indicador sin señal, borrador, «atrás», folio único al volver la señal, iconos en caché); auditoria.py 117, 0 hallazgos; revisar.py sin problemas. La prueba del doble toque en «Guardar» da el segundo toque en el mismo instante que el primero, sin depender de la posición del botón.

## Bloque 150 — Lo que se descarga: tabla sin fórmulas, Roboto en el PDF y totales que suman (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.17.

**Qué cambió (D214).** `js/informes.js`: la tabla CSV antepone un apóstrofo a los textos que empiezan como
fórmula; el informe se escribe con Roboto; «Árboles por jornada» con punto decimal; un título de sección
no se queda solo al pie de la página. `js/reportes.js`: `leerFuentes()` y `ponerFuentes(doc)` incrustan
Roboto (normal, negrita y cursiva) en el informe y en el reporte de la jornada; sin los archivos, sale con
Helvetica. `js/util.js`: `formatearFechaHora()` da «02-OCT-2026, 12:07 h». `js/indicadores.js`: los
eliminados se asignan al periodo por día local; en la serie, cada jornada cuenta en la casilla de su
primer árbol del periodo. `js/supervision.js`: punto decimal en el promedio. `sw.js`: guarda las tres
tipografías TTF. `vendor/fuentes/`: `roboto-regular.ttf`, `roboto-bold.ttf`, `roboto-italic.ttf` y
`Roboto-OFL.txt`; `vendor/LICENCIAS.md` al día. `pruebas/prueba.py`: ctx64. Marca 0.9.17.

**Verificación:** prueba.py 1190 comprobaciones, 0 fallas (ctx64, 8 nuevas: serie que suma, CSV sin
fórmulas, Roboto incrustada en informe y reporte, sello, eliminados por día local); auditoria.py 117,
0 hallazgos; revisar.py sin problemas. Tres comprobaciones anteriores dependían de esperas fijas o del
orden de dos árboles guardados en el mismo instante y fallaban de forma intermitente en un equipo más
lento, también con la versión 0.9.16: ahora esperan el resultado (guardado del árbol y relevo en los
bloques 140 y 141, tabla de Usuarios) o comparan sin depender del orden (prioridad por punto).

## Bloque 151 — Jornadas y reporte: un solo inicio, reporte vigente y sustitución que cierra (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.18.

**Qué cambió (D215).** `js/jornada-activa.js`: `iniciarJornada()` no guarda dos veces (`guardarJornadaNueva()`
hace el alta); `cambiarEstatus()` anula `reporte_en` al reabrir; `reabrirParaSustituto()` pregunta antes de
reabrir y `volverACerrar()` cierra de nuevo. `js/reportes.js`: `aceptar()` ya no fija `reporte_en`;
`marcarGenerado()` lo fija al entregar el PDF; `caducar()` devuelve las escrituras que lo anulan.
`js/registros.js`: eliminar y restaurar anulan el reporte de la jornada; la sustitución en jornada cerrada
pasa por la pregunta. `js/formulario.js`: editar un árbol anula el reporte de su jornada; `sustituir()`
recuerda la jornada reabierta y `cerrarReabierta()` la cierra al guardar, al cancelar o al salir.
`js/jornadas.js`: mover un árbol anula el reporte de las dos jornadas. `datos/esquema.json` y
`js/espejo.js`: regla de `reporte_en`; diccionario y `js/esquema.js` regenerados.
`docs/FASE2-Y-TRASPASO.md`: fila 25. `pruebas/prueba.py`: ctx65. Marca 0.9.18.

**Verificación:** prueba.py 1200 comprobaciones, 0 fallas (ctx65, 10 nuevas: un solo inicio con dos toques,
vista previa que no marca, reporte generado al entregar, reporte sin vigencia al eliminar un árbol,
pregunta antes de reabrir, cierre al cancelar y al guardar el sustituto); auditoria.py 117, 0 hallazgos;
revisar.py sin problemas. La pregunta de la sustitución vive en el módulo de la jornada: en
`js/registros.js` sigue sin haber confirmaciones (D139).

## Bloque 152 — Pruebas en cualquier equipo, textos al día y accesibilidad de los mapas (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.19.

**Qué cambió (D216).** `pruebas/prueba.py`, `auditoria.py` y `revisar.py`: sin rutas fijas; `SRP_BASE` y
`SRP_SALIDA`; `pruebas/requisitos.txt`. `README.md`: sección «Pruebas» con bibliotecas y tiempos reales, y
nombres de pantalla. `js/jornada-activa.js`: la fecha máxima se pone cada vez que se muestra «Iniciar
jornada». `js/supervision.js`: los dos mapas pasan de imagen a grupo con etiqueta. `css/estilos.css`: área
sensible del indicador de conexión. `js/demostracion.js`: aviso de carga al día. `datos/esquema.json`:
cinco catálogos; diccionario y `js/esquema.js` regenerados. Comentarios sin nombres propios en
`js/app.js`, `config.js`, `formulario.js`, `iconos.js`, `indicadores.js`, `reportes.js` e `index.html`.
`pruebas/prueba.py`: ctx66. Marca 0.9.19.

**Verificación:** las tres pruebas se corrieron desde una copia del proyecto en otra carpeta (con un
espacio en la ruta) y otro puerto: prueba.py 1204 comprobaciones, 0 fallas (ctx66, 4 nuevas: fecha
máxima, área de toque del indicador, mapas como grupo); auditoria.py 117, 0 hallazgos; revisar.py sin
problemas.

## Bloque 153 — Catálogo propio de solicitantes de pedidos especiales (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.20.

**Qué cambió (D217).** `js/datos-ficticios.js`: 20 solicitantes de arranque (16 alcaldías sin la palabra,
SOBSE, SEGIAGUA, Jefatura de Gobierno, Diputadas y diputados). `js/referencias.js`: `TIPOS_SOLICITANTE`,
`nombreSolicitante()`, `ordenSolicitantes()`. `js/pedido.js`: «Quién lo solicita» sale del catálogo de
solicitantes, agrupado por tipo. `js/catalogos.js` e `index.html`: pestaña «Solicitantes» con buscador,
filtro por tipo, alta, edición, desactivación y eliminación sin uso; campo «Tipo de solicitante».
`js/almacen.js` `normalizar()`: la jornada cuyo solicitante era una institución pasa a su solicitante o
queda como «Otra instancia». `js/config.js`: sello `2026-10-02-solicitantes`. `js/configuracion.js`,
`js/espejo.js`, `js/demostracion.js`: textos e ids al día. `datos/esquema.json`: seis catálogos, dominio
`tipo_solicitante`, campo `catalogos.tipo_solicitante`, relación de `jornadas.solicitante_id`, R-C06, R-J06
y S-14; diccionario y `js/esquema.js` regenerados; `datos/MAPEO-CAMPOS.md`. `README.md` y
`docs/FASE2-Y-TRASPASO.md` (fila 20). `pruebas/prueba.py`: ctx62 al día y ctx67. Marca 0.9.20.

**Verificación:** prueba.py 1216 comprobaciones, 0 fallas (ctx67, 12 nuevas: solicitantes de arranque,
pestaña, búsqueda y filtro, alta con validación, lista agrupada, edición, uso y desactivación,
eliminación, paso de las jornadas de antes y llegada del catálogo a un teléfono con capturas);
auditoria.py 115, 0 hallazgos (sin las dos comparaciones de capas contra `originales/`, que la copia de
prueba no trae); auditoria_css.py 0 hallazgos; revisar.py sin problemas.

## Bloque 154 — Registrar viendo la jornada: editarla desde la franja, sus árboles en el mapa y aviso al llegar a lo previsto (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.21.

**Qué cambió (D218).** `index.html`: `#btn-franja-editar` en la franja de la jornada activa, `#mapa-plantados`
bajo el mapa de registro, `#confirmacion-completa` en la confirmación de guardado y `dialogo-pie-doble` en el
pie de la ficha del registro. `js/jornadas.js`: `abrirEditar(jornada, desdeRegistro)` y `guardarEdicion()`
trabajan sobre `enEdicion`; desde «Nuevo registro» repintan la franja en lugar de abrir la ficha.
`js/mapa.js`: `pintarPlantados()`, `elegirPlantado()` y `pintarRenglonPlantados()` dibujan los árboles de la
jornada como puntos con etiqueta y acceso a su ficha; el marcador de gota va siempre encima.
`js/jornada-activa.js`: `preparar()` pinta los puntos (al corregir, los demás de la jornada) y la franja
resalta lo previsto cumplido o cuántos van de más. `js/formulario.js`: `confirmarGuardado()` recibe lo previsto
cuando el árbol guardado lo completa. `js/registros.js`: eliminar o restaurar desde «Nuevo registro» pone al
día franja y mapa; la fecha de la sustitución ya no se bloquea. `js/app.js`: tocar un campo de fecha con
«Hoy» abre el calendario. `js/reportes.js`: sin la gráfica «Ejemplares por especie»; la sección 6 es
«Distribución de las especies». `css/estilos.css`: puntos y renglón del mapa, aviso de jornada completa,
pie doble, fecha sin botón de calendario y botones de la franja en teléfono; fuera las reglas de las barras.

**Verificación:** prueba.py 1240 comprobaciones (ctx68, 24 nuevas: botón de la franja, puntos y su
etiqueta, «Ver», edición sin salir, aviso de jornada completa, pie de la ficha, fecha de la sustitución).
La corrida completa dio 1 falla, ajena al bloque: la prueba del buscador de Catálogos leía la etiqueta a
un tiempo fijo; ahora espera a verla, igual que la del reinicio por sello, y cada una pasó varias veces
seguidas corrida aparte. No se repitió la corrida completa después de ese ajuste. auditoria.py 118, 0
hallazgos; revisar.py sin problemas. El bloque se montó sobre los Bloques 152 y 153, cerrados el mismo
día en otra sesión: los cambios se fusionaron archivo por archivo y la corrida se hizo sobre el resultado.
Queda anotado M369 (los cabos descargan sus fotografías), pendiente.

## Bloque 155 — Listas que se ordenan, sustituciones a la vista, varios coordinadores por cabo y mapa de colonias intervenidas (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.22.

**Qué cambió (D219).** `js/util.js`: `ordenLista()`, `ordenar()` y `pintarOrden()`; `index.html`: barra
`lista-barra` con `#jornadas-orden`, `#registros-orden`, `#pdf-orden` y `#galeria-orden`. `js/jornadas.js`,
`js/registros.js`, `js/reportes.js` y `js/galeria.js` ordenan su lista con ellas; la tarjeta de la jornada
suma la cifra de sustituciones. `datos/esquema.json`: `usuarios.coordinadores_ids` (uuid[]) en lugar de
`coordinador_id`, con sus reglas y relación; `js/esquema.js` y `DICCIONARIO-DATOS.md` regenerados.
`js/almacen.js`: `normalizar()` pasa el campo anterior a la lista. `js/usuarios.js`: lista de botones
`#usr-coordinadores`, validación, bitácora y etiquetas «Cargo» y «Perfil de captura». `js/permisos.js`,
`js/indicadores.js`, `js/jornadas.js` (relevo), `js/demostracion.js` y `js/datos-ficticios.js` leen la
lista. `js/prioritarias.js`: `de()` devuelve el id de la colonia y `pintar()` acepta `intervenidas`;
`js/indicadores.js` cuenta los árboles por colonia y `js/supervision.js` pinta sólo esas colonias.
`css/estilos.css`: barra de orden y rejilla de seis cifras (cuatro chicas por renglón; de dos en dos en
teléfono). `js/datos-ficticios.js`: solicitante «Oficina de la Secretaría»; `js/referencias.js`: las
dependencias antes que las alcaldías y ese solicitante primero; `js/pedido.js`: descripción obligatoria;
`js/config.js`: sello de datos `2026-10-02b-oficina`.

**Verificación:** prueba.py 1257 comprobaciones, 0 fallas (ctx69, 16 nuevas: orden en Jornadas y Registros,
cifra de sustituciones, etiquetas de Usuarios, cabo con dos coordinadores y su alcance, paso del campo
anterior a la lista, mapa con sólo la colonia intervenida; más la descripción obligatoria del pedido en
ctx62); auditoria.py 118, 0 hallazgos; revisar.py sin problemas.

## Bloque 156 — El reporte en la ficha de la jornada, fotografías del cabo y capa de prioridad apagada en campo (02-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.23.

**Qué cambió (D220).** `index.html`: fuera la pestaña «Reportes» y `#vista-reportes`; `#jornada-reporte` en
«Más filtros» de Jornadas; `#galeria-nota`. `js/reportes.js`: sin lista ni zona de filtros; conserva el
cierre, la vista previa y el PDF, y al entregar refresca Jornadas. `js/jornadas.js`: `irAlReporte()` abre
el cierre en el sitio; filtro `reporte` (`claveReporte()`, ficha, resumen de «Más filtros»); insignia
`insignia-reporte` en la tarjeta. `js/app.js`: una sección que no existe lleva a Jornadas.
`js/permisos.js`: el cabo tiene `galeria`; `js/galeria.js`: nota y regreso según el alcance.
`js/prioritarias.js`: en campo la capa arranca apagada (clave `srp_capa_prioritarias_2`),
`coloniasDe()`, y `pintar()` rehace la capa cuando cambian las colonias; `js/mapa.js` y `js/jornadas.js`
le dan las colonias de la jornada. `js/mapa.js`: el encuadre de los árboles espera a que el mapa esté a
la vista. `css/estilos.css`: fuera las reglas de la tarjeta de Reportes.

**Verificación:** prueba.py 1256 comprobaciones (ctx70, 13 nuevas: reporte desde la ficha, tarjeta y filtro
«Reporte», fotografías del cabo; y las pruebas que dependían de la lista de Reportes, reescritas sobre
Jornadas). La corrida completa dio 1 falla, de una prueba que contaba cinco listas «Quién registró» (ahora
son cuatro); se ajustó y pasó corrida aparte. revisar.py pedía la vista Reportes: ahora revisa las
fotografías del cabo, y pasa sin problemas. auditoria.py 118, 0 hallazgos. No se repitió la corrida completa
después de esos dos ajustes de prueba.


## Bloque 157 — Origen de la jornada obligatorio, tarjeta de jornada con avance y «Nuevo registro» compacto (03-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.24.

**Qué cambió (D221, D222, D223).** `js/jornada-activa.js`: la franja lleva `franja-jornada-avance` (cuántos van y su
barra) y, en teléfono, «Ver detalle» (`pintarDetalle()`) para fecha, lugar, programa, pedido, prioridad y
pasos. `js/formulario.js`: la ficha del punto (`#campo-punto`) aparece sólo con punto; en la revisión de un
árbol nuevo con avisos el botón dice «Guardar de todos modos»; si quedó lejos, el mapa pinta los demás
árboles (`revision-otro`) y se ofrece «Cambiar jornada» (`#btn-resumen-cambiar`). `js/app.js` y
`js/conexion.js`: el aviso de iPhone sale al entrar, no al primer guardado. `js/prioritarias.js`: la leyenda
dice sólo los niveles que el mapa pinta. `css/estilos.css`: ficha del punto en un renglón, zona de
fotografía del alto de un botón y sin nombre de archivo, comentarios de un renglón que crece. `js/jornadas.js`: la tarjeta de la lista lleva una línea de avance
(`jornada-avance`: registrados de previstos, «completa», especies), su barra (`jornada-barra`, un SVG: la
política de seguridad no admite estilos en línea), el estado con la hora de cierre y «Reporte: fecha y
hora» (`cuandoCorto()`), programa y, para quien ve jornadas de otros, el responsable; las marcas
(`jornada-marcas`) salen sólo cuando hay algo: por revisar, lo que no cuadra con lo previsto,
sustituciones y «Sin reporte todavía». Fuera las seis cajas de cifras. `js/prioritarias.js`: la tarjeta dice
«Colonia de prioridad…». `js/pedido.js`: «Pedido especial · Solicita: …», y una alcaldía se nombra con su
tipo. `css/estilos.css`: estilos de la tarjeta; fuera la rejilla de cifras. `js/pedido.js`: la lista de origen abre sin elegir («Seleccione el origen») al
iniciar una jornada, lleva asterisco y `errores()` la exige; al editar conserva el origen de la jornada.
`docs/FASE2-Y-TRASPASO.md`: el alcance de la coordinación nombra `coordinadores_ids`.

**Verificación:** prueba.py 1265 comprobaciones, 0 fallas (ctx71, 8 nuevas: franja compacta y su detalle,
ficha del punto, guardado directo, revisión de un árbol lejos, revisión al corregir; ctx62, el origen sin
elegir; y las pruebas de la tarjeta, la franja y la leyenda, adaptadas). Las fallas se imprimen ahora en
cuanto ocurren, y dos esperas fijas pasaron a esperar su condición. auditoria.py 118, 0 hallazgos;
auditoria_css.py 0; revisar.py sin problemas. No probado en iPhone real.

## Bloque 158 — Perfil Directivo, de sólo lectura (03-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.25.

**Qué cambió (D224).** `js/permisos.js`: `SRP.PERFILES.DIRECTIVO` (sin registrar, editar, eliminar, relevar,
catálogos ni cuentas; con fotografías); `de()` da alcance `institucion` al directivo de fuera de la
Secretaría y `alcanza()` lo resuelve por la institución de la jornada o de quien capturó.
`js/reportes.js`: `descargar()` y vista previa de sólo lectura («Descargar PDF», sin «Corregir datos de
cierre»); `entregar()` no marca el reporte ni escribe historial en ese caso. `js/jornadas.js`: sin permiso
sobre la jornada, el botón es «Descargar reporte» y sólo aparece si ya hay reporte; «Revisar puntos» es
de quien puede modificarla. `js/indicadores.js`, `js/informes.js`, `js/registros.js`, `js/supervision.js`,
`js/app.js`: textos y cuadrillas del alcance por institución; el directivo entra a Supervisión.
`js/datos-ficticios.js`: cuentas `u-dir-1` (Secretaría) y `u-dir-alc` (alcaldía); `SELLO_DATOS`
`2026-10-03-directivo`.

**Verificación:** prueba.py 1274 comprobaciones, 0 fallas (ctx72, 9 nuevas: lo que el directivo ve y lo que
no puede, la descarga del reporte sin escribir, el alcance por institución y el catálogo de perfiles; y las
pruebas que contaban cuentas y perfiles, al día con las trece cuentas y los cuatro perfiles).
auditoria.py 118, 0 hallazgos; auditoria_css.py 0; revisar.py sin problemas. No probado en iPhone real.

## Bloque 159 — Revisión del modelo de datos: campos, etiquetas y diccionario (03-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.26. Sólo documentación y auditoría: la aplicación no cambia.

**Qué se revisó.** Una base de datos con cinco tablas (`plantaciones` 30 campos, `usuarios` 13, `catalogos`
20, `bitacora` 9, `jornadas` 41: 113 campos) y 16 dominios. Lo que el sistema guarda coincide con
`datos/esquema.json` campo por campo, con sus llaves e índices; el diccionario está regenerado.

**Qué se corrigió.** `datos/esquema.json`: «Personal participante» (decía «Personal de SEDEMA
participante»), «Registrar árbol» (decía «Registrar faltante») y la tarjeta del reporte; versión del esquema
2026-10-03. `datos/MAPEO-CAMPOS.md`: la tabla de la jornada lleva la columna «Etiqueta en pantalla» (no la
tenía) y la de la bitácora dice las nueve acciones y las cinco entidades (decía cinco y cuatro).
`pruebas/auditoria.py`: seis comprobaciones nuevas —el mapeo nombra todos los campos de cada tabla, y
cada etiqueta del mapeo es la que la pantalla dice—.

**Verificación:** auditoria.py 124 comprobaciones, 0 hallazgos; auditoria_css.py 0. La corrida completa de
prueba.py no se repitió: no cambió código de la aplicación (la última, del bloque 158, 1274 y 0 fallas).

## Bloque 160 — Cada catálogo en su tabla (03-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.27. Base del teléfono, versión 8.

**Qué cambió (D225).** `js/almacen.js`: diez tablas (`ALMACENES`); `TABLA_DE_TIPO`, `TABLAS_CATALOGO` y
`CAMPOS_CATALOGO`; `catalogos()`, `catalogo(id)`, `guardarCatalogo()`, `borrarCatalogo()`, `ponerCatalogo()` y
`quitarCatalogo()`; migración 8, que reparte la tabla única; `rehacerConservando()` reparte también lo de una
base anterior; `normalizar()`, `completarCatalogos()` y `sembrar()` escriben en la tabla de cada catálogo.
`js/referencias.js`: lee los seis catálogos y `usosDe('catalogos')` cuenta contra las seis tablas.
`js/catalogos.js` y `js/demostracion.js`: guardan y eliminan con las funciones nuevas.
`datos/esquema.json`: seis tablas en lugar de una, relaciones y reglas al día; `datos/MAPEO-CAMPOS.md`,
`README.md` y `docs/FASE2-Y-TRASPASO.md` (fila 26). `herramientas/generar_diccionario.py`: el borrador de
PostgreSQL dice que las tablas son las mismas en ambos lados.

`js/almacen.js` abre además en dos pasos una base anterior a la versión 7 (`versionActual()`, `subirA()`):
primero la lleva a la 7 y después reparte los catálogos, porque retirar la tabla única mientras una
migración anterior la recorre interrumpía la actualización.

**Verificación:** prueba.py 1280 comprobaciones, 0 fallas (ctx73, 6 nuevas: la migración desde la versión 7
con un renglón de cada catálogo, las diez tablas, los campos propios de cada una, el uso contado contra
su tabla y la escritura desde la pantalla; las cuatro pruebas de migración desde versiones 2 a 6 llegan
ahora a la 8). auditoria.py 139 comprobaciones, 0 hallazgos; auditoria_css.py 0; revisar.py sin problemas.
No probado en iPhone real.

## Bloque 161 — Menos filtros (03-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.28. Base del teléfono, versión 8 (sin cambio).

**Qué cambió (D226).** `index.html`, `js/jornadas.js`, `js/registros.js` y `js/filtros.js`: seis atajos de
periodo (Todas, Hoy, Este mes, Este año, Un día, Un periodo); sin listas de Año ni de Mes.
`js/util.js`: `llenarInstituciones()` arma una sola lista agrupada por tipo; se retira la pareja
dependiente tipo–institución, y `facetas()` deja de tratarla aparte. `js/jornadas.js`: «Pendientes»
incluye «Sin reporte todavía»; se retiran los filtros Reporte y Prioridad de la colonia.
`js/supervision.js`, `js/indicadores.js`, `js/informes.js` y `js/usuarios.js`: sin tipo de institución
como filtro. `css/estilos.css`: `.chips-seis` (tres columnas en el teléfono, seis con ancho); se retira
`.chips-cuatro`.

**Simplicidad, fija.** `pruebas/auditoria.py` cuenta los filtros de cada vista —cada lista, cada
búsqueda y el grupo de atajos— y falla si alguna pide más de ocho, o más de cuatro a la vista.
`README.md`, «Al cerrar un bloque»: se dice qué se agregó a la pantalla y qué se pudo quitar.

**Cuenta:** Supervisión 7 → 6, Registros 9 → 6, Jornadas 13 → 8, Fotografías 11 → 8, Usuarios 5 → 4;
Catálogos 3 y Registro de cambios 2, sin cambio. Total, 50 → 37.

**Verificación:** prueba.py 1280 comprobaciones; la corrida completa dio una falla, de una comprobación
que aún esperaba las listas anteriores de Fotografías: se corrigió la comprobación y su sección (ctx59) se
repitió sin fallas. ctx74, 6 nuevas: seis atajos en dos renglones de tres en el teléfono y en uno con
ancho, tope de filtros por vista, y «Este año» con su ficha. auditoria.py 141 comprobaciones, 0 hallazgos;
auditoria_css.py 0; revisar.py sin problemas. No probado en iPhone real.

## Bloque 162 — Plan de traspaso al SIA y huella de capas (03-10-2026)
Etapa 1. Estado: **cerrado**. Sin cambio en la aplicación ni en la versión (0.9.28).

**Qué se decidió.** En el SIA el SRP entra como proyecto nuevo, con otro nombre: no reutiliza el módulo ni
el esquema de plantación que ya existen ahí. Las capas se consumirán del esquema territorial del SIA,
previa comprobación de que son las mismas.

**Qué se agregó.** `docs/PLAN-TRASPASO-SIA.md`: punto de partida, arquitectura de destino, verificación de
capas, siete fases con responsable y criterio de salida, decisiones de arranque, capacidad y riesgos. No
lleva direcciones de red, nombres de equipo ni versiones exactas: el repositorio es público.
`herramientas/huella_capas.py`: escribe `datos/HUELLA-CAPAS.md` y `datos/HUELLA-CAPAS.json` —por capa,
polígonos, claves, superficie y envolvente; por polígono, superficie y centroide— y, con un archivo de
otra fuente, dice qué claves faltan, cuáles sobran y qué polígonos cambiaron. Trae la consulta de PostGIS
para obtener la huella del otro lado. `docs/FASE2-Y-TRASPASO.md`, apartado 4, y `README.md`.

**Hallazgo.** Las colonias no coinciden en número: 1,837 polígonos del IECM 2022 en el SRP y 1,817
unidades territoriales en el esquema del SIA. Hay que conciliarlas antes de derivar en el servidor.

**Verificación:** la huella comparada contra sí misma da las tres capas iguales. Contra la base del SIA no
se ha corrido: requiere acceso a su red.

## Bloque 163 — Supervisión y «Mi avance» en resumen (03-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.29.

**Qué cambió (D227).** `js/supervision.js`: `html()` arma cifras (cuatro o tres), «Qué atender», el ancla
de las descargas, la gráfica y los desgloses como `details.sup-seccion` con su resumen; `abierta()`,
`alPlegar()` y `abrirTodo()` llevan qué está abierto; los mapas se dibujan al abrir su sección;
`tabla()` pone la etiqueta de cada celda; «Por cabo» separa a quienes no tuvieron jornadas;
`verJornadas()` abre Jornadas con el periodo y los filtros; el cabo no ve pedidos, eliminados, ediciones
ni CSV. `index.html`: `#sup-acciones`. `css/estilos.css`: `.sup-seccion`, `.sup-resumen`, `.sup-pendiente`
y, hasta 700 px, las tablas de Supervisión como renglones. Sin cambio en `js/indicadores.js`, en el
informe en PDF ni en la tabla CSV.

**Qué cambió (D231).** `index.html` y `js/app.js`: «Configuración» es una pestaña de la barra de
secciones para la Administración global y deja el menú de la cuenta; queda marcada también dentro de
sus apartados. Supervisión va al final de la barra para quien registra (`p.registrar`).
`js/catalogos.js` y `js/util.js`: las alcaldías, sólo con su nombre en el catálogo y en las listas
de institución.

**Pantalla: qué se agregó y qué se quitó.** Se agregó el renglón-resumen de cada desglose y el enlace a
Jornadas. Se quitaron dos cifras (especies y alcaldías, que pasaron al resumen de su sección), la lista de
jornadas cerradas y, para el cabo, pedidos especiales, eliminados, ediciones y la tabla CSV. En el
teléfono, con los datos de demostración: Administración global, de 12,480 a 2,570 px; cabo, de 4,160 a 1,225.

**Verificación:** prueba.py 1291 comprobaciones, 0 fallas (ctx75, 10 nuevas: largo de la pantalla, cifras,
secciones plegadas con su resumen, descargas bajo las cifras, cabos sin jornadas aparte, mapa al abrir,
tablas en renglones sin salirse de lado, lo abierto se conserva, enlace a Jornadas con el periodo, «Mi
avance» del cabo con sus dos mapas, y todo abierto con ancho). Las comprobaciones anteriores del contenido
abren antes los desgloses (`abrir_sup`). auditoria.py 141 comprobaciones, 0 hallazgos; auditoria_css.py 0;
revisar.py sin problemas. No probado en iPhone real.

## Bloque 164 — Eliminar pide escribirlo (04-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.30.

**Qué cambió (D228).** `js/app.js`: `confirmar()` acepta `escribir` (lo que hay que teclear) y
`escribirEtiqueta`; `revisarPalabra()` activa el botón cuando coincide; el foco entra al campo e Intro
confirma. `index.html`: `#dlg-confirmar-escribir` con `#confirmar-palabra`. `js/catalogos.js` pide
«ELIMINAR»; `js/usuarios.js`, el correo de la cuenta. `css/estilos.css`: `.confirmar-escribir`.

**Pantalla: qué se agregó y qué se quitó.** Un campo, sólo en esas dos confirmaciones. Nada se quitó.

**Verificación:** prueba.py 1299 comprobaciones, 0 fallas (8 nuevas: en la eliminación de una cuenta, el
botón espera, otro correo no lo activa e Intro no elimina; ctx76, lo mismo para un valor de catálogo, el
campo vuelve vacío y las demás confirmaciones no piden escribir). auditoria.py 141 comprobaciones, 0
hallazgos; auditoria_css.py 0; revisar.py sin problemas. No probado en iPhone real.

## Bloque 165 — Deshacer una carga masiva pide escribirlo (04-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.31.

**Qué cambió (D228).** `js/carga.js`: la confirmación de «Deshacer carga» pide escribir «DESHACER».
Siguen sin palabra, por decisión, eliminar una jornada vacía y restablecer los datos de prueba.

**Corrección de un error del bloque 163.** En Supervisión, cerrar y volver a abrir «Por prioridad de la
colonia» o «Por alcaldía» producía un error de Leaflet: el mapa nuevo se creaba sobre el mismo contenedor
y la capa de colonias prioritarias seguía apuntando al mapa retirado. `js/prioritarias.js`: `soltar(mapa)`.
`js/supervision.js`: `quitarMapas()` suelta y retira; al plegar una sección se retira su mapa; el ajuste
diferido del encuadre actúa sólo sobre el mapa que lo pidió.

**Pantalla: qué se agregó y qué se quitó.** El campo, en esa confirmación. Nada se quitó.

**Verificación:** prueba.py 1301 comprobaciones, 0 fallas (2 nuevas: la carga pide «DESHACER»; cerrar y
reabrir las secciones con mapa no da error). Una corrida anterior del bloque falló por ese error y por
haber corrido otras pruebas al mismo tiempo; la definitiva corrió sola. auditoria.py 141 comprobaciones, 0
hallazgos; auditoria_css.py 0; revisar.py sin problemas. No probado en iPhone real.

## Bloque 166 — La solicitud es un programa; espejos en cada pantalla que escribe (04-10-2026)
Etapa 1. Estado: **cerrado**. Versión 0.9.32. Base del teléfono, versión 9.

**Qué cambió (D229).** `js/solicitud.js` sustituye a `js/pedido.js`: el bloque de «Quién lo solicita» y
«Descripción de la solicitud» (área de texto) se muestra con el programa «Solicitud»
(`SRP.CONFIG.PROGRAMA_SOLICITUD`). `js/almacen.js`: migración 9. `js/datos-ficticios.js`: el programa
`p-solicitud`; `SELLO_DATOS` nuevo, para que un teléfono con capturas lo reciba. `js/jornada-activa.js`,
`js/jornadas.js`, `js/supervision.js`, `js/indicadores.js`, `js/informes.js`, `js/reportes.js`,
`js/carga.js`, `js/referencias.js`, `js/demostracion.js`: sin origen; `modelo.solicitudes` en lugar de
`modelo.pedidos`; el CSV lleva «Quién lo solicita» y «Descripción de la solicitud». `index.html`: sin los
filtros «Origen». `datos/esquema.json` (151 campos), diccionario, `datos/MAPEO-CAMPOS.md`, `README.md` y
`docs/FASE2-Y-TRASPASO.md` (fila 20).

**Qué cambió (D230).** `js/espejo.js`: `htmlGuardado()`, `colocar()`, `refrescarIniciar()`, `enFicha()` y
`enFormulario()`; notas de los campos que faltaban. `js/jornada-activa.js`: `armarJornada()` y
`jornadaPrevista()`, para que el espejo enseñe el mismo objeto que se guarda. `css/estilos.css`: la
página no se desplaza con un diálogo abierto; los botones del pie del detalle no se parten.

**Pantalla: qué se agregó y qué se quitó.** Se quitó una pregunta al iniciar la jornada (Origen) y un
filtro en Jornadas y en Supervisión: Jornadas queda en 7 y Supervisión en 5. Se agregó la opción
«Solicitud» en Programa. Los espejos sólo existen en la versión de prueba. La Administración gana una pestaña y pierde una
opción del menú de la cuenta.

**Verificación:** corrida completa sola, 1,314 comprobaciones: 1,313 correctas y 1 expectativa de prueba por ajustar (el solicitante de una jornada que no es solicitud se suelta en la migración), corregida y repetida sola su sección (ctx73) sin fallas; sin errores de consola. `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude.

## Bloque 167 — Especies escritas (04-10-2026)

Versión 0.9.33. Petición de Liber: ver, en la Administración global, las especies que los usuarios
escriben en «Otra especie». Se construyó primero con acciones (asignar, dar de alta, dejar) y Liber
lo acotó a consulta: la revisión la hace fuera, contra EncicloVida. Se retiraron las acciones y el
campo que requerían.

**Qué cambió (D232).** `js/especies-revision.js` (nuevo): `leer()` agrupa lo escrito, `parecida()`
dice la especie del catálogo que se le parece, `descargar()` entrega la lista en Excel.
`index.html`: tarjeta y vista `vista-revision-especies`. `js/app.js` y `js/configuracion.js`: la
vista es de Configuración y su tarjeta dice cuántas hay. `README.md`, `datos/MAPEO-CAMPOS.md`,
`docs/FASE2-Y-TRASPASO.md` (fila 27). El modelo de datos no cambia.

**Pantalla: qué se agregó y qué se quitó.** Se agregó una tarjeta en Configuración (siete) y su
pantalla de consulta. No se quitó nada. Para cabos, coordinación y dirección no cambia nada.

**Verificación:** corrida completa sola, 1,322 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx78`). `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. No probado en iPhone por Claude.

## Bloque 168 — La prioridad es de la jornada; detalle sin datos de la base (04-10-2026)

Versión 0.9.34. Observaciones de Liber en computadora, con capturas.

**Qué cambió (D233).** `js/prioritarias.js`: `deJornada()` toma la colonia donde se ubicó la jornada;
`coloniaDeJornada()`, `htmlEscala()`; el control de mapa en modo `simple` (un botón); la capa arranca
encendida en campo (clave `srp_capa_prioritarias_3`). `js/jornada-activa.js` e `index.html`: la escala
en Iniciar jornada. `js/formulario.js`, `js/mapa.js`, `js/jornadas.js`: sin prioridad por punto ni
leyenda bajo el mapa. `js/reportes.js`: sin desglose ni columna por árbol. `js/indicadores.js`: cada
árbol cuenta en la prioridad de su jornada; sin prioridad en el detalle por árbol. `js/informes.js`,
`js/supervision.js`: columnas y textos.

**Qué cambió (D234).** `js/registros.js`: el detalle sin «Datos del sistema», con el folio al frente.
`js/espejo.js`: celda, capas e identificador vuelven al espejo. `js/referencias.js`: `lugar()` sin
«Alcaldía». `js/jornadas.js` e `index.html`: `pintarMover()`, buscador y fecha en «Mover a otra
jornada». `css/estilos.css`: pie de dos acciones con el mismo tamaño.

**Qué cambió (D235).** `js/informes.js`: `fechasPeriodo()` y `textoPeriodo()`, en el encabezado y el pie
del PDF. `js/galeria.js`, `js/util.js`, `js/config.js`: paginador en Fotografías, de 25 en 25.

**Pantalla: qué se agregó y qué se quitó.** Se quitaron: dos textos de prioridad en Nuevo registro, el
panel de niveles y opacidad en los mapas de campo, el desglose y la prioridad por punto en la ficha, un
renglón y una columna del reporte, el grupo «Datos del sistema» del detalle (cuatro renglones) y la
palabra «Alcaldía» del lugar. Se agregaron: la escala en Iniciar jornada (sustituye a un texto) y dos
campos en «Mover a otra jornada», que sólo aparecen con más de cinco jornadas.

**Verificación:** corrida completa sola, 1,325 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx79`). `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude.

## Bloque 169 — Avisos: menos, con el color que corresponde (05-10-2026)

Versión 0.9.35. Tres ajustes que salieron del inventario de avisos, aprobados por Liber.

**Qué cambió (D236).** `js/util.js`: `anunciar()` acepta `{ fijo: true }` y el ámbar dura 6 s de base;
`quitarAviso()`. `js/reportes.js`: «Generando reporte…» fijo, y se quita al terminar. `js/jornada-activa.js`
y `js/catalogos.js`: dos avisos pasan a `anunciarSilencioso()`. 17 avisos de `'alerta'` a `'aviso'` en
`catalogos`, `usuarios`, `jornadas`, `registros`, `formulario`, `jornada-activa` y `envio`.

**Pantalla: qué se agregó y qué se quitó.** Se quitaron dos avisos flotantes. No se agregó nada.

**Verificación:** corrida completa sola, 1,330 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx80`). `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude. Incluye el texto guía «Elija la fecha» en «Mover a otra jornada».

## Bloque 170 — Jornada completa, árboles de más y previstos al cerrar (05-10-2026)

Versión 0.9.36. Petición de Liber.

**Qué cambió (D237).** `index.html` y `css/estilos.css`: diálogo `dlg-completa`. `js/formulario.js`:
`avisarCompleta()`; `guardar()` llama a `SRP.activa.confirmarExceso()`. `js/jornada-activa.js`:
`confirmarExceso()`, `ofrecerActualizarPrevistos()`, `cerrarJornada({ sinPreguntarSiCuadra })`.
`js/jornadas.js`: el cierre desde la ficha también ofrece actualizar. `js/app.js`: `confirmar()` acepta
`cancelar`.

**Pantalla: qué se agregó y qué se quitó.** Se agregó una ventana (jornada completa, en lugar del renglón
extra de la tarjeta) y dos preguntas que sólo aparecen al rebasar lo previsto. Se quitó el renglón
«Se registraron los N árboles previstos» de la tarjeta de guardado.

**Verificación:** corrida completa sola, 1,336 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx81`). `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude.

## Bloque 171 — Jornada con árboles en otra colonia (05-10-2026)

Versión 0.9.37. Consulta de Liber; propuesta aprobada.

**Qué cambió (D238).** `js/prioritarias.js`: `coloniaDeJornada()` devuelve la colonia de la jornada y
las de sus árboles; `otrasColonias()` y `textoOtras()`; el filtro de la capa acepta colonias sin
árboles. `js/jornadas.js`: la línea de datos de la ficha añade los árboles en otra colonia.
`js/reportes.js`: renglón «Árboles en otra colonia» en la identificación.

**Pantalla: qué se agregó y qué se quitó.** Se agregó un dato en la ficha y un renglón en el reporte,
sólo cuando hay árboles en otra colonia; en el mapa, los polígonos de esas colonias. No se quitó nada.

**Verificación:** se verificó junto con el Bloque 172.

## Bloque 172 — Entrada de prueba por rol, catálogo de especies con la forma del original y campo a la vista (05-10-2026)

Versión 0.9.38. Peticiones de Liber.

**Qué cambió.** D239: `js/catalogos.js` (`librosEspecies()`, botón «Especies escritas», tipo de
solicitante sin «Alcaldía»), `herramientas/generar_especies.py` y `assets/catalogos/catalogo-especies.js`
(notas de discrepancia, anchos y hojas de referencia en `meta`; las especies no cambian),
`js/especies-revision.js`, `js/configuracion.js`, `index.html`. D240: `js/app.js` (`CUENTAS_POR_ROL`).
D241: `js/app.js` (`cuidarCampoEnVentana()`), `css/estilos.css` (`.con-teclado`).
D242: `js/supervision.js` (al cambiar de cuenta se vacían listas y cifras; `pintar()` espera los datos).
`docs/FASE2-Y-TRASPASO.md`: lista de verificación previa al traspaso.

**Pantalla: qué se agregó y qué se quitó.** Se quitaron una tarjeta de Configuración, 22 cuentas y un
grupo de la lista de entrada de prueba, y una opción del tipo de solicitante. Se agregó un botón en
Catálogos › Especies.

**Pruebas.** Las secciones entran con `entrar_como()`, que añade a la lista las cuentas que ya no se ofrecen.

**Verificación:** corrida completa sola, 1,348 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx82`). `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude: el campo a la vista con el teclado se comprobó en pantalla baja simulada.

## Bloque 173 — La edición de un árbol se distingue de la captura (05-10-2026)

Versión 0.9.39. Petición de Liber (variante A).

**Qué cambió (D243).** `index.html`: `#edicion-franja`. `css/estilos.css`: `.edicion-franja` y el marco
de `.registrar-columnas` en edición. `js/formulario.js`: `editar()` y `limpiar()` ponen y quitan la
franja, la marca `data-editando` y el texto del botón.

**Pantalla: qué se agregó y qué se quitó.** Se agregó una franja de un renglón, sólo al editar. No se quitó nada.

**Verificación:** corrida completa sola, 1,350 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx82`). `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude.

## Bloque 174 — Prioridad por árbol en Supervisión, mapa base, simbología y cierre directo (05-10-2026)

Versión 0.9.40. Peticiones de Liber y un defecto reportado por él.

**Qué cambió.** D244: `js/indicadores.js` (cada árbol en su colonia; se quitó `altas`), `js/supervision.js`
e `js/informes.js` (cada nivel por separado). D245: `js/config.js` (`CAPAS_CALLES`), `js/mapa.js`
(`ponerBase()`, `pintarBase()`, `cambiarBase()`), `js/prioritarias.js` (panel de capas de campo,
`armarPanel()`, simbología), `js/jornadas.js`, `index.html` (`#mapa-simbologia`, `#jornada-simbologia`).
D246: `js/jornada-activa.js` (`cerrarJornada({ directo })`). D247: `index.html` y `css/estilos.css` (pie
de la revisión), `js/especies-revision.js` (tabla), `js/app.js` (la vista de registro se abre a quien edita).

**Pantalla: qué se agregó y qué se quitó.** Se quitó una ventana de confirmación y la frase «alta o muy
alta». Se agregaron el panel de capas (en lugar del interruptor), un renglón de simbología bajo el mapa
y la tabla de especies escritas (en lugar de la lista).

**Verificación:** corrida completa sola, 1,362 comprobaciones, 2 fallas, sin errores de consola (última sección `ctx83`). Las dos fallas son de las pruebas, no del sistema: una esperaba el texto anterior de la nota del mapa de prioridad (corregida; su sección pasa sola, 15 de 15) y otra es intermitente, en el aviso de relevo de cabo (sección `ctx58`), que no toca este bloque: pasa sola (35 de 35) y con el procesador ralentizado, y quedó instrumentada para decir qué leyó la próxima vez que falle. `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude; el mapa de calles no se vio con imagen real, porque el entorno de pruebas no alcanza el servicio de mapas.

## Bloque 175 — Formularios en una columna en computadora; cierre de la Etapa 1 (05-10-2026)

Versión 0.9.41. Petición de Liber.

**Qué cambió (D248).** `css/estilos.css`: en computadora la vista de registro mide el ancho de formulario
(`--ancho-formulario`) y deja de repartirse en dos columnas, igual que «Registrar jornada».
`docs/DECISIONES.md`: D249, con el cierre de la Etapa 1 y las decisiones para el traspaso.

**Pantalla: qué se agregó y qué se quitó.** No se agregó ni se quitó nada: cambió la disposición.

**Verificación:** corrida completa sola, 1,363 comprobaciones, 0 fallas, sin errores de consola (última sección `ctx83`). Dos corridas anteriores no terminaron porque el entorno de pruebas se reinició a media corrida. `auditoria.py`: 140 comprobaciones, 0 hallazgos. `auditoria_css.py`: 0 hallazgos. `revisar.py`: sin problemas. No probado en iPhone por Claude.

## Bloque 176 — Arranque de la fase de servidor: equipo y documentación del traspaso (05-10-2026)

Versión de la aplicación sin cambio: 0.9.41. Primer bloque de la fase de servidor (fase 0).

**Qué cambió (D249, al detalle).** `docs/FASE2-Y-TRASPASO.md`: el servidor se construye en este proyecto
(`servidor/`) con el nombre `srp`; fila 8, doble conteo entre instituciones con bandeja de revisión;
fila 16, histórico a nombre de la Administración global; fila 19, prioridad congelada con el árbol al
recibirlo y conteo por árbol (D244); fila 28 nueva, usuarios y acceso con cuentas propias, sin servicio
de correo; apartados 3 a 6 al día (preguntas al SIA, decisiones abiertas y ya tomadas, lista de
verificación). `docs/PLAN-TRASPASO-SIA.md`: ruta `/srp/`, esquema `srp`, sesión con cookie detrás del
intermediario, conexión cifrada a la base, responsables de las fases 2 a 4 (el SRP construye; el SIA
ejecuta e instala), decisiones 1, 2 y 7 cerradas y 8 y 9 nuevas, siguiente paso. `README.md`: la línea
de `sesion.js`.

**Pantalla: qué se agregó y qué se quitó.** Nada: sólo documentación. Configuración › Acceso aún dice
«proveedor institucional de identidad»; se corrige al adaptar la aplicación al servidor.

**Equipo de desarrollo.** Node.js, git, Python con Playwright, y PostgreSQL con PostGIS locales en la
misma versión mayor que el SIA, con una base de desarrollo y una cuenta sin privilegios de superusuario.
En Windows las pruebas de Python se corren con `PYTHONUTF8=1`.

**Verificación:** `auditoria.py` en Windows, 140 comprobaciones, 0 hallazgos. No se corrió `prueba.py`:
no cambió código de la aplicación.
