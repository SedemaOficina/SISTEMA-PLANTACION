/* CONTRASEÑAS. Nunca se guardan ni se registran en claro. Se guarda sólo lo que deriva scrypt —lento y
   con mucha memoria a propósito, para que adivinar por fuerza bruta sea caro— con una sal al azar por
   contraseña. El texto guardado lleva el algoritmo y sus parámetros: si un día se suben, las
   contraseñas que ya existen se siguen verificando con los suyos. */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const N = 32768, R = 8, P = 1, LARGO = 32;
const MEMORIA = 128 * N * R * 2;

export async function derivar(texto) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(String(texto).normalize('NFC'), sal, LARGO, { N, r: R, p: P, maxmem: MEMORIA });
  return ['scrypt', N, R, P, sal.toString('base64'), h.toString('base64')].join('$');
}

// Compara en tiempo constante. Un texto guardado con otra forma no coincide nunca
export async function verificar(texto, guardada) {
  const partes = String(guardada || '').split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const [, n, r, p, sal, esperado] = partes;
  const e = Buffer.from(esperado, 'base64');
  const h = await scrypt(String(texto).normalize('NFC'), Buffer.from(sal, 'base64'), e.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2 });
  return h.length === e.length && crypto.timingSafeEqual(h, e);
}

// Para que una cuenta inexistente tarde lo mismo que una contraseña equivocada
let sombra = null;
export async function verificarSombra(texto) {
  sombra = sombra || await derivar(crypto.randomBytes(12).toString('hex'));
  await verificar(texto, sombra);
  return false;
}

/* Una contraseña temporal fácil de dictar por teléfono: doce caracteres en tres grupos, sin los que se
   confunden (0 y o, 1, l e i). La da la Administración global y sirve una sola vez. */
const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';
export function temporal() {
  const b = crypto.randomBytes(12);
  const t = [...b].map(x => LETRAS[x % LETRAS.length]).join('');
  return t.slice(0, 4) + '-' + t.slice(4, 8) + '-' + t.slice(8, 12);
}

// Lo que se exige a una contraseña nueva. Devuelve el motivo del rechazo o null
export function revisarNueva(nueva, { largoMinimo, correo, actual }) {
  const t = String(nueva || '');
  if (t.length < largoMinimo) return 'La contraseña debe tener al menos ' + largoMinimo + ' caracteres.';
  if (t.length > 128) return 'La contraseña puede tener hasta 128 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) || !/\d/.test(t)) return 'La contraseña debe llevar letras y números.';
  const usuario = String(correo || '').split('@')[0].toLowerCase();
  if (usuario.length >= 4 && t.toLowerCase().includes(usuario)) return 'La contraseña no puede contener su correo.';
  if (actual !== undefined && t === actual) return 'La contraseña nueva debe ser distinta de la anterior.';
  return null;
}
