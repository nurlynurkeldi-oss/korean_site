# -*- coding: utf-8 -*-
import json, io, sys, unicodedata

def load(p):
    return json.load(io.open(p, encoding='utf-8'))

def is_hangul_only(s):
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return False
    for c in letters:
        o = ord(c)
        if not (0xAC00 <= o <= 0xD7A3 or 0x1100 <= o <= 0x11FF or 0x3130 <= o <= 0x318F):
            return False
    return True

def count_keys(obj):
    if isinstance(obj, dict):
        return sum(1 + count_keys(v) for v in obj.values())
    if isinstance(obj, list):
        return sum(count_keys(v) for v in obj)
    return 0

def check_file(name, orig_path, new_path):
    orig = load(orig_path)
    new = load(new_path)
    problems = []

    # 1. diff: every original value preserved
    def walk(o, n, path='$'):
        if isinstance(o, dict):
            if not isinstance(n, dict):
                problems.append('%s: type mismatch' % path); return
            for k, v in o.items():
                if k not in n:
                    problems.append('%s.%s: MISSING' % (path, k))
                else:
                    walk(v, n[k], '%s.%s' % (path, k))
        elif isinstance(o, list):
            if not isinstance(n, list):
                problems.append('%s: type mismatch' % path); return
            if len(o) != len(n):
                problems.append('%s: len %d != %d' % (path, len(o), len(n)))
            for i, (a, b) in enumerate(zip(o, n)):
                walk(a, b, '%s[%d]' % (path, i))
        else:
            if o != n:
                problems.append('%s: %r != %r' % (path, o, n))
    walk(orig, new)

    # 2. positions of new keys
    def adj(d, newk, afterk, ctx):
        ks = list(d.keys())
        if newk not in ks or afterk not in ks:
            problems.append('%s: key %s missing' % (ctx, newk))
        elif ks.index(newk) != ks.index(afterk) + 1:
            problems.append('%s: %s not right after %s' % (ctx, newk, afterk))

    adj(new, 'skillsRu', 'skillsKk', 'root')
    adj(new, 'skillsZh', 'skillsRu', 'root')
    for i, w in enumerate(new['vocabulary']):
        adj(w, 'zh', 'ru', 'vocab[%d]' % i)
    for i, g in enumerate(new['grammar']):
        for nk, ak in (('nameRu','nameKk'),('nameZh','nameRu'),('descRu','descKk'),('descZh','descRu'),('ruleRu','ruleKk'),('ruleZh','ruleRu')):
            adj(g, nk, ak, 'grammar[%d]' % i)
        for j, e in enumerate(g['examples']):
            adj(e, 'ru', 'kk', 'grammar[%d].ex[%d]' % (i, j))
            adj(e, 'zh', 'ru', 'grammar[%d].ex[%d]' % (i, j))
    adj(new['dialogue'], 'titleRu', 'titleKk', 'dialogue')
    adj(new['dialogue'], 'titleZh', 'titleRu', 'dialogue')
    for i, l in enumerate(new['dialogue']['lines']):
        adj(l, 'ru', 'kk', 'line[%d]' % i)
        adj(l, 'zh', 'ru', 'line[%d]' % i)
    adj(new, 'cultureRu', 'cultureKk', 'root')
    adj(new, 'cultureZh', 'cultureRu', 'root')
    for i, t in enumerate(new['tests']):
        qafter = 'qKo' if 'qKo' in t else 'qKk'
        adj(t, 'qRu', qafter, 'test[%d]' % i)
        adj(t, 'qZh', 'qRu', 'test[%d]' % i)
        adj(t, 'optionsRu', 'options', 'test[%d]' % i)
        adj(t, 'optionsZh', 'optionsRu', 'test[%d]' % i)
        adj(t, 'exRu', 'exKk', 'test[%d]' % i)
        adj(t, 'exZh', 'exRu', 'test[%d]' % i)

    # 3. pure-hangul options must be identical in optionsRu/optionsZh
    for i, t in enumerate(new['tests']):
        for j, op in enumerate(t['options']):
            if is_hangul_only(op):
                if t['optionsRu'][j] != op:
                    problems.append('test[%d].optionsRu[%d]: %r != %r (hangul option)' % (i, j, t['optionsRu'][j], op))
                if t['optionsZh'][j] != op:
                    problems.append('test[%d].optionsZh[%d]: %r != %r (hangul option)' % (i, j, t['optionsZh'][j], op))

    added = count_keys(new) - count_keys(orig)
    status = 'OK' if not problems else 'PROBLEMS'
    print('%s %s (id=%s), added keys: %d' % (status, name, new.get('id'), added))
    for p in problems[:50]:
        print('  -', p)
    return len(problems)

if __name__ == '__main__':
    total = 0
    for n in sys.argv[1:]:
        base = n[1:]
        total += check_file(n, r'C:/Users/Nurly/korean_site/.tmp_backup_split/L' + base + '.orig.json',
                            r'C:/Users/Nurly/korean_site/content/split/L' + base + '.json')
    sys.exit(1 if total else 0)
