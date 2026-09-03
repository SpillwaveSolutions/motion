#!/usr/bin/env bun
/**
 * Deterministic half of the docs/ui rubric — [dom] and [css] criteria on the
 * running app. [eye]/agent rows are not attempted here.
 *
 *   bun run dev
 *   bun run ui:audit http://127.0.0.1:3000
 *
 * Exits non-zero when any criterion fails.
 */
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const asJson = process.argv.includes("--json");

const VIEWPORTS = [
    [1280, 800, "1280"],
    [390, 844, "390"],
];

function measure() {
    const luminance = (rgb) => {
        const parts = rgb.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return 0;
        const [r, g, b] = parts.slice(0, 3).map(Number);
        const chan = (c) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
    };
    const ratio = (a, b) => {
        const [x, y] = [luminance(a), luminance(b)];
        return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
    };

    const root = document.documentElement;
    const bodyStyle = getComputedStyle(document.body);

    const named = (el) => {
        if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return true;
        if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
        if (el.closest("label")) return true;
        if (/^(BUTTON|A)$/.test(el.tagName) && (el.textContent || "").trim()) return true;
        if (el.getAttribute("title") && /^(BUTTON|A)$/.test(el.tagName)) return true;
        return false;
    };

    // Chrome only — note body (datasets, query blocks, ProseMirror) is free to
    // ship partially-named controls while block a11y is still maturing. Same
    // split as e2e/layout.spec.ts › no chrome control outside viewport.
    const chromeRoots = [
        document.querySelector("header.app-header"),
        document.querySelector("aside.app-sidebar"),
    ].filter(Boolean);
    const controls = chromeRoots.flatMap((root) =>
        [
            ...root.querySelectorAll(
                "input,textarea,select,[role='slider'],[role='switch'],[role='combobox'],button,a[href]"
            ),
        ].filter((el) => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
        })
    );

    return {
        contrast: ratio(bodyStyle.backgroundColor, bodyStyle.color),
        horizontalScroll: root.scrollWidth > root.clientWidth + 2,
        hasHeader: !!document.querySelector("header.app-header"),
        hasSidebar: !!document.querySelector("aside.app-sidebar"),
        hasMain: !!document.querySelector("main.app-main"),
        h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()).filter(Boolean),
        activeView: document.querySelectorAll(".view-toggle-btn.active").length,
        unnamedControls: controls
            .filter((el) => !named(el))
            .slice(0, 8)
            .map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}`),
    };
}

const browser = await chromium.launch({ headless: true });
const findings = [];
const rows = [];

for (const [width, height, label] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-app-ready]", { timeout: 30_000 });
    await page.waitForTimeout(250);

    const m = await page.evaluate(measure);
    const at = `boot · ${label}px`;
    rows.push({ at, ...m });

    const fail = (criterion, detail) => findings.push({ at, criterion, detail });

    if (m.contrast < 4.5) fail("[css] body contrast >= 4.5:1", `${m.contrast}:1`);
    if (m.horizontalScroll) fail("[css] no horizontal scroll", "document wider than viewport");
    if (!m.hasHeader) fail("[dom] header present", "missing");
    if (!m.hasSidebar) fail("[dom] sidebar present", "missing");
    if (!m.hasMain) fail("[dom] main present", "missing");
    if (m.activeView !== 1) fail("[dom] exactly one active view mode", `found ${m.activeView}`);
    if (m.unnamedControls.length)
        fail("[dom] every visible control has a name", m.unnamedControls.join(", "));

    await ctx.close();
}

await browser.close();

if (asJson) {
    console.log(JSON.stringify({ findings, rows }, null, 2));
} else if (findings.length === 0) {
    console.log(`PASS — ${rows.length} viewport(s), 0 findings`);
} else {
    console.log(`FAIL — ${findings.length} findings across ${rows.length} viewport(s)\n`);
    for (const f of findings) {
        console.log(`${f.criterion}  @ ${f.at} → ${f.detail}`);
    }
}
process.exit(findings.length ? 1 : 0);
