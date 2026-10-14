# -*- coding: utf-8 -*-
"""Validator for lessons_1_5.json:
1. JSON must parse.
2. Structure checks (tests=8, options=4, vocab>=20, grammar/dialogue present).
3. Korean-intended strings must not contain ASCII letters.
4. Korean segments are cross-checked against the raw textbook text
   (every maximal Hangul run of length >= 2 must occur in the book,
   unless it is in the allowlist of constructed/expected fragments).
"""
import io, json, re, sys, unicodedata

RAW = r"C:\Users\Nurly\lessons_raw.txt"
JF  = r"C:\Users\Nurly\korean_site\content\lessons_1_5.json"

raw = io.open(RAW, encoding="utf-8").read()
# normalize: drop pipe separators, collapse whitespace, drop page headers
norm = raw.replace("|", " ")
norm = re.sub(r"\[pdf \d+\]", " ", norm)
norm = re.sub(r"############.*?############", " ", norm)
norm = re.sub(r"\s+", " ", norm)

def has_ascii(s):
    return bool(re.search(r"[A-Za-z]", s))

HANGUL = re.compile(r"[\uac00-\ud7a3]+")

# fragments that are legitimately NOT in the book (constructed test sentences,
# transliterations used in explanations, names not in book, etc.)
ALLOWED_FRAGMENTS = {
    "______",
}

problems = []

data = json.load(io.open(JF, encoding="utf-8"))

# --- structural checks ---
for i, les in enumerate(data):
    lid = les.get("id")
    if len(les.get("tests", [])) != 8:
        problems.append(f"lesson {lid}: tests != 8 ({len(les.get('tests', []))})")
    if len(les.get("vocabulary", [])) < 20:
        problems.append(f"lesson {lid}: vocabulary < 20 ({len(les.get('vocabulary', []))})")
    if not les.get("grammar"):
        problems.append(f"lesson {lid}: no grammar")
    if not les.get("dialogue", {}).get("lines"):
        problems.append(f"lesson {lid}: no dialogue lines")
    for t in les.get("tests", []):
        if len(t.get("options", [])) != 4:
            problems.append(f"lesson {lid} test qKk={t.get('qKk','')[:30]!r}: options != 4")
        if not (0 <= t.get("answer", -1) <= 3):
            problems.append(f"lesson {lid} test qKk={t.get('qKk','')[:30]!r}: bad answer")
        if not t.get("exKk"):
            problems.append(f"lesson {lid} test qKk={t.get('qKk','')[:30]!r}: no exKk")

def check_korean(path, s):
    if not isinstance(s, str):
        return
    if has_ascii(s):
        problems.append(f"ASCII in {path}: {s!r}")
        return
    # split into hangul runs; check each run against the book
    for run in HANGUL.findall(s):
        if len(run) < 2:
            continue
        if run in norm:
            continue
        # maybe it's a run glued to a particle: try removing a known suffix
        fixed = False
        for suf in ("요", "어요", "아요", "이에요", "예요", "없어요", "있어요",
                    "어요?", "아요?", "이에요?", "예요?", "세요", "세?",
                    "에서", "에게", "에", "은", "는", "이", "가", "도", "와", "하고"):
            core = run
            while core and core.endswith(suf):
                core = core[: -len(suf)]
                if core and len(core) >= 2 and core in norm:
                    fixed = True
                    break
            if fixed:
                break
        if not fixed and run not in ALLOWED_FRAGMENTS:
            problems.append(f"NOT IN BOOK {path}: {run!r}  (in: {s!r})")

for i, les in enumerate(data):
    lid = les["id"]
    for k in ("titleKo",):
        check_korean(f"L{lid}.{k}", les[k])
    for j, w in enumerate(les["vocabulary"]):
        check_korean(f"L{lid}.vocab[{j}].ko", w["ko"])
        for fld in ("kk", "ru"):
            v = w[fld]
            if has_ascii(v):
                problems.append(f"ASCII in L{lid}.vocab[{j}].{fld}: {v!r}")
    for g in les["grammar"]:
        check_korean(f"L{lid}.grammar[{g['pattern'][:12]}].pattern", g["pattern"])
        for e in g["examples"]:
            check_korean(f"L{lid}.grammar[{g['pattern'][:12]}].ex.ko", e["ko"])
    for l in les["dialogue"]["lines"]:
        check_korean(f"L{lid}.dialogue[{l['who']}].ko", l["ko"])
        if has_ascii(l["who"]) and l["who"] not in ("A", "B"):
            problems.append(f"ASCII in who: {l['who']!r}")
    for t in les["tests"]:
        qk = t.get("qKo", "")
        if qk:
            check_korean(f"L{lid}.test({t['qKk'][:20]}).qKo", qk)
        for oi, opt in enumerate(t["options"]):
            if HANGUL.search(opt):
                check_korean(f"L{lid}.test({t['qKk'][:20]}).opt[{oi}]", opt)
            elif has_ascii(opt):
                problems.append(f"ASCII in L{lid} opt: {opt!r}")

with io.open(r"C:\Users\Nurly\korean_site\content\report.txt", "w", encoding="utf-8") as f:
    f.write(f"total problems: {len(problems)}\n")
    for p in problems:
        f.write(p + "\n")
print("done, wrote report.txt")
