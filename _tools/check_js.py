import sys, esprima, io

bad = 0
for path in sys.argv[1:]:
    try:
        src = io.open(path, encoding='utf-8').read()
        esprima.parseScript(src)
        print('OK  ', path)
    except Exception as e:
        bad += 1
        print('FAIL', path, e)
sys.exit(1 if bad else 0)
