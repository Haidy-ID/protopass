# Date picker

One day picked on a month calendar: a due date, a return date, a start date. A date the person knows by heart and types faster (a birth date): an `input`. Needs `ds.js`, which builds the field and the calendar.

```html
<div class="date-picker" data-placeholder="Pick a date" data-min="2026-10-05" data-max="2026-12-20" aria-label="Due date"></div>
```

- `data-value` holds the ISO date (`2026-10-23`); the field shows it in the page language. `data-min` and `data-max` fade and strike the days outside and stop the keys at them.
- Click, Enter, Space or ↓ on the field open the calendar under it (above, or aligned right, when there is no room). Focus goes to the chosen day, else today.
- Keys in the calendar: ← → a day, ↑ ↓ a week, PageUp PageDown a month, Home End the start and end of the week, Enter or Space picks, Escape closes. Tab reaches the month arrows. Focus returns to the field.
- Six weeks always, starting on Monday, so changing month never resizes it. Today has an accent ring, the chosen day is ink.
- Picking writes `data-value` and fires `change` on the root (`event.detail.value`). The page may set `data-value`, `data-min` or `data-max` at any time.
- In a `field`, the field label names it (drop `aria-label`); `data-invalid` tints and shakes the box. `aria-disabled="true"` on the root disables it.
