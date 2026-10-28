# Evidencia de la auditoría del 27-10-2026

Evidencia del informe `AUDITORIA-2026-10-27.md` (SRP 1.4.2, commit `1eb30e6`). Cada carpeta `r1/` a `r6/` es la
evidencia de un revisor, copiada de su carpeta de trabajo. Las claves originales de los hallazgos (por ejemplo
`B6-R2-01`) están entre paréntesis en el informe, junto a su clave nueva.

**En el repositorio** van sólo los guiones y las salidas de texto (228 archivos, 2.5 MB). La evidencia completa, con las
capturas, los PDF y los datos grandes (29 MB), está fuera del repositorio, en `servidor/local/auditoria-2026-10-27/`.
Lo que este LEEME dice de capturas y PDF se refiere a esa copia completa.

## Qué se hizo al copiar

- **Se dejó fuera** (no es evidencia, o no debe circular):
  - las copias regeneradas del proyecto: `r1/a1/v11` (la 1.1 completa), las carpetas grandes de `r1/a3/tmp/` (lo que
    produjeron los generadores y las copias de producción, que se vuelven a sacar con `r1/a3/regenerar.sh`; se
    quedaron sus bitácoras y listas), `r2/app-produccion*` y `r4/nginx/www` (la copia de producción servida);
  - `r4/f5_srp_1.4.2.diff`: lleva contexto del backend del SIA; lo vuelve a sacar `r4/f5_ensayo_instalacion.py`;
  - los archivos plantados a propósito para probar el empaquetador (un `.env` con contraseña, un respaldo, un CSV con
    claves y los demás): nunca estuvieron en la carpeta de evidencia de r4; aquí sólo queda su lista de nombres, en
    `r4/f4_empaquetar_huecos.txt`;
  - las salidas de E2 (`r5/salidas/e2/` y `r5/salidas/e2_respaldo_salida.txt`): las revisa y las agrega la coordinación;
  - 239 capturas repetidas o no citadas, para quedar bajo 30 MB. La lista, con el motivo de cada una, está en
    `CAPTURAS-FUERA.txt`; siguen en la carpeta de cada revisor con el mismo nombre. Son, sobre todo, las del barrido
    de pantallas (resultados en `r2/b1-resumen-*.txt` y `barrido-*.json`), las de B4 a 1440 px, las capturas
    completas del mapa de A6, las segundas y terceras corridas de r2 y r6 y el recorrido de escritorio de r3.
- **Se comprimieron sin perder nada** los datos de más de 1 MB: `r1/a2/puntos_sql.csv.zip`,
  `r1/b2/app_todo.csv.zip`, `r1/b2/app_compartida_no.csv.zip` y `r3/pdf/s6-tabla-compartidas.csv.zip`.
- **Rutas personales:** en los archivos de texto, toda ruta que empezaba con la carpeta del usuario de Windows se
  reemplazó por `<carpeta del usuario>` (118 reemplazos).
- **Contraseñas:** se buscaron `password`, `PGPASSWORD`, `secret`, `contraseña`, `clave`, `_PASS`, llaves y tokens.
  Había dos contraseñas de prueba escritas en guiones, de cuentas ya borradas: se quitaron y ahora se pasan por una
  variable (`R4_CLAVE` en `r4/e1_acceso.mjs` y `R6_CLAVE` en `r6/comun.py`). Lo demás son nombres de campos, textos
  de la aplicación o contraseñas generadas al azar en memoria.
- **Placas reales:** las 16 placas de la base local se leyeron sólo en memoria y se buscaron en todo el texto, dentro
  de los ZIP y en el texto de los 11 PDF: 0 apariciones. Las capturas en modo real que podían mostrar un vehículo (las tres de la
  ventana de cierre de la Coordinación) se revisaron a ojo: no muestran placas.
- **Sin direcciones internas:** 0 direcciones IP privadas y 0 nombres de servidores internos en el texto. Las únicas
  direcciones son las de la propia computadora (`127.0.0.1`) en los guiones y bitácoras locales.

## Qué hay en cada carpeta

### `r1/` · Pruebas, datos y construcción (A1 a A5, B2, B3, D2, D3)
- `a1/`: los tramos de la prueba completa corridos solos (`tramos_*`, `original_corrida2.*`), los guiones que
  encontraron la causa de cada falla (`depurar_84.py`, `depurar_calle*.py`, `medir_aviso.py`), la prueba ajustada sólo
  en sus esperas (`ajustar_prueba.py` y su resultado en `ajustada/` y `ajustada_*`), las secciones nuevas contra la
  1.1 (`nuevas_contra_v11.*`) y el mapa de cobertura del servidor por lectura.
- `a2/`: la capa de calles instalada contra el gpkg (`capa_bd_contra_gpkg.py`) y la calle de la versión de prueba
  contra la del servidor en 33,808 puntos (`puntos_sql.sql`, `calle_js_contra_sql.mjs`, `un_punto.mjs`).
- `a3/`: `regenerar.sh` (los generadores y la copia de producción, dos veces) con sus bitácoras.
- `a4/`: ESLint, revisión de tipos y pyflakes.
- `a5/`: la salida de `pruebas/auditoria.py`.
- `b2/`: el recálculo de cifras en SQL (`b2_sql.sql`) contra la pantalla, el PDF y el CSV en modo real
  (`b2_real.py`, `b2_comparar.py`), y la compartida propia (`b3_compartida_real.*`); `limpieza.txt`.
- `b3/`: las fórmulas en el CSV (`csv_formulas.py`).
- `d2/`: el diccionario contra la base (`diccionario_contra_base.py`).
- `salida/`: archivos generados por la aplicación en las pruebas (reportes PDF y fotografías de prueba).

### `r2/` · Pantallas, accesibilidad y teléfono (A6, B1, B4, B6, B8)
- `guiones/`: el barrido (`barrido_r2.py`, `resumen_r2.py`), axe y teclado en los estados nuevos (`b4_nuevas.py`,
  `foco_jornada.py`), contraste (`a6_contraste.py`, `a6_chip_hover.py`), la compartida en modo real
  (`compartida_real.py`), reabrir sin señal (`apoyo_reabre_sin_senal.py`), sesión y service worker
  (`b6_sesion_sw.py`), la calle sin señal (`calles_sin_senal.py`), las fechas (`fechas_compartida.py`) y la fotografía
  en WebKit (`foto_webkit.py`).
- `b1-prueba/`, `b1-real/` y `b1-resumen-*.txt`: el barrido por perfil (sin sus capturas).
- `b4/` y `b4-*.log`: axe, foco y anuncios en Chromium a 390 y 1440 y en WebKit a 390.
- `a6/` y `a6-*`: contraste medido y los recortes del círculo del GPS.
- `b6/`, `b6-b8/` y `b8/`: B6-01 y B6-02 (`b6-b8/corridas.log`, `compartida-*.json`, `b6/apoyo-reabre-*`), la sesión y
  el service worker, la calle sin señal, las fechas y la fotografía.
- `tmp/`: las pruebas aisladas de la fotografía en WebKit sin red (límite de la herramienta).

### `r3/` · Tareas, UX, textos y manuales (C1 a C6)
- `s1_compartida.py` a `s10_nota_cierre.py` con sus salidas `s*.json`: el flujo de la compartida, pantallas, fichas y
  filtros, cifras de Supervisión (`s4_cifras.py`: B2-01, B2-02 y B2-03), estados, informes, modo real (`s8_real.py`:
  B6-02; `s9_real_cerrada.py`: B6-01) y la nota de cierre (C5-01).
- `real_cuentas.py`: crea y quita las cuentas de modo real; su contraseña se genera al azar y no se guarda aquí.
- `capturas/`: las del teléfono y las citadas del escritorio.
- `pdf/`: reportes, informes y su texto extraído (`pdf_texto.py`).
- `manuales/`: la revisión de los manuales contra la aplicación (`citas.py`, `sondeo.py`, `sondeo2.py` y sus salidas).
- `textos-nuevos-crudos.txt` y `diff-app-desde-1.1.txt`: el inventario de textos y el cambio desde la 1.1.

### `r4/` · Seguridad, despliegue y paquete (E1, B7, B9, F3, F4, F5, F6)
- `e1_acceso.mjs` y `e1_acceso.*`: las 135 peticiones alteradas (E1-01 en los casos 129 a 131; E1-02 en los 120 a
  126). `e1_paridad.mjs`: la paridad de reglas. `e1_srp_api.sql` y `e1_funciones.sql`: los permisos de la cuenta del
  servicio y de las funciones. `e1_secretos_nuevos.py` y `e1_buscar_placas.py`: secretos y placas (las placas se leen
  de la base sólo en memoria). `e1_limpiar.mjs`: quita las cuentas de r4.
- `b7b9_barrido.py`, `b9_preparar_real.mjs`, `b9_*.txt` y `nginx/conf/`: terceros, política de seguridad y cabeceras
  con el servidor web local.
- `f3_npm_audit.*`: los avisos de dependencias.
- `f4_*`: el paquete provisional, la búsqueda de restos y los huecos del empaquetador.
- `f5_ensayo_instalacion.py` y `f5_ensayo_seco.*.txt`: el ensayo de instalación (en seco).
- `f6_receptor.txt`: la capa de calles del SIA contra lo que lee el SRP.

### `r5/` · Robustez e «Intentar romperlo» (B5, E2, E3)
- `e3_compartida.mjs` (casos A1 a A16 por la API), `e3_relevo_otra_coord.mjs`, `e3_navegador.py` (B1 a B7) y
  `e3_navegador2.py` (C1 a C3), con sus salidas en `salidas/` y capturas en `capturas/`.
- `e2_bitacora_calle.mjs`, `calles_sin_capa.sh` y `calles_recalcular.sh`: bitácora, calle y recálculo (sin tocar la base
  compartida: trabajan en tablas temporales).
- `e2_respaldo.sh`: el respaldo y la restauración para la coordinación (borra y restaura el esquema `srp`).
- `comun.mjs` y `cuentas.mjs`: las cuentas de r5; la contraseña se lee de `R5_CLAVE` o `R5_CLAVE_ARCHIVO`.

### `r6/` · Revisor independiente (B6, E3, C4, C5, D1, F6)
- `f1_compartida_sin_senal.py` y sus salidas `f1_*.json`, `f1_corrida3_manual.txt` y capturas `f1_163145_*`: B6-01,
  B6-03, B6-04 y C5-01.
- `f2_reabrir_sin_senal.py` y sus salidas `f2_*.json` y capturas `f2_163902_*`: B6-02.
- `f3_*`: el instructivo y los guiones del paquete contra los de hoy (F4-01) y la copia de producción con CRLF (A3-01).
- `comun.py`: arranque del servicio y de la aplicación, cuentas y ayudas del navegador.
- `manual_texto.txt`: el texto del manual del personal, para buscar.

## Cómo repetir los guiones principales

**Antes de empezar**
- Una copia del commit `1eb30e6` fuera de la carpeta del proyecto, con Python 3.12 y Playwright (Chromium y WebKit) y
  Node 24. Siempre con `PYTHONUTF8=1`.
- La base local de desarrollo con la demostración cargada y la capa de calles instalada; las cuentas de prueba con
  `node pruebas/apoyo_servidor.mjs preparar` y `quitar` (correos `rN.algo@ejemplo.local`). Ojo: «quitar» le retira el
  rol del servicio a la cuenta local (A1-04); después, `preparar` con la lista vacía.
- Modo real: el servicio con `node dist/iniciar.js` en `servidor/`, con `SRP_PUERTO`, `SRP_COOKIE_SEGURA=no`,
  `SRP_ROL=srp_api`, `SRP_PROXY=1` y `SRP_FOTOS_DIR`; la aplicación con
  `python pruebas/servir.py <puerto> --api http://127.0.0.1:<puerto del servicio>`, sobre la copia que saca
  `python herramientas/preparar_produccion.py <carpeta vacía>` (desde un clon con fin de renglón LF: ver A3-01).
- Los guiones esperan los puertos de cada revisor (r1: 3121/8121/8131; r2: 3122/8122/8132; r3: 3123/8123/8133; r4:
  3124/8124/8134; r5: 3125/8125/8135; r6: 3126/8126). Cámbielos si hace falta.
- Las contraseñas de prueba nunca están en los archivos: se pasan por variable (`R1_CUENTAS`, `SRP_CUENTAS`,
  `R4_CLAVE`, `R5_CLAVE` o `R5_CLAVE_ARCHIVO`, `R6_CLAVE`) o se generan al azar (`r3/real_cuentas.py`).

**Los Críticos y Altos**
- B6-01, B6-03 y B6-04: `python r6/f1_compartida_sin_senal.py [--auto]`; también `python r3/s9_real_cerrada.py
  <corrida>` (tras `python r3/real_cuentas.py preparar`), `python r5/e3_navegador.py <corrida> B1 B2` y
  `python r2/guiones/compartida_real.py <chromium|webkit> <vuelta>`.
- B6-02: `python r6/f2_reabrir_sin_senal.py [--pestana]`; `python r2/guiones/apoyo_reabre_sin_senal.py <chromium>
  <vuelta>`; `python r3/s8_real.py <corrida>`.
- B2-01 y B2-02: `python r3/s4_cifras.py <corrida>` con la demostración (perfil Directivo, «Todo», «Compartidas»).
- F4-01: `python r4/f5_ensayo_instalacion.py --paquete <paquete> --sia <copia del backend del SIA> --trabajo <carpeta>
  --modulos <dependencias> --seco`.

**El resto**
- Prueba completa ajustada en las esperas (A1-02): `python r1/a1/ajustar_prueba.py` y luego
  `python r1/a1/ajustada/pruebas/por_tramos.py --solo 8,84,85` (en un clon completo).
- La calle del reporte desde la ficha (A1-01): `SRP_BASE=http://127.0.0.1:8131/ python r1/a1/depurar_calle2.py`.
- Cifras en modo real (B2-03): `R1_CUENTAS=<archivo fuera de la evidencia> python r1/b2/b2_real.py` y
  `python r1/b2/b2_comparar.py`.
- La calle de prueba contra la del servidor (A2-01): `psql … < r1/a2/puntos_sql.sql > puntos_sql.csv` y
  `node r1/a2/calle_js_contra_sql.mjs`.
- Barrido (B1): `python r2/guiones/barrido_r2.py prueba|real <url> <salida> [cuentas.json]` y
  `python r2/guiones/resumen_r2.py <carpeta> <modo>` (unos 25 min con un proceso por perfil).
- Accesibilidad de lo nuevo (B4): `python r2/guiones/b4_nuevas.py <url> <salida> <ancho> <alto> <sol|normal>
  [chromium|webkit]`.
- Fechas (B8): `python r2/guiones/fechas_compartida.py <url> <zona> [chromium|webkit] [inicio ISO]`.
- Acceso y paridad (E1): `R4_CLAVE=<clave> node r4/e1_acceso.mjs <corrida>` y `node r4/e1_paridad.mjs`, desde la raíz
  de la copia, con el servicio en marcha; al terminar, `node r4/e1_limpiar.mjs`.
- Terceros y política de seguridad (B7, B9): `python r4/b7b9_barrido.py prueba|real <salida.json> [cuentas.json]
  [--sw]`.
- «Intentar romperlo» (E3): `R5_CLAVE_ARCHIVO=<archivo> node r5/e3_compartida.mjs <corrida>`,
  `node r5/e3_relevo_otra_coord.mjs <corrida>`, `python r5/e3_navegador.py <corrida> [B1 … B7]` y
  `python r5/e3_navegador2.py <corrida> [C1 C2 C3]`.
- Respaldo y restauración (E2), sólo con la base libre: `COPIA=<copia> bash r5/e2_respaldo.sh`.
- Ensayo de instalación (F5), sólo con la base libre: el mismo guion de F4-01 con `--ejecutar --confirmo-base-libre`
  (si se corta, `--solo-restaurar --confirmo-base-libre`).

## Pendiente de la coordinación

- [PENDIENTE: las salidas de E2 (`r5/salidas/e2/` y `e2_respaldo_salida.txt`)]
- [PENDIENTE: la bitácora del ensayo de instalación con la base (F5)]
- [PENDIENTE: la repetición final de las pruebas]
- [PENDIENTE: `huellas-antes.json` y `huellas-despues.json`, y su comparación]
