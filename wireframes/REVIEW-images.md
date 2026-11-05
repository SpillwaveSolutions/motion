# Adversarial review: note images

**Wireframe:** `wireframes/editor.md` (the Note image row and three image lines)
**Verdict:** PASS WITH NOTES

## Criteria results

- [x] A relative `![alt](images/x.png)` shows the image from the note's folder. PASS (`e2e/images.spec.ts`: the image has a `blob:` source and decodes to its real width).
- [x] An edit saves every image link unchanged. PASS (`e2e/images.spec.ts` reads the file back after the autosave). Before the fix, the editor dropped each image, and the first save deleted every link.
- [x] A missing image shows as missing, and its link stays in the file. PASS (`e2e/images.spec.ts`: the dashed box has the title Image not found: path, and the Markdown view keeps the link).

## Attacks tried

- Read a file that is not an image through the image read. Denied (`tests/contract/storage-cases.json`, run by Bun and by Cargo).
- Read an image outside the open folder with `../`. Denied (same contract).
- Switch to the Markdown view. Before the `data-src` change, TipTap rendered a live `<img src="images/x.png">`, and the browser fetched that path from the app. The spec now checks that no such request happens.
- `javascript:` as an image source loads nothing (`src/lib/noteLink.test.ts`).

## Not tested

- The desktop app's `read_image` command on a real webview. The Rust core and the contract are tested. The release install is the manual check.

## Notes

- The Tauri CSP allows `img-src 'self' data: blob:` only, so a web image does not load in the desktop app. The link stays in the file.
- PDF and Word export show the alt text, not the image.
- An absolute image path outside the open folder is denied by the jail and shows as missing.
