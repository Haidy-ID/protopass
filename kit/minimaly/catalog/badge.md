# Badge

Status label, mono uppercase, tinted by tone. Never clickable.

```html
<span class="badge">CLOSED</span>
<span class="badge" data-variant="critical">AOG</span>
```

- Tones: none (neutral), `critical`, `warning`, `success`, `accent` (new or changed).
- Optional leading icon (12 px), one shape per tone, so the status reads without color: `<span class="badge" data-variant="success"><i class="icon" data-icon="check-circle"></i>RELEASED</span>`.
- Short uppercase codes or single words. A sentence belongs in text, not in a badge.
