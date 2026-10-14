-- LOS PARÁMETROS: los valores con que el sistema revisa puntos, GPS y envíos (distancias de los avisos de
-- jornada, niveles de precisión, margen del límite de la Ciudad, espera del GPS, hora de atraso, reintento de
-- envío, tamaño de la fotografía y renglones por página). Sus valores de arranque, sus rangos y su
-- descripción viven en el módulo (src/modulos/srp/parametros.ts); aquí sólo los que la Administración global
-- cambió, para todos los teléfonos a la vez. Lo corre quien administra la base, dentro de instalar.sql.

CREATE TABLE srp.parametros (
  clave                  text           NOT NULL,
  valor                  numeric        NOT NULL,
  editado_por_id         uuid           NOT NULL,
  fecha_ultima_edicion   timestamptz    NOT NULL,
  CONSTRAINT parametros_pk PRIMARY KEY (clave),
  CONSTRAINT parametros_clave CHECK (clave ~ '^[A-Z_]+(\.[A-Z_]+)?$')
);
COMMENT ON TABLE srp.parametros IS 'Los parámetros que la Administración global cambió; los demás valen lo de arranque, que dice el módulo.';
COMMENT ON COLUMN srp.parametros.clave IS 'El nombre que tiene en la configuración de la aplicación: JORNADA.DUPLICADO_M, MAPA.GPS_ESPERA_MS…';
ALTER TABLE srp.parametros ADD CONSTRAINT parametros_editado_por_id_fk FOREIGN KEY (editado_por_id) REFERENCES srp.usuarios (id) ON DELETE RESTRICT;
