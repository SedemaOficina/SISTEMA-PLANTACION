/* B7/B9/E1 · Prepara el modo real para el barrido: cuentas r4.b9.*@ejemplo.local (una por perfil, de la
   Secretaría) y, con la API, una jornada compartida cuyo nombre, dirección y comentarios llevan texto que
   intentaría inyectar HTML, y un árbol del cabo de apoyo con comentario igual. Si alguna pantalla lo
   interpretara como HTML, el barrido lo ve: se crea un <img> con data-r4, o corre el manejador (bloqueado por la
   CSP, que entonces cuenta una violación «script-src-attr»).
   Uso, desde la raíz de la copia r4, con el servicio en 3124:  node evidencia/b9_preparar_real.mjs
   Escribe evidencia/b9_cuentas_real.json (sin contraseñas reales: la de prueba se genera aquí). */
import { spawnSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const API = 'http://127.0.0.1:3124/api/srp';
const CLAVE = 'R4b9-' + randomBytes(6).toString('hex');
const S = 'o-sedema';
const perfiles = { admin: 'ADMIN', dir: 'DIRECTIVO', coord: 'COORDINADOR', cabo: 'CABO' };
const cuentas = Object.entries(perfiles).map(([k, perfil]) => ({ id: randomUUID(), correo: `r4.b9.${k}@ejemplo.local`, nombre: `R4 Barrido ${k}`, perfil, organizacion_id: S, clave: CLAVE, temporal: false }));
const r = spawnSync('node', ['pruebas/apoyo_servidor.mjs', 'preparar'], { input: JSON.stringify({ cuentas }), encoding: 'utf8' });
if (!JSON.parse(r.stdout || '{}').ok) throw new Error('preparar: ' + r.stdout + r.stderr);

const galleta = {};
for (const c of cuentas) {
  const x = await fetch(API + '/acceso/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: c.correo, contrasena: CLAVE }) });
  galleta[c.perfil] = x.headers.get('set-cookie').split(';')[0];
}
const op = async (perfil, tipo, datos) => (await (await fetch(API + '/envios', { method: 'POST', headers: { 'content-type': 'application/json', cookie: galleta[perfil] },
  body: JSON.stringify({ operaciones: [{ tipo, datos }] }) })).json()).resultados[0];

const CARGA = '"><img src=x data-r4="xss" onerror="window.__r4xss=(window.__r4xss||0)+1">';
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const J = randomUUID();
const j = await op('COORDINADOR', 'jornada.crear', { id: J, nombre: 'R4 ' + CARGA, ubicacion: '=HYPERLINK("http://ejemplo.local") ' + CARGA, programa_id: 'p-refor',
  lat: 19.4326, lng: -99.1332, punto_origen: 'manual', gps_precision_m: 5, arboles_previstos: 5, fecha: hoy, fecha_inicio: new Date().toISOString(), comentarios: '@SUM(1) ' + CARGA });
const ap = await op('COORDINADOR', 'jornada.compartir', { id: J, agregar: [cuentas.find((c) => c.perfil === 'CABO').id] });
const a = await op('CABO', 'registro.crear', { id: randomUUID(), jornada_id: J, lat: 19.43262, lng: -99.13318, punto_origen: 'gps', gps_precision_m: 5, especie_otra: 'Especie ' + CARGA,
  fecha_plantacion: hoy, sitio_plantacion: 'suelo', comentarios: '-2+3 ' + CARGA, fecha_registro: new Date().toISOString() });
const salida = { cuentas: cuentas.map(({ perfil, correo }) => ({ perfil, correo, clave: CLAVE })), jornada: J, resultados: [j.estado, ap.estado, a.estado], calle: a.fila?.calle_estado };
writeFileSync('evidencia/b9_cuentas_real.json', JSON.stringify(salida, null, 1));
console.log(JSON.stringify({ jornada: J, resultados: salida.resultados, calle: salida.calle }));
