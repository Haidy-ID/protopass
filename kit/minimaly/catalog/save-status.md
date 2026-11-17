# Save status

One line that says where an automatic save stands, near what is saved (a top bar, a form head). A save the person starts with a button: an `async-button`. Needs `ds.js` (icons, announcement).

```html
<div class="save-status" data-state="saved">
  <span class="save-status__text" data-for="saving"><i class="icon" data-icon="circle-notch"></i>Saving…</span>
  <span class="save-status__text" data-for="saved"><i class="icon" data-icon="check"></i>Saved just now</span>
  <span class="save-status__text" data-for="error"><i class="icon" data-icon="warning"></i>Not saved<button class="btn">Retry</button></span>
</div>
```

- The page sets `data-state`: `saving`, `saved` or `error`. No `data-state`: the line is empty and keeps its height.
- The new text swaps in and is announced politely; a failed save shakes once.
- The wording is the page's, the relative time too ("Saved 2 min ago"): rewrite the saved text as time passes, it is not announced again.
- Retry is a plain `.btn`: the page listens to its `click` and sets `saving` again.
- The line is 32 px high in every state, so the bar around it never moves.
