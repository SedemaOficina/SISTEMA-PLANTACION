# Registro de mejoras de interfaz

Tablero único de las mejoras de diseño e interfaz del SRP. Se actualiza al cerrar cada bloque.
El detalle de lo hecho está en DECISIONES (Dnn) y BITACORA.

## Versión que debe verse en el teléfono

Al pie de cualquier pantalla: **«Versión 0.6.37 (Bloque 56)»**.
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
