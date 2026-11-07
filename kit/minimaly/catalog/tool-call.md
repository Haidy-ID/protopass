# Tool call

One action the agent takes (a search, a read, a query), its target and its outcome, with the result folded under it. Several planned actions: `steps`. Needs `ds.js` for the status mark.

```html
<details class="tool-call" data-state="running">
  <summary><i class="icon tool-call__icon" data-icon="globe"></i><span class="tool-call__name">Searching the web</span><span class="tool-call__target">loan return policy</span></summary>
  <pre class="tool-call__result">5 results.</pre>
</details>
```

- `data-state`: `running` (violet spinner, violet name), `done` (green check), `failed` (red cross, red-tinted border, one shake). The page only changes `data-state`; ds.js builds the mark and gives it a matching label for screen readers.
- Name in words ("Read 12 documents"), target in mono (a query, a path), truncated with an ellipsis.
- The result opens under the row (click, Enter, Space). On failure, it says why.
