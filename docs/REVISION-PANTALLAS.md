# Revisión de pantallas (versión 0.9.49)

07-10-2026. Petición de Liber: revisar todas las pantallas, ventanas y mensajes para quitar lo que sobra y dejar
información que sirva. Sólo sugerencias: nada de esto está programado.

**Cómo se revisó.** Capturas a tamaño de teléfono (390 px) de cada sección y ventana con la cuenta de cabo;
el texto visible de las 13 cuentas de prueba (Administración, Directivo, Coordinador y Cabo de la Secretaría;
Directivo, Coordinador y Cabo de alcaldía; Coordinador y Cabo de Gobierno de la CDMX, de empresa y de
organización civil) con los datos de demostración cargados; y el inventario de los textos del código,
incluidos los que sólo salen con una opción o un perfil (errores, confirmaciones, avisos, carga masiva).

Cada punto dice **quién lo ve**, **qué pasa hoy** y **qué se propone**. Los marcados **Defecto** son
fallas, no gustos.

**Estado (07-10-2026).** Liber aprobó A, B, C, D4, E, F, G y H: hechos en el bloque 191 (versión 0.9.50,
D270). **D1, D2 y D3 quedan pendientes.** G2 quedó resuelto con A2. **Actualización (08-10-2026):** lo pendiente se aprobó y se hizo en el bloque 194 (versión 0.9.53, D274).

---

## A. En todas las secciones

**A1. El pie de prueba en cada sección.** Todos los perfiles.
Hoy, al final de *cada* sección: la versión, «Restablecer datos de prueba» y el bloque «Datos de
demostración» (un párrafo de seis renglones y dos botones). En el teléfono son casi media pantalla debajo
de cada lista.
Propuesta: el pie deja sólo la versión. Restablecer y los datos de demostración pasan a una ventana
«Datos de prueba…» en el menú de la cuenta, junto a «Cambiar usuario (pruebas)».

**A2. Párrafos que repiten el título.** Según la sección, todos los perfiles.
- Registrar jornada: «Registre los datos de la jornada (proyecto) del día.»
- Jornadas: «Cada día de trabajo con su mapa, para comprobar al cierre que cada árbol plantado tenga su punto.»
- Configuración: «Lo que administra la Administración global: cuentas, catálogos, …»
- Acerca del sistema: «Datos de esta instalación y de este dispositivo, para dar soporte o reportar una falla.»
- Fotografías: «Las fotografías de los árboles registrados. Toque una para verla grande…»
- Mi avance y Supervisión: «Lo que usted ha plantado, por semana, mes o año. Cuentan sólo las jornadas
  cerradas; las abiertas se dicen aparte.»

Propuesta: quitarlos. En Mi avance y Supervisión queda sólo la regla, corta: «Sólo cuentan las jornadas
cerradas.» Se conservan los que explican una regla que no es obvia: Parámetros, Carga masiva y Especies
escritas.

**A3. «Activo» en cada tarjeta.** Administración, en Usuarios y en Catálogos.
Hoy, cada cuenta y cada valor del catálogo lleva «● Activo». Casi todos lo están, así que no distingue nada.
Propuesta: sólo se marca **Inactivo**.

**A4. «Quitar filtros» sin nada que quitar.** Todos los perfiles, en Registros, Jornadas y Supervisión.
Hoy el botón está a la vista aunque no haya ningún filtro puesto.
Propuesta: aparece sólo cuando hay algo filtrado.

**A5. «Más filtros» en distinto orden.** Coordinación, Directivo y Administración.
Hoy cada sección los ordena distinto:
- Jornadas: «quién registró, programa y alcaldía».
- Supervisión: «alcaldía, programa y quién registró».
- Registros: «quién registró, especie, programa y alcaldía».

Propuesta: el mismo orden en las tres. Primero quién registró, después especie, programa, alcaldía e
institución.

**A6. Palabras internas en textos que quedarán en la versión real.** Administración.
- Parámetros: «… en la Fase 2 se cambiarán desde el servidor, para todos los teléfonos a la vez.»
- Acerca del sistema, renglón «Acceso»: «Simulado (Etapa 1): en la Fase 2, proveedor institucional de identidad».

Propuesta: decirlo sin nombres de fase. Parámetros: «Se cambian desde el servidor, para todos los
teléfonos a la vez». Acceso: «Cuentas del sistema». Los avisos con «(simulado)» sólo existen en la versión
de prueba y pueden quedarse.

**A7. Acerca del sistema dice un mapa base que ya no es el decidido.** Administración.
Hoy dice «Powered by Esri (licencia para producción por confirmar)». Lo decidido es CARTO para calles y
Esri para satélite.
Propuesta: actualizarlo cuando se conecte CARTO; hasta entonces, «Esri (provisional)».

---

## B. Registrar jornada

Lo ven cabos y coordinaciones de todas las instituciones.

**B1. La ayuda bajo «Nombre» repite el ejemplo.** Hoy el campo ya trae «p. ej. Parque Los Pericos» como
texto de ejemplo, y debajo dice «Un nombre que identifique la jornada; por ejemplo, Parque Los Pericos o
Intervención en Calzada de Tlalpan.»
Propuesta: quitar la ayuda de abajo.

**B2. Alcaldía, colonia y prioridad ocupan un tercio de pantalla.** Antes de detectar se ven dos cajas con
«—», la escala de cinco niveles vacía y «Detecte la ubicación para ver la prioridad de la colonia».
Después: dos cajas grandes y la escala.
Propuesta: antes de detectar no se muestra nada. Después, un solo renglón, igual que en la tarjeta y la
franja:

```
Antes:   Alcaldía  [ Cuauhtémoc ]
         Colonia   [ CENTRO IV  ]
         Prioridad de reforestación de la colonia  ▁▂▃▄█ Muy alta
Después: Cuauhtémoc · Col. CENTRO IV · ■ Muy alta
```

**B3. El aviso de ubicación detectada es largo.** «Ubicación detectada (±5 m). Complete abajo la dirección o
referencia si hace falta.» → «Ubicación detectada (±5 m).»

**B4. Etiqueta de fecha larga.** «Fecha de la jornada de plantación» → «Fecha», como ya dice «Editar jornada».

**B5. Dirección distinta en dos ventanas.** En Registrar jornada el ejemplo va dentro del campo: «Calle y
número, entre calles o tramo». En Editar jornada va debajo, y es otro: «Dirección, parque o referencia.»
Propuesta: el de Registrar jornada en las dos, dentro del campo.

---

## C. Nuevo registro

Lo ven cabos y coordinaciones.

**C1. La franja repite la cuenta al completar.** Hoy dice «2 de 2 árboles», muestra la barra llena y
además «Se plantó lo previsto: 2 de 2. Siguiente: cerrar la jornada cuando termine.»
Propuesta: «Siguiente: cerrar la jornada.» La cifra ya está arriba.

**C2. Defecto: la etiqueta del punto dice «PROVISIONAL» aunque ya tenga folio.** Al tocar un punto del
mapa sale «Fresno · PROVISIONAL», mientras la franja «Guardado» ya dice CUH-021-00002. La etiqueta se arma
al guardar y no se actualiza cuando llega el folio. Además, «PROVISIONAL» en mayúsculas alarma en campo.
Propuesta: la etiqueta se actualiza al llegar el folio. Mientras no lo tenga, dice sólo la especie.

---

## D. Jornadas: lista y ficha

**D1. Los filtros llenan la primera pantalla del teléfono.** Todos los perfiles.
Hoy, antes de la primera jornada: el buscador, «Pendientes», seis chips de periodo y «Más filtros». La
primera tarjeta queda casi al final de la pantalla.
Propuesta: en el teléfono los filtros van plegados en un botón «Filtrar», con fichas de lo que está
filtrado, como ya se hace en Registros. La lista queda arriba.

**D2. La ficha dice dos veces qué sigue.** Todos los perfiles.
Hoy aparecen los cuatro pasos (Registrar, Cerrar, Revisar, Reporte) y, junto al botón de abajo, el
renglón «Siguiente: generar el reporte.»
Propuesta: quitar el renglón «Siguiente: …» cuando sólo repite el paso marcado. Se conserva cuando agrega
algo, como «(lo hace el cabo)».

**D3. Defecto: el Directivo ve qué hacer sin poder hacerlo.** Directivo de la Secretaría y de alcaldía.
Hoy ve «Siguiente: cerrar la jornada (7 de 7 árboles).» o «Siguiente: generar el reporte.», pero no
cierra ni genera reportes.
Propuesta: «Falta cerrarla (lo hace el cabo).», o no mostrarle el renglón.

**D4. «Jornada completa» con dos significados.** Todos los perfiles.
Hoy, cuando ya está todo hecho, la ficha dice «Jornada completa: reporte generado el …», incluso en una
jornada con 4 de 5 árboles. Pero «Jornada completa» es también la ventana de cuando se llega a lo
previsto.
Propuesta: «Todo listo: reporte generado el viernes 2 de octubre a las 10:40.»

---

## E. Datos de cierre y vista previa

**E1. Presentación larga en «Datos de cierre de la jornada».** Cabos y coordinaciones.
Hoy dice «Reporte del Camellón Ejemplo · 07-OCT-2026. 2 ejemplares registrados. Todos los campos son
opcionales; los que queden vacíos no aparecen en el reporte.» La jornada y la fecha ya se ven en la ficha
de atrás.
Propuesta: «Todos opcionales: lo que quede vacío no sale en el reporte.»

---

## F. Registros y detalle del árbol

**F1. Renglones vacíos en el detalle.** Todos los perfiles.
Hoy aparecen «Comentarios: Sin comentarios» y «Fotografía: Sin fotografía».
Propuesta: no mostrar un renglón que no tiene dato.

**F2. «Cabo» en el detalle de su propio árbol.** Cabo.
Hoy el renglón «Cabo: Fulana de Tal Ejemplo» sale en los árboles de la propia Fulana, donde siempre es ella.
Propuesta: sólo se muestra a quien ve árboles de varias personas.

**F3. El historial atribuye el folio a una persona.** Sólo en la versión de prueba.
Hoy dice «folio asignado por Perengano Gómez Ejemplo (Coordinador)», porque la sesión que estaba abierta
cuando se simuló el envío era la suya. El folio lo asigna el servidor.
Propuesta: «folio asignado por el servidor».

**F4. «Sustituir árbol» con una sola fecha posible.** Cabos y coordinaciones.
Hoy, si el árbol perdido se plantó hoy, aparece el campo de fecha con «Hoy» y la nota «El árbol perdido se
plantó hoy: la sustitución sólo puede ser de hoy.»
Propuesta: en ese caso, en lugar del campo, un renglón «Fecha: hoy».

---

## G. Supervisión y Mi avance

**G1. Un periodo sin jornadas se ve como un tablero en ceros.** Coordinación, Directivo y Administración.
Hoy aparecen «0 árboles plantados», «— de lo previsto · sin cantidad prevista», una gráfica de siete días
en cero y seis apartados con «0». El cabo, en Mi avance, ve en cambio un solo aviso: «Sin jornadas
cerradas en este periodo».
Propuesta: el mismo aviso corto para todos. Se conservan «Qué atender» y «jornadas en curso», que sí dicen algo.

**G2. Una palabra que suena rara.** Directivo de la Secretaría y Administración.
Hoy dice «Lo que se ha plantado en su ciudad». Propuesta: «… en la Ciudad», o el texto corto de A2.

---

## H. Ventanas

**H1. «¿Qué hacer sin internet?», punto 5.** Todos los perfiles.
Hoy dice «Si va a cambiar de teléfono, cierre antes sus jornadas y genere sus reportes: lo guardado no
pasa solo al teléfono nuevo.» Con el envío al servidor, lo que importa es no dejar nada sin enviar.
Propuesta: «Si va a cambiar de teléfono, antes envíe lo pendiente (la pastilla debe decir «Al día»).»

---

## Lo que se revisó y está bien

- La ventana «Jornada completa».
- «Revise antes de guardar».
- «Cambiar de jornada».
- «Editar jornada», salvo B5.
- La confirmación del cierre. «Cancelar» en rojo de contorno es una decisión tomada (D116).
- La vista previa del reporte.
- El menú de la cuenta.
- Parámetros y Carga masiva: sus textos explican reglas.
- Las diferencias por institución están bien resueltas:
  - una empresa sólo ve «Palmeras», sin chips;
  - el cierre de otras instituciones no pide chófer ni vehículo;
  - el Directivo no ve botones de editar.
- Los mensajes de error de cada campo son claros y dicen qué hacer.

## Lo que esta revisión no cubre

- No se probó en un teléfono real.
- No se revisaron los PDF por dentro, más allá de la vista previa.
- No se revisó el Excel de la carga masiva.
