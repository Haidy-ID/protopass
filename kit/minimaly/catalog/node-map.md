# Node map

A tree that grows to the right, seen whole: each column is a title and its nodes on a line, and a node opens the column drawn on its right, level with it when there is room, joined by a link. For a branching structure read at once (a story, a decision tree, a site map). A folder tree to browse: `list` or `accordion`. Needs `ds.js` (heights, links, keys).

```html
<div class="node-map" aria-label="Story">
  <div class="node-map__branch">
    <section class="node-map__column" aria-current="true"><h3 class="node-map__title">The farm</h3>
      <ol class="node-map__nodes">
        <li><button class="node-map__node" aria-expanded="false"><span class="node-map__dot"><i class="icon" data-icon="door"></i></span><span class="node-map__name">The door</span><span class="node-map__text">It gives.</span></button></li>
        <li><button class="node-map__node" data-variant="conditional"><span class="node-map__dot"></span><span class="node-map__name">The well</span><span class="node-map__meta">if rope</span></button></li>
      </ol></section>
    <div class="node-map__twigs">
      <div class="node-map__branch" data-via="0"><section class="node-map__column"><h3 class="node-map__title">The cell</h3><span class="node-map__end" aria-label="End"></span></section></div>
    </div>
  </div>
</div>
```

- A `.node-map__branch` is a column, then in `.node-map__twigs` the branches its nodes open; `data-via` is the index of the opening node in that column. A column without nodes holds `.node-map__end`.
- `aria-current="true"` on the column one stands in: its dots in ink. `aria-expanded="true"` on each node on the way to it: accent dot, accent link, its column keeps its ink. `aria-expanded="false"` on the other nodes that open a column; none on a leaf.
- `data-variant="conditional"`: a node that is not there right now, hollow and dashed; its condition goes in `.node-map__meta` (mono). `.node-map__text` adds a line of text under the name.
- The dot holds an `.icon`, or a line-drawn `<svg>` of the page's own (stroked in the text color).
- ↑ ↓ along a column, → into the column a node opens, ← back to the node that opens this one; Enter or a click runs the button. One node takes Tab. The page scrolls the map's box; a map drawn again keeps the node under the keyboard if the page focuses it back.
