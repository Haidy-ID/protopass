# Slider

A value along a range where the feel matters more than the exact figure: a volume, an opacity, a temperature. An exact number is an `input` with a stepper; an on/off setting is a `switch`. Needs `ds.js`, which draws the track, the ink fill and the thumb around the native input.

```html
<div class="slider" data-unit="%" data-scale>
  <label class="slider__label">Opacity</label><output class="slider__value"></output>
  <input type="range" min="0" max="100" value="64">
</div>
<div class="slider" data-marks><input type="range" min="0" max="1" step="0.1" value="0.7" aria-label="Temperature"></div>
```

- The native range input stays, invisible, over the drawing: drag, click on the track, and the keys (← → ↑ ↓ a step, PageUp PageDown, Home End) all come from it.
- Label and readout are optional; without a label, `aria-label` on the input. `data-unit` follows the number in the readout, the scale and what a screen reader hears.
- `data-scale` writes the min and max under the track; `data-marks` puts a dot on each step (20 steps at most).
- The thumb swells while held and follows the pointer at once; keys glide it. `disabled` on the input fades the whole slider.
- The page listens to `input` and `change` on the input. Setting the value from script: set it, then dispatch `input` on the input.
