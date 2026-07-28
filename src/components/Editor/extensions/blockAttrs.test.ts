import { test, expect } from "bun:test";
import { parseBlockAttrs } from "./blockAttrs";

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
