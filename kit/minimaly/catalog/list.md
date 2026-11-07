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
