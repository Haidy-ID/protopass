# Skeleton

Holds the place of content still loading, at its final height, so the page does not jump when it lands. Needs `ds.js`.

```js
loadInto(box, () => fetch("/summary").then((r) => r.text()), { lines: 3, label: "Summary" });
loadInto(chart, loadChart, { height: 240 });
```

- `loadInto(box, load, { lines, height, label })`: shows the skeleton in `box`, waits for `load()` (an HTML string or a node), then puts it in place.
- Text: one bar per line of the surrounding type, the last one shorter. Anything else (chart, media, fixed card): `height` in px, one block.
- Silent for 120 ms: an answer faster than that never shows a skeleton. Once painted it stays at least 380 ms, so it cannot blink.
- `box` carries `aria-busy` while loading; `label` announces "Summary loaded" once.
- If `load()` rejects, the skeleton stays and the promise rejects: replace it with the error.
