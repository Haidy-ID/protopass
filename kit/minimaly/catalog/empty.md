# Empty state

What a page, a list or a search shows before there is content, and the one action that fills it.

```html
<div class="empty">
  <div class="empty__art"><i class="icon" data-icon="tray"></i></div>
  <h3 class="empty__title">No loans yet</h3>
  <p class="empty__text">Lend something and it shows here.</p>
  <div class="empty__actions"><button class="btn" data-variant="primary"><i class="icon" data-icon="plus"></i>Add a loan</button></div>
</div>
```

- The art floats slowly (still under reduced motion). `data-variant="compact"` for a panel or a search with no result: smaller, still.
- Title says what is missing, text says what will appear, one primary action at most.
