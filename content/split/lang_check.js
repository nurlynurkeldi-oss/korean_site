// Simulates booting the site in Node for each language x route and checks the rendered #view HTML.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const BASE = 'C:/Users/Nurly/korean_site';
const i18nSrc = fs.readFileSync(path.join(BASE, 'js/i18n.js'), 'utf-8');
const contentSrc = fs.readFileSync(path.join(BASE, 'js/content.js'), 'utf-8');
const appSrc = fs.readFileSync(path.join(BASE, 'js/app.js'), 'utf-8');

function makeEl(id) {
  return {
    id, innerHTML: '', textContent: '', value: '',
    classList: { toggle() {}, add() {}, remove() {} },
    getAttribute() { return null; },
    addEventListener() {},
    style: {},
    setAttribute() {},
  };
}

function boot(lang, hash) {
  const els = {};
  const listeners = {};
  const store = {};
  store.koreya_mektebi_v1 = JSON.stringify({ lang, theme: 'light', user: { name: 'Nurly', createdAt: '2026-01-01' }, completed: { 0: true, 1: true }, results: { 0: { best: 88, count: 2, last: { score: 7, total: 8, date: '2026-01-02', answers: [] } } } });
  const sandbox = {
    console,
    Object, Math, JSON, Date, RegExp, String, Number, Array, encodeURIComponent, parseInt, isNaN,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    location: { hash },
    confirm: () => true,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = {
    readyState: 'complete',
    documentElement: { lang: '', setAttribute() {} },
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: (id) => (els[id] = els[id] || makeEl(id)),
    addEventListener: () => {},
  };
  sandbox.addEventListener = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  sandbox.removeEventListener = () => {};
  sandbox.scrollTo = () => {};
  vm.createContext(sandbox);
  vm.runInContext(i18nSrc, sandbox, { filename: 'i18n.js' });
  vm.runInContext(contentSrc, sandbox, { filename: 'content.js' });
  vm.runInContext(appSrc, sandbox, { filename: 'app.js' });
  return { html: els['view'] ? els['view'].innerHTML : '', sandbox, listeners };
}

const KZ_ONLY = /[әғқңөұүіһӘҒҚҢӨҰҮІҺ]/g;
const CYRILLIC = /[а-яА-ЯёЁ]/g;

const routes = ['#/home', '#/lessons', '#/lesson/0', '#/lesson/1', '#/lesson/7', '#/tests', '#/test/1', '#/test/0', '#/progress', '#/dictionary', '#/profile'];

let failures = 0;
const counts = {};
const stripDataAttrs = (s) => s.replace(/\sdata-[a-z]+="[^"]*"/g, '');
for (const lang of ['kk', 'ru', 'zh']) {
  for (const r of routes) {
    const { html } = boot(lang, r);
    const visible = stripDataAttrs(html);
    counts[lang + ' ' + r] = html.length;
    const tag = lang + ' ' + r;
    if (!html || html.length < 200) { console.log('FAIL', tag, '- view is empty/tiny'); failures++; continue; }
    if (lang === 'zh') {
      const m = visible.match(CYRILLIC);
      if (m) { console.log('FAIL', tag, '- Cyrillic leaked into zh:', visible.slice(Math.max(0, visible.search(CYRILLIC) - 40), visible.search(CYRILLIC) + 40).replace(/\n/g, ' ')); failures++; }
    }
    if (lang === 'ru') {
      const m = visible.match(KZ_ONLY);
      if (m) { console.log('FAIL', tag, '- Kazakh letters leaked into ru:', visible.slice(Math.max(0, visible.search(KZ_ONLY) - 40), visible.search(KZ_ONLY) + 40).replace(/\n/g, ' ')); failures++; }
    }
    if (lang === 'kk' && (r === '#/tests' || r === '#/lessons')) {
      if (!KZ_ONLY.test(html)) { console.log('FAIL', tag, '- Kazakh content missing (control check)'); failures++; }
    }
  }
}

// spot checks for expected translations
function expect(lang, route, needle, label) {
  const { html } = boot(lang, route);
  if (!html.includes(needle)) { console.log('FAIL spot', lang, route, label, '- missing:', needle); failures++; }
}
expect('zh', '#/tests', '韩文', 'hangul title zh');
expect('zh', '#/tests', '道题', 'q count zh');
expect('zh', '#/lessons', '韩文', 'lessons zh');
expect('zh', '#/lesson/1', '学生', 'vocab zh (학생)');
expect('ru', '#/tests', 'Хангыль', 'hangul title ru');
expect('ru', '#/lesson/1', 'студент', 'vocab ru (학생)');
expect('kk', '#/tests', 'Хангыль әліпбиі', 'hangul title kk');
const zhQuiz = boot('zh', '#/test/1').html;
if (!/class="letter">A</.test(zhQuiz)) { console.log('FAIL spot zh quiz - letter A not used'); failures++; }

console.log('---');
console.log(failures === 0 ? 'ALL LANGUAGE CHECKS PASSED' : failures + ' FAILURES');
console.log('view sizes (lang route: len):');
for (const k of Object.keys(counts)) console.log('  ', k, counts[k]);
process.exit(failures === 0 ? 0 : 1);
