---
name: ui-visual-regression
description: Capture and compare Playwright screenshots against baseline images for key UI screens. Use after adversarial review or as part of CI.
---

# Visual Regression

## Purpose

Detect unintended visual changes by comparing current screenshots of key screens against approved baselines.

## Convention

```
wireframes/<feature>/
  screenshots/
    baseline/
      <screen>-desktop.png
      <screen>-mobile.png   # optional
    current/                # generated during review
```

## How to Use

1. Ensure the app is running (dev server or Tauri).
2. Use Playwright (or the project's existing e2e suite) to navigate to the screens listed in the wireframe.
3. Capture full-page or key-region screenshots into `screenshots/current/`.
4. Diff against `screenshots/baseline/`.
5. Report:
   - No meaningful differences → visual regression PASS
   - Intentional differences → update baselines after human confirmation
   - Unintentional differences → FAIL and attach the diff images

## Integration with Adversarial Reviewer

The adversarial reviewer should call this skill (or perform equivalent steps) when visual fidelity matters.

## Notes for Tauri + React Apps

- Prefer testing the web view via Playwright against the Vite dev server when possible.
- For desktop-only behaviors (native dialogs, filesystem), document them in the wireframe and verify manually or via Tauri-specific test helpers.
