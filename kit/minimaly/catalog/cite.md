# Citation

A numbered source inside an agent's answer. The number links to the source; its tooltip names it. Needs `ds.js` for the tooltip.

```html
… stays open until it is marked returned <a class="cite" href="https://…" data-tip="Loan policy · handbook.atlas.app" aria-label="Source 1: Loan policy">1</a>.
```

- One number per source, in order of first use; the same source keeps its number.
- `data-tip` gives title · domain; `aria-label` says "Source n: title", so the number is never read alone.
- Inline in text, so it is 16 px high: the one exception to the 32 px rule, like any text link.
