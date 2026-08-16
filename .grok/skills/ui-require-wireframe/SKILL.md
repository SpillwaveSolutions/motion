---
name: ui-require-wireframe
description: Forces wireframe and specification to exist and be current before any UI implementation work begins. Use this skill at the start of every UI-related task.
---

# Require Wireframe First

## When to Activate

Activate this skill whenever the user asks to:

- Build, redesign, or significantly change a UI screen or component
- Add a new panel, dialog, sidebar, or interactive surface
- Change layout, navigation, or primary user flows

Do **not** require a full wireframe for trivial one-line style tweaks or pure copy changes, but still prefer a short note in an existing wireframe.

## Required Behavior

Before writing any implementation code for a UI change:

1. **Locate existing wireframes**
   - Look under `wireframes/`
   - Also check `docs/wireframes/`, `docs/specs/`, and any `*.wire.md` files

2. **If no suitable wireframe exists**
   - Create one using the skeleton from the `ui-standards` skill
   - Place it under `wireframes/<feature-or-screen>/`
   - Tell the user you created it and ask them to review the acceptance criteria

3. **If a wireframe exists but is outdated**
   - Update the wireframe and acceptance criteria to match the new intent
   - Call out the changes you made

4. **Only after the wireframe + acceptance criteria are current**
   - Proceed to implementation
   - Reference the wireframe file(s) in your plan and in commit messages

## Enforcement Phrases (use these)

When the user tries to skip ahead:

> I need to update (or create) the wireframe and acceptance criteria first.  
> Once those are solid, I'll implement and then run the adversarial review.

When starting work:

> Starting with the wireframe for [screen].  
> After that I'll implement, then hand off to the adversarial reviewer.

## Output Checklist

Before you consider the "wireframe step" complete, confirm:

- [ ] Wireframe file exists at a clear path
- [ ] Goal, layout regions, key elements, and acceptance criteria are present
- [ ] Spec notes (or a short `spec.md`) exist if the change is non-trivial
- [ ] User has had a chance to adjust the acceptance criteria

Only then move to implementation and adversarial review.
