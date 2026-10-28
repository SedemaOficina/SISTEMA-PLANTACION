/* E1 · PARIDAD de las reglas: js/permisos.js (pantalla) contra servidor/src/modulos/srp/permisos.ts (compilado en
   servidor/dist), en los casos nuevos: jornada.compartir, jornada.terminar, cabos de apoyo vigentes, terminados y
   quitados, la Coordinación con toda su institución y el relevo dentro de una compartida.
   Independiente de servidor/pruebas/permisos.test.js: arma todas las combinaciones de un universo pequeño
   (cuentas × jornadas × acciones) y además 20,000 jornadas al azar con semilla fija.

   Uso, desde la raíz de la copia r4:  node evidencia/e1_paridad.mjs   → evidencia/e1_paridad.salida.txt */
import fs from 'node:fs';
import vm from 'node:vm';
import { permisos as S } from '../servidor/dist/independiente.js';

const ctx = { window: {}, console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext('var SRP = window.SRP = {};', ctx);
vm.runInContext(fs.readFileSync('js/permisos.js', 'utf8'), ctx);
const SRP = ctx.SRP;
SRP.CONFIG = { ORGANIZACION_SEDEMA: 'o-sedema' };
SRP.ref = { esSedema: (o) => o === 'o-sedema', usuarioPorId: {} };
SRP.util = { anunciar() {} };
SRP.sesion = { usuario: null };

const X = 'o-x', Y = 'o-y', SED = 'o-sedema';
const U = {
  cx1: { perfil: 'COORDINADOR', organizacion_id: X }, cx2: { perfil: 'COORDINADOR', organizacion_id: X }, cy: { perfil: 'COORDINADOR', organizacion_id: Y },
  cs: { perfil: 'COORDINADOR', organizacion_id: SED },
  k1: { perfil: 'CABO', organizacion_id: X }, k2: { perfil: 'CABO', organizacion_id: X }, k3: { perfil: 'CABO', organizacion_id: X }, ky: { perfil: 'CABO', organizacion_id: Y },
  dx: { perfil: 'DIRECTIVO', organizacion_id: X }, dy: { perfil: 'DIRECTIVO', organizacion_id: Y }, ds: { perfil: 'DIRECTIVO', organizacion_id: SED },
  ad: { perfil: 'ADMIN', organizacion_id: SED }, raro: { perfil: 'OTRO', organizacion_id: X },
};
for (const [k, u] of Object.entries(U)) { u.id = 'id-' + k; SRP.ref.usuarioPorId[u.id] = u; }
const autores = new Map(Object.values(U).map((u) => [u.id, { organizacion_id: u.organizacion_id }]));

const apoyo = (k, fin = null) => ({ cabo_id: U[k].id, desde: '2026-10-27T15:00:00Z', por_id: U.cx1.id, hasta: fin ? '2026-10-27T18:00:00Z' : null, fin });
const jornadas = [];
const titulares = ['cx1', 'k1', 'cy', 'cs'];
const listas = [[], [apoyo('k1')], [apoyo('k1'), apoyo('k2', 'terminado')], [apoyo('k2', 'quitado')], [apoyo('k1', 'terminado'), apoyo('k3')], [apoyo('ky')]];
for (const t of titulares) for (const org of [X, Y, SED, '']) for (const est of ['abierta', 'cerrada']) for (const ap of listas) for (const rel of [null, 'k3', 'k2']) {
  jornadas.push({ cabo_id: U[t].id, organizacion_id: org, estatus: est, cabos_apoyo: ap, relevo_id: rel ? U[rel].id : null, relevos: rel ? [{ cabo_id: U[rel].id }] : [] });
}
// Árboles: de cada cabo, activos, eliminados y sustituidos
const arboles = [];
for (const k of ['k1', 'k2', 'k3', 'ky', 'cx1']) for (const est of ['activo', 'eliminado', 'sustituido']) arboles.push({ cabo_id: U[k].id, estatus: est, sustituido_por_id: est === 'sustituido' ? 'x' : null });

const accionesJ = ['jornada.editar', 'jornada.eliminar', 'jornada.registrar', 'jornada.relevo', 'jornada.compartir', 'jornada.terminar'];
const accionesA = ['registro.editar', 'registro.eliminar', 'registro.restaurar', 'registro.sustituir', 'registro.mover'];
const accionesSin = ['registro.crear', 'jornada.crear', 'catalogo.administrar', 'usuario.administrar', 'carga.masiva', 'galeria.descargar', 'duplicado.revisar'];
const pantalla = (u, accion, x) => { SRP.sesion.usuario = u; return SRP.permisos.puede(accion, x); };
const servidor = (u, accion, x) => S.puede(accion, u, x, autores);

let total = 0; const dif = [];
const comparar = (k, accion, x, etiqueta) => {
  total++;
  const a = pantalla(U[k], accion, x), b = servidor(U[k], accion, x);
  if (a !== b) dif.push({ k, accion, etiqueta, pantalla: a, servidor: b });
};
for (const k of Object.keys(U)) {
  jornadas.forEach((j, i) => { for (const a of accionesJ) comparar(k, a, j, 'J' + i); });
  arboles.forEach((t, i) => { for (const a of accionesA) comparar(k, a, t, 'A' + i); });
  for (const a of accionesSin) comparar(k, a, {}, '-');
  // veArbol y alcanza: lo que se ve
  jornadas.forEach((j, i) => { total++; const a = SRP.permisos.alcanza(U[k], j, SRP.ref.usuarioPorId), b = S.alcanza(U[k], j, autores); if (a !== b) dif.push({ k, accion: 'alcanza', etiqueta: 'J' + i, pantalla: a, servidor: b }); });
}
// Las acciones: mismas listas y mismos textos
const nombresP = Object.keys(SRP.permisos.ACCIONES).sort(), nombresS = Object.keys(S.ACCIONES).sort();
const textos = nombresP.filter((n) => S.ACCIONES[n] && S.ACCIONES[n].texto !== SRP.permisos.ACCIONES[n].texto);
// Al azar, con semilla fija
let semilla = 20261027; const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
const elige = (xs) => xs[Math.floor(azar() * xs.length)];
const ks = Object.keys(U);
for (let i = 0; i < 20000; i++) {
  const ap = Array.from({ length: Math.floor(azar() * 4) }, () => apoyo(elige(ks), elige([null, null, 'terminado', 'quitado'])));
  const rel = azar() < 0.3 ? elige(ks) : null;
  const j = { cabo_id: U[elige(ks)].id, organizacion_id: elige([X, Y, SED, '', null]), estatus: elige(['abierta', 'cerrada']), cabos_apoyo: ap,
    relevo_id: rel ? U[rel].id : null, relevos: rel ? [{ cabo_id: U[rel].id }] : [] };
  comparar(elige(ks), elige(accionesJ), j, 'azar' + i);
}
const salida = [
  `Paridad js/permisos.js contra permisos.ts (dist), ${new Date().toISOString()}`,
  `Acciones en la pantalla: ${nombresP.length}; en el servidor: ${nombresS.length}; iguales: ${JSON.stringify(nombresP) === JSON.stringify(nombresS)}`,
  `Textos distintos: ${textos.length ? textos.join(', ') : 'ninguno'}`,
  `Comparaciones: ${total}; diferencias: ${dif.length}`,
  ...dif.slice(0, 30).map((d) => JSON.stringify(d)),
].join('\n');
fs.writeFileSync('evidencia/e1_paridad.salida.txt', salida + '\n');
console.log(salida);
