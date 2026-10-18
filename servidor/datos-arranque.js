/* LOS DATOS DE ARRANQUE DEL SRP, EN UN GUION SQL: los catálogos con que empieza el sistema (programas,
   áreas, instituciones, quién solicita, especies y vehículos) y la capa propia de colonias prioritarias.

   Uso:  node datos-arranque.js <guion.sql> [<vehiculos.csv>]

   Lo corre quien administra la base, una vez, después de instalar.sql:
     psql -d <base> -v ON_ERROR_STOP=on -f <guion.sql>
   Va en una sola transacción. Agrega lo que falte y no toca lo que ya está, así que correrlo otra vez no
   cambia nada; la capa se carga sólo si está vacía. La lista de vehículos es un CSV con columnas placa,
   modelo y tipo; sin ella, el guion no lleva vehículos y la Administración los da de alta en Catálogos.
   Las placas reales nunca entran al repositorio: el guion con ellas vive sólo en el paquete de
   instalación. «npm run cargar -- arranque» corre este mismo guion en la base local. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Un archivo de la aplicación (window.SRP = …) leído fuera del navegador
export function delaApp(relativo) {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, relativo), 'utf8'), ctx, { filename: relativo });
  return ctx.SRP;
}

// Una lista sencilla en CSV: comas, comillas dobles opcionales y la primera fila de encabezados
export function leerCsv(archivo) {
  const renglones = fs.readFileSync(archivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(r => r.trim());
  const partir = r => [...r.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].map(m => m[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim()).slice(0, -1);
  const enc = partir(renglones[0]);
  return renglones.slice(1).map(r => Object.fromEntries(partir(r).map((v, i) => [enc[i], v])));
}

export const clavePlaca = (placa) => String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Los vehículos de la lista, como los guarda el catálogo: el id es «v-» más la placa sin espacios
export function vehiculosDe(archivo, fecha = new Date().toISOString()) {
  return leerCsv(archivo).map(v => ({
    id: 'v-' + clavePlaca(v.placa), clave: clavePlaca(v.placa), nombre: v.placa.toUpperCase(), activo: true,
    creado_por_id: null, fecha_creacion: fecha, editado_por_id: null, fecha_ultima_edicion: null, modelo: v.modelo, tipo_vehiculo: v.tipo
  }));
}

// Un texto en SQL, con la comilla simple duplicada
const texto = (v) => "'" + String(v).replace(/'/g, "''") + "'";

// Un valor JSON dentro del guion, entre $srp$ … $srp$: sin comillas que escapar
function literal(valor) {
  const json = JSON.stringify(valor);
  if (json.includes('$srp$')) throw new Error('El texto de los datos no puede llevar $srp$');
  return '$srp$' + json + '$srp$::jsonb';
}

/* Un catálogo: los que falten, por id. Los de arranque no tienen quién los creó, y su fecha es la de
   la carga. */
function catalogo(tabla, filas, conFecha) {
  const fuente = conFecha
    ? `(SELECT jsonb_agg(e || jsonb_build_object('fecha_creacion', now())) FROM jsonb_array_elements(${literal(filas)}) AS e)`
    : literal(filas);
  return `INSERT INTO srp.${tabla} SELECT * FROM jsonb_populate_recordset(NULL::srp.${tabla}, ${fuente}) ON CONFLICT (id) DO NOTHING;\n`;
}

export function sqlDeArranque({ vehiculos = null } = {}) {
  const A = delaApp('assets/catalogos/catalogos-arranque.js').CATALOGOS_ARRANQUE;
  const especies = delaApp('assets/catalogos/catalogo-especies.js').CATALOGO_ESPECIES.especies;
  const capa = delaApp('assets/capas/capa-prioritarias.js').CAPAS.prioritarias;
  const autos = vehiculos ? vehiculosDe(vehiculos) : [];
  const partes = [
    `-- SRP · datos de arranque. Generado por servidor/datos-arranque.js: no se edita a mano.
-- Lo corre quien administra la base, una vez, después de instalar.sql:
--   psql -d <base> -v ON_ERROR_STOP=on -f <este archivo>
-- Agrega lo que falte y no toca lo que ya está: correrlo otra vez no cambia nada.
-- Lleva ${A.programas.length} programas, ${A.areas.length} áreas, ${A.instituciones.length} instituciones, ${A.solicitantes.length} solicitantes, ${especies.length} especies, ${autos.length} vehículos
-- y la capa de colonias prioritarias (${capa.geojson.features.length} colonias, versión ${capa.meta.version}).
BEGIN;
`,
    catalogo('instituciones', A.instituciones, true),
    catalogo('areas', A.areas, true),
    catalogo('programas', A.programas, true),
    catalogo('solicitantes', A.solicitantes, true),
    catalogo('especies', especies, false),
    autos.length ? catalogo('vehiculos', autos, false) : '-- Sin lista de vehículos: la Administración los da de alta en Catálogos › Vehículos.\n',
    // La capa, sólo si está vacía: ya cargada, sus colonias ya ubican árboles
    `INSERT INTO srp.capa_prioritarias (id, colonia, alcaldia, prioridad, geom)
  SELECT (f->'properties'->>'id')::int, f->'properties'->>'colonia', f->'properties'->>'alcaldia', (f->'properties'->>'prioridad')::smallint,
         ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326))
    FROM jsonb_array_elements(${literal(capa.geojson.features)}) AS f
   WHERE NOT EXISTS (SELECT 1 FROM srp.capa_prioritarias);
INSERT INTO srp.capas (nombre, version, fecha_corte, origen, elementos)
  SELECT 'prioritarias', ${texto(capa.meta.version)}, ${texto(capa.meta.fecha_corte)}, ${texto(capa.meta.origen)}, count(*)
    FROM srp.capa_prioritarias
  ON CONFLICT (nombre) DO NOTHING;
COMMIT;
`,
    `-- Lo que quedó en la base
SELECT (SELECT count(*) FROM srp.programas) AS programas, (SELECT count(*) FROM srp.areas) AS areas,
       (SELECT count(*) FROM srp.instituciones) AS instituciones, (SELECT count(*) FROM srp.solicitantes) AS solicitantes,
       (SELECT count(*) FROM srp.especies) AS especies, (SELECT count(*) FROM srp.vehiculos) AS vehiculos,
       (SELECT count(*) FROM srp.capa_prioritarias) AS colonias_prioritarias;
`
  ];
  return partes.join('');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [destino, csv] = process.argv.slice(2);
  if (!destino) { console.error('Uso: node datos-arranque.js <guion.sql> [<vehiculos.csv>]'); process.exit(1); }
  fs.writeFileSync(destino, sqlDeArranque({ vehiculos: csv || null }), 'utf8');
  console.log(`${destino}: ${(fs.statSync(destino).size / 1048576).toFixed(1)} MB${csv ? ', con los vehículos de ' + path.basename(csv) : ', sin vehículos'}`);
}
