# Avatar

Person in a circle: initials, or a photo. 24 px, `lg` is 32 px.

```html
<span class="avatar">JS</span>
<span class="avatar" data-variant="lg"><img src="photo.jpg" alt=""></span>
<span class="avatars"><span class="avatar">JS</span><span class="avatar">ML</span><span class="avatar">+3</span></span>
```

- `.avatars` overlaps a group (presence, assignees). Put a `+N` avatar last when the group is cut.
- Two-letter initials, uppercase.
