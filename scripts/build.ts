/**
 * Production build for the packaged desktop app.
 *
 * `bun build` alone emits main.js and main.css and nothing else, so
 * `frontendDist: "../dist"` in tauri.conf.json pointed at a directory with no
 * entry point: `bun tauri build` produced an app that opened a blank window.
 * That is B3, and it is why only `bun tauri dev` ever worked -- dev mode loads
 * `devUrl` from the dev server instead of the bundle.
 *
 * This emits the missing index.html from the same shell template the dev server
 * uses, so the two cannot drift.
 */
import { rmSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { renderShell } from "../src/shell";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist");

if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
}

const result = await Bun.build({
    entrypoints: [join(ROOT, "src/main.tsx")],
    outdir: DIST,
    target: "browser",
    format: "esm",
    minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
});

if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("build failed");
}

// Bun names the CSS asset after the entrypoint; find it rather than assuming.
const cssAsset = result.outputs.find((o) => o.path.endsWith(".css"));
const jsAsset = result.outputs.find((o) => o.path.endsWith(".js"));
if (!jsAsset) {
    throw new Error("build produced no JS entry point");
}

const basename = (p: string): string => p.split("/").pop() as string;

writeFileSync(
    join(DIST, "index.html"),
    renderShell({
        cssHref: cssAsset ? `./${basename(cssAsset.path)}` : undefined,
        scriptSrc: `./${basename(jsAsset.path)}`,
    })
);

console.log(`✅ dist/ built: index.html, ${basename(jsAsset.path)}${cssAsset ? `, ${basename(cssAsset.path)}` : ""}`);
