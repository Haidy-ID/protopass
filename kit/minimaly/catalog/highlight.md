# Highlight

A frame over a part of a page, or of a page shown in a frame, with a tag that names it: what the pointer is on, what is selected. Never takes the pointer. A message about the part: a `tooltip` or a `popover`.

```html
<div class="highlight" data-variant="selected" style="top: 120px; left: 80px; width: 320px; height: 48px"><span class="highlight__tag">scenes/farm.md:12</span></div>
```

- The page places it (`position: fixed`: viewport coordinates, plus the offset of the frame for a page in an iframe) and moves it when the part moves or scrolls. It glides between places.
- Default: a thin accent line over a soft fill, for the part under the pointer. `data-variant="selected"`: a firm line, no fill, for a part chosen.
- The tag stands above the top left corner, `data-side="bottom"` puts it under, for a part at the top of the view. No tag: leave it out.
- Hide with the `hidden` attribute.
