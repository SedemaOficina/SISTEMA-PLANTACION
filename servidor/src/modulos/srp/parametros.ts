import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import { anotarCambio } from "./bitacora";
import { responder } from "./errores";
import { exigirPermiso } from "./permisos";
import type { Consultable } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* LOS PARÁMETROS, en el servidor y para todos los teléfonos a la vez: los mismos que la aplicación muestra en
   Configuración › Parámetros, con su nombre de js/config.js y sus valores de arranque, que una prueba compara
   con los de la aplicación. En la base sólo quedan los que la Administración global cambió.

   GET /parametros          todos, con su valor vigente, el de arranque y su rango     Con sesión
   PUT /parametros/:clave   { valor }                                                  Administración global

   Cada cambio va a la bitácora, entre los de los catálogos: «Parámetro «Puntos duplicados»: 4 → 6 m». */

export interface Parametro {
  clave: string;
  titulo: string;
  unidad: string;
  porOmision: number;
  minimo: number;
  maximo: number;
  /** Si sólo se puede elegir entre estos valores. */
  opciones?: number[];
}

const PAGINAS = [10, 25, 50, 100];

// Los rangos cuidan que un valor no deje al sistema sin sentido: una distancia de cero, un GPS que no espera
export const PARAMETROS: Parametro[] = [
  { clave: "JORNADA.DUPLICADO_M", titulo: "Puntos duplicados", unidad: "m", porOmision: 4, minimo: 1, maximo: 50 },
  { clave: "JORNADA.FUERA_M", titulo: "Punto lejos de la jornada", unidad: "m", porOmision: 150, minimo: 10, maximo: 5000 },
  { clave: "JORNADA.SEPARAR_M", titulo: "Sitios separados", unidad: "m", porOmision: 500, minimo: 50, maximo: 20000 },
  { clave: "MAPA.PRECISION_BUENA_M", titulo: "Precisión buena", unidad: "m", porOmision: 10, minimo: 1, maximo: 100 },
  { clave: "MAPA.PRECISION_ACEPTABLE_M", titulo: "Precisión aceptable", unidad: "m", porOmision: 30, minimo: 2, maximo: 500 },
  { clave: "MAPA.MARGEN_AMBITO_M", titulo: "Margen del límite de la Ciudad", unidad: "m", porOmision: 100, minimo: 0, maximo: 1000 },
  { clave: "MAPA.GPS_ESPERA_MS", titulo: "Espera del GPS", unidad: "ms", porOmision: 15000, minimo: 3000, maximo: 120000 },
  { clave: "HORA_CIERRE_JORNADA", titulo: "Hora de atraso", unidad: "h", porOmision: 17, minimo: 0, maximo: 23 },
  { clave: "REINTENTO_ENVIO_MS", titulo: "Reintento de envío", unidad: "ms", porOmision: 60000, minimo: 10000, maximo: 3600000 },
  { clave: "FOTO.ANCHO_MAX", titulo: "Ancho de la fotografía", unidad: "px", porOmision: 800, minimo: 320, maximo: 1600 },
  { clave: "FOTO.ALTO_MAX", titulo: "Alto de la fotografía", unidad: "px", porOmision: 600, minimo: 240, maximo: 1600 },
  { clave: "LISTA_PAGINA", titulo: "Renglones por página en teléfono", unidad: "", porOmision: 10, minimo: 10, maximo: 100, opciones: PAGINAS },
  { clave: "LISTA_PAGINA_ANCHA", titulo: "Renglones por página en computadora", unidad: "", porOmision: 25, minimo: 10, maximo: 100, opciones: PAGINAS },
];
const PORCLAVE = new Map(PARAMETROS.map((p) => [p.clave, p]));

// El valor vigente de un parámetro: el que puso la Administración o el de arranque
export async function valorParametro(bd: Consultable, clave: string): Promise<number> {
  const p = PORCLAVE.get(clave);
  if (!p) throw new Error("Parámetro desconocido: " + clave);
  const r = await bd.query<{ valor: string }>("SELECT valor::text FROM srp.parametros WHERE clave = $1", [clave]);
  return r.rows[0] ? Number(r.rows[0].valor) : p.porOmision;
}

async function vigentes(bd: Consultable): Promise<Map<string, { valor: number; editado_por_id: string; fecha_ultima_edicion: string }>> {
  const { rows } = await bd.query<{ clave: string; valor: string; editado_por_id: string; fecha_ultima_edicion: string }>(
    "SELECT clave, valor::text, editado_por_id, to_jsonb(fecha_ultima_edicion) #>> '{}' AS fecha_ultima_edicion FROM srp.parametros",
  );
  return new Map(rows.map((r) => [r.clave, { ...r, valor: Number(r.valor) }]));
}

const conUnidad = (p: Parametro, v: number) => v.toLocaleString("es-MX") + (p.unidad ? " " + p.unidad : "");

// Lo que tiene que cumplir un valor; '' si está bien
function revisar(p: Parametro, valor: unknown, otros: Map<string, number>): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "Escriba un número.";
  if (!Number.isInteger(valor)) return p.titulo + " es un número entero.";
  if (p.opciones && !p.opciones.includes(valor)) return "Elija " + p.opciones.slice(0, -1).join(", ") + " o " + p.opciones[p.opciones.length - 1] + ".";
  if (valor < p.minimo || valor > p.maximo) return p.titulo + " va de " + conUnidad(p, p.minimo) + " a " + conUnidad(p, p.maximo) + ".";
  // La precisión buena es más estricta que la aceptable
  const buena = p.clave === "MAPA.PRECISION_BUENA_M" ? valor : otros.get("MAPA.PRECISION_BUENA_M");
  const aceptable = p.clave === "MAPA.PRECISION_ACEPTABLE_M" ? valor : otros.get("MAPA.PRECISION_ACEPTABLE_M");
  if (buena !== undefined && aceptable !== undefined && buena >= aceptable) return "La precisión buena tiene que ser menor que la aceptable.";
  return "";
}

export function rutasParametros(pool: pg.Pool, sesion: RequestHandler): Router {
  const r = Router();

  r.get("/parametros", sesion, async (req: Request, res: Response) => {
    const v = await vigentes(pool);
    res.json(PARAMETROS.map((p) => ({ ...p, valor: v.get(p.clave)?.valor ?? p.porOmision, editado_por_id: v.get(p.clave)?.editado_por_id ?? null,
      fecha_ultima_edicion: v.get(p.clave)?.fecha_ultima_edicion ?? null })));
  });

  r.put("/parametros/:clave", sesion, exigirPermiso("catalogo.administrar"), async (req: Request, res: Response) => {
    const p = PORCLAVE.get(String(req.params.clave));
    if (!p) return responder(res, 404, "NO_EXISTE", "Ese parámetro no existe.");
    const u = sesionDe(res).usuario, valor = req.body?.valor;
    const resultado = await enTransaccion(pool, async (c) => {
      // Uno a la vez: la regla entre las dos precisiones se revisa con lo vigente
      await c.query("LOCK TABLE srp.parametros IN SHARE ROW EXCLUSIVE MODE");
      const v = await vigentes(c);
      const otros = new Map(PARAMETROS.map((x) => [x.clave, v.get(x.clave)?.valor ?? x.porOmision]));
      const antes = otros.get(p.clave) as number;
      if (valor === antes) return { repetido: true, valor: antes };
      const error = revisar(p, valor, otros);
      if (error) return { error };
      await c.query(
        `INSERT INTO srp.parametros (clave, valor, editado_por_id, fecha_ultima_edicion) VALUES ($1, $2, $3, now())
         ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, editado_por_id = EXCLUDED.editado_por_id, fecha_ultima_edicion = now()`,
        [p.clave, valor, u.id],
      );
      await anotarCambio(c, u, "EDITADO", "catalogo", "parametro:" + p.clave, "Parámetro «" + p.titulo + "»: " + antes.toLocaleString("es-MX") + " → " + conUnidad(p, valor as number));
      return { valor: valor as number };
    });
    if ("error" in resultado) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise el valor del parámetro.", errores: [["valor", resultado.error]] });
    res.json({ clave: p.clave, valor: resultado.valor, ...("repetido" in resultado ? { repetido: true } : {}) });
  });

  return r;
}
