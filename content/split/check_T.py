# -*- coding: utf-8 -*-
"""Проверяет файл переводов Txx.json против исходного Lxx.json.
Использование: python -X utf8 check_T.py T01.json L01.json
Завершается с кодом 0 и 'OK' если всё валидно, иначе печатает ошибки.
"""
import json, io, sys

def main():
    tf, lf = sys.argv[1], sys.argv[2]
    T = json.load(io.open(tf, encoding='utf-8'))
    L = json.load(io.open(lf, encoding='utf-8'))
    errs = []

    def pair(p, where):
        if not (isinstance(p, list) and len(p) == 2):
            errs.append('%s: expected [ru, zh] pair, got %r' % (where, type(p).__name__))
            return
        for i, v in enumerate(p):
            if not isinstance(v, str):
                errs.append('%s[%d]: not a string' % (where, i))

    # skills
    s = T.get('skills')
    if not isinstance(s, list) or len(s) != len(L['skillsKk']):
        errs.append('skills: length %s != skillsKk %d' % (len(s) if isinstance(s, list) else s, len(L['skillsKk'])))
    else:
        for i, p in enumerate(s):
            pair(p, 'skills[%d]' % i)
    # vocab
    v = T.get('vocab')
    if not isinstance(v, list) or len(v) != len(L['vocabulary']):
        errs.append('vocab: length %s != vocabulary %d' % (len(v) if isinstance(v, list) else v, len(L['vocabulary'])))
    else:
        for i, z in enumerate(v):
            if not isinstance(z, str) or not z.strip():
                errs.append('vocab[%d]: zh missing/empty (ko=%s)' % (i, L['vocabulary'][i]['ko']))
    # grammar
    g = T.get('grammar')
    if not isinstance(g, list) or len(g) != len(L['grammar']):
        errs.append('grammar: length %s != %d' % (len(g) if isinstance(g, list) else g, len(L['grammar'])))
    else:
        for i, (tg, lg) in enumerate(zip(g, L['grammar'])):
            for f in ('name', 'desc', 'rule'):
                pair(tg.get(f), 'grammar[%d].%s' % (i, f))
            ex = tg.get('examples')
            if not isinstance(ex, list) or len(ex) != len(lg['examples']):
                errs.append('grammar[%d].examples: length %s != %d' % (i, len(ex) if isinstance(ex, list) else ex, len(lg['examples'])))
            else:
                for j, e in enumerate(ex):
                    if not (isinstance(e.get('ru'), str) and e['ru'].strip()) or not (isinstance(e.get('zh'), str) and e['zh'].strip()):
                        errs.append('grammar[%d].examples[%d]: ru/zh missing (ko=%s)' % (i, j, lg['examples'][j]['ko']))
    # dialogue
    d = T.get('dialogue')
    if not isinstance(d, dict):
        errs.append('dialogue: missing')
    else:
        pair(d.get('title'), 'dialogue.title')
        lines = d.get('lines')
        if not isinstance(lines, list) or len(lines) != len(L['dialogue']['lines']):
            errs.append('dialogue.lines: length %s != %d' % (len(lines) if isinstance(lines, list) else lines, len(L['dialogue']['lines'])))
        else:
            for j, e in enumerate(lines):
                if not (isinstance(e.get('ru'), str) and e['ru'].strip()) or not (isinstance(e.get('zh'), str) and e['zh'].strip()):
                    errs.append('dialogue.lines[%d]: ru/zh missing (ko=%s)' % (j, L['dialogue']['lines'][j]['ko']))
    # culture
    c = T.get('culture')
    pair(c, 'culture')
    # tests
    t = T.get('tests')
    if not isinstance(t, list) or len(t) != len(L['tests']):
        errs.append('tests: length %s != %d' % (len(t) if isinstance(t, list) else t, len(L['tests'])))
    else:
        for j, (tt, lt) in enumerate(zip(t, L['tests'])):
            pair(tt.get('q'), 'tests[%d].q' % j)
            pair(tt.get('ex'), 'tests[%d].ex' % j)
            for k in ('optionsRu', 'optionsZh'):
                arr = tt.get(k)
                if not isinstance(arr, list) or len(arr) != len(lt['options']):
                    errs.append('tests[%d].%s: length %s != %d' % (j, k, len(arr) if isinstance(arr, list) else arr, len(lt['options'])))
                else:
                    for o in arr:
                        if not isinstance(o, str) or not o.strip():
                            errs.append('tests[%d].%s: empty option' % (j, k))
    if errs:
        print('FAIL %s:' % tf)
        for e in errs:
            print('  -', e)
        sys.exit(1)
    print('OK %s' % tf)

if __name__ == '__main__':
    main()
