# Behaviors

Composable interaction primitives in `ds.js`, exported on `window.Minimaly`. Compose these when building a new interactive component instead of hand-rolling focus, positioning, dismissal or type-ahead.

| Helper | Purpose |
| --- | --- |
| `announce(text)` | Speaks an outcome through the shared `role="status"` live region. |
| `normalizeText(text)` | Case- and accent-insensitive normalization (`"Échéance"` → `"echeance"`). |
| `labelOf(el)` | Accessible name of a control or item (ignores `.kbd` and `aria-hidden` children). Use it to name owned popups/listboxes and feed type-ahead. |
| `setTabStop(items, active)` | Sets `tabIndex = 0` on `active` (default `items[0]`) and `-1` on the rest so a composite widget keeps one tab stop. |
| `rovingFocus(items, current, event, opts)` | Handles `Arrow*`, `Home` and `End`, updates roving `tabIndex` and moves focus. Options: `{ orientation = "vertical", loop = true, focus = true, onMove }`. Returns the target element or `null`. |
| `createTypeahead(opts)` | Returns `{ match(items, current, event), reset() }`. Jumps to the next prefix match on printable keys, cycling on repeated letters. Options: `{ timeout = 500, textOf = labelOf }`. |
| `positionPopup(el, anchor, opts)` | Places a floating element and flips it when it would leave the viewport, setting `data-side` (`"bottom" \| "top" \| "right" \| "left"`) and optional `data-align="end"`. Options: `{ side = "bottom", align = "start", gap = 4, margin = 8, matchWidth = false, point = null, mode = "fixed" \| "anchored", alignOffset = 0, box = null }`. |
| `createDismissLayer(opts)` | Closes an open surface on outside `mousedown`, `resize`, and optional `closeOnScroll` / `closeOnFocusOut`. Options: `{ isInside, onDismiss, closeOnScroll = false, closeOnResize = true, closeOnFocusOut = false }`. Returns a cleanup function. |
| `focusRecovery(container, removed, opts)` | When `removed` holds focus, moves it to the next sibling, else the previous one, else `fallback`. Options: `{ itemSelector, focusSelector, fallback }`. |

## Pattern

```js
const { labelOf, setTabStop, rovingFocus, createTypeahead, positionPopup, createDismissLayer } = window.Minimaly;
const typeahead = createTypeahead();

// Opening a floating listbox
popup.setAttribute("aria-label", labelOf(trigger) || "Options");
popup.hidden = false;
positionPopup(popup, trigger, { side: "bottom", gap: 4, matchWidth: true });
const stopDismiss = createDismissLayer({
  isInside: (target) => popup.contains(target) || trigger.contains(target),
  onDismiss: () => close(),
});
setTabStop(items, active);
active?.focus();

// Inside keydown while open
if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); close(true); }
else if (!rovingFocus(items, document.activeElement, e)) {
  const hit = typeahead.match(items, document.activeElement, e);
  if (hit) { setTabStop(items, hit); hit.focus(); }
}
```
