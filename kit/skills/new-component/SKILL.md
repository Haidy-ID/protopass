---
name: new-component
description: Creates or upgrades a design system component for Protopass (CSS, behavior, specimen, card, catalog entry) with complete states, keyboard support and motion built on the tokens. Use when a screen needs an element the design system lacks, or when a component must be improved.
---

# new-component

A component "worth the name" has every state a user can meet, works with the keyboard and a screen reader, moves with intent, and survives Copy to Figma. It is written once in the design system, then every screen uses it from its card.

## Where

- Your project: in your own design system (`protopass.json` → `designSystems`). Start one by copying `kit/minimaly/` to `design-systems/<name>/` and declaring it.
- Never in `kit/minimaly/` inside a project: an update replaces `kit/` and erases it. Minimaly changes belong to the Protopass repository.
- Before writing, read `<ds>/catalog/README.md`, then the cards of the two closest components: reuse their anatomy, sizes and naming.

## Steps

1. **Define.** One sentence on what it is for and when not to use it (which other component then). List its parts, variants (`data-variant`), states (native attributes first: `disabled`, `checked`, `aria-pressed`, `aria-selected`, `aria-expanded`, `aria-invalid`, `aria-current`, `open`, `hidden`) and the keyboard keys it answers. **Done when** each state has a trigger a user can cause.

2. **CSS** in `components.css`, one commented block:
   - Root class = component id, parts `__part`, variants `[data-variant="…"]`, states from attributes, `[data-force="hover"]` mirroring `:hover` for specimens.
   - Tokens only: colors, spacing, radius, type, durations, easings. Clickable parts at least `--control-height` (32 px, 44 px on touch).
   - Add the root class to the `box-sizing` list at the top of the file.
   - Native input inside its label for anything toggled (checkbox pattern): the whole row works, the keyboard comes free.
   **Done when** the validator reports no raw value in it.

3. **Motion**, from the tokens:
   - Things that move or resize: `--duration-spring` + `--ease-spring`. Small things that pop (badges, dots, checks): `--ease-bounce`. Color and hover: `--duration-fast` + `--ease-out`. Exits are shorter and use `--ease-in`.
   - Show and hide with the `hidden` attribute or `[open]`, animated both ways: `transition` on `opacity`, `transform`, `filter` and `display … allow-discrete`, plus `@starting-style` for the entry. Open from the side of the trigger (`data-side`, `--from`).
   - Content swapping in place (a label, a panel, a digit): through `--blur-swap` (keyframe `swap-in`). A refused value: `shake`, played by the error state appearing.
   - Height to and from auto: `interpolate-size: allow-keywords`. Lists entering: stagger with `--duration-stagger`.
   - Every duration is a token, so reduced motion makes it instant. A looping animation also stops under `prefers-reduced-motion`.
   - Copy to Figma: no `::before` / `::after` that draws, no `background-image`, no `outline` outside `:focus-visible`. Draw with real elements, inset `box-shadow` or inline SVG.
   **Done when** every state change has a reason to move, and nothing moves without one.

4. **Behavior** in `ds.js`, only what CSS and native elements cannot do:
   - Delegated listeners on `document`, so markup rendered later works. Setup in a `build…` function registered in `enhance()`; attribute changes the page makes go through the `MutationObserver` filter.
   - Wire accessibility: ids, `aria-describedby`, `aria-expanded`, `aria-live` for outcomes, focus return on close.
   - Fire a `CustomEvent` (`change`, `dismiss`, `confirm`) for anything the page reacts to.
   **Done when** the component works with the keyboard alone.

5. **Catalog entry** in `components.json`: `id`, `class`, `name`, `variants`, `states`.

6. **Specimen** `components/<id>.html`: a `.specimen` grid, columns = states, rows = variants, built like `button.html`. Pin pseudo-states with `data-force`. It loads `../ds.css`, `../../playground/specimen.css` (Minimaly) or your own specimen stylesheet, and `../ds.js`.

7. **Card** `catalog/<id>.md`, under 20 lines: role and when not to use it, the markup to copy, variants, states, keyboard, what needs `ds.js`. Add the id to the list in `catalog/README.md`.

8. **Verify.**
   - `kit/playground/?ds=<ds>#<id>` in light and dark: every cell renders, nothing overflows.
   - `kit/playground/check.html?ds=<ds>` (the Playground's **Check all**): every specimen of the design system reports OK.
   - Use it in a topic screen, then `node kit/skills/build-mockup/validate.mjs <group>/<topic>` (0 error) and the render linter `lint.html?topic=<group>/<topic>` (0 error).
   - Keyboard pass: Tab reaches it, the keys of step 1 work, focus is visible.
   - Motion pass with the browser visible: open, close, change state, under normal and reduced motion. A hidden browser pane does not paint frames: animations look frozen there, it proves nothing.
   **Done when** all four pass and a screenshot shows the specimen in both themes.

## Limits

The steps do not judge taste. Compare the result with the components next to it: same density, radius, weight and rhythm, or a written reason to differ.
