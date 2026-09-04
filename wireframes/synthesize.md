# Screen: Workspace synthesize

## Goal
Summarize every note in the open folder, cluster by topic, and write TOC.md
plus a short generated README back into that folder. The user can see
progress, the outcome, and dismiss so they can run it again.

## Layout

Header control lives in the shell. Status is a full-width banner under the header.

```
+-----------------------------------------------------------------+
| ... header ...                           [Synthesize]           |
+-----------------------------------------------------------------+
| Synthesizing...  /  Synthesized N notes into TOC.md and README.md |
|                  -- topics: a, b                  [x dismiss]    |
+-----------------------------------------------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Synthesize | header button | Disabled with no folder, or while any status string is set. Title explains the action. Icon-only in the header; accessible name stays **Synthesize**. |
| Progress | banner text | onProgress updates the same banner while the run is live |
| Success | banner text | Synthesized {n} notes into TOC.md and README.md -- topics: ... |
| Collision | banner text | If README.md already exists and is not generated, write `README.motion.md` instead and say so in the status. Never silently overwrite a hand-written README. |
| Generated marker | comment | `<!-- generated-by: motion-synthesize -->` at the top of a README we wrote. Only a README that carries this marker is overwritten on a later run. |
| Failure | banner text | Synthesis failed: {message} |
| Dismiss | button | aria-label Dismiss synthesis status. Clears status so Synthesize enables again |

## States
- **Unavailable**: No workspace.
- **Ready**: Folder open, no banner.
- **Running**: Button disabled; banner shows progress.
- **Done / failed**: Banner stays until dismiss (button stays disabled until then).
- **Hand-written README present**: TOC.md + README.motion.md written; original README.md unchanged.

## Acceptance Criteria
- [ ] Synthesize is disabled until a folder is open.
- [ ] A run writes TOC.md and a generated README (README.md, or README.motion.md on collision) into the workspace and refreshes the file list.
- [ ] TOC.md, README.md, and README.motion.md are excluded from the input of a later run.
- [ ] A README.md that does **not** carry the generated marker is left intact; the run writes README.motion.md and the status says so.
- [ ] A README.md that **does** carry the marker is overwritten.
- [ ] Run is capped at 40 notes and reports skips (in the synthesis result / message).
- [ ] Banner is role=status aria-live=polite and dismissible.
- [ ] After dismiss, Synthesize can be clicked again.
- [ ] Needs claude on PATH; failure is shown in the banner, not a silent no-op.

## Notes
- Source: src/App.tsx handleSynthesize, src/lib/workspaceSynthesis.ts, src/lib/ReadmeGenerator.ts.
- SKILL.md is no longer generated. An old SKILL.md is still excluded from input so a second run does not summarize the artifact.
