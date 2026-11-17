# Stat

One figure that matters and what it is compared to: a KPI on a dashboard. Several figures over time are a `chart`; a figure inside a sentence or a table is plain text, or a `value` when it changes live.

```html
<div class="stat">
  <span class="stat__label">Revenue</span>
  <strong class="stat__figure">$8,420</strong>
  <span class="stat__compare"><span class="badge" data-variant="success">+35%</span>vs $6,231</span>
  <span class="chart" data-variant="sparkline" role="img" aria-label="Revenue over 12 weeks, rising"></span>
</div>
```

- The delta is a `badge` and the page sets its tone: `success` when the change is good, `critical` when it is bad, none when it carries no judgement. Up is not always good (churn, latency). Keep the sign in the text, so the direction reads without color.
- The comparison says what the figure is measured against: "vs $6,231", "vs last month".
- Live figure: `<strong class="stat__figure"><span class="value" data-label="Revenue">$8,420</span></strong>`, see `value`. Needs `ds.js`.
- Sparkline: optional, drawn by D3 in the accent, see `chart`. It sits beside the figure.
- No surface of its own: put it in a `card__body`, or several side by side in one card.
