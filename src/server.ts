/**
 * Bun Development Server for Motion
 * 
 * Serves the app with CSS inlined and JS as external file.
 */

import { watch } from "fs";
import { join, dirname } from "path";

// Get project root (parent of src/)
const PROJECT_ROOT = dirname(dirname(import.meta.path));
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
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

// Initial build
await buildApp();

// Watch for file changes
const watcher = watch(join(PROJECT_ROOT, "src"), { recursive: true }, async (event, filename) => {
    if (filename && (filename.endsWith(".ts") || filename.endsWith(".tsx") || filename.endsWith(".css"))) {
        console.log(`\n🔄 File changed: ${filename}`);
        await buildApp();
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

        // Serve the JS bundle
        if (pathname === "/bundle.js") {
            return new Response(jsBundle, {
                headers: {
                    "Content-Type": "application/javascript",
                    "Cache-Control": "no-cache",
                },
            });
        }

        // Serve static files from public directory
        const publicFile = Bun.file(join(PROJECT_ROOT, "public", pathname));
        if (await publicFile.exists()) {
            return new Response(publicFile);
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
    watcher.close();
    server.stop();
    process.exit(0);
});
