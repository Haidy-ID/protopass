# Graph

Nodes and links the page lays out freely in an SVG (rings, clusters, a map of ideas), on a ground one drags and zooms. A tree read in columns is a `node-map`; a figure over time is a `chart`. Needs `ds.js` (camera).

```html
<div class="graph" tabindex="0" aria-label="Loops">
  <div class="graph__world"><svg width="420" height="300" viewBox="-210 -150 420 300">
    <text class="graph__title" text-anchor="middle">Loop</text><text class="graph__subtitle" y="20" text-anchor="middle">what turns</text>
    <path class="graph__ring" d="…"/><path class="graph__arrow" d="M-5 -6 L5 0 L-5 6" transform="…"/>
    <line class="graph__edge" x1="0" y1="-110" x2="150" y2="-110"/>
    <g class="graph__node" data-variant="solid" tabindex="0" role="button" transform="translate(0 -110)"><title>Start</title>
      <circle class="graph__halo" r="23"/><circle class="graph__body" r="14"/><text x="-32" text-anchor="end"><tspan class="graph__slot">Start</tspan></text></g>
  </svg></div>
  <p class="graph__hint"><span><span class="kbd">0</span>everything</span></p>
</div>
```

- The page draws and places every mark; give the `svg` its `width` and `height`, then call `fitGraph(graph, box)` (a box of the drawing, or none for all of it).
- Node: a `.graph__body` (any shape), an optional `.graph__halo`, `text` labels (`.graph__code` bold, `.graph__slot` mono label, `.graph__inside` inside the body). Hollow by default; `data-variant="solid"` fills it in ink.
- Tones: `data-tone="critical"` dashes in red (missing, broken), on a node or on one halo, ring or arrow; `data-tone="success"` rings in green; with `solid`, filled.
- Picking: `data-picking` on the graph dims every node and edge without `data-lit`; a lit edge turns accent. The picked node takes `aria-pressed="true"`.
- Keys on the focused ground: arrows move, + and − zoom, 0 or a double click frame all. A node reached with Tab comes into view; Enter and Space are the page's. The click ending a drag picks nothing.
- `svg.graph__glyph` draws one mark alone, for a legend.
