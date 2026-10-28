/* r5 · Prepara o quita las cuentas de prueba de r5: node evidencia/cuentas.mjs preparar|quitar */
import { apoyo, CUENTAS, IDS, CLAVE } from './comun.mjs';
const orden = process.argv[2];
if (orden === 'preparar') {
  if (!CLAVE) throw new Error('Falta R5_CLAVE o R5_CLAVE_ARCHIVO');
  console.log(apoyo('preparar', { cuentas: Object.values(CUENTAS) }));
} else if (orden === 'quitar') console.log(apoyo('quitar', { ids: IDS }));
else if (orden === 'rol') console.log(apoyo('preparar', { cuentas: [] }));   // sólo vuelve a prestar srp_api a la cuenta local
else console.log('preparar | quitar | rol');
