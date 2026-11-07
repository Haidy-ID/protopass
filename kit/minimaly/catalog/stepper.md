# Stepper

The stages of a process, side by side: an application, an onboarding, a checkout. Two to five stages. A run of an agent is `steps`; a measured task is `progress`. Needs `ds.js` for the marks and lines.

```html
<ol class="stepper" aria-label="Loan application">
  <li data-state="done"><span class="stepper__status">Completed</span><span class="stepper__label">Application</span></li>
  <li data-state="current" aria-current="step"><span class="stepper__status">In progress</span><span class="stepper__label">Set up</span></li>
  <li><span class="stepper__status">Not started</span><span class="stepper__label">Approval</span></li>
</ol>
```

- `data-state`: `done` (green check, solid line after it), `current` (accent half circle, with `aria-current="step"`), none (dashed circle). Each state has its own shape, not only a color.
- The page writes the status words, so they read in the page's language; the marks are hidden from screen readers.
- Labels stay on one line and truncate: keep them to one or two words.
