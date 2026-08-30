import { TableKit } from "@tiptap/extension-table";

/** 3×3 with a header row — the only insert size this slice exposes. */
export const TABLE_INSERT = {
    rows: 3,
    cols: 3,
    withHeaderRow: true,
} as const;

/**
 * One kit so Table / TableRow / TableHeader / TableCell stay in lockstep.
 * Resize is off: colwidths cannot round-trip through GFM pipes.
 */
export const tableKit = TableKit.configure({
    table: {
        resizable: false,
        HTMLAttributes: { class: "motion-table" },
    },
});
