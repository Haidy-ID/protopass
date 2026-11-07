# Dropzone

Where files are dropped or picked: attachments, imports, uploads. A single file next to other fields can be a plain `.btn` that opens the picker. Needs `ds.js`.

```html
<label class="dropzone" data-max-mb="25">
  <input type="file" multiple accept=".pdf,.png,.jpg,image/jpeg">
  <span class="dropzone__icon"><i class="icon" data-icon="upload-simple"></i></span>
  <span class="dropzone__title">Drop files here or <span class="dropzone__browse">browse</span></span>
  <span class="dropzone__hint">PDF, PNG or JPG · up to 25 MB</span>
</label>
```

- The label wraps a visually hidden file input: click, Tab then Enter or Space open the picker, and the box shows the focus ring.
- Files over it: `data-over` (accent, solid border, the icon lifts). Accepted files fire `files` (`event.detail.files`); the page lists or uploads them.
- Files outside `accept` or over `data-max-mb` are refused: `data-invalid` tints it red and shakes it once. Say why in the hint.
- Disabled: `disabled` on the input.
