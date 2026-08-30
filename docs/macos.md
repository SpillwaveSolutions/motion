# Motion on macOS

Motion is a Tauri 2 app. After a local or CI build you get a real `.app` you
can put in `/Applications` and use from Finder.

## Open With

The bundle declares markdown file associations (`.md`, `.markdown`, `.mdown`,
`.mkd`, `.mdx`). Once Motion.app is on the machine:

1. Right-click a markdown file in Finder → **Open With → Motion**.
2. Double-click a `.md` after setting Motion as the default editor.

The workspace is the **parent directory** of the file you opened, so the
sidebar still lists siblings and the filesystem jail stays intact. Opening a
folder (File → Open Folder) is unchanged.

If the app is already running, the existing window loads the file. Cold start
buffers the path until the UI mounts.

## Last workspace

On desktop, Motion remembers the last folder (and last file) and reopens it
the next time you launch with no file argument. A Finder-opened file wins over
the remembered workspace. Browser mode does **not** auto-restore — tests click
Open Folder themselves.

## Native chrome

The window uses an overlay title bar (traffic lights over the header). Drag the
header to move the window; buttons and the search field stay clickable.

The **File** menu mirrors the header: New Note, Open Folder, Save, Publish to
Gist / Notion, Settings. The **Edit** menu is the system one (undo / cut /
copy / paste).

Appearance follows the OS: dark tokens by default, light tokens when
`prefers-color-scheme: light`.

## Unsigned local builds

A debug or unsigned `.app` is blocked by Gatekeeper the first time:

1. Right-click Motion.app → **Open**.
2. Confirm the dialog. After that, double-click works.

This is expected for a local `bun tauri build` without Developer ID
notarization. Do not `xattr -cr` the app as a first resort — Open once is the
supported path.

## Build recipe

```bash
bun install
bun run build          # frontend → dist/index.html + bundle
bun tauri build        # .app / .dmg under src-tauri/target/release/bundle
```

The bundle identifier is `com.spillwave.motion`. Minimum macOS is 12.0.

Share (Gist / Notion) talks to those APIs from the Rust side, not the
webview — CSP `connect-src` is `'self' ipc:` and Notion does not allow
browser CORS. Tokens live in localStorage on this machine only.
