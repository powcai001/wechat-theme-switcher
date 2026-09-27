#!/usr/bin/env python3
"""Build a store-ready extension zip with development-only reload UI removed."""
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT.parent / 'dist' / 'wechat-theme-switcher'
ZIP_PATH = ROOT.parent / 'dist' / 'wechat-theme-switcher-store.zip'
EXCLUDED_NAMES = {'.DS_Store', '.git', 'dist', 'docs', 'tests', 'tools', 'popup.html', 'popup.css', 'popup.js', 'background.js'}

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True)
ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)
if ZIP_PATH.exists():
    ZIP_PATH.unlink()

for source in ROOT.iterdir():
    if source.name in EXCLUDED_NAMES or source.suffix == '.zip':
        continue
    if source.is_dir():
        shutil.copytree(source, DIST / source.name, ignore=shutil.ignore_patterns('.DS_Store'))
    else:
        shutil.copy2(source, DIST / source.name)

manifest_path = DIST / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['name'] = 'Markdown 排版主题助手'
manifest['description'] = '在公众号文章编辑页中导入 Markdown，一键切换整洁排版主题。'
manifest['action']['default_title'] = 'Markdown 排版主题助手'
manifest['permissions'] = [item for item in manifest.get('permissions', []) if item != 'tabs']
manifest.pop('background', None)
manifest.setdefault('action', {}).pop('default_popup', None)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(DIST.rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(DIST.parent))
print(ZIP_PATH)
