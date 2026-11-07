# Streaming text

An agent's answer arriving word by word. Pair it with a `typing` row before the first word. Needs `ds.js`.

```html
<p class="stream" id="answer"></p>
```

```js
await streamText(document.getElementById("answer"), text, { rate: 18 });
```

- `rate` is in words per second. It follows the clock, not the frames, so a slow screen does not slow the answer down.
- A violet caret follows the last word while it streams. `aria-busy` keeps a screen reader waiting until the end, then it reads the whole answer once.
- A click on the text shows it all at once. Reduced motion shows it at once.
- Calling it again on the same element starts over with the new text.
- HTML works too: `streamText(el, 'Late since Monday <a class="cite" …>1</a>.')`. Words stream inside their elements; a citation, an icon or anything with `data-stream-whole` appears whole when reached.
