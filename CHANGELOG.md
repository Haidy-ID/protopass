# Changelog

## 3.0.0 · 2026-11-07

First public release.

- Install: one sentence pasted into your coding agent points it to `install.md`, which downloads `protopass.tar.gz` and builds a first prototype.
- Node only: `node kit/serve.mjs` takes the first free port from 8000. `serve.py` and `update.py` are gone.
- Render check: a Check render button on each prototype page, a report with a verdict, the problems grouped by rule and filters, and `render-check.mjs` to run it from a terminal.
- `topic.json` needs `title`, `intent`, `status` and `screens` only. Without `ds`, a prototype uses Minimaly.
- The home shows every prototype when the workshop has one group.

From 2.x: the kit folder is `kit/` instead of `handoff/`, `name`, `intro` and `logo` leave `protopass.json`, and `serve.py` is replaced by `node kit/serve.mjs`.
