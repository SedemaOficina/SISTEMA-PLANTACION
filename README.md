# SRP — Sistema de Registro de Plantaciones (SEDEMA)

Prototipo Fase 1. Etapa 1 (cascarón con datos ficticios). Versión 0.1.0.

## Cómo abrirlo
**En la computadora:** doble clic en `index.html` (Chrome o Edge). No requiere servidor ni internet;
sólo el mapa base (calles) necesita conexión. Sin conexión se puede colocar el punto igual.

**En el teléfono:** la ubicación GPS y la cámara sólo funcionan en una dirección `https://`.
Hay que publicarlo (p. ej. GitHub Pages). Abrir el archivo copiado al teléfono no activa el GPS.

## Perfiles de prueba
En la pantalla de acceso, «Entrar con un usuario de prueba». En el pie de página:
«Cambiar de usuario (pruebas)» y «Restablecer datos de prueba». Ambas desaparecen al poner
`ES_FICTICIO: false` en `js/config.js`.

| Usuario ficticio | Perfil | Qué debe ver |
|---|---|---|
| Fulana de Tal Ejemplo | Registrador | Sólo sus registros; edita y elimina los suyos |
| Mengano Pérez Ejemplo | Registrador | Ídem |
| Zutana … Villaseñor Ejemplo | Registrador sin jefe | Nombre largo; su jefe NO la ve (caso de prueba) |
| Perengano Gómez Ejemplo | Jefe de registradores | Registros de su equipo; edita, no elimina |
| Administración SIA Ejemplo | Administración global | Todo, más la pestaña Catálogos |
| Consulta Solo Lectura Ejemplo | Consulta | Todo, sin editar ni registrar; sí genera PDF |

## Estructura
```
index.html            Pantallas
css/estilos.css       Estilos (orden fijo por bloques; ver encabezado del archivo)
js/config.js          ÚNICO lugar con valores configurables
js/permisos.js        ÚNICO lugar con las reglas de cada perfil
js/almacen.js         Base local (IndexedDB), migraciones y bitácora
js/sesion.js          Acceso (simulado; se sustituye en Fase 2)
js/datos-ficticios.js Usuarios, catálogos y 34 plantaciones de prueba
js/derivacion.js      Cruce punto-en-polígono (alcaldía, colonia, UGA)
js/referencias.js     Catálogos y usuarios en memoria
js/usuarios.js       Alta y administración de cuentas (sólo Administración global)
js/mapa.js, foto.js, formulario.js, registros.js, reportes.js, catalogos.js, app.js
assets/capas-ficticias.js  Capas geográficas FICTICIAS (sustituir por las reales)
assets/logo.js        Logotipo SEDEMA incrustado
vendor/               Bibliotecas incluidas localmente (Leaflet, jsPDF, Turf-PIP)
```

## Sustituir las capas geográficas
Reemplazar `assets/capas-ficticias.js` conservando `SRP.CAPAS` y estos atributos:
- `alcaldias_colonias`: polígonos de colonia en EPSG:4326 con `cve_alc`, `alcaldia`, `cve_col`, `colonia`.
- `uga`: polígonos de la malla con `id_uga`.
Cada capa lleva `meta` con origen, versión y fecha de corte.

## Datos
Todo vive en el navegador de cada dispositivo (IndexedDB). Borrar los datos del navegador borra
los registros. En Fase 1 no hay respaldo ni envío a servidor.
