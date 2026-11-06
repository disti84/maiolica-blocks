"""Builds the game. Settings come from game.config.json.

  build/<slug>.html             preview (claude.ai artifact): Google Fonts, no Bridge, synth sounds
  build/<slug>-mobile.html      same preview as one standalone file for phone testing
  dist/                         Playgama build: index.html + Bridge SDK + config + local fonts + audio/
  build/<slug>-playgama.zip     zip of dist/ ready to upload (index.html at the root)

template.html is an HTML fragment with these placeholders:
  <!--FONTS-->   fonts (Google in previews, local files in dist)
  <!--BODY-->    where <head> ends and <body> starts in standalone files
  /*KIT*/ /*I18N*/ /*LOGIC*/ /*GAME*/   the scripts, in this order
"""
import json, os, re, shutil, sys, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
NM = os.path.join(ROOT, 'vendor/node_modules')
BRIDGE = os.path.join(NM, '@playgama/bridge/dist/playgama-bridge.js')
KIT = ['kit/core.js', 'kit/platform.js', 'kit/sound.js', 'kit/i18n.js', 'kit/boot.js']

read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
cfg = json.loads(read('game.config.json'))
slug, title = cfg['slug'], cfg['title']
fonts = cfg.get('fonts', [])

for p in (BRIDGE, *[os.path.join(NM, '@fontsource', f['package']) for f in fonts]):
    if not os.path.exists(p):
        sys.exit(f'Missing {os.path.relpath(p, ROOT)} — run: cd vendor && npm install')

info = {k: cfg[k] for k in ('slug', 'title', 'version') if k in cfg}
kit_js = 'window.GAME_INFO = ' + json.dumps(info, ensure_ascii=False) + ';\n' + '\n'.join(read(p) for p in KIT)

tpl = read('template.html')
for marker in ('<!--FONTS-->', '<!--BODY-->', '/*KIT*/', '/*I18N*/', '/*LOGIC*/', '/*GAME*/'):
    if marker not in tpl:
        sys.exit(f'template.html is missing the placeholder {marker}')
body = (tpl.replace('/*KIT*/', kit_js).replace('/*I18N*/', read('i18n.js'))
           .replace('/*LOGIC*/', read('logic.js')).replace('/*GAME*/', read('game.js')))
body = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', body, count=1)

def google_fonts():
    fams = []
    for f in fonts:
        fam = f['family'].replace(' ', '+')
        w = sorted(f.get('weights', ['400']), key=int)
        fams.append('family=' + fam + ('' if w == ['400'] else ':wght@' + ';'.join(w)))
    if not fams:
        return ''
    return ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{"&".join(fams)}&display=swap">')

HEAD = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="{cfg.get('themeColor', '#000000')}">
'''
def standalone(html, extra_head=''):
    head, rest = html.split('<!--BODY-->', 1)
    return HEAD + extra_head + head + '</head>\n<body>\n' + rest + '\n</body>\n</html>\n'

out = os.path.join(ROOT, 'build')
os.makedirs(out, exist_ok=True)

# --- preview builds ---
preview = body.replace('<!--FONTS-->', google_fonts())
open(os.path.join(out, f'{slug}.html'), 'w', encoding='utf-8').write(preview.replace('<!--BODY-->', ''))
open(os.path.join(out, f'{slug}-mobile.html'), 'w', encoding='utf-8').write(standalone(preview))

# --- Playgama build ---
dist = os.path.join(ROOT, 'dist')
shutil.rmtree(dist, ignore_errors=True)
os.makedirs(os.path.join(dist, 'fonts'))
css = []
for f in fonts:
    pkg = os.path.join(NM, '@fontsource', f['package'])
    for w in f.get('weights', ['400']):
        src = open(os.path.join(pkg, f'{w}.css'), encoding='utf-8').read()
        for block in re.findall(r'/\*[^*]*\*/\s*@font-face\s*\{[^}]*\}', src):
            # Latin + Latin Extended cover the European languages; add other subsets if needed.
            if not re.search(r'/\*\s*[\w-]+-(latin|latin-ext)-\d+-normal\s*\*/', block):
                continue
            block = re.sub(r'url\(\./files/([^)]+)\.woff2\)', r'url(fonts/\1.woff2)', block)
            block = re.sub(r',\s*url\(\./files/[^)]+\.woff\)\s*format\([^)]*\)', '', block)
            css.append(block)
            for fn in re.findall(r'url\(fonts/([^)]+)\)', block):
                shutil.copy(os.path.join(pkg, 'files', fn), os.path.join(dist, 'fonts', fn))
fonts_css = '<style>\n' + '\n'.join(css) + '\n</style>' if css else ''
index = standalone(body.replace('<!--FONTS-->', fonts_css), '<script src="playgama-bridge.js"></script>\n')
open(os.path.join(dist, 'index.html'), 'w', encoding='utf-8').write(index)
shutil.copy(BRIDGE, os.path.join(dist, 'playgama-bridge.js'))
shutil.copy(os.path.join(ROOT, 'playgama-bridge-config.json'), dist)
audio_src = os.path.join(ROOT, 'audio')
if os.path.isdir(audio_src):
    shutil.copytree(audio_src, os.path.join(dist, 'audio'), ignore=shutil.ignore_patterns('*.md', '*.txt'))
assets_src = os.path.join(ROOT, 'assets')
if os.path.isdir(assets_src):
    shutil.copytree(assets_src, os.path.join(dist, 'assets'), ignore=shutil.ignore_patterns('*.md', '*.txt'))

zpath = os.path.join(out, f'{slug}-playgama.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(dist):
        for fn in files:
            full = os.path.join(base, fn)
            z.write(full, os.path.relpath(full, dist))

# Playgama wants everything inside the zip: no external files in index.html.
ext = re.findall(r'(?:src|href)="(https?://[^"]+)"', index)
print(f'{title} {cfg.get("version", "")}')
print('dist files:', sum(len(f) for _, _, f in os.walk(dist)), '| external refs in index.html:', ext or 'none')
print('zip:', os.path.relpath(zpath, ROOT), os.path.getsize(zpath) // 1024, 'KB')
if ext:
    sys.exit('index.html must not load external files')
