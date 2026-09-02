/**
 * Dual-format copy of a note: markdown for text destinations, rendered HTML
 * for rich-text destinations. The OS paste target picks the MIME type it wants.
 *
 * Browser-safe: no Bun, no I/O.
 */
import { markdownToHtml } from "../components/Editor/markdown";
import { sanitizeHtml } from "./sanitize";

export type CopyPayload = {
    text: string;
    html: string;
};

/** Wrap a sanitized fragment so Word / Mail / Docs treat it as a document. */
export function wrapHtmlFragment(fragment: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${fragment}</body></html>`;
}

export async function buildCopyPayload(
    markdown: string,
    sanitize: (html: string) => string = sanitizeHtml
): Promise<CopyPayload> {
    const fragment = sanitize(await markdownToHtml(markdown));
    return {
        text: markdown,
        html: wrapHtmlFragment(fragment),
    };
}

type ClipboardLike = {
    write?(items: ClipboardItem[]): Promise<void>;
    writeText(data: string): Promise<void>;
};

/**
 * Write markdown as text/plain and rendered HTML as text/html.
 * Falls back to plaintext if ClipboardItem / write is missing or refuses.
 */
export async function writeCopyPayload(
    payload: CopyPayload,
    clipboard: ClipboardLike = navigator.clipboard
): Promise<void> {
    if (typeof ClipboardItem !== "undefined" && clipboard.write) {
        try {
            await clipboard.write([
                new ClipboardItem({
                    "text/plain": Promise.resolve(
                        new Blob([payload.text], { type: "text/plain" })
                    ),
                    "text/html": Promise.resolve(
                        new Blob([payload.html], { type: "text/html" })
                    ),
                }),
            ]);
            return;
        } catch {
            // Some webviews implement write() but reject mixed MIME; plaintext still ships.
        }
    }
    await clipboard.writeText(payload.text);
}
