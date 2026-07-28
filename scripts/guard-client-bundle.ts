/**
 * Static guard: no module reachable from the browser entrypoint may touch `Bun`.
 *
 * This exists because one root cause has been re-fixed four times in this repo
 * (3ff4285, 21a28f9, 5e995d8, 261c89f) and is open a fifth time as 01KYJW5X:
 * code that assumes a Bun process while actually executing in a browser or a
 * Tauri webview, where `Bun` is undefined.
 *
 * A runtime gate cannot catch this. The console/network fixture only sees code
 * that a test actually executes, and the four enrichment modules
 * (TopicRefiner, ContentInjector, TOCGenerator, SkillGenerator) are dead code --
 * no E2E spec would ever run them, so they would stay green right up until the
 * day someone wires them to a button. Their unit tests pass for the same
 * reason: they mock the boundary and run inside Bun.
 *
 * So: walk the real import graph from src/main.tsx and fail on any `Bun.` use.
 * Server-only modules (src/server.ts, cliWrappers.ts, imageGen.ts) legitimately
 * use Bun -- they are simply not allowed to be reachable from the client.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, resolve, relative } from "path";

const PROJECT_ROOT = resolve(import.meta.dir, "..");
const ENTRY = resolve(PROJECT_ROOT, "src/main.tsx");

/** `Bun.foo`, or a bare `Bun` reference, not preceded by an identifier char. */
const BUN_USE = /(?<![A-Za-z0-9_$."'`])Bun\s*[.[]/;

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

function resolveImport(spec: string, fromFile: string): string | null {
    if (!spec.startsWith(".")) return null; // bare specifier -> node_modules
    const base = resolve(dirname(fromFile), spec);
    for (const ext of EXTENSIONS) {
        const candidate = base + ext;
        if (existsSync(candidate) && !candidate.endsWith("/")) {
            try {
                readFileSync(candidate);
                return candidate;
            } catch {
                /* a directory -- keep trying */
            }
        }
    }
    return null;
}

const IMPORT_RE =
    /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;

/**
 * `import type {...} from "x"` is erased entirely, so it puts nothing in the
 * bundle and must not count as reachability. This is not a technicality: it is
 * exactly how llmClient.ts borrows types from the Bun-only cliWrappers.ts
 * without dragging its `Bun.spawn` into the browser.
 */
const TYPE_ONLY_RE = /(?:^|\n)[ \t]*(?:import|export)[ \t]+type[ \t][\s\S]*?from[ \t]*["'][^"']+["']/g;

function importsOf(source: string): string[] {
    const out: string[] = [];
    for (const m of source.replace(TYPE_ONLY_RE, "").matchAll(IMPORT_RE)) {
        const spec = m[1] ?? m[2] ?? m[3];
        if (spec) out.push(spec);
    }
    return out;
}

const visited = new Set<string>();
const offenders: { file: string; line: number; text: string }[] = [];
const queue: string[] = [ENTRY];

while (queue.length > 0) {
    const file = queue.pop() as string;
    if (visited.has(file)) continue;
    visited.add(file);

    const source = readFileSync(file, "utf8");

    source.split("\n").forEach((line, i) => {
        // Skip comment-only lines so prose about Bun doesn't trip the guard.
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (BUN_USE.test(line)) {
            offenders.push({ file, line: i + 1, text: trimmed });
        }
    });

    for (const spec of importsOf(source)) {
        const target = resolveImport(spec, file);
        if (target) queue.push(target);
    }
}

const rel = (p: string) => relative(PROJECT_ROOT, p);

if (offenders.length > 0) {
    console.error(
        `\n✗ Bun API used in ${offenders.length} place(s) reachable from src/main.tsx.\n` +
            `  This code runs in a browser and a Tauri webview, where \`Bun\` is undefined.\n` +
            `  Route it through src/lib/llmClient.ts or src/lib/imageClient.ts instead.\n`
    );
    for (const o of offenders) {
        console.error(`  ${rel(o.file)}:${o.line}  ${o.text}`);
    }
    console.error("");
    process.exit(1);
}

console.log(`✓ client bundle is Bun-free (${visited.size} modules checked from src/main.tsx)`);
