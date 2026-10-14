// Print visible text of zh/ru #/tests and #/lesson/1 for a final visual check
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const BASE = 'C:/Users/Nurly/korean_site';
const i18nSrc = fs.readFileSync(path.join(BASE, 'js/i18n.js'), 'utf-8');
const contentSrc = fs.readFileSync(path.join(BASE, 'js/content.js'), 'utf-8');
const appSrc = fs.readFileSync(path.join(BASE, 'js/app.js'), 'utf-8');
function makeEl(id) { return { id, innerHTML: '', textContent: '', classList: { toggle() {}, add() {}, remove() {} }, getAttribute() { return null; }, addEventListener() {}, style: {}, setAttribute() {} }; }
function boot(lang, hash) {
  const els = {};
  const store = { koreya_mektebi_v1: JSON.stringify({ lang, theme: 'light', user: { name: 'Nurly', createdAt: '2026-01-01' }, completed: { 0: true, 1: true }, results: { 0: { best: 88, count: 2, last: { score: 7, total: 8, date: '2026-01-02', answers: [] } } } }) };
  const sandbox = { console, Object, Math, JSON, Date, RegExp, String, Number, Array, encodeURIComponent, parseInt, isNaN,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    location: { hash }, confirm: () => true };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.document = { readyState: 'complete', documentElement: { lang: '', setAttribute() {} }, querySelectorAll: () => [], querySelector: () => null, getElementById: (id) => (els[id] = els[id] || makeEl(id)), addEventListener: () => {} };
  sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {}; sandbox.scrollTo = () => {};
  vm.createContext(sandbox);
  vm.runInContext(i18nSrc, sandbox); vm.runInContext(contentSrc, sandbox); vm.runInContext(appSrc, sandbox);
  return els['view'].innerHTML;
}
const text = (h) => h.replace(/<[^>]+>/g, ' | ').replace(/\|+/g, ' | ').trim();
console.log('=========== ZH #/tests ===========');
console.log(text(boot('zh', '#/tests')).slice(0, 900));
console.log('\n=========== RU #/tests (top) ===========');
console.log(text(boot('ru', '#/tests')).slice(0, 600));
console.log('\n=========== ZH #/lesson/1 (head + vocab + grammar) ===========');
console.log(text(boot('zh', '#/lesson/1')).slice(0, 1200));
console.log('\n=========== ZH #/test/0 (quiz) ===========');
console.log(text(boot('zh', '#/test/0')).slice(0, 700));
