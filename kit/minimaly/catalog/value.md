# Value

A figure that updates live: a counter, a rate, a KPI. Tabular digits, and a short flash when it changes. The flash needs `ds.js`.

```html
<strong class="value" data-label="Open tasks">128</strong>
```

- The page only writes `textContent`. On each change the value lights up for `--duration-flash` with ↑ or ↓, placed outside the box so nothing moves.
- The tint is the accent, not success or critical: whether up is good depends on the figure.
- `data-label`: once the value has been quiet for 700 ms, a screen reader hears "Open tasks: 131". Omit it on figures that change every second.
- Static figures in a table do not need it; mono figures already have equal-width digits.
