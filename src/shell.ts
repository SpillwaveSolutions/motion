/**
 * The one HTML shell, rendered two ways.
 *
 * There used to be two-and-a-half: `generateHTML()` inside the dev server, a
 * stale root `index.html` pointing at `/src/main.tsx` (a path nothing served),
 * and nothing at all for production -- `bun run build` emitted only main.js and
 * main.css, so `frontendDist: "../dist"` pointed at a directory with no entry
 * point and the packaged desktop app could not start. That is B3.
 *
 * One template, two call sites, so the shells cannot drift again.
 */

export interface ShellOptions {
    /** Inlined into a <style> tag. Used by the dev server. */
    inlineCss?: string;
    /** Linked as a stylesheet. Used by the production build. */
    cssHref?: string;
    /** The module script to load. */
    scriptSrc: string;
}

export function renderShell({ inlineCss, cssHref, scriptSrc }: ShellOptions): string {
    const head = [
        cssHref ? `  <link rel="stylesheet" href="${cssHref}" />` : "",
        inlineCss ? `  <style>\n${inlineCss}\n  </style>` : "",
    ]
        .filter(Boolean)
        .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Motion - A local-first technical writing IDE with Markdown storage and AI-powered editing" />
  <title>Motion - Technical Writing IDE</title>
${head}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptSrc}"></script>
</body>
</html>`;
}
