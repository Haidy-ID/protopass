# List

Rows of things of the same kind: a lead (avatar or icon), a body (title, meta), a trail (badge, date, chevron).

```html
<div class="list" data-variant="inset">
  <a class="list__item" href="detail.html">
    <span class="list__lead avatar">SA</span>
    <span class="list__body"><span class="list__title">Drill</span><span class="list__meta">Sam · back Sep 30</span></span>
    <span class="list__trail"><span class="badge" data-variant="accent">New</span><i class="icon list__chevron" data-icon="caret-right"></i></span>
  </a>
</div>
```

- `<a>` or `<button>` items are clickable: highlight, chevron nudge. A `<div>` item is static. `aria-current` marks the open one.
- Plain (rows on the page, dividers only) or `data-variant="inset"` (in a card). Rows enter one after the other on first paint.
- Title and meta cut with an ellipsis. Many columns to compare: a `table`.
- `data-selectable` (needs `ds.js`): static rows (`<li>`, `<div>`) that start with `<label class="checkbox list__select"><input type="checkbox" aria-label="Select Drill"><span class="checkbox__box"></span></label>`. Shift+click selects a range. The list fires `change` (`event.detail` is the selected rows) and drives a `bulk-bar`.
- `data-reorder` (needs `ds.js`): static rows that start with `<button class="list__handle" aria-label="Reorder Drill"><i class="icon" data-icon="dots-six-vertical"></i></button>`. Dragging the handle carries the row, a line shows where it will land, and the view scrolls near its edges. On the handle: Space lifts, ↑ ↓ move, Space drops, Esc puts it back, each step announced. The list fires `reorder` (`event.detail`: `item`, `from`, `to`).
