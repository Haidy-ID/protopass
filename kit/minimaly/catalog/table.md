# Table

Rows of data with the same columns. Numbers align right, in tabular digits.

```html
<table class="table" data-sortable data-selectable id="tasks" aria-label="Tasks">
  <thead><tr><th class="table__select"><label class="checkbox"><input type="checkbox" aria-label="Select all tasks"><span class="checkbox__box"></span></label></th><th>Task</th><th data-align="end">Hours</th><th data-sort="false">Status</th></tr></thead>
  <tbody><tr><td class="table__select"><label class="checkbox"><input type="checkbox" aria-label="Select Write the summary"><span class="checkbox__box"></span></label></td><td>Write the summary</td><td data-align="end">12</td><td>…</td></tr></tbody>
</table>
```

- `data-sortable` (needs `ds.js`): each header becomes a button. Clicks cycle ascending, descending, then back to the original order. `data-sort="false"` leaves a column unsortable.
- Numbers sort as numbers, text as text. `data-value` on a cell sorts by that instead of its text (a date, a code).
- Rows glide from their old place to the new one, nothing jumps. The header carries `aria-sort`.
- `data-align="end"` on numeric headers and cells.
- `data-selectable` (needs `ds.js`): a `.table__select` cell with a `checkbox` leads each row, and the head holds the select-all (a dash when only some rows are selected). Shift+click selects a range. Selected rows carry `aria-selected="true"` and a quiet tint; sorting keeps them.
- The table fires `change` (`event.detail` is the selected rows). Actions on them go in a `bulk-bar`; search and filters above the table go in a `toolbar`.
