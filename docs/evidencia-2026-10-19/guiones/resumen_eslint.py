import json, collections, os, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
c = collections.Counter(); ej = collections.defaultdict(list)
for f in d:
    rel = os.path.relpath(f['filePath'], sys.argv[2]).replace(os.sep, '/')
    for m in f['messages']:
        k = (m.get('ruleId'), m['severity']); c[k] += 1
        if len(ej[k]) < 6: ej[k].append('%s:%s %s' % (rel, m['line'], m['message'][:110]))
print('archivos', len(d), 'errores', sum(f['errorCount'] for f in d), 'avisos', sum(f['warningCount'] for f in d))
for k, n in c.most_common():
    print(n, k)
    for e in ej[k]: print('   ', e)
