# Protopass

The open-source prototype kit for your coding agent. Click through your idea before you build the app. Runs locally, every screen and state included.

Your agent builds the screens in plain HTML, CSS and JS with a design system it is checked against. Each prototype opens as a page with a pannable canvas of every screen and state, a clickable prototype, a token inspector and Copy to Figma. No build, no dependency, no account.

## Start

Paste this sentence into your coding agent, with your idea at the end. Tested with Claude Code and Codex on macOS.

```
Follow https://protopass.dev/install.md to prototype: <your idea>
```

[install.md](install.md) is short: read it before your agent does. It checks Node 20 or later, downloads the kit into a `protopass/` folder, starts a local server, builds a first prototype of three screens at most and opens it.

By hand:

```bash
curl -fsSL -o protopass.tar.gz https://github.com/Haidy-ID/protopass/releases/latest/download/protopass.tar.gz
tar -xzf protopass.tar.gz && rm protopass.tar.gz
cd protopass && node kit/serve.mjs
```

Open the address it prints, then ask your agent to read `AGENTS.md` and prototype your idea. Pages load JSON with `fetch`: opening the files from disk does not work.

## Layout

```
index.html             home: latest prototypes, one card per group when there are several
protopass.json         your workshop: groups, then optional published url, teams, design systems
AGENTS.md, CLAUDE.md   entry point for agents, with room for your project notes
prototypes/            a group: index.html (list) · topics.json · one folder per prototype
  <prototype>/         index.html (never edited) · topic.json · screens/ · journal.md · deliverables
kit/                   the kit: replaced as a whole on update, never edited
  AGENTS.md            guide for agents: layout, rules, pitfalls
  skills/              new-topic.md, build-mockup/ (skill, design judgment, validator, render check, contract), new-component/
  minimaly/            default design system
  playground/          component pages: kit/playground/?ds=<name>#<component>, token page: tokens.html?ds=<name>
```

## protopass.json

| Key | Meaning |
| --- | --- |
| `groups` | One entry per group folder: `title`, `path` (the folder), `icon` (a Phosphor name), `text` (optional), `groupBy` (optional, list groupings among `app`, `team`, `pi`). |
| `url` | Optional. Published address of the workshop. Copy post builds links from it. Empty: the current address. |
| `copyPost` | Optional. `true` shows Copy post on prototype pages. |
| `teams` | Optional. Known teams, in list order. The validator flags others. |
| `designSystems` | Optional. Your design systems: `{ "My DS": "design-systems/my-ds" }`, paths from the root. Minimaly is built in and the default. |

A new group: add its entry, create the folder with a copy of `prototypes/index.html` and a `topics.json` holding `[]`.

## Prototypes

[kit/skills/new-topic.md](kit/skills/new-topic.md) describes a prototype, its required and optional fields, the journal and stories. In short:

- Copy `kit/skills/new-topic/template/` (or `kit/skills/new-topic/free-prototype/` for screens alone) into a group, fill `topic.json`, add the folder name to the group's `topics.json`.
- Screens read their state from `?state=<name>`. A flow step is `screen-id` or `screen-id:state`.
- `"brands": ["Calm", "Bold"]` gives the same screens several looks, one token file each in `brands/`. [restyle.md](kit/skills/build-mockup/restyle.md) explains it.
- A `.md` deliverable opens in a reader where `[label](screen:<id>)` plays that screen and `> Gap: …` marks a moment no screen shows yet.

## Checks

- `node kit/skills/build-mockup/validate.mjs <group>/<prototype> [screen-id]` checks the screens against the design system. In Claude Code, `.claude/settings.json` runs it after each file edit.
- Check render on a prototype page, or `node kit/skills/build-mockup/render-check.mjs <group>/<prototype> [screen-id]` from a terminal, measures contrast, overflow, overlaps and tap targets on every screen, state, device and theme. It does not judge the design.
- `node kit/skills/build-mockup/contract.mjs "<design system>"` prints its roles, their use and the safe pairs.
- `node kit/skills/build-mockup/check-all.mjs` checks every script, JSON file, design system and prototype of the workshop.

## Your own design system

A design system folder holds `ds.css`, `ds.js`, `tokens.css`, `components.css`, `components.json` (id, class, name, variants, states per component), `components/<id>.html` specimens and `catalog/<id>.md` cards. Declare it in `designSystems`, then set `"ds"` and `"components"` in a prototype. The playground shows its components, the prototypes that use each one, and a Tokens page.

In `tokens.css`, a role sits in a `[data-theme]` block and a primitive is a raw color outside of one: screens may read roles only (M112). A comment at the end of a role's line in the light block is its use, shown in the contract and on the Tokens page.

## Server and update

`node kit/serve.mjs` takes the first free port from 8000, or the one you pass. `--background` detaches it, writes its output to `.protopass-server.log` and returns: an agent's shell can end without stopping it. Every page reloads when a file it shows changes, and keeps its place: mode, flow, screen, device, theme and brand live in the URL.

The update button (arrow in a circle) in the topbar compares the installed version with the latest release, and puts a dot on it when a release is newer. **Update** replaces `kit/` and reloads the page. Your groups, prototypes and `protopass.json` stay untouched, and the release notes say when they need a change. The server's update and render check routes only answer this machine.

## Viewer

- Canvas: every flow as a row of screens. View → All states shows every state, in a flow or not. Wheel pans, Ctrl/Cmd + wheel zooms, double-click focuses a screen, O fits, H hides the interface, ← → move.
- Prototype: clickable screens. P plays the next step, I highlights the links, F goes full screen.
- Inspect (V): hover a part of a screen to read its type, colors and spacing with their tokens. Reference copies one line that tells your agent which part of which screen you mean.
- Theme and brand: light and dark, and the looks of a prototype that has several. A link opens as it was seen.
- Copy to Figma (local server only): copies a screen or a whole flow as Figma frames. Best effort: pseudo-elements and background images are not kept.
- `?` lists the shortcuts.

## Develop the kit

`node kit/skills/build-mockup/check-all.mjs` and `node --test kit/*.test.mjs kit/skills/build-mockup/*.test.mjs` run on each push. A `v*` tag that matches `kit/VERSION` publishes a release with `protopass.tar.gz`, the workshop that `install.md` downloads, and its notes from [CHANGELOG.md](CHANGELOG.md). A push to `site/` or `install.md` on main deploys https://protopass.dev to GitHub Pages.

MIT license.
