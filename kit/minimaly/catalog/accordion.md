# Accordion

A list of questions, each one unfolds its answer. For a Q&A or any list read one item at a time.

```html
<div class="accordion">
  <details class="accordion__item">
    <summary>When is Compare available?<i class="icon" data-icon="caret-down"></i></summary>
    <div class="accordion__body">With at least two selected projects.</div>
  </details>
</div>
```

- Native `<details>`: opens with a click, Enter or Space, no script. Add `open` to show an item unfolded.
- Every item starts closed; several can be open at once.
- The summary is the question, one line if possible; the body is the answer, one or two sentences.
