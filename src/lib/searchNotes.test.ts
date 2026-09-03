import { describe, expect, test } from "bun:test";
import { searchInNotes } from "./searchNotes";

describe("searchInNotes", () => {
    const files: Record<string, string> = {
        "/ws/a.md": "# Alpha\n\nHello world\n",
        "/ws/b.md": "# Beta\n\nhello again\nnope\n",
        "/ws/c.md": "nothing here\n",
    };
    const read = async (p: string) => {
        const c = files[p];
        if (c === undefined) throw new Error("missing");
        return c;
    };

    test("empty query returns no hits", async () => {
        expect(await searchInNotes(Object.keys(files), "  ", read)).toEqual([]);
    });

    test("finds case-insensitive matches with line numbers", async () => {
        const hits = await searchInNotes(Object.keys(files), "hello", read);
        expect(hits).toHaveLength(2);
        expect(hits[0]).toMatchObject({ path: "/ws/a.md", line: 3 });
        expect(hits[1]).toMatchObject({ path: "/ws/b.md", line: 3 });
    });

    test("respects maxHits", async () => {
        const hits = await searchInNotes(Object.keys(files), "e", read, { maxHits: 1 });
        expect(hits).toHaveLength(1);
    });
});
