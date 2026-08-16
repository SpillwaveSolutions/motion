import type { RefObject } from "react";
import type { Node as PmNode } from "@tiptap/pm/model";

export type TextRange = { from: number; to: number };

export function findInString(text: string, query: string): TextRange[] {
  const q = query.toLowerCase();
  if (!q) return [];
  const out: TextRange[] = [];
  const hay = text.toLowerCase();
  let i = 0;
  while ((i = hay.indexOf(q, i)) !== -1) {
    out.push({ from: i, to: i + q.length });
    i += q.length;
  }
  return out;
}

export function findInPmDoc(doc: PmNode, query: string): TextRange[] {
  const q = query.toLowerCase();
  if (!q) return [];
  const out: TextRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = node.text.toLowerCase();
    let i = 0;
    while ((i = hay.indexOf(q, i)) !== -1) {
      out.push({ from: pos + i, to: pos + i + q.length });
      i += q.length;
    }
  });
  return out;
}

export function FindBar({
  query,
  current,
  total,
  onQuery,
  onNext,
  onPrev,
  onClose,
  inputRef,
}: {
  query: string;
  current: number;
  total: number;
  onQuery: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="find-bar" role="search" aria-label="Find in note">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        aria-label="Find in note"
        placeholder="Find in note…"
      />
      <span className="find-bar-count" aria-live="polite">
        {query ? (total ? `${current + 1} of ${total}` : "No matches") : ""}
      </span>
      <button type="button" onClick={onPrev} disabled={!total} aria-label="Previous match">
        Prev
      </button>
      <button type="button" onClick={onNext} disabled={!total} aria-label="Next match">
        Next
      </button>
      <button type="button" onClick={onClose} aria-label="Close find">
        ×
      </button>
    </div>
  );
}
