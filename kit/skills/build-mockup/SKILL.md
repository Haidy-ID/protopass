---
name: build-mockup
description: Builds or edits the HTML/CSS screens of a topic from its design system, in a loop of contract and cards → screen → validator → render check. Use when creating or changing a mockup, adding a screen or a state, restyling a topic, starting from a reference, or adding a component to a design system.
---

# build-mockup

Spend effort on design decisions, not on CSS. The design system is the language: screens assemble its classes and tokens, a validator names every gap with a code and a fix, the browser shows the render.

## Loop

1. **Frame.** Read the topic's `topic.json`: `ds`, `viewport`, `screens` with their `states`, `components`. No `ds`: use `Minimaly`, or ask which design system of `protopass.json` → `designSystems` applies. **Done when** every screen and state to produce is listed.

2. **Load what you need, in one batch.** Run `node kit/skills/build-mockup/contract.mjs "<ds>"` for the roles and the safe pairs. Read `<ds>/catalog/README.md`, then the card of every component the screens need (`kit/minimaly/catalog/` for Minimaly). Load a bit too much rather than too little, never the whole CSS. Read the [judgment files](#judgment) the work calls for. **Done when** the markup of every component comes from a card, not from memory, and each color comes from a role of the contract.

3. **Write one screen at a time.** Components as their card describes them. `screens.css` starts with `@import` of `<ds>/ds.css` and holds only the topic's own layout, in `var()` only. States through `?state=<id>`: `[data-state="<id>"]` in `screens.css`, `data-when="<id>"` in the HTML, or a script branch. Plain links between screens. **Done when** the screen exists and every declared state renders.

4. **Validate after each screen, unasked.** The screen id limits the run to the screen you changed. Shared CSS or `topic.json` changed: run the whole topic.

   ```bash
   node kit/skills/build-mockup/validate.mjs <group>/<topic> <screen-id>
   ```

   In Claude Code, `.claude/settings.json` runs this after each file edit and returns the errors to you. Other agents and files written through a shell run it by hand. Apply the fix of each error before the next screen. Handle warnings unless a reason is written. The same error twice in a row: read the component card again instead of retrying. **Done when** `0 error(s)`.

5. **Check the render, unasked.** Run `node kit/serve.mjs` and open `/kit/skills/build-mockup/lint.html?topic=<group>/<topic>&screen=<screen-id>` on the address it prints. It renders each state of that screen in light and dark, in each brand, at each device of `topic.json` → `devices` (the viewport for its own device), frames each problem and exposes `window.lintResult` (`errors`, `warnings`, `perDevice`, `findings[]` with code, device, screen, state, theme, brand, target, fix). Read `window.lintResult`. Without `&screen`, it renders every screen. With no browser tool, run `node kit/skills/build-mockup/render-check.mjs <group>/<topic> [screen-id]` instead: it opens the same page in a headless Chrome, Edge or Chromium, prints the findings and exits with 0 (no error), 1 (errors) or 2 (the check did not run). **Done when** `errors: 0` and every remaining warning has a written reason.

6. **Look at every state.** Open `<screen file>?state=<id>` for each state of the changed screen, take a screenshot and read it. An unread state counts as unchecked, even at 0 error. Compare it with its note in `topic.json`: a state that looks like the default state is a defect. Then go through [tells.md](design/tells.md). With no browser tool, this step is not done: name every state not seen in your report, and never call them checked. **Done when** every state of the screen has been seen and matches its note, or is named as not seen.

7. **Declare the components.** Put the ids the screens really use in `topic.json` → `components` (the validator reports gaps as M204; it also counts components triggered rather than classed: `toast()` calls, `data-tip`, `data-busy`/`data-done`/`data-error`/`data-copy`, `data-hold`). The topic page then links each one to its playground page. **Done when** 0 error and 0 M204.

8. **Check the whole topic before calling it done.** Run the validator and the render check without a screen id: a change on one screen can break a flow, a shared style or another screen. **Done when** both report 0 error.

## Judgment

The checks catch what breaks a rule. These short files cover what makes a screen good. The design system wins any conflict, and the brief wins over them all.

| File | Read it when |
|---|---|
| [composition.md](design/composition.md) | Laying out any screen |
| [color.md](design/color.md) | Choosing roles beyond text and surface |
| [typography.md](design/typography.md) | A screen with several text levels, a table, numbers or long reading |
| [states.md](design/states.md) | Deciding what a state shows |
| [content.md](design/content.md) | Writing the data and the words of a screen |
| [tells.md](design/tells.md) | Before calling a screen done |

Other recipes:

- Another look on the same screens, or a comparison of directions: [restyle.md](restyle.md).
- Starting from an image, a screenshot or a web page: [from-reference.md](from-reference.md).

## Missing component

Never invent a component class in a screen. Either:

- Topic-only layout: a local class in `screens.css`, in tokens.
- Reusable element: follow [new-component](../new-component/SKILL.md).

A design system change reaches every topic that uses it.

## Validator codes

| Code | Level | Reports |
|---|---|---|
| M002 | error | unknown `ds` |
| M101 | error | raw color instead of a token: every CSS notation (hex, rgb, hsl, hwb, lab, lch, oklab, oklch, color()) and named colors, in CSS, `style`, SVG and HTML color attributes, local custom properties, data URIs, event handlers and scripts. A line with `allow-primitive: <reason>` is exempt |
| M102 | error | class defined neither in the design system nor in the topic CSS |
| M103 | error | unknown variant, or `data-variant` outside a component |
| M104 | error | undefined `var(--x)` |
| M105 | warning | px value a token of the right family already covers |
| M106 | error | `screens.css` does not import the declared `ds.css` |
| M107 | error | screen with `data-icon` that does not load `ds.js` |
| M108 | error | screen using `d3` without loading D3 |
| M109 | error | team missing from `protopass.json` → `teams` |
| M110 | error | unknown size in `devices` (mobile, tablet, desktop) |
| M111 | error | token redefined outside a brand, or a brand that is incomplete: see [restyle.md](restyle.md) |
| M112 | error | primitive in a screen, style or script. A line with `allow-primitive: <reason>` is exempt |
| M113 | error | control rebuilt by hand: `all: unset`, or a button without a class |
| M114 | warning | button with a topic class only: its hover, focus and disabled states are yours to build |
| M201 | error | missing screen file |
| M202 | error | declared state never rendered |
| M203 | error | listed component absent from the design system |
| M204 | warning | gap between `components` and the components used |
| M205 | error | flow step naming no screen (`id`) or state (`id:state`) |
| M206 | error | state that is not `{ "name", "note" }` |
| M207 | error | flow without `name` or `statement` (the user story it answers) |
| M208 | error | `qa` entry that is not `{ "q", "a" }`, or deliverable file missing |
| M209 | error | deliverable without `name` or `file` |
| M210 | warning | state that no flow reaches: only View → All states shows it |

Render linter codes (`lint.html`):

| Code | Level | Reports |
|---|---|---|
| L101 | error | text/background contrast under 4.5:1 (3:1 for large text and single-glyph icons). Level `accepted` for a color listed in `<ds>/lint.json` → `acceptContrast` |
| L201 | error | element with content squashed to 0 px |
| L202 | error | element wider than the viewport (outside a scrolling container) |
| L203 | warning | text cut without an ellipsis |
| L301 | error | overlap between two sibling elements in the flow |
| L401 | error | clickable element under 32 px high |
| L402 | warning | non-clickable label that looks like a button |
| L501 | warning | `::before` or `::after` that draws something and stays: lost by Copy to Figma. One that plays once is ignored |
| L502 | warning | `background-image`: lost by Copy to Figma |
| L503 | warning | `outline`, focus rings aside: becomes a separate "Outline" layer in Figma |
| L504 | warning | `clipPath` shape without `fill="none"`: pasted as a black shape in Figma |

## CSS that survives Copy to Figma

- `::before`, `::after`: use a real element.
- `background-image`: inline SVG or a solid element.
- `outline`: `box-shadow: inset 0 0 0 1px <token>`.
- `clipPath` shape: `fill="none"`.
- `:hover` and `:focus-visible` states are not copied.

## What the checks do not cover

The validator reads the code, the linter reads one frozen render per state. 0 error means no listed rule failed, not that the screen is good. Say so when you report a result. Neither check sees:

- Taste and intent: hierarchy, alignment, brand, whether the flow makes sense. Step 6 and the person's eye cover these.
- A state's content: M202 proves a state has a hook, not that it shows something different or right.
- Behavior: form rules, timers, transitions, links that lead to the wrong step. Play the flow.
- Fonts: nothing checks that the declared font really loaded.
- Accessibility beyond contrast and target height: keyboard, focus order, screen readers.
- Free prototypes: `prototype/` holds any code, on purpose. The validator reads `screens/` alone.
- Indirect colors: a color built from parts or passed through a variable in a script. Sizes off the scale: M105 only names a value a token already has.
- A design system the validator cannot read: it only parses `tokens.css`, `foundations.css`, `charts.css` and `components.css`. Compiled or React systems leave it blind, and token gaps such as M105 stay silent.
- The topic's truth: a status that contradicts an open question, data that could not exist, a story no screen supports.

Add a color to `lint.json` → `acceptContrast` only on an explicit decision, never to make a screen pass.

## Whole site

`node kit/skills/build-mockup/check-all.mjs` checks without a browser that every script of the kit parses, every JSON file parses and every topic of every group passes the validator. `node --test kit/*.test.mjs kit/skills/build-mockup/*.test.mjs` proves the server and the updater, and writes each known bypass into a throwaway topic and proves the validator names it. GitHub runs both on each push (`.github/workflows/check.yml`).
