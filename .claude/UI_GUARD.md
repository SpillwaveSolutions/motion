# Spillwave UI Guard — Claude Code Instructions

When working on UI in this repository:

1. **Always start with the wireframe.**  
   Use the `ui-require-wireframe` skill before implementing any non-trivial UI change.

2. **Keep acceptance criteria current.**  
   The wireframe's acceptance criteria are the contract the adversarial reviewer will enforce.

3. **After implementation, run the adversarial reviewer.**  
   Invoke the `ui-adversarial-reviewer` skill (or ask for a full adversarial pass). Do not consider the work done until you have a PASS or an accepted PASS WITH NOTES.

4. **Do not skip the critic.**  
   Builder and reviewer must be separate roles. If you implemented the change, spin up a fresh review context or explicitly switch into critic mode.

5. **Update visual baselines only after intentional visual changes are approved.**

Refer to the shared `ui-standards` skill for the exact wireframe and definition-of-done requirements.
