# Toast

Short news about something that just happened, bottom right, gone on its own. Not for anything the person must read or answer: that is a modal or an inline message. Needs `ds.js`.

```js
toast("Changes saved", { variant: "success" });
toast("2 items archived", { action: { label: "Undo", onClick: restore } });
const dismiss = toast("Upload failed", { variant: "critical", action: { label: "Retry", onClick: retry } });
```

- `toast(message, { variant, action, duration })` returns a function that dismisses it. Variants: none, `success`, `critical`.
- Gone after 4 s. `critical` stays until dismissed and shakes once when it lands. Hover or focus pauses the clock.
- The same message again restarts its clock instead of stacking a copy. At most 3 at once, the oldest leaves first.
- One action at most, named after what it does ("Undo", "Retry"). Choosing it dismisses the toast.
- A screen reader hears every message.
