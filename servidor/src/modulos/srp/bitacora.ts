import type { Consultable, Usuario } from "./sesiones";

/* LA BITÁCORA DE CAMBIOS: quién dio de alta, editó, activó, desactivó o eliminó qué, y cuándo. Lleva el
   nombre y el perfil de quien actuó tal como eran en ese momento, como en la aplicación. Sólo crece. */

// Las de la regla de la tabla (02-srp-tablas.sql)
export type Accion = "CREADO" | "EDITADO" | "ELIMINADO" | "RESTAURADO" | "SUSTITUIDO" | "RELEVO" | "ACTIVADO" | "DESACTIVADO" | "FOLIO_ASIGNADO";

export async function anotarCambio(bd: Consultable, actor: Usuario, accion: Accion, entidad: string, entidadId: string, detalle = ""): Promise<void> {
  await bd.query(
    `INSERT INTO srp.bitacora (id, fecha, usuario_id, usuario_nombre, perfil, accion, entidad, entidad_id, detalle)
     VALUES (gen_random_uuid(), now(), $1, $2, $3, $4, $5, $6, $7)`,
    [actor.id, actor.nombre_completo, actor.perfil, accion, entidad, entidadId, detalle],
  );
}
