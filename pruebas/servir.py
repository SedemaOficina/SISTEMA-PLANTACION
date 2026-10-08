"""Sirve la aplicación para las pruebas en http://127.0.0.1:8099/.

`python -m http.server` deja sólo 5 conexiones en espera. Al abrir, la aplicación pide unos 55 archivos a la
vez; en Windows las conexiones que no caben se rechazan, y si la rechazada era la del mapa la página queda
sin él («L is not defined»). Las fallas así eran intermitentes y no de la aplicación. Este servidor admite
256 en espera y atiende cada petición en su propio hilo.

Uso, desde la carpeta del proyecto:  python pruebas/servir.py
"""
import functools
import http.server
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Servidor(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Peticion(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


if __name__ == '__main__':
    Servidor(('127.0.0.1', 8099), functools.partial(Peticion, directory=RAIZ)).serve_forever()
