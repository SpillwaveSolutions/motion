# Screen: Workspace synthesize

## Goal
Summarize every note in the open folder, cluster by topic, and write TOC.md plus SKILL.md back into that folder. The user can see progress, the outcome, and dismiss so they can run it again.

## Layout

Header control lives in the shell. Status is a full-width banner under the header.

```
+-----------------------------------------------------------------+
| ... header ...                           [Synthesize]           |
+-----------------------------------------------------------------+
| Synthesizing...  /  Synthesized N notes into TOC.md and SKILL.md |
|                  -- topics: a, b                  [x dismiss]    |
+-----------------------------------------------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Synthesize | header button | Disabled with no folder, or while any status string is set. Title explains the action. |
| Progress | banner text | onProgress updates the same banner while the run is live |
| Success | banner text | Synthesized {n} notes into TOC.md and SKILL.md -- topics: ... |
| Failure | banner text | Synthesis failed: {message} |
| Dismiss | button | aria-label Dismiss synthesis status. Clears status so Synthesize enables again |

## States
- **Unavailable**: No workspace.
- **Ready**: Folder open, no banner.
- **Running**: Button disabled; banner shows progress.
- **Done / failed**: Banner stays until dismiss (button stays disabled until then).

## Acceptance Criteria
- [ ] Synthesize is disabled until a folder is open.
- [ ] A run writes TOC.md and SKILL.md into the workspace and refreshes the file list.
- [ ] TOC.md and SKILL.md are excluded from the input of a later run.
- [ ] Run is capped at 40 notes and reports skips (in the synthesis result / message).
- [ ] Banner is role=status aria-live=polite and dismissible.
- [ ] After dismiss, Synthesize can be clicked again.
- [ ] Needs claude on PATH; failure is shown in the banner, not a silent no-op.

## Notes
- Source: src/App.tsx handleSynthesize, src/lib/workspaceSynthesis.ts.
