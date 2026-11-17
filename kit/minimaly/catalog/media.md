# Media

An image or a screenshot in a frame at a fixed ratio, with an optional caption. The frame holds an `<img>` (cover) or a placeholder made of real elements, so Copy to Figma keeps it.

```html
<figure class="media"><div class="media__frame"><img src="…" alt="The sync screen"></div><figcaption class="media__caption">Local notes wait in grey.</figcaption></figure>
<figure class="media"><div class="media__frame">
  <img src="…" alt="Hills under a pale sun">
  <button class="media__action" aria-label="Save" aria-pressed="false"><i class="icon" data-icon="bookmark-simple"></i></button>
  <div class="media__overlay" data-blur><strong>Sync, without the noise</strong><span>Local notes wait in grey.</span></div>
</div></figure>
```

- `--ratio` sets the frame (16 / 10 by default; 21 / 9 for a hero, 4 / 5 for a portrait).
- No `background-image`: put the picture in an `<img>`.
- `.media__overlay`: a title (`<strong>`) and a line over the bottom of the picture. A veil of the raised surface carries the text in the primary text role, so it reads on any picture in both themes. `data-blur` also softens the picture under the text. Two lines at most: more belongs in the caption.
- `.media__action`: one icon button on the picture, top right, on a disc of the raised surface (needs `ds.js` for the icon). `aria-pressed="true"` turns the icon accent; flipping it is the page's job. Always an `aria-label`.
