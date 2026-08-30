# Screen: Share / Publish

## Goal
Publish the note currently being edited or viewed to a GitHub Gist or a Notion
page in one click, and store the API tokens needed to do that.

## Layout

Header gains a **Share** control. Clicking it opens a compact menu; choosing
Gist or Notion runs immediately if a token is saved, otherwise opens Settings
first. A result popover shows the URL or the error.

```
+------------------------------------------------------------------+
| [logo] Motion | Search | WYSIWYG Markdown Split | Share | Open… |
+------------------------------------------------------------------+

Share menu
+---------------------------+
| Publish to Gist           |
| Publish to Notion         |
| ----------------          |
| Settings…                 |
+---------------------------+

Settings dialog                         Result
+----------------------------------+    +----------------------------------+
| Publish settings                 |    | Published                        |
| GitHub token  [••••••••]         |    | https://gist.github.com/…        |
| Notion token  [••••••••]         |    | [Copy link]  [Open]              |
| Notion page   [page id or URL]   |    +----------------------------------+
| [Cancel]              [Save]     |
+----------------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Share | button | In the header. Disabled with no note selected. `aria-haspopup=menu`, `aria-expanded`. Accessible name **Share**. `data-testid=share`. |
| Publish to Gist | menuitem | Uses the live editor buffer ( unsaved edits included ). Filename is the note basename. Secret gist by default. |
| Publish to Notion | menuitem | Converts markdown to Notion blocks; parent is the saved page id. |
| Settings… | menuitem | Opens the settings dialog. |
| GitHub token | password | Fine-grained PAT with gist scope. Stored in localStorage key `motion.publish.githubToken`. Never logged. |
| Notion token | password | Internal integration token. `motion.publish.notionToken`. |
| Notion page | text | Page id or Notion URL; parsed to a UUID. `motion.publish.notionParentPageId`. |
| Result URL | link | `html_url` from Gist or the Notion page URL. |
| Copy link | button | Writes the URL to the clipboard; label becomes Copied. |
| Error | status | `role=status`. Readable API error, not a stack trace. Missing token: prompt to open Settings. |

## States
- **No note selected**: Share disabled, title "Select a note to share".
- **Menu open**: aria-expanded true; Escape / outside click closes.
- **Publishing**: Share label becomes Publishing…; menu items disabled.
- **Success**: result popover with URL, Copy, Open.
- **Missing token**: settings dialog opens instead of calling the API.
- **API error**: result popover with the error; settings stay as they were.
- **Settings**: Save writes tokens; Cancel discards edits. Empty fields are allowed (clears the token).

## Acceptance Criteria
- [x] Share is a real button in the header with accessible name Share.
- [x] Share is disabled until a note is selected.
- [x] The menu exposes Publish to Gist, Publish to Notion, and Settings.
- [x] Gist publish of the current buffer returns a URL the user can copy.
- [x] Notion publish creates a child page under the configured parent.
- [x] Missing tokens open Settings rather than firing a 401.
- [x] Tokens are not shown in the page source as plaintext placeholders after save (password inputs).
- [x] Browser E2E can mock `/api/publish/gist` and `/api/publish/notion` without hitting the real APIs.
- [x] Failure is a 200 `{ ok: false, error }` envelope so the E2E network gate does not treat a refused token as a suite failure.

## Notes
- Desktop transport is a Tauri command (webview cannot call Notion due to CORS, and CSP `connect-src` is `'self' ipc:`). Browser transport is `/api/publish/*`.
- Pure payload builders live in `src/lib/publish/` and are unit-tested.
- This is non-trivial UI: adversarial review required after implementation.
