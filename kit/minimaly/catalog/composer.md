# Composer

Where a person writes to an agent: a growing field, actions under it, Send. For a plain note or a comment, use a `textarea`. Needs `ds.js`.

```html
<form class="composer" aria-label="Ask the agent">
  <textarea class="composer__input" placeholder="Ask about this loan…" aria-label="Message"></textarea>
  <div class="composer__bar">
    <button class="btn" data-variant="icon" type="button" aria-label="Attach"><i class="icon" data-icon="plus"></i></button>
    <button class="btn composer__send" data-variant="primary" type="submit">Send</button>
    <button class="btn composer__stop" type="button"><i class="icon" data-icon="stop"></i>Stop</button>
  </div>
</form>
```

- Send is disabled until there is text. Enter sends, Shift+Enter breaks the line; a click anywhere in the box puts the caret in the field.
- Sending fires `send` on the form (`event.detail.text`) and empties the field. The page shows the reply (`typing`, then `stream`).
- `aria-busy="true"` while the agent answers: Stop replaces Send and fires `stop`. `aria-disabled="true"` when nothing can be asked yet (disable the field and actions too).
- Actions on the left are icon buttons with `aria-label`: attach, mention, a model picker.
