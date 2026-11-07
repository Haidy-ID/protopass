# Async button

A `.btn` whose action takes time: idle, busy, done, error. The label changes, the button stays put. Needs `ds.js`.

```html
<button class="btn" data-busy="Publishing" data-done="Published" data-error="Try again">Publish</button>
<button class="btn" data-copy="hello@example.com"><i class="icon" data-icon="copy"></i>Copy</button>
```

```js
button.onclick = () => runButton(button, () => fetch("/publish", { method: "POST" }));
```

- `ds.js` stacks the four labels in one cell: the button is as wide as its longest label from the first paint.
- `runButton(btn, action, hold = 1400)`: busy while `action()` runs, then done or error for `hold` ms, then idle. A throw or a rejection ends in error and the promise rejects with it: showing the reason is the page's job.
- `data-copy`: copies on click, no script. Done says "Copied", error says "Failed", held 2 s; a new copy restarts the clock. An empty value does nothing.
- Busy is not disabled: focus stays, a second click is ignored. Use `disabled` only when the action is unavailable.
- The error label is the next action ("Try again"), not the diagnosis.
- The accessible name stays the idle label; done and error are announced.
