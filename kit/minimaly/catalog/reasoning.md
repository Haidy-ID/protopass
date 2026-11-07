# Reasoning

The agent's thinking, folded under one line above its answer. A run with known steps is a `steps` list; a single action is a `tool-call`.

```html
<details class="reasoning" data-state="thinking">
  <summary><i class="icon" data-icon="sparkle"></i><span class="typing__dots" aria-hidden="true"><i></i><i></i><i></i></span>Thinking…<i class="icon" data-icon="caret-right"></i></summary>
  <p class="reasoning__body">…</p>
</details>
```

- `data-state="thinking"`: the dancing dots of `typing` replace the sparkle and the label turns agent violet (the dots stay still under reduced motion). `done`: the sparkle comes back, neutral, and the label says how long it took ("Thought for 12s"). Keep both in the summary: CSS shows one.
- Native `<details>`: click, Enter or Space opens it; it opens and closes with a height animation. Closed by default: the answer matters more than the thinking.
- The page changes `data-state` and the label text. `ds.js` makes the dots dance.
