# Chart

A trend, a comparison or a share, drawn by D3 in the page and dressed by `charts.css`, so every chart looks the same. One figure alone is a `stat`, values to read or sort are a `table`, a run toward a known end is a `progress`.

```html
<figure class="chart">
  <div class="chart__head">
    <h3 class="chart__title">Revenue</h3>
    <p class="chart__figure">$48.2K</p>
    <span class="segmented" role="group" aria-label="Period"><button class="btn" aria-pressed="true">7D</button><button class="btn" aria-pressed="false">30D</button></span>
  </div>
  <div class="chart__plot" id="revenue" role="img" aria-label="Revenue per day, direct and partners">
    <div class="tooltip chart__tip" hidden><strong></strong><span class="tooltip__lead"></span></div>
  </div>
  <ul class="chart__legend">
    <li class="chart__key" data-series="1"><i class="chart__swatch"></i>Direct</li>
    <li class="chart__key" data-series="2"><i class="chart__swatch"></i>Partners</li>
  </ul>
</figure>
```

```js
// days: ["Mon", …], series: one array of values per series.
const plot = document.getElementById("revenue"), W = plot.clientWidth, H = 240, m = { top: 8, right: 8, bottom: 24, left: 36 };
const x = d3.scalePoint(days, [m.left, W - m.right]);
const y = d3.scaleLinear([0, d3.max(series.flat())], [H - m.bottom, m.top]).nice(4);
const svg = d3.select(plot).insert("svg", ":first-child").attr("viewBox", [0, 0, W, H]).attr("aria-hidden", "true");
svg.append("g").attr("class", "chart__axis").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("~s")).tickSize(m.left + m.right - W).tickPadding(8));
svg.append("g").attr("class", "chart__axis").attr("transform", `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).tickSize(0).tickPadding(10));
svg.selectAll(".chart__series").data(series).join("g").attr("class", "chart__series").attr("data-series", (s, k) => k + 1)
  .append("path").attr("class", "chart__line").attr("d", (s) => d3.line((v, i) => x(days[i]), y)(s));
```

- Needs D3 before the chart script: `<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>`. The period selector needs `ds.js`; the page flips `aria-pressed` and redraws.
- Color is never written in the script. A mark takes the accent: enough for one series, which needs no legend. `data-series="1"` to `"6"` on a mark, on its `chart__series` group or on its key gives a series color (`--color-series-*`): in that order, the same series keeps its number on every screen, and never for a status. More than six: fold the rest into one.
- Kinds, by what D3 draws. Line: a `chart__line` per `chart__series`, with an optional `chart__area` and `chart__dot`. Bars: `rect.chart__bar`. Donut: `data-variant="donut"` on the chart, `path.chart__slice`, and a value in each key (`<strong>46%</strong>`). Sparkline: `<span class="chart" data-variant="sparkline" role="img" aria-label="…">` holding only its SVG, a line without axis, inline in a sentence, a cell or a `stat`.
- Axes: `chart__axis` on the group a D3 axis is called on. Ticks as long as the plot are the grid.
- Hover: a mark that is hovered, focused (`tabindex="0"` on bars and slices) or `data-active` stays bright, the others dim. For a line, set `data-active` on the `chart__series` nearest to the pointer and on its key. `chart__cursor` is the hairline at the position read.
- Bubble: fill the `tooltip`, set its `left` and `top` in px of the plot (it sits above that point), toggle `hidden`. A delta is a `badge` inside its `<strong>`; the page sets its tone, since up is not always good. Working code for each kind: `components/chart.html`.
- Empty: an `empty` with `data-variant="compact"` in the plot. Loading: `loadInto(plot, load, { height: 240 })`, where `load` resolves to what the plot holds.
- Draw at the width of the plot, redraw when it changes. The plot's `aria-label` says what the chart shows.
