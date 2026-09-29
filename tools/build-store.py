#!/usr/bin/env python3
"""Build store and GitHub release packages for the extension."""

import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist' / 'wechat-theme-switcher'
EXCLUDED_NAMES = {
    '.DS_Store', '.git', '.gitignore', 'dist', 'docs', 'tests', 'tools',
    'popup.html', 'popup.css', 'popup.js', 'background.js',
    'CHANGELOG.md', 'CONTRIBUTING.md', 'INSTALL.md', 'README.md',
    'ROADMAP.md', 'SECURITY.md',
}
RELEASE_DOCS = [
    'README.md', 'INSTALL.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
    'SECURITY.md', 'ROADMAP.md',
]

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir(parents=True)

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

version = manifest.get('version', '0.0.0')
store_zip = ROOT / 'dist' / 'wechat-theme-switcher-store.zip'
release_zip = ROOT / 'dist' / f'wechat-theme-switcher-v{version}.zip'
for path in (store_zip, release_zip):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()

runtime_files = sorted(file for file in DIST.rglob('*') if file.is_file())

# Store package: manifest.json must sit at the zip root, without a wrapping
# directory, because Partner Center rejects nested manifests.
with zipfile.ZipFile(store_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in runtime_files:
        archive.write(file, file.relative_to(DIST))

# GitHub offline-install package: wrapped in a named directory and bundled
# with the project documentation, matching the v0.8.2 release layout.
with zipfile.ZipFile(release_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in runtime_files:
        archive.write(file, Path('wechat-theme-switcher') / file.relative_to(DIST))
    for name in RELEASE_DOCS:
        source = ROOT / name
        if source.is_file():
            archive.write(source, Path('wechat-theme-switcher') / name)

print(store_zip)
print(release_zip)
