import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/* CONTRASEÑAS. Nunca se guardan ni se registran en claro. Se guarda sólo lo que deriva scrypt —lento y
   con mucha memoria a propósito, para que adivinar por fuerza bruta sea caro— con una sal al azar por
   contraseña. El formato y los parámetros son los del módulo `acceso` del SIA:
     scrypt$N$r$p$sal_base64url$derivada_base64url, con N=2^14, r=8, p=1, sal de 16 bytes y 64 de derivada.
   Así, si un día las cuentas se mudan a `acceso`, se copian sin pedir contraseñas nuevas. Un N mayor parece
   más seguro, pero con diez accesos a la vez agota la memoria que comparten todos los módulos del SIA.
   El texto guardado lleva sus parámetros: las contraseñas guardadas con otros se siguen verificando. */

const N = 16384, R = 8, P = 1, SAL = 16, LARGO = 64;
const memoria = (n: number, r: number) => 128 * n * r * 2;

function derivarCon(texto: string, sal: Buffer, largo: number, opciones: ScryptOptions): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(texto.normalize("NFKC"), sal, largo, opciones, (err, derivada) => (err ? rechazar(err) : resolver(derivada)));
  });
}

export async function derivar(texto: string): Promise<string> {
  const sal = randomBytes(SAL);
  const h = await derivarCon(String(texto), sal, LARGO, { N, r: R, p: P, maxmem: memoria(N, R) });
  return ["scrypt", N, R, P, sal.toString("base64url"), h.toString("base64url")].join("$");
}

/* Compara en tiempo constante. Un texto guardado con otra forma no coincide nunca. Lee base64 y
   base64url: las contraseñas guardadas antes de tomar el formato de `acceso` usaban base64 */
export async function verificar(texto: string, guardada: string | null | undefined): Promise<boolean> {
  const partes = String(guardada || "").split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [n, r, p] = partes.slice(1, 4).map(Number);
  if (![n, r, p].every(Number.isInteger)) return false;
  const esperada = Buffer.from(partes[5], "base64");
  const obtenida = await derivarCon(String(texto), Buffer.from(partes[4], "base64"), esperada.length, { N: n, r, p, maxmem: memoria(n, r) });
  return obtenida.length === esperada.length && timingSafeEqual(obtenida, esperada);
}

// Para que una cuenta inexistente tarde lo mismo que una contraseña equivocada
let sombra: Promise<string> | undefined;
export async function verificarSombra(texto: string): Promise<false> {
  sombra ??= derivar(randomBytes(12).toString("hex"));
  await verificar(texto, await sombra);
  return false;
}

/* Una contraseña temporal fácil de dictar por teléfono: doce caracteres en tres grupos, sin los que se
   confunden (0 y o, 1, l e i). La da la Administración global; sólo sirve para entrar a escribir una propia, y
   vence. randomInt reparte
   parejo entre las 31 letras; el residuo de un byte favorecería a las primeras. */
const LETRAS = "abcdefghjkmnpqrstuvwxyz23456789";
export function temporal(): string {
  const t = Array.from({ length: 12 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
  return t.slice(0, 4) + "-" + t.slice(4, 8) + "-" + t.slice(8, 12);
}

// Lo que se exige a una contraseña nueva. Devuelve el motivo del rechazo o null
export function revisarNueva(nueva: string, { largoMinimo, correo, actual }: { largoMinimo: number; correo: string; actual?: string }): string | null {
  const t = String(nueva || "");
  if (t.length < largoMinimo) return "La contraseña debe tener al menos " + largoMinimo + " caracteres.";
  if (t.length > 128) return "La contraseña puede tener hasta 128 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) || !/\d/.test(t)) return "La contraseña debe llevar letras y números.";
  const usuario = String(correo || "").split("@")[0].toLowerCase();
  if (usuario.length >= 4 && t.toLowerCase().includes(usuario)) return "La contraseña no puede contener su correo.";
  if (actual !== undefined && t === actual) return "La contraseña nueva debe ser distinta de la anterior.";
  return null;
}
