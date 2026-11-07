# Pagination

Pages of a long list or table. Needs `ds.js`, which draws the buttons.

```html
<nav class="pagination" data-pages="24" data-page="1" aria-label="Results pages"></nav>
```

- Previous, 7 slots and next. A slot is a page or a gap (…): first and last page always, the current page and its neighbours.
- Every slot is as wide as the largest page number, from the first paint, so the arrows never move while paging.
- A click updates `data-page` and fires `change` (`event.detail` is the page). Setting `data-page` from script redraws it.
- The current page has `aria-current="page"`. Previous and next are disabled at the ends.
