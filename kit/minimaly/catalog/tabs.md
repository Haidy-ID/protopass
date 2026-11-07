# Tabs

Sections of one view, one visible at a time. More than 4, or labels longer than two words: tabs, not a `segmented`. Needs `ds.js`.

```html
<div class="tabs" role="tablist" aria-label="Project">
  <button class="tabs__tab" role="tab" id="t-overview" aria-controls="p-overview" aria-selected="true">Overview</button>
  <button class="tabs__tab" role="tab" id="t-activity" aria-controls="p-activity">Activity</button>
</div>
<div class="tabs__panel" role="tabpanel" id="p-overview" aria-labelledby="t-overview">…</div>
<div class="tabs__panel" role="tabpanel" id="p-activity" aria-labelledby="t-activity">…</div>
```

- A count after the label: `<span class="tabs__count">32</span>` (`.btn__count` in a `segmented`).
- One 2 px indicator slides under the selected tab. Selected and idle tabs share one weight, so a tab never changes width.
- Click, ← →, Home and End select at once. Only the selected tab is in the Tab order. Disabled tabs are skipped.
- `ds.js` hides the other panels and fires `change` on the tablist (`event.detail` is the tab).
- `aria-label` names what is split into sections, not the widget. Give panels of different lengths a `min-height` if the page below must not move.
