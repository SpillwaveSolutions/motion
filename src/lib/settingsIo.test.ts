import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadSettings, saveSettings } from "./settingsIo";

const dirs: string[] = [];

afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tmpFile(name = "settings.json"): string {
    const dir = mkdtempSync(join(tmpdir(), "motion-settings-"));
    dirs.push(dir);
    return join(dir, name);
}

test("loadSettings returns defaults when the file is missing", () => {
    expect(loadSettings(join(tmpdir(), "motion-no-such-settings.json"))).toEqual({ zoom: 1 });
});

test("saveSettings clamps zoom and round-trips", () => {
    const file = tmpFile();
    expect(saveSettings({ zoom: 1.3 }, file).zoom).toBe(1.3);
    expect(loadSettings(file).zoom).toBe(1.3);
    expect(saveSettings({ zoom: 99 }, file).zoom).toBe(2);
    expect(loadSettings(file).zoom).toBe(2);
});

test("saveSettings preserves unknown keys from an older settings file", () => {
    const file = tmpFile();
    writeFileSync(file, JSON.stringify({ zoom: 1, launchMode: "desktop", port: 3000 }) + "\n");
    saveSettings({ zoom: 1.2 }, file);
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    expect(raw.zoom).toBe(1.2);
    expect(raw.launchMode).toBe("desktop");
    expect(raw.port).toBe(3000);
});
