import { describe, expect, test } from "bun:test";
import {
    DEFAULT_SETTINGS,
    mergeSettings,
    parseSettingsJson,
    resolveWorkspaceArg,
    settingsFilePath,
    settingsRelPath,
} from "./settings";
import { join, resolve } from "path";

describe("mergeSettings", () => {
    test("fills defaults for empty input", () => {
        expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
        expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    });

    test("accepts desktop launch mode and clamps port", () => {
        expect(mergeSettings({ launchMode: "desktop", port: 99999 }).port).toBe(3000);
        expect(mergeSettings({ launchMode: "desktop", port: 4010 })).toEqual({
            launchMode: "desktop",
            port: 4010,
            openBrowser: true,
            zoom: 1,
        });
    });

    test("rejects unknown launch modes", () => {
        expect(mergeSettings({ launchMode: "spaceship" as "web" }).launchMode).toBe("web");
    });

    test("zoom defaults to 1 when absent or not a usable number", () => {
        expect(mergeSettings({}).zoom).toBe(1);
        expect(mergeSettings({ zoom: "big" as unknown as number }).zoom).toBe(1);
        expect(mergeSettings({ zoom: NaN }).zoom).toBe(1);
        expect(mergeSettings({ zoom: Infinity }).zoom).toBe(1);
        expect(mergeSettings({ zoom: null as unknown as number }).zoom).toBe(1);
    });

    test("zoom is clamped, so a hand-edited file cannot make the app unreadable", () => {
        expect(mergeSettings({ zoom: 0.1 }).zoom).toBe(0.75);
        expect(mergeSettings({ zoom: -5 }).zoom).toBe(0.75);
        expect(mergeSettings({ zoom: 99 }).zoom).toBe(2);
    });

    test("zoom passes through in range", () => {
        expect(mergeSettings({ zoom: 1.3 }).zoom).toBe(1.3);
        expect(mergeSettings({ zoom: 0.75 }).zoom).toBe(0.75);
        expect(mergeSettings({ zoom: 2 }).zoom).toBe(2);
    });
});

describe("resolveWorkspaceArg", () => {
    const cwd = "/Users/me/projects";
    const resolvePath = (p: string) => resolve(p);
    const isDir = (abs: string) => abs === "/Users/me/projects" || abs === "/Users/me/projects/foo";

    test("defaults to cwd for . and empty", () => {
        const a = resolveWorkspaceArg(".", cwd, resolvePath, isDir);
        expect(a).toEqual({ ok: true, path: "/Users/me/projects" });
        const b = resolveWorkspaceArg(undefined, cwd, resolvePath, isDir);
        expect(b).toEqual({ ok: true, path: "/Users/me/projects" });
    });

    test("resolves relative foo against cwd", () => {
        const r = resolveWorkspaceArg("./foo", cwd, resolvePath, isDir);
        expect(r).toEqual({ ok: true, path: "/Users/me/projects/foo" });
    });

    test("rejects non-directories", () => {
        const r = resolveWorkspaceArg("./missing", cwd, resolvePath, isDir);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toContain("Not a directory");
    });
});

describe("settings paths", () => {
    test("settingsRelPath is under .config/motion", () => {
        expect(settingsRelPath()).toEqual([".config", "motion", "settings.json"]);
        expect(settingsFilePath("/home/x", join)).toBe("/home/x/.config/motion/settings.json");
    });

    test("parseSettingsJson tolerates garbage", () => {
        expect(parseSettingsJson("not-json")).toEqual(DEFAULT_SETTINGS);
        expect(parseSettingsJson('{"launchMode":"desktop","port":4500}')).toEqual({
            launchMode: "desktop",
            port: 4500,
            openBrowser: true,
            zoom: 1,
        });
    });
});
