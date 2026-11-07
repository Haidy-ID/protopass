# Steps

The plan of a run, done row by row: an agent task, an import, a publish. Needs `ds.js` for `setSteps`.

```html
<ol class="steps" aria-label="Report generation">
  <li>Read the sources<span class="steps__meta">1.2s</span></li>
  <li>Write the summary<span class="steps__meta">3.4s</span></li>
</ol>
```

```js
setSteps(list, 1);        // first done, second running
setSteps(list, 1, true);  // second failed, nothing after it ran
setSteps(list, 2);        // all done
```

- Each step: pending (hollow), active (violet spinner, the agent at work), done (green check), failed (red cross, the row shakes once).
- Before `current`: done. After a failure, the next steps stay pending: nothing pretends to have run.
- `.steps__meta`, a duration or a count, appears when its step is done. Its room is kept, so rows never shift.
- The list carries `aria-busy` while running and the active step `aria-current="step"`.
