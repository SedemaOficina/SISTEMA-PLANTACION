"""Sirve la aplicación para las pruebas en http://127.0.0.1:8099/, y reenvía /api/ al servicio local.

`python -m http.server` deja sólo 5 conexiones en espera. Al abrir, la aplicación pide unos 55 archivos a la
vez; en Windows las conexiones que no caben se rechazan, y si la rechazada era la del mapa la página queda
sin él («L is not defined»). Las fallas así eran intermitentes y no de la aplicación. Este servidor admite
256 en espera y atiende cada petición en su propio hilo.

Lo que va a /api/ lo reenvía al servicio del SRP que corre en esta computadora (`npm run iniciar`, en
servidor/), como lo hace el servidor web del SIA: la aplicación y su servicio quedan en el mismo sitio y la
cookie de la sesión funciona igual que allá. Si el servicio no está corriendo, responde 502, y la aplicación
lo trata como falta de conexión.

Uso, desde la carpeta del proyecto:  python pruebas/servir.py [puerto] [--api http://127.0.0.1:3100]
"""
import argparse
import functools
import http.client
import http.server
import os
import urllib.parse

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Lo que pasa del navegador al servicio y del servicio al navegador; lo demás es de cada conexión
PASAN = {'content-type', 'cookie', 'user-agent', 'accept'}
NO_REGRESAN = {'transfer-encoding', 'connection', 'keep-alive', 'content-length'}


class Servidor(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Peticion(http.server.SimpleHTTPRequestHandler):
    api = 'http://127.0.0.1:3100'

    def log_message(self, *a):
        pass

    def responder(self, estado, cuerpo, tipo='application/json; charset=utf-8'):
        self.send_response(estado)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(cuerpo)

    def reenviar(self):
        destino = urllib.parse.urlsplit(self.api)
        largo = int(self.headers.get('Content-Length') or 0)
        cuerpo = self.rfile.read(largo) if largo else None
        cabeceras = {k: v for k, v in self.headers.items() if k.lower() in PASAN}
        cabeceras['X-Forwarded-For'] = self.client_address[0]
        try:
            c = http.client.HTTPConnection(destino.hostname, destino.port, timeout=60)
            c.request(self.command, self.path, body=cuerpo, headers=cabeceras)
            r = c.getresponse()
            datos = r.read()
            c.close()
        except OSError:
            return self.responder(502, '{"codigo":"SIN_SERVICIO","mensaje":"El servicio local no está corriendo: npm run iniciar, en servidor/."}'.encode('utf-8'))
        self.send_response(r.status)
        for k, v in r.getheaders():
            if k.lower() not in NO_REGRESAN:
                self.send_header(k, v)
        self.send_header('Content-Length', str(len(datos)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(datos)

    def de_la_api(self):
        return self.path.startswith('/api/')

    def do_GET(self):
        if self.de_la_api():
            return self.reenviar()
        super().do_GET()

    def do_HEAD(self):
        if self.de_la_api():
            return self.reenviar()
        super().do_HEAD()

    def escribir(self):
        if self.de_la_api():
            return self.reenviar()
        self.responder(405, b'{"codigo":"NO_PERMITIDO"}')

    do_POST = do_PUT = do_DELETE = escribir


if __name__ == '__main__':
    a = argparse.ArgumentParser(description='Sirve la aplicación y reenvía /api/ al servicio local.')
    a.add_argument('puerto', nargs='?', type=int, default=8099)
    a.add_argument('--api', default='http://127.0.0.1:3100', help='dónde corre el servicio del SRP')
    args = a.parse_args()
    Peticion.api = args.api
    Servidor(('127.0.0.1', args.puerto), functools.partial(Peticion, directory=RAIZ)).serve_forever()
