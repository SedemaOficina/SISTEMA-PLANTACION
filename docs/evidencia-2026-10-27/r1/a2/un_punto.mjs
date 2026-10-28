// Uso: node evidencia/a2/un_punto.mjs lat lng — la calle de js/calles.js y los tramos a 50 m o menos
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const RAIZ = 'C:/sia-rev/tmp/aud1027/r1';
const ctx = { console, Math, Object, Set, Map, Promise, JSON, Number, String, Infinity, encodeURIComponent };
ctx.window = ctx; ctx.SRP = { util: { proteger() {} }, CONFIG: { VERSION: 'a', ES_FICTICIO: true } };
ctx.fetch = async (url) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(RAIZ, url.split('?')[0]), 'utf8')) });
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js/calles.js'), 'utf8').replace('window.SRP = window.SRP || {};', ''), ctx);
const C = ctx.SRP.calles, [lat, lng] = process.argv.slice(2).map(Number);
console.log(JSON.stringify(await C.calcular(lat, lng)));
const ind = await C.indice(), t = await C.celda(Math.floor(lng / ind.celda_grados), Math.floor(lat / ind.celda_grados));
t.map(x => [x.clave, x.nombre, x.tipo_via, x.llave, C.distancia(lat, lng, x)]).filter(x => x[4] < 50).sort((a, b) => a[4] - b[4]).forEach(x => console.log('  ', x.join(' | ')));
