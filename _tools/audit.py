import io, os, re, json, glob

JS = r'c:\Users\13250\Documents\trae_projects\11\gaokao-chinese\assets\js'
IDS = set("""k-xd1-duwen k-xd1-bidui k-xd1-lunzheng k-xd1-gaikuo k-xd1-cailiao
k-xd1-xinxi k-xd1-jiegou k-xd1-tuwen
k-xd2-xiaoshuo k-xd2-renwu k-xd2-qingjie k-xd2-huanjing k-xd2-sanwen k-xd2-zuoyong
k-xd2-xijie k-xd2-xushi k-xd2-zhuti k-xd2-yuyan
k-wy-duanju k-wy-shici k-wy-xuci k-wy-juzi k-wy-fanyi k-wy-gaikuo
k-wy-wenhua k-wy-jianda
k-sg-yixiang k-sg-jiqiao k-sg-qinggan k-sg-bijiao k-sg-guocheng k-sg-timu k-sg-lianxi
k-mq-qingjing k-mq-yicuoz k-mq-zhunbei k-mq-pianmu k-mq-yiwen
k-yy-chengyu k-yy-bingju k-yy-buxie k-yy-xiuci k-yy-jushi k-yy-biaodian k-yy-cibian
k-yy-biaoda k-yy-tuwen
k-zw-shenti k-zw-jiegou k-zw-sucai k-zw-lunzheng k-zw-shenge
k-zw-renwu k-zw-xuli k-zw-yuyan
k-gf-guifan k-gf-shijian k-gf-fupan k-gf-yuejuan k-gf-xintai""".split())

def read(n):
    return io.open(os.path.join(JS, n), encoding='utf-8').read()

print('== 知识点 ==')
chapters, points = [], []
for f in ['knowledge-a.js', 'knowledge-b.js', 'knowledge-c.js', 'knowledge-d.js', 'knowledge-e.js']:
    s = read(f)
    chapters += re.findall(r"id:\s*'([a-z0-9]+)'", s.split('points.push')[0])
    points += re.findall(r"\n\s+id:\s*'(k-[a-z0-9-]+)'", s)
print('chapters:', chapters)
print('points:', len(points), 'unique:', len(set(points)))
print('missing ids:', sorted(set(points) - IDS))
print('declared but absent:', sorted(IDS - set(points)))

print('\n== 试卷 ==')
for f in sorted(glob.glob(os.path.join(JS, 'data-real-*.js')) + glob.glob(os.path.join(JS, 'data-mock-*.js'))):
    s = read(os.path.basename(f))
    papers = re.findall(r"id:\s*'(real-[^']+|mock-[^']+)'", s)
    nos = [int(x) for x in re.findall(r"\n\s+no:\s*(\d+)", s)]
    types = re.findall(r"\n\s+type:\s*'([a-z]+)'", s)
    scores = [int(x) for x in re.findall(r"\n\s+score:\s*(\d+)", s)]
    mats = re.findall(r"material:\s*'([^']+)'", s)
    print(os.path.basename(f), 'paper:', papers, 'q:', len(nos), 'nos:', nos[:3], '...', nos[-2:],
          'types:', {t: types.count(t) for t in set(types)}, 'total:', sum(scores))

print('\n== 第19题 / 母题 / 记忆 ==')
s = read('data-q19.js')
print('q19:', len(re.findall(r"id:\s*'q19-\d+'", s)))
for f in ['data-drill-a.js', 'data-drill-b.js']:
    s = read(f)
    print(f, 'drills:', len(re.findall(r"id:\s*'drill-[ab]-\d+'", s)))
s = read('memo.js')
print('tips:', s.count('tag:') , '(rough)')
print('memo file chars:', len(s))

print('\n== knowledge 引用校验 ==')
bad = {}
for f in glob.glob(os.path.join(JS, 'data-*.js')):
    s = read(os.path.basename(f))
    for block in re.findall(r"knowledge:\s*\[([^\]]*)\]", s):
        for k in re.findall(r"'([^']+)'", block):
            if k not in IDS:
                bad.setdefault(os.path.basename(f), set()).add(k)
print('invalid knowledge refs:', {k: sorted(v) for k, v in bad.items()} or 'none')

print('\n== 重复标题 ==')
titles = {}
for f in glob.glob(os.path.join(JS, 'data-*.js')):
    for t in re.findall(r"title:\s*'([^']{4,})'", read(os.path.basename(f))):
        titles.setdefault(t, []).append(os.path.basename(f))
for t, fs in titles.items():
    if len(fs) > 1:
        print('DUP:', t, fs)
