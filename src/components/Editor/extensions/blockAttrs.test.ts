import { test, expect } from "bun:test";
import { parseBlockAttrs, serializeBlockAttrs } from "./blockAttrs";

test("parses key: value lines", () => {
    expect(parseBlockAttrs("source: data.csv\nname: team\nlimit: 5")).toEqual({
        source: "data.csv",
        name: "team",
        limit: "5",
    });
});

test("keeps colons inside the value", () => {
    expect(parseBlockAttrs("sql: SELECT a FROM t WHERE b = 'x:y'")).toEqual({
        sql: "SELECT a FROM t WHERE b = 'x:y'",
    });
});

// The regression this helper exists for: the welcome document serializes an
// unset diagram as `content: null`, which used to parse to the truthy string
// "null" and be handed to mermaid.render() on every cold load.
test("treats serialized null/undefined as unset", () => {
    const attrs = parseBlockAttrs("prompt: a login flow\ncontent: null");
    expect(attrs["content"]).toBe("");
    expect(attrs["prompt"]).toBe("a login flow");
    expect(parseBlockAttrs("src: undefined")["src"]).toBe("");
});

test("ignores lines without a colon and empty keys", () => {
    expect(parseBlockAttrs("just prose\n: orphan\nkey: v")).toEqual({ key: "v" });
});

// --- B7: multi-line values must survive a serialize/parse round trip ---

test("round-trips a multi-line value as a block scalar", () => {
    const diagram = "sequenceDiagram\n  A->>B: hello\n  B-->>A: hi";
    const text = serializeBlockAttrs({ prompt: "a login flow", content: diagram });

    expect(text).toContain("content: |");
    expect(parseBlockAttrs(text)).toEqual({
        prompt: "a login flow",
        content: diagram,
    });
});

test("round-trips multi-line SQL", () => {
    const sql = "SELECT name, score\nFROM sales\nORDER BY score DESC";
    expect(parseBlockAttrs(serializeBlockAttrs({ sql }))["sql"]).toBe(sql);
});

test("keeps single-line values in plain form so old documents still parse", () => {
    const text = serializeBlockAttrs({ source: "data.csv", name: "team", limit: 5 });
    expect(text).toBe("source: data.csv\nname: team\nlimit: 5");
    expect(parseBlockAttrs(text)).toEqual({ source: "data.csv", name: "team", limit: "5" });
});

test("omits unset fields instead of writing the null sentinel", () => {
    // Writing `content: null` is what sent the string "null" to mermaid.render().
    const text = serializeBlockAttrs({ prompt: "x", content: "", src: null });
    expect(text).toBe("prompt: x");
    expect(parseBlockAttrs(text)["content"]).toBeUndefined();
});

test("a key following a block scalar is still parsed", () => {
    const text = "content: |\n  line one\n  line two\nname: after";
    expect(parseBlockAttrs(text)).toEqual({
        content: "line one\nline two",
        name: "after",
    });
});
