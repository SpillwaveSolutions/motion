import { useRef, type RefObject } from "react";
import { renderMarkdownHighlight } from "./markdownHighlight";

/**
 * Editable markdown source with a highlight layer behind a real textarea.
 *
 * The textarea stays the accessible control (aria-label Markdown source) so
 * Find, Playwright fill, and screen readers keep working. The <pre> is
 * aria-hidden and pointer-events: none; it only paints color.
 */
export function MarkdownSource({
    value,
    onChange,
    textareaRef,
    placeholder = "Write your markdown here...",
}: {
    value: string;
    onChange: (value: string) => void;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    placeholder?: string;
}) {
    const highlightRef = useRef<HTMLPreElement>(null);

    const syncScroll = () => {
        const ta = textareaRef.current;
        const hi = highlightRef.current;
        if (!ta || !hi) return;
        hi.scrollTop = ta.scrollTop;
        hi.scrollLeft = ta.scrollLeft;
    };

    return (
        <div className="markdown-source">
            <pre
                ref={highlightRef}
                className="markdown-source-highlight"
                aria-hidden="true"
            >
                {renderMarkdownHighlight(value)}
                {/* Trailing newline so the last line's height matches the textarea. */}
                {"\n"}
            </pre>
            <textarea
                ref={textareaRef}
                className="markdown-source-input"
                aria-label="Markdown source"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onScroll={syncScroll}
            />
        </div>
    );
}

/** Read-only highlighted source, used by Split's right pane. */
export function MarkdownPreview({ value }: { value: string }) {
    return (
        <pre className="markdown-source-preview" aria-label="Markdown preview">
            {renderMarkdownHighlight(value)}
            {"\n"}
        </pre>
    );
}
