import { describe, expect, test } from "bun:test";
import {
    DEFAULT_SETTINGS,
    mergeSettings,
    parseSettingsJson,
    settingsFilePath,
    settingsRelPath,
} from "./settings";
import { join } from "path";

describe("mergeSettings", () => {
    test("fills defaults for empty input", () => {
        expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
        expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
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

describe("settings paths", () => {
    test("settingsRelPath is under .config/motion", () => {
        expect(settingsRelPath()).toEqual([".config", "motion", "settings.json"]);
        expect(settingsFilePath("/home/x", join)).toBe("/home/x/.config/motion/settings.json");
    });

    test("parseSettingsJson tolerates garbage", () => {
        expect(parseSettingsJson("not-json")).toEqual(DEFAULT_SETTINGS);
        expect(parseSettingsJson('{"zoom":1.4}')).toEqual({ zoom: 1.4 });
        expect(parseSettingsJson('{"zoom":1.4,"launchMode":"desktop"}')).toEqual({ zoom: 1.4 });
    });
});
