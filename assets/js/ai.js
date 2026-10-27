/* 拾文 · AI 接入层：DeepSeek / 内置免费智能体 / 自定义 OpenAI 兼容接口
 * 所有请求由浏览器直连；失败时页面自动降级为本地诊断。
 */
(function () {
  'use strict';

  var BUILTIN = [
    { name: 'llm7.io', url: 'https://api.llm7.io/v1/chat/completions', model: 'gpt-oss:20b' },
    { name: 'Pollinations', url: 'https://text.pollinations.ai/openai', model: 'openai' }
  ];
  var DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

  function settings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem('yw.ai.v1') || '{}'); } catch (e) { s = {}; }
    return {
      provider: s.provider || 'deepseek',
      baseUrl: s.baseUrl || DEEPSEEK_URL,
      model: s.model || 'deepseek-chat',
      key: s.key || ''
    };
  }

  function save(patch) {
    var s = settings();
    Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; });
    localStorage.setItem('yw.ai.v1', JSON.stringify(s));
    return s;
  }

  function answerText(q) {
    if (!q) return '';
    if (q.type === 'blank' && q.blanks) {
      return q.blanks.map(function (b, i) { return '（' + (i + 1) + '）' + b.answer; }).join('；');
    }
    return q.answer || '';
  }

  function compact(q) {
    return {
      stem: q.stem,
      type: q.type,
      section: q.section || '',
      answer: answerText(q),
      options: (q.options || []).map(function (o) { return o.k + '. ' + o.t; }).join(' | '),
      solution: (q.solution || []),
      pitfalls: q.pitfalls || [],
      takeaway: q.takeaway || '',
      source: q.source || '',
      material: q.materialText ? String(q.materialText).slice(0, 1600) : ''
    };
  }

  function typeName(t) {
    return { single: '单项选择', blank: '默写填空', subjective: '主观简答', essay: '作文' }[t] || t;
  }

  function buildDiagnose(q, work, self, kn) {
    var c = compact(q);
    var system = '你是高三语文备考教练，熟悉新高考Ⅰ/Ⅱ卷的命题方式与评分细则。你的任务是诊断学生卡壳的真正原因，' +
      '把问题拆成“知识点层”和“真题层”两部分，要求直接、具体、可执行，像一位有经验的语文老师在旁边点拨。' +
      '必须使用简体中文；不要使用代码块；不要编造原文没有的条件；不要整段复述参考答案。';
    var user = [
      '学生正在做一道高考语文题，请分析他的思路问题。',
      '',
      '【题型】' + typeName(c.type) + '（' + c.section + '），来源：' + c.source,
      c.material ? '【阅读材料（节选）】' + c.material : '',
      '【题目】' + c.stem,
      c.options ? '【选项】' + c.options : '',
      '【参考答案】' + c.answer,
      '【参考解析】\n' + c.solution.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'),
      '【涉及知识点】' + (kn || []).map(function (k) { return k.title + '（' + (k.summary || '') + '）'; }).join('；'),
      '【常见错误】' + c.pitfalls.join('；'),
      '【学生的作答 / 思路】' + (work && work.trim() ? work.trim() : '（学生完全没思路，或不愿写）'),
      '【学生自评】' + (self || '未自评'),
      '',
      '严格按以下结构输出，总字数 550-750：',
      '## 卡点定位',
      '第一行用粗体标注类型（读不懂文本 / 审题偏差 / 答题角度缺失 / 术语不熟 / 表达空泛 / 时间不够），再用 2-3 句说明具体卡在哪里。若学生写了答案，必须指出他的第一个问题出在哪。',
      '## 知识点层：需要补什么',
      '3-4 条 bullet，格式：**知识点名** —— 它在这道题里承担什么作用。只讲知识与方法本身，不写本题的具体答案。',
      '## 真题层：这道题怎么切入',
      '3-4 条 bullet，每条写“看到什么题干/文本信号 → 做什么动作 → 落到哪个答题角度”，点出关键，但不要写出完整答案。',
      '## 提示阶梯',
      '两条由浅入深的提示：第一条只指方向，第二条可以点出关键原文位置或答题术语。',
      '## 练有所获',
      '- 一句可以背下来的方法或术语',
      '- 一条同类题的加练建议（写清练什么文本、什么设问）'
    ].filter(Boolean).join('\n');
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }

  function buildGrade(q, myAnswer) {
    var c = compact(q);
    var system = '你是高三语文阅卷老师。请按新高考语文主观题的采分点规则点评学生答案，必须使用简体中文，' +
      '不要使用代码块，不要人身评价，不要因为字迹问题扣分。';
    var user = [
      '【题目】' + c.stem,
      '【参考答案】' + c.answer,
      '【参考解析】\n' + c.solution.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'),
      '【学生答案】' + (myAnswer || '（空）'),
      '',
      '请按以下结构输出（450 字以内）：',
      '## 预估得分',
      '给出该题得分率（0-100%）与预计得分（按本题满分' + (q.score || 6) + '分折算），说明踩到了哪几个采分点。',
      '## 采分点对照',
      '逐条列出参考答案的采分点，标注学生“已答到 / 答偏 / 漏答”。',
      '## 关键问题',
      '2-3 条，指出答案在角度、术语、文本依据或层次上的问题。',
      '## 补一句',
      '用一句话补上学生缺失的关键采分点。',
      '## 下一步',
      '一句可执行的改进建议（例如：以后先写术语再举文本）。'
    ].join('\n');
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }

  function buildEssay(q, myAnswer) {
    var c = compact(q);
    var system = '你是资深高考语文作文阅卷组老师，熟悉 60 分制议论文的评分标准（内容 20 + 表达 20 + 发展等级 20）。' +
      '请用简体中文点评，语气直接但不打击人，不要使用代码块。';
    var user = [
      '【作文题】' + c.stem,
      '【参考立意与解析】\n' + c.solution.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'),
      '【学生作文】\n' + (myAnswer || '（空）'),
      '',
      '请按以下结构输出（600 字以内）：',
      '## 预估分数',
      '给出 0-60 的预估分，并拆成 内容 / 表达 / 发展等级 三项。',
      '## 立意判断',
      '判断是否切题、是否偏题，指出立意的准确表述。',
      '## 结构与论证',
      '2-3 条，指出分论点是否成立、层次是否递进、论据是否贴切。',
      '## 语言问题',
      '挑 2 处具体句子，说明怎么改（给出改写示例）。',
      '## 升格建议',
      '给一个可执行的升格方案：换一个更好的分论点或补一个更有力的论据。'
    ].join('\n');
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }

  function buildExplain(point) {
    var system = '你是高三语文老师。用简体中文把知识点讲成“考场上能立刻用”的版本，语言具体，不要空话，不要代码块。';
    var user = [
      '请把下面这个高考语文知识点讲透：',
      '【知识点】' + point.title,
      '【概述】' + (point.summary || ''),
      '【核心讲解】' + (point.core || ''),
      '【题干信号】' + (point.signals || []).join('；'),
      '【常见易错】' + (point.pitfalls || []).join('；'),
      '',
      '按以下结构输出（450 字以内）：',
      '## 一句话本质',
      '## 什么时候会用到（3 个题干信号）',
      '## 一个最小示例（自己写一小段文本或一道小题，并示范怎么答）',
      '## 最容易错的 1 个地方'
    ].join('\n');
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }

  function endpoints() {
    var s = settings();
    if (s.provider === 'deepseek') {
      if (s.key) return [{ name: 'DeepSeek', url: s.baseUrl || DEEPSEEK_URL, model: s.model || 'deepseek-chat', key: s.key }];
      return BUILTIN;
    }
    if (s.provider === 'custom') {
      if (!s.baseUrl) throw new Error('还没有填写接口地址，请到「设置 → AI 通道」里配置。');
      if (!s.key) throw new Error('还没有填写 API Key，请到「设置 → AI 通道」里配置。');
      return [{ name: '自定义接口', url: s.baseUrl, model: s.model || 'deepseek-chat', key: s.key }];
    }
    return BUILTIN;
  }

  async function streamOnce(ep, messages, onDelta, signal) {
    var headers = { 'Content-Type': 'application/json' };
    if (ep.key) headers.Authorization = 'Bearer ' + ep.key;
    var body = { model: ep.model, messages: messages, stream: true };
    if (!/reasoner/.test(ep.model)) body.temperature = 0.4;
    var res = await fetch(ep.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: signal
    });
    if (!res.ok) {
      var detail = '';
      try {
        var err = await res.json();
        detail = (err && err.error && (err.error.message || err.error.type)) || '';
      } catch (e) { /* ignore */ }
      var tip = { 400: '请求格式有误', 401: 'API Key 无效或未填写', 402: '账户余额不足', 403: '无权限访问该模型', 404: '接口地址或模型名不存在', 429: '请求过于频繁或额度用尽', 500: '服务端错误', 503: '服务繁忙' }[res.status] || '请求失败';
      throw new Error(ep.name + '：' + tip + '（HTTP ' + res.status + '）' + (detail ? ' · ' + detail : ''));
    }
    var ctype = res.headers.get('content-type') || '';
    if (!res.body || ctype.indexOf('text/event-stream') < 0) {
      var data = await res.json();
      var text = data && data.choices && data.choices[0] && (data.choices[0].message || {}).content;
      if (!text) throw new Error(ep.name + ' 返回内容为空');
      onDelta(text);
      return text;
    }
    var reader = res.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buf = '';
    var full = '';
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });
      var lines = buf.split('\n');
      buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.indexOf('data:') !== 0) continue;
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          var j = JSON.parse(payload);
          var d = j.choices && j.choices[0] && (j.choices[0].delta || {});
          if (d && d.content) { full += d.content; onDelta(d.content); }
        } catch (e) { /* 忽略不完整分片 */ }
      }
    }
    if (!full.trim()) throw new Error(ep.name + ' 没有返回内容');
    return full;
  }

  async function chat(messages, onDelta) {
    var list = endpoints();
    var lastErr = null;
    for (var i = 0; i < list.length; i++) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 90000);
      try {
        var text = await streamOnce(list[i], messages, onDelta, ctrl.signal);
        clearTimeout(timer);
        return { text: text, provider: list[i].name };
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
      }
    }
    throw lastErr || new Error('所有 AI 通道都不可用');
  }

  function test() {
    return chat([{ role: 'user', content: '只回复四个字：连通正常' }], function () {});
  }

  window.YW_AI = {
    settings: settings,
    save: save,
    chat: chat,
    test: test,
    diagnose: function (q, work, self, kn, onDelta) { return chat(buildDiagnose(q, work, self, kn), onDelta); },
    grade: function (q, myAnswer, onDelta) { return chat(buildGrade(q, myAnswer), onDelta); },
    essay: function (q, myAnswer, onDelta) { return chat(buildEssay(q, myAnswer), onDelta); },
    explain: function (point, onDelta) { return chat(buildExplain(point), onDelta); },
    builtinNames: BUILTIN.map(function (b) { return b.name; })
  };
})();
