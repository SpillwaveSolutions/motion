/**
 * The security boundaries that shipped with zero tests.
 *
 * The original audit found that the three places where a bug is actually
 * dangerous -- SVG sanitization, the dev server's public-dir jail, and the
 * provider allowlist -- had no coverage between them, while string helpers did.
 * sanitizeSvg had already shipped one defect (its svg-only profile stripped
 * `foreignObject`, which is exactly how Mermaid renders node labels) that no
 * test would have caught or now prevents from returning.
 *
 * DOMPurify is deliberately NOT tested here. It needs a real DOM, and under
 * happy-dom it reports `isSupported: true` while producing wrong output in both
 * directions -- it strips <h1> and keeps <script>. A test written against that
 * would codify nonsense as the security contract, which is worse than no test.
 * sanitizeHtml and sanitizeSvg are covered in e2e/sanitize.spec.ts, in a real
 * browser running the real DOMPurify.
 */
import { test, expect, describe } from "bun:test";
import { escapeHtmlText } from "./sanitize";
import { isInsideWorkspace } from "./fsCore";
import { resolve } from "path";

describe("escapeHtmlText", () => {
    test("neutralises markup in error messages", () => {
        const out = escapeHtmlText('<img src=x onerror="alert(1)">');
        expect(out).not.toContain("<img");
        expect(out).toContain("&lt;");
    });
});

describe("workspace containment", () => {
    const root = resolve("/tmp/ws");

    test("admits a file inside", () => {
        expect(isInsideWorkspace(root, resolve("/tmp/ws/note.md"))).toBe(true);
    });

    test("admits the root itself", () => {
        // write_workspace_file checks a file's parent, which for a top-level
        // note is the root.
        expect(isInsideWorkspace(root, root)).toBe(true);
    });

    test("refuses a parent-traversal path", () => {
        expect(isInsideWorkspace(root, resolve("/tmp/other/secret.md"))).toBe(false);
    });

    /** The escape a naive `candidate.startsWith(root)` would allow. */
    test("refuses a sibling sharing the workspace name prefix", () => {
        expect(isInsideWorkspace(root, resolve("/tmp/ws-evil/planted.md"))).toBe(false);
        // ...which the naive check would have admitted:
        expect(resolve("/tmp/ws-evil/planted.md").startsWith(root)).toBe(true);
    });
});
