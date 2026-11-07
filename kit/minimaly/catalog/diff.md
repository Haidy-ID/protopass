# Diff

What a change does to a file: a head with the path and the + and − counts, hunks, numbered lines. Static: the page writes the lines.

```html
<div class="diff">
  <div class="diff__head"><i class="icon" data-icon="file-css"></i><span class="diff__path">screens/screens.css</span><span class="diff__stat"><span data-kind="add">+3</span><span data-kind="del">−2</span></span></div>
  <div class="diff__hunk">@@ -18,6 +18,7 @@ Buttons</div>
  <div class="diff__line"><span class="diff__num">18</span><span class="diff__sign" aria-hidden="true"></span><code>.book {</code></div>
  <div class="diff__line" data-kind="del"><span class="diff__num">19</span><span class="diff__sign" aria-hidden="true">−</span><code>  background: coral;</code></div>
  <div class="diff__line" data-kind="add"><span class="diff__num">19</span><span class="diff__sign" aria-hidden="true">+</span><code>  background: var(--color-ink);</code></div>
</div>
```

- `data-kind`: `add` (green tint, +), `del` (red tint, −), none for an unchanged line. The color is never alone: the sign column says it too.
- Long lines are cut at the edge, not wrapped: a diff keeps one line per line of code. Several files: one `.diff` each, listed in a `pane`.
