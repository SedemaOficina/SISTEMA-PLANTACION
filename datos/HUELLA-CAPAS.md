# Huella de las capas territoriales

Generado con `python3 herramientas/huella_capas.py`. No se edita a mano.

Describe las capas con que el sistema deriva alcaldía, colonia y celda de cada árbol. Sirve para
comprobar que las capas de otra fuente son las mismas antes de consumirlas: si la cuenta, las claves,
la superficie o los centroides difieren, lo ya derivado puede cambiar de alcaldía, colonia o celda.

| Capa | Versión | Campo clave | Polígonos | Superficie total (ha) | Envolvente (lon, lat) | Huella de las claves (SHA-256) |
|---|---|---|---|---|---|---|
| alcaldias | sia-2026-01-01 | `cvegeo` | 16 | 148,516.97 | -99.364924, 19.048237, -98.940303, 19.592757 | `71edffdaf9a9f9bb…` |
| colonias | iecm-2022 | `clave` | 1837 | 92,676.83 | -99.351093, 19.127417, -98.945648, 19.593781 | `3d85ec934fc46fe6…` |
| uga | sia-2026-09-22 | `clave` | 1624 | 162,528.72 | -99.370836, 19.043371, -98.933924, 19.601747 | `7ddb012438eb6383…` |

El detalle por polígono —superficie y centroide— está en `datos/HUELLA-CAPAS.json`.
La superficie se calcula en una proyección local a la latitud de cada polígono; contra PostGIS puede
diferir en centésimas de punto porcentual, por eso la comparación tolera 0.5 % de superficie y ~5 m de centroide.

## Cómo se compara con otra fuente

1. En la base de la otra fuente se corre la consulta de abajo, una vez por capa, y se guarda el resultado
   en un archivo `{ "alcaldias": { "poligonos": {…} }, "colonias": {…}, "uga": {…} }`.
2. `python3 herramientas/huella_capas.py ese_archivo.json` dice, por capa, qué claves faltan, cuáles sobran
   y qué polígonos cambiaron de superficie o de lugar.

```sql
-- Una consulta por capa. Sustituir <tabla>, <clave> y <geom> por los nombres reales del esquema territorial.
-- El resultado, guardado como JSON, se compara con: python3 herramientas/huella_capas.py resultado.json
SELECT json_object_agg(clave, json_build_object('area_ha', area_ha, 'cx', cx, 'cy', cy)) AS poligonos
FROM (
  SELECT <clave>::text AS clave,
         round((ST_Area(ST_Transform(<geom>, 4326)::geography) / 10000.0)::numeric, 2) AS area_ha,
         round(ST_X(ST_Centroid(ST_Transform(<geom>, 4326)))::numeric, 6) AS cx,
         round(ST_Y(ST_Centroid(ST_Transform(<geom>, 4326)))::numeric, 6) AS cy
  FROM <tabla>
) t;

-- Resumen rápido, para una primera mirada:
SELECT count(*) AS n, round((sum(ST_Area(ST_Transform(<geom>, 4326)::geography)) / 10000.0)::numeric, 2) AS area_total_ha,
       ST_SRID(<geom>) AS srid, ST_Extent(ST_Transform(<geom>, 4326)) AS envolvente
FROM <tabla> GROUP BY ST_SRID(<geom>);
```
