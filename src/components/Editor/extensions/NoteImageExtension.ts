import { Node, mergeAttributes } from "@tiptap/core";

export interface NoteImageOptions {
    /**
     * Turn the `src` from the markdown into a URL the webview can show, or
     * null when the image cannot be read. Called once per node view.
     */
    loadImage: (src: string) => Promise<string | null>;
}

/**
 * Markdown `![alt](src)`. The document keeps `src` exactly as written, so save
 * writes the same link back. Only the node view shows the loaded URL.
 *
 * `renderHTML` writes the link to `data-src`, not `src`. TipTap renders with
 * `renderHTML` into the live page when the editor unmounts, and a live
 * `<img src="images/x.png">` makes the browser fetch that path from the app.
 * The turndown rule in markdown.ts reads `data-src` back.
 */
export const NoteImage = Node.create<NoteImageOptions>({
    name: "image",
    inline: true,
    group: "inline",
    atom: true,
    draggable: true,

    addOptions() {
        return { loadImage: async () => null };
    },

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: (el: HTMLElement) => el.getAttribute("src") ?? el.getAttribute("data-src"),
                renderHTML: (attrs: { src?: string | null }) => ({ "data-src": attrs.src }),
            },
            alt: { default: null },
            title: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: "img[src]" }, { tag: "img[data-src]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return ["img", mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        const { loadImage } = this.options;
        return ({ node }) => {
            const src = String(node.attrs.src ?? "");
            const img = document.createElement("img");
            img.className = "note-image";
            img.alt = String(node.attrs.alt ?? "");
            if (node.attrs.title) img.title = String(node.attrs.title);
            img.dataset.src = src;

            let shown: string | null = null;
            let live = true;
            const missing = () => {
                img.classList.add("note-image-missing");
                img.title = `Image not found: ${src}`;
            };
            img.addEventListener("error", missing);
            void loadImage(src).then((url) => {
                if (!live) {
                    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
                    return;
                }
                if (!url) return missing();
                shown = url;
                img.src = url;
            });

            return {
                dom: img,
                destroy() {
                    live = false;
                    if (shown?.startsWith("blob:")) URL.revokeObjectURL(shown);
                },
            };
        };
    },
});
