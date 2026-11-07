# New topic

One topic = one folder = one link to share. The link opens the topic page; the screens are one click away.

## Topic with screens

1. Copy `kit/skills/new-topic/template/` to `<group>/<topic-slug>/` (lowercase, dashes: `return-reminder`). `<group>` is a `path` of `protopass.json` → `groups`. The template is a small working example: replace its screens, flows and copy with the topic's own.
2. Fill `topic.json`. Required:
   - `title`, `intent` (one sentence: the outcome and why), `status` (`draft`, `review`, `ready`, `shipped`).
   - `screens`: `{ "id", "label", "file", "states": [{ "name", "note" }] }`, states in display order. `?state=<name in kebab-case>` selects one. Each note says in a few words what the state shows.

   Optional, and not shown when empty or missing:
   - `updated` (`YYYY-MM-DD`, sorts the lists), `ds` (`Minimaly` or a name from `designSystems`), `components` (ids the screens use), `viewport` (the size the screens are designed at), `devices` (sizes offered in Canvas and Prototype among `mobile`, `tablet`, `desktop`; omitted = all).
   - `flows`: one per user story, `{ "name", "statement", "steps" }`. `name` is a short imperative ("Lend an item"). `statement` is one sentence: "As a <role>, I should be able to …". `steps` are screen ids with an optional state: `["home", "add-loan:error", "confirm"]`.
   - `brands`: names of the looks of the topic, the first being the default. See [build-mockup/restyle.md](build-mockup/restyle.md).
   - `deliverables`: working documents that are not screens, `{ "name", "file", "statement" }`. A `.md` file opens in the reader, where `[label](screen:<id>:<state>)` plays that screen.
   - `qa`: `[{ "q", "a" }]`, only behaviors a reader would not guess from the prototype. `questions`: open questions.
   - For a team: `app` (product name), `teams` (names from `protopass.json` → `teams`), `pi` (release or iteration), `figma`, `story` (ticket ids), `owners` (names for the announcement post), `thread` (discussion link), `note` (one line).
3. Build the screens in `screens/` with [build-mockup](build-mockup/SKILL.md) until the validator reports 0 errors.
4. Add the folder name to `<group>/topics.json`.
5. Write the first entry of `journal.md` (see below).
6. Preview: `node kit/serve.mjs`, then the address it prints. Open a new topic on every state at once: `/<group>/<topic-slug>/?view=canvas&flow=states`. Pages reload on save.

## Prototype-only topic

A concept with a free prototype and no screens yet:

1. Copy `kit/skills/new-topic/free-prototype/` to `<group>/<topic-slug>/`.
2. `topic.json`: `title`, `status`, `updated`, `intent`, `prototype` (entry page, relative to the topic folder).
3. Put the prototype in `prototype/`: any structure, any design system, Minimaly by default.
4. Add the folder name to `<group>/topics.json`. The list opens the prototype directly.
5. Need screens later: add `screens`, `flows`, `qa`… as above. The list then opens the topic page, which keeps an **Open app** button.

## Journal

`journal.md` next to `topic.json` logs the iterations, newest first, shown as the Journal section of the topic page:

```markdown
## 2026-10-20
- Error state keeps the typed values: retyping was the first complaint.
```

One heading per day, one line per change or decision, with its reason. `[label](screen:<id>)` links a screen.

## Story

A story is a Markdown deliverable: a user's day told step by step, each step linked to its screen (`[the form](screen:add-loan)`). A moment no screen shows yet is a gap: `> Gap: no screen shows a reminder for a late loan.` It renders as a Gap callout. Declare it in `deliverables`. A figure on its own line illustrates it: `![caption](figures/<name>.png)` for an image, `![caption](figures/<name>.html)` for an animated illustration, played in a frame. The page sets `data-theme="dark"` on the figure's `<html>` in dark theme: style the figure from that attribute, not from `prefers-color-scheme`.

## Rules

- Never move a topic folder once shared: status and dates live in `topic.json`, not in the path.
- Never edit a topic's `index.html`: the layout lives in `kit/`. Its two paths point to `kit/` at the site root, one `../` per folder level.
