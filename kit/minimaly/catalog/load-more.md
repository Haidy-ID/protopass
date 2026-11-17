# Load more

The next rows of a feed on request, and how far the reader is. Prefer it to `pagination` where the page footer must stay reachable (a feed, a list on a website); to jump to a known page of a long table, use `pagination`. Needs `ds.js` (async button).

```html
<div class="load-more">
  <button class="btn" data-busy="Loading" data-done="Loaded" data-error="Try again">Load more</button>
  <span class="load-more__count" role="status">Showing 20 of 134</span>
</div>
```

```js
button.onclick = () => runButton(button, loadNextRows).then(() => { count.textContent = "Showing 40 of 134"; });
```

- The button is an `async-button`: busy while the rows load, then done or error. Focus stays on it, so the next press is one key away.
- The count is the page's: update it after each load. `role="status"` announces the new figure.
- Everything loaded: `hidden` on the button, and the count says so ("All 134 shown").
