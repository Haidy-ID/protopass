# Media

An image or a screenshot in a frame at a fixed ratio, with an optional caption. The frame holds an `<img>` (cover) or a placeholder made of real elements, so Copy to Figma keeps it.

```html
<figure class="media"><div class="media__frame"><img src="…" alt="The sync screen"></div><figcaption class="media__caption">Local notes wait in grey.</figcaption></figure>
```

- `--ratio` sets the frame (16 / 10 by default; 21 / 9 for a hero, 4 / 5 for a portrait).
- No `background-image`: put the picture in an `<img>`.
