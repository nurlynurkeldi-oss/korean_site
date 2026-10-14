# -*- coding: utf-8 -*-
"""Слияние: split/Lxx.json (оригинал) + split/Txx.json (переводы) -> split/Lxx.json.
Оригинальные поля НИКОГДА не изменяются — только вставляются новые ключи.
Использование: python -X utf8 merge_translations.py
"""
import json, io, copy, os, sys

BASE = r'C:\Users\Nurly\korean_site\content\split'

def insert_after(d, after_key, new_kv):
    """Вставляет пары new_kv в словарь d сразу после ключа after_key (порядок сохраняется)."""
    out = {}
    done = False
    for k, v in d.items():
        out[k] = v
        if k == after_key and not done:
            for nk, nv in new_kv:
                out[nk] = nv
            done = True
    if not done:
        for nk, nv in new_kv:
            out[nk] = nv
    return out

def merge_one(i):
    lf = '%s/L%02d.json' % (BASE, i)
    tf = '%s/T%02d.json' % (BASE, i)
    L = json.load(io.open(lf, encoding='utf-8'))
    T = json.load(io.open(tf, encoding='utf-8'))
    D = copy.deepcopy(L)

    # skills
    D = insert_after(D, 'skillsKk', [
        ('skillsRu', [p[0] for p in T['skills']]),
        ('skillsZh', [p[1] for p in T['skills']]),
    ])
    # vocabulary
    vocab = []
    for w, z in zip(D['vocabulary'], T['vocab']):
        ww = dict(w)
        ww['zh'] = z
        vocab.append(ww)
    D['vocabulary'] = vocab
    # grammar
    gram = []
    for g, tg in zip(D['grammar'], T['grammar']):
        gg = dict(g)
        gg = insert_after(gg, 'nameKk', [('nameRu', tg['name'][0]), ('nameZh', tg['name'][1])])
        gg = insert_after(gg, 'descKk', [('descRu', tg['desc'][0]), ('descZh', tg['desc'][1])])
        gg = insert_after(gg, 'ruleKk', [('ruleRu', tg['rule'][0]), ('ruleZh', tg['rule'][1])])
        exs = []
        for e, te in zip(gg['examples'], tg['examples']):
            ee = dict(e)
            ee['ru'] = te['ru']
            ee['zh'] = te['zh']
            exs.append(ee)
        gg['examples'] = exs
        gram.append(gg)
    D['grammar'] = gram
    # dialogue
    dlg = dict(D['dialogue'])
    dlg = insert_after(dlg, 'titleKk', [('titleRu', T['dialogue']['title'][0]), ('titleZh', T['dialogue']['title'][1])])
    lines = []
    for l, tl in zip(dlg['lines'], T['dialogue']['lines']):
        ll = dict(l)
        ll['ru'] = tl['ru']
        ll['zh'] = tl['zh']
        lines.append(ll)
    dlg['lines'] = lines
    D['dialogue'] = dlg
    # culture
    D = insert_after(D, 'cultureKk', [('cultureRu', T['culture'][0]), ('cultureZh', T['culture'][1])])
    # tests
    tests = []
    for t, tt in zip(D['tests'], T['tests']):
        tt2 = dict(t)
        anchor = 'qKo' if 'qKo' in tt2 else 'qKk'
        tt2 = insert_after(tt2, anchor, [('qRu', tt['q'][0]), ('qZh', tt['q'][1])])
        tt2 = insert_after(tt2, 'options', [('optionsRu', tt['optionsRu']), ('optionsZh', tt['optionsZh'])])
        tt2 = insert_after(tt2, 'exKk', [('exRu', tt['ex'][0]), ('exZh', tt['ex'][1])])
        tests.append(tt2)
    D['tests'] = tests

    with io.open(lf, 'w', encoding='utf-8') as out:
        out.write(json.dumps(D, ensure_ascii=False, indent=2))
    return D

def main():
    missing = []
    for i in range(1, 16):
        tf = '%s/T%02d.json' % (BASE, i)
        if not os.path.exists(tf):
            missing.append('T%02d' % i)
    if missing:
        print('Missing translation files:', ', '.join(missing))
        sys.exit(1)
    for i in range(1, 16):
        merge_one(i)
        print('merged L%02d' % i)
    print('ALL MERGED')

if __name__ == '__main__':
    main()
