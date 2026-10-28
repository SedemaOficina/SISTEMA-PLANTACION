import json, collections, sys, os
ruta = sys.argv[1]
d = json.load(open(ruta, encoding='utf-8'))
c = collections.Counter(); out = []
for f in d:
    for m in f['messages']:
        sev = 'error' if m['severity'] == 2 else 'aviso'
        c[(sev, m.get('ruleId'))] += 1
        rel = os.path.relpath(f['filePath'], 'C:/sia-rev/tmp/aud1027/r1')
        out.append('%s:%s:%s %s %s %s' % (rel, m['line'], m.get('column'), sev, m.get('ruleId'), m['message']))
print(len(d), 'archivos'); print(dict(c))
open(ruta.replace('.json', '.txt'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('\n'.join(out))
