# 拾文（高三语文站）数据编写规范

所有数据文件放在 `c:\Users\13250\Documents\trae_projects\11\gaokao-chinese\assets\js\`。
文件必须是合法 ES5/ES2015 脚本（浏览器直接 `<script>` 加载），**不要用 import/export**。
长文本用反引号模板字符串；**禁止出现 `${`**；内容里不要出现反引号。不要写 HTML 标签。

## 通用要求

- 全部使用简体中文，语气像一线高三语文老师：具体、可执行，不空泛。
- 内容是**教学化改编与仿写**：可以按公开真题的题型、考点与设问方式命题，但阅读材料必须自行撰写或改写，不得逐字复制受版权保护的原文；来源标注统一带「改编 / 仿真」字样。
- 每道题必须能给高三学生讲清楚：参考答案 → 解析 → 提示 → 易错 → 一句话方法。
- 主观题答案要写成可操作的采分点（用「①…②…③…」或分号分点），不要只写一句空话。
- 所有 `knowledge` 数组只能使用下方【知识点 ID 表】里的 ID，每道题 1-2 个。

## 知识点 ID 表（必须逐字一致）

现代文阅读Ⅰ（chapter: xd1）
- k-xd1-duwen 信息类文本的三遍读法
- k-xd1-bidui 选项比对：六类设错方式
- k-xd1-lunzheng 论证分析与论证特点
- k-xd1-gaikuo 概括归纳与信息整合
- k-xd1-cailiao 材料比较与观点评价

现代文阅读Ⅱ（chapter: xd2）
- k-xd2-xiaoshuo 小说三要素与主旨
- k-xd2-renwu 人物形象概括与分析
- k-xd2-qingjie 情节作用与结构技巧
- k-xd2-huanjing 环境描写的作用
- k-xd2-sanwen 散文的形散神聚与语言赏析
- k-xd2-zuoyong “作用题”答题模型

文言文阅读（chapter: wy）
- k-wy-duanju 断句：语法与标志词
- k-wy-shici 实词：一词多义与语境推断
- k-wy-xuci 虚词：之其而以于乃
- k-wy-juzi 特殊句式与词类活用
- k-wy-fanyi 翻译：字字落实与句式调整
- k-wy-gaikuo 内容概括与分析题

古代诗歌阅读（chapter: sg）
- k-sg-yixiang 意象与意境
- k-sg-jiqiao 表达技巧（修辞/表现手法/结构）
- k-sg-qinggan 情感主旨与抒情方式
- k-sg-bijiao 比较鉴赏与诗论评析
- k-sg-guocheng 读懂古诗的四个入口

名篇名句默写（chapter: mq）
- k-mq-qingjing 情境默写的三步定位
- k-mq-yicuoz 高频易错字清单
- k-mq-zhunbei 考前默写清单与复盘法

语言文字运用（chapter: yy）
- k-yy-chengyu 成语：语境与色彩
- k-yy-bingju 病句六类与修改
- k-yy-buxie 补写句子：语境逻辑
- k-yy-xiuci 修辞效果分析
- k-yy-jushi 句式变换与表达效果
- k-yy-biaodian 标点与连贯
- k-yy-cibian 词语辨析与选用

写作（chapter: zw）
- k-zw-shenti 审题立意：材料作文
- k-zw-jiegou 议论文结构与分论点
- k-zw-sucai 素材积累与化用
- k-zw-lunzheng 论证方法与深刻性
- k-zw-shenge 升格：从 42 分到 52 分

答题规范与策略（chapter: gf）
- k-gf-guifan 分点作答与术语规范
- k-gf-shijian 150 分钟时间分配
- k-gf-fupan 错题复盘与二次利用

---

## 一、知识点文件

```js
window.YW_KNOWLEDGE = window.YW_KNOWLEDGE || { chapters: [], points: [] };

window.YW_KNOWLEDGE.chapters.push({
  id: 'xd1',
  title: '现代文阅读Ⅰ · 信息类文本',
  order: 1,
  intro: '120-180 字：这一板块怎么考、分值多少、学生最常见的失分点。',
  examTip: '60-90 字：考场上的总策略，用分号隔开 3-4 条口令。'
});

window.YW_KNOWLEDGE.points.push({
  id: 'k-xd1-bidui',
  chapter: 'xd1',
  title: '选项比对：六类设错方式',
  difficulty: 2,                 // 1-5
  summary: '一句话本质，30-50 字，能直接背。',
  core: `300-450 字的核心讲解，分 2-3 段（用 \n\n 分段）。要讲清“为什么”和“怎么做”，可以举很小的语言例子。`,
  signals: [                     // 3-4 条题干信号
    '题干出现“下列对材料相关内容的理解和分析，正确的一项” → 先逐项定位原文，再比对',
    '选项含“都、最、唯一、完全”等绝对词 → 高度警惕范围与程度设错'
  ],
  steps: [                       // 4-5 步操作
    '圈出选项的主语、范围、程度、时态',
    '回原文定位，找到对应句并画出来',
    '逐字比对：换词、删词、加词、调序分别对应哪种设错',
    '无法定位的选项按“无中生有”处理'
  ],
  pitfalls: [                    // 2-4 条
    '凭印象选“看起来最像原文”的选项，不定位',
    '把“部分”当成“全部”，忽略范围词'
  ],
  example: {
    stem: '一个 2-3 行的最小示例题干（自编，带 4 个短选项也可以）',
    answer: '答案，20-60 字',
    solution: ['解析第 1 步', '解析第 2 步']
  },
  takeaway: '一句口诀，20-30 字。',
  methods: [                     // 2 个方法卡
    {
      name: '方法名（4-8 字）',
      when: '什么时候用，20-40 字',
      how: ['第 1 步', '第 2 步', '第 3 步'],
      trap: '这个方法最容易错的地方，20-40 字'
    }
  ]
});
```

## 二、试卷文件（一套卷一个文件）

```js
window.YW_PAPERS = window.YW_PAPERS || [];

window.YW_PAPERS.push({
  id: 'real-2025-1',
  title: '2025 年新高考Ⅰ卷 · 语文（教学改编卷）',
  short: '2025 新高考Ⅰ卷',
  year: 2025,
  region: '新高考Ⅰ卷',
  kind: 'real',                  // real 真题改编 / mock 仿真模拟
  duration: 150,
  note: '信息类文本 + 文学类文本 + 文言文 + 古诗 + 默写 + 语用 + 作文',
  materials: {
    m1: { title: '材料一（摘编自……）', text: `第一段……\n\n第二段……` },
    m2: { title: '材料二', text: `……` },
    m3: { title: '文本：小说/散文标题', text: `……` },
    m4: { title: '文言文（节选自……）', text: `……` },
    m5: { title: '古代诗歌', text: `……` },
    m6: { title: '语言文字运用材料', text: `……` }
  },
  questions: [
    {
      no: 1,
      type: 'single',            // single | blank | subjective | essay
      score: 3,
      difficulty: 2,             // 1-5
      section: '现代文阅读Ⅰ',
      material: 'm1',            // 可选；指向 materials 的键
      stem: '下列对材料相关内容的理解和分析，正确的一项是（ ）',
      options: [
        { k: 'A', t: '选项文字' },
        { k: 'B', t: '选项文字' },
        { k: 'C', t: '选项文字' },
        { k: 'D', t: '选项文字' }
      ],
      answer: 'B',
      solution: ['A 项……错在……', 'B 项……正确，对应原文第 2 段……', 'C 项……', 'D 项……'],
      hints: ['先定位“……”这句话，再比对范围词。'],
      pitfalls: ['把材料二的观点当成材料一的观点。'],
      takeaway: '选项比对三步：定位 → 划线 → 比对范围与程度。',
      knowledge: ['k-xd1-bidui']
    },
    {
      no: 13,
      type: 'subjective',
      score: 8,
      difficulty: 4,
      section: '文言文阅读',
      material: 'm4',
      stem: '把文中画横线的句子翻译成现代汉语。（1）……（2）……',
      answer: '（1）……（2）……',
      solution: ['（1）“以”是“因为”，“直”是“正直”……', '（2）……'],
      hints: ['先找谓语动词，再补出省略的主语。'],
      pitfalls: ['“除”是“授予官职”，不是“除掉”。'],
      takeaway: '翻译得分点＝实词 1 分 + 虚词 1 分 + 句式 1 分 + 句意通顺 1 分。',
      knowledge: ['k-wy-fanyi']
    },
    {
      no: 17,
      type: 'blank',
      score: 6,
      difficulty: 2,
      section: '名篇名句默写',
      stem: '补写出下列句子中的空缺部分。（1）……（2）……（3）……',
      answer: '（1）……（2）……（3）……',
      blanks: [
        { answer: '第一空答案', accept: ['第一种写法', '第二种写法'] },
        { answer: '第二空答案', accept: [] },
        { answer: '第三空答案', accept: [] }
      ],
      solution: ['第（1）空出自《劝学》，注意“……”的写法。'],
      hints: ['先抓情境里的关键词“……”。'],
      pitfalls: ['“锲”不要写成“契”。'],
      takeaway: '情境默写：先定篇目，再定句子，最后抠易错字。',
      knowledge: ['k-mq-qingjing', 'k-mq-yicuoz']
    },
    {
      no: 22,
      type: 'essay',
      score: 60,
      difficulty: 4,
      section: '写作',
      material: 'm6',
      stem: '阅读下面的材料，根据要求写作。（60 分）……要求：选准角度，确定立意，明确文体，自拟标题；不要套作，不得抄袭；不得泄露个人信息；不少于 800 字。',
      answer: '一类立意：……；二类立意：……；三类立意：……',
      solution: [
        '审题：材料的核心矛盾是……，关键词是……',
        '立意示范：……',
        '结构示范：分论点一……；分论点二……；分论点三……',
        '素材提示：……'
      ],
      hints: ['先找材料里的反复出现的词，那就是核心概念。'],
      pitfalls: ['只写“努力”不写“如何努力”，立意空泛。'],
      takeaway: '材料作文先找关键词，再找矛盾，最后落成一句可论证的判断。',
      knowledge: ['k-zw-shenti', 'k-zw-jiegou']
    }
  ]
});
```

### 每套卷固定结构（22 题，150 分）

| 题号 | 题型 | 分值 | 板块 | 材料 |
|---|---|---|---|---|
| 1-3 | single | 各 3 | 现代文阅读Ⅰ | m1 |
| 4 | subjective | 4 | 现代文阅读Ⅰ | m1 |
| 5 | subjective | 6 | 现代文阅读Ⅰ | m1/m2 |
| 6-7 | single | 各 3 | 现代文阅读Ⅱ | m3 |
| 8 | subjective | 4 | 现代文阅读Ⅱ | m3 |
| 9 | subjective | 6 | 现代文阅读Ⅱ | m3 |
| 10-12 | single | 各 3 | 文言文阅读 | m4 |
| 13 | subjective | 8 | 文言文阅读（翻译两句） | m4 |
| 14 | subjective | 3 | 文言文阅读（简答） | m4 |
| 15 | single | 3 | 古代诗歌阅读 | m5 |
| 16 | subjective | 6 | 古代诗歌阅读 | m5 |
| 17 | blank | 6 | 名篇名句默写（3 空） | 无 |
| 18 | single | 3 | 语言文字运用（成语/词语/病句/标点） | m6 |
| 19 | subjective | 4 | 语言文字运用（补写/修辞/病句修改） | m6 |
| 20 | subjective | 4 | 语言文字运用 | m6 |
| 21 | subjective | 9 | 语言文字运用（补写 + 修辞/句式效果） | m6 |
| 22 | essay | 60 | 写作 | 作文材料可放在 stem 内 |

合计：19 + 16 + 20 + 9 + 6 + 20 + 60 = 150 分。

### 材料长度要求

- m1、m2：各 600-800 字，信息类/论述类，主题可从“人工智能与写作”“城市记忆”“科学精神”“传统工艺的当代转化”“算法与审美”等中选，两则材料观点要有差异，便于比较。
- m3：1200-1600 字，小说或散文（二选一，标注文体），有人物、场景、细节，结尾有余味。
- m4：400-600 字浅易文言文（人物传记/政论/杂记），带 2-4 个注释，用 `（ ）` 夹注；文中有可断句的长句。
- m5：一首七律或一首宋词（自拟，格律大致合规），带 2-4 个注释。
- m6：语言文字运用材料，150-300 字，含可补写的空格 `______` 或可修改的病句。

### 题号与素材避雷

- 不要把答案直接写进题干；单选题只能有一个正确项。
- 单选题解析必须逐项说明错因，不能只写“A 错”。
- 文言文翻译题必须在材料里用 `【画线句1】……【/画线句1】` 标出要翻译的句子（应用层会原样显示，不必特殊处理）。
- 默写题优先考课标推荐篇目（《劝学》《师说》《赤壁赋》《登高》《琵琶行》《念奴娇·赤壁怀古》《短歌行》《归园田居》《阿房宫赋》《岳阳楼记》《论语》等），答案必须是真实存在的名句，不能编造。
- 作文题给材料 + 明确任务，避免政治敏感话题。

## 三、第19题专项文件

```js
window.YW_Q19_EXTRA = window.YW_Q19_EXTRA || [];
window.YW_Q19_EXTRA.push({
  id: 'q19-01',
  year: 2025,
  region: '新高考Ⅰ卷 · 改编',
  source: '第19题专项 · 补写句子',
  type: 'subjective',            // 也可 single
  score: 4,
  difficulty: 4,
  stem: '……',
  answer: '……',
  solution: ['……', '……'],
  hints: ['……'],
  pitfalls: ['……'],
  takeaway: '……',
  knowledge: ['k-yy-buxie']
});
```

## 四、专项母题文件

```js
window.YW_DRILL = window.YW_DRILL || [];
window.YW_DRILL.push({
  id: 'drill-a-001',
  type: 'single',                // single | blank | subjective
  difficulty: 2,
  module: '语言文字运用',         // 现代文阅读Ⅰ/Ⅱ、文言文阅读、古代诗歌阅读、名篇名句默写、语言文字运用、写作
  stem: '……',
  options: [{ k: 'A', t: '……' }, ...],   // 非选择题可省略
  answer: '……',
  blanks: [],                    // 仅默写题
  solution: ['……'],
  hints: ['……'],
  pitfalls: ['……'],
  takeaway: '……',
  knowledge: ['k-yy-chengyu']
});
```

## 五、十分钟记忆文件

```js
window.YW_MEMO = {
  tips: [                        // 60 条，每天轮换一条
    {
      title: '标题，8-16 字',
      body: '120-200 字，一条能马上用的做题技巧，最好带“看到……就……”的触发条件。',
      tag: '现代文阅读Ⅰ'          // 板块名
    }
  ],
  cards: [                       // 80 张记忆卡
    {
      front: '正面问题，例如：小说中“环境描写”的作用有哪几个角度？',
      back: '背面要点，60-120 字，分点写，便于背。',
      tag: '现代文阅读Ⅱ'
    }
  ]
};
```

## 六、校验

写完后运行：

```
python c:\Users\13250\Documents\trae_projects\11\gaokao-chinese\_tools\check_js.py 你的文件路径
```

必须输出 `OK`。若报错就修到通过为止。
