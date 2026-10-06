/* APOYO DE LAS PRUEBAS DEL SERVIDOR. Corren contra la base local de desarrollo: instalan y destruyen
   el esquema srp, que borra todos sus datos sin preguntar. */
export { conectar, instalar, destruir, guionesDeInstalacion, SQL, RAIZ } from '../bd.js';

// Ejecuta una consulta que debe fallar y devuelve el código de error de PostgreSQL. Usa un punto de
// guardado para que la transacción en curso siga viva.
export async function codigoDeError(c, sql, valores) {
  await c.query('SAVEPOINT intento');
  try {
    await c.query(sql, valores);
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT intento');
    return e.code;
  }
  await c.query('RELEASE SAVEPOINT intento');
  return null;
}
