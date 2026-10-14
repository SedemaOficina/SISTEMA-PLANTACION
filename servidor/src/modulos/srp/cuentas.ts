import { randomUUID } from "node:crypto";
import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { cuentaPublica, sesionDe } from "./acceso";
import { anotarCambio } from "./bitacora";
import type { ConfigSrp } from "./config";
import { derivar, temporal } from "./contrasenas";
import { responder } from "./errores";
import { alcanceSql, capacidadesDe, exigirPermiso, Parametros, PERFILES, SEDEMA, veArbolSql } from "./permisos";
import { cerrarDeCuenta, type Usuario } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* CUENTAS: la lista que ve cada quien, y el alta, el restablecimiento de contraseña y la activación, que sólo
   hace quien tiene la regla `usuario.administrar` (permisos.ts): la Administración global.

   GET  /cuentas                     las cuentas que ve cada quien (abajo); con sesión
   POST /cuentas                     alta con contraseña temporal; responde la cuenta y la temporal
   POST /cuentas/:id/restablecer     otra temporal; cierra las sesiones de la cuenta
   POST /cuentas/:id/estado          { activo } → desactivar cierra las sesiones de la cuenta

   La contraseña temporal se dice una sola vez, en la respuesta: la Administración la entrega a la
   persona por teléfono o en persona. Cada cambio deja su renglón en la bitácora, como en la aplicación. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const limpio = (t: unknown) => String(t ?? "").trim().replace(/\s+/g, " ");

// La contraseña temporal de una cuenta, con su vencimiento
async function ponerTemporal(c: pg.PoolClient, usuarioId: string, actorId: string, horas: number): Promise<string> {
  const t = temporal();
  await c.query(
    `INSERT INTO srp.credenciales (usuario_id, derivada, temporal, temporal_expira_en, intentos_fallidos, bloqueada_hasta, cambiada_en, cambiada_por_id)
     VALUES ($1, $2, true, now() + make_interval(hours => $4), 0, NULL, now(), $3)
     ON CONFLICT (usuario_id) DO UPDATE SET derivada = EXCLUDED.derivada, temporal = true, temporal_expira_en = EXCLUDED.temporal_expira_en,
       intentos_fallidos = 0, bloqueada_hasta = NULL, cambiada_en = now(), cambiada_por_id = EXCLUDED.cambiada_por_id`,
    [usuarioId, await derivar(t), actorId, horas],
  );
  return t;
}

interface Alta {
  id: string;
  correo: string;
  nombre_completo: string;
  organizacion_id: string;
  area_id: string | null;
  cargo_rol: string;
  perfil: string;
  coordinadores_ids: string[];
}

/* Las mismas reglas que el formulario de Usuarios de la aplicación (js/usuarios.js): institución
   activa, área en la Secretaría, nombre y al menos un apellido, correo válido y sin otra cuenta, cargo,
   perfil, Administración global sólo en la Secretaría y coordinadores de la misma institución. */
async function validarAlta(c: pg.PoolClient, d: Alta): Promise<[string, string][]> {
  const e: [string, string][] = [];
  const org = d.organizacion_id ? (await c.query<{ activo: boolean }>("SELECT activo FROM srp.instituciones WHERE id = $1", [d.organizacion_id])).rows[0] : undefined;
  if (!org) e.push(["organizacion_id", "Elija la institución."]);
  else if (!org.activo) e.push(["organizacion_id", "Esa institución está desactivada."]);
  const sedema = d.organizacion_id === SEDEMA;
  if (sedema && !d.area_id) e.push(["area_id", "Elija el área."]);
  if (d.area_id && !(await c.query("SELECT 1 FROM srp.areas WHERE id = $1 AND activo", [d.area_id])).rowCount) e.push(["area_id", "Esa área no existe o está desactivada."]);
  if (!d.nombre_completo) e.push(["nombre_completo", "Escriba el nombre completo."]);
  else if (d.nombre_completo.split(" ").length < 2) e.push(["nombre_completo", "Escriba nombre y al menos un apellido."]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) e.push(["correo", "Escriba un correo válido."]);
  else if ((await c.query("SELECT 1 FROM srp.usuarios WHERE correo = $1", [d.correo])).rowCount) e.push(["correo", "Ese correo ya tiene cuenta."]);
  if (!d.cargo_rol) e.push(["cargo_rol", "Escriba el cargo."]);
  if (!Object.hasOwn(PERFILES, d.perfil)) e.push(["perfil", "Elija el perfil de captura."]);
  else if (d.perfil === "ADMIN" && !sedema) e.push(["perfil", "La Administración global es sólo de la Secretaría."]);
  if (d.coordinadores_ids.length) {
    const ok = (
      await c.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM srp.usuarios WHERE id = ANY($1::uuid[]) AND perfil = 'COORDINADOR' AND organizacion_id = $2",
        [d.coordinadores_ids, d.organizacion_id],
      )
    ).rows[0].n;
    if (ok !== d.coordinadores_ids.length) e.push(["coordinadores_ids", "Los coordinadores del cabo son de su misma institución."]);
  }
  return e;
}

/* QUÉ CUENTAS VE CADA QUIEN, para decir quién registró, editó o tiene a su cargo lo que ve. La Administración
   global, todas, con su correo, para administrarlas. Los demás, sin correo: el directivo de la Secretaría,
   todas; el de otra institución, las de la suya; la coordinación, la suya, las de su cuadrilla y las de sus
   coordinadores; el cabo, la suya y las de sus coordinadores. Y todos, además, a quien aparezca en las
   jornadas y los árboles que ven: titulares, relevos, encargados y quien los editó. */
const SIN_CORREO = ["id", "nombre_completo", "organizacion_id", "area_id", "cargo_rol", "perfil", "coordinadores_ids", "activo"];

function cuentasVisiblesSql(u: Usuario, p: Parametros): string {
  const alcance = capacidadesDe(u).alcance;
  if (alcance === "todos") return "true";
  if (alcance === "ninguno") return `x.id = ${p.agregar(u.id)}::uuid`;
  // Cada valor entra como parámetro sólo si se usa: uno sin usar no tiene tipo y la consulta no corre
  let propias: string;
  if (alcance === "institucion") propias = `x.organizacion_id = ${p.agregar(u.organizacion_id)}`;
  else {
    const yo = p.agregar(u.id) + "::uuid";
    propias = `(x.id = ${yo} OR EXISTS (SELECT 1 FROM srp.usuarios y WHERE y.id = ${yo} AND x.id = ANY(y.coordinadores_ids))` +
      (alcance === "equipo" ? ` OR x.coordinadores_ids @> ARRAY[${yo}])` : ")");
  }
  // Alias propios: las condiciones de permisos.ts usan «a» y «j» por dentro
  const enJornadas = `EXISTS (SELECT 1 FROM srp.jornadas jor WHERE ${alcanceSql(u, "jornadas", "jor", p)} AND (jor.cabo_id = x.id OR jor.relevo_id = x.id
    OR jor.encargado_id = x.id OR jor.editado_por_id = x.id OR jor.relevos @> jsonb_build_array(jsonb_build_object('cabo_id', x.id::text))))`;
  const enArboles = `EXISTS (SELECT 1 FROM srp.plantaciones arb WHERE ${veArbolSql(u, "arb", p)} AND (arb.cabo_id = x.id OR arb.editado_por_id = x.id))`;
  return `(${propias} OR ${enJornadas} OR ${enArboles})`;
}

export function rutasCuentas(pool: pg.Pool, config: ConfigSrp, sesion: RequestHandler): Router {
  const r = Router();

  // Antes de la regla de administración, que vale para lo demás de /cuentas
  r.get("/cuentas", sesion, async (req: Request, res: Response) => {
    const u = sesionDe(res).usuario, p = new Parametros();
    const administra = capacidadesDe(u).usuarios;
    const fila = administra ? "to_jsonb(x)" : "jsonb_build_object(" + SIN_CORREO.map((k) => `'${k}', x.${k}`).join(", ") + ")";
    const condicion = administra ? "true" : cuentasVisiblesSql(u, p);
    const filas = await enTransaccion(pool, async (c) => {
      // Las fechas salen en UTC, sea cual sea la zona de la base
      await c.query("SET LOCAL TIME ZONE 'UTC'");
      return (await c.query<{ fila: Record<string, unknown> }>(`SELECT ${fila} AS fila FROM srp.usuarios x WHERE ${condicion} ORDER BY x.nombre_completo, x.id`, p.valores)).rows.map((x) => x.fila);
    });
    res.json({ filas });
  });

  r.use("/cuentas", sesion, exigirPermiso("usuario.administrar"));

  r.post("/cuentas", async (req: Request, res: Response) => {
    const b = req.body ?? {}, actor = sesionDe(res).usuario;
    const sedema = b.organizacion_id === SEDEMA;
    const d: Alta = {
      id: typeof b.id === "string" && UUID.test(b.id) ? b.id : randomUUID(),
      correo: limpio(b.correo).toLowerCase(),
      nombre_completo: limpio(b.nombre_completo),
      organizacion_id: limpio(b.organizacion_id),
      // Sin área fuera de la Secretaría; coordinadores, sólo el cabo
      area_id: sedema ? limpio(b.area_id) || null : null,
      cargo_rol: limpio(b.cargo_rol),
      perfil: limpio(b.perfil),
      coordinadores_ids: b.perfil === "CABO" && Array.isArray(b.coordinadores_ids) ? b.coordinadores_ids.filter((x: unknown) => typeof x === "string" && UUID.test(x)) : [],
    };
    const resultado = await enTransaccion(pool, async (c) => {
      const errores = await validarAlta(c, d);
      if (errores.length) return { errores };
      await c.query(
        `INSERT INTO srp.usuarios (id, correo, nombre_completo, organizacion_id, area_id, cargo_rol, perfil, coordinadores_ids, activo,
            fecha_creacion, creado_por_id, fecha_ultima_edicion, editado_por_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now(), $9, NULL, NULL)`,
        [d.id, d.correo, d.nombre_completo, d.organizacion_id, d.area_id, d.cargo_rol, d.perfil, d.coordinadores_ids, actor.id],
      );
      const t = await ponerTemporal(c, d.id, actor.id, config.acceso.temporalHoras);
      const org = (await c.query<{ nombre: string }>("SELECT nombre FROM srp.instituciones WHERE id = $1", [d.organizacion_id])).rows[0];
      await anotarCambio(c, actor, "CREADO", "usuario", d.id, "Alta de " + d.correo + " con perfil " + d.perfil + " en " + org.nombre);
      const u = (await c.query<Usuario>("SELECT * FROM srp.usuarios WHERE id = $1", [d.id])).rows[0];
      return { usuario: cuentaPublica(u), temporal: t };
    });
    if ("errores" in resultado) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise los datos de la cuenta.", errores: resultado.errores });
    res.status(201).json({ ...resultado, temporalVence: config.acceso.temporalHoras + " horas" });
  });

  r.post("/cuentas/:id/restablecer", async (req: Request, res: Response) => {
    const actor = sesionDe(res).usuario, id = String(req.params.id);
    if (!UUID.test(id)) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    const t = await enTransaccion(pool, async (c) => {
      if (!(await c.query("SELECT 1 FROM srp.usuarios WHERE id = $1", [id])).rowCount) return null;
      const nueva = await ponerTemporal(c, id, actor.id, config.acceso.temporalHoras);
      await cerrarDeCuenta(c, id, "CONTRASENA_RESTABLECIDA");
      await anotarCambio(c, actor, "EDITADO", "usuario", id, "Contraseña restablecida");
      return nueva;
    });
    if (!t) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    res.json({ temporal: t, temporalVence: config.acceso.temporalHoras + " horas" });
  });

  r.post("/cuentas/:id/estado", async (req: Request, res: Response) => {
    const actor = sesionDe(res).usuario, id = String(req.params.id), activo = req.body?.activo;
    if (typeof activo !== "boolean") return responder(res, 400, "FALTAN_DATOS", "Diga si la cuenta queda activa o no.");
    if (!UUID.test(id)) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    // Quien administra no se desactiva a sí mismo: el sistema podría quedar sin administración
    if (id === actor.id && !activo) return responder(res, 400, "PROPIA", "No puede desactivar su propia cuenta. Pida a otra cuenta de administración que lo haga.");
    const r2 = await enTransaccion(pool, async (c) => {
      const u = (await c.query<Usuario>("UPDATE srp.usuarios SET activo = $2, fecha_ultima_edicion = now(), editado_por_id = $3 WHERE id = $1 RETURNING *", [id, activo, actor.id])).rows[0];
      if (!u) return null;
      const cerradas = activo ? 0 : await cerrarDeCuenta(c, id, "CUENTA_DESACTIVADA");
      await anotarCambio(c, actor, activo ? "ACTIVADO" : "DESACTIVADO", "usuario", id);
      return { usuario: cuentaPublica(u), sesionesCerradas: cerradas };
    });
    if (!r2) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    res.json(r2);
  });

  return r;
}
