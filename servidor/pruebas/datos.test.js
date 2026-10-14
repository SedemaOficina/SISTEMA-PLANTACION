/* LA BASE LOCAL CON SUS DATOS: la réplica de territorio, la capa propia, los catálogos y lo que exporta
   la aplicación, cargados con «npm run cargar -- rehacer». Comprueba que todo cupo y, sobre todo, que PostGIS ubica cada árbol y
   cada jornada igual que el teléfono: misma alcaldía, misma colonia, misma celda UGA (la del folio).
   Sólo corre si existe la exportación de la aplicación (servidor/local/datos-app.json). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { conectar, RAIZ } from './apoyo.js';

const APP_JSON = path.join(RAIZ, 'servidor', 'local', 'datos-app.json');
const hay = fs.existsSync(APP_JSON);
const omitir = hay ? false : 'no hay exportación de la aplicación: correr herramientas/exportar_datos_app.py';

let c, app;
before(async () => {
  if (!hay) return;
  // Una carga limpia, como la de todos los días en la base local
  execFileSync(process.execPath, [path.join(RAIZ, 'servidor', 'cargar.js'), 'rehacer'], { stdio: 'ignore' });
  app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8')).tablas;
  c = await conectar();
});
after(async () => { if (c) await c.end(); });

const uno = async (sql) => (await c.query(sql)).rows[0];

test('territorio y la capa propia están completos y en la versión de la aplicación', { skip: omitir }, async () => {
  const r = await uno(`SELECT (SELECT count(*) FROM territorio.alcaldia)::int AS alcaldias, (SELECT count(*) FROM territorio.colonias_iecm_2022)::int AS colonias,
    (SELECT count(*) FROM territorio.malla_uga_1km)::int AS uga, (SELECT count(*) FROM srp.capa_prioritarias)::int AS prioritarias,
    (SELECT string_agg(capa || '=' || version, ';' ORDER BY capa) FROM territorio.version_capa WHERE vigente) AS territorio,
    (SELECT string_agg(nombre || '=' || version, ';' ORDER BY nombre) FROM srp.capas) AS propias`);
  assert.deepEqual(r, { alcaldias: 16, colonias: 1837, uga: 1624, prioritarias: 2243,
    territorio: 'alcaldia=sia-2026-01-01;colonias_iecm_2022=iecm-2022;malla_uga_1km=sia-2026-09-22', propias: 'prioritarias=priorizacion-2026-10-01' });
});

test('el catálogo de especies es el de la aplicación, con su paleta vegetal y su fruto comestible', { skip: omitir }, async () => {
  const r = await uno(`SELECT count(*)::int AS n, count(*) FILTER (WHERE paleta_vegetal = 'No')::int AS fuera, count(*) FILTER (WHERE fruto_comestible = 'Sí')::int AS fruto FROM srp.especies`);
  assert.deepEqual(r, { n: 79, fuera: 3, fruto: 16 });
});

test('todo lo que guarda la aplicación cupo en la base, tabla por tabla', { skip: omitir }, async () => {
  for (const t of ['plantaciones', 'jornadas', 'usuarios', 'bitacora', 'programas', 'areas', 'instituciones', 'solicitantes']) {
    const n = (await uno(`SELECT count(*)::int AS n FROM srp.${t}`)).n;
    assert.equal(n, app[t].length, t);
  }
});

test('PostGIS ubica cada árbol y cada jornada igual que la aplicación', { skip: omitir }, async () => {
  const { rows } = await c.query(`
    SELECT x.que, count(*)::int AS puntos,
      count(*) FILTER (WHERE x.alcaldia_cve IS DISTINCT FROM d.alcaldia_cve)::int AS alcaldia,
      count(*) FILTER (WHERE x.colonia_cve IS DISTINCT FROM d.colonia_cve)::int AS colonia,
      count(*) FILTER (WHERE x.uga IS DISTINCT FROM d.uga)::int AS uga,
      count(*) FILTER (WHERE x.capa_version IS DISTINCT FROM d.capa_version)::int AS version,
      -- La aplicación mide en una proyección local y PostGIS sobre el elipsoide: hasta 1 % o 2 m
      count(*) FILTER (WHERE abs(x.uga_borde_m - d.uga_borde_m) > greatest(2, 0.01 * x.uga_borde_m))::int AS borde
    FROM (SELECT 'arboles' AS que, lat, lng, alcaldia_cve::text, colonia_cve, uga::text, capa_version, uga_borde_m FROM srp.plantaciones
          UNION ALL SELECT 'jornadas', lat, lng, alcaldia_cve, colonia_cve, uga, capa_version, uga_borde_m FROM
            (SELECT lat, lng, alcaldia_cve, colonia_cve, NULL::text AS uga, NULL::text AS capa_version, NULL::int AS uga_borde_m FROM srp.jornadas WHERE lat IS NOT NULL) j) x,
         LATERAL srp.derivar(x.lat, x.lng) d
    GROUP BY x.que ORDER BY x.que`);
  // En las jornadas sólo se guardan alcaldía y colonia
  const j = rows.find(r => r.que === 'jornadas'), a = rows.find(r => r.que === 'arboles');
  assert.deepEqual(a, { que: 'arboles', puntos: app.plantaciones.length, alcaldia: 0, colonia: 0, uga: 0, version: 0, borde: 0 });
  assert.equal(j.alcaldia + j.colonia, 0, 'jornadas: ' + JSON.stringify(j));
});

test('los vehículos de las jornadas son los de la lista cargada', { skip: omitir }, async () => {
  const r = await uno(`SELECT count(*) FILTER (WHERE j.vehiculo_placa <> v.nombre OR j.vehiculo_modelo <> v.modelo)::int AS distintos,
    count(*)::int AS con_vehiculo FROM srp.jornadas j JOIN srp.vehiculos v ON v.id = j.vehiculo_id`);
  assert.equal(r.distintos, 0);
  assert.ok(r.con_vehiculo > 0);
});

test('los folios que trae la carga quedan registrados, y la secuencia de cada celda sigue después del más alto', { skip: omitir }, async () => {
  const r = await uno(`SELECT (SELECT count(*) FROM srp.plantaciones WHERE folio IS NOT NULL)::int AS con_folio, (SELECT count(*) FROM srp.folios)::int AS registrados,
    (SELECT count(*) FROM (SELECT left(folio, 7) AS celda, max(right(folio, 5)::int) AS mayor FROM srp.plantaciones WHERE folio IS NOT NULL GROUP BY 1) m
       LEFT JOIN srp.folio_secuencias s USING (celda) WHERE s.ultimo IS NULL OR s.ultimo < m.mayor)::int AS atrasadas`);
  assert.ok(r.con_folio > 0, 'la demostración trae folios');
  assert.deepEqual([r.registrados, r.atrasadas], [r.con_folio, 0]);
});

test('las fotografías de la carga quedan como archivos, con su registro y su huella, y el árbol sin la imagen', { skip: omitir }, async () => {
  const conFoto = app.plantaciones.filter((p) => p.foto_base64 && p.foto_id);
  const r = await uno(`SELECT (SELECT count(*) FROM srp.fotografias)::int AS registradas, (SELECT count(*) FROM srp.plantaciones WHERE foto_base64 IS NOT NULL)::int AS dentro`);
  assert.deepEqual(r, { registradas: conFoto.length, dentro: 0 });
  const f = (await c.query('SELECT f.id, f.tipo, f.bytes, f.sha256 FROM srp.fotografias f ORDER BY f.id LIMIT 1')).rows[0];
  const datos = fs.readFileSync(path.join(RAIZ, 'servidor', 'local', 'fotos', f.id.slice(0, 2), f.id + '.jpg'));
  assert.deepEqual([datos.length, crypto.createHash('sha256').update(datos).digest('hex'), f.tipo], [f.bytes, f.sha256, 'image/jpeg']);
});

test('cada árbol y cada jornada con punto tienen su prioridad congelada, con la versión de la capa', { skip: omitir }, async () => {
  const r = await uno(`SELECT (SELECT count(*) FROM srp.plantaciones)::int + (SELECT count(*) FROM srp.jornadas WHERE lat IS NOT NULL)::int AS esperadas,
    (SELECT count(*) FROM srp.prioridades)::int AS congeladas,
    (SELECT count(*) FROM srp.prioridades WHERE capa_version <> (SELECT version FROM srp.capas WHERE nombre = 'prioritarias'))::int AS otra_version,
    (SELECT count(*) FROM srp.prioridades d JOIN srp.plantaciones x ON x.id = d.plantacion_id LEFT JOIN LATERAL srp.prioridad(x.lat, x.lng) p ON true
      WHERE d.prioridad IS DISTINCT FROM p.prioridad)::int AS distintas,
    (SELECT count(*) FROM srp.prioridades WHERE prioridad IS NOT NULL)::int AS con_colonia`);
  assert.deepEqual([r.congeladas, r.otra_version, r.distintas], [r.esperadas, 0, 0]);
  assert.ok(r.con_colonia > 0, 'hay árboles en colonias de la capa');
});
