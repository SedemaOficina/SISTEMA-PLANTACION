"""Exporta lo que guarda un teléfono de prueba con los datos de demostración cargados: las diez tablas
tal como están en su base (IndexedDB), en un JSON que el servidor carga con «npm run cargar -- app».

Abre la aplicación en un navegador sin ventana, entra con la Administración global de prueba, carga
los datos de demostración y lee cada tabla. Es lo mismo que enviaría un teléfono: sirve para comprobar
que lo que captura la aplicación cabe en la base del servidor. Sólo para la base local de desarrollo:
son datos inventados y el archivo no se sube (servidor/local/ está fuera de git).

Uso:  python herramientas/exportar_datos_app.py
"""
import functools, http.server, json, os, socketserver, threading
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'servidor', 'local', 'datos-app.json')


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def main():
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Silencioso, directory=RAIZ))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:%d/' % srv.server_address[1]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        errores = []
        pg.on('pageerror', lambda e: errores.append(str(e)))
        pg.goto(base); pg.wait_for_timeout(1500)
        pg.select_option('#sel-usuario-prueba', 'u-admin-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_timeout(1200)
        cuenta = pg.evaluate('async () => await SRP.demo.cargar()')
        datos = pg.evaluate("""async () => {
          const r = { exportado_en: new Date().toISOString(), version_app: SRP.CONFIG.VERSION, tablas: {} };
          for (const t of SRP.almacen.ALMACENES) r.tablas[t] = await SRP.almacen.todos(t);
          return r; }""")
        b.close()
    srv.shutdown()
    if errores:
        raise SystemExit('La aplicación dio errores al exportar: %s' % errores[:2])
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as s:
        json.dump(datos, s, ensure_ascii=False)
    print('Demostración: %s' % cuenta)
    print(', '.join('%s %d' % (t, len(v)) for t, v in datos['tablas'].items()))
    print('→ %s (%.1f MB)' % (os.path.relpath(SALIDA, RAIZ), os.path.getsize(SALIDA) / 1e6))


if __name__ == '__main__':
    main()
