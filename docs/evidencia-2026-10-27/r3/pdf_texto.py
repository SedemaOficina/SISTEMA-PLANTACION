"""r3 · Saca el texto y los metadatos de un PDF a un .txt en UTF-8. Uso: python -I pdf_texto.py <pdf>"""
import sys, pypdf
r = pypdf.PdfReader(sys.argv[1]); out = open(sys.argv[1][:-4] + '.txt', 'w', encoding='utf-8')
out.write('paginas %d\n%s\n' % (len(r.pages), dict(r.metadata or {})))
for i, p in enumerate(r.pages): out.write('--- pag %d\n%s\n' % (i + 1, p.extract_text()))
