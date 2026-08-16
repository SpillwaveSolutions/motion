---
name: ui-standards
description: Shared standards for wireframes, specifications, and adversarial UI reviews. Apply whenever creating or reviewing UI work in Spillwave apps.
---

# UI Standards (Spillwave)

## Purpose

This skill defines the non-negotiable standards that all other UI Guard skills enforce.

## Wireframe Requirements

Every meaningful UI surface must have a corresponding wireframe under `wireframes/`.

### Location & Naming

```
wireframes/
  <feature-or-screen>/
    overview.md          # high-level layout + goals
    <screen-name>.md     # one file per primary screen/state
    screenshots/         # optional reference images
```

### Minimum Content for a Wireframe

A wireframe file **must** contain:

1. **Screen / state name**
2. **Primary goal** of the screen (1–2 sentences)
3. **Layout regions** (header, sidebar, main, panels, etc.) described in plain text or simple ASCII
4. **Key interactive elements** (buttons, inputs, lists, toggles) with their labels and expected behavior
5. **Empty / loading / error states** if they are distinct
6. **Acceptance criteria** that the adversarial reviewer will check

Optional but recommended:

- Simple ASCII art or Markdown tables for layout
- Links to related specs or ADRs
- Notes about responsive breakpoints

### Example Skeleton

```markdown
# Screen: Workspace Sidebar

## Goal
Let the user navigate the open folder, see recent files, and trigger AI actions.

## Layout
- Top: workspace name + "Open Folder" button
- Middle: recursive file tree (expandable)
- Bottom: AI action bar (Refine, Diagram, Query)

## Key Elements
| Element            | Type     | Behavior                          |
|--------------------|----------|-----------------------------------|
| Open Folder        | button   | Opens native folder picker        |
| File tree item     | list     | Click opens file in editor        |
| Refine             | button   | Calls AI refine on current doc    |

## States
- Empty workspace → show onboarding prompt
- Loading tree → skeleton
- Error reading folder → red banner with retry

## Acceptance Criteria
- [ ] Workspace name is visible
- [ ] File tree renders without console errors
- [ ] Clicking a file opens it in the editor
- [ ] AI buttons are disabled when no file is open
```

## Specification Requirements

Specs live alongside or near the wireframes:

```
wireframes/<feature>/spec.md
# or
docs/specs/<feature>.md
```

A spec **must** include:

- User-facing goal
- Functional requirements (testable)
- Non-functional notes (performance, a11y, desktop vs browser)
- Explicit out-of-scope items

## Adversarial Review Contract

The adversarial reviewer must:

1. Read the relevant wireframe(s) and spec first.
2. Launch or connect to the running app (browser and/or Tauri).
3. Verify each acceptance criterion.
4. Capture screenshots of the key screens.
5. Report **PASS**, **PASS WITH NOTES**, or **FAIL** with concrete evidence.
6. Never approve its own implementation work (builder ≠ reviewer).

## Definition of Done for UI Changes

A UI change is done only when:

- [ ] Wireframe exists and is up to date
- [ ] Spec exists and is up to date
- [ ] Implementation matches wireframe + acceptance criteria
- [ ] Adversarial reviewer has issued a PASS (or PASS WITH NOTES that are accepted)
- [ ] Visual regression baselines updated if intentional
- [ ] No new console errors / uncaught exceptions in the reviewed flows
