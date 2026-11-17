# Feature tabs

The features of a product, one at a time: `tabs` that drive one large `media` and a line about it. Features to compare at a glance go side by side in cards instead. Needs `ds.js`.

```html
<div class="feature-tabs">
  <div class="tabs" role="tablist" aria-label="Features">
    <button class="tabs__tab" role="tab" id="t-capture" aria-controls="p-capture" aria-selected="true">Capture</button><button class="tabs__tab" role="tab" id="t-track" aria-controls="p-track">Track</button>
  </div>
  <div class="tabs__panel" role="tabpanel" id="p-capture" aria-labelledby="t-capture">
    <p class="feature-tabs__text">Write a loan down in ten seconds.</p>
    <figure class="media" style="--ratio: 16 / 9"><div class="media__frame"><img src="…" alt="…"></div></figure>
  </div>
  <div class="tabs__panel" role="tabpanel" id="p-track" aria-labelledby="t-track">…</div>
</div>
```

- Markup, keys and events are those of `tabs` (← → Home End, `change` on the tablist). Here the tabs are 40 px high in 14 px type.
- Give every panel the same `--ratio` and a text of one line: the section keeps its height when the tab changes. Three to five tabs, one or two words each. The new panel swaps in; nothing plays on a timer.
