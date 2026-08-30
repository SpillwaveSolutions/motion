---
date: 2026-08-30
slug: native-mac-app
title: Behave like a native Mac app
epic: 01M18MN19CSQ7PS762F7TWEXJC
items: [01M18MN19CA20B51FR0ND643M4, 01M18MN19C8FQKQ9NVNT4162CX, 01M18MN19C0WR6KZ3X63M1CX2R, 01M18MN19CBF3A5JXZHVANGT5Y, 01M18MN19C0DPY7PXRGDRX6Y6G, 01M18MN19CBNRDAYCJ0RTMWJV4]
---

# Behave like a native Mac app

## Context

Motion can already produce a real `.app` (`scripts/build.ts` emits `dist/index.html`),
but it does not behave like an installed Mac editor. Finder cannot Open With it,
the bundle metadata is Tauri template filler, every launch starts with an empty
workspace, there is no Share path to Gist or Notion, and the chrome is a web app
in a rectangle.

This plan makes Motion a daily driver: right-click a `.md` in Finder, edit it,
publish it.

## Design decisions

- Opening a file from Finder sets the workspace to that file's **parent
  directory** (VS Code / Obsidian style) so the jail and sidebar stay intact.
- Publish follows the `llmClient.ts` pattern: a pure core plus two transports
  (Tauri command vs `/api/publish/*`). Tokens never live in the repo.
- Gist ships first (one POST). Notion is a separate task with a markdown→blocks
  converter.
- Overlay title bar + native File/Edit menus + remembered last workspace are
  the look-and-feel bar. Light theme follows `prefers-color-scheme`.

## Tasks

- [ ] (P1) Finder Open With: associations, RunEvent::Opened, pending-open, parent-dir workspace
  Declare markdown file associations so macOS lists Motion in Open With. Catch
  RunEvent::Opened (and argv on other platforms), buffer the path until React
  mounts, and expose take_pending_open. Opening ~/notes/plan.md sets the
  workspace to ~/notes then selects the file. Frontend also honours ?open= so
  Playwright can cover launch-straight-into-a-file. Unit-test the URL→workspace
  mapping next to the jail tests.

- [ ] (P1) Packaging polish: product name, identifier, metadata, window, last workspace
  productName Motion, identifier com.spillwave.motion, real Cargo.toml
  description/authors, default window 1200×760 with a 720×480 floor, macOS
  category and copyright. Persist the last workspace (and last file) and reopen
  it on launch. Document the local unsigned build recipe.

- [ ] (P1) Native chrome: overlay title bar, menus, system appearance
  Overlay title bar with traffic lights over the header (drag region + left
  padding). Native File menu (New Note, Open Folder, Save) wired to the same
  handlers; keep the system Edit menu for copy/paste. Dark remains the default;
  add a light token set behind prefers-color-scheme.

- [ ] (P1) Publish the current note to a GitHub Gist
  Share → Gist. Pure payload/parse in src/lib/publish, desktop via a scoped
  Tauri HTTP command, browser via POST /api/publish/gist. Settings UI for a
  gist-scoped PAT. Success copies html_url. E2E mocks the API. Wireframe first.

- [ ] (P2) Publish the current note to a Notion page
  Share → Notion. Markdown→blocks converter (headings, paragraphs, lists, code,
  quotes; tables and Mermaid degrade to code). Chunked appends. Settings for an
  integration token and parent page. Same two-transport pattern as Gist.

- [ ] (P2) Fix stale README, changelog, and user-guide product claims
  README and the user guide still say the sidebar is flat and there is no
  content search; both shipped. CHANGELOG still lists the fake-FS and missing
  index.html bugs as open. Align docs with the product, including Finder Open
  With, last-workspace, and Share.
