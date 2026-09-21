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
