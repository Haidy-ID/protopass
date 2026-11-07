# States

States are why a prototype beats a static mockup. Each one answers: what does the person see, what does it mean, what can they do next?

- **Empty.** Say what will live here and give the one action that fills it. "No loans yet. Add the first one." A bare illustration with no action is a dead end.
- **Loading.** Keep the layout in place with `.skeleton` shapes close to the real content. A spinner alone is for a short wait inside a control.
- **Error.** Say what happened, in the person's words, then how to get out. Keep what they typed. Put the message where the problem is: a field error under its field, a page error at the top.
- **Partial.** Some data arrived, some did not. Show what you have and mark what is missing.
- **Success.** Show the result. A `toast` confirms a small action. A big one deserves a state of its own, with the next step.
- **First use and returning use differ.** A person with thirty items does not need the same screen as one with zero.
- **Limits.** Offline, no permission, quota reached, deleted item, expired link: list the ones this product really has.
- **In between.** A button that sends shows it is sending and cannot be sent twice.

Each state is visibly different from the default, and its note in `topic.json` says why it exists. A flow that only shows the happy path has not been designed yet: put the failures in a flow too.
