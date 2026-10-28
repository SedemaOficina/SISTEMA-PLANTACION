// A2/D3 · La calle que pone el servidor simulado (js/calles.js, sobre assets/calles/) contra la de srp.calle() en la
// base (territorio.calles), punto por punto, en los 12 campos. Lee evidencia/a2/puntos_sql.csv (de puntos_sql.sql).
// Uso: node evidencia/a2/calle_js_contra_sql.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const RAIZ = 'C:/sia-rev/tmp/aud1027/r1';
const ctx = { window: {}, console, Math, Object, Set, Map, Promise, JSON, Number, String, Infinity, encodeURIComponent };
ctx.window = ctx; ctx.SRP = { util: { proteger() {} }, CONFIG: { VERSION: 'auditoria', ES_FICTICIO: true } };
ctx.fetch = async (url) => { const f = path.join(RAIZ, url.split('?')[0]); return fs.existsSync(f) ? { ok: true, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) } : { ok: false, status: 404 }; };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js/calles.js'), 'utf8').replace('window.SRP = window.SRP || {};', ''), ctx);
const C = ctx.SRP.calles;
// CSV con comillas
function filas(t) { const out = []; let f = [], c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i];
  if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
  else if (ch === '"') q = true; else if (ch === ',') { f.push(c); c = ''; } else if (ch === '\n') { f.push(c.replace(/\r$/, '')); out.push(f); f = []; c = ''; } else c += ch; }
  if (c || f.length) { f.push(c); out.push(f); } return out; }
const [cab, ...datos] = filas(fs.readFileSync(path.join(RAIZ, 'evidencia/a2/puntos_sql.csv'), 'utf8'));
const CAMPOS = C.CAMPOS;   // en el orden de srp.calle()
const nulo = v => (v === '' || v === undefined || v === null) ? null : String(v);
const cuenta = {}, ejemplos = {}, porOrigen = {}, guardado = { igual: 0, distinto: 0, ej: [] };
let n = 0; const clases = {}, raros = [];
// Por qué difieren: redondeo de la distancia (±1 m), dos tramos casi a la misma distancia (esquina), el borde de 40 m o
// el de 4 m de la esquina; lo demás se lista
async function clasificar(lat, lng, sql, js) {
  const ind = await C.indice(), cel = await C.celda(Math.floor(lng / ind.celda_grados), Math.floor(lat / ind.celda_grados)) || [];
  const d = k => { const t = cel.find(x => x.clave === k); return t ? C.distancia(lat, lng, t) : null; };
  const difs = CAMPOS.filter((k, i) => nulo(sql[i]) !== nulo(js[k]));
  if (difs.length === 1 && difs[0] === 'calle_distancia_m' && Math.abs(Number(sql[11]) - js.calle_distancia_m) === 1) return 'solo redondeo de la distancia (1 m)';
  if (difs.includes('calle_estado')) { const m = js.calle_distancia_m ?? d(sql[1]); return m != null && Math.abs(m - 40) < 0.6 ? 'borde de 40 m (a menos de 0.6 m)' : (raros.push({ lat, lng, difs }), 'otro'); }
  if (difs.includes('calle_clave')) { const a = d(sql[1]), b = d(js.calle_clave); if (a != null && b != null && Math.abs(a - b) < 0.1) return 'dos tramos a menos de 10 cm de diferencia (esquina)'; raros.push({ lat, lng, difs, a, b }); return 'otro'; }
  if (difs.includes('calle_esquina')) return 'borde de 4 m de la esquina';
  raros.push({ lat, lng, difs }); return 'otro';
}
for (const f of datos) {
  const [num, origen, lat, lng] = f; const sql = f.slice(4, 16), g = f.slice(16, 28);
  const js = await C.calcular(Number(lat), Number(lng));
  porOrigen[origen] = porOrigen[origen] || { puntos: 0, distintos: 0, ok: 0, lejos: 0 };
  porOrigen[origen].puntos++; porOrigen[origen][sql[0]] = (porOrigen[origen][sql[0]] || 0) + 1;
  let distinto = false;
  CAMPOS.forEach((k, i) => {
    const a = nulo(sql[i]), b = nulo(js[k]);
    if (a !== b) { distinto = true; cuenta[k] = (cuenta[k] || 0) + 1; (ejemplos[k] = ejemplos[k] || []).length < 5 && ejemplos[k].push({ origen, lat, lng, sql: a, js: b, m_sql: sql[11], m_js: js.calle_distancia_m }); }
  });
  if (distinto) { porOrigen[origen].distintos++; clases[await clasificar(Number(lat), Number(lng), sql, js)] = (clases[await clasificar(Number(lat), Number(lng), sql, js)] || 0) + 1; }
  // Lo que guardó cada árbol contra lo que daría srp.calle() hoy
  if (origen === 'arbol') { const igual = CAMPOS.every((k, i) => nulo(g[i]) === nulo(sql[i])); igual ? guardado.igual++ : (guardado.distinto++, guardado.ej.length < 3 && guardado.ej.push({ lat, lng, guardado: g, hoy: sql })); }
  n++;
}
// Diferencias sólo de redondeo de la distancia (±1 m) y de estado en el borde de 40 m
console.log('puntos comparados:', n);
console.log('por origen:', JSON.stringify(porOrigen));
console.log('diferencias por campo:', JSON.stringify(cuenta));
for (const [k, e] of Object.entries(ejemplos)) console.log('  ' + k + ':', JSON.stringify(e.slice(0, 3)));
console.log('clases:', JSON.stringify(clases)); console.log('otros:', JSON.stringify(raros.slice(0, 10)));
console.log('árboles: lo guardado igual a srp.calle() de hoy:', guardado.igual, '· distinto:', guardado.distinto, JSON.stringify(guardado.ej));
