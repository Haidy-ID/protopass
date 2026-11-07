# Tooltip

Dark bubble with a bold title and an optional lead line. The page positions it (`position: fixed` or `absolute`).

```html
<div class="tooltip" role="tooltip">
  <strong><i class="icon" data-icon="warning"></i>Response time</strong>
  <span class="tooltip__lead">Above limit for 3 days</span>
</div>
```

- Max 280 px wide. Hide with the `hidden` attribute.

## On hover, from an attribute

Pages that load `ds.js` get tooltips for free: put `data-tip="What this does"` on any button, link or control. The bubble shows after 200 ms on hover, at once on keyboard focus, above the element (below when there is no room), and hides on click, scroll or key press. Use it on icon-only buttons and on any action whose effect is not obvious from its label.

```html
<button class="btn" data-variant="icon" aria-label="Close" data-tip="Close (Esc)"><i class="icon" data-icon="x"></i></button>
```

Tooltips on the page form one group. Moving from one trigger to the next opens the next bubble at once, for 400 ms after the last one closed, and leaving waits 120 ms so crossing the gap between two buttons does not blink. A click, a key or a scroll resets the group.
