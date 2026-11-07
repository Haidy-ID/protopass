# Table

Rows of data with the same columns. Numbers align right, in tabular digits.

```html
<table class="table" data-sortable aria-label="Tasks">
  <thead><tr><th>Task</th><th data-align="end">Hours</th><th data-sort="false">Status</th></tr></thead>
  <tbody><tr><td>Write the summary</td><td data-align="end">12</td><td>…</td></tr></tbody>
</table>
```

- `data-sortable` (needs `ds.js`): each header becomes a button. Clicks cycle ascending, descending, then back to the original order. `data-sort="false"` leaves a column unsortable.
- Numbers sort as numbers, text as text. `data-value` on a cell sorts by that instead of its text (a date, a code).
- Rows glide from their old place to the new one, nothing jumps. The header carries `aria-sort`.
- `data-align="end"` on numeric headers and cells.
