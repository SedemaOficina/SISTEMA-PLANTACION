import { randomUUID } from "node:crypto";
import { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { cuentaPublica, sesionDe } from "./acceso";
import { anotarCambio } from "./bitacora";
import { mismaVersion, TABLAS } from "./catalogos";
import type { ConfigSrp } from "./config";
import { derivar, temporal } from "./contrasenas";
import { responder } from "./errores";
import { alcanceSql, capacidadesDe, exigirPermiso, Parametros, PERFILES, SEDEMA, veArbolSql } from "./permisos";
import { cerrarDeCuenta, type Consultable, type Usuario } from "./sesiones";
import { enTransaccion } from "./transaccion";

/* CUENTAS: la lista que ve cada quien, y el alta, el restablecimiento de contraseña y la activación, que sólo
   hace quien tiene la regla `usuario.administrar` (permisos.ts): la Administración global.

   GET    /cuentas                   las cuentas que ve cada quien (abajo); con sesión
   GET    /cuentas/usos              en qué aparece cada cuenta: decide si se puede eliminar
   POST   /cuentas                   alta con contraseña temporal; responde la cuenta y la temporal
   PUT    /cuentas/:id               edición: nombre, institución, área, cargo y perfil (el correo no cambia)
   POST   /cuentas/:id/restablecer   otra temporal; cierra las sesiones de la cuenta
   POST   /cuentas/:id/estado        { activo } → desactivar cierra las sesiones de la cuenta
   DELETE /cuentas/:id               elimina una cuenta que no aparece en nada; la que aparece, se desactiva

   La edición trae la versión de la cuenta (mismaVersion, en catalogos.ts), y la última Administración global
   activa no se desactiva, no se elimina ni deja de serlo.

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
}

/* Las mismas reglas que el formulario de Usuarios de la aplicación (js/usuarios.js): institución
   activa, área en la Secretaría, nombre y al menos un apellido, correo válido y sin otra cuenta, cargo,
   perfil y Administración global sólo en la Secretaría. Al editar (`previa`), el correo no cambia y la
   institución sólo se revisa si cambió, y quien administra no se quita a sí mismo la Administración. */
async function validarAlta(c: pg.PoolClient, d: Alta, previa: Usuario | null = null, actor: Usuario | null = null): Promise<[string, string][]> {
  const e: [string, string][] = [];
  const org = d.organizacion_id ? (await c.query<{ activo: boolean }>("SELECT activo FROM srp.instituciones WHERE id = $1", [d.organizacion_id])).rows[0] : undefined;
  if (!org) e.push(["organizacion_id", "Elija la institución."]);
  else if (!org.activo && (!previa || previa.organizacion_id !== d.organizacion_id)) e.push(["organizacion_id", "Esa institución está desactivada."]);
  const sedema = d.organizacion_id === SEDEMA;
  if (sedema && !d.area_id) e.push(["area_id", "Elija el área."]);
  if (d.area_id && !(await c.query("SELECT 1 FROM srp.areas WHERE id = $1 AND activo", [d.area_id])).rowCount) e.push(["area_id", "Esa área no existe o está desactivada."]);
  if (!d.nombre_completo) e.push(["nombre_completo", "Escriba el nombre completo."]);
  else if (d.nombre_completo.split(" ").length < 2) e.push(["nombre_completo", "Escriba nombre y al menos un apellido."]);
  else if (d.nombre_completo.length > 160) e.push(["nombre_completo", "El nombre lleva hasta 160 caracteres."]);
  if (!previa) {
    // El acceso no lee más de 254: una cuenta con un correo más largo nunca podría entrar
    if (d.correo.length > 254) e.push(["correo", "El correo lleva hasta 254 caracteres."]);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) e.push(["correo", "Escriba un correo válido."]);
    else if ((await c.query("SELECT 1 FROM srp.usuarios WHERE correo = $1", [d.correo])).rowCount) e.push(["correo", "Ese correo ya tiene cuenta."]);
  }
  if (!d.cargo_rol) e.push(["cargo_rol", "Escriba el cargo."]);
  else if (d.cargo_rol.length > 120) e.push(["cargo_rol", "El cargo lleva hasta 120 caracteres."]);
  if (!Object.hasOwn(PERFILES, d.perfil)) e.push(["perfil", "Elija el perfil de captura."]);
  else if (d.perfil === "ADMIN" && !sedema) e.push(["perfil", "La Administración global es sólo de la Secretaría."]);
  if (previa && actor && previa.id === actor.id && d.perfil !== "ADMIN") {
    e.push(["perfil", "No puede cambiar su propio perfil de administración. Pida a otra cuenta de administración que lo haga."]);
  }
  return e;
}

/* SIEMPRE QUEDA UNA ADMINISTRACIÓN GLOBAL ACTIVA. Desactivar, eliminar o quitarle el perfil a una se revisa con un
   candado y en la misma transacción: dos que se desactivan una a la otra al mismo tiempo no dejan al sistema sin
   nadie que lo administre. true si `id` es la única activa. */
async function esLaUltimaAdministracion(c: pg.PoolClient, id: string): Promise<boolean> {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended('srp.administracion', 0))");
  const r = (await c.query<{ ella: boolean | null; otras: number }>(
    "SELECT bool_or(id = $1) AS ella, count(*) FILTER (WHERE id <> $1)::int AS otras FROM srp.usuarios WHERE perfil = 'ADMIN' AND activo",
    [id],
  )).rows[0];
  return r.ella === true && r.otras === 0;
}
const ULTIMA = "Es la única Administración global activa: si se desactiva, nadie podría administrar el sistema. Active o dé de alta otra antes.";
const ULTIMA_PERFIL = "Es la única Administración global activa: no puede dejar de serlo. Active o dé de alta otra antes.";

// La cuenta como la responde la edición, con su versión: el momento de su último cambio en el servidor
const conVersion = (u: Usuario & { fecha_creacion?: unknown; fecha_ultima_edicion?: unknown }) =>
  ({ ...cuentaPublica(u), fecha_creacion: u.fecha_creacion, fecha_ultima_edicion: u.fecha_ultima_edicion });

/* QUÉ CUENTAS VE CADA QUIEN, para decir quién registró, editó o tiene a su cargo lo que ve. La Administración
   global, todas, con su correo, para administrarlas. Los demás, sin correo: el directivo de la Secretaría,
   todas; el de otra institución y la coordinación, las de su institución; el cabo, la suya. Y todos, además, a
   quien aparezca en las jornadas y los árboles que ven: titulares, relevos, cabos de apoyo, encargados y quien
   los editó. */
const SIN_CORREO = ["id", "nombre_completo", "organizacion_id", "area_id", "cargo_rol", "perfil", "activo"];

/* EN QUÉ APARECE CADA CUENTA, contado por renglón: árboles, jornadas (también en sus relevos y como cabo de apoyo),
   otras cuentas (las que dio de alta o editó), catálogos, y las entradas al sistema, que dejan constancia.
   Lo mismo que cuenta la aplicación con datos de prueba, más las entradas. Quien revisó duplicados, cambió
   parámetros, hizo una carga o subió fotografías ya entró: las entradas lo cubren. */
type OrigenCuenta = "plantaciones" | "jornadas" | "usuarios" | "catalogos" | "entradas";
type UsosCuenta = Partial<Record<OrigenCuenta, number>>;

const ORIGENES_CUENTA: [OrigenCuenta, string][] = [
  ["plantaciones", "SELECT x.id::text AS fila, v FROM srp.plantaciones x, unnest(ARRAY[x.cabo_id::text, x.editado_por_id::text]) v"],
  ["jornadas", `SELECT x.id::text AS fila, v FROM srp.jornadas x, unnest(ARRAY[x.cabo_id::text, x.encargado_id::text, x.relevo_id::text, x.editado_por_id::text]
      || ARRAY(SELECT y.r ->> k FROM jsonb_array_elements(x.relevos || x.cabos_apoyo) y(r), unnest(ARRAY['cabo_id', 'por_id']) k)) v`],
  // Quien se nombra a sí mismo (editó su propia cuenta) no cuenta
  ["usuarios", "SELECT x.id::text AS fila, v FROM srp.usuarios x, unnest(ARRAY[x.creado_por_id::text, x.editado_por_id::text]) v WHERE v <> x.id::text"],
  ["catalogos", TABLAS.map((t) => `SELECT '${t}:' || x.id AS fila, v FROM srp.${t} x, unnest(ARRAY[x.creado_por_id::text, x.editado_por_id::text]) v`).join(" UNION ALL ")],
  ["entradas", "SELECT x.id::text AS fila, x.usuario_id::text AS v FROM srp.bitacora_acceso x"],
];

// { id: { tabla: n } } de todas las cuentas, o sólo de `id`
async function usosDeCuentas(bd: Consultable, id: string | null = null): Promise<Record<string, UsosCuenta>> {
  const usos: Record<string, UsosCuenta> = {};
  const solo = id ? " AND v = $1" : "";
  for (const [origen, sql] of ORIGENES_CUENTA) {
    const { rows } = await bd.query<{ id: string; n: number }>(
      `SELECT v AS id, count(DISTINCT fila)::int AS n FROM (${sql}) s WHERE v IS NOT NULL${solo} GROUP BY v`, id ? [id] : []);
    for (const r of rows) (usos[r.id] ??= {})[origen] = r.n;
  }
  return usos;
}

const NOMBRES_USO: Record<Exclude<OrigenCuenta, "entradas">, [string, string]> = {
  plantaciones: ["árbol", "árboles"], jornadas: ["jornada", "jornadas"], usuarios: ["cuenta", "cuentas"], catalogos: ["catálogo", "catálogos"],
};

// «aparece en 12 árboles y 1 jornada y ya entró al sistema»; '' si no aparece en nada
function textoUsosCuenta(u: UsosCuenta | undefined): string {
  if (!u) return "";
  const lista = (partes: string[]) => (partes.length > 1 ? partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1] : partes[0] || "");
  const aparece = lista((Object.keys(NOMBRES_USO) as (keyof typeof NOMBRES_USO)[]).filter((t) => u[t]).map((t) => u[t] + " " + NOMBRES_USO[t][u[t] === 1 ? 0 : 1]));
  return lista([aparece ? "aparece en " + aparece : "", u.entradas ? "ya entró al sistema" : ""].filter(Boolean));
}

function cuentasVisiblesSql(u: Usuario, p: Parametros): string {
  const alcance = capacidadesDe(u).alcance;
  if (alcance === "todos") return "true";
  if (alcance === "ninguno") return `x.id = ${p.agregar(u.id)}::uuid`;
  // Cada valor entra como parámetro sólo si se usa: uno sin usar no tiene tipo y la consulta no corre
  const propias = alcance === "institucion" ? `x.organizacion_id = ${p.agregar(u.organizacion_id)}` : `x.id = ${p.agregar(u.id)}::uuid`;
  // Alias propios: las condiciones de permisos.ts usan «a» y «j» por dentro
  const enJornadas = `EXISTS (SELECT 1 FROM srp.jornadas jor WHERE ${alcanceSql(u, "jornadas", "jor", p)} AND (jor.cabo_id = x.id OR jor.relevo_id = x.id
    OR jor.encargado_id = x.id OR jor.editado_por_id = x.id OR jor.relevos @> jsonb_build_array(jsonb_build_object('cabo_id', x.id::text))
    OR jor.cabos_apoyo @> jsonb_build_array(jsonb_build_object('cabo_id', x.id::text))))`;
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

  r.get("/cuentas/usos", async (req: Request, res: Response) => {
    res.json(await usosDeCuentas(pool));
  });

  r.post("/cuentas", async (req: Request, res: Response) => {
    const b = req.body ?? {}, actor = sesionDe(res).usuario;
    const sedema = b.organizacion_id === SEDEMA;
    const d: Alta = {
      id: typeof b.id === "string" && UUID.test(b.id) ? b.id : randomUUID(),
      correo: limpio(b.correo).toLowerCase(),
      nombre_completo: limpio(b.nombre_completo),
      organizacion_id: limpio(b.organizacion_id),
      // Sin área fuera de la Secretaría
      area_id: sedema ? limpio(b.area_id) || null : null,
      cargo_rol: limpio(b.cargo_rol),
      perfil: limpio(b.perfil),
    };
    const resultado = await enTransaccion(pool, async (c) => {
      const errores = await validarAlta(c, d);
      if (errores.length) return { errores };
      await c.query(
        `INSERT INTO srp.usuarios (id, correo, nombre_completo, organizacion_id, area_id, cargo_rol, perfil, activo,
            fecha_creacion, creado_por_id, fecha_ultima_edicion, editado_por_id) VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), $8, NULL, NULL)`,
        [d.id, d.correo, d.nombre_completo, d.organizacion_id, d.area_id, d.cargo_rol, d.perfil, actor.id],
      );
      const t = await ponerTemporal(c, d.id, actor.id, config.acceso.temporalHoras);
      const org = (await c.query<{ nombre: string }>("SELECT nombre FROM srp.instituciones WHERE id = $1", [d.organizacion_id])).rows[0];
      await anotarCambio(c, actor, "CREADO", "usuario", d.id, "Alta de " + d.correo + " con perfil " + d.perfil + " en " + org.nombre);
      const u = (await c.query<Usuario>("SELECT * FROM srp.usuarios WHERE id = $1", [d.id])).rows[0];
      return { usuario: conVersion(u), temporal: t };
    });
    if ("errores" in resultado) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise los datos de la cuenta.", errores: resultado.errores });
    res.status(201).json({ ...resultado, temporalVence: config.acceso.temporalHoras + " horas" });
  });

  r.put("/cuentas/:id", async (req: Request, res: Response) => {
    const b = req.body ?? {}, actor = sesionDe(res).usuario, id = String(req.params.id);
    if (!UUID.test(id)) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    const resultado = await enTransaccion(pool, async (c) => {
      const previa = (await c.query<Usuario>("SELECT * FROM srp.usuarios WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (!previa) return null;
      const sedema = b.organizacion_id === SEDEMA;
      const d: Alta = {
        id, correo: previa.correo,
        nombre_completo: limpio(b.nombre_completo),
        organizacion_id: limpio(b.organizacion_id),
        area_id: sedema ? limpio(b.area_id) || null : null,
        cargo_rol: limpio(b.cargo_rol),
        perfil: limpio(b.perfil),
      };
      if (!(await mismaVersion(c, "usuarios", id, b.version))) return { vieja: true };
      const errores = await validarAlta(c, d, previa, actor);
      if (!errores.length && previa.perfil === "ADMIN" && d.perfil !== "ADMIN" && (await esLaUltimaAdministracion(c, id))) errores.push(["perfil", ULTIMA_PERFIL]);
      if (errores.length) return { errores };
      // La bitácora dice qué campos cambiaron, como en la aplicación
      const campos = ["nombre_completo", "organizacion_id", "area_id", "cargo_rol", "perfil"] as const;
      const valor = (o: Record<string, unknown>, k: string) => String(o[k] ?? "");
      const cambiados = campos.filter((k) => valor(previa as unknown as Record<string, unknown>, k) !== valor(d as unknown as Record<string, unknown>, k));
      const u = (await c.query<Usuario>(
        `UPDATE srp.usuarios SET nombre_completo = $2, organizacion_id = $3, area_id = $4, cargo_rol = $5, perfil = $6,
            fecha_ultima_edicion = now(), editado_por_id = $7 WHERE id = $1 RETURNING *`,
        [id, d.nombre_completo, d.organizacion_id, d.area_id, d.cargo_rol, d.perfil, actor.id],
      )).rows[0];
      await anotarCambio(c, actor, "EDITADO", "usuario", id, "Campos: " + (cambiados.join(", ") || "ninguno"));
      return { usuario: conVersion(u) };
    });
    if (!resultado) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    if ("vieja" in resultado) return responder(res, 409, "VERSION_VIEJA", "Alguien más cambió esta cuenta mientras usted la editaba.");
    if ("errores" in resultado) return res.status(400).json({ codigo: "DATOS_INVALIDOS", mensaje: "Revise los datos de la cuenta.", errores: resultado.errores });
    res.json(resultado);
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
      if (!activo && (await esLaUltimaAdministracion(c, id))) return { ultima: true };
      const u = (await c.query<Usuario>("UPDATE srp.usuarios SET activo = $2, fecha_ultima_edicion = now(), editado_por_id = $3 WHERE id = $1 RETURNING *", [id, activo, actor.id])).rows[0];
      if (!u) return null;
      const cerradas = activo ? 0 : await cerrarDeCuenta(c, id, "CUENTA_DESACTIVADA");
      await anotarCambio(c, actor, activo ? "ACTIVADO" : "DESACTIVADO", "usuario", id);
      return { usuario: conVersion(u), sesionesCerradas: cerradas };
    });
    if (!r2) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    if ("ultima" in r2) return responder(res, 409, "ULTIMA_ADMINISTRACION", ULTIMA);
    res.json(r2);
  });

  /* Sólo una cuenta que no aparece en nada (arriba): una que ya entró al sistema deja constancia. Si algo la
     nombra y no se contó, la llave foránea de la base tampoco la deja ir. */
  r.delete("/cuentas/:id", async (req: Request, res: Response) => {
    const actor = sesionDe(res).usuario, id = String(req.params.id);
    if (!UUID.test(id)) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    if (id === actor.id) return responder(res, 400, "PROPIA", "No puede eliminar su propia cuenta.");
    const eliminar = () => enTransaccion(pool, async (c) => {
      const u = (await c.query<Usuario>("SELECT * FROM srp.usuarios WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (!u) return null;
      if (await esLaUltimaAdministracion(c, id)) return { ultima: true };
      const usos = textoUsosCuenta((await usosDeCuentas(c, id))[id]);
      if (usos) return { usos };
      await c.query("DELETE FROM srp.usuarios WHERE id = $1", [id]);
      await anotarCambio(c, actor, "ELIMINADO", "usuario", id, u.correo);
      return { ok: true };
    });
    const resultado = await eliminar().catch((e: { code?: string }) => {
      if (e?.code === "23503") return { usos: "aparece en otro registro" };
      throw e;
    });
    if (!resultado) return responder(res, 404, "NO_EXISTE", "Esa cuenta no existe.");
    if ("ultima" in resultado) return responder(res, 409, "ULTIMA_ADMINISTRACION", ULTIMA);
    if ("usos" in resultado) return responder(res, 409, "EN_USO", "No se puede eliminar: " + resultado.usos + ". Desactívela: eso sí se deshace.");
    res.json(resultado);
  });

  return r;
}
