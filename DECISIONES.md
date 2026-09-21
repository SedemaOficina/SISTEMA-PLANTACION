# Decisiones del proyecto SRP

| # | Decisión | Motivo |
|---|---|---|
| D01 | Dos fases: Fase 1 local sin servidor; Fase 2 servidor, API y sincronización | Probar el flujo de campo antes de invertir en infraestructura |
| D02 | Cuatro perfiles: Registrador, Jefe de registradores, Administración global (SIA), Consulta | Definido por Liber, 21-09-2026 |
| D03 | Jefe edita registros de su equipo; en producción aparece en Fase 2 | Definido por Liber |
| D04 | Los cuatro perfiles se simulan desde Fase 1 | Definido por Liber: estructura lista antes de datos reales |
| D05 | Usuarios en tabla USUARIOS de la base (Fase 2); en Fase 1, almacén `usuarios` | Definido por Liber |
| D06 | Registrador se da de alta con nombre, apellidos, área y cargo-rol; queda fijo en el dispositivo | Cada dispositivo = un registrador |
| D07 | Editor de catálogos sólo para Administración global, en pestaña «Catálogos» | Definido por Liber |
| D08 | Un valor de catálogo con uso no se elimina: se desactiva | Auditoría completa; los registros conservan su valor |
| D09 | Catálogos iniciales: programas Reforestación Urbana y Centro Histórico; áreas Dirección de Infraestructura Verde y Coordinación del SIA | Definido por Liber |
| D10 | Toda alta, edición, eliminación, activación y desactivación queda en bitácora (quién, cuándo, perfil, campos) | Norma 7.7; definido por Liber |
| D11 | Eliminar un registro lo marca `eliminado`; no se borra | Norma 7.4: un solo camino de retiro, con constancia |
| D12 | Los registros guardan identificadores de especie, programa y registrador, no sus nombres | Fuente única: renombrar en catálogo actualiza todo. Sustituye el esquema previo que copiaba nombres |
| D13 | Bibliotecas incluidas localmente, no desde CDN | Funciona sin señal y al abrir con doble clic |
| D14 | Turf empaquetado sólo con punto-en-polígono (12 KB en lugar de 592 KB) | Rendimiento en teléfono modesto |
| D15 | En bordes entre polígonos gana el primero que contiene el punto | Precedencia declarada (Norma 6.6). [pendiente] revisar con capas reales |
| D16 | Cruce territorial en el navegador sólo para registro de campo | Si en Fase 2 se usa para turnar o validar, se hace en servidor (Norma 6.4) |
| D17 | Se retiran `enviado_en`, `id_servidor` y `comentarios` del esquema previo | Norma 4.7 y 1.8: sin uso en Fase 1; se agregan cuando exista el uso |
| D18 | Mapa: pan con dos dedos, acercar con +/−; alternativa de captura manual de coordenadas | Evita conflicto con el desplazamiento; Norma 6.10 |
| D19 | El filtro de periodo son tres atajos (Este mes, Mes pasado, Este año) más listas de Año y Mes; el rango Desde/Hasta queda para casos finos | Definido por Liber: el sistema opera hasta 2030 y una fila de chips de mes sueltos deja de servir al acumularse los años |
| D20 | Año/Mes y el rango Desde/Hasta no conviven: elegir uno limpia el otro | Dos criterios de fecha a la vez producen un resultado que nadie puede explicar |
| D21 | El mes sólo lista los meses con registros en el año elegido | Evita elegir un periodo vacío y dudar si el filtro falló |
| D22 | Al agregar en cualquier catálogo, la clave se sugiere a partir del nombre: sin acentos, mayúsculas, guion bajo; editable antes de guardar y fija después | Definido por Liber. La unión de datos se hace por clave (Norma 6.5), así que debe ser estable y legible |
| D23 | Si la clave sugerida ya existe, se propone con sufijo _2, _3 | Dos valores con la misma clave harían ambigua la unión |
| D24 | Las claves del catálogo real de especies se cargan tal cual; la generación automática aplica sólo a lo que se agregue después | Definido por Liber: su archivo ya trae claves propias |

## Pendientes de decisión

- [pendiente] ¿El apellido materno debe ser obligatorio? Hoy es opcional: hay personas que no lo tienen
- [pendiente] ¿Puede una persona editar sus propios datos, o sólo la Administración global?
- [pendiente] ¿El Jefe de registradores también registra plantaciones? ¿Puede eliminar? (hoy: registra sí, elimina no)
- [pendiente] Proveedor de mapa base para producción (OpenStreetMap no admite uso institucional intensivo)
- [pendiente] Capas reales de colonias y malla UGA: origen, fecha de corte y área responsable
- [pendiente] Validación del catálogo de especies y su clasificación Nativa / Introducida por el área técnica
- [pendiente] Formato de las claves del catálogo real de especies, para confirmar que no choquen con las generadas
- [pendiente] Cuenta institucional para el repositorio y la publicación (Norma 1.7)
- [pendiente] Aviso de privacidad: el sistema recaba nombre, área y cargo del personal (Norma 1.8)
