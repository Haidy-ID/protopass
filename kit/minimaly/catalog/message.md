# Message

One turn of a conversation with an agent. `.thread` stacks the turns, 680 px wide at most, centered. Pair with `composer` under it.

```html
<div class="thread">
  <div class="message" data-from="user"><p class="message__text">Which loans are late?</p></div>
  <div class="message" data-from="agent">
    <span class="message__who"><i class="icon" data-icon="sparkle"></i>Atlas</span>
    <details class="tool-call" data-state="done">…</details>
    <p class="stream message__text">Three loans are late <a class="cite" href="…" data-tip="…" aria-label="Source 1: Loans">1</a>.</p>
    <div class="message__actions"><button class="btn" data-variant="icon" aria-label="Copy"><i class="icon" data-icon="copy"></i></button></div>
  </div>
</div>
```

- `data-from="user"`: a bubble on the right, attachments under it. `data-from="agent"`: the agent's name in violet, then its blocks in order (`reasoning`, `tool-call`, `stream`, `typing` while it works).
- `.message__actions` (copy, retry) show on hover and keyboard focus. Icon buttons with `aria-label`.
- Stream an answer with `streamText(el, html)`: citations appear in place. Before the first word, a `typing` row.
