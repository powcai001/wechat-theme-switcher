# Changelog

## 0.8.2

- Added comprehensive Markdown regression fixture.
- Render task lists as checkboxes.
- Repair malformed multi-column table headers when labels can be recovered.
- Remove duplicate ordered-list numbers from the pasted source.
- Preserve inline formatting inside list items.
- Warn about non-standard `[IMAGE:]` placeholders.
- Added extension icons and GitHub-ready documentation.

## 0.8.1

- Moved the launcher to a vertically centered right-edge sidebar button.
- Enlarged the work panel to about 580px.
- Increased Markdown editor and theme-card preview sizes.
- Added responsive narrow-window layout.

## 0.8.0

- Removed legacy clear/restore buttons.
- Markdown is now the single source of truth.
- First H1 is written to the WeChat title field and removed from the body.
- Title edits in Markdown re-sync the WeChat title.

## 0.7.0

- Added Markdown source panel.
- Added `.md` import and drag-and-drop import.
- Added automatic synchronization.
- Rebuilt every theme switch from the Markdown source.
- Added WeChat-compatible image grid, code, quote and colored-container post-processing.

## 0.6.0

- Introduced the HTML → Markdown → HTML pipeline.
- Bundled Turndown and markdown-it locally.
- Rebuilt theme switching from clean Markdown instead of mutating editor HTML.

## 0.5.x

- Initial in-editor theme panel, search, favorites and recent themes.
- Verified editor targeting, inline theme application and draft persistence.
