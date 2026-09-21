/* CAPAS GEOESPACIALES FICTICIAS
   Estructura esperada de las capas reales (lo que hay que pedir al área que las produzca):
   - alcaldias_colonias: polígonos de colonia, EPSG:4326, con atributos
       cve_alc (clave estable de alcaldía), alcaldia (nombre), cve_col (clave estable de colonia), colonia (nombre)
   - uga: polígonos de la malla UGA, EPSG:4326, con atributo id_uga
   Para sustituirlas basta reemplazar este archivo conservando SRP.CAPAS y esos nombres de atributo. */
window.SRP = window.SRP || {};
SRP.CAPAS = {
 "alcaldias_colonias": {
  "meta": {
   "origen": "FICTICIO — generado para pruebas; no representa límites reales",
   "version": "ficticia-0.1",
   "fecha_corte": "2026-09-21",
   "crs": "EPSG:4326 (longitud, latitud)"
  },
  "geojson": {
   "type": "FeatureCollection",
   "features": [
    {
     "type": "Feature",
     "properties": {
      "cve_alc": "AF1",
      "alcaldia": "Alcaldía Ficticia Norte",
      "cve_col": "AF1-C1",
      "colonia": "Colonia Ficticia Poniente (Norte)"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.2,
         19.4
        ],
        [
         -99.14,
         19.4
        ],
        [
         -99.14,
         19.46
        ],
        [
         -99.2,
         19.46
        ],
        [
         -99.2,
         19.4
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "cve_alc": "AF1",
      "alcaldia": "Alcaldía Ficticia Norte",
      "cve_col": "AF1-C2",
      "colonia": "Colonia Ficticia Oriente (Norte)"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.14,
         19.4
        ],
        [
         -99.08,
         19.4
        ],
        [
         -99.08,
         19.46
        ],
        [
         -99.14,
         19.46
        ],
        [
         -99.14,
         19.4
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "cve_alc": "AF2",
      "alcaldia": "Alcaldía Ficticia Centro",
      "cve_col": "AF2-C1",
      "colonia": "Colonia Ficticia Poniente (Centro)"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.2,
         19.35
        ],
        [
         -99.14,
         19.35
        ],
        [
         -99.14,
         19.4
        ],
        [
         -99.2,
         19.4
        ],
        [
         -99.2,
         19.35
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "cve_alc": "AF2",
      "alcaldia": "Alcaldía Ficticia Centro",
      "cve_col": "AF2-C2",
      "colonia": "Colonia Ficticia Oriente (Centro)"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.14,
         19.35
        ],
        [
         -99.08,
         19.35
        ],
        [
         -99.08,
         19.4
        ],
        [
         -99.14,
         19.4
        ],
        [
         -99.14,
         19.35
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "cve_alc": "AF3",
      "alcaldia": "Alcaldía Ficticia Sur",
      "cve_col": "AF3-C1",
      "colonia": "Colonia Ficticia Poniente (Sur)"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.2,
         19.3
        ],
        [
         -99.14,
         19.3
        ],
        [
         -99.14,
         19.35
        ],
        [
         -99.2,
         19.35
        ],
        [
         -99.2,
         19.3
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "cve_alc": "AF3",
      "alcaldia": "Alcaldía Ficticia Sur",
      "cve_col": "AF3-C2",
      "colonia": "Colonia Ficticia Oriente (Sur)"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.14,
         19.3
        ],
        [
         -99.08,
         19.3
        ],
        [
         -99.08,
         19.35
        ],
        [
         -99.14,
         19.35
        ],
        [
         -99.14,
         19.3
        ]
       ]
      ]
     }
    }
   ]
  }
 },
 "uga": {
  "meta": {
   "origen": "FICTICIO — generado para pruebas; no representa límites reales",
   "version": "ficticia-0.1",
   "fecha_corte": "2026-09-21",
   "crs": "EPSG:4326 (longitud, latitud)"
  },
  "geojson": {
   "type": "FeatureCollection",
   "features": [
    {
     "type": "Feature",
     "properties": {
      "id_uga": "UGA-FIC-01"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.2,
         19.3
        ],
        [
         -99.14,
         19.3
        ],
        [
         -99.14,
         19.38
        ],
        [
         -99.2,
         19.38
        ],
        [
         -99.2,
         19.3
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "id_uga": "UGA-FIC-02"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.14,
         19.3
        ],
        [
         -99.08,
         19.3
        ],
        [
         -99.08,
         19.38
        ],
        [
         -99.14,
         19.38
        ],
        [
         -99.14,
         19.3
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "id_uga": "UGA-FIC-03"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.2,
         19.38
        ],
        [
         -99.14,
         19.38
        ],
        [
         -99.14,
         19.46
        ],
        [
         -99.2,
         19.46
        ],
        [
         -99.2,
         19.38
        ]
       ]
      ]
     }
    },
    {
     "type": "Feature",
     "properties": {
      "id_uga": "UGA-FIC-04"
     },
     "geometry": {
      "type": "Polygon",
      "coordinates": [
       [
        [
         -99.14,
         19.38
        ],
        [
         -99.08,
         19.38
        ],
        [
         -99.08,
         19.46
        ],
        [
         -99.14,
         19.46
        ],
        [
         -99.14,
         19.38
        ]
       ]
      ]
     }
    }
   ]
  }
 }
};
