# Toolbar

The bar above a `table` or a `list`: a search field, filters, then the page actions at the end. Actions on selected rows go in a `bulk-bar`, not here.

```html
<div class="toolbar">
  <label class="input toolbar__search"><i class="icon" data-icon="magnifying-glass"></i><input type="search" placeholder="Search tasks" aria-label="Search tasks" data-filter="tasks"></label>
  <label class="select"><span class="select__label">Status</span><select><option>All</option><option>Open</option></select><i class="icon select__icon" data-icon="caret-down"></i></label>
  <button class="btn" aria-pressed="false">Mine</button>
  <div class="toolbar__actions"><button class="btn" data-variant="primary"><i class="icon" data-icon="plus"></i>New task</button></div>
</div>
<table class="table" id="tasks" aria-label="Tasks">…</table>
<div class="empty" data-variant="compact" data-for="tasks" hidden>…</div>
```

- `data-filter="<id>"` on the search field (needs `ds.js`): typing hides the rows of that table or list that do not hold the text. When none is left, the `empty` with `data-for="<id>"` shows: write it after the rows.
- Filters are a `select`, or a `.btn` with `aria-pressed` for an on/off one. What they do to the rows is the page's job.
- `.toolbar__actions` goes last and sits at the end of the bar. One primary action at most.
- The bar wraps on a narrow screen and keeps 12 px under it, so the rows follow directly.
