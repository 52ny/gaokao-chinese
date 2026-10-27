/* 拾文 · 高三语文刷题站 —— 应用主逻辑 */
(function () {
  'use strict';

  /* ================= 数据整理 ================= */
  var KD = window.YW_KNOWLEDGE || { chapters: [], points: [] };
  var CH = (KD.chapters || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  var KP = KD.points || [];
  var CHMAP = {}, KMAP = {};
  CH.forEach(function (c) { CHMAP[c.id] = c; });
  KP.forEach(function (k) { KMAP[k.id] = k; });

  var EKEY = 'yw.ext.v1';
  var EXTP = [];
  try {
    var extRaw = JSON.parse(localStorage.getItem(EKEY) || '[]');
    if (Array.isArray(extRaw)) {
      EXTP = extRaw.filter(function (p) {
        return p && p.id && Array.isArray(p.questions) && p.questions.length;
      }).map(function (p) {
        p.kind = 'ext';
        p.region = p.region || '外部题库';
        p.title = p.title || p.id;
        p.short = p.short || p.title;
        p.materials = p.materials || {};
        return p;
      });
    }
  } catch (e) { EXTP = []; }

  var PAPERS = (window.YW_PAPERS || []).concat(EXTP).sort(function (a, b) {
    if ((a.year || 0) !== (b.year || 0)) return (b.year || 0) - (a.year || 0);
    return String(a.id).localeCompare(String(b.id));
  });
  PAPERS.forEach(function (p) {
    p.questions = (p.questions || []).slice().sort(function (a, b) { return a.no - b.no; });
    p.total = p.questions.reduce(function (s, q) { return s + (q.score || 0); }, 0);
    p.materials = p.materials || {};
    p.questions.forEach(function (q) {
      q.paperId = p.id;
      q.qid = p.id + '-' + q.no;
      q.year = p.year;
      q.region = p.region;
      q.kind = p.kind;
      q.section = q.section || '综合';
      q.source = q.source || (p.short + ' · 第 ' + q.no + ' 题' + (p.kind === 'mock' ? '（模拟）' : p.kind === 'ext' ? '（导入）' : ''));
      q.paperTitle = p.title;
      q.isQ19 = false;
      q.isExtra = false;
      var mat = p.materials[q.material];
      q.materialText = mat ? (mat.title || '') + '\n\n' + (mat.text || '') : '';
      q.materialTitle = mat ? (mat.title || '阅读材料') : '';
    });
  });

  var QS = [];
  PAPERS.forEach(function (p) { p.questions.forEach(function (q) { QS.push(q); }); });

  var EXTRA = (window.YW_Q19_EXTRA || []).map(function (q, i) {
    q.qid = q.id || ('extra-' + i);
    q.paperId = 'extra';
    q.year = q.year || 0;
    q.region = q.region || '语用专项';
    q.kind = 'drill';
    q.drill = true;
    q.no = i + 1;
    q.isQ19 = false;
    q.isExtra = true;
    q.section = q.section || '语言文字运用';
    q.source = q.source || ('语用专项 · 第 ' + (i + 1) + ' 题');
    q.paperTitle = '语用专项题';
    return q;
  });
  EXTRA.forEach(function (q) { QS.push(q); });

  var DRILL = (window.YW_DRILL || []).map(function (q, i) {
    q.qid = q.id || ('drill-' + i);
    q.paperId = 'drill';
    q.year = 0;
    q.region = '专项母题';
    q.kind = 'drill';
    q.no = i + 1;
    q.isQ19 = false;
    q.drill = true;
    q.section = q.module || '综合';
    q.source = '专项母题 · ' + (q.module || '综合');
    q.paperTitle = '专项母题集';
    return q;
  });
  DRILL.forEach(function (q) { QS.push(q); });

  var QMAP = {};
  QS.forEach(function (q) { QMAP[q.qid] = q; });

  var MEMO = window.YW_MEMO || { tips: [], cards: [] };
  MEMO.tips = MEMO.tips || [];
  MEMO.cards = MEMO.cards || [];

  function pointsOfChapter(cid) { return KP.filter(function (k) { return k.chapter === cid; }); }
  function knowledgeOf(q) { return (q.knowledge || []).map(function (id) { return KMAP[id]; }).filter(Boolean); }
  function questionsOfKnowledge(kid) { return QS.filter(function (q) { return (q.knowledge || []).indexOf(kid) >= 0; }); }
  function questionsOfChapter(cid) {
    var ids = pointsOfChapter(cid).map(function (k) { return k.id; });
    return QS.filter(function (q) { return (q.knowledge || []).some(function (k) { return ids.indexOf(k) >= 0; }); });
  }
  function isMock(q) { return q.kind === 'mock' || q.kind === 'drill'; }

  /* ================= 本地状态 ================= */
  var KEY = 'yw.state.v1';
  var state = { attempts: {}, fav: {}, theme: 'light', examDate: '2027-06-07', pomo: { focus: 25, short: 5, long: 15 }, papers: {}, memo: { known: {}, read: {} } };
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (raw && typeof raw === 'object') {
      state.attempts = raw.attempts || {};
      state.fav = raw.fav || {};
      state.theme = raw.theme || 'light';
      state.examDate = raw.examDate || '2027-06-07';
      state.pomo = raw.pomo || state.pomo;
      state.papers = raw.papers || {};
      state.memo = raw.memo || state.memo;
    }
  } catch (e) { /* ignore */ }
  var saveTimer = null;
  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }, 220);
  }
  function attempt(qid) { return state.attempts[qid] || null; }
  function isSolved(a) { return a && (a.status === 'correct' || a.status === 'selfA'); }

  var TKEY = 'yw.time.v1';
  var timeData = { days: {}, logs: [] };
  try {
    var traw = JSON.parse(localStorage.getItem(TKEY) || '{}');
    if (traw && typeof traw === 'object') {
      timeData.days = traw.days || {};
      timeData.logs = traw.logs || [];
    }
  } catch (e) { /* ignore */ }
  var timeSaveTimer = null;
  function saveTime() {
    clearTimeout(timeSaveTimer);
    timeSaveTimer = setTimeout(function () {
      try { localStorage.setItem(TKEY, JSON.stringify(timeData)); } catch (e) { /* ignore */ }
    }, 320);
  }
  function dayKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function dayRec(key) {
    key = key || dayKey();
    if (!timeData.days[key]) timeData.days[key] = { online: 0, focus: 0, pomos: 0, tips: 0 };
    return timeData.days[key];
  }
  function addOnline(sec) {
    var r = dayRec();
    r.online = (r.online || 0) + sec;
    saveTime();
  }
  function addFocus(sec, pomo) {
    var r = dayRec();
    r.focus = (r.focus || 0) + sec;
    if (pomo) r.pomos = (r.pomos || 0) + 1;
    saveTime();
  }
  function fmtMin(sec) {
    var m = Math.round((sec || 0) / 60);
    if (m < 60) return m + ' 分钟';
    return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';
  }
  function fmtHMS(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return (h ? p(h) + ':' : '') + p(m) + ':' + p(s);
  }

  /* ================= 基础工具 ================= */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function rich(s) {
    return esc(s).replace(/\n/g, '<br>');
  }
  function plain(s) { return String(s == null ? '' : s); }
  function mdToHtml(src) {
    var text = esc(src).replace(/\r\n/g, '\n');
    var lines = text.split('\n');
    var out = [];
    var list = null;
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
    lines.forEach(function (line) {
      var t = line.trim();
      if (!t) { closeList(); return; }
      var m;
      if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
        closeList();
        var lv = m[1].length <= 2 ? 3 : 4;
        out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>');
        return;
      }
      if ((m = t.match(/^[-*]\s+(.*)$/))) {
        if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
        out.push('<li>' + inline(m[1]) + '</li>');
        return;
      }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
        if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
        out.push('<li>' + inline(m[1]) + '</li>');
        return;
      }
      closeList();
      out.push('<p>' + inline(t) + '</p>');
    });
    closeList();
    return out.join('');
  }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function scrollTop() { window.scrollTo(0, 0); }
  function beep() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 720; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
      o.start(); o.stop(ctx.currentTime + 1.15);
    } catch (e) { /* 浏览器限制音频 */ }
  }

  /* ================= 判分 ================= */
  function normText(s) {
    return String(s == null ? '' : s)
      .replace(/\s+/g, '')
      .replace(/[，。；：、！？…—·“”‘’"'（）()《》〈〉,.;:!?\-]/g, '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 65248); })
      .toLowerCase();
  }
  function gradeSingle(q, input) {
    if (!String(input || '').trim()) return 'wrong';
    var a = String(q.answer || '').toUpperCase();
    return a.indexOf(String(input).trim().toUpperCase()) >= 0 ? 'correct' : 'wrong';
  }
  function gradeBlank(q, input) {
    var parts = String(input || '').split('\n');
    var blanks = q.blanks && q.blanks.length ? q.blanks : [{ answer: q.answer || '', accept: [] }];
    var right = 0;
    for (var i = 0; i < blanks.length; i++) {
      var val = normText(parts[i] || '');
      if (!val) continue;
      var target = normText(blanks[i].answer || '');
      var ok = val === target;
      if (!ok && blanks[i].accept) {
        ok = blanks[i].accept.some(function (x) { return normText(x) === val; });
      }
      if (ok) right++;
    }
    if (right === blanks.length) return 'correct';
    if (right > 0) return 'partial';
    return 'wrong';
  }
  function grade(q, input) {
    if (q.type === 'single') return gradeSingle(q, input);
    if (q.type === 'multiple') {
      var a = String(input || '').toUpperCase().split('').filter(function (c) { return /[A-Z]/.test(c); }).sort().join('');
      var ans = String(q.answer || '').toUpperCase().split('').filter(function (c) { return /[A-Z]/.test(c); }).sort().join('');
      if (!a) return 'wrong';
      if (a === ans) return 'correct';
      if (a.split('').every(function (c) { return ans.indexOf(c) >= 0; })) return 'partial';
      return 'wrong';
    }
    if (q.type === 'blank') return gradeBlank(q, input);
    return 'attempted';
  }
  function statusText(a) {
    if (!a) return '未做';
    return { correct: '正确', partial: '部分正确', wrong: '错误', selfA: '自评：会', selfB: '自评：半懂', selfC: '自评：不会', attempted: '已作答' }[a.status] || '已作答';
  }
  function statusClass(a) {
    if (!a) return '';
    if (a.status === 'correct' || a.status === 'selfA') return 'ok';
    if (a.status === 'partial' || a.status === 'selfB' || a.status === 'attempted') return 'warn';
    return 'err';
  }
  function isWrong(a) { return a && (a.status === 'wrong' || a.status === 'partial' || a.status === 'selfB' || a.status === 'selfC'); }
  function setAttempt(qid, patch) {
    var old = state.attempts[qid] || {};
    Object.keys(patch).forEach(function (k) { old[k] = patch[k]; });
    old.ts = Date.now();
    state.attempts[qid] = old;
    saveState();
  }

  /* ================= 进度 ================= */
  function progress() {
    var real = QS.filter(function (q) { return q.kind === 'real' || q.kind === 'mock'; });
    var done = 0, right = 0, wrong = 0, tried = 0;
    real.forEach(function (q) {
      var a = attempt(q.qid);
      if (a) tried++;
      if (isSolved(a)) right++;
      if (isWrong(a)) wrong++;
    });
    var kDone = 0;
    KP.forEach(function (k) {
      if (questionsOfKnowledge(k.id).some(function (q) { return isSolved(attempt(q.qid)); })) kDone++;
    });
    return { total: real.length, right: right, wrong: wrong, tried: tried, pct: real.length ? Math.round(right / real.length * 100) : 0, kDone: kDone };
  }
  function paperStat(p) {
    var rec = state.papers[p.id] || {};
    var ans = rec.answers || {};
    var answered = p.questions.filter(function (q) { return ans[q.no] != null && String(ans[q.no]).trim() !== ''; }).length;
    return { answered: answered, total: p.questions.length, submitted: !!rec.submitted, score: rec.score };
  }
  function streak() {
    var n = 0;
    for (var i = 0; i < 400; i++) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var r = timeData.days[dayKey(d)];
      if (r && ((r.focus || 0) > 60 || (r.online || 0) > 60)) n++;
      else if (i > 0) break;
    }
    return n;
  }
  function daysToExam() {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var e = new Date(state.examDate + 'T00:00:00');
    return Math.round((e - t) / 86400000);
  }
  function typeLabel(t) {
    return { single: '单项选择', multiple: '多项选择', blank: '默写填空', subjective: '主观简答', essay: '作文', solve: '解答' }[t] || t;
  }
  function diffDots(n) {
    n = Math.max(1, Math.min(5, n || 3));
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '●' : '○';
    return '<span class="diff">' + s + '</span>';
  }
  function timeHint(q) {
    if (q.type === 'essay') return '建议 50 分钟';
    if (q.type === 'subjective') return q.score >= 8 ? '建议 8-10 分钟' : q.score >= 6 ? '建议 6-8 分钟' : '建议 4-6 分钟';
    return '建议 2-3 分钟';
  }
  function pctOf(a, b) { return b ? Math.round(a / b * 100) : 0; }

  /* ================= 番茄钟 ================= */
  var PKEY = 'yw.pomo.v1';
  var pomo = { mode: 'focus', remain: 25 * 60, running: false, endAt: 0, cycles: 0 };
  try {
    var praw = JSON.parse(localStorage.getItem(PKEY) || '{}');
    if (praw && praw.mode) pomo = praw;
  } catch (e) { /* ignore */ }
  function pomoSave() { try { localStorage.setItem(PKEY, JSON.stringify(pomo)); } catch (e) { /* ignore */ } }
  function pomoDuration(mode) {
    var m = mode === 'short' ? state.pomo.short : mode === 'long' ? state.pomo.long : state.pomo.focus;
    return (m || 25) * 60;
  }
  function pomoRemain() {
    if (pomo.running && pomo.endAt) return Math.max(0, (pomo.endAt - Date.now()) / 1000);
    return pomo.remain != null ? pomo.remain : pomoDuration(pomo.mode);
  }
  function pomoRender() {
    var mini = document.getElementById('pomo-mini-time');
    if (mini) mini.textContent = fmtHMS(pomoRemain()).replace(/^00:/, '');
    var t = document.getElementById('pomo-time');
    if (t) t.textContent = fmtHMS(pomoRemain());
    var modeEl = document.getElementById('pomo-mode-label');
    if (modeEl) modeEl.textContent = { focus: '专注中', short: '短休息', long: '长休息' }[pomo.mode];
    var ring = document.getElementById('pomo-ring-arc');
    if (ring) {
      var total = pomoDuration(pomo.mode);
      var pct = Math.max(0, Math.min(1, pomoRemain() / total));
      ring.setAttribute('stroke-dasharray', (pct * 213) + ' 213');
    }
    var btn = document.getElementById('pomo-main-btn');
    if (btn) btn.textContent = pomo.running ? '暂停' : '开始';
    var miniBtn = document.getElementById('pomo-mini');
    if (miniBtn) miniBtn.classList.toggle('running', !!pomo.running);
    Array.prototype.forEach.call(document.querySelectorAll('.pomo-modes button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-mode') === pomo.mode);
    });
  }
  function pomoStart() {
    if (pomo.running) {
      pomo.remain = pomoRemain();
      pomo.running = false; pomo.endAt = 0;
    } else {
      if (!pomo.remain || pomo.remain <= 0) pomo.remain = pomoDuration(pomo.mode);
      pomo.endAt = Date.now() + pomo.remain * 1000;
      pomo.running = true;
    }
    pomoSave(); pomoRender();
  }
  function pomoReset() {
    pomo.running = false; pomo.endAt = 0; pomo.remain = pomoDuration(pomo.mode);
    pomoSave(); pomoRender();
  }
  function pomoSetMode(mode) {
    pomo.mode = mode; pomo.running = false; pomo.endAt = 0; pomo.remain = pomoDuration(mode);
    pomoSave(); pomoRender();
  }
  function pomoComplete() {
    pomo.running = false; pomo.endAt = 0;
    if (pomo.mode === 'focus') {
      addFocus(pomoDuration('focus'), true);
      pomo.cycles = (pomo.cycles || 0) + 1;
      pomo.mode = pomo.cycles % 4 === 0 ? 'long' : 'short';
      toast('完成一个番茄，去休息一下');
    } else {
      pomo.mode = 'focus';
      toast('休息结束，开始下一个专注');
    }
    pomo.remain = pomoDuration(pomo.mode);
    beep(); pomoSave(); pomoRender();
    if (location.hash.indexOf('#/stats') === 0 || location.hash.indexOf('#/home') === 0) route(false);
  }
  function tickPomo() {
    if (pomo.running && pomoRemain() <= 0) pomoComplete();
    pomoRender();
  }
  function pomoWidgetHtml() {
    return '<div id="pomo-widget" hidden><div class="pomo-head" data-act="pomo-collapse">' +
      '<span class="pomo-dot"></span><b>番茄钟</b><button class="ph-x" aria-label="收起">✕</button></div>' +
      '<div class="pomo-body"><div class="pomo-ring"><svg width="86" height="86"><circle class="bg" cx="43" cy="43" r="34" fill="none" stroke="#e7efed" stroke-width="6"></circle>' +
      '<circle id="pomo-ring-arc" cx="43" cy="43" r="34" fill="none" stroke="#5f7d7a" stroke-width="6" stroke-linecap="round" stroke-dasharray="213 213"></circle></svg>' +
      '<div class="rt" id="pomo-time">25:00</div></div>' +
      '<div class="pomo-mode" id="pomo-mode-label">专注中</div>' +
      '<div class="pomo-modes"><button data-act="pomo-mode" data-mode="focus">专注</button><button data-act="pomo-mode" data-mode="short">短休</button><button data-act="pomo-mode" data-mode="long">长休</button></div>' +
      '<div class="pomo-actions"><button class="btn primary" id="pomo-main-btn" data-act="pomo-start">开始</button><button class="btn ghost" data-act="pomo-reset">重置</button></div>' +
      '<div class="pomo-foot">每 4 个番茄一次长休 · 自动记入专注时长</div></div></div>';
  }
  function mountPomo() {
    if (!document.getElementById('pomo-widget')) {
      var d = document.createElement('div');
      d.innerHTML = pomoWidgetHtml();
      document.body.appendChild(d.firstChild);
    }
    pomoRender();
  }

  /* ================= 在线时间 ================= */
  var lastTick = Date.now();
  function tickOnline() {
    var now = Date.now();
    if (document.visibilityState === 'visible' && now - lastTick < 4000) addOnline(1);
    lastTick = now;
  }
  document.addEventListener('visibilitychange', function () { lastTick = Date.now(); });

  /* ================= 阅读材料 ================= */
  function passageHtml(key, p, forceOpen) {
    if (!key || !p || !p.materials || !p.materials[key]) return '';
    var m = p.materials[key];
    var body = String(m.text || '');
    var paras = body.split(/\n+/).filter(function (x) { return x.trim(); }).map(function (x) {
      return '<p>' + esc(x) + '</p>';
    }).join('');
    var long = body.length > 760;
    var clip = long && !forceOpen;
    return '<div class="passage' + (clip ? ' clipped' : '') + '" data-passage="' + key + '">' +
      '<div class="passage-title">' + esc(m.title || '阅读材料') + '</div>' +
      '<div class="passage-body">' + paras + '</div>' +
      (long ? '<div class="passage-fold"><button class="passage-toggle" data-act="passage-toggle">' + (clip ? '展开全文 ↓' : '收起 ↑') + '</button></div>' : '') +
      '</div>';
  }

  /* ================= 题目组件 ================= */
  function getInput(q) {
    var rec = state.papers[q.paperId];
    if (rec && rec.answers && rec.answers[q.no] != null) return rec.answers[q.no];
    var a = attempt(q.qid);
    return a && a.input != null ? a.input : '';
  }
  function saveInput(qid, val) {
    var q = QMAP[qid];
    if (!q) return;
    var rec = state.papers[q.paperId];
    if (rec) {
      if (!rec.answers) rec.answers = {};
      rec.answers[q.no] = val;
    }
    var a = state.attempts[qid] || {};
    a.input = val;
    state.attempts[qid] = a;
    saveState();
  }
  function optionsHtml(q, picked, showResult) {
    picked = String(picked || '').toUpperCase();
    var ans = String(q.answer || '').toUpperCase();
    return '<div class="options">' + (q.options || []).map(function (o) {
      var on = picked.indexOf(o.k) >= 0;
      var cls = on ? ' on' : '';
      if (showResult) {
        if (ans.indexOf(o.k) >= 0) cls = ' right';
        else if (on) cls = ' wrong';
        else cls = '';
      }
      return '<button type="button" class="opt' + cls + '" data-act="opt" data-qid="' + q.qid + '" data-key="' + o.k + '">' +
        '<span class="k">' + o.k + '</span><span>' + rich(o.t) + '</span></button>';
    }).join('') + '</div>';
  }
  function blanksHtml(q, picked) {
    var vals = String(picked || '').split('\n');
    var blanks = q.blanks && q.blanks.length ? q.blanks : [{ answer: q.answer || '' }];
    return '<div class="blank-lines">' + blanks.map(function (b, i) {
      return '<div class="blank-line"><span class="bn">（' + (i + 1) + '）</span>' +
        '<input data-blank="' + q.qid + '" data-idx="' + i + '" value="' + esc(vals[i] || '') + '" placeholder="' + esc(b.placeholder || '写出这一空') + '"></div>';
    }).join('') + '</div>';
  }
  function answerAreaHtml(q, mode) {
    var picked = getInput(q);
    var disabled = mode === 'review';
    var exam = mode === 'exam';
    if (q.type === 'single' || q.type === 'multiple') {
      return optionsHtml(q, picked, mode === 'review');
    }
    if (q.type === 'blank') {
      return '<div' + (disabled ? ' style="pointer-events:none;opacity:.85"' : '') + '>' + blanksHtml(q, picked) + '</div>' +
        (!exam ? '<div class="answer-row"><button class="btn sm primary" data-act="submit" data-qid="' + q.qid + '">提交默写</button>' +
          '<span class="small muted">按空给分，写错别字不得分</span></div>' : '');
    }
    if (q.type === 'essay') {
      var len = String(picked || '').replace(/\s/g, '').length;
      return '<textarea class="textarea essay-area" data-fill="' + q.qid + '" placeholder="在这里写作文。建议先花 8 分钟列提纲：中心论点 → 三个分论点 → 每段一个论据。"' + (disabled ? ' disabled' : '') + '>' + esc(picked) + '</textarea>' +
        '<div class="essay-meta"><span>已写 <b id="wc-' + q.qid + '">' + len + '</b> 字（不少于 800 字）</span><span>60 分</span></div>' +
        (!exam ? '<div class="essay-prompts">' +
          '<button data-act="essay-insert" data-qid="' + q.qid + '" data-tpl="par">插入并列式提纲</button>' +
          '<button data-act="essay-insert" data-qid="' + q.qid + '" data-tpl="prog">插入递进式提纲</button>' +
          '<button data-act="essay-insert" data-qid="' + q.qid + '" data-tpl="contrast">插入对比式提纲</button></div>' : '') +
        (!exam ? '<div class="answer-row"><button class="btn sm primary" data-act="submit" data-qid="' + q.qid + '">保存作文</button><span class="small muted">保存后自评，或让 AI 批改</span></div>' : '');
    }
    return '<textarea class="textarea" data-fill="' + q.qid + '" placeholder="写下你的答案。主观题请分点：①……②……③……，每点先写术语，再引原文。"' + (disabled ? ' disabled' : '') + '>' + esc(picked) + '</textarea>' +
      (!exam ? '<div class="answer-row"><button class="btn sm primary" data-act="submit" data-qid="' + q.qid + '">提交答案</button>' +
        '<button class="btn sm ghost" data-act="show-solution" data-qid="' + q.qid + '">先看解析</button>' +
        '<span class="small muted">主观题按采分点自评</span></div>' : '');
  }
  function selfCheckHtml(qid, current) {
    return '<div class="self-check"><span class="small muted">自评得分：</span>' +
      [['A', '会（满分）'], ['B', '半懂（一半）'], ['C', '不会']].map(function (x) {
        var cls = current === 'self' + x[0] ? ' class="on"' : '';
        return '<button data-act="self" data-qid="' + qid + '" data-v="' + x[0] + '"' + cls + '>' + x[1] + '</button>';
      }).join('') + '</div>';
  }
  function hintsHtml(q) {
    var hs = q.hints || [];
    if (!hs.length) return '';
    return '<div class="hint-box" data-role="hint" hidden><b>提示阶梯</b><ol>' +
      hs.map(function (h) { return '<li>' + rich(h) + '</li>'; }).join('') + '</ol></div>';
  }
  function solutionHtml(q) {
    var sol = q.solution || [];
    var ans = q.answer || '';
    if (q.type === 'blank' && q.blanks) {
      ans = q.blanks.map(function (b, i) { return '（' + (i + 1) + '）' + b.answer; }).join('　');
    }
    return '<div class="solution"><h4>参考答案与解析</h4>' +
      (ans ? '<div class="answer-final" style="border-top:none;padding-top:0"><b>参考答案：</b>' + rich(ans) + '</div>' : '') +
      (sol.length ? sol.map(function (s, i) {
        return '<div class="sol-step"><span class="n">' + (i + 1) + '</span><div>' + rich(s) + '</div></div>';
      }).join('') : '') +
      ((q.pitfalls || []).length ? '<div style="margin-top:10px"><b class="small">常见失分点</b><ul class="pitfall-list">' +
        q.pitfalls.map(function (p) { return '<li>' + rich(p) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</div>';
  }
  function rewardHtml(q) {
    if (!q.takeaway) return '';
    return '<div class="reward"><div class="r-title">练有所获 · 一句话方法</div><p>' + rich(q.takeaway) + '</p></div>';
  }
  function feedbackHtml(q, a) {
    if (!a || !a.status) return '';
    if (q.type === 'subjective' || q.type === 'essay') {
      if (a.status === 'attempted') return '<div class="fb"><span>✎</span><div>答案已保存。请对照参考答案自评，或点下面的「AI 批改」。主观题的分是自己挣来的，自评要诚实。</div></div>';
      var map = { selfA: ['ok', '自评“会”：答案踩到了主要采分点，继续保持分点作答。'], selfB: ['warn', '自评“半懂”：答到了方向但缺术语或文本依据，回到知识点补一层。'], selfC: ['err', '自评“不会”：先看提示阶梯，再对照解析找采分点，然后重做一次。'] };
      var m = map[a.status] || ['warn', '已记录。'];
      return '<div class="fb ' + m[0] + '"><span>' + (m[0] === 'ok' ? '✓' : m[0] === 'err' ? '✕' : '△') + '</span><div>' + m[1] + '</div></div>';
    }
    if (a.status === 'correct') return '<div class="fb ok"><span>✓</span><div>正确。确认一下你是“知道为什么对”，而不是“刚好选对”。</div></div>';
    if (a.status === 'partial') return '<div class="fb warn"><span>△</span><div>部分正确：有采分点答对了，但还有空或要点缺失。参考答案见下方。</div></div>';
    return '<div class="fb err"><span>✕</span><div>答案不对，已记入错题本。先别急着看解析，用提示阶梯再想 30 秒。</div></div>';
  }
  function localDiagnosisHtml(q) {
    var kn = knowledgeOf(q);
    return '<div style="margin-top:10px">' +
      (kn.length ? '<p><b>知识点层：</b></p><ul class="k-list">' + kn.map(function (k) {
        return '<li><b>' + esc(k.title) + '</b> —— ' + rich(k.summary || '') + '</li>';
      }).join('') + '</ul>' : '') +
      '<p><b>真题层：</b></p><ul class="k-list">' +
      (q.hints || []).map(function (h) { return '<li>' + rich(h) + '</li>'; }).join('') +
      (q.takeaway ? '<li>一句话方法：' + rich(q.takeaway) + '</li>' : '') + '</ul>' +
      '<p><b>练有所获：</b>' + rich(q.takeaway || '先回知识点，再做一道同类题。') + '</p></div>';
  }
  function aiPanelHtml(q) {
    var isEssay = q.type === 'essay';
    var isSubj = q.type === 'subjective' || isEssay;
    return '<div class="ai-panel" data-ai="' + q.qid + '">' +
      '<div class="ai-head" data-act="ai-toggle" data-qid="' + q.qid + '"><span class="ai-dot"></span><b>AI 卡壳诊断</b>' +
      '<span class="small">' + (isEssay ? '作文批改' : isSubj ? '按采分点批改' : '知识点层 / 真题层') + '</span></div>' +
      '<div class="ai-body"><textarea class="textarea" id="ai-work-' + q.qid + '" placeholder="' + (isEssay ? '把作文粘贴到这里，或直接点“AI 批改作文”。' : isSubj ? '写下你的答案或思路，AI 会对照采分点批改。' : '写下你卡在哪一步：读不懂哪句？排除了哪两个选项？为什么犹豫？') + '"></textarea>' +
      '<div class="btn-row" style="margin-top:8px">' +
      (isEssay ? '<button class="btn sm primary" data-act="ai-essay" data-qid="' + q.qid + '">AI 批改作文</button>' : '') +
      '<button class="btn sm' + (isEssay ? '' : ' primary') + '" data-act="ai-diagnose" data-qid="' + q.qid + '">诊断卡在哪</button>' +
      (isSubj && !isEssay ? '<button class="btn sm" data-act="ai-grade" data-qid="' + q.qid + '">按采分点批改</button>' : '') +
      '<span class="small muted">未填 Key 会先用内置免费通道</span></div>' +
      '<div class="ai-output" id="ai-out-' + q.qid + '"></div>' +
      '<div class="ai-meta" id="ai-meta-' + q.qid + '"></div></div></div>';
  }
  function questionCard(q, mode) {
    mode = mode || 'practice';
    var a = attempt(q.qid);
    var showResult = mode === 'review';
    var showAI = mode !== 'exam';
    var foot;
    if (mode === 'exam') {
      foot = '<div class="qfoot"><span class="small">' + timeHint(q) + ' · ' + (q.score || 0) + ' 分</span>' +
        '<div class="qactions"><button class="hint-btn" data-act="hint" data-qid="' + q.qid + '">卡住了？看提示</button></div></div>' + hintsHtml(q);
    } else {
      foot = '<div class="qfoot"><span class="small">' + (a ? statusText(a) : timeHint(q)) + '</span>' +
        '<div class="qactions"><button class="hint-btn" data-act="hint" data-qid="' + q.qid + '">提示阶梯</button>' +
        '<button class="hint-btn" data-act="show-solution" data-qid="' + q.qid + '">参考解析</button>' +
        '<button class="hint-btn" data-act="fav" data-qid="' + q.qid + '">' + (state.fav[q.qid] ? '★ 已收藏' : '☆ 收藏') + '</button></div></div>' +
        hintsHtml(q) +
        '<div data-role="fb">' + feedbackHtml(q, a) + '</div>' +
        (q.type === 'subjective' || q.type === 'essay' ? '<div data-role="self">' + selfCheckHtml(q.qid, a && a.status) + '</div>' : '') +
        (q.takeaway ? '<div data-role="reward">' + rewardHtml(q) + '</div>' : '') +
        '<div data-role="sol" ' + (showResult ? '' : 'hidden') + '>' + solutionHtml(q) + '</div>' +
        (showAI ? aiPanelHtml(q) : '');
    }
    return '<article class="qcard" id="card-' + q.qid + '" data-qid="' + q.qid + '">' +
      '<div class="qhead"><div class="qno">第 ' + q.no + ' 题</div>' +
      '<div class="qmeta"><span class="badge type">' + typeLabel(q.type) + '</span><span class="badge">' + (q.score || 0) + ' 分</span>' + diffDots(q.difficulty) + '</div></div>' +
      (q.skill ? '<div class="stem-note"><span class="tip-chip">技巧</span> ' + rich(q.skill) + '</div>' : '') +
      '<div class="qstem">' + rich(q.stem) + '</div>' +
      answerAreaHtml(q, mode) + foot + '</article>';
  }
  function findCard(qid) { return document.getElementById('card-' + qid); }
  function refreshCard(q, mode) {
    var card = findCard(q.qid);
    if (!card) return;
    var a = attempt(q.qid);
    var fb = card.querySelector('[data-role="fb"]');
    if (fb) fb.innerHTML = feedbackHtml(q, a);
    var self = card.querySelector('[data-role="self"]');
    if (self) self.innerHTML = selfCheckHtml(q.qid, a && a.status);
    var reward = card.querySelector('[data-role="reward"]');
    if (reward && a && a.status) reward.innerHTML = rewardHtml(q);
    var box = card.querySelector('.options');
    if (box && mode !== 'exam' && a && a.status && a.status !== 'attempted') {
      box.outerHTML = optionsHtml(q, a.input, true);
    }
    if (a && a.status) {
      var sol = card.querySelector('[data-role="sol"]');
      if (sol && a.status !== 'attempted') sol.hidden = false;
    }
  }

  /* ================= 题目交互 ================= */
  function submitQuestion(qid) {
    var q = QMAP[qid];
    if (!q) return;
    var input = getInput(q);
    if (q.type !== 'subjective' && q.type !== 'essay' && q.type !== 'blank' && !String(input || '').trim()) {
      toast('先选出答案再提交');
      return;
    }
    if (q.type === 'subjective' || q.type === 'essay') {
      if (!String(input || '').trim()) { toast('先写下你的答案'); return; }
      var old = attempt(qid);
      setAttempt(qid, { input: input, status: old && /^self/.test(old.status || '') ? old.status : 'attempted' });
      toast(q.type === 'essay' ? '作文已保存，可以自评或让 AI 批改' : '答案已保存，请对照解析自评');
    } else {
      var st = grade(q, input);
      setAttempt(qid, { input: input, status: st });
      if (st === 'correct') toast('正确');
      else if (st === 'partial') toast('部分正确，还有空或要点没答到');
      else toast('不对，已记入错题本');
    }
    var mode = location.hash.indexOf('#/paper/') === 0 ? 'exam' : 'practice';
    refreshCard(q, mode);
    refreshExamChrome();
  }
  function toggleSolution(qid) {
    var card = findCard(qid);
    if (!card) return;
    var sol = card.querySelector('[data-role="sol"]');
    if (!sol) return;
    sol.hidden = !sol.hidden;
    if (!sol.hidden) sol.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function toggleHint(qid) {
    var card = findCard(qid);
    if (!card) return;
    var box = card.querySelector('[data-role="hint"]');
    if (!box) return;
    box.hidden = !box.hidden;
  }
  function toggleFav(qid) {
    state.fav[qid] = !state.fav[qid];
    saveState();
    var card = findCard(qid);
    if (card) {
      var btns = card.querySelectorAll('[data-act="fav"]');
      Array.prototype.forEach.call(btns, function (b) {
        b.textContent = state.fav[qid] ? '★ 已收藏' : '☆ 收藏';
      });
    }
    toast(state.fav[qid] ? '已收藏' : '已取消收藏');
  }
  function setSelf(qid, v) {
    var q = QMAP[qid];
    var st = v === 'A' ? 'selfA' : v === 'B' ? 'selfB' : 'selfC';
    setAttempt(qid, { input: getInput(q), status: st });
    refreshCard(q, 'practice');
    if (location.hash.indexOf('#/paper/') === 0) route(false);
    toast('已自评：' + statusText(attempt(qid)));
  }
  var aiBusy = {};
  async function runAI(qid, kind) {
    if (aiBusy[qid]) return;
    var q = QMAP[qid];
    var out = document.getElementById('ai-out-' + qid);
    var meta = document.getElementById('ai-meta-' + qid);
    if (!out || !q || !window.YW_AI) return;
    var workEl = document.getElementById('ai-work-' + qid);
    var work = workEl ? workEl.value : '';
    var answer = getInput(q);
    if (!work.trim()) work = answer;
    if ((kind === 'grade' || kind === 'essay') && !String(work || '').trim()) {
      toast('先写下答案或思路，再让 AI 批改');
      return;
    }
    aiBusy[qid] = true;
    out.innerHTML = '<div class="ai-loading">正在连接 AI，通常需要 10-25 秒…</div>';
    meta.innerHTML = '';
    var buf = '';
    var lastPaint = 0;
    function paint() {
      var now = Date.now();
      if (now - lastPaint < 260) return;
      lastPaint = now;
      out.innerHTML = mdToHtml(buf);
    }
    try {
      var a = attempt(qid);
      var selfLabel = a ? statusText(a) : '未自评';
      var res;
      if (kind === 'grade') res = await window.YW_AI.grade(q, work, function (d) { buf += d; paint(); });
      else if (kind === 'essay') res = await window.YW_AI.essay(q, work, function (d) { buf += d; paint(); });
      else res = await window.YW_AI.diagnose(q, work, selfLabel, knowledgeOf(q), function (d) { buf += d; paint(); });
      out.innerHTML = mdToHtml(buf);
      meta.innerHTML = '<span>通道：' + esc(res.provider) + '</span><span>仅供参考，请以参考答案与老师讲解为准</span>';
    } catch (e) {
      out.innerHTML = '<div class="ai-warn">AI 暂时不可用（' + esc(e && e.message ? e.message : '网络错误') + '）。下面是本地诊断，同样按「知识点层 / 真题层」拆分。</div>' + localDiagnosisHtml(q);
      meta.innerHTML = '<span>已降级为本地诊断</span>';
    }
    aiBusy[qid] = false;
  }
  function essayInsert(qid, tpl) {
    var el = document.querySelector('[data-fill="' + qid + '"]');
    if (!el) return;
    var tpls = {
      par: '【题目】\n\n【开头】现象引入 + 核心矛盾 + 中心论点：\n\n【分论点一】______，因为______。\n【论据】\n【分析】\n\n【分论点二】______，因为______。\n【论据】\n【分析】\n\n【分论点三】______，因为______。\n【论据】\n【分析】\n\n【结尾】回扣中心论点 + 一句有力量的收束。\n',
      prog: '【题目】\n\n【开头】由材料引出问题，提出中心论点：\n\n【分论点一 · 是什么】______ 的内涵是______。\n【分论点二 · 为什么】之所以______，是因为______。\n【分论点三 · 怎么办】要______，需要______。\n\n【结尾】从个人到时代，收束到“我们应该怎么做”。\n',
      contrast: '【题目】\n\n【开头】提出两种看似对立的观点，指出二者的偏差，亮出中心论点：\n\n【让步段】诚然，______有其合理性。\n【转折】然而，______。\n【深入】真正的______，不是______，而是______。\n\n【结尾】在更高层面上统一二者，回扣材料。\n'
    };
    el.value = (el.value ? el.value + '\n\n' : '') + (tpls[tpl] || '');
    saveInput(qid, el.value);
    var wc = document.getElementById('wc-' + qid);
    if (wc) wc.textContent = el.value.replace(/\s/g, '').length;
    el.focus();
  }

  /* ================= 首页 ================= */
  function todayStats() {
    var r = dayRec();
    var week = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var x = timeData.days[dayKey(d)];
      if (x) week += x.focus || 0;
    }
    return { focus: r.focus || 0, online: r.online || 0, pomos: r.pomos || 0, week: week, streak: streak() };
  }
  function tipIndex() {
    var days = Math.floor(new Date(dayKey() + 'T00:00:00') / 86400000);
    return MEMO.tips.length ? ((days % MEMO.tips.length) + MEMO.tips.length) % MEMO.tips.length : 0;
  }
  function pickDaily(n) {
    var pool = QS.filter(function (q) { return (q.kind === 'real' || q.kind === 'mock') && !isSolved(attempt(q.qid)); });
    if (!pool.length) pool = QS.filter(function (q) { return q.kind === 'real'; });
    var seed = parseInt(dayKey().replace(/-/g, ''), 10) || 1;
    var out = [];
    for (var i = 0; i < pool.length && out.length < n; i++) {
      var idx = (seed * 7 + i * 137) % pool.length;
      if (out.indexOf(pool[idx]) < 0) out.push(pool[idx]);
    }
    return out;
  }
  function statCard(label, val, sub) {
    return '<div class="stat-card"><div class="sv">' + val + '</div><div class="sl">' + label + '</div>' + (sub ? '<div class="sx">' + sub + '</div>' : '') + '</div>';
  }
  function quick(href, icon, title, sub) {
    return '<a class="quick-card" href="' + href + '"><span class="qi">' + icon + '</span><b>' + title + '</b><span>' + sub + '</span></a>';
  }
  function viewHome() {
    var p = progress(), t = todayStats();
    var days = daysToExam();
    var rec = pickDaily(3);
    var tip = MEMO.tips[tipIndex()];
    var html = '<section class="hero"><div class="hero-deco">文</div>' +
      '<div class="eyebrow">高三语文 · 真题 + 知识 + 反馈</div>' +
      '<h1>今天，把一篇文章读透。</h1>' +
      '<p>整套真题模考、知识点与做题技巧，还有一个会分析你“卡在哪一步”的 AI 教练。先做一套卷子暴露问题，再回到知识点把漏洞补上。</p>' +
      '<div class="hero-actions">' +
      (days >= 0 ? '<span class="countdown">距高考 <b>' + days + '</b> 天</span>' : '<span class="countdown">高考已结束，继续向前</span>') +
      '<a class="btn primary" href="#/papers">开始一套模考</a>' +
      '<a class="btn ghost" href="#/memorize">十分钟记忆</a></div></section>';

    html += '<div class="grid g4" style="margin-bottom:14px">' +
      statCard('今日专注', fmtMin(t.focus), t.pomos + ' 个番茄') +
      statCard('今日在线', fmtMin(t.online), '页面可见时累计') +
      statCard('连续学习', t.streak + ' 天', t.streak ? '保持住' : '今天开始') +
      statCard('真题掌握', p.right + ' / ' + p.total, p.pct + '% · 错题 ' + p.wrong) +
      '</div>';

    if (tip) {
      html += '<div class="memo-tip" style="margin-bottom:18px"><div class="mt-tag">今日做题技巧 · ' + esc(tip.tag || '') + '</div>' +
        '<h2>' + esc(tip.title) + '</h2><div class="mt-body">' + rich(tip.body) + '</div>' +
        '<div class="mt-foot"><a class="btn sm primary" href="#/memorize">进十分钟记忆</a><span class="small muted">每天换一条，十天一轮</span></div></div>';
    }

    html += '<div class="grid g4" style="margin-bottom:18px">' +
      quick('#/papers', '卷', '真题模考', '整套限时，交卷后逐题复盘') +
      quick('#/knowledge', '知', '知识点与技巧', KD.points.length + ' 个考点，含答题模型') +
      quick('#/memorize', '记', '十分钟记忆', '每日技巧 + 记忆卡') +
      quick('#/bank', '题', '全题库', QS.length + ' 道题，按板块筛选') +
      '</div>';

    html += '<div class="grid g3">' +
      '<div class="card"><div class="card-title"><h3>今日三题</h3><span class="small muted">按日期轮换</span></div>' +
      rec.map(function (q) {
        return '<a class="mini-q" href="#/question/' + q.qid + '"><div class="mq-stem">' + rich(q.stem) + '</div>' +
          '<div class="mq-meta">' + esc(q.source) + ' · ' + (q.score || 0) + ' 分</div></a>';
      }).join('') + '</div>' +
      '<div class="card"><div class="card-title"><h3>板块掌握</h3><a class="small" href="#/stats">看统计</a></div>' + moduleBarsHtml() + '</div>' +
      '<div class="card"><div class="card-title"><h3>怎么用这个站</h3></div>' +
      '<ol class="steps-list"><li><b>先模考</b>：150 分钟整套做，客观题自动判，主观题自评。</li>' +
      '<li><b>再复盘</b>：错题看“知识点层 / 真题层”，回到对应知识点。</li>' +
      '<li><b>每天十分钟</b>：一条技巧 + 五张记忆卡，考前滚动复习。</li></ol></div></div>';
    return html;
  }
  function moduleBarsHtml() {
    return '<div class="module-bars">' + CH.map(function (c) {
      var qs = questionsOfChapter(c.id);
      var done = qs.filter(function (q) { return isSolved(attempt(q.qid)); }).length;
      var pct = pctOf(done, qs.length);
      return '<div class="mb-row"><span class="mb-name" title="' + esc(c.title) + '">' + esc(c.title) + '</span>' +
        '<span class="mb-bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="mb-val">' + done + '/' + qs.length + '</span></div>';
    }).join('') + '</div>';
  }

  /* ================= 知识点 ================= */
  function chapterProgress(cid) {
    var qs = questionsOfChapter(cid);
    var done = qs.filter(function (q) { return isSolved(attempt(q.qid)); }).length;
    return { done: done, total: qs.length, pct: pctOf(done, qs.length) };
  }
  function viewKnowledge() {
    var html = pageHead('知识地图', '知识点与做题技巧', '按高考板块拆成 ' + CH.length + ' 章 ' + KP.length + ' 个考点。每个考点都给出：一句话本质、题干信号、操作步骤、常见失分点、最小示例和两个可套用的方法。');
    html += '<div class="grid g2">' + CH.map(function (c) {
      var cp = chapterProgress(c.id);
      return '<a class="chapter-card" href="#/knowledge/' + c.id + '"><div class="cc-top"><h3>' + esc(c.title) + '</h3>' +
        '<span class="badge type">' + pointsOfChapter(c.id).length + ' 个考点</span></div>' +
        '<p>' + esc(c.intro || '') + '</p>' +
        '<div class="cc-meta"><span>关联题目 ' + cp.total + ' 道</span><span>已掌握 ' + cp.done + '</span><span>' + cp.pct + '%</span></div>' +
        '<div class="cc-bar"><i style="width:' + cp.pct + '%"></i></div></a>';
    }).join('') + '</div>';
    html += '<div class="card" style="margin-top:18px"><div class="k-label">使用顺序</div><p class="small muted" style="margin:4px 0 0">先按章节通读一遍，把每个考点的“题干信号 → 动作”记成条件反射；做错题时只回看对应知识点，不要整章重读；考前只看「一句话本质」和「常见失分点」。</p></div>';
    return html;
  }
  function viewChapter(cid) {
    var c = CHMAP[cid];
    if (!c) return viewNotFound('章节');
    var pts = pointsOfChapter(cid);
    var cp = chapterProgress(cid);
    var html = pageHead('知识点 · ' + esc(c.title), esc(c.title), esc(c.intro || ''), '<a href="#/knowledge">知识点</a> / ' + esc(c.title));
    html += '<div class="grid g3" style="margin-bottom:14px">' +
      statCard('考点', pts.length + ' 个', '按高考设问拆分') +
      statCard('关联题目', cp.total + ' 道', '真题 + 模拟 + 母题') +
      statCard('已掌握', cp.done + ' 道', cp.pct + '%') + '</div>';
    if (c.examTip) html += '<div class="card" style="background:var(--primary-soft);border-color:transparent"><div class="k-label">考场口令</div><p style="margin:4px 0 0">' + rich(c.examTip) + '</p></div>';
    html += '<h2>考点清单</h2><div class="point-list">' + pts.map(function (k) {
      var qs = questionsOfKnowledge(k.id);
      var done = qs.filter(function (q) { return isSolved(attempt(q.qid)); }).length;
      return '<a class="point-card" href="#/point/' + k.id + '"><div class="pc-top"><b>' + esc(k.title) + '</b>' +
        '<span class="badge">' + qs.length + ' 题 · 会 ' + done + '</span></div><p>' + esc(k.summary || '') + '</p></a>';
    }).join('') + '</div>';
    return html;
  }
  function viewPoint(kid) {
    var k = KMAP[kid];
    if (!k) return viewNotFound('知识点');
    var ch = CHMAP[k.chapter] || {};
    var qs = questionsOfKnowledge(kid);
    var html = pageHead('知识点 · ' + esc(ch.title || ''), esc(k.title), esc(k.summary || ''), '<a href="#/knowledge">知识点</a> / <a href="#/knowledge/' + k.chapter + '">' + esc(ch.title || '') + '</a> / ' + esc(k.title));
    html += '<div class="chips" style="margin-bottom:14px"><span class="badge type">' + esc(ch.title || '') + '</span>' + diffDots(k.difficulty) +
      '<span class="badge">关联题目 ' + qs.length + ' 道</span></div>';
    html += '<article class="kcard"><div class="k-label">一句话本质</div>' +
      '<p style="font-family:var(--serif);font-size:16px;margin:6px 0 0">' + rich(k.summary || '') + '</p>' +
      '<div class="k-section"><div class="k-label">核心讲解</div><div class="kd-core">' + mdToHtml(k.core || '') + '</div></div>' +
      ((k.signals || []).length ? '<div class="k-section"><div class="k-label">题干信号 → 动作</div><div class="signal-list">' +
        k.signals.map(function (s) { return '<span>' + rich(s) + '</span>'; }).join('') + '</div></div>' : '') +
      ((k.steps || []).length ? '<div class="k-section"><div class="k-label">操作步骤</div><ol class="steps-list">' +
        k.steps.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol></div>' : '') +
      ((k.pitfalls || []).length ? '<div class="k-section"><div class="k-label">常见失分点</div><ul class="pitfall-list">' +
        k.pitfalls.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</article>';
    if (k.example) {
      html += '<h2>最小示例</h2><div class="card"><div class="qstem" style="margin-top:0">' + rich(k.example.stem) + '</div>' +
        '<div class="solution" style="margin-top:10px"><h4>答案与解析</h4><div class="answer-final" style="border-top:none;padding-top:0"><b>答案：</b>' + rich(k.example.answer) + '</div>' +
        (k.example.solution || []).map(function (s, i) { return '<div class="sol-step"><span class="n">' + (i + 1) + '</span><div>' + rich(s) + '</div></div>'; }).join('') + '</div></div>';
    }
    if ((k.methods || []).length) {
      html += '<h2>可套用的方法</h2><div class="method-grid">' + k.methods.map(function (m) {
        return '<div class="method-card"><div class="mc-name">' + esc(m.name) + '</div>' +
          '<div class="mc-when"><b>什么时候用</b>' + rich(m.when) + '</div>' +
          '<ol class="mc-steps">' + (m.how || []).map(function (h) { return '<li>' + rich(h) + '</li>'; }).join('') + '</ol>' +
          (m.trap ? '<div class="mc-trap"><b>易错</b>' + rich(m.trap) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    if (k.takeaway) {
      html += '<div class="takeaway"><div class="k-label">背这一句</div><p>' + rich(k.takeaway) + '</p></div>';
    }
    html += '<div class="card" style="margin-top:18px" data-explain="' + k.id + '"><div class="card-title"><h3>让 AI 换个角度讲</h3><button class="btn sm" data-act="explain" data-kid="' + k.id + '">生成讲解</button></div>' +
      '<div class="ai-output" id="explain-out"></div></div>';
    html += '<h2>关联题目</h2>';
    if (!qs.length) html += emptyHtml('这个考点暂时没有关联题，先看上面的示例。');
    else html += '<div class="card">' + qs.slice(0, 12).map(function (q) {
      var a = attempt(q.qid);
      return '<div class="q-row"><div class="qr-main"><a class="qr-stem" href="#/question/' + q.qid + '">' + rich(q.stem) + '</a>' +
        '<div class="qr-meta"><span>' + esc(q.source) + '</span><span>' + typeLabel(q.type) + '</span>' +
        '<span class="badge ' + statusClass(a) + '">' + statusText(a) + '</span></div></div>' +
        '<div class="qr-side"><a class="btn sm" href="#/question/' + q.qid + '">打开</a></div></div>';
    }).join('') + (qs.length > 12 ? '<p class="small muted" style="margin:8px 0 0">还有 ' + (qs.length - 12) + ' 道，去题库按知识点筛选。</p>' : '') + '</div>';
    return html;
  }
  async function runExplain(kid) {
    var k = KMAP[kid];
    var out = document.getElementById('explain-out');
    if (!k || !out) return;
    out.innerHTML = '<div class="ai-loading">正在生成，通常 10-20 秒…</div>';
    var buf = '';
    var last = 0;
    function paint() {
      var now = Date.now();
      if (now - last < 260) return;
      last = now;
      out.innerHTML = mdToHtml(buf);
    }
    try {
      var res = await window.YW_AI.explain(k, function (d) { buf += d; paint(); });
      out.innerHTML = mdToHtml(buf) + '<div class="ai-meta"><span>通道：' + esc(res.provider) + '</span></div>';
    } catch (e) {
      out.innerHTML = '<div class="ai-warn">AI 暂时不可用。先看上面的核心讲解与示例。</div>';
    }
  }

  /* ================= 真题模考 ================= */
  var activePaper = null;
  function paperRemain(p) {
    var rec = state.papers[p.id];
    if (!rec) return (p.duration || 150) * 60;
    if (rec.submitted) return rec.remaining || 0;
    if (rec.running && rec.endAt) return Math.max(0, (rec.endAt - Date.now()) / 1000);
    return rec.remaining != null ? rec.remaining : (p.duration || 150) * 60;
  }
  function startPaper(pid) {
    var p = PAPERS.filter(function (x) { return x.id === pid; })[0];
    if (!p) return;
    state.papers[pid] = { startedAt: Date.now(), endAt: Date.now() + (p.duration || 150) * 60000, running: true, remaining: (p.duration || 150) * 60, answers: {}, submitted: false };
    saveState();
    route(false);
    scrollTop();
    toast('计时开始，先做会做的题');
  }
  function pausePaper(pid) {
    var rec = state.papers[pid];
    if (!rec || rec.submitted) return;
    if (rec.running) {
      rec.remaining = Math.max(0, (rec.endAt - Date.now()) / 1000);
      rec.running = false; rec.endAt = 0;
    } else {
      rec.endAt = Date.now() + (rec.remaining || 0) * 1000;
      rec.running = true;
    }
    saveState();
    route(false);
  }
  function examScore(p) {
    var full = 0, obj = 0, selfN = 0;
    p.questions.forEach(function (q) {
      var a = attempt(q.qid);
      if (!a) return;
      var sc = q.score || 0;
      if (q.type === 'subjective' || q.type === 'essay') {
        if (a.status === 'selfA') { full += sc; selfN++; }
        else if (a.status === 'selfB') { full += Math.round(sc / 2); selfN++; }
        else if (a.status === 'selfC') selfN++;
      } else if (a.status === 'correct') { full += sc; obj += sc; }
      else if (a.status === 'partial') { full += Math.round(sc / 2); obj += Math.round(sc / 2); }
    });
    return { score: Math.round(full), objective: obj, selfN: selfN };
  }
  function submitPaper(pid, auto) {
    var p = PAPERS.filter(function (x) { return x.id === pid; })[0];
    var rec = state.papers[pid];
    if (!p || !rec || rec.submitted) return;
    if (!auto && !window.confirm('交卷后客观题自动判分，主观题按自评计分。确定交卷吗？')) return;
    p.questions.forEach(function (q) {
      var val = rec.answers ? rec.answers[q.no] : '';
      if (!String(val == null ? '' : val).trim()) return;
      if (q.type === 'subjective' || q.type === 'essay') {
        var old = attempt(q.qid);
        setAttempt(q.qid, { input: val, status: old && /^self/.test(old.status || '') ? old.status : 'attempted' });
      } else {
        setAttempt(q.qid, { input: val, status: grade(q, val) });
      }
    });
    rec.remaining = paperRemain(p);
    rec.running = false; rec.endAt = 0; rec.submitted = true; rec.submittedAt = Date.now();
    rec.score = examScore(p).score;
    saveState();
    route(false);
    scrollTop();
    toast(auto ? '时间到，已自动交卷' : '已交卷，按解析逐题复盘');
  }
  function resetPaper(pid) {
    if (!window.confirm('重新模考会清空本卷作答与计时，确定吗？')) return;
    var p = PAPERS.filter(function (x) { return x.id === pid; })[0];
    if (p) p.questions.forEach(function (q) { delete state.attempts[q.qid]; });
    delete state.papers[pid];
    saveState();
    route(false);
  }
  function updateExamBar() {
    if (!activePaper) return;
    var timer = document.getElementById('exam-timer');
    if (!timer) return;
    var rem = paperRemain(activePaper);
    timer.textContent = fmtHMS(rem);
    timer.classList.toggle('warn', rem < 15 * 60);
    var rec = state.papers[activePaper.id] || {};
    if (rem <= 0 && rec.running && !rec.submitted) {
      submitPaper(activePaper.id, true);
      return;
    }
    var ans = rec.answers || {};
    var cnt = document.getElementById('exam-count');
    if (cnt) {
      var n = activePaper.questions.filter(function (q) { return ans[q.no] != null && String(ans[q.no]).trim() !== ''; }).length;
      cnt.textContent = '已答 ' + n + ' / ' + activePaper.questions.length;
    }
    var pb = document.querySelector('[data-act="paper-pause"]');
    if (pb && rec) pb.textContent = rec.running ? '暂停' : '继续';
    Array.prototype.forEach.call(document.querySelectorAll('.sheet-cell'), function (cell) {
      var no = cell.getAttribute('data-no');
      var has = ans[no] != null && String(ans[no]).trim() !== '';
      cell.classList.toggle('done', !!has);
    });
  }
  function refreshExamChrome() { updateExamBar(); }
  function sheetHtml(p) {
    var rec = state.papers[p.id] || {};
    var ans = rec.answers || {};
    var mark = { single: '单', blank: '填', subjective: '答', essay: '文' };
    return '<div class="answer-sheet"><h4>答题卡</h4><div class="sheet-grid">' +
      p.questions.map(function (q) {
        var has = ans[q.no] != null && String(ans[q.no]).trim() !== '';
        return '<button class="sheet-cell' + (has ? ' done' : '') + '" data-act="sheet-jump" data-no="' + q.no + '">' + q.no +
          '<span class="sf">' + (mark[q.type] || '答') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="sheet-legend"><span><i style="background:var(--primary-soft);border:1px solid var(--primary)"></i>已答</span><span><i style="background:var(--bg);border:1px solid var(--border)"></i>未答</span></div>' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn sm primary" style="width:100%" data-act="paper-submit" data-pid="' + p.id + '">交卷</button></div>' +
      '<div class="small muted" style="margin-top:7px;line-height:1.55">客观题自动判分；主观题与作文交卷后按“会 / 半懂 / 不会”自评计分。</div></div>';
  }
  function paperQuestionsHtml(p, mode) {
    var lastMat = null;
    var shown = {};
    return p.questions.map(function (q) {
      var mat = '';
      if (q.material && q.material !== lastMat && !shown[q.material]) {
        mat += passageHtml(q.material, p);
        shown[q.material] = 1;
      }
      if (q.material === 'm1' && p.materials.m2 && !shown.m2) {
        mat += passageHtml('m2', p);
        shown.m2 = 1;
      }
      lastMat = q.material;
      return mat + questionCard(q, mode);
    }).join('');
  }
  function viewPaper(pid) {
    var p = PAPERS.filter(function (x) { return x.id === pid; })[0];
    if (!p) return viewNotFound('试卷');
    var rec = state.papers[pid];
    if (!rec) {
      var struct = p.questions.map(function (q) {
        return '<tr><td class="mono">' + q.no + '</td><td>' + q.section + '</td><td>' + typeLabel(q.type) + '</td><td>' + (q.score || 0) + ' 分</td><td class="qb-hide">' +
          (knowledgeOf(q).map(function (k) { return k.title; }).join('、') || '综合') + '</td></tr>';
      }).join('');
      return pageHead(p.kind === 'mock' ? '优质模拟卷' : '历年真题', esc(p.title), '限时 ' + (p.duration || 150) + ' 分钟，满分 ' + p.total + ' 分。建议一次做完再对答案，模考的价值在于暴露问题，而不是刷分。', '<a href="#/papers">真题模考</a> / ' + esc(p.short)) +
        '<div class="grid g3" style="margin-bottom:16px">' +
        statCard('题目', p.questions.length + ' 题', p.note || '') +
        statCard('满分', p.total + ' 分', '新高考结构') +
        statCard('建议用时', (p.duration || 150) + ' 分钟', '计时可暂停') + '</div>' +
        '<div class="card"><div class="card-title"><h3>开始前</h3><span class="badge ' + (p.kind === 'mock' ? 'mock' : 'type') + '">' + (p.kind === 'mock' ? '模拟卷' : '真题改编') + '</span></div>' +
        '<ul class="k-list"><li>准备好草稿纸与答题纸，中途尽量不查手机。</li><li>信息类文本先读题再定位；文言文先看第 12 题（概括题），能快速把握全文。</li><li>作文至少留 50 分钟，先列提纲再动笔。</li><li>交卷后先自评主观题，再看解析和 AI 诊断。</li></ul>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn primary" data-act="paper-start" data-pid="' + p.id + '">开始模考</button>' +
        '<a class="btn ghost" href="#/question/' + p.questions[0].qid + '">先逐题练习</a></div></div>' +
        '<h2>试卷结构</h2><div class="card" style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px">' +
        '<thead><tr style="text-align:left;color:var(--text-faint)"><th style="padding:6px 4px">题号</th><th>板块</th><th>题型</th><th>分值</th><th class="qb-hide">主要考点</th></tr></thead><tbody>' + struct + '</tbody></table></div>';
    }
    if (rec.submitted) {
      var es = examScore(p);
      var objCount = p.questions.filter(function (q) { return q.type !== 'subjective' && q.type !== 'essay'; }).length;
      var objRight = p.questions.filter(function (q) {
        if (q.type === 'subjective' || q.type === 'essay') return false;
        var a = attempt(q.qid);
        return a && (a.status === 'correct' || a.status === 'partial');
      }).length;
      var html = pageHead('模考结果', esc(p.title), '成绩只是体温计，真正的收获是下面每道题的“卡点 + 知识点 + 一句话方法”。', '<a href="#/papers">真题模考</a> / ' + esc(p.short));
      html += '<div class="result-banner"><div><div class="rb-score">' + es.score + '<span> / ' + p.total + ' 分</span></div>' +
        '<div class="small muted">客观题 ' + es.objective + ' 分 · 主观题已自评 ' + es.selfN + ' 题</div></div>' +
        '<div class="rb-text">客观题答对或部分正确 <b>' + objRight + ' / ' + objCount + '</b>。主观题请逐题自评；自评“会 / 半懂”会计入分数，但请诚实。错题已自动进入错题本。</div>' +
        '<div class="btn-row"><a class="btn sm" href="#/wrong">去错题本</a><button class="btn sm ghost" data-act="paper-reset" data-pid="' + p.id + '">重新模考</button></div></div>';
      html += '<div class="card" style="margin-bottom:14px"><div class="small muted">提示：点击主观题下方的“自评”，分数会实时更新；解析默认展开，建议先自评再看。</div></div>';
      html += paperQuestionsHtml(p, 'review');
      return html;
    }
    activePaper = p;
    var left = paperRemain(p);
    var html2 = pageHead(p.kind === 'mock' ? '模拟卷' : '真题模考', esc(p.title), '', '<a href="#/papers">真题模考</a> / ' + esc(p.short));
    html2 += '<div class="exam-bar"><span class="timer" id="exam-timer">' + fmtHMS(left) + '</span>' +
      '<span class="bar-meta" id="exam-count">已答 0 / ' + p.questions.length + '</span><span class="bar-sp"></span>' +
      '<button class="btn sm" data-act="paper-pause" data-pid="' + p.id + '">' + (rec.running ? '暂停' : '继续') + '</button>' +
      '<button class="btn sm primary" data-act="paper-submit" data-pid="' + p.id + '">交卷</button>' +
      '<a class="btn sm ghost" href="#/papers">退出</a></div>';
    html2 += '<div class="exam-layout"><div>' + paperQuestionsHtml(p, 'exam') + '</div><div class="exam-side">' + sheetHtml(p) + '</div></div>';
    setTimeout(function () { updateExamBar(); }, 0);
    return html2;
  }
  function viewPapers() {
    var real = PAPERS.filter(function (p) { return p.kind === 'real'; });
    var mock = PAPERS.filter(function (p) { return p.kind === 'mock'; });
    var ext = PAPERS.filter(function (p) { return p.kind === 'ext'; });
    var html = pageHead('模考', '真题与优质模拟卷', '整套限时训练才是真模考：150 分钟、22 题、交卷后逐题复盘。真题卷按公开试卷的题型与设问方式教学化改编，模拟卷覆盖八省联考、广州一模、武汉四调与天星押题风格。');
    var years = [];
    real.forEach(function (p) { if (years.indexOf(p.year) < 0) years.push(p.year); });
    html += '<div class="card" style="background:var(--primary-soft);border-color:transparent;margin-bottom:18px"><div class="k-label">怎么用</div>' +
      '<p style="margin:4px 0 0" class="small">一轮：按年份整套做，记录分数；二轮：只做错题与语用专项；考前：隔天一套，严格计时。计时可以暂停，但模考时尽量不用。</p></div>';
    years.sort(function (a, b) { return b - a; }).forEach(function (y) {
      html += '<div class="year-head"><h2>' + y + ' 年</h2><span>' + real.filter(function (p) { return p.year === y; }).length + ' 套</span></div><div class="card">';
      html += real.filter(function (p) { return p.year === y; }).map(paperRow).join('');
      html += '</div>';
    });
    html += '<div class="year-head"><h2>各地模考卷</h2><span>' + mock.length + ' 套</span></div><div class="card">' +
      (mock.length ? mock.map(paperRow).join('') : emptyHtml('模拟卷正在整理中。')) + '</div>';
    if (ext.length) {
      html += '<div class="year-head"><h2>我的导入题库</h2><span>' + ext.length + ' 套</span></div><div class="card">' +
        ext.map(paperRow).join('') + '<p class="small muted" style="margin:8px 0 0">导入的题库只保存在本机，可在 <a href="#/settings">设置</a> 里导出或清空。</p></div>';
    }
    html += '<div class="card" style="margin-top:18px"><div class="k-label">说明</div><p class="small muted" style="margin:4px 0 0">真题卷的阅读材料为教学化仿写与改写，不逐字复制原卷；模拟卷为按新高考结构自编的仿真卷，用于补充题量与限时训练。</p></div>';
    return html;
  }
  function paperRow(p) {
    var ps = paperStat(p);
    return '<div class="paper-row"><div class="pr-main"><b><a href="#/paper/' + p.id + '">' + esc(p.title) + '</a></b>' +
      '<div class="pr-meta">' + p.questions.length + ' 题 · ' + p.total + ' 分 · ' + (p.kind === 'mock' ? '模拟' : p.kind === 'ext' ? '导入' : '真题改编') +
      (ps.submitted ? ' · 得分 ' + ps.score : '') + '</div></div>' +
      '<div class="progress-line"><span>' + ps.answered + '/' + ps.total + '</span><span class="pl-bar"><i style="width:' + pctOf(ps.answered, ps.total) + '%"></i></span></div>' +
      '<a class="btn sm' + (ps.submitted ? '' : ' primary') + '" href="#/paper/' + p.id + '">' + (ps.submitted ? '复盘' : ps.answered ? '继续' : '开考') + '</a></div>';
  }

  /* ================= 题库 ================= */
  var bank = { kw: '', ch: '', type: '', diff: '', kind: '', page: 1 };
  var BANK_PAGE = 12;
  function bankFiltered() {
    var kw = bank.kw.trim().toLowerCase();
    return QS.filter(function (q) {
      if (bank.kind && q.kind !== bank.kind) return false;
      if (bank.type && q.type !== bank.type) return false;
      if (bank.diff && (q.difficulty || 3) !== parseInt(bank.diff, 10)) return false;
      if (bank.ch) {
        if (!(q.knowledge || []).some(function (kid) { return KMAP[kid] && KMAP[kid].chapter === bank.ch; })) return false;
      }
      if (kw) {
        var hay = (q.stem + ' ' + q.source + ' ' + (q.knowledge || []).map(function (kid) { return KMAP[kid] ? KMAP[kid].title : ''; }).join(' ')).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
  }
  function bankRowsHtml(list) {
    if (!list.length) return emptyHtml('没有符合条件的题目，换个筛选条件。');
    return list.map(function (q) {
      var a = attempt(q.qid);
      return '<div class="q-row"><div class="qr-main"><a class="qr-stem" href="#/question/' + q.qid + '">' + rich(q.stem) + '</a>' +
        '<div class="qr-meta"><span>' + esc(q.source) + '</span><span>' + esc(q.section) + '</span><span>' + typeLabel(q.type) + '</span>' +
        '<span>' + (q.score || 0) + ' 分</span><span class="badge ' + statusClass(a) + '">' + statusText(a) + '</span></div></div>' +
        '<div class="qr-side"><a class="btn sm primary" href="#/question/' + q.qid + '">做题</a></div></div>';
    }).join('');
  }
  function bankPagerHtml(total) {
    var pages = Math.max(1, Math.ceil(total / BANK_PAGE));
    return '<div class="pager"><button data-act="bank-page" data-page="' + (bank.page - 1) + '"' + (bank.page <= 1 ? ' disabled' : '') + '>上一页</button>' +
      '<span>' + bank.page + ' / ' + pages + ' · 共 ' + total + ' 题</span>' +
      '<button data-act="bank-page" data-page="' + (bank.page + 1) + '"' + (bank.page >= pages ? ' disabled' : '') + '>下一页</button></div>';
  }
  function viewBank() {
    var drillMode = location.hash.split('/')[2] === 'drill';
    if (drillMode) bank.kind = 'drill';
    else if (bank.kind === 'drill') bank.kind = '';
    var html = pageHead('题库', drillMode ? '专项提升' : '全题库', drillMode ? '按板块拆开的高频题：每道题只练一个动作，做完立刻看方法与易错点。' : '真题、模拟卷、专项题都在这里。按板块、题型、难度筛选，也可以直接搜关键词。');
    html += '<div class="card" style="padding:11px 16px;margin-bottom:14px"><div class="btn-row"><span class="small muted">题库不够？把你整理或已获授权的 CSV / JSON 题库导进来，会并入这里。</span><a class="btn sm ghost" href="#/settings">去导入</a></div></div>';
    html += '<div class="filter-bar">' +
      '<input class="text-input grow" id="bank-kw" placeholder="搜索题干 / 来源 / 知识点" value="' + esc(bank.kw) + '">' +
      '<select class="select" id="bank-ch"><option value="">全部板块</option>' + CH.map(function (c) {
        return '<option value="' + c.id + '"' + (bank.ch === c.id ? ' selected' : '') + '>' + esc(c.title) + '</option>';
      }).join('') + '</select>' +
      '<select class="select" id="bank-type"><option value="">全部题型</option>' +
      [['single', '单项选择'], ['blank', '默写填空'], ['subjective', '主观简答'], ['essay', '作文']].map(function (t) {
        return '<option value="' + t[0] + '"' + (bank.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
      }).join('') + '</select>' +
      '<select class="select" id="bank-diff"><option value="">全部难度</option>' +
      [1, 2, 3, 4, 5].map(function (d) {
        return '<option value="' + d + '"' + (bank.diff === '' + d ? ' selected' : '') + '>' + d + ' 星</option>';
      }).join('') + '</select>' +
      '<select class="select" id="bank-kind"><option value="">全部来源</option>' +
      [['real', '真题改编'], ['mock', '模拟卷'], ['drill', '专项题'], ['ext', '导入题库']].map(function (t) {
        return '<option value="' + t[0] + '"' + (bank.kind === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
      }).join('') + '</select>' +
      '<button class="btn sm" data-act="bank-reset">重置</button></div>';
    html += '<div class="card"><div id="bank-list"></div><div id="bank-pager"></div></div>';
    setTimeout(function () { renderBankList(); }, 0);
    return html;
  }
  function renderBankList() {
    var list = bankFiltered();
    var start = (bank.page - 1) * BANK_PAGE;
    var pageList = list.slice(start, start + BANK_PAGE);
    var box = document.getElementById('bank-list');
    var pager = document.getElementById('bank-pager');
    if (box) box.innerHTML = bankRowsHtml(pageList);
    if (pager) pager.innerHTML = bankPagerHtml(list.length);
  }
  function bankApply() {
    var kwEl = document.getElementById('bank-kw');
    var chEl = document.getElementById('bank-ch');
    var typeEl = document.getElementById('bank-type');
    var diffEl = document.getElementById('bank-diff');
    var kindEl = document.getElementById('bank-kind');
    bank.kw = kwEl ? kwEl.value : '';
    bank.ch = chEl ? chEl.value : '';
    bank.type = typeEl ? typeEl.value : '';
    bank.diff = diffEl ? diffEl.value : '';
    bank.kind = kindEl ? kindEl.value : '';
    bank.page = 1;
    renderBankList();
  }

  /* ================= 十分钟记忆 ================= */
  var memoFilter = '';
  var memoState = state.memo || { known: {}, read: {} };
  function memoKnown() {
    var n = 0;
    MEMO.cards.forEach(function (c, i) { if (memoState.known[i]) n++; });
    return n;
  }
  function viewMemorize() {
    var tip = MEMO.tips[tipIndex()];
    var html = pageHead('十分钟记忆', '每天十分钟，记一条能用的', '每天推送一条做题技巧，再翻五张记忆卡。技巧负责“会做”，卡片负责“记得住”。');
    if (tip) {
      html += '<div class="memo-tip"><div class="mt-tag">今日技巧 · ' + esc(tip.tag || '') + '</div><h2>' + esc(tip.title) + '</h2>' +
        '<div class="mt-body">' + rich(tip.body) + '</div>' +
        '<div class="mt-foot"><span class="memo-timer" id="memo-timer">10:00</span>' +
        '<button class="btn sm primary" data-act="memo-start" id="memo-btn">开始十分钟</button>' +
        '<button class="btn sm ghost" data-act="memo-reset">重置</button>' +
        '<span class="small muted">计时结束自动记入专注时长</span></div></div>';
    }
    html += '<div class="grid g3" style="margin-bottom:16px">' +
      statCard('记忆卡', MEMO.cards.length + ' 张', '按板块分组') +
      statCard('已记住', memoKnown() + ' 张', '点“记住了”标记') +
      statCard('技巧库', MEMO.tips.length + ' 条', '每天轮换') + '</div>';

    var tags = [];
    MEMO.cards.forEach(function (c) { if (c.tag && tags.indexOf(c.tag) < 0) tags.push(c.tag); });
    html += '<div class="filter-bar"><button class="btn sm' + (memoFilter === '' ? ' primary' : ' ghost') + '" data-act="memo-tag" data-tag="">全部</button>' +
      tags.map(function (t) {
        return '<button class="btn sm' + (memoFilter === t ? ' primary' : ' ghost') + '" data-act="memo-tag" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('') + '<span class="small muted" style="margin-left:auto">点卡片翻面</span></div>';

    var cards = MEMO.cards.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return !memoFilter || x.c.tag === memoFilter; });
    html += '<div class="deck-grid" id="deck">' + cards.map(function (x) {
      return '<div class="flip-card" data-act="card-flip" data-i="' + x.i + '"><div class="flip-inner">' +
        '<div class="flip-face"><div class="ff-tag">' + esc(x.c.tag || '记忆卡') + '</div><div class="ff-main">' + rich(x.c.front) + '</div><div class="ff-hint">点击看背面</div></div>' +
        '<div class="flip-face back"><div class="ff-tag">答案</div><div class="ff-main">' + rich(x.c.back) + '</div>' +
        '<div class="memo-known" data-role="known"><button data-act="card-known" data-i="' + x.i + '" class="' + (memoState.known[x.i] ? 'on' : '') + '">' + (memoState.known[x.i] ? '✓ 已记住' : '记住了') + '</button></div></div>' +
        '</div></div>';
    }).join('') + '</div>';

    html += '<h2>接下来的技巧</h2><div class="tip-list">' + [1, 2, 3, 4, 5].map(function (off) {
      var idx = (tipIndex() + off) % Math.max(1, MEMO.tips.length);
      var t = MEMO.tips[idx];
      if (!t) return '';
      return '<div class="tip-item"><div class="ti-day">第 ' + (off + 1) + ' 天</div><div class="ti-main"><b>' + esc(t.title) + '</b><span>' + rich(t.body) + '</span></div><div class="ti-tag">' + esc(t.tag || '') + '</div></div>';
    }).join('') + '</div>';
    return html;
  }
  function toggleCard(el) {
    el.classList.toggle('flipped');
  }
  function markKnown(i) {
    memoState.known[i] = !memoState.known[i];
    state.memo = memoState;
    saveState();
    var btns = document.querySelectorAll('[data-act="card-known"][data-i="' + i + '"]');
    Array.prototype.forEach.call(btns, function (b) {
      b.classList.toggle('on', !!memoState.known[i]);
      b.textContent = memoState.known[i] ? '✓ 已记住' : '记住了';
    });
    toast(memoState.known[i] ? '已标记记住' : '已取消标记');
  }
  var memoTimer = { running: false, endAt: 0, remain: 600 };
  try {
    var mt = JSON.parse(localStorage.getItem('yw.memo.timer') || '{}');
    if (mt && mt.remain != null) memoTimer = mt;
  } catch (e) { /* ignore */ }
  function memoSave() { try { localStorage.setItem('yw.memo.timer', JSON.stringify(memoTimer)); } catch (e) { /* ignore */ } }
  function memoRemain() {
    if (memoTimer.running && memoTimer.endAt) return Math.max(0, (memoTimer.endAt - Date.now()) / 1000);
    return memoTimer.remain;
  }
  function memoRender() {
    var el = document.getElementById('memo-timer');
    if (!el) return;
    var rem = memoRemain();
    el.textContent = fmtHMS(rem);
    el.classList.toggle('warn', rem < 60);
    var btn = document.getElementById('memo-btn');
    if (btn) btn.textContent = memoTimer.running ? '暂停' : '开始十分钟';
  }
  function memoStart() {
    if (memoTimer.running) {
      memoTimer.remain = memoRemain();
      memoTimer.running = false; memoTimer.endAt = 0;
    } else {
      if (memoTimer.remain <= 0) memoTimer.remain = 600;
      memoTimer.endAt = Date.now() + memoTimer.remain * 1000;
      memoTimer.running = true;
    }
    memoSave(); memoRender();
  }
  function memoReset() {
    memoTimer = { running: false, endAt: 0, remain: 600 };
    memoSave(); memoRender();
  }
  function memoTick() {
    if (memoTimer.running && memoRemain() <= 0) {
      memoTimer.running = false; memoTimer.endAt = 0; memoTimer.remain = 600;
      addFocus(600, false);
      var r = dayRec(); r.tips = (r.tips || 0) + 1; saveTime();
      beep();
      toast('十分钟到了，今天这条技巧记住了吗？');
      memoSave();
      if (location.hash.indexOf('#/memorize') === 0) route(false);
    }
    memoRender();
  }

  /* ================= 错题本 ================= */
  function wrongList() { return QS.filter(function (q) { return isWrong(attempt(q.qid)); }); }
  function viewWrong() {
    var list = wrongList().sort(function (a, b) { return (attempt(b.qid).ts || 0) - (attempt(a.qid).ts || 0); });
    var favs = QS.filter(function (q) { return state.fav[q.qid]; });
    var html = pageHead('复盘', '错题本', '错题不是收藏品。每次只挑 3 道：重做 → 说出卡点 → 回到知识点 → 再做一道同类题。');
    html += '<div class="grid g3" style="margin-bottom:18px">' +
      statCard('待攻克', list.length + ' 道', '错误 / 部分正确 / 自评不会') +
      statCard('收藏', favs.length + ' 道', '手动星标') +
      statCard('已掌握', progress().right + ' 道', '真题整体') + '</div>';
    if (!list.length) html += emptyHtml('错题本还是空的。去模考或题库做几道，错误会自动进来。');
    else {
      html += '<div class="card">' + list.map(function (q) {
        var a = attempt(q.qid);
        return '<div class="q-row"><div class="qr-main"><a class="qr-stem" href="#/question/' + q.qid + '">' + rich(q.stem) + '</a>' +
          '<div class="qr-meta"><span>' + esc(q.source) + '</span><span>' + typeLabel(q.type) + '</span><span class="badge ' + statusClass(a) + '">' + statusText(a) + '</span>' +
          knowledgeOf(q).map(function (k) { return '<a class="badge" href="#/point/' + k.id + '">' + esc(k.title) + '</a>'; }).join('') + '</div></div>' +
          '<div class="qr-side"><a class="btn sm primary" href="#/question/' + q.qid + '">重做</a><button class="btn sm ghost" data-act="wrong-remove" data-qid="' + q.qid + '">移出</button></div></div>';
      }).join('') + '</div>';
    }
    if (favs.length) {
      html += '<h2>收藏题</h2><div class="card">' + favs.map(function (q) {
        return '<div class="q-row"><div class="qr-main"><a class="qr-stem" href="#/question/' + q.qid + '">' + rich(q.stem) + '</a>' +
          '<div class="qr-meta"><span>' + esc(q.source) + '</span><span>' + typeLabel(q.type) + '</span></div></div>' +
          '<div class="qr-side"><a class="btn sm" href="#/question/' + q.qid + '">打开</a><button class="btn sm ghost" data-act="fav" data-qid="' + q.qid + '">取消收藏</button></div></div>';
      }).join('') + '</div>';
    }
    return html;
  }

  /* ================= 单题练习 ================= */
  function viewQuestion(qid) {
    var q = QMAP[qid];
    if (!q) return viewNotFound('题目');
    var html = pageHead('单题练习', '第 ' + q.no + ' 题', '', '<a href="#/bank">题库</a> / ' + esc(q.source));
    if (q.paperId && q.paperId !== 'extra' && q.paperId !== 'drill') {
      var p = PAPERS.filter(function (x) { return x.id === q.paperId; })[0];
      if (p) {
        html += '<div class="card" style="padding:11px 16px"><div class="btn-row"><span class="small muted">来自整卷：' + esc(p.title) + '</span>' +
          '<a class="btn sm" href="#/paper/' + p.id + '">看整卷</a></div></div>';
      }
    }
    if (q.paperId && q.qid && q.material) {
      var p2 = PAPERS.filter(function (x) { return x.id === q.paperId; })[0];
      if (p2) {
        html += passageHtml(q.material, p2);
        if (q.material === 'm1' && p2.materials.m2) html += passageHtml('m2', p2);
      }
    }
    html += '<div style="margin-top:14px">' + questionCard(q, 'practice') + '</div>';
    var kn = knowledgeOf(q);
    if (kn.length) {
      html += '<h2>本题涉及的知识点</h2><div class="card">' + kn.map(function (k) {
        return '<div class="point-card" style="margin-bottom:8px"><div class="pc-top"><b><a href="#/point/' + k.id + '">' + esc(k.title) + '</a></b><span class="badge">' + esc((CHMAP[k.chapter] || {}).title || '') + '</span></div>' +
          '<p>' + rich(k.summary || '') + '</p></div>';
      }).join('') + '</div>';
    }
    if ((q.pitfalls || []).length) {
      html += '<div class="card" style="margin-top:14px"><div class="k-label">这道题最常见的坑</div><ul class="pitfall-list">' +
        q.pitfalls.map(function (p) { return '<li>' + rich(p) + '</li>'; }).join('') + '</ul></div>';
    }
    var siblings = q.paperId && q.paperId !== 'extra' && q.paperId !== 'drill' ? (PAPERS.filter(function (x) { return x.id === q.paperId; })[0] || {}).questions || [] : [];
    var idx = siblings.indexOf(q);
    if (idx >= 0) {
      html += '<div class="btn-row" style="margin-top:18px">' +
        (idx > 0 ? '<a class="btn" href="#/question/' + siblings[idx - 1].qid + '">← 上一题</a>' : '') +
        (idx < siblings.length - 1 ? '<a class="btn" href="#/question/' + siblings[idx + 1].qid + '">下一题 →</a>' : '') +
        '<a class="btn ghost" href="#/paper/' + q.paperId + '">回到整卷</a></div>';
    }
    return html;
  }
  function viewNotFound(what) {
    return pageHead('未找到', '没有找到这个' + (what || '页面'), '链接可能过期了。') +
      '<div class="btn-row"><a class="btn primary" href="#/home">回首页</a><a class="btn" href="#/bank">去题库</a></div>';
  }

  /* ================= 学习统计 ================= */
  function lastDays(n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = dayKey(d);
      out.push({ key: key, label: (d.getMonth() + 1) + '/' + d.getDate(), rec: timeData.days[key] || { focus: 0, online: 0, pomos: 0 } });
    }
    return out;
  }
  function viewStats() {
    var t = todayStats();
    var days = lastDays(7);
    var maxF = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.rec.focus || 0; })));
    var html = pageHead('记录', '学习统计', '番茄钟负责“专注”，页面在线时间负责“在场”，手动记录补上线下学习。三者分开看，别用在线时长骗自己。');
    html += '<div class="grid g4" style="margin-bottom:18px">' +
      statCard('今日专注', fmtMin(t.focus), t.pomos + ' 个番茄') +
      statCard('今日在线', fmtMin(t.online), '页面可见时累计') +
      statCard('连续学习', t.streak + ' 天', '专注或在线超过 1 分钟') +
      statCard('近 7 天专注', fmtMin(t.week), '番茄 + 记忆模块') + '</div>';

    html += '<div class="grid g2"><div class="card"><div class="card-title"><h3>近 7 天专注</h3><span class="small muted">分钟</span></div><div class="bars">' +
      days.map(function (d) {
        var v = Math.round((d.rec.focus || 0) / 60);
        var h = Math.max(2, Math.round((d.rec.focus || 0) / maxF * 100));
        return '<div class="bar-col"><span class="bv">' + (v || '') + '</span><div class="bar-wrap"><i class="bar" style="height:' + h + '%"></i></div><span class="bl">' + d.label + '</span></div>';
      }).join('') + '</div></div>';

    html += '<div class="card"><div class="card-title"><h3>番茄钟</h3><span class="badge type">' + t.pomos + ' 个 / 今日</span></div>' +
      '<p class="small muted">右下角的番茄钟随时可用：专注 25 分钟，休息 5 分钟；每 4 个番茄进一次长休息。完成的番茄会自动写入今日专注。</p>' +
      '<div class="btn-row"><button class="btn sm primary" data-act="pomo-open">打开番茄钟</button><span class="small muted">当前：' + ({ focus: '专注', short: '短休息', long: '长休息' }[pomo.mode]) + ' ' + fmtHMS(pomoRemain()) + '</span></div>' +
      '<div class="k-section"><div class="k-label">今日节奏</div><div class="small muted">专注 ' + fmtMin(t.focus) + ' · 在线 ' + fmtMin(t.online) + ' · 番茄 ' + t.pomos + ' 个</div></div></div></div>';

    html += '<h2>板块掌握</h2><div class="card">' + moduleBarsHtml() + '</div>';

    var heat = lastDays(30);
    html += '<h2>近 30 天</h2><div class="card"><div class="heat">' +
      heat.map(function (d) {
        var score = (d.rec.focus || 0) + (d.rec.online || 0) * 0.5;
        var lv = score <= 0 ? '' : score < 900 ? 'l1' : score < 2400 ? 'l2' : score < 5400 ? 'l3' : 'l4';
        return '<i class="' + lv + '" title="' + d.key + ' · 专注 ' + fmtMin(d.rec.focus) + ' · 在线 ' + fmtMin(d.rec.online) + '"></i>';
      }).join('') + '</div>' +
      '<div class="sheet-legend" style="margin-top:8px"><span>少</span><i style="background:var(--bg-soft)"></i><i style="background:#dae6e4"></i><i style="background:#b2cac7"></i><i style="background:#82a5a1"></i><i style="background:#5f7d7a"></i><span>多</span></div></div>';

    html += '<h2 id="log">手动记录</h2><div class="card"><p class="small muted">线下刷卷、上课、整理错题都可以记在这里（番茄钟之外的学习时间）。</p>' +
      '<div class="filter-bar" style="box-shadow:none;margin:10px 0 0;padding:0;border:none;background:transparent">' +
      '<input class="text-input" id="log-min" type="number" min="1" max="600" placeholder="分钟" style="width:100px">' +
      '<input class="text-input grow" id="log-note" placeholder="学了什么，例如：2025 新高考Ⅰ卷现代文Ⅱ + 文言实词">' +
      '<button class="btn sm primary" data-act="log-add">记录</button></div>' +
      (timeData.logs && timeData.logs.length ? '<div style="margin-top:12px">' + timeData.logs.slice(0, 10).map(function (l, i) {
        return '<div class="log-row"><span class="lm">' + esc(l.date) + '</span><span class="ln">' + esc(l.note || '学习') + '</span><span class="mono">' + l.minutes + ' 分钟</span><button class="btn sm ghost" data-act="log-del" data-i="' + i + '">删除</button></div>';
      }).join('') + '</div>' : '<p class="small muted" style="margin-top:10px">还没有手动记录。</p>') + '</div>';

    var p = progress();
    html += '<h2>学习进度</h2><div class="grid g2"><div class="card"><div class="k-label">真题 + 模拟</div>' +
      '<div class="stat-card" style="border:none;box-shadow:none;padding:6px 0"><div class="sv">' + p.right + ' / ' + p.total + '</div><div class="sl">做对或自评“会”的题目</div></div>' +
      '<div class="cc-bar" style="height:7px"><i style="width:' + p.pct + '%"></i></div>' +
      '<div class="small muted" style="margin-top:8px">已尝试 ' + p.tried + ' 道 · 错题 ' + p.wrong + ' 道</div></div>' +
      '<div class="card"><div class="k-label">知识点</div>' +
      '<div class="stat-card" style="border:none;box-shadow:none;padding:6px 0"><div class="sv">' + p.kDone + ' / ' + KP.length + '</div><div class="sl">已被真题点亮的考点</div></div>' +
      '<div class="cc-bar" style="height:7px"><i style="width:' + pctOf(p.kDone, KP.length) + '%"></i></div>' +
      '<div class="small muted" style="margin-top:8px">点亮规则：该考点关联的任意一道题做对或自评“会”。</div></div></div>';

    html += '<div class="card" style="margin-top:18px"><div class="card-title"><h3>AI 设置</h3><a class="btn sm" href="#/settings">打开设置</a></div>' +
      '<p class="small muted">默认 DeepSeek（需填 Key）；不填 Key 自动使用内置免费智能体，失败再降级到本地诊断。</p></div>';
    return html;
  }

  /* ================= 设置 ================= */
  function viewSettings() {
    var s = window.YW_AI ? window.YW_AI.settings() : { provider: 'deepseek', key: '', baseUrl: '', model: '' };
    var html = pageHead('设置', '偏好设置', 'AI 通道、外观、高考日期与番茄时长。所有数据只保存在本机浏览器。');
    html += '<div class="card"><div class="card-title"><h3>AI 通道</h3><span class="small muted">用于卡壳分析、主观题批改与作文批改</span></div>' +
      '<div class="radio-row" id="ai-provider">' +
      [['deepseek', 'DeepSeek（推荐）'], ['builtin', '内置免费智能体'], ['custom', '自定义兼容接口']].map(function (p) {
        return '<label class="' + (s.provider === p[0] ? 'on' : '') + '"><input type="radio" name="aip" value="' + p[0] + '"' + (s.provider === p[0] ? ' checked' : '') + '>' + p[1] + '</label>';
      }).join('') + '</div>' +
      '<div class="field"><label>API Key</label><input class="text-input" id="set-key" type="password" value="' + esc(s.key) + '" placeholder="sk-...（仅存本机 localStorage）">' +
      '<div class="hint">留空则自动使用内置免费智能体（llm7.io → Pollinations），无需 Key。Key 在 platform.deepseek.com 创建。</div></div>' +
      '<div class="field"><label>接口地址</label><input class="text-input" id="set-url" value="' + esc(s.baseUrl || '') + '" placeholder="https://api.deepseek.com/v1/chat/completions">' +
      '<div class="hint">兼容 OpenAI 的 /chat/completions 接口均可。</div></div>' +
      '<div class="field"><label>模型</label><input class="text-input" id="set-model" list="model-list" value="' + esc(s.model || '') + '" placeholder="deepseek-chat / deepseek-reasoner">' +
      '<datalist id="model-list"><option value="deepseek-chat"><option value="deepseek-reasoner"></datalist>' +
      '<div class="hint">deepseek-chat 快而稳，适合诊断与批改；deepseek-reasoner 更慢但分析更细。</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-act="settings-save">保存 AI 设置</button><button class="btn ghost" data-act="ai-test">测试连通</button><span class="small muted" id="ai-test-out"></span></div></div>';

    html += '<div class="card"><div class="card-title"><h3>外观与节奏</h3></div>' +
      '<div class="field"><label>主题</label><div class="radio-row">' +
      '<label class="' + (state.theme !== 'dark' ? 'on' : '') + '"><input type="radio" name="theme" value="light"' + (state.theme !== 'dark' ? ' checked' : '') + '>柔和浅色</label>' +
      '<label class="' + (state.theme === 'dark' ? 'on' : '') + '"><input type="radio" name="theme" value="dark"' + (state.theme === 'dark' ? ' checked' : '') + '>护眼深色</label></div></div>' +
      '<div class="field"><label>高考日期（用于首页倒计时）</label><input class="text-input" id="set-exam" type="date" value="' + esc(state.examDate) + '"></div>' +
      '<div class="field"><label>番茄时长（分钟）</label><div class="btn-row">' +
      '<input class="text-input" id="set-focus" type="number" min="1" max="120" value="' + (state.pomo.focus || 25) + '" style="width:84px"> 专注 ' +
      '<input class="text-input" id="set-short" type="number" min="1" max="60" value="' + (state.pomo.short || 5) + '" style="width:84px"> 短休 ' +
      '<input class="text-input" id="set-long" type="number" min="1" max="90" value="' + (state.pomo.long || 15) + '" style="width:84px"> 长休</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-act="settings-save">保存设置</button></div></div>';

    html += '<div class="card" id="import"><div class="card-title"><h3>题库导入（CSV / JSON）</h3><span class="small muted">只存本机浏览器</span></div>' +
      '<p class="small muted">把你自己整理或已获授权的题库导进来，会并入模考与全题库。支持 CSV 与 JSON；导入时逐行校验空题干、空答案、答案不在选项内等问题，错误行会明确提示。</p>' +
      '<div class="btn-row"><label class="btn sm primary" for="ext-file">选择文件导入</label>' +
      '<input type="file" id="ext-file" accept=".csv,.json,text/csv,application/json" hidden>' +
      '<button class="btn sm ghost" data-act="ext-template">下载 CSV 模板</button>' +
      '<button class="btn sm ghost" data-act="ext-export">导出已导入题库</button>' +
      '<button class="btn sm ghost" data-act="ext-clear">清空导入题库</button>' +
      '<span class="small muted">已导入 ' + EXTP.length + ' 套 · ' + EXTP.reduce(function (s, p) { return s + (p.questions || []).length; }, 0) + ' 题</span></div>' +
      '<div class="small" id="ext-report" style="margin-top:8px"></div>' +
      '<div class="k-section"><div class="k-label">CSV 列名</div><p class="small muted" style="margin:4px 0 0">题目内容 / 选项A-D / 正确答案 / 题型（单选·多选·默写·主观·作文）/ 难度（1-5）/ 分值 / 板块 / 知识点 / 解析 / 提示 / 易错 / 技巧。</p></div>' +
      '<div class="k-section"><div class="k-label">JSON 结构</div><p class="small muted" style="margin:4px 0 0">支持数组、<code>{ questions: [...] }</code>、<code>{ bank: {...}, questions: [...] }</code>，以及 <code>{ papers: [{ title, questions }] }</code>。题目字段：stem、type、options、answer、solution、hints、pitfalls、takeaway、knowledge、material。</p></div>' +
      '<div class="k-section"><div class="k-label">来源与合规</div><p class="small muted" style="margin:4px 0 0">优先使用自己整理、学校授权或明确开放许可的题目。公开数据集要先确认许可证；商业题库（含各类“题库 API”）通常受版权保护，大规模抓取并公开分发有法律风险。导入内容仅保存在本机，不会上传。</p></div></div>';

    html += '<div class="card"><div class="card-title"><h3>数据</h3></div>' +
      '<p class="small muted">答题记录、错题本、番茄、在线时长与记忆卡进度均存于本机。换设备不会同步。</p>' +
      '<div class="btn-row"><button class="btn ghost" data-act="data-export">导出数据（JSON）</button><button class="btn danger" data-act="data-clear">清空全部记录</button></div></div>';
    return html;
  }
  function settingsSave() {
    var s = window.YW_AI ? window.YW_AI.settings() : {};
    var keyEl = document.getElementById('set-key');
    var urlEl = document.getElementById('set-url');
    var modelEl = document.getElementById('set-model');
    var provider = (document.querySelector('input[name="aip"]:checked') || {}).value || s.provider;
    if (window.YW_AI) {
      window.YW_AI.save({
        provider: provider,
        key: keyEl ? keyEl.value.trim() : s.key,
        baseUrl: urlEl ? urlEl.value.trim() : s.baseUrl,
        model: modelEl ? modelEl.value.trim() : s.model
      });
    }
    var ex = document.getElementById('set-exam');
    if (ex && ex.value) state.examDate = ex.value;
    var f = document.getElementById('set-focus'), sh = document.getElementById('set-short'), lg = document.getElementById('set-long');
    state.pomo = {
      focus: Math.max(1, parseInt(f && f.value, 10) || 25),
      short: Math.max(1, parseInt(sh && sh.value, 10) || 5),
      long: Math.max(1, parseInt(lg && lg.value, 10) || 15)
    };
    saveState();
    pomoReset();
    toast('设置已保存');
    route(false);
  }
  async function aiTest() {
    var out = document.getElementById('ai-test-out');
    if (!out || !window.YW_AI) return;
    out.textContent = '正在测试…';
    try {
      var r = await window.YW_AI.test();
      out.textContent = '连通正常（' + r.provider + '）';
    } catch (e) {
      out.textContent = '失败：' + (e && e.message ? e.message : '网络错误');
    }
  }
  function dataExport() {
    var blob = new Blob([JSON.stringify({ state: state, time: timeData }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shiwen-backup-' + dayKey() + '.json';
    a.click();
  }
  function dataClear() {
    if (!window.confirm('会清空答题记录、错题本、番茄与在线时长、记忆卡进度。确定吗？')) return;
    state.attempts = {}; state.papers = {}; state.fav = {}; state.memo = { known: {}, read: {} };
    timeData = { days: {}, logs: [] };
    memoState = state.memo;
    saveState(); saveTime();
    toast('已清空');
    route(false);
  }

  /* ================= 题库导入（CSV / JSON） ================= */
  var KID_BY_TITLE = {};
  KP.forEach(function (k) { KID_BY_TITLE[k.title] = k.id; });

  function csvRows(text) {
    var rows = [], row = [], cur = '', q = false;
    text = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else q = false;
        } else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  }
  function normHead(s) {
    return String(s || '').replace(/\uFEFF/g, '').replace(/\s/g, '').toLowerCase();
  }
  var HEAD_ALIAS = {
    stem: ['题目内容', '题干', '题目', 'stem', 'content'],
    A: ['选项a', 'a'],
    B: ['选项b', 'b'],
    C: ['选项c', 'c'],
    D: ['选项d', 'd'],
    answer: ['正确答案', '答案', 'answer', 'key'],
    type: ['题型', 'type'],
    difficulty: ['难度', 'difficulty'],
    score: ['分值', 'score'],
    section: ['板块', '模块', 'section'],
    knowledge: ['知识点', 'knowledge'],
    solution: ['解析', 'analysis', 'solution'],
    hints: ['提示', 'hint', 'hints'],
    pitfalls: ['易错', 'pitfalls', 'pitfall'],
    takeaway: ['技巧', '方法', 'takeaway'],
    source: ['来源', 'source'],
    year: ['年份', 'year']
  };
  function headIndex(head) {
    var map = {};
    Object.keys(HEAD_ALIAS).forEach(function (k) {
      for (var i = 0; i < head.length; i++) {
        if (HEAD_ALIAS[k].indexOf(head[i]) >= 0) { map[k] = i; return; }
      }
    });
    return map;
  }
  function mapType(t) {
    t = String(t || '').toLowerCase();
    if (/多选/.test(t) || t === 'multiple') return 'multiple';
    if (/默写|填空|blank|fill/.test(t)) return 'blank';
    if (/作文|写作|essay/.test(t)) return 'essay';
    if (/主观|简答|问答|解答|subjective|solve/.test(t)) return 'subjective';
    return 'single';
  }
  function splitList(s) {
    return String(s || '').split(/[；;|｜\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function mapKnowledge(s) {
    if (!s) return [];
    var arr = Array.isArray(s) ? s : splitList(s);
    var out = [];
    arr.forEach(function (x) {
      x = String(x).trim();
      if (KMAP[x]) out.push(x);
      else if (KID_BY_TITLE[x]) out.push(KID_BY_TITLE[x]);
    });
    return out.filter(function (x, i) { return out.indexOf(x) === i; });
  }
  function defaultScore(type) {
    return type === 'essay' ? 60 : type === 'blank' ? 6 : type === 'subjective' ? 4 : 3;
  }
  function buildQuestion(raw, no, paper) {
    var type = mapType(raw.type || raw['题型'] || '');
    var stem = String(raw.stem || raw['题干'] || raw['题目内容'] || raw['题目'] || '').trim();
    var options = [];
    if (Array.isArray(raw.options)) {
      raw.options.forEach(function (o, i) {
        if (typeof o === 'string') options.push({ k: String.fromCharCode(65 + i), t: o });
        else options.push({ k: o.k || String.fromCharCode(65 + i), t: o.t || o.text || o.content || '' });
      });
    } else if (raw.options && typeof raw.options === 'object') {
      Object.keys(raw.options).forEach(function (k) { options.push({ k: k, t: String(raw.options[k]) }); });
    }
    ['A', 'B', 'C', 'D'].forEach(function (k) {
      var v = raw[k] || raw['选项' + k] || raw['选项' + k.toLowerCase()];
      if (v && !options.some(function (o) { return o.k === k; })) options.push({ k: k, t: String(v) });
    });
    options = options.filter(function (o) { return String(o.t).trim(); });
    var answer = String(raw.answer || raw['正确答案'] || raw['答案'] || '').trim();
    var solution = raw.solution || raw['解析'] || raw['analysis'] || '';
    if (!Array.isArray(solution)) solution = splitList(solution);
    var hints = raw.hints || raw['提示'] || '';
    if (!Array.isArray(hints)) hints = splitList(hints);
    var pitfalls = raw.pitfalls || raw['易错'] || '';
    if (!Array.isArray(pitfalls)) pitfalls = splitList(pitfalls);
    var q = {
      no: no,
      type: type,
      score: parseInt(raw.score || raw['分值'], 10) || defaultScore(type),
      difficulty: Math.max(1, Math.min(5, parseInt(raw.difficulty || raw['难度'], 10) || 3)),
      section: String(raw.section || raw['板块'] || raw['模块'] || '外部题库').trim(),
      stem: stem,
      options: options,
      answer: answer,
      accept: [],
      solution: solution,
      hints: hints,
      pitfalls: pitfalls,
      takeaway: String(raw.takeaway || raw['技巧'] || raw['方法'] || '').trim(),
      knowledge: mapKnowledge(raw.knowledge || raw['知识点'] || '')
    };
    if (type === 'blank') {
      var parts = splitList(answer);
      if (parts.length > 1) {
        q.blanks = parts.map(function (x) { return { answer: x, accept: [] }; });
      }
    }
    var matText = raw.material || raw['材料'] || raw['阅读材料'] || raw.passage;
    if (matText && typeof matText === 'string') {
      var key = 'm' + no;
      paper.materials[key] = { title: raw.materialTitle || '阅读材料', text: String(matText) };
      q.material = key;
    }
    return q;
  }
  function validateQuestion(q, rowLabel) {
    if (!q.stem) return rowLabel + '：题干为空';
    if (!q.answer && q.type !== 'essay') return rowLabel + '：答案为空';
    if (q.type === 'single') {
      if (q.options.length < 2) return rowLabel + '：单选题至少需要两个选项';
      var letters = q.options.map(function (o) { return o.k.toUpperCase(); });
      if (letters.indexOf(q.answer.toUpperCase()) < 0) return rowLabel + '：正确答案不在选项 A-D 中';
    }
    if (q.type === 'multiple') {
      if (q.options.length < 2) return rowLabel + '：多选题至少需要两个选项';
      var ls = q.options.map(function (o) { return o.k.toUpperCase(); });
      var okAll = q.answer.toUpperCase().split('').every(function (c) { return ls.indexOf(c) >= 0; });
      if (!okAll) return rowLabel + '：多选答案含选项中没有的字母';
    }
    return '';
  }
  function newPaper(title) {
    return {
      id: 'ext-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      title: title || '我的导入题库',
      short: title || '导入题库',
      year: new Date().getFullYear(),
      region: '外部题库',
      kind: 'ext',
      duration: 150,
      note: '本地导入',
      materials: {},
      questions: []
    };
  }
  function csvToPaper(rows, name) {
    var head = rows[0].map(normHead);
    var map = headIndex(head);
    if (map.stem == null) throw new Error('CSV 缺少「题目内容 / 题干」列');
    var paper = newPaper(name);
    var errors = [];
    rows.slice(1).forEach(function (r, idx) {
      var get = function (k) { return map[k] != null ? String(r[map[k]] || '').trim() : ''; };
      var raw = {
        stem: get('stem'), A: get('A'), B: get('B'), C: get('C'), D: get('D'),
        answer: get('answer'), type: get('type'), difficulty: get('difficulty'), score: get('score'),
        section: get('section'), knowledge: get('knowledge'), solution: get('solution'),
        hints: get('hints'), pitfalls: get('pitfalls'), takeaway: get('takeaway')
      };
      var q = buildQuestion(raw, paper.questions.length + 1, paper);
      var err = validateQuestion(q, '第 ' + (idx + 2) + ' 行');
      if (err) errors.push(err);
      else {
        q.source = (get('source') || name) + ' · 第 ' + q.no + ' 题';
        paper.questions.push(q);
      }
    });
    return { papers: paper.questions.length ? [paper] : [], errors: errors };
  }
  function jsonToPapers(obj, name) {
    var list = Array.isArray(obj) ? obj : obj.papers || (obj.questions ? [obj] : []);
    if (!Array.isArray(list) || !list.length) throw new Error('JSON 里没有找到 papers 或 questions 数组');
    // 纯题目数组
    if (list[0] && !list[0].questions && (list[0].stem || list[0]['题干'])) {
      list = [{ title: (obj.bank && (obj.bank.title || obj.bank.name)) || name, questions: list }];
    }
    var papers = [], errors = [];
    list.forEach(function (rp, pi) {
      var title = rp.title || rp.name || (rp.bank && (rp.bank.title || rp.bank.name)) || (name + (list.length > 1 ? ' ' + (pi + 1) : ''));
      var paper = newPaper(title);
      paper.year = parseInt(rp.year, 10) || paper.year;
      paper.region = rp.region || '外部题库';
      paper.materials = rp.materials || {};
      (rp.questions || rp.items || []).forEach(function (raw, qi) {
        var q = buildQuestion(raw, paper.questions.length + 1, paper);
        var err = validateQuestion(q, '第 ' + (pi + 1) + ' 套第 ' + (qi + 1) + ' 题');
        if (err) errors.push(err);
        else paper.questions.push(q);
      });
      if (paper.questions.length) papers.push(paper);
    });
    return { papers: papers, errors: errors };
  }
  function extReport(html) {
    var box = document.getElementById('ext-report');
    if (box) box.innerHTML = html;
  }
  var importing = false;
  function importExt(file) {
    if (importing) return;
    importing = true;
    setTimeout(function () { importing = false; }, 2500);
    extReport('<span class="muted">正在读取 ' + esc(file.name) + ' …</span>');
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || '');
      var name = file.name.replace(/\.(csv|json)$/i, '');
      var res;
      try {
        res = /\.json$/i.test(file.name) ? jsonToPapers(JSON.parse(text), name) : csvToPaper(csvRows(text), name);
      } catch (e) {
        extReport('<div class="fb err"><span>✕</span><div>' + esc(e.message || '文件无法解析') + '</div></div>');
        return;
      }
      var errHtml = res.errors.length ? '<div class="fb warn" style="margin-top:8px"><span>△</span><div>有 ' + res.errors.length + ' 行未导入：' + esc(res.errors.slice(0, 8).join('；')) + (res.errors.length > 8 ? ' 等' : '') + '</div></div>' : '';
      if (!res.papers.length) {
        extReport('<div class="fb err"><span>✕</span><div>没有可导入的题目。请检查列名与必填项。</div></div>' + errHtml);
        return;
      }
      try {
        var all = JSON.parse(localStorage.getItem(EKEY) || '[]');
        if (!Array.isArray(all)) all = [];
        res.papers.forEach(function (p) { all.push(p); });
        localStorage.setItem(EKEY, JSON.stringify(all));
      } catch (e) {
        extReport('<div class="fb err"><span>✕</span><div>浏览器存储空间不足，导入失败。</div></div>');
        return;
      }
      var count = res.papers.reduce(function (s, p) { return s + p.questions.length; }, 0);
      extReport('<div class="fb ok"><span>✓</span><div>已导入 ' + res.papers.length + ' 套 / ' + count + ' 道题，页面即将刷新。</div></div>' + errHtml);
      setTimeout(function () { location.reload(); }, 1600);
    };
    reader.onerror = function () { extReport('<div class="fb err"><span>✕</span><div>文件读取失败。</div></div>'); };
    reader.readAsText(file, 'utf-8');
  }
  function csvTemplate() {
    var rows = [
      ['题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '题型', '难度', '分值', '板块', '知识点', '解析', '提示', '易错', '技巧'],
      ['下列对材料相关内容的理解和分析，正确的一项是（ ）', '选项一', '选项二', '选项三', '选项四', 'B', '单选', '2', '3', '现代文阅读Ⅰ', '选项比对：六类设错方式', 'A项错在范围扩大；B项正确；C项无中生有；D项强加因果。', '先定位原文，再比对范围词', '把材料二的观点当成材料一的观点', '选项比对三步：定位—划线—比对'],
      ['补写出下列句子中的空缺部分。（1）……（2）……', '', '', '', '', '答案一；答案二', '默写', '2', '6', '名篇名句默写', '情境默写的三步定位', '出自《劝学》，注意“锲”的写法。', '先抓情境关键词', '“锲”不要写成“契”', '先定篇目，再定句子，最后抠字']
    ];
    var csv = rows.map(function (r) {
      return r.map(function (x) {
        x = String(x == null ? '' : x);
        return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
      }).join(',');
    }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '拾文-题库导入模板.csv';
    a.click();
  }
  function extExport() {
    var blob = new Blob([JSON.stringify(EXTP, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shiwen-ext-bank-' + dayKey() + '.json';
    a.click();
  }
  function extClear() {
    if (!window.confirm('会删除所有通过 CSV / JSON 导入的题库（内置题库不受影响）。确定吗？')) return;
    localStorage.removeItem(EKEY);
    toast('已清空导入题库');
    setTimeout(function () { location.reload(); }, 600);
  }

  /* ================= 侧栏 / 目录 ================= */
  function sideLink(href, label, active, cnt) {
    return '<a class="side-link' + (active ? ' active' : '') + '" href="' + href + '">' + label +
      (cnt != null ? '<span class="cnt">' + cnt + '</span>' : '') + '</a>';
  }
  function sidebarHtml(main, seg) {
    var html = '';
    if (main === 'home') {
      html += '<div class="side-group"><div class="side-title">开始</div>' +
        sideLink('#/papers', '真题模考', false, PAPERS.length) +
        sideLink('#/knowledge', '知识点图谱', false, KP.length) +
        sideLink('#/memorize', '十分钟记忆', false, MEMO.tips.length) +
        sideLink('#/bank', '全题库', false, QS.length) +
        '</div><div class="side-group"><div class="side-title">复盘</div>' +
        sideLink('#/wrong', '错题本', false, wrongList().length) +
        sideLink('#/stats', '学习统计', false) +
        '</div>';
    } else if (main === 'knowledge' || main === 'point') {
      html += '<div class="side-group"><div class="side-title">知识点</div>' +
        sideLink('#/knowledge', '全部章节', !seg[1], CH.length);
      html += CH.map(function (c) {
        return sideLink('#/knowledge/' + c.id, esc(c.title), seg[1] === c.id, pointsOfChapter(c.id).length);
      }).join('');
      html += '</div>';
      if (main === 'point') {
        var k = KMAP[seg[1]];
        if (k) {
          html += '<div class="side-group"><div class="side-title">' + esc((CHMAP[k.chapter] || {}).title || '') + '</div>' +
            pointsOfChapter(k.chapter).map(function (p) {
              return sideLink('#/point/' + p.id, esc(p.title), p.id === k.id);
            }).join('') + '</div>';
        }
      }
    } else if (main === 'papers') {
      html += '<div class="side-group"><div class="side-title">模考</div>' +
        sideLink('#/papers', '全部试卷', !seg[1], PAPERS.length) + '</div>';
      html += '<div class="side-group"><div class="side-title">真题改编</div>' + PAPERS.filter(function (p) { return p.kind === 'real'; }).map(function (p) {
        return sideLink('#/paper/' + p.id, esc(p.short), seg[0] === 'paper' && seg[1] === p.id);
      }).join('') + '</div>';
      html += '<div class="side-group"><div class="side-title">模拟卷</div>' + PAPERS.filter(function (p) { return p.kind === 'mock'; }).map(function (p) {
        return sideLink('#/paper/' + p.id, esc(p.short), seg[0] === 'paper' && seg[1] === p.id);
      }).join('') + '</div>';
    } else if (main === 'paper') {
      var p = PAPERS.filter(function (x) { return x.id === seg[1]; })[0];
      html += '<div class="side-group"><div class="side-title">' + esc(p ? p.short : '试卷') + '</div>' +
        sideLink('#/papers', '返回全部试卷') + '</div>';
      if (p) {
        html += '<div class="side-group"><div class="side-title">题号</div><div class="chips" style="padding:4px 8px">' +
          p.questions.map(function (q) { return '<a class="badge" href="#/question/' + q.qid + '">' + q.no + '</a>'; }).join('') + '</div></div>';
      }
    } else if (main === 'memorize') {
      html += '<div class="side-group"><div class="side-title">十分钟记忆</div>' +
        sideLink('#/memorize', '今日技巧', true) +
        sideLink('#/knowledge', '知识点', false, KP.length) +
        sideLink('#/stats', '学习统计', false) + '</div>';
    } else if (main === 'bank') {
      html += '<div class="side-group"><div class="side-title">题库</div>' +
        sideLink('#/bank', '全部题目', !seg[1], QS.length) +
        sideLink('#/bank/drill', '专项提升', seg[1] === 'drill', DRILL.length + EXTRA.length) + '</div>' +
        '<div class="side-group"><div class="side-title">按板块</div>' + CH.map(function (c) {
          return '<a class="side-link" href="#/bank" data-bank-ch="' + c.id + '">' + esc(c.title) + '<span class="cnt">' + questionsOfChapter(c.id).length + '</span></a>';
        }).join('') + '</div>';
    } else if (main === 'wrong') {
      html += '<div class="side-group"><div class="side-title">复盘</div>' +
        sideLink('#/wrong', '错题本', true, wrongList().length) +
        sideLink('#/stats', '学习统计', false) + '</div>';
    } else if (main === 'stats') {
      html += '<div class="side-group"><div class="side-title">统计</div>' +
        sideLink('#/stats', '学习统计', true) +
        sideLink('#/wrong', '错题本', false, wrongList().length) +
        sideLink('#/settings', '设置', false) + '</div>';
    } else if (main === 'settings') {
      html += '<div class="side-group"><div class="side-title">设置</div>' +
        sideLink('#/settings', '偏好设置', true) +
        sideLink('#/stats', '学习统计', false) + '</div>';
    }
    return html;
  }
  function tocHtml(main, seg) {
    if (main === 'point') {
      return '<div class="toc-title">本页</div>' +
        '<a href="#k-core">核心讲解</a><a href="#k-signal" class="lv3">题干信号</a><a href="#k-steps" class="lv3">操作步骤</a>' +
        '<a href="#k-trap" class="lv3">常见失分</a><a href="#k-example">最小示例</a><a href="#k-method">可套用方法</a><a href="#k-related">关联题目</a>';
    }
    if (main === 'memorize') return '<div class="toc-title">本页</div><a href="#memo-tip">今日技巧</a><a href="#memo-deck">记忆卡</a><a href="#memo-next">接下来的技巧</a>';
    if (main === 'stats') return '<div class="toc-title">本页</div><a href="#log">手动记录</a>';
    if (main === 'papers') return '';
    return '';
  }
  function pageHead(eyebrow, title, lede, crumbs) {
    return '<div class="page-head">' + (crumbs ? '<div class="crumbs">' + crumbs + '</div>' : '') +
      '<div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1>' +
      (lede ? '<p class="lede">' + lede + '</p>' : '') + '</div>';
  }
  function emptyHtml(text) { return '<div class="empty">' + text + '</div>'; }

  /* ================= 搜索 ================= */
  function searchAll(kw) {
    kw = kw.trim().toLowerCase();
    if (!kw) return [];
    var out = [];
    QS.forEach(function (q) {
      var hay = (q.stem + ' ' + q.source + ' ' + (q.knowledge || []).map(function (id) { return KMAP[id] ? KMAP[id].title : ''; }).join(' ')).toLowerCase();
      if (hay.indexOf(kw) >= 0) out.push({ type: '题', title: q.stem.slice(0, 70), sub: q.source, href: '#/question/' + q.qid });
    });
    KP.forEach(function (k) {
      if ((k.title + ' ' + (k.summary || '')).toLowerCase().indexOf(kw) >= 0) out.push({ type: '知识点', title: k.title, sub: k.summary || '', href: '#/point/' + k.id });
    });
    MEMO.tips.forEach(function (t) {
      if ((t.title + ' ' + t.body).toLowerCase().indexOf(kw) >= 0) out.push({ type: '技巧', title: t.title, sub: t.body.slice(0, 40), href: '#/memorize' });
    });
    return out.slice(0, 20);
  }
  function renderSearch() {
    var input = document.getElementById('search-input');
    var box = document.getElementById('search-results');
    if (!input || !box) return;
    var list = searchAll(input.value);
    if (!input.value.trim()) { box.innerHTML = '<p class="search-hint">输入关键词开始搜索；回车打开第一条结果。</p>'; return; }
    if (!list.length) { box.innerHTML = '<p class="search-hint">没有找到相关结果。</p>'; return; }
    box.innerHTML = list.map(function (r) {
      return '<a class="sr-item" href="' + r.href + '"><span class="sr-title"><span class="badge">' + r.type + '</span>' + esc(r.title) + '</span><span class="sr-sub">' + esc(r.sub) + '</span></a>';
    }).join('');
  }

  /* ================= 路由 ================= */
  var lastHash = '';
  function route(scroll) {
    var hash = location.hash || '#/home';
    var seg = hash.replace(/^#\/?/, '').split('/');
    var main = seg[0] || 'home';
    var html = '';
    activePaper = null;
    if (main === 'home') html = viewHome();
    else if (main === 'knowledge') html = seg[1] ? viewChapter(seg[1]) : viewKnowledge();
    else if (main === 'point') html = viewPoint(seg[1]);
    else if (main === 'papers') html = viewPapers();
    else if (main === 'paper') html = viewPaper(seg[1]);
    else if (main === 'bank') html = viewBank();
    else if (main === 'memorize') html = viewMemorize();
    else if (main === 'wrong') html = viewWrong();
    else if (main === 'stats') html = viewStats();
    else if (main === 'settings') html = viewSettings();
    else if (main === 'question') html = viewQuestion(seg[1]);
    else html = viewNotFound();

    var content = document.getElementById('content');
    content.innerHTML = html;
    var side = document.getElementById('sidebar');
    side.innerHTML = sidebarHtml(main, seg);
    var toc = document.getElementById('toc');
    toc.innerHTML = tocHtml(main, seg);
    if (!toc.innerHTML) toc.style.display = 'none'; else toc.style.display = '';
    document.querySelector('.layout').classList.toggle('no-toc', !toc.innerHTML);

    var tabMap = { home: 'home', knowledge: 'knowledge', point: 'knowledge', papers: 'papers', paper: 'papers', bank: 'bank', memorize: 'memorize', wrong: 'wrong', stats: 'stats', settings: '' };
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-tab') === tabMap[main]);
    });
    if (scroll !== false && hash !== lastHash) scrollTop();
    lastHash = hash;
    if (main === 'paper') setTimeout(updateExamBar, 0);
    if (main === 'bank') setTimeout(renderBankList, 0);
    if (main === 'memorize') setTimeout(memoRender, 0);
    document.getElementById('sidebar').classList.remove('open');
  }

  /* ================= 事件 ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    var qid = t.getAttribute('data-qid');
    var pid = t.getAttribute('data-pid');
    if (act === 'opt') {
      var inPaper = location.hash.indexOf('#/paper/') === 0;
      var oq = QMAP[qid];
      var key = t.getAttribute('data-key');
      if (oq && oq.type === 'multiple') {
        var cur = String(getInput(oq) || '');
        var next = cur.indexOf(key) >= 0 ? cur.replace(key, '') : (cur + key).split('').sort().join('');
        saveInput(qid, next);
        if (!inPaper) {
          submitQuestion(qid);
        } else {
          var mc = findCard(qid);
          var mbox = mc && mc.querySelector('.options');
          if (mbox) mbox.outerHTML = optionsHtml(oq, next, false);
          updateExamBar();
        }
        return;
      }
      saveInput(qid, key);
      if (!inPaper) {
        submitQuestion(qid);
      } else {
        var card = findCard(qid);
        var box = card && card.querySelector('.options');
        if (box) box.outerHTML = optionsHtml(QMAP[qid], t.getAttribute('data-key'), false);
        updateExamBar();
      }
    } else if (act === 'submit') {
      submitQuestion(qid);
    } else if (act === 'hint') {
      toggleHint(qid);
    } else if (act === 'show-solution') {
      toggleSolution(qid);
    } else if (act === 'fav') {
      toggleFav(qid);
    } else if (act === 'self') {
      setSelf(qid, t.getAttribute('data-v'));
    } else if (act === 'retry') {
      setAttempt(qid, { status: '' });
      refreshCard(QMAP[qid], 'practice');
    } else if (act === 'ai-toggle') {
      var panel = t.parentNode.querySelector('.ai-body');
      if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
    } else if (act === 'ai-diagnose') {
      runAI(qid, 'diagnose');
    } else if (act === 'ai-grade') {
      runAI(qid, 'grade');
    } else if (act === 'ai-essay') {
      runAI(qid, 'essay');
    } else if (act === 'passage-toggle') {
      var box = t.closest('.passage');
      if (box) {
        var clipped = box.classList.toggle('clipped');
        t.textContent = clipped ? '展开全文 ↓' : '收起 ↑';
      }
    } else if (act === 'paper-start') {
      startPaper(pid);
    } else if (act === 'paper-pause') {
      pausePaper(pid);
    } else if (act === 'paper-submit') {
      submitPaper(pid || (activePaper && activePaper.id), false);
    } else if (act === 'paper-reset') {
      resetPaper(pid);
    } else if (act === 'sheet-jump') {
      var no = t.getAttribute('data-no');
      var card = document.querySelector('.qcard[id$="-' + no + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'bank-page') {
      bank.page = parseInt(t.getAttribute('data-page'), 10) || 1;
      renderBankList();
    } else if (act === 'bank-reset') {
      bank = { kw: '', ch: '', type: '', diff: '', kind: '', page: 1 };
      route(false);
    } else if (act === 'memo-tag') {
      memoFilter = t.getAttribute('data-tag');
      route(false);
    } else if (act === 'card-flip') {
      toggleCard(t);
    } else if (act === 'card-known') {
      e.stopPropagation();
      markKnown(parseInt(t.getAttribute('data-i'), 10));
    } else if (act === 'memo-start') {
      memoStart();
    } else if (act === 'memo-reset') {
      memoReset();
    } else if (act === 'wrong-remove') {
      delete state.attempts[qid];
      saveState();
      toast('已移出错题本');
      route(false);
    } else if (act === 'pomo-open') {
      var w = document.getElementById('pomo-widget');
      if (w) w.hidden = false;
    } else if (act === 'pomo-collapse') {
      var w2 = document.getElementById('pomo-widget');
      if (w2) w2.hidden = true;
    } else if (act === 'pomo-start') {
      pomoStart();
    } else if (act === 'pomo-reset') {
      pomoReset();
    } else if (act === 'pomo-mode') {
      pomoSetMode(t.getAttribute('data-mode'));
    } else if (act === 'log-add') {
      var minEl = document.getElementById('log-min');
      var noteEl = document.getElementById('log-note');
      var mins = parseInt(minEl && minEl.value, 10);
      if (!mins || mins <= 0) { toast('先填分钟数'); return; }
      var r = dayRec();
      r.focus = (r.focus || 0) + mins * 60;
      timeData.logs.unshift({ date: dayKey(), note: noteEl && noteEl.value ? noteEl.value : '线下学习', minutes: mins });
      timeData.logs = timeData.logs.slice(0, 60);
      saveTime();
      toast('已记录 ' + mins + ' 分钟');
      route(false);
    } else if (act === 'log-del') {
      var i = parseInt(t.getAttribute('data-i'), 10);
      timeData.logs.splice(i, 1);
      saveTime();
      route(false);
    } else if (act === 'settings-save') {
      settingsSave();
    } else if (act === 'ai-test') {
      aiTest();
    } else if (act === 'data-export') {
      dataExport();
    } else if (act === 'data-clear') {
      dataClear();
    } else if (act === 'explain') {
      runExplain(t.getAttribute('data-kid'));
    } else if (act === 'essay-insert') {
      essayInsert(qid, t.getAttribute('data-tpl'));
    } else if (act === 'ext-template') {
      csvTemplate();
    } else if (act === 'ext-export') {
      extExport();
    } else if (act === 'ext-clear') {
      extClear();
    }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-fill')) {
      saveInput(el.getAttribute('data-fill'), el.value);
      var wc = document.getElementById('wc-' + el.getAttribute('data-fill'));
      if (wc) wc.textContent = el.value.replace(/\s/g, '').length;
    }
    if (el.hasAttribute && el.hasAttribute('data-blank')) {
      var qid = el.getAttribute('data-blank');
      var card = findCard(qid);
      if (!card) return;
      var inputs = card.querySelectorAll('[data-blank="' + qid + '"]');
      var vals = [];
      Array.prototype.forEach.call(inputs, function (x) { vals.push(x.value); });
      saveInput(qid, vals.join('\n'));
      if (location.hash.indexOf('#/paper/') === 0) updateExamBar();
    }
  });

  document.addEventListener('change', function (e) {
    var id = e.target.id;
    if (id === 'ext-file' && e.target.files && e.target.files[0]) importExt(e.target.files[0]);
    if (id === 'bank-kw' || id === 'bank-ch' || id === 'bank-type' || id === 'bank-diff' || id === 'bank-kind') bankApply();
    if (e.target.name === 'theme') {
      state.theme = e.target.value;
      document.documentElement.setAttribute('data-theme', state.theme);
      saveState();
      route(false);
    }
    if (e.target.name === 'aip') {
      Array.prototype.forEach.call(document.querySelectorAll('#ai-provider label'), function (l) {
        l.classList.toggle('on', l.querySelector('input').checked);
      });
    }
  });

  document.addEventListener('click', function (e) {
    var chLink = e.target.closest ? e.target.closest('[data-bank-ch]') : null;
    if (chLink) {
      e.preventDefault();
      bank.ch = chLink.getAttribute('data-bank-ch');
      bank.kind = '';
      bank.page = 1;
      location.hash = '#/bank';
      route(false);
    }
  });

  /* 搜索与快捷键 */
  var overlay = document.getElementById('search-overlay');
  var searchInput = document.getElementById('search-input');
  function openSearch() {
    overlay.hidden = false;
    setTimeout(function () { searchInput.focus(); }, 30);
  }
  function closeSearch() { overlay.hidden = true; }
  document.getElementById('search-open').addEventListener('click', openSearch);
  document.getElementById('search-close').addEventListener('click', closeSearch);
  searchInput.addEventListener('input', renderSearch);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var first = document.querySelector('#search-results .sr-item');
      if (first) { location.href = first.getAttribute('href'); closeSearch(); }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault(); openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      document.getElementById('sidebar').classList.remove('open');
    }
  });

  document.getElementById('menu-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('theme-toggle').addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState();
    toast(state.theme === 'dark' ? '已切换护眼深色' : '已切换柔和浅色');
  });
  document.getElementById('pomo-mini').addEventListener('click', function () {
    var w = document.getElementById('pomo-widget');
    if (w) w.hidden = !w.hidden;
  });

  /* ================= 启动 ================= */
  document.documentElement.setAttribute('data-theme', state.theme || 'light');
  mountPomo();
  window.addEventListener('hashchange', function () { route(true); });
  if (!location.hash) location.hash = '#/home';
  route(false);
  setInterval(tickOnline, 1000);
  setInterval(tickPomo, 1000);
  setInterval(memoTick, 1000);
  setInterval(function () {
    if (location.hash.indexOf('#/paper/') === 0) updateExamBar();
  }, 1000);
})();
