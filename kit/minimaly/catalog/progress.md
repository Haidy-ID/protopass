# Progress

A run with a measurable end: an upload, an import, an export. Without any measure, a `typing` row or a busy button says it better. Needs `ds.js` for `setProgress`.

```html
<div class="progress">
  <span class="progress__label" id="upload-label">Uploading 3 files</span><span class="progress__value"></span>
  <div class="progress__track" role="progressbar" aria-labelledby="upload-label" aria-valuemin="0" aria-valuemax="100"><div class="progress__fill"></div></div>
</div>
```

```js
setProgress(el, null);       // total not known yet
setProgress(el, 320, 840);   // 38%
```

- The fill and the readout both use the whole percent, so they never disagree.
- `null`: the fill crawls towards a third and waits there, the readout says "Working" (`data-working` to change it). Kept low, so the real value rarely lands behind it.
- 100% turns the fill green and is announced once.
- Static markup without script: `style="--progress: 40"` and the readout text.
