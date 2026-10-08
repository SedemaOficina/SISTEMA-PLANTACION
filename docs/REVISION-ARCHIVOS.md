# Revisión de los archivos que entrega el sistema (versión 0.9.50)

07-10-2026. Liber pidió revisar por dentro los PDF y el Excel de la carga masiva, que la revisión de pantallas no
cubrió. Sólo sugerencias: nada de esto está programado.

**Qué se revisó.** Todo se generó con los datos de demostración y se revisó página por página.
- **Reportes de jornada:** cuatro, de la Secretaría con vehículo, de alcaldía, de una solicitud y de empresa.
- **Informes de Supervisión:** cuatro.
  - Administración: mensual y anual (de este, sólo las primeras cuatro páginas de 28).
  - Coordinación de alcaldía: semanal.
  - Cabo: mensual.
- **Tablas CSV:** las que acompañan a cada informe de Supervisión.
- **Plantilla de carga masiva.**
- **Excel del catálogo de especies.**

**Qué no se revisó.** En los datos de demostración no hay casos para estos archivos; habría que armarlos:
- un reporte con sustitutos;
- un reporte de una jornada de varios días;
- el archivo de «renglones con problemas» de la carga;
- el ZIP de fotografías.

Los marcados **Defecto** son fallas, no gustos.

**Estado (07-10-2026).** Liber aprobó P, S y C: hechos en el bloque 192 (versión 0.9.51, D272), salvo **P6 y P7,
por decidir**. La plantilla de Excel (X) queda pendiente. **Actualización (08-10-2026):** lo pendiente se aprobó y se hizo en el bloque 194 (versión 0.9.53, D274); P6 se quitó del PDF, P7 se queda como viene y X3 es «Gobierno de la CDMX».

---

## P. Reporte de la jornada (PDF)

Lo generan cabos y coordinaciones; el Directivo lo descarga.

**P1. Media página en blanco al principio, en las jornadas de la Secretaría.** En esas jornadas el reporte
lleva Personal y Datos del vehículo, que ocupan poco. El croquis ya no cabe y pasa a la página 2, dejando
casi media página 1 vacía. En el de alcaldía, sin esas secciones, el croquis sí cabe y el reporte tiene 3
páginas en lugar de 4.
Propuesta: Personal y Vehículo van después de los totales por especie. El croquis queda en la página 1 en
todos los reportes.

**P2. La última página casi vacía.** Sólo trae «6. Distribución de las especies», una barra, y las notas
del final. La distribución ya está en la columna «Distribución» de los totales y en la cifra de arriba.
Propuesta: la barra va debajo de los totales, en la misma página, sin sección propia.

**P3. «100 % nativas» con 23 % de endémicas.** Arriba dice «100 % nativas» y abajo «Nativa 77 % ·
Endémica 23 %». Toda endémica es nativa, pero se lee como contradicción.
Propuesta: «100 % nativas o endémicas».

**P4. El crédito del mapa sale dos veces.** Va escrito sobre la imagen del croquis y otra vez en el texto
de debajo.
Propuesta: sólo en el texto de debajo.

**P5. «Comentarios» y «Observaciones», seguidos y casi iguales.** El primero se escribe al iniciar la
jornada; el segundo, en los datos de cierre.
Propuesta: «Comentarios al iniciar» y «Observaciones del cierre».

**P6. Una nota técnica al final.** «Territorio derivado con las capas: Alcaldías sia-2026-01-01 · UGA
sia-2026-09-22 · Colonias iecm-2022». Sirve para rastrear de dónde salió la alcaldía y la colonia, pero a
quien lee el reporte no le dice nada.
Propuesta: dejarla, en letra más chica, junto a «Generado por…». O quitarla del PDF: ya se guarda en cada
árbol. **Para decidir.**

**P7. La colonia en mayúsculas y sin acentos.** Dice «Colonia: LEYES DE REFORMA 2A SECCION», que es como
viene en la capa. **Para decidir:** dejarla así, que es el dato oficial, o escribirla en minúsculas con
inicial mayúscula. Los acentos no se pueden recuperar porque la capa no los trae.

---

## S. Informe de Supervisión (PDF)

Lo generan coordinaciones, directivos, administración y el cabo («Mi avance»).

**S1. Defecto: plurales mal en «Por cabo».** Dice «1 eliminados», «1 editados» y «1 abiertas de antes».
En la pantalla de Supervisión sí sale bien.
Propuesta: corregirlo para que diga «1 eliminado», «1 editado», «1 abierta de antes».

**S2. «17 de 17» se parte en dos renglones.** Pasa en la columna «Árboles» de «Jornadas cerradas del
periodo», y la tabla se alarga.
Propuesta: ensanchar esa columna, quitándole espacio a «Jornada».

**S3. La columna «Cabo» incluye coordinaciones.** Las coordinaciones también registran árboles y salen
listadas como «Cabo». Lo mismo pasa en el encabezado de la tabla CSV.
Propuesta: «Quién registró», como en los filtros.

**S4. La primera semana del mes lleva la fecha del mes anterior.** En el informe de septiembre, la primera
fila dice «31-AGO», aunque sólo cuenta del 1 al 6 de septiembre.
Propuesta: «1–6 SEP».

**S5. Una página final con dos renglones.** «Documento de prueba…» y «Generado por…» quedan solos en la
última página del informe mensual.
Propuesta: que vayan pegados a las notas de la página anterior.

**S6. El informe de una coordinación de otra institución no dice cuál es.** Dice «Cuadrilla de Sergio
Navarro Ejemplo (coordinación)».
Propuesta: «… · Alcaldía Iztapalapa».

**S7. «0 %» con árboles.** Por ejemplo, «Iztacalco: 6 árboles · 0 %».
Propuesta: «menos de 1 %».

**S8. La alcaldía sin «Alcaldía» cuando solicita.** En «Solicitudes» dice «Iztapalapa», y en la lista de
jornadas, «(solicita Iztapalapa)».
Propuesta: «Alcaldía Iztapalapa», como en «Por institución».

**S9. Palabras internas en la nota final.** «En esta etapa, el informe reúne lo capturado en este
dispositivo.» Lleva «etapa» y dejará de ser cierta cuando la app lea del servidor.
Propuesta: quitarla cuando se conecte el servidor. Hasta entonces: «Reúne lo capturado en este dispositivo».

**S10. «Trazabilidad» en ceros.** Cuando no hubo movimiento, la tabla dice «Eliminados 0 · Ediciones 0».
Propuesta: un renglón «Sin árboles eliminados ni editados en el periodo».

---

## C. Tabla CSV

**C1.** El encabezado «Cabo» es el mismo caso que S3.

Lo demás está bien:
- UTF-8 con marca, así que Excel muestra bien los acentos;
- fechas en AAAA-MM-DD;
- un renglón por árbol, con 22 columnas;
- folio, celda UGA, origen del punto y precisión;
- solicitud y sustitución.

---

## X. Plantilla de carga masiva (Excel)

La usa Administración.

**X1. Sin listas para elegir en la hoja «Árboles».** Programa, tipo de institución, institución y nombre
científico se escriben a mano. Un error de dedo se descubre hasta que el sistema revisa el archivo.
Propuesta: que esas cuatro columnas ofrezcan una lista desplegable, tomada de las otras hojas de la
plantilla.

**X2. Faltan dos reglas en «Instrucciones».** No dice que el límite es de 20,000 renglones por archivo.
Tampoco dice que los árboles quedan a nombre de quien carga, en jornadas cerradas marcadas como carga
histórica; eso sólo lo dice la pantalla.
Propuesta: agregar esos dos renglones.

**X3. La Secretaría tiene dos tipos distintos.** En la plantilla es «Gobierno de la CDMX»; en el informe
(«Por institución») es «Secretaría».
Propuesta: un solo tipo en todo el sistema. **Para decidir cuál.**

**X4. La hoja «Árboles» no tiene autofiltro.** Las demás hojas sí lo tienen.
Propuesta: agregarlo.

---

## Lo que está bien

- **El reporte de la jornada:**
  - encabezado institucional;
  - datos en dos columnas;
  - cifras arriba;
  - croquis numerado con escala y norte;
  - tabla de ejemplares con la precisión en color y su explicación;
  - totales por especie;
  - pie con la fecha y la página.
- **El reporte de alcaldía:** no pide Personal ni Vehículo, y cabe en 3 páginas.
- **El informe:**
  - resumen, «Qué atender», series por semana o día y desgloses;
  - la lista de jornadas con prioridad y reporte;
  - el periodo en el pie de cada página.
- **El Excel del catálogo de especies:** trae su diccionario de datos y la hoja de valores admitidos.
