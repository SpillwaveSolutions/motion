import { expect, test } from "bun:test";
import { nextZoom, zoomActionFor, ZOOM_MAX, ZOOM_MIN } from "./zoom";

test("stepping in and out moves by one step", () => {
    expect(nextZoom(1, "in")).toBe(1.1);
    expect(nextZoom(1, "out")).toBe(0.9);
});

test("reset returns to 100% from either direction", () => {
    expect(nextZoom(1.8, "reset")).toBe(1);
    expect(nextZoom(0.75, "reset")).toBe(1);
});

test("clamps at both ends instead of running away", () => {
    expect(nextZoom(ZOOM_MAX, "in")).toBe(ZOOM_MAX);
    expect(nextZoom(ZOOM_MIN, "out")).toBe(ZOOM_MIN);
    expect(nextZoom(1.95, "in")).toBe(ZOOM_MAX);
    expect(nextZoom(0.8, "out")).toBe(ZOOM_MIN);
});

test("stays on clean two-decimal values across repeated steps", () => {
    let z = 1;
    for (let i = 0; i < 5; i++) z = nextZoom(z, "in");
    // Naive float addition gives 1.5000000000000002 here, which would reach
    // both the settings file and a CSS font-size.
    expect(z).toBe(1.5);
});

test("a bare key without a modifier is not a zoom action", () => {
    expect(zoomActionFor({ key: "=", metaKey: false, ctrlKey: false })).toBe(null);
    expect(zoomActionFor({ key: "0", metaKey: false, ctrlKey: false })).toBe(null);
});

test("both spellings of plus and minus are matched", () => {
    for (const key of ["=", "+"]) {
        expect(zoomActionFor({ key, metaKey: true, ctrlKey: false })).toBe("in");
    }
    for (const key of ["-", "_"]) {
        expect(zoomActionFor({ key, metaKey: true, ctrlKey: false })).toBe("out");
    }
    expect(zoomActionFor({ key: "0", metaKey: true, ctrlKey: false })).toBe("reset");
});

test("Ctrl works too, for a browser on a non-Mac keyboard", () => {
    expect(zoomActionFor({ key: "=", metaKey: false, ctrlKey: true })).toBe("in");
});

test("unrelated shortcuts are left alone", () => {
    expect(zoomActionFor({ key: "s", metaKey: true, ctrlKey: false })).toBe(null);
    expect(zoomActionFor({ key: "1", metaKey: true, ctrlKey: false })).toBe(null);
});
