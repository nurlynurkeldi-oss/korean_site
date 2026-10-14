# -*- coding: utf-8 -*-
"""Финальная проверка: оригинальные поля не изменены + новые ru/zh поля есть во всём."""
import io, json, re, sys, zipfile

ZIP = r'C:\Users\Nurly\korean_site\KoreyaMektebi-site.zip'
NEW = r'C:\Users\Nurly\korean_site\js\content.js'

def parse_content_js(text):
    m = re.match(r'window\.CONTENT = (\{.*\});\s*$', text, re.S)
    assert m, 'cannot find window.CONTENT in file'
    return json.loads(m.group(1))

z = zipfile.ZipFile(ZIP)
orig_text = z.read('js/content.js').decode('utf-8')
ORIG = parse_content_js(orig_text)
NEWC = parse_content_js(io.open(NEW, encoding='utf-8').read())

errs = []

def cmp_orig(d, o, path):
    """Все ключи из оригинала должны быть идентичны."""
    if isinstance(o, dict):
        if not isinstance(d, dict):
            errs.append('%s: type changed' % path); return
        for k, ov in o.items():
            if k not in d:
                errs.append('%s.%s: MISSING (was deleted!)' % (path, k))
            else:
                cmp_orig(d[k], ov, path + '.' + k)
    elif isinstance(o, list):
        if not isinstance(d, list) or len(d) != len(o):
            errs.append('%s: list len changed (%s vs %s)' % (path, len(d) if isinstance(d, list) else type(d).__name__, len(o)))
            return
        for i, (x, y) in enumerate(zip(d, o)):
            cmp_orig(x, y, '%s[%d]' % (path, i))
    else:
        if d != o:
            errs.append('%s: VALUE CHANGED\n  OLD: %r\n  NEW: %r' % (path, o, d))

# 1) оригинальные поля неизменны
cmp_orig(NEWC['alphabet'], ORIG['alphabet'], 'alphabet')
for lo in ORIG['lessons']:
    ln = next((x for x in NEWC['lessons'] if x['id'] == lo['id']), None)
    if ln is None:
        errs.append('lesson %s: missing entirely!' % lo['id']); continue
    cmp_orig(ln, lo, 'lesson %s' % lo['id'])

# 2) новые поля присутствуют и параллельны
def chk(cond, msg):
    if not cond: errs.append(msg)

units = [NEWC['alphabet']] + NEWC['lessons']
for u in units:
    uid = u['id']
    def msg(m): return 'unit %s: %s' % (uid, m)
    chk(u.get('skillsRu') and u.get('skillsZh') and len(u['skillsRu']) == len(u.get('skillsKk', [])) == len(u['skillsZh']) and all(u['skillsRu']) and all(u['skillsZh']), msg('skills ru/zh'))
    for i, w in enumerate(u.get('vocabulary') or []):
        chk(bool((w.get('zh') or '').strip()), msg('vocab[%d].zh' % i))
    if uid == 0:
        chk(bool((u.get('infoRu') or '').strip()) and bool((u.get('infoZh') or '').strip()), msg('info ru/zh'))
    else:
        for i, g in enumerate(u.get('grammar') or []):
            for k in ('nameRu', 'nameZh', 'descRu', 'descZh', 'ruleRu', 'ruleZh'):
                chk(bool((g.get(k) or '').strip()), msg('grammar[%d].%s' % (i, k)))
            for j, e in enumerate(g.get('examples') or []):
                chk(bool((e.get('ru') or '').strip()) and bool((e.get('zh') or '').strip()), msg('grammar[%d].ex[%d] ru/zh' % (i, j)))
        dlg = u.get('dialogue') or {}
        chk(('titleRu' in dlg) and ('titleZh' in dlg), msg('dialogue title ru/zh'))
        for j, l in enumerate(dlg.get('lines') or []):
            chk(bool((l.get('ru') or '').strip()) and bool((l.get('zh') or '').strip()), msg('dialogue[%d] ru/zh' % j))
        chk(bool((u.get('cultureRu') or '').strip()) and bool((u.get('cultureZh') or '').strip()), msg('culture ru/zh'))
    for j, t in enumerate(u.get('tests') or []):
        chk(bool((t.get('qRu') or '').strip()) and bool((t.get('qZh') or '').strip()), msg('test[%d] q ru/zh' % j))
        chk(bool((t.get('exRu') or '').strip()) and bool((t.get('exZh') or '').strip()), msg('test[%d] ex ru/zh' % j))
        chk(isinstance(t.get('optionsRu'), list) and isinstance(t.get('optionsZh'), list)
            and len(t['optionsRu']) == len(t['options']) == len(t['optionsZh'])
            and all(t['optionsRu']) and all(t['optionsZh']), msg('test[%d] options ru/zh' % j))
        chk(0 <= t.get('answer', -1) < len(t['options']), msg('test[%d] answer index' % j))
    # 3) корректность ответа: правильный вариант во всех языках одинаковый
    for j, t in enumerate(u.get('tests') or []):
        a = t.get('answer')
        kk = t['options'][a]
        ru = t['optionsRu'][a]
        zh = t['optionsZh'][a]
        is_plain = bool(re.fullmatch(r'[\d\s:%\[\]а-яА-ЯёЁ]*|[\uac00-\ud7a3]*', kk))
        if not is_plain:
            # для текстовых вариантов допускаем, что ru/zh переведены — но они должны быть непустыми и отличаться от других вариантов
            chk(ru not in t['optionsRu'][:a] + t['optionsRu'][a+1:], msg('test[%d] optionsRu[%d] duplicates another option' % (j, a)))
            chk(zh not in t['optionsZh'][:a] + t['optionsZh'][a+1:], msg('test[%d] optionsZh[%d] duplicates another option' % (j, a)))

print('UNITS CHECKED: %d (alphabet + %d lessons)' % (len(units), len(NEWC['lessons'])))
if errs:
    print('PROBLEMS: %d' % len(errs))
    for e in errs[:60]:
        print(' -', e)
    sys.exit(1)
print('ALL CHECKS PASSED: original fields intact, all ru/zh fields present and consistent')
