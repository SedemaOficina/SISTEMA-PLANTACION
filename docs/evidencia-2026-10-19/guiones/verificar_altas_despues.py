"""Bloque 3 del plan (1.0.3): las mismas pruebas V2 y V3 de verificar_altas.py, repetidas sobre el código corregido.
V2 (E3-R4-02): las dos Administraciones que se desactivan una a la otra son, mientras dura la prueba, las únicas
activas; así «las dos inactivas» es «el sistema sin nadie». V3 (E3-R4-01): dos cargas del mismo archivo, intercaladas.
Usa el entorno de verificar_altas.py (servicio 3130, cuentas aud.*)."""
import threading
import verificar_altas as v

def v2(intentos=8):
    A2 = {'id': 'a0d10000-0000-4000-8000-0000000000a2', 'correo': 'aud.adm2@ejemplo.local', 'nombre': 'Auditoria Adm Dos', 'perfil': 'ADMIN', 'organizacion_id': 'o-sedema', 'clave': v.CLAVE}
    A3 = {'id': 'a0d10000-0000-4000-8000-0000000000a3', 'correo': 'aud.adm3@ejemplo.local', 'nombre': 'Auditoria Adm Tres', 'perfil': 'ADMIN', 'organizacion_id': 'o-sedema', 'clave': v.CLAVE}
    v.apoyo('preparar', {'cuentas': [A2, A3]})
    dos = [A2['id'], A3['id']]
    otras = [r['id'] for r in v.sql("SELECT id FROM srp.usuarios WHERE perfil = 'ADMIN' AND activo AND id <> ALL($1::uuid[])", [dos])]
    ninguna = 0; respuestas = []
    try:
        v.sql("UPDATE srp.usuarios SET activo = false WHERE id = ANY($1::uuid[]) RETURNING id", [otras])
        for k in range(intentos):
            v.sql("UPDATE srp.usuarios SET activo = true WHERE id = ANY($1::uuid[]) RETURNING id", [dos])
            s2, s3 = v.Sesion(A2['correo']), v.Sesion(A3['correo'])
            barrera = threading.Barrier(2); res = {}
            def golpe(s, otra, nombre):
                barrera.wait(); e, d = s.pedir('POST', '/cuentas/%s/estado' % otra, {'activo': False}); res[nombre] = (e, (d or {}).get('codigo'))
            t = [threading.Thread(target=golpe, args=(s2, A3['id'], 'a2')), threading.Thread(target=golpe, args=(s3, A2['id'], 'a3'))]
            [x.start() for x in t]; [x.join() for x in t]
            activas = v.sql("SELECT count(*)::int AS n FROM srp.usuarios WHERE perfil = 'ADMIN' AND activo", [])[0]['n']
            if activas == 0: ninguna += 1
            respuestas.append(tuple(sorted(res.values(), key=str)))
    finally:
        v.sql("UPDATE srp.usuarios SET activo = true WHERE id = ANY($1::uuid[]) RETURNING id", [otras + dos])
    return ['V2 después: con esas dos como las únicas activas, el sistema quedó sin ninguna %d de %d veces · respuestas: %s'
            % (ninguna, intentos, sorted(set(respuestas), key=str)), 'V2: %d Administraciones desactivadas mientras tanto y reactivadas al final' % len(otras)], dos

if __name__ == '__main__':
    s, ids = v2(); [print(l) for l in s]
    for linea in v.v3(): print(linea)
    print('cuentas extra:', ids)
