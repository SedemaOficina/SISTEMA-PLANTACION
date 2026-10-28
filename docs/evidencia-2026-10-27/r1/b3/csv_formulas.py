"""B3 · SRP.informes.texto (el CSV de Supervisión) con nombres de jornada que empiezan con = + - @, tabulador, retorno,
espacio o el signo igual de ancho completo, y con acentos. Dice cómo queda la celda «Jornada» de cada uno.
Uso: SRP_BASE=http://127.0.0.1:8131/ python evidencia/b3/csv_formulas.py"""
import os, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SRP_BASE', 'http://127.0.0.1:8131/')
VALS = ['=1+1', '+52 55', '-2+3', '@SUMA(A1)', '\t=1', '\r=1', ' =1', '-12.5', '-99.133', 'Calle Ñandú «Árbol»', '＝1+1']
JS = r"""vals => {
  const fila = v => Object.fromEntries(SRP.informes.COLUMNAS.map(([c]) => [c, c === 'jornada' ? v : '']));
  const t = SRP.informes.texto({ detalle: vals.map(fila) });
  const i = SRP.informes.COLUMNAS.findIndex(([c]) => c === 'jornada');
  return { bom: t.charCodeAt(0) === 0xFEFF, celdas: vals.map(v => [v, SRP.informes.texto({ detalle: [fila(v)] }).split('\r\n')[1].split('","')[i]]) };
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    print(json.dumps(pg.evaluate(JS, VALS), ensure_ascii=False, indent=1))
    b.close()
