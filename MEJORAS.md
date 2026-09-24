# Registro de mejoras de interfaz

Tablero único de las mejoras de diseño e interfaz del SRP. Se actualiza al cerrar cada bloque.
El detalle de lo hecho está en DECISIONES (Dnn) y BITACORA.

## Versión que debe verse en el teléfono

Al pie de cualquier pantalla: **«Versión 0.6.45 (Bloque 64)»**.
Si aparece una anterior, el teléfono sigue con la copia guardada: recargar la página dos veces
(la primera descarga la versión nueva, la segunda la muestra).

**Prioridad:** Alta (afecta la captura o los datos) · Media (ahorra pasos o espacio) · Baja (acabado visual)

## 1. Hechas

| # | Origen | Mejora | Prioridad | Desde versión | Cómo probarlo | Captura sugerida |
|---|---|---|---|---|---|---|
| M01 | Maqueta de filtros | Estilo único de atajos y filtros | Media | 0.6.22 (B41) | Registros: los atajos Hoy/Todos/Un periodo son del mismo ancho y el activo va en guinda suave; Año, Mes y Cabo son cajas grises con flecha en cuadrito; «Reiniciar filtros» está arriba a la derecha. Catálogos: buscador con lupa dentro | Registros con «Un periodo» abierto; Catálogos › Especies |
| M03 | Lista de diseño #2 | «Revisar y guardar» fijo al pie del formulario | Alta | 0.6.23 (B42) | Nuevo registro: bajar hasta Especie; el botón verde se queda pegado al pie de la pantalla | Formulario a media altura con el botón al pie |
| M04 | Lista de diseño #3 | Precisión del GPS a la vista | Alta | 0.6.23 (B42) | Tocar el botón de ubicación: bajo el mapa sale «Precisión buena / aceptable / baja · ±N m» y un círculo en el mapa. Adentro de un edificio suele salir baja | Mapa con la insignia y el círculo |
| M06 | Lista de diseño #5 | Lista vacía con el botón que resuelve | Media | 0.6.23 (B42) | Registros: con «Un periodo» elegir un rango sin árboles (p. ej. enero 2020) y Aplicar; sale el aviso con «Quitar filtros» | Aviso de lista vacía |
| M15 | Petición de Liber | Menú de cuenta con opciones en texto | Baja | 0.6.23 (B42) | Tocar el icono de usuario: «Cambiar usuario (pruebas)» y «Cerrar sesión» son renglones de texto bajo una línea | Menú de cuenta abierto |
| M16 | iPhone · Nuevo registro #1 | Lista de especies visible sobre el teclado | Alta | 0.6.24 (B43) | Tocar Especie: el campo sube al tope y la lista muestra varias especies; ninguna aparece marcada | Lista de especies con el teclado abierto |
| M17 | iPhone · Nuevo registro #2 | Efectos que ya no se quedan pegados; zona de foto reducida | Alta | 0.6.24 (B43) | Tocar la zona de foto y cancelar: no queda rosa. Cargar una foto: la zona se vuelve un renglón «Cambiar fotografía» | Zona de foto con foto cargada |
| M18 | iPhone · Nuevo registro #3 | Borde guinda al tocar un campo | Media | 0.6.24 (B43) | Tocar Comentarios: el borde se pone guinda, no azul | Comentarios con el teclado abierto |
| M19 | iPhone · Nuevo registro #4 | Programa con botones | Media | 0.6.24 (B43) | Programa muestra dos botones sin ninguno marcado; un toque marca uno | Programa antes y después de elegir |
| M20 | iPhone · Nuevo registro #5 | Ficha compacta del punto | Media | 0.6.24 (B43) | Tras ubicar: Coordenadas, Alcaldía y Colonia en una ficha de tres renglones | Ficha bajo el mapa |
| M21 | iPhone · Nuevo registro #6 | Botón «Hoy» en la fecha | Media | 0.6.24 (B43) | La fecha arranca vacía; «Hoy» la llena de un toque | Fecha con «Hoy» aplicado |
| M25 | iPhone · Formulario lleno #1 | Especie sin corrector ni mayúsculas automáticas | Alta | 0.6.25 (B44) | Elegir una especie y salir del campo: el nombre científico ya no sale subrayado | Especie elegida, campo sin foco |
| M27 | iPhone · Ficha de revisión #1 | Orden del formulario; datos del sistema al final | Alta | 0.6.25 (B44) | «Revisar y guardar»: la ficha empieza por Especie; Folio e Identificador están al final bajo «Datos del sistema» | Inicio y final de la ficha |
| M28 | iPhone · Ficha de revisión #2 | Precisión con aviso en la ficha | Alta | 0.6.25 (B44) | Con precisión baja, «Cómo se obtuvo» muestra la insignia roja y pide revisar el punto | Renglón «Cómo se obtuvo» |
| M29 | iPhone · Ficha de revisión #3 | Guardar fijo al pie de la ficha | Media | 0.6.25 (B44) | En la ficha, desplazarse: «Guardar» verde a todo el ancho se queda al pie; arriba sólo título y × | Ficha a media altura |
| M05 | Lista de diseño #4 | Registros como tarjetas con miniatura | Alta | 0.6.26 (B45) | Registros: cada árbol es una tarjeta con la foto (o un arbolito si no tiene) y la tuerca arriba a la derecha. Tocar la tarjeta abre el detalle | Lista con varias tarjetas |
| M07 | Lista de diseño #6 | Filtros activos como fichas con × | Media | 0.6.26 (B45) | Registros: bajo «Filtros» aparece la ficha «Hoy, …»; la × la quita y muestra todos. Al elegir un cabo aparece su ficha | Fichas con periodo y cabo |
| M10 | Lista de diseño #9 | Tablas: orden por columna, encabezado fijo, punto de estado | Media | 0.6.26 (B45) | En computadora, Catálogos o Usuarios: tocar un encabezado ordena A-Z, otro toque Z-A (flecha ▲▼). Al bajar, el encabezado se queda arriba. El estado lleva ● verde o rojo | Tabla ordenada en computadora |
| M11 | Lista de diseño #10 | Mismo ancho en todas las vistas | Baja | 0.6.26 (B45) | En computadora, cambiar entre pestañas: los títulos arrancan en el mismo borde | Reportes en computadora |
| M30 | iPhone · Mis registros #1 | Tuerca arriba a la derecha, sin renglón propio | Alta | 0.6.26 (B45) | Cada tarjeta es más baja; la tuerca va junto al nombre | Lista |
| M31 | iPhone · Mis registros #2 | Filtros plegados en teléfono tras «Filtros (n)» | Alta | 0.6.26 (B45) | Al entrar a Registros sólo se ven «Filtros 1», la ficha y la lista; tocar «Filtros» abre el panel | Registros al entrar y con el panel abierto |
| M32 | iPhone · Mis registros #3 | Año/Mes y Desde/Hasta nunca a la vez | Alta | 0.6.26 (B45) | Abrir «Un periodo»: Año y Mes desaparecen; tocar «Todos»: vuelven y Desde/Hasta se van | Panel con «Un periodo» abierto |
| M34 | iPhone · Detalle | Detalle en orden del formulario, «Datos del sistema» al final y «Editar» al pie | Alta | 0.6.26 (B45) | Abrir un detalle: empieza por Especie; Folio e Identificador al final; «Editar» fijo abajo | Detalle arriba y abajo |
| M35 | iPhone · Mis registros #4 | Sin «PROVISIONAL» repetido en la lista | Media | 0.6.26 (B45) | La lista ya no dice PROVISIONAL; el detalle sí | Lista |
| M36 | iPhone · Edición | Al editar se marca la pestaña Registros | Media | 0.6.26 (B45) | Tuerca › Editar: la pestaña marcada es Registros, no «Nuevo registro» | Formulario en edición |
| M08 | Lista de diseño #7 | Avisos flotantes uniformes con «Deshacer» | Media | 0.6.27 (B46) | Eliminar un registro: arriba sale «Registro eliminado. Deshacer ×»; «Deshacer» lo devuelve. También al reiniciar filtros, quitar la foto y activar/desactivar en Catálogos y Usuarios | Aviso con «Deshacer» |
| M09 | Lista de diseño #8 | Vista previa del parte antes del PDF | Media | 0.6.27 (B46) | Reportes › Generar reporte del día › «Ver vista previa» (al pie): se ve la hoja del parte; «Generar PDF» o «Corregir datos de cierre» | Vista previa arriba y abajo |
| M37 | Petición de Liber | Nombre del PDF: Reporte, persona y fecha | Alta | 0.6.27 (B46) | Generar el PDF: el archivo se llama p. ej. Reporte_Perengano_Gomez_Ejemplo_2026-09-22.pdf | Nombre del archivo al compartir o descargar |
| M38 | iPhone · Reportes #1 | Cabo a todo el ancho en teléfono | Media | 0.6.28 (B47) | Reportes, como coordinador: «Cabo» ocupa todo el renglón y el nombre se lee completo | Reportes con un cabo elegido |
| M39 | iPhone · Cierre #1 | Modelo y Placa en una fila; botón «Ahora» en la hora | Media | 0.6.28 (B47) | En «Datos de cierre del día»: Modelo y Placa lado a lado; «Ahora» llena la hora de finalización | Parte baja del cierre |
| M41 | PDF #1 | Personal: Encargado primero y grupos con subtítulo y nombres sangrados | Alta | 0.6.28 (B47) | Escribir dos nombres en Personal participante y uno en Personal de apoyo; en la vista previa y el PDF salen separados con viñeta | Apartado de personal en el PDF |
| M42 | PDF #2 | Total alineado a la derecha | Media | 0.6.28 (B47) | En «Totales por especie» el número del Total queda bajo las demás cifras | Tabla de totales |
| M43 | PDF #3 | PDF ligero (de ~800 KB a ~60 KB) | Media | 0.6.28 (B47) | Al compartir el PDF, su tamaño ronda 60 KB | Detalle del archivo al compartir |
| M47 | Petición de Liber (iPhone) | Registros abre con Todos y los filtros abiertos | Alta | 0.6.29 (B48) | Entrar a Registros: se ven todos, el panel de filtros abierto y ninguna ficha; «Filtros» lo pliega; «Reiniciar filtros» vuelve a Todos | Registros al entrar |
| M48 | Petición de Liber (iPhone) | Un solo atajo marcado a la vez | Alta | 0.6.29 (B48) | Tocar «Un periodo»: queda marcado sólo él (Todos se desmarca) | Atajos con «Un periodo» |
| M49 | Petición de Liber (iPhone) | Texto guía en fechas y hora vacías | Media | 0.6.29 (B48) | Nuevo registro: la fecha vacía dice «Seleccione en el calendario»; Desde/Hasta «Elija la fecha»; hora de finalización «Elija la hora» | Fecha vacía |
| M50 | Petición de Liber | «Reporte» en lugar de «parte» en toda la plataforma | Media | 0.6.29 (B48) | Reportes dice «Reporte del día» y «Día del reporte»; la vista previa, «Vista previa del reporte» | Reportes |
| M51 | Petición de Liber | Sin el bloque «Registros en este dispositivo»; respaldo en el menú de la cuenta | Media | 0.6.29 (B48) | Reportes sólo tiene el reporte del día; el icono de usuario ofrece «Guardar respaldo» | Reportes y menú de cuenta |
| M52 | Revisión Catálogos/Usuarios | Tarjetas compactas en teléfono; tocar abre la edición | Alta | 0.6.30 (B49) | En el teléfono, Catálogos › Especies y Usuarios: cada elemento es una tarjeta de 3 renglones con ● estado; tocarla abre la edición | Lista de especies y de usuarios |
| M53 | Revisión Catálogos/Usuarios | Tuerca arriba a la derecha | Alta | 0.6.30 (B49) | La tuerca va junto al nombre, no en un renglón «Acciones» | Tarjeta con el menú abierto |
| M54 | Revisión Catálogos/Usuarios | «Guardar» al pie en las ventanas de alta y edición | Alta | 0.6.30 (B49) | «Agregar especie» o «Dar de alta»: Guardar verde a todo el ancho, fijo abajo | Ventana de alta |
| M55 | Revisión Catálogos/Usuarios | Contador de resultados | Media | 0.6.30 (B49) | Bajo el buscador: «76 especies»; al buscar «quercus», «4 de 76 especies» | Buscador con resultados |
| M56 | Revisión Catálogos/Usuarios | Nota de una línea | Media | 0.6.30 (B49) | «Lo que tiene registros no se elimina: se desactiva.» | Encabezado de Catálogos |
| M59 | Petición de Liber | La ficha «Hoy» ya no se repite con el panel abierto | Media | 0.6.30 (B49) | Registros con el panel abierto: no hay ficha bajo «Filtros»; al plegarlo aparece | Registros con «Hoy» elegido |
| M12 | Lista de diseño #11 | Modo sol (alto contraste) | Media | 0.6.31 (B50) | Icono de usuario › «Modo sol (alto contraste)»: el texto pasa a negro, los campos a blanco con borde y el atajo activo a guinda relleno; se recuerda al volver a abrir | Registros y formulario con el modo activo, y el menú con el interruptor |
| M02 | Lista de diseño #1 | Navegación inferior en teléfono | Alta | 0.6.32 (B51) | En el teléfono, las secciones (Nuevo registro, Registros, Reportes…) están abajo; la activa lleva filete guinda arriba. «Revisar y guardar» queda encima de la barra | Cualquier pantalla con la barra abajo |
| M57 | Revisión Catálogos/Usuarios | Atajos Activos / Inactivos / Todos en Usuarios | Media | 0.6.32 (B51) | Usuarios: tocar «Activos» deja sólo las cuentas activas y el contador dice «3 de 3 usuarios» | Usuarios con «Activos» |
| M58 | Revisión Catálogos/Usuarios | Forma de crecimiento con botones | Baja | 0.6.32 (B51) | Editar una especie: seis botones (Árbol, Arbusto, Palma, Sufrútice, Liana, Hierba); se marcan varios | Ventana de especie |
| M40 | iPhone · Cierre | Campos del cierre en caja gris | Baja | 0.6.32 (B51) | «Datos de cierre del día»: los campos son cajas grises; al tocarlos se ponen blancos con borde guinda | Cierre |
| M26 | iPhone · Formulario | Etiqueta «Fotografía» alineada | Baja | 0.6.32 (B51) | En Nuevo registro, «Fotografía» arranca en el mismo borde que las demás etiquetas | Formulario |
| M22 | iPhone · Nuevo registro #7 | Crédito del mapa en un renglón | Baja | 0.6.33 (B52) | Nuevo registro: bajo el mapa, «Leaflet \| Imagen: Esri…» en un renglón; al tocarlo se ve completo | Mapa |
| M23 | iPhone · Nuevo registro #8 | Menos autollenado de Safari | Baja | 0.6.33 (B52) | Tocar Especie o Comentarios: ya no debería salir la barra de llave, tarjeta y ubicación sobre el teclado (Safari decide al final) | Teclado sobre Comentarios |
| M45 | Revisión en computadora | Nuevo registro en dos columnas y Reportes centrado | Media | 0.6.34 (B53) | En computadora: Nuevo registro muestra el mapa a la izquierda y el formulario a la derecha; Reportes, centrado en tarjeta. En el teléfono no cambia | Nuevo registro y Reportes en computadora |
| M60 | Petición de Liber | Folio simulado con datos de prueba | Alta | 0.6.36 (B55) | Con conexión, registrar un árbol: «Registro guardado» dice «Folio: CUH-021-00001 (simulado)»; la lista y el detalle lo muestran; la vista previa y el PDF avisan que es simulado. Sin conexión queda PROVISIONAL y recibe folio al volver la señal | Registro guardado, detalle y PDF |
| M61 | Petición de Liber | Envío al servidor simulado: cola, avisos y atraso | Alta | 0.6.37 (B56) | Con señal, registrar: «Registro guardado» dice «Enviando al servidor…» y luego «Enviado… Recepción confirmada hoy a las 12:14». Menú de usuario › «Simular sin señal (pruebas)» y registrar dos: quedan «Por enviar» en la tarjeta y la pastilla dice «Sin conexión · 2 por enviar». Desactivar el interruptor: se envían solos y la pastilla queda «Al día». Pendientes de ayer (o de hoy después de las 17:00): franja roja «Hoy es…» | Registro guardado con y sin señal, lista con «Por enviar» y franja de atraso |
| M62 | Petición de Liber (cabos y coordinadores) | Sección «Jornadas»: mapa y lista de la jornada con conciliación | Alta | 0.6.38 (B57) | Barra de abajo › Jornadas. Tocar la de hoy: mapa con puntos numerados y la lista igual; tocar un punto lo marca en ambos. Escribir «Árboles plantados» y ver si cuadra. En un punto con aviso: «Está bien» o «Eliminar». «Ver» › «Editar» vuelve a la jornada. «Reporte de la jornada» abre Reportes en esa fecha | Lista de jornadas, revisión con mapa, conciliación en rojo y en verde |
| M63 | Petición de Liber | Atajo «Un día» en Registros y Jornadas | Media | 0.6.38 (B57) | Registros › Filtros › «Un día» › elegir ayer: filtra al momento, sin Aplicar | Filtros con «Un día» |
| M65 | Petición de Liber | «Plantados» en lugar del término agrícola en toda la app | Alta | 0.6.39 (B58) | Jornadas › revisión: «Árboles plantados según la cuadrilla»; el reporte dice «plantados» | Conciliación |
| M66 | Petición de Liber | Iconos en Modo sol y Cerrar sesión (y el resto del menú) | Baja | 0.6.39 (B58) | Icono de usuario › cada opción lleva su icono a la izquierda | Menú de la cuenta abierto |
| M67 | Petición de Liber | Orden: Nuevo registro, Jornadas, Registros, Reportes | Media | 0.6.39 (B58) | Barra de abajo en ese orden | Barra inferior |
| M64 | Petición de Liber | Croquis de la jornada en el reporte (vista previa y PDF) | Media | 0.6.40 (B59) | Reportes › Vista previa: apartado «Croquis de la jornada» con los puntos numerados como la tabla; con señal debe verse la imagen de satélite de fondo; sin señal, fondo liso y el pie lo dice. Generar el PDF: el croquis va después de la tabla | Vista previa con croquis; hoja del PDF con croquis |
| M68 | iPhone · Jornadas | El mapa acerca hasta zoom 22: los pines a 3 m ya no se enciman | Alta | 0.6.40 (B59) | Jornadas › jornada con árboles juntos: acercar con dos dedos más allá de donde antes rebotaba | Mapa con los pines separados |
| M69 | Petición de Liber | Colores por significado con icono en Jornadas y «Cancelar» en rojo con tache | Media | 0.6.40 (B59) | En un punto con aviso: «Está bien» verde con palomita, «Eliminar» rojo con bote, «Ver» con ojo. Al eliminar: «Cancelar» rojo de contorno con tache | Lista de puntos con avisos; diálogo de eliminar |
| M70 | iPhone · Jornadas | Subtítulo sin la fecha repetida y conteo sin autollenado de Safari | Baja | 0.6.40 (B59) | Abrir una jornada: «mié 23-SEP-2026 · Fulana…»; tocar el conteo: no debe salir la barra de llave/tarjeta | Cabecera de la jornada |
| M71 | Área de plantación (vía Liber) | Varias jornadas de un cabo en un día, con reporte por jornada | Alta | 0.6.41 (B60) | Registra en dos sitios a más de 500 m el mismo día: Jornadas muestra «Jornada 1 de 2» y «2 de 2», cada una con su conteo. Reportes › aparece el selector «Jornada» y sale un PDF por jornada (archivo `_J2`). En un punto › tuerca: «Iniciar otra jornada aquí» / «Unir con la jornada anterior» | Lista con dos jornadas; Reportes con el selector; PDF con «Jornada 2 de 2» |
| M72 | Petición de Liber | Sección «Fotografías» para coordinación y administración, con descarga y ZIP | Alta | 0.6.42 (B61) | Entrar como coordinador › Fotografías: rejilla con las fotos de la cuadrilla; tocar una: datos y «Descargar»; «Descargar todas»: ZIP. El cabo no ve la sección | Galería; foto grande; el ZIP abierto en la computadora |
| M73 | Petición de Liber | El cierre ya no pregunta «Actividades realizadas» | Baja | 0.6.42 (B61) | Reportes › Generar: el formulario de cierre empieza en Encargado y Sitio; el PDF no trae el apartado | Formulario de cierre |
| M74 | Área de plantación (vía Liber) | La jornada se declara antes de registrar: nombre, fecha y comentarios; fecha heredada; cerrar/reabrir; mover árboles entre jornadas; reporte con nombre y comentarios | Alta | 0.6.43 (B62) | Entrar como cabo: aparece «Iniciar jornada» (sin nombre no deja). Al iniciarla, el formulario con la franja verde; registrar un árbol: ya no pide fecha. «Cambiar» › «Iniciar otra jornada». Registrar un árbol lejos: pregunta si es de esta jornada. «Cerrar jornada» lleva a la revisión; ahí «Reabrir». Reportes: la jornada por nombre, con sus comentarios en el PDF. Los registros de prueba anteriores se borran al abrir esta versión | Iniciar jornada; franja; pregunta de distancia; PDF con «Jornada:» |
| M75 | Revisión de Liber | Sin jornada no se ve ni responde el formulario, también en computadora | Alta | 0.6.44 (B63) | En computadora, entrar como cabo: sólo «Iniciar jornada», sin formulario debajo | Nuevo registro en computadora |
| M76 | Petición de Liber | Fecha de la jornada con «Hoy» y texto guía «Seleccione la fecha» | Media | 0.6.44 (B63) | Iniciar jornada: la fecha arranca vacía; «Hoy» la pone | Panel de inicio |
| M77 | Petición de Liber | Campo «Ubicación de la jornada» | Media | 0.6.44 (B63) | Escribir una dirección al iniciar: sale en la franja y en el reporte junto al nombre | Franja; PDF |
| M78 | Petición de Liber | Programa en lista desplegable en lugar de botones | Media | 0.6.44 (B63) | Nuevo registro › Programa: lista | Formulario |
| M79 | Revisión de Liber | «Cerrar jornada» en guinda con candado (no verde); «Reabrir» dorado; «Está bien»/«Eliminar» como botones de contorno con icono; iconos en el pie; «Cantidad» en el conteo | Alta | 0.6.45 (B64) | Jornadas › una jornada: mirar los botones; en la franja de Nuevo registro «Cerrar jornada» guinda con candado | Revisión de jornada; franja |

## 2. Por hacer

| # | Origen | Mejora | Prioridad | Estado | Nota |
|---|---|---|---|---|---|
| M44 | PDF #4 | No partir un apartado corto (Por programa) a la página siguiente cuando cabe | Baja | Propuesto | — |
| M46 | Android | Revisión corta en Android: versión, botón «atrás» con ventanas abiertas, calendario y hora, especies con teclado, precisión, foto, compartir PDF, aviso | Alta | Pendiente | Espera capturas |

## 3. Verificadas sin falla

| # | Origen | Qué se revisó | Resultado |
|---|---|---|---|
| M24 | Revisión Catálogos/Usuarios | Revisión en tamaño iPhone con capturas propias | Resultó en M52–M58; lo propio de Safari (selectores, teclado) queda por ver en el teléfono |
| M33 | iPhone · Menú de la tuerca | El menú parecía salir lejos de la tuerca | Era efecto de la captura de página completa; en el teléfono sale junto a su tuerca |

## 4. Descartadas

| # | Origen | Mejora | Prioridad | Estado | Nota |
|---|---|---|---|---|---|
| M13 | Lista de diseño | Modo oscuro | Baja | Descartado | No sirve en campo |
| M14 | Lista de diseño | Animaciones decorativas | Baja | Descartado | Gastan batería |

**Resumen:** 54 hechas · 2 por hacer · 2 revisadas · 2 descartadas.
