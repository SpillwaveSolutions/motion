/**
 * Bun Development Server for Motion
 *
 * Serves the app with CSS inlined and JS as external file.
 */

import { watch, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve, relative, isAbsolute } from "path";
import { callLLM, type ModelProvider } from "./lib/cliWrappers";
import { generateImage } from "./lib/imageGen";
import { renderShell } from "./shell";
import {
    collectFiles,
    readWorkspaceFile,
    writeWorkspaceFile,
    renameWorkspaceFile,
    FsError,
    MARKDOWN_EXTENSIONS,
    DATA_EXTENSIONS,
} from "./lib/fsCore";
import { loadSettings, saveSettings, defaultSettingsPath } from "./lib/settingsIo";
import { publishGist } from "./lib/publish/gist";
import { publishNotion } from "./lib/publish/notion";
import { streamAiToSseResponse } from "./lib/ai/service";
import { encodeSse } from "./lib/ai/protocol";

const ALLOWED_LLM_PROVIDERS: ModelProvider[] = ["opencode", "claude", "qwen"];

// Get project root (parent of src/)
const PROJECT_ROOT = dirname(dirname(import.meta.path));
const PUBLIC_DIR = resolve(PROJECT_ROOT, "public");
const PORT = Number(process.env["PORT"] ?? 3000);

/**
 * The workspace browser mode reads and writes.
 *
 * Env-only by design (see the /api/fs/ handler). Defaults to public/demo so a
 * fresh clone still opens with something to look at; E2E runs point it at a
 * seeded temp directory so specs never mutate tracked fixtures.
 */
const WORKSPACE_ROOT = resolve(
    PROJECT_ROOT,
    process.env["MOTION_WORKSPACE"] ?? join("public", "demo")
);
if (!existsSync(WORKSPACE_ROOT)) {
    mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

// Store the latest JS bundle in memory
let jsBundle = "";

// Build the application bundle
async function buildApp() {
    console.log("📦 Building app...");

    const result = await Bun.build({
        entrypoints: [join(PROJECT_ROOT, "src/main.tsx")],
        outdir: join(PROJECT_ROOT, "dist"),
        target: "browser",
        format: "esm",
        minify: false,
        splitting: false,
        define: {
            "process.env.NODE_ENV": '"development"',
        },
    });

    if (!result.success) {
        console.error("❌ Build failed:");
        for (const log of result.logs) {
            console.error(log);
        }
        return false;
    }

    // Read the built JS file into memory
    const jsFile = Bun.file(join(PROJECT_ROOT, "dist/main.js"));
    if (await jsFile.exists()) {
        jsBundle = await jsFile.text();
    }

    console.log("✅ Build complete!");
    return true;
}

// Read CSS file
async function getCSS(): Promise<string> {
    const cssFile = Bun.file(join(PROJECT_ROOT, "src/index.css"));
    if (await cssFile.exists()) {
        return await cssFile.text();
    }
    return "";
}

// Generate the HTML from the shared shell template (see src/shell.ts).
async function generateHTML(): Promise<string> {
    return renderShell({ inlineCss: await getCSS(), scriptSrc: "/bundle.js" });
}

/** Ensure a resolved path stays inside the public/ directory (no path traversal). */
function isInsidePublicDir(candidate: string): boolean {
    const rel = relative(PUBLIC_DIR, candidate);
    // empty rel would mean candidate === PUBLIC_DIR (directory itself — not a file we serve)
    return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

// Initial build
await buildApp();

// Debounced rebuild to avoid concurrent races on rapid file changes
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let rebuildInFlight: Promise<boolean> | null = null;

function scheduleRebuild(filename: string) {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
        rebuildTimer = null;
        // Wait for any in-flight rebuild before starting another
        if (rebuildInFlight) {
            await rebuildInFlight;
        }
        console.log(`\n🔄 File changed: ${filename}`);
        rebuildInFlight = buildApp().finally(() => {
            rebuildInFlight = null;
        });
        await rebuildInFlight;
    }, 150);
}

// Watch for file changes
const watcher = watch(join(PROJECT_ROOT, "src"), { recursive: true }, (_event, filename) => {
    if (filename && (filename.endsWith(".ts") || filename.endsWith(".tsx") || filename.endsWith(".css"))) {
        scheduleRebuild(filename);
    }
});

// Serve the app
const server = Bun.serve({
    port: PORT,
    // Loopback only. Bun.serve defaults to 0.0.0.0, which would put this
    // server's filesystem write endpoint and its subprocess-spawning /api/llm
    // and /api/image endpoints on every interface -- reachable by anything on
    // the same network, with no authentication. The workspace jail constrains
    // WHERE a write can land; it says nothing about who may ask for one.
    // Override only if you know why you need to.
    hostname: process.env["MOTION_HOST"] ?? "127.0.0.1",
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Serve the main HTML page
        if (pathname === "/" || pathname === "/index.html") {
            const html = await generateHTML();
            return new Response(html, {
                headers: {
                    "Content-Type": "text/html",
                    "Cache-Control": "no-cache",
                },
            });
        }

        // Browsers request this unprompted and the app ships no icon. Answer
        // 204 rather than 404: a real 404 here is pure noise that would fail
        // every E2E run through the network gate.
        if (pathname === "/favicon.ico") {
            return new Response(null, { status: 204 });
        }

        // Serve the JS bundle
        if (pathname === "/bundle.js") {
            return new Response(jsBundle, {
                headers: {
                    "Content-Type": "application/javascript",
                    "Cache-Control": "no-cache",
                },
            });
        }

        // Proxy for LLM CLI calls: cliWrappers.callLLM's Bun.spawn only works
        // in a real Bun process, never in browser-executed React code -- this
        // is that Bun process. Mirrors run_llm_cli on the Tauri side.
        if (pathname === "/api/llm" && req.method === "POST") {
            try {
                const body = await req.json();
                const provider = body?.provider;
                if (!ALLOWED_LLM_PROVIDERS.includes(provider)) {
                    return Response.json(
                        { error: `Unsupported provider: ${provider}` },
                        { status: 400 }
                    );
                }
                if (typeof body?.prompt !== "string" || !body.prompt) {
                    return Response.json({ error: "Missing prompt" }, { status: 400 });
                }
                const result = await callLLM(provider, {
                    prompt: body.prompt,
                    systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
                    model: typeof body.model === "string" ? body.model : undefined,
                });
                return Response.json(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return Response.json({ error: message }, { status: 500 });
            }
        }

        // Ask AI / Refine stream. Always HTTP 200 SSE so a missing CLI or
        // Anthropic key is not an E2E >=400 failure. Shared TS service:
        // Anthropic SDK when ANTHROPIC_API_KEY is set, else claude CLI.
        if (pathname === "/api/ai/stream" && req.method === "POST") {
            const sseError = (error: string) =>
                new Response(encodeSse({ type: "error", error }), {
                    status: 200,
                    headers: {
                        "Content-Type": "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache",
                    },
                });
            try {
                const body = await req.json();
                if (typeof body?.instruction !== "string" || !body.instruction.trim()) {
                    return sseError("Ask AI needs an instruction.");
                }
                if (typeof body?.context !== "string" || typeof body?.systemPrompt !== "string") {
                    return sseError("Missing packed context.");
                }
                return streamAiToSseResponse(
                    {
                        systemPrompt: body.systemPrompt,
                        context: body.context,
                        instruction: body.instruction,
                        model: typeof body.model === "string" ? body.model : undefined,
                    },
                    {
                        apiKey: process.env["ANTHROPIC_API_KEY"],
                        model: process.env["MOTION_AI_MODEL"],
                    },
                    req.signal
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return sseError(message);
            }
        }

        // Proxy for image generation: imageGen.ts's Bun.spawn only works in a
        // real Bun process, never in browser-executed React code. Mirrors
        // run_image_cli on the Tauri side.
        if (pathname === "/api/image" && req.method === "POST") {
            try {
                const body = await req.json();
                if (typeof body?.prompt !== "string" || !body.prompt) {
                    return Response.json({ error: "Missing prompt" }, { status: 400 });
                }
                const result = await generateImage(body.prompt);
                return Response.json(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return Response.json({ error: message }, { status: 500 });
            }
        }

        // Publish transports for browser mode. Always HTTP 200 with {ok,url,error}
        // so a refused GitHub/Notion token is not a suite failure for the E2E
        // >=400 gate. Mirrors src-tauri/src/publish.rs.
        if (pathname === "/api/publish/gist" && req.method === "POST") {
            try {
                const body = await req.json();
                if (typeof body?.filename !== "string" || typeof body?.content !== "string") {
                    return Response.json({ ok: false, error: "Missing filename or content" });
                }
                if (typeof body?.token !== "string") {
                    return Response.json({ ok: false, error: "missing-token" });
                }
                return Response.json(
                    await publishGist({
                        filename: body.filename,
                        content: body.content,
                        token: body.token,
                        description: typeof body.description === "string" ? body.description : undefined,
                        public: Boolean(body.public),
                        fetch,
                    }),
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return Response.json({ ok: false, error: message });
            }
        }

        if (pathname === "/api/publish/notion" && req.method === "POST") {
            try {
                const body = await req.json();
                if (typeof body?.token !== "string" || !body.token.trim()) {
                    return Response.json({ ok: false, error: "missing-token" });
                }
                if (typeof body?.parentPageId !== "string" || typeof body?.title !== "string") {
                    return Response.json({ ok: false, error: "Missing parentPageId or title" });
                }
                if (!Array.isArray(body?.chunks)) {
                    return Response.json({ ok: false, error: "Missing chunks" });
                }
                return Response.json(
                    await publishNotion({
                        token: body.token,
                        parentPageId: body.parentPageId,
                        title: body.title,
                        chunks: body.chunks,
                        fetch,
                    }),
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return Response.json({ ok: false, error: message });
            }
        }

        if (pathname === "/api/settings") {
            if (req.method === "GET") {
                return Response.json({
                    settings: loadSettings(),
                    path: defaultSettingsPath(),
                });
            }
            if (req.method === "POST") {
                const body = await req.json();
                const settings = saveSettings(
                    body && typeof body === "object" ? body : {}
                );
                return Response.json({ settings });
            }
            return Response.json({ error: "Method not allowed" }, { status: 405 });
        }

        // Real filesystem API for browser mode -- the counterpart to the Tauri
        // commands, delegating to the same shared core (src/lib/fsCore.ts) that
        // fs_core.rs mirrors. This is what makes browser-mode testing mean
        // something: WebStorage used to fake writes, so a save could not fail
        // and testing it proved nothing.
        //
        // The workspace root comes from MOTION_WORKSPACE and NOTHING ELSE. It is
        // deliberately not client-supplied: accepting a directory from the
        // request would turn the dev server into an arbitrary-filesystem read
        // API for anything that can reach the port.
        if (pathname.startsWith("/api/fs/")) {
            try {
                switch (`${req.method} ${pathname}`) {
                    case "GET /api/fs/workspace":
                        return Response.json({ root: WORKSPACE_ROOT });

                    case "GET /api/fs/list":
                        return Response.json(
                            collectFiles(WORKSPACE_ROOT, MARKDOWN_EXTENSIONS)
                        );

                    case "GET /api/fs/data-files":
                        return Response.json(collectFiles(WORKSPACE_ROOT, DATA_EXTENSIONS));

                    case "GET /api/fs/read": {
                        const target = url.searchParams.get("path");
                        if (!target) {
                            return Response.json({ error: "Missing path" }, { status: 400 });
                        }
                        return Response.json({
                            content: readWorkspaceFile(WORKSPACE_ROOT, target),
                        });
                    }

                    case "POST /api/fs/write": {
                        const body = await req.json();
                        if (typeof body?.path !== "string" || typeof body?.content !== "string") {
                            return Response.json(
                                { error: "Missing path or content" },
                                { status: 400 }
                            );
                        }
                        writeWorkspaceFile(WORKSPACE_ROOT, body.path, body.content);
                        return Response.json({ ok: true });
                    }

                    case "POST /api/fs/rename": {
                        const body = await req.json();
                        if (typeof body?.from !== "string" || typeof body?.to !== "string") {
                            return Response.json(
                                { error: "Missing from or to" },
                                { status: 400 }
                            );
                        }
                        const path = renameWorkspaceFile(WORKSPACE_ROOT, body.from, body.to);
                        return Response.json({ ok: true, path });
                    }
                }
                return Response.json(
                    { error: `Unknown endpoint: ${req.method} ${pathname}` },
                    { status: 404 }
                );
            } catch (error) {
                // Map the shared error classes onto HTTP so the browser sees the
                // same distinctions the desktop app does.
                const status =
                    error instanceof FsError
                        ? { denied: 403, "not-found": 404, "not-a-directory": 400, exists: 409 }[
                              error.code
                          ]
                        : 500;
                const message = error instanceof Error ? error.message : String(error);
                return Response.json({ error: message }, { status });
            }
        }

        // Serve static files from public directory (path-traversal safe)
        // Strip leading slashes; reject null bytes and absolute-looking segments.
        const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
        if (relativePath && !relativePath.includes("\0")) {
            const candidate = resolve(PUBLIC_DIR, relativePath);
            if (isInsidePublicDir(candidate)) {
                const publicFile = Bun.file(candidate);
                if (await publicFile.exists()) {
                    return new Response(publicFile);
                }
            } else {
                return new Response("Not Found", { status: 404 });
            }
        }

        // An unknown /api/* route is an error, never an HTML page.
        if (pathname.startsWith("/api/")) {
            return Response.json(
                { error: `Unknown endpoint: ${pathname}` },
                { status: 404 }
            );
        }

        // A request for a concrete asset (anything whose last segment has an
        // extension) that wasn't found is a 404. Falling through to the SPA
        // shell here would answer fetch() with "200 + a page of HTML", which is
        // how a missing note came back to WebStorage.readFile as a successful
        // read of index.html rather than an error -- and why a missing file was
        // invisible to the E2E network gate.
        const lastSegment = pathname.split("/").pop() ?? "";
        if (lastSegment.includes(".")) {
            return new Response("Not Found", { status: 404 });
        }

        // Fallback to index.html for SPA routing
        const html = await generateHTML();
        return new Response(html, {
            headers: { "Content-Type": "text/html" },
        });
    },
});

console.log(`
🚀 Motion dev server running at http://localhost:${PORT}

   Watching for changes in src/...
   Press Ctrl+C to stop.
`);

// Cleanup on exit
process.on("SIGINT", () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    watcher.close();
    server.stop();
    process.exit(0);
});
