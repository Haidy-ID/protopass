# Typing

The agent is working on an answer. Three dots in agent violet, and what it is doing in words when that helps. Needs `ds.js`: the dots dance a 12 s loop (wave, ping-pong, wave, Newton's cradle) and stay still under reduced motion.

```html
<span class="typing" role="status"><span class="typing__dots"><i></i><i></i><i></i></span>Reading 12 documents</span>
```

- Violet, because it is the agent. Never for a person.
- Dots only: give it `aria-label="Agent is writing"`.
- Remove it when the first word of the answer arrives, in the same place, so the answer takes its spot.
- A run with known steps is a `steps` list, not a typing row.
