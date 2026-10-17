import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express, { Router, type Request, type RequestHandler, type Response } from "express";
import type pg from "pg";
import { sesionDe } from "./acceso";
import type { ConfigSrp } from "./config";
import { responder } from "./errores";
import { autoresDe, comoObjeto, filaDe, type Fila } from "./recepcion-apoyo";
import { capacidadesDe, exigirPermiso, puede, veArbolSql, Parametros } from "./permisos";
import { enTransaccion } from "./transaccion";

/* LAS FOTOGRAFÍAS, como archivos fuera de la base y de lo que se publica, en la carpeta SRP_FOTOS_DIR.

   PUT  /fotos/:id     la imagen, tal cual (image/jpeg, image/png o image/webp); `id` es el `foto_id` del árbol
   GET  /fotos/:id     la imagen, para quien puede ver ese árbol y descargar fotografías
   GET  /fotos/uso     cuántas hay, cuánto ocupan y cuánto ocuparían en un año al ritmo de los últimos 30 días;
                       para pedir el espacio a tiempo (sólo la Administración global)

   La fotografía llega después de su árbol, de quien puede editarlo. No se reemplaza: una nueva lleva otro id.
   Reenviar la misma (la misma huella) da la misma respuesta; otra distinta con el mismo id se rechaza. Dos
   envíos del mismo id van uno a la vez. El archivo se escribe completo antes de registrarlo, así que nunca
   queda registrada una fotografía a medias. */

const TIPOS: { tipo: string; extension: string; es: (b: Buffer) => boolean }[] = [
  { tipo: "image/jpeg", extension: "jpg", es: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { tipo: "image/png", extension: "png", es: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { tipo: "image/webp", extension: "webp", es: (b) => b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Dónde vive el archivo: en subcarpetas por los dos primeros caracteres del id, para no juntar miles en una
const rutaDe = (carpeta: string, id: string, extension: string) => path.join(carpeta, id.slice(0, 2), id + "." + extension);

export function rutasFotografias(pool: pg.Pool, config: ConfigSrp, sesion: RequestHandler): Router {
  const r = Router();
  const { carpeta, maximoKb } = config.fotos;
  // La carpeta de las fotografías, o la respuesta de que este servidor todavía no las tiene
  const carpetaDe = (res: Response): string | null => {
    if (carpeta) return carpeta;
    responder(res, 503, "SIN_FOTOGRAFIAS", "Este servidor todavía no recibe fotografías.");
    return null;
  };

  r.get("/fotos/uso", sesion, exigirPermiso("usuario.administrar"), async (req: Request, res: Response) => {
    const u = (await pool.query<{ n: number; bytes: string; recientes: number; bytes_recientes: string }>(
      `SELECT count(*)::int AS n, coalesce(sum(bytes), 0)::text AS bytes,
              count(*) FILTER (WHERE recibida_en > now() - interval '30 days')::int AS recientes,
              coalesce(sum(bytes) FILTER (WHERE recibida_en > now() - interval '30 days'), 0)::text AS bytes_recientes
         FROM srp.fotografias`,
    )).rows[0];
    const mb = (b: string | number) => Math.round((Number(b) / 1048576) * 10) / 10;
    res.json({
      fotografias: u.n,
      megabytes: mb(u.bytes),
      promedio_kb: u.n ? Math.round(Number(u.bytes) / u.n / 1024) : 0,
      ultimos_30_dias: { fotografias: u.recientes, megabytes: mb(u.bytes_recientes) },
      al_ano_megabytes: mb((Number(u.bytes_recientes) * 365) / 30),
    });
  });

  // La imagen llega tal cual, no en JSON: el límite es el de una fotografía, y se dice antes de leerla
  const imagen = express.raw({ type: () => true, limit: maximoKb * 1024 });
  const pesoMaximo: RequestHandler = (req, res, next) =>
    Number(req.get("content-length") ?? 0) > maximoKb * 1024 ? responder(res, 413, "FOTO_GRANDE", "La fotografía pesa más de " + maximoKb + " KB.") : next();

  r.put("/fotos/:id", sesion, pesoMaximo, imagen, async (req: Request, res: Response) => {
    const dir = carpetaDe(res);
    if (!dir) return;
    const id = String(req.params.id);
    if (!UUID.test(id)) return responder(res, 404, "NO_EXISTE", "Esa fotografía no existe.");
    const datos = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const tipo = TIPOS.find((t) => t.es(datos));
    if (!tipo) return responder(res, 400, "NO_ES_IMAGEN", "La fotografía no es una imagen JPEG, PNG o WebP.");
    const sha256 = createHash("sha256").update(datos).digest("hex");
    const u = sesionDe(res).usuario;

    const resultado = await enTransaccion(pool, async (c) => {
      // Uno a la vez por fotografía: el segundo envío ve lo que dejó el primero
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["srp.foto:" + id]);
      // Su árbol, que no cambia mientras se registra la fotografía
      const arbolId = (await c.query<{ id: string }>("SELECT id FROM srp.plantaciones WHERE foto_id = $1 ORDER BY fecha_registro LIMIT 1", [id])).rows[0]?.id;
      const arbol = arbolId ? await filaDe(c, "plantaciones", arbolId, "FOR SHARE") : undefined;
      if (!arbol) return { estado: 409, codigo: "ARBOL_PENDIENTE", mensaje: "El árbol de esta fotografía todavía no está en el servidor: la fotografía se manda después de él." };
      if (!puede("registro.editar", u, comoObjeto(arbol), await autoresDe(c, arbol as Fila))) {
        return { estado: 403, codigo: "SIN_PERMISO", mensaje: "No tiene permiso para editar este registro." };
      }
      const previa = (await c.query<{ sha256: string }>("SELECT sha256 FROM srp.fotografias WHERE id = $1", [id])).rows[0];
      if (previa) {
        return previa.sha256 === sha256
          ? { estado: 200, cuerpo: { id, tipo: tipo.tipo, bytes: datos.length, sha256, repetida: true } }
          : { estado: 409, codigo: "YA_EXISTE", mensaje: "Ya hay otra fotografía con ese identificador: una fotografía nueva lleva otro." };
      }
      // Primero el archivo completo, con otro nombre, y luego se renombra: nunca queda uno a medias
      const destino = rutaDe(dir, id, tipo.extension);
      await fs.mkdir(path.dirname(destino), { recursive: true });
      const temporal = destino + "." + randomUUID() + ".parcial";
      await fs.writeFile(temporal, datos);
      await fs.rename(temporal, destino);
      await c.query(
        "INSERT INTO srp.fotografias (id, plantacion_id, tipo, bytes, sha256, recibida_por_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, arbol.id, tipo.tipo, datos.length, sha256, u.id],
      );
      return { estado: 201, cuerpo: { id, tipo: tipo.tipo, bytes: datos.length, sha256 } };
    });
    if ("cuerpo" in resultado) return res.status(resultado.estado).json(resultado.cuerpo);
    responder(res, resultado.estado, resultado.codigo, resultado.mensaje);
  });

  r.get("/fotos/:id", sesion, async (req: Request, res: Response) => {
    const dir = carpetaDe(res);
    if (!dir) return;
    const id = String(req.params.id);
    const u = sesionDe(res).usuario;
    if (!capacidadesDe(u).galeria) return responder(res, 403, "SIN_PERMISO", "No tiene permiso para descargar las fotografías.");
    // Sólo de un árbol que puede ver; si no lo ve, para él no existe
    const p = new Parametros();
    const condicion = veArbolSql(u, "x", p);
    const f = UUID.test(id)
      ? (await pool.query<{ tipo: string; bytes: number; sha256: string }>(
          `SELECT f.tipo, f.bytes, f.sha256 FROM srp.fotografias f JOIN srp.plantaciones x ON x.id = f.plantacion_id
            WHERE f.id = ${p.agregar(id)}::uuid AND ${condicion}`,
          p.valores,
        )).rows[0]
      : undefined;
    if (!f) return responder(res, 404, "NO_EXISTE", "Esa fotografía no existe.");
    const extension = TIPOS.find((t) => t.tipo === f.tipo)?.extension ?? "jpg";
    let datos: Buffer;
    try {
      datos = await fs.readFile(rutaDe(dir, id, extension));
    } catch {
      console.error(`🔥 [SRP] la fotografía ${id} está registrada y su archivo no está en ${dir}`);
      return responder(res, 404, "SIN_ARCHIVO", "La fotografía está registrada, pero su archivo no está en el servidor. Avise a la Administración.");
    }
    // El teléfono no acumula fotografías: se piden cada vez que se ven y el navegador no guarda copia
    res.set({ "Content-Type": f.tipo, "Cache-Control": "no-store", ETag: '"' + f.sha256 + '"' });
    res.send(datos);
  });

  return r;
}
