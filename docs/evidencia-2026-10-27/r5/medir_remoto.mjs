/* r5 · Cuánto tarda en bajar «lo enviado» la Coordinación de SEDEMA (las mismas páginas que pide js/remoto.js) */
import { CUENTAS as K, entrar, pedir } from './comun.mjs';
const s = await entrar(K[process.argv[2] || 'coord']);
const pagina = Number(process.argv[3] || 2000);
for (const ruta of ['/jornadas', '/plantaciones']) {
  let despues = null, n = 0, paginas = 0, max = 0; const t0 = performance.now();
  do {
    const r = await pedir(s, 'GET', ruta + '?limite=' + pagina + (despues ? '&despues=' + despues : ''));
    if (r.estado !== 200) { console.log(ruta, 'estado', r.estado, r.datos); break; }
    n += r.datos.filas.length; paginas++; max = Math.max(max, r.ms); despues = r.datos.siguiente;
  } while (despues);
  console.log(ruta, n, 'filas,', paginas, 'páginas de', pagina, ',', Math.round(performance.now() - t0), 'ms en total, la más lenta', max, 'ms');
}
