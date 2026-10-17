# Revisión del servidor

17-10-2026 · versión 0.9.77 · alcance: el servicio del SRP (`servidor/src/modulos/srp/`, lo que viaja al
SIA), sus guiones de base de datos (`servidor/db/srp/`), el guion de la primera cuenta
(`servidor/deploy/`) y sus pruebas (`servidor/pruebas/`). La aplicación se auditó aparte
(`docs/AUDITORIA-INTEGRAL-APP.md`, `docs/AUDITORIA-COMPLETA.md`).

Se leyó el código completo, se midió con los 17,479 árboles de la base local y se revisó contra la lista que
el SIA aplica a todo paquete (`docs/GUIA-PROYECTOS-SIA.md`, § 10). Se corrigió todo lo que no cambia
pantallas ni decisiones; cada corrección tiene su prueba.

## 1. Resultado

| Frente | Referencia | Hallazgos | Corregidos | Para el SIA | Aceptados |
|---|---|---|---|---|---|
| Seguridad | OWASP ASVS 4.0, nivel 2: autenticación, sesiones, control de acceso, validación, errores y archivos | 4 | 3 | 0 | 1 |
| Integridad de los datos | — | 3 | 3 | 0 | 0 |
| Alineación con el SIA | `docs/GUIA-PROYECTOS-SIA.md`, § 10 | 1 | 1 | 0 | 0 |
| Rendimiento y robustez | — | 2 | 2 | 0 | 0 |
| Código y datos personales | — | 3 | 1 | 1 | 1 |

Ningún hallazgo crítico ni alto. Los de severidad media están corregidos. Queda uno para el SIA: el plazo
de conservación del registro de entradas.

## 2. Hallazgos

| # | Severidad | Frente | Hallazgo | Estado |
|---|---|---|---|---|
| 1 | Media | Seguridad | **Sin límite de entradas fallidas por procedencia.** El bloqueo por cuenta frena a quien prueba muchas contraseñas en una cuenta, pero no a quien prueba una contraseña común en muchas cuentas. El SIA lo pide en todo paquete (ASVS 2.2.1). Esperaba a que el SIA corrigiera su módulo común de procedencia, que tomaba la dirección del intermediario y daba la misma para todos; ya lo corrigió. | **Corregido**: cada entrada fallida cuenta para su dirección; pasadas 30 en 15 minutos (`SRP_INTENTOS_POR_PROCEDENCIA`, `SRP_BLOQUEO_MINUTOS`), esa dirección recibe 429 sin que se verifique nada, y lo que espera no se anota. Índice nuevo para contar sin recorrer la tabla. |
| 2 | Media | Seguridad | **La contraseña actual se podía probar sin límite** al cambiarla: con una sesión abierta, alguien podía adivinar la contraseña de la persona, que quizá usa en otros lados (ASVS 2.2.1). | **Corregido**: cada intento cuenta como uno de entrar; el que llega al máximo bloquea la cuenta y se anota como bloqueo. La temporal la escribe la aplicación sola, así que en el uso normal no pasa. |
| 3 | Media | Alineación | **Nada cortaba en la base una consulta de más de un minuto.** El servidor web corta la API al minuto, pero la consulta seguía corriendo en PostgreSQL, ocupando una conexión y sus bloqueos. | **Corregido**: `srp_api` tiene `statement_timeout` de 50 segundos (`09-srp-rol-y-grants.sql`). La más lenta que se midió tarda 0.3 s. |
| 4 | Baja | Seguridad | **La cuenta del servicio podía borrar árboles, contraseñas y sesiones**, que el servicio nunca borra: un árbol se marca eliminado, una sesión se cierra. El SIA pide «sin un permiso de más». | **Corregido**: `srp_api` borra sólo cuentas, jornadas y valores de catálogo, lo que el sistema permite borrar sin uso. Al borrar una cuenta, la base se lleva su contraseña y sus sesiones. |
| 5 | Baja | Integridad | **Textos sin largo máximo en el servidor**: nombre, dirección y comentarios de la jornada, los datos de cierre, «Otra especie», y nombre y cargo de una cuenta. Un envío hecho fuera de la aplicación podía guardar hasta 100 KB por campo, que después baja a cada teléfono. | **Corregido**: los largos del formulario de la aplicación, con sus mensajes. En la aplicación, los campos que no tenían largo máximo ahora lo tienen. |
| 6 | Baja | Integridad | **Dos envíos al mismo tiempo de fotografías distintas con el mismo id** podían dejar el archivo de una con el registro de la otra: los dos usaban el mismo nombre temporal. | **Corregido**: van uno a la vez por fotografía, y cada uno escribe con su propio nombre temporal. La prueba nueva no logró provocar el choque sin el candado: el arreglo es preventivo. |
| 7 | Baja | Integridad | **Un árbol PROVISIONAL nunca recibía su folio**, aunque el aviso dice «hasta que se pueda ubicar». Pasa si el territorio no se pudo ubicar al recibirlo, por ejemplo por una capa sin versión. | **Corregido**: lo recibe al editarlo, si su territorio ya se puede ubicar. |
| 8 | Baja | Robustez | **Una variable de entorno mal escrita** («72 horas» en lugar de 72) hacía fallar el alta de cuentas o la entrada, sin decir por qué. | **Corregido**: se usa el valor de arranque y se avisa en el registro del servidor, sin detener el backend. |
| 9 | Baja | Rendimiento | **Dos consultas recorrían una tabla entera**: buscar el árbol de una fotografía que llega, y la primera página del Registro de cambios. Hoy tardan 3 ms y crecen con los datos. | **Corregido**: dos índices; ahora tardan 1 ms o menos. |
| 10 | Baja | Código | Comentarios y documentos decían que la contraseña temporal «sirve una sola vez»: sirve hasta que la persona escribe una propia o vence, y sólo para eso. Otro hablaba en futuro, y la lista de permisos de `srp_api` decía que borraba lotes y sesiones. | **Corregido**. |
| 11 | Informativo | Seguridad | Un correo sin cuenta responde 1 ms antes que uno con cuenta (una consulta menos), contra unos 50 ms de la verificación de la contraseña. | **Aceptado**: así responde también el módulo `acceso` del SIA, y la diferencia se pierde en la red. |
| 12 | Informativo | Datos personales | El registro de entradas guarda la dirección y el navegador de cada intento sin plazo, y las sesiones cerradas se quedan en su tabla. | **Para el SIA**: el plazo de conservación, junto con el aviso de privacidad, que ya está en la lista de lo que falta antes de operar. |
| 13 | Informativo | Datos personales | La fotografía se acepta por su firma (JPEG, PNG o WebP) y se guarda tal como llega, con sus metadatos. La aplicación siempre la vuelve a hacer en el teléfono, a lo más de 800 × 600, antes de mandarla, y eso le quita los datos del teléfono, como el lugar donde se tomó. | **Aceptado**: sin acción. |

## 3. Lo que se revisó y está bien

- **Entrada.** El mismo 401, con el mismo mensaje y el mismo tiempo, para toda entrada fallida. Contraseñas
  con scrypt y los parámetros de `acceso`. Bloqueo por cuenta con el intento anotado en un solo paso, antes
  de verificar. Temporal que vence. Mientras la contraseña es temporal, sólo se puede cambiarla o salir.
- **Sesiones.** Testigo al azar de 32 bytes; en la base sólo su resumen. Cookie sólo HTTP, del mismo sitio,
  segura y con la ruta de la API. Se cierra al salir, al vencer, al desactivar la cuenta o su institución y
  al cambiar o restablecer la contraseña. Un cambio de perfil vale desde la siguiente petición.
- **Control de acceso.** Toda ruta pide sesión, salvo entrar. Cada acción revisa su permiso con las reglas
  de la aplicación (una prueba las compara una por una). El alcance de cada perfil va en la consulta misma.
  Lo que alguien no puede ver le responde como si no existiera.
- **Consultas.** Todo valor va como parámetro. Los nombres de tabla y columna salen de listas fijas del
  código, nunca de la petición.
- **Archivos.** El nombre es el id, revisado como UUID, con una extensión fija. Viven fuera de lo que se
  publica, y el tamaño se revisa antes de leer.
- **Errores.** La persona recibe un mensaje escrito para ella; el detalle de la base queda sólo en el
  registro del servidor.
- **Integridad.**
  - Cada operación va en su propia transacción.
  - La versión de cada registro impide escribir sobre lo que otra persona cambió.
  - El folio se da en la misma transacción que el árbol y no cambia, por disparador.
  - Las dos bitácoras sólo crecen, por disparador.
  - Las llaves foráneas sostienen lo demás.
- **La lista del SIA** (`docs/GUIA-PROYECTOS-SIA.md`, § 10), en lo que toca al servidor:
  - esquema, cuenta, ruta y variables con las siglas `srp`;
  - `territorio` se lee, no se copia;
  - la cuenta del servicio, sin un permiso de más;
  - bitácora inmutable;
  - ninguna petición de más de un minuto: cargas por tandas y tope en la base;
  - contraseñas y entrada como `acceso`;
  - límite por procedencia con el módulo común;
  - cookie con su ruta, y sesiones en una tabla propia;
  - fragmento del servidor web con `absolute_redirect off` y sin HSTS;
  - fotografías fuera de lo publicado, con su estimado de espacio (`GET /fotos/uso`).

## 4. Mediciones

Con la base local: 17,479 árboles, 1,305 jornadas y 19,586 renglones de bitácora. Una cuenta de cada perfil,
la que más árboles tiene a su cargo. Es lo que trae cada teléfono al entrar, todas las páginas.

| Consulta | Resultado |
|---|---|
| Árboles, Administración global o dirección de la Secretaría | 17,479 en 9 páginas, 0.3 s |
| Árboles, coordinación de la Secretaría | 4,627 en 3 páginas, 0.08 s |
| Árboles, coordinación o dirección de otra institución | 2,553 en 2 páginas, 0.05 s |
| Árboles, un cabo | 961 a 1,304, 0.03 s |
| Jornadas, cualquier perfil | 0.04 s o menos |
| Registro de cambios, primera página | 1 ms (antes, 3 ms) |
| Buscar el árbol de una fotografía | menos de 1 ms (antes, 3 ms) |
| Ubicar un punto (alcaldía, colonia y celda) | 2 ms |
| Buscar vecinos de un árbol (posibles duplicados) | 1 ms |
| Carga masiva de 5,000 árboles (bloque 229) | 14 s, en 17 tandas |

Crecen en proporción a los datos: con cinco veces más árboles, la Administración tardaría alrededor de
1.5 s en traer todo.

## 5. Pruebas

`npm test`: 95 pruebas, todas pasan. Lo que agregó esta revisión, en 5 pruebas nuevas y 3 ampliadas:

- el límite por procedencia: tres fallidas desde una dirección y la cuarta espera, aun con la contraseña
  buena; desde otra dirección se entra;
- la contraseña actual con tope: el intento que llega al máximo bloquea la cuenta, y uno bueno vuelve a
  contar desde cero;
- un valor de configuración mal escrito;
- los largos de los textos;
- el folio de un árbol PROVISIONAL al editarlo;
- dos fotografías con el mismo id al mismo tiempo;
- que `srp_api` no borre árboles, contraseñas ni sesiones, que al borrar una cuenta se vayan las suyas, y
  su tope de 50 segundos.

La prueba de humo sobre una copia de `sia-backend` con el módulo integrado da 23 de 23, y la de la
aplicación con datos reales contra el servicio, 91 de 91.

## 6. Lo que esta revisión no cubre

- **Muchos teléfonos a la vez.** Se midió en un solo equipo, una consulta tras otra.
- **El servidor del SIA:** su red, su servidor web, sus versiones y su configuración de PostgreSQL.
- **Una prueba de penetración** hecha por alguien de fuera.
- **La cobertura de líneas del servidor**: no se midió.
