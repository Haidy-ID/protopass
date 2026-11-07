# Attachment

A file joined to a message or a form: its type, name and size, with a way to take it back. Where files are dropped is a `dropzone`; a labelled value that is not a file is a `chip`. Needs `ds.js`, which builds it from the name and size.

```html
<ul class="attachments" aria-label="Attachments">
  <li class="attachment" data-name="quarterly-report.pdf" data-size="2457600"></li>
  <li class="attachment" data-name="site-photo.jpg" data-size="845000" data-state="uploading" data-progress="40"></li>
  <li class="attachment" data-variant="compact" data-name="lease.docx" data-size="120000" data-state="error" data-error="Too large"></li>
</ul>
```

- The icon follows the extension (PDF, document, sheet, slides, image, audio, video, archive, code, text). Long names shorten before the extension; hover shows the full name.
- `data-state="uploading"` with `data-progress` (0 to 100): a thin accent bar fills along the bottom, the percent shows in mono. Remove the attribute once uploaded.
- `data-state="error"`: critical tint, one shake, `data-error` replaces the size, a retry button appears and fires `retry`. The error is announced.
- The remove button (`Remove <name>`) fires `remove` on the attachment, folds it away and moves the focus to the next file.
- `compact`: one line, for a row of files above a `composer` field. Put the `.attachments` list first in the composer, or under a `dropzone`: files share a row and grow to fill it (320 px at most), an empty list takes no room.
