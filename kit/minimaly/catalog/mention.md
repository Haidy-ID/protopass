# Mention

A person or a thing named inside running text: a 16 px avatar, then the name with a dotted underline, on the baseline of the sentence. A value set apart from text (a column, a filter): a `chip`.

```html
<p><a class="mention" href="sam.html"><span class="avatar" aria-hidden="true">S</span><span class="mention__name">Sam Adler</span></a> moved <span class="chip"><i class="icon" data-icon="folder"></i>Atlas</span> to review.</p>
<span class="mention"><span class="avatar" aria-hidden="true"><img src="mia.jpg" alt=""></span><span class="mention__name">Mia Chen</span></span>
<button class="mention">…</button>
```

- `<span>` is static. `<a>` or `<button>` opens the entity: the name turns accent on hover and takes the focus ring, and the target is 32 px high without opening the line.
- The avatar holds one initial or a photo. The name takes the size and color of the text around it, in medium weight.
- It never breaks across two lines. No `ds.js`.
- A `chip` also sits inline in a sentence, as above: it is 22 px high, so the line that holds it opens by a few pixels.
