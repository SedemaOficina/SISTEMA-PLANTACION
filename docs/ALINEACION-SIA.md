# Alineación del servidor del SRP con el backend del SIA

Revisión del 08-10-2026 contra el repositorio del backend del SIA. El objetivo: que el SIA pueda copiar el
módulo del SRP a su backend casi sin tocarlo, con la misma forma que sus otros módulos. Este documento
no lleva direcciones, cuentas de equipo ni versiones de la infraestructura del SIA.

## 1. Cómo trabaja el backend del SIA

- **Una base, un esquema por proyecto.** Todos los proyectos viven en la misma base. Cada proyecto tiene
  su esquema y su propia cuenta de servicio, `<esquema>_api`, sin superusuario y con un límite de
  conexiones. Esa cuenta sólo alcanza su esquema: la de un proyecto no puede leer otro, y eso se prueba
  ejecutando como la cuenta.
- **El marco territorial es compartido.** Alcaldías, colonias y malla UGA viven en el esquema
  `territorio`, de sólo lectura, y cada módulo lo lee con el rol de grupo `territorio_lectura`. Su regla:
  si el dato existiría aunque el programa no existiera, es de `territorio` y no se copia. Antes hubo tres
  copias que no coincidían.
- **Los guiones SQL** de cada módulo van en `db/<módulo>/`, numerados (`01-<módulo>-esquema`,
  `02-<módulo>-sobre-territorio`, `03-<módulo>-rol-y-grants`). Los corre quien administra la base. Cada
  guion de permisos termina con lo que debe funcionar y lo que debe fallar al correrlo como la cuenta.
- **Un solo proceso Express**, en TypeScript, empacado en un archivo. Cada módulo vive en
  `src/modulos/<módulo>/` y entrega `crearRutas<Módulo>(pool)`, que se monta en `/api/<módulo>`.
- **Una conexión por módulo**, con sus variables `<MÓDULO>_DB_USER` y `<MÓDULO>_DB_PASS`. Sin ellas el
  proceso no arranca: no hay cuenta de respaldo.
- **La base hace el trabajo.** Disparadores recalculan alcaldía, colonia y celda del punto, asignan el folio
  con una tabla contador y escriben la bitácora. Express valida la forma, pone lo que el cliente no decide y
  traduce los errores; lo interno nunca llega a la persona.
- **Fotografías** como archivos fuera de lo publicado, revisadas por su contenido y servidas por una ruta.
- **Cuentas de personas** en el esquema `acceso`: funcionarios con permiso por recurso, sesiones cortas,
  bitácora que no se edita ni se borra, y altas manuales por un guion que genera la contraseña y su hash
  en el equipo de quien administra.
- **Ya hay un módulo de plantación**, `plantacion`, que reemplazó a un sistema anterior en PHP. El SRP es
  otro módulo, aparte: convive con él sin tocarlo y lo sustituye cuando funcione; entonces el SIA retira
  el viejo.

## 2. Decisiones

| # | Decisión | Estado |
|---|---|---|
| 1 | El esquema se llama `srp`, la cuenta `srp_api` y la ruta `/api/srp`: siglas, como `jpv`, `irs` o `caec`, sin chocar con `plantacion` | Aprobada (08-10-2026) |
| 2 | El servicio pasa a TypeScript con la forma de los módulos del SIA, para copiarse tal cual | Aprobada (08-10-2026) |
| 3 | Dónde viven las cuentas de las personas: en el SRP (las da de alta la Administración global desde la aplicación) o en `acceso` del SIA | **Abierta**: pregunta al SIA |

Mientras se decide la 3, el SRP conserva sus cuentas, pero con el mismo formato de contraseña y de sesión
que `acceso`, para que mudarlas después sea copiar renglones sin pedir contraseñas nuevas.

## 3. Fases

1. **Hecha (bloque 197).** Guiones en `servidor/db/srp/` con la numeración del SIA. Una sola cuenta,
   `srp_api`, que hereda `territorio_lectura` y no tiene ningún permiso directo fuera de `srp`.
   `srp.derivar` lee `territorio`. Del SRP sólo queda la capa propia, las colonias prioritarias (2,243, otro
   marco de colonias). La base local lleva una réplica de las tablas de `territorio`
   (`servidor/db/local/territorio.sql`) que nunca se entrega. Las capas de la aplicación van en orden de
   clave, para que el teléfono y el servidor desempaten igual en un borde.
2. **El servicio en TypeScript**, en `servidor/src/modulos/srp/`, con `crearRutasSrp(pool)`, conexión por
   `SRP_DB_USER` y `SRP_DB_PASS`, y errores traducidos como en el SIA. Sin dependencias que el SIA no use ya.
3. **El acceso con los formatos del SIA:** contraseña con scrypt N=16384, r=8, p=1, en base64url; testigo
   de sesión de 32 bytes con su resumen sha256 en hexadecimal; la primera cuenta con un guion que sólo
   imprime el SQL. Después, lo que decida el SIA en la decisión 3.
4. **La recepción como la hace el SIA:** disparadores que vuelven a derivar el punto, asignan el folio con
   un contador por celda y escriben la bitácora, que ya no se podrá editar ni borrar ni siquiera por error.
   Fotografías como archivos.

## 4. Preguntas para el SIA

1. Cuentas de las personas: ¿cada proyecto con las suyas o todas en `acceso`? Si van en `acceso`, ¿la
   Administración del SRP puede dar de alta, activar y desactivar desde la aplicación, o cada alta la hace
   el SIA?
2. `territorio.colonias_iecm_2022`: ¿su columna de geometría se llama `geom`? (Se cargó desde un
   shapefile.)
3. `territorio.malla_uga_1km`: ¿es la versión final que el SIA entregó el 22-09-2026? El folio depende de
   ella. Y `territorio.alcaldia`: ¿es la misma capa de alcaldías que usa el SRP?
4. ¿Les parecen bien el esquema `srp`, la cuenta `srp_api` y la ruta `/api/srp`?
5. La aplicación es una página estática que se instala en el teléfono: ¿dónde la publican, junto a su
   API?

## 5. Lo que no se copia

- Los comentarios con historia (fechas, números de decisión, incidentes): el código del SRP dice qué hace
  y por qué; la historia vive en DECISIONES y BITACORA.
- Las sesiones de 30 minutos que se cierran con el navegador: un cabo trabaja horas en campo, a veces sin
  señal. En el SRP la sesión vence tras una semana sin uso; cada uso renueva la semana (decisión de Liber,
  09-10-2026).
