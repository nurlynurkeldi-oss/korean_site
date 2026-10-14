/* Koreya Mektebi — app.js */
(function () {
  'use strict';

  /* ================= STATE ================= */
  var LS_KEY = 'koreya_mektebi_v1';
  var state;
  function loadState() {
    var def = { lang: 'kk', theme: 'light', user: { name: '', createdAt: null }, completed: {}, results: {} };
    try {
      var raw = localStorage.getItem(LS_KEY);
      state = raw ? Object.assign(def, JSON.parse(raw)) : def;
    } catch (e) { state = def; }
    if (!state.user) state.user = { name: '', createdAt: null };
    if (!state.completed) state.completed = {};
    if (!state.results) state.results = {};
  }
  function saveState() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  /* ================= I18N ================= */
  function dict() { return (window.I18N && window.I18N[state.lang]) || window.I18N.kk; }
  function t(key) {
    var parts = key.split('.'), d = dict(), v = d;
    for (var i = 0; i < parts.length; i++) { if (v && typeof v === 'object') v = v[parts[i]]; else return key; }
    return typeof v === 'string' ? v : key;
  }
  function tf(key, vars) {
    var s = t(key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  var LANG_SUFFIX = { kk: 'Kk', ru: 'Ru', zh: 'Zh' };
  function suffix() { return LANG_SUFFIX[state.lang] || 'Kk'; }
  function pick(o, base) {
    var v = o[base + suffix()];
    return (v == null || v === '') ? (o[base + 'Kk'] || '') : v;
  }
  function pickArr(o, base) {
    var v = o[base + suffix()];
    return (v && v.length) ? v : (o[base + 'Kk'] || []);
  }
  function pickOpts(tst) {
    var v = tst['options' + suffix()];
    return (v && v.length) ? v : tst.options;
  }
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.documentElement.lang = state.lang;
    document.title = 'Koreya Mektebi — ' + t('appTag');
    document.querySelector('[data-lang-active]');
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === state.lang);
    });
    var icon = state.theme === 'dark' ? '☀️' : '🌙';
    document.getElementById('themeBtn').innerHTML = '<span class="nav-ico">' + icon + '</span><span>' + t('theme') + '</span>';
    document.getElementById('themeBtnTop').textContent = icon;
  }
  function setLang(l) {
    if (!window.I18N[l]) return;
    state.lang = l; saveState(); applyStatic(); render();
  }
  function setTheme(th) {
    state.theme = th; saveState(); applyTheme();
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    var icon = state.theme === 'dark' ? '☀️' : '🌙';
    document.getElementById('themeBtnTop').textContent = icon;
    var tb = document.getElementById('themeBtn');
    if (tb) tb.innerHTML = '<span class="nav-ico">' + icon + '</span><span>' + t('theme') + '</span>';
  }

  /* ================= SPEECH ================= */
  var koVoice = null;
  function pickVoice() {
    var vs = speechSynthesis.getVoices();
    koVoice = vs.filter(function (v) { return /^ko/i.test(v.lang); })[0] || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (koVoice) u.voice = koVoice;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  /* ================= CONTENT HELPERS ================= */
  var ALL_UNITS = [window.CONTENT.alphabet].concat(window.CONTENT.lessons);
  function unit(id) {
    for (var i = 0; i < ALL_UNITS.length; i++) if (ALL_UNITS[i].id === id) return ALL_UNITS[i];
    return null;
  }
  function totalWords() {
    var n = 0;
    ALL_UNITS.forEach(function (u) { n += (u.vocabulary || []).length; });
    return n;
  }
  function stats() {
    var totalUnits = ALL_UNITS.length;
    var doneCount = ALL_UNITS.filter(function (u) { return state.completed[u.id]; }).length;
    var testCount = Object.keys(state.results).length;
    var sum = 0, cnt = 0;
    ALL_UNITS.forEach(function (u) {
      var r = state.results[u.id];
      if (r) { sum += (r.best || 0); cnt++; }
    });
    var avg = cnt ? Math.round(sum / cnt) : 0;
    return { total: totalUnits, done: doneCount, tests: testCount, avg: avg, words: totalWords() };
  }

  /* ================= QUIZ STATE ================= */
  var quiz = null; // {unitId, idx, answers:[], score, finished}

  /* ================= ROUTER ================= */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1] };
  }
  function go(path) { location.hash = '#' + (path[0] === '/' ? '' : '/') + path; }

  function render() {
    var r = parseHash();
    var view = document.getElementById('view');
    var name = r.name, arg = parseInt(r.arg, 10);
    if (name === 'home' || name === '') view.innerHTML = vHome();
    else if (name === 'lessons') view.innerHTML = vLessons();
    else if (name === 'lesson') {
      if (!isNaN(arg) && unit(arg)) view.innerHTML = vLesson(arg);
      else view.innerHTML = vLessons();
    }
    else if (name === 'tests') view.innerHTML = vTests();
    else if (name === 'test') {
      if (!isNaN(arg) && unit(arg)) { view.innerHTML = vQuiz(arg); bindQuiz(arg); }
      else view.innerHTML = vTests();
    }
    else if (name === 'progress') view.innerHTML = vProgress();
    else if (name === 'profile') { view.innerHTML = vProfile(); bindProfile(); }
    else if (name === 'dictionary') { view.innerHTML = vDictionary(); bindDictionary(); }
    else view.innerHTML = vHome();
    applyStatic();
    markNav(r.name === 'lesson' ? 'lessons' : r.name === 'test' ? 'tests' : r.name);
    updateUserChip();
    window.scrollTo(0, 0);
  }
  function markNav(key) {
    document.querySelectorAll('.nav-item[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === key);
    });
  }
  function updateUserChip() {
    var el = document.getElementById('sidebarUser');
    var n = state.user.name;
    el.innerHTML = n
      ? '<span class="user-dot">' + esc(n.charAt(0).toUpperCase()) + '</span><span>' + esc(n) + '</span>'
      : '';
    document.getElementById('topbarBrand').textContent = 'Koreya Mektebi';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ================= VIEWS ================= */
  function vHome() {
    var s = stats();
    var name = state.user.name;
    var welcome = name ? tf('home.welcome', { name: esc(name) }) : t('home.welcomeGuest');
    // next lesson: first not completed
    var next = null;
    ALL_UNITS.forEach(function (u) { if (!next && !state.completed[u.id]) next = u; });
    var continueHtml = '';
    if (next) {
      continueHtml =
        '<div class="card continue-card">' +
          '<div class="lesson-num' + (next.id ? '' : '') + '">' + (next.id || '한') + '</div>' +
          '<div class="cc-info"><b>' + t('home.continue') + ': ' + esc(next.titleKo) + ' · ' + esc(pick(next, 'title')) + '</b>' +
          '<small>' + esc(pickArr(next, 'skills').join(' · ')) + '</small></div>' +
          '<a class="btn" href="#/lesson/' + next.id + '">' + t('lessons.open') + ' →</a>' +
        '</div>';
    } else {
      continueHtml =
        '<div class="card continue-card"><div class="cc-info"><b>' + t('home.allDone') + '</b></div>' +
        '<a class="btn" href="#/tests">' + t('home.toTests') + '</a></div>';
    }
    return '' +
      '<div class="hero"><h1>' + welcome + '</h1><p>' + t('home.sub') + '</p>' +
      '<span class="badge">' + t('home.badge') + '</span></div>' +
      '<div class="stat-row">' +
        '<div class="stat-card blue"><div class="stat-num">' + s.done + ' / ' + s.total + '</div><div class="stat-label">' + t('home.statLessons') + '</div></div>' +
        '<div class="stat-card green"><div class="stat-num">' + s.tests + '</div><div class="stat-label">' + t('home.statTests') + '</div></div>' +
        '<div class="stat-card orange"><div class="stat-num">' + (s.avg ? s.avg + '%' : '—') + '</div><div class="stat-label">' + t('home.statScore') + '</div></div>' +
      '</div>' +
      '<div class="duo">' +
        '<div class="card duo-card"><span class="ico">📚</span><h3>' + t('home.startLearn') + '</h3><p>' + t('home.startLearnDesc') + '</p>' +
          '<a class="btn" href="#/lessons">' + t('home.toLessons') + '</a></div>' +
        '<div class="card duo-card"><span class="ico">✅</span><h3>' + t('home.checkKnow') + '</h3><p>' + t('home.checkKnowDesc') + '</p>' +
          '<a class="btn green" href="#/tests">' + t('home.toTests') + '</a></div>' +
      '</div>' +
      continueHtml;
  }

  function vLessons() {
    var cards = ALL_UNITS.map(function (u) {
      var done = state.completed[u.id];
      var res = state.results[u.id];
      var badge = res
        ? '<span class="badge green">' + t('lessons.best') + ' ' + res.best + '%</span>'
        : (u.id === 0 ? '<span class="badge blue">A–Z</span>' : '<span class="badge blue">' + u.tests.length + ' ✓</span>');
      return '' +
        '<div class="card lesson-card' + (u.id === 0 ? ' alpha-card' : '') + '" onclick="location.hash=\'#/lesson/' + u.id + '\'">' +
          (done ? '<span class="done-mark">✓</span>' : '') +
          '<div class="lc-top"><div class="lesson-num">' + (u.id || '한') + '</div>' +
          '<div><div class="lc-ko ko">' + esc(u.titleKo) + '</div></div></div>' +
          '<div class="lc-kk">' + esc(pick(u, 'title')) + '</div>' +
          '<div class="lc-meta">' +
            (done ? '<span class="badge green">' + t('lessons.completed') + '</span>' : '') +
            badge +
            '<span class="badge orange">' + (u.vocabulary || []).length + ' ' + t('lessons.words') + '</span>' +
          '</div>' +
        '</div>';
    }).join('');
    return '' +
      '<div class="page-head"><h1>' + t('lessons.title') + '</h1><p>' + t('lessons.sub') + '</p></div>' +
      '<div class="lesson-grid">' + cards + '</div>';
  }

  function vLesson(id) {
    var u = unit(id);
    var done = state.completed[id];
    var num = u.id || '한';
    var head =
      '<a class="back-link" href="#/lessons">← ' + t('lesson.back') + '</a>' +
      '<div class="lesson-hero">' +
        '<div class="lesson-num' + (done ? ' done' : '') + '">' + num + '</div>' +
        '<div style="flex:1;min-width:220px"><h1><span class="ko-title ko">' + esc(u.titleKo) + '</span> <span>' + esc(pick(u, 'title')) + '</span></h1>' +
        '<div class="sub">' + (pickArr(u, 'skills').length ? esc(pickArr(u, 'skills').join(' · ')) : '') + '</div></div>' +
        '<div class="actions">' +
          (done
            ? '<span class="badge green" style="padding:8px 14px;font-size:13px">' + t('lesson.done') + '</span>'
            : '<button class="btn secondary sm" onclick="toggleDone(' + u.id + ')">' + t('lesson.markDone') + '</button>') +
          '<a class="btn sm" href="#/test/' + u.id + '">✅ ' + t('lesson.toTest') + '</a>' +
        '</div>' +
      '</div>';

    // alphabet special
    if (u.id === 0) {
      var chart = function (items, showSyll) {
        return items.map(function (v) {
          return '<div class="card" style="padding:12px 14px;text-align:center;min-width:0">' +
            '<div class="ko" style="font-size:24px;font-weight:800">' + esc(v.char) + '</div>' +
            (showSyll ? '<div class="ko" style="font-size:15px;color:var(--primary);font-weight:700">' + esc(v.syll) + '</div>' : '') +
            '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + esc(v.name) + '</div>' +
            '<div style="font-size:11.5px;color:var(--muted)">' + esc(state.lang === 'kk' ? v.pron : String(v.pron).replace(/[Әә]/g, 'ə')) + '</div>' +
            '<button class="speak-btn" style="margin:8px auto 0" onclick="speakWord(\'' + esc(v.syll || v.char) + '\')">🔊</button>' +
          '</div>';
        }).join('');
      };
      var headGrid = 'grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px';
      var vocabWords = (u.vocabulary || []).map(function (w) {
        return '<div class="card vword"><div class="ko"><span>' + esc(w.ko) + '</span>' +
          '<button class="speak-btn" onclick="speakWord(\'' + esc(w.ko) + '\')">🔊</button></div>' +
          '<div class="' + state.lang + '">' + esc(w[state.lang]) + '</div></div>';
      }).join('');
      return head +
        '<div class="card culture-box" style="margin-bottom:6px"><p>' + esc(pick(u, 'info')) + '</p></div>' +
        '<div class="section-title">🔤 ' + t('alphabet.vowels') + ' (10)</div><div class="grid" style="' + headGrid + '">' + chart(u.vowels, true) + '</div>' +
        '<div class="section-title">🔤 ' + t('alphabet.complexVowels') + ' (11)</div><div class="grid" style="' + headGrid + '">' + chart(u.complexVowels, true) + '</div>' +
        '<div class="section-title">🔤 ' + t('alphabet.consonants') + ' (14)</div><div class="grid" style="' + headGrid + '">' + chart(u.consonants, false) + '</div>' +
        '<div class="section-title">🔤 ' + t('alphabet.doubles') + ' (5)</div><div class="grid" style="' + headGrid + '">' + chart(u.doubleConsonants, false) + '</div>' +
        '<div class="section-title">📝 ' + t('alphabet.words') + '</div><div class="vocab-grid">' + vocabWords + '</div>' +
        vVideo(u) + lessonNav(id);
    }

    // regular lesson
    var vocab = (u.vocabulary || []).map(function (w) {
      return '<div class="card vword"><div class="ko"><span>' + esc(w.ko) + '</span>' +
        '<button class="speak-btn" onclick="speakWord(\'' + esc(w.ko) + '\')">🔊</button></div>' +
        '<div class="' + state.lang + '">' + esc(w[state.lang]) + '</div></div>';
    }).join('');

    var grammar = (u.grammar || []).map(function (g) {
      var ex = (g.examples || []).map(function (e) {
        return '<div class="ex-row"><span class="ko">' + esc(e.ko) + '</span><span class="' + state.lang + '">' + esc(e[state.lang]) + '</span>' +
          '<button class="speak-btn" onclick="speakWord(\'' + esc(e.ko).replace(/'/g, '') + '\')">🔊</button></div>';
      }).join('');
      return '<div class="card grammar-block"><h3><span class="pat ko">' + esc(g.pattern) + '</span><span>' + esc(pick(g, 'name')) + '</span></h3>' +
        '<div class="desc">' + esc(pick(g, 'desc')) + '</div>' +
        '<div class="rule">📏 ' + t('lesson.rule') + ': ' + esc(String(pick(g, 'rule')).replace(/^(Қағида|Правило|规则)[:：]\s*/, '')) + '</div>' +
        (ex ? '<div class="examples">' + ex + '</div>' : '') +
      '</div>';
    }).join('');

    var dlg = (u.dialogue && u.dialogue.lines && u.dialogue.lines.length)
      ? '<div class="section-title">💬 ' + t('lesson.dialogue') + (pick(u.dialogue, 'title') ? ' — ' + esc(pick(u.dialogue, 'title')) : '') + '</div>' +
        '<div class="card dialogue-box">' +
        u.dialogue.lines.map(function (l, i) {
          var cls = i % 2 === 0 ? 'a' : 'b';
          return '<div class="dlg-row ' + cls + '"><div class="who">' + esc(l.who) + '</div>' +
            '<div class="dlg-bubble"><div class="ko"><span>' + esc(l.ko) + '</span>' +
            '<button class="speak-btn" onclick="speakWord(\'' + esc(l.ko).replace(/'/g, '') + '\')">🔊</button></div>' +
            '<div class="' + state.lang + '">' + esc(l[state.lang]) + '</div></div></div>';
        }).join('') + '</div>'
      : '';

    var cultureTxt = pick(u, 'culture');
    var culture = cultureTxt
      ? '<div class="section-title">🏮 ' + t('lesson.culture') + '</div><div class="culture-box"><p>' + esc(cultureTxt) + '</p></div>'
      : '';

    return head +
      '<div class="section-title">📖 ' + t('lesson.vocab') + ' <span class="badge orange" style="margin-left:4px">' + (u.vocabulary || []).length + '</span></div>' +
      '<div class="vocab-grid">' + vocab + '</div>' +
      '<div class="section-title">📐 ' + t('lesson.grammar') + ' <span class="badge blue" style="margin-left:4px">' + (u.grammar || []).length + '</span></div>' +
      grammar + dlg + culture + vVideo(u) + lessonNav(id);
  }

  function vVideo(u) {
    var q = encodeURIComponent(u.titleKo + ' Korean lesson');
    return '<div class="section-title">🎬 ' + t('lesson.video') + '</div>' +
      '<div class="card video-box"><div class="vnote">' + t('lesson.videoNote') + '</div><div class="video-links">' +
      '<a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' + q + '">▶ ' + tf('lesson.videoSearch', { q: u.titleKo }) + '</a>' +
      '</div></div>';
  }

  function lessonNav(id) {
    var idx = ALL_UNITS.findIndex(function (x) { return x.id === id; });
    var prev = idx > 0 ? ALL_UNITS[idx - 1] : null;
    var nextU = idx < ALL_UNITS.length - 1 ? ALL_UNITS[idx + 1] : null;
    return '<div class="lesson-nav">' +
      (prev ? '<a class="btn secondary" href="#/lesson/' + prev.id + '">← ' + t('lesson.prev') + ' · ' + esc(pick(prev, 'title')) + '</a>' : '<span></span>') +
      (nextU ? '<a class="btn" href="#/lesson/' + nextU.id + '">' + t('lesson.next') + ' · ' + esc(pick(nextU, 'title')) + ' →</a>' : '<span></span>') +
      '</div>';
  }

  function vTests() {
    var items = ALL_UNITS.map(function (u) {
      var r = state.results[u.id];
      var score = r
        ? '<span class="ti-score">' + t('tests.best') + ': ' + r.best + '% · ' + r.count + ' ' + t('tests.attempts') + '</span>'
        : '<span class="ti-none">—</span>';
      return '<div class="card test-item">' +
        '<div class="lesson-num' + (state.completed[u.id] ? ' done' : '') + '">' + (u.id || '한') + '</div>' +
        '<div class="ti-info"><b>' + esc(u.titleKo) + ' <span style="color:var(--muted);font-weight:500">' + esc(pick(u, 'title')) + '</span></b>' +
        '<small>' + u.tests.length + ' ' + t('tests.qn') + '</small></div>' +
        score +
        '<a class="btn sm' + (r ? ' secondary' : '') + '" href="#/test/' + u.id + '">' + (r ? t('tests.retake') : t('tests.take')) + '</a>' +
      '</div>';
    }).join('');
    return '<div class="page-head"><h1>' + t('tests.title') + '</h1><p>' + t('tests.sub') + '</p></div>' +
      '<div class="test-list">' + items + '</div>';
  }

  /* ================= QUIZ ================= */
  function vQuiz(id) {
    if (!quiz || quiz.unitId !== id) {
      quiz = { unitId: id, idx: 0, answers: [], score: 0, finished: false };
    }
    if (quiz.finished) return vQuizResult();
    var u = unit(id);
    var q = u.tests[quiz.idx];
    var total = u.tests.length;
    var optsList = pickOpts(q);
    var letters = state.lang === 'zh' ? 'ABCD' : 'АБВГ';
    var opts = optsList.map(function (o, i) {
      return '<button class="q-opt" data-i="' + i + '"><span class="letter">' + letters[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');
    return '<div class="quiz-wrap">' +
      '<div class="quiz-top"><span class="qt-title">' + esc(u.titleKo) + ' · ' + esc(pick(u, 'title')) + '</span>' +
      '<span class="badge blue">' + t('tests.question') + ' ' + (quiz.idx + 1) + ' / ' + total + '</span></div>' +
      '<div class="quiz-progress"><span style="width:' + Math.round(quiz.idx / total * 100) + '%"></span></div>' +
      '<div class="card q-card">' +
        '<div class="q-num">' + t('tests.question') + ' ' + (quiz.idx + 1) + ' / ' + total + '</div>' +
        '<div class="q-text">' + esc(pick(q, 'q')) + '</div>' +
        (q.qKo ? '<div class="q-ko ko">' + esc(q.qKo) + '</div>' : '') +
        '<div class="q-options" id="qopts">' + opts + '</div>' +
        '<div class="q-feedback" id="qfb"></div>' +
        '<div class="q-actions"><button class="btn" id="qnext" style="display:none">' +
          (quiz.idx === total - 1 ? t('tests.finish') : t('tests.next')) + ' →</button></div>' +
      '</div></div>';
  }

  function bindQuiz(id) {
    var opts = document.querySelectorAll('#qopts .q-opt');
    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var i = parseInt(btn.getAttribute('data-i'), 10);
        var u = unit(id);
        var q = u.tests[quiz.idx];
        var good = i === q.answer;
        quiz.answers.push(good);
        if (good) quiz.score++;
        opts.forEach(function (b) {
          b.disabled = true;
          var bi = parseInt(b.getAttribute('data-i'), 10);
          if (bi === q.answer) b.classList.add('correct');
          else if (bi === i && !good) b.classList.add('wrong');
        });
        var fb = document.getElementById('qfb');
        fb.className = 'q-feedback show ' + (good ? 'good' : 'bad');
        fb.innerHTML = '<div class="fb-title">' + (good ? t('tests.correct') : tf('tests.wrong', { ans: esc(pickOpts(q)[q.answer]) })) + '</div>' +
          '<div>' + t('tests.explanation') + ': ' + esc(pick(q, 'ex')) + '</div>';
        var nx = document.getElementById('qnext');
        nx.style.display = '';
      });
    });
    var nx = document.getElementById('qnext');
    if (nx) nx.addEventListener('click', function () {
      if (quiz.idx < unit(id).tests.length - 1) {
        quiz.idx++;
        document.getElementById('view').innerHTML = vQuiz(id);
        bindQuiz(id);
        window.scrollTo(0, 0);
      } else {
        finishQuiz(id);
      }
    });
  }

  function finishQuiz(id) {
    quiz.finished = true;
    var u = unit(id);
    var total = u.tests.length;
    var pct = Math.round(quiz.score / total * 100);
    var prev = state.results[id];
    var isBest = !prev || pct > (prev.best || 0);
    state.results[id] = {
      best: prev ? Math.max(prev.best || 0, pct) : pct,
      count: (prev ? prev.count : 0) + 1,
      last: { score: quiz.score, total: total, date: new Date().toISOString(), answers: quiz.answers.slice() }
    };
    // completing a test also marks the lesson as studied
    state.completed[id] = true;
    saveState();
    document.getElementById('view').innerHTML = vQuizResult(pct, isBest);
    applyStatic();
    window.scrollTo(0, 0);
  }

  function vQuizResult(pct, isBest) {
    var u = unit(quiz.unitId);
    if (pct === undefined) {
      var r = state.results[quiz.unitId];
      pct = r ? r.last.score / r.last.total * 100 : 0;
      isBest = false;
    }
    pct = Math.round(pct);
    var emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪';
    return '<div class="quiz-wrap"><div class="card result-card">' +
      '<div class="result-emoji">' + emoji + '</div>' +
      '<div style="font-weight:700;margin-top:6px">' + t('tests.result') + ' · ' + esc(pick(u, 'title')) + '</div>' +
      '<div class="result-score">' + pct + '% <small>/ ' + (state.results[quiz.unitId] ? state.results[quiz.unitId].last.total : '') + '</small></div>' +
      '<div class="result-text">' + tf('tests.resultText', { score: state.results[quiz.unitId] ? state.results[quiz.unitId].last.score : 0, total: state.results[quiz.unitId] ? state.results[quiz.unitId].last.total : 0 }) + '</div>' +
      (isBest ? '<div class="new-best">' + t('tests.newBest') + '</div>' : '') +
      '<div class="result-actions">' +
        '<button class="btn secondary" onclick="location.hash=\'#/test/' + quiz.unitId + '\';setTimeout(function(){location.reload()},0)">' + t('tests.retake') + '</button>' +
        '<a class="btn" href="#/lessons">' + t('tests.backToTests') + '</a>' +
      '</div></div></div>';
  }

  /* ================= PROGRESS ================= */
  function vProgress() {
    var s = stats();
    var pct = Math.round(s.done / s.total * 100);
    var rows = ALL_UNITS.map(function (u) {
      var r = state.results[u.id];
      var done = state.completed[u.id];
      var pill = r
        ? '<span class="score-pill ' + (r.best >= 80 ? 'hi' : r.best >= 50 ? 'mid' : 'lo') + '">' + r.best + '%</span>'
        : '<span style="color:var(--muted);font-size:13px">' + t('progress.notTaken') + '</span>';
      return '<tr><td><span class="l-name"><span class="mini-dot' + (done ? ' done' : '') + '">' + (u.id || '한') + '</span>' +
        esc(u.titleKo) + ' <span style="color:var(--muted);font-weight:400;font-size:12.5px">' + esc(pick(u, 'title')) + '</span></span></td>' +
        '<td>' + pill + '</td>' +
        '<td>' + (r ? r.count : '—') + '</td>' +
        '<td><a href="#/test/' + u.id + '">' + (r ? t('tests.retake') : t('tests.take')) + '</a></td></tr>';
    }).join('');
    var days = countDays();
    return '' +
      '<div class="page-head"><h1>' + t('progress.title') + '</h1><p>' + t('progress.sub') + '</p></div>' +
      '<div class="card progress-hero">' +
        '<div class="ph-top"><b>' + t('progress.overall') + '</b><span>' + pct + '%</span></div>' +
        '<div class="big-bar"><span style="width:' + pct + '%"></span></div>' +
      '</div>' +
      '<div class="stat-row" style="margin-bottom:18px">' +
        '<div class="stat-card blue"><div class="stat-num">' + s.done + ' / ' + s.total + '</div><div class="stat-label">' + t('progress.completedLessons') + '</div></div>' +
        '<div class="stat-card green"><div class="stat-num">' + s.tests + '</div><div class="stat-label">' + t('progress.passedTests') + '</div></div>' +
        '<div class="stat-card orange"><div class="stat-num">' + (s.avg ? s.avg + '%' : '—') + '</div><div class="stat-label">' + t('progress.avgScore') + '</div></div>' +
      '</div>' +
      '<div class="stat-mini" style="margin-bottom:18px">' +
        '<div class="card sm-card"><b>' + s.words + '</b><span>' + t('progress.totalWords') + '</span></div>' +
        '<div class="card sm-card"><b>' + days + '</b><span>' + t('progress.days') + '</span></div>' +
      '</div>' +
      '<div class="card" style="overflow-x:auto"><table class="ptable">' +
        '<thead><tr><th>' + t('progress.perLesson') + '</th><th>' + t('tests.score') + '</th><th>' + t('tests.attempts') + '</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
  }

  function countDays() {
    var days = {};
    Object.keys(state.results).forEach(function (id) {
      var r = state.results[id];
      if (r && r.last && r.last.date) days[r.last.date.slice(0, 10)] = 1;
    });
    return Object.keys(days).length;
  }

  /* ================= PROFILE ================= */
  function vProfile() {
    var s = stats();
    var n = state.user.name;
    var date = state.user.createdAt ? new Date(state.user.createdAt).toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : state.lang === 'zh' ? 'zh-CN' : 'kk-KZ') : '—';
    return '' +
      '<div class="page-head"><h1>' + t('profile.title') + '</h1><p>' + t('profile.sub') + '</p></div>' +
      '<div class="card profile-hero">' +
        '<div class="avatar">' + (n ? esc(n.charAt(0).toUpperCase()) : '?') + '</div>' +
        '<div class="ph-info"><h2>' + (n ? esc(n) : '—') + '</h2><small>' + t('profile.memberSince') + ': ' + esc(date) + '</small>' +
          '<div class="pform">' +
            '<input type="text" id="pname" value="' + esc(n) + '" placeholder="' + esc(t('profile.namePlaceholder')) + '">' +
            '<button class="btn" id="psave">' + t('profile.save') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="stat-mini">' +
        '<div class="card sm-card"><b>' + s.done + ' / ' + s.total + '</b><span>' + t('profile.completed') + '</span></div>' +
        '<div class="card sm-card"><b>' + s.tests + '</b><span>' + t('profile.tests') + '</span></div>' +
        '<div class="card sm-card"><b>' + (s.avg ? s.avg + '%' : '—') + '</b><span>' + t('profile.avg') + '</span></div>' +
        '<div class="card sm-card"><b>' + s.words + '</b><span>' + t('profile.words') + '</span></div>' +
      '</div>' +
      (n ? '' : '<p style="color:var(--muted);font-size:13px;margin-top:14px">💡 ' + t('profile.loginHint') + '</p>') +
      '<div class="danger-zone"><p>⚠️ ' + t('profile.reset') + ':</p>' +
        '<button class="btn danger sm" id="preset">' + t('profile.reset') + '</button>' +
        '<button class="btn secondary sm" id="pcancel">' + t('profile.cancel') + '</button>' +
      '</div>';
  }
  function bindProfile() {
    var save = document.getElementById('psave');
    if (save) save.addEventListener('click', function () {
      var inp = document.getElementById('pname');
      var v = inp.value.trim();
      state.user.name = v;
      if (v && !state.user.createdAt) state.user.createdAt = new Date().toISOString();
      saveState(); render();
    });
    var preset = document.getElementById('preset');
    if (preset) preset.addEventListener('click', function () {
      if (confirm(t('profile.resetConfirm'))) {
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
        location.hash = '#/home';
        location.reload();
      }
    });
    var pcancel = document.getElementById('pcancel');
    if (pcancel) pcancel.addEventListener('click', function () { preset.style.opacity = '0.5'; });
  }

  /* ================= DICTIONARY ================= */
  function vDictionary() {
    var total = totalWords();
    var rows = '';
    ALL_UNITS.forEach(function (u) {
      (u.vocabulary || []).forEach(function (w) {
        rows += '<div class="card dict-item" data-text="' + esc((w.ko + ' ' + w.kk + ' ' + w.ru + ' ' + (w.zh || '')).toLowerCase()) + '">' +
          '<span class="d-ko ko">' + esc(w.ko) + '</span>' +
          '<button class="speak-btn" onclick="speakWord(\'' + esc(w.ko) + '\')">🔊</button>' +
          '<span class="d-kk">' + esc(w[state.lang]) + '</span>' +
          '<span class="badge blue" style="flex:none">' + (u.id === 0 ? '한글' : u.id) + '</span>' +
        '</div>';
      });
    });
    return '<div class="page-head"><h1>' + t('dictionary.title') + '</h1><p>' + tf('dictionary.total', { n: total }) + '</p></div>' +
      '<div class="dict-search"><span class="s-ico">🔍</span><input type="text" id="dictq" placeholder="' + esc(t('dictionary.search')) + '"></div>' +
      '<div class="grid" id="dictlist" style="gap:10px">' + rows + '</div>';
  }
  function bindDictionary() {
    var inp = document.getElementById('dictq');
    if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      document.querySelectorAll('#dictlist .dict-item').forEach(function (el) {
        var txt = el.getAttribute('data-text');
        el.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
      });
    });
  }

  /* ================= GLOBAL ACTIONS ================= */
  window.speakWord = function (w) { speak(w); };
  window.toggleDone = function (id) {
    if (state.completed[id]) delete state.completed[id];
    else state.completed[id] = true;
    saveState(); render();
  };

  /* ================= BOOT ================= */
  function boot() {
    loadState();
    applyTheme();
    applyStatic();
    document.getElementById('themeBtn').addEventListener('click', function () {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('themeBtnTop').addEventListener('click', function () {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    // mobile nav
    var sb = document.getElementById('sidebar');
    var bd = document.getElementById('backdrop');
    document.getElementById('navOpen').addEventListener('click', function () {
      sb.classList.add('open'); bd.classList.add('show');
    });
    function closeNav() { sb.classList.remove('open'); bd.classList.remove('show'); }
    document.getElementById('navClose').addEventListener('click', closeNav);
    bd.addEventListener('click', closeNav);
    document.querySelectorAll('.nav-item[data-route]').forEach(function (a) { a.addEventListener('click', closeNav); });
    window.addEventListener('hashchange', render);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
