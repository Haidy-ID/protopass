# Bulk bar

The actions on the rows selected in a `table` or a `list` with `data-selectable`. One row acted on alone: a `menu` on that row instead. Needs `ds.js`.

```html
<table class="table" data-selectable id="tasks" aria-label="Tasks">…</table>
<div class="bulk-bar" data-for="tasks" hidden>
  <span class="bulk-bar__count"></span>
  <div class="bulk-bar__actions"><button class="btn"><i class="icon" data-icon="archive"></i>Archive</button><button class="btn"><i class="icon" data-icon="trash"></i>Delete</button></div>
  <button class="btn" data-variant="icon" data-clear aria-label="Clear selection"><i class="icon" data-icon="x"></i></button>
</div>
```

- `data-for` is the id of the table or list. Place the bar right after it: it stays in view at the bottom while the rows scroll.
- Hidden until a row is selected. It rises in and sinks out; `ds.js` writes the count ("3 selected") and announces it.
- `[data-clear]` empties the selection and puts the focus back on the first checkbox.
- The actions are the page's: read the rows from the `change` event of the table or list (`event.detail`), or from `[aria-selected="true"]`.
- Three actions at most, the destructive one last. More: one `.btn` that opens a `menu`.
