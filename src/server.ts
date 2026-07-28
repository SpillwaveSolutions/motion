/**
 * Bun Development Server for Motion
 *
 * Serves the app with CSS inlined and JS as external file.
 */

import { watch } from "fs";
import { readdir } from "fs/promises";
import { join, dirname, resolve, relative, isAbsolute } from "path";
import { callLLM, type ModelProvider } from "./lib/cliWrappers";
import { generateImage } from "./lib/imageGen";

const ALLOWED_LLM_PROVIDERS: ModelProvider[] = ["opencode", "claude", "qwen"];

// Get project root (parent of src/)
const PROJECT_ROOT = dirname(dirname(import.meta.path));
const PUBLIC_DIR = resolve(PROJECT_ROOT, "public");
const PORT = 3000;

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

// Generate the HTML
async function generateHTML(): Promise<string> {
    const css = await getCSS();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Motion - A local-first technical writing IDE with Markdown storage and AI-powered editing" />
  <title>Motion - Technical Writing IDE</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/bundle.js"></script>
</body>
</html>`;
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

        // List the demo workspace files WebStorage reads from in a browser
        // (no Tauri filesystem access there -- these are real files under
        // public/demo/, not a hardcoded list).
        if (pathname === "/api/demo-files") {
            try {
                const files = (await readdir(join(PUBLIC_DIR, "demo"))).filter(
                    (f) => !f.startsWith(".")
                );
                return Response.json(files, { headers: { "Cache-Control": "no-cache" } });
            } catch {
                return Response.json([], { headers: { "Cache-Control": "no-cache" } });
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
