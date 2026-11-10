# Code

A block of code in a page: a snippet in an article or a case study. Mono, scrolls sideways instead of wrapping.

```html
<pre class="code"><code><span class="code__comment">// latest edit of each field wins</span>
<span class="code__keyword">const</span> merged = { ...older, ...newer };</code></pre>
```

- Two tones only: `code__comment` quiet, `code__keyword` strong. No syntax colors: the page stays in Minimaly's palette.
- A line the text talks about: wrap it, line break included, in `<span class="code__mark">…</span>`.
- Inline code inside `prose` is `<code>` alone. A change between two versions is a `diff`.

## With a head

The file the code comes from and a copy button, when a reader is likely to reuse the code. Needs `ds.js` for the copy.

```html
<figure class="code-block">
  <figcaption class="code-block__head"><span class="code-block__file"><i class="icon" data-icon="file-ts"></i>sync/answer.ts</span><button class="btn" data-variant="ghost" data-copy=""><i class="icon" data-icon="copy"></i>Copy</button></figcaption>
<pre class="code"><code>…</code></pre>
</figure>
```

- An empty `data-copy` copies the text of the block's code. The button then says "Copied" for 2 s (`async-button`).
- A long file name is cut with an ellipsis; the button keeps its place.
