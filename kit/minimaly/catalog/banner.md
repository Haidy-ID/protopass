# Banner

A message in the page flow about the page or the whole product: news, a result, a risk, a failure. A short outcome of one action is a `toast`.

```html
<div class="banner" data-variant="warning" role="status">
  <i class="icon" data-icon="warning"></i>
  <div class="banner__body"><span class="banner__title">Two screens have no state</span><span class="banner__text">Flows that use them cannot show errors.</span>
    <div class="banner__actions"><button class="btn">Review screens</button></div></div>
  <button class="btn" data-variant="icon" data-dismiss aria-label="Dismiss"><i class="icon" data-icon="x"></i></button>
</div>
```

- Variants: none (info, accent), `success`, `warning`, `critical` (use `role="alert"` for critical; it shakes once when it appears). Icons: `info`, `check-circle`, `warning`, `warning-octagon`.
- It slides in when it appears. `data-dismiss` folds it away, closes its room, removes it and fires `dismiss` on its parent (needs `ds.js`).
