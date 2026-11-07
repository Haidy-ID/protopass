# Code

A block of code in a page: a snippet in an article or a case study. Mono, scrolls sideways instead of wrapping.

```html
<pre class="code"><code><span class="code__comment">// latest edit of each field wins</span>
<span class="code__keyword">const</span> merged = { ...older, ...newer };</code></pre>
```

- Two tones only: `code__comment` quiet, `code__keyword` strong. No syntax colors: the page stays in Minimaly's palette.
- Inline code inside `prose` is `<code>` alone. A change between two versions is a `diff`.
