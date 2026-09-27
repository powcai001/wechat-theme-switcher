# Contributing

Before submitting a change:

```bash
node --check content.js
python3 -m json.tool manifest.json
```

Please test with `tests/fixtures/comprehensive.md` in a blank WeChat draft.

A useful PR includes:

- What user problem it solves.
- Which Markdown constructs changed.
- A screenshot for UI changes.
- Whether save-and-reload was verified.
