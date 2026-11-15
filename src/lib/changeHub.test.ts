import { test, expect } from "bun:test";
import { createChangeHub } from "./changeHub";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("a burst of changes sends one signal to each subscriber", async () => {
    const hub = createChangeHub(30);
    let a = 0;
    let b = 0;
    hub.subscribe(() => a++);
    hub.subscribe(() => b++);
    for (let i = 0; i < 50; i++) hub.notify();
    await sleep(60);
    expect([a, b]).toEqual([1, 1]);
});

test("constant churn still signals, once per window", async () => {
    const hub = createChangeHub(30);
    let sent = 0;
    hub.subscribe(() => sent++);
    // An event every 10 ms for 200 ms, faster than the window. A trailing
    // debounce would send nothing until the churn stopped.
    for (let i = 0; i < 20; i++) {
        hub.notify();
        await sleep(10);
    }
    expect(sent).toBeGreaterThanOrEqual(3);
});

test("a sender that throws is dropped, and the others still get the signal", async () => {
    const hub = createChangeHub(10);
    let ok = 0;
    hub.subscribe(() => {
        throw new TypeError("Controller is already closed");
    });
    hub.subscribe(() => ok++);
    hub.notify();
    await sleep(30);
    expect(ok).toBe(1);
    expect(hub.size).toBe(1);
});

test("unsubscribe stops the signal", async () => {
    const hub = createChangeHub(10);
    let sent = 0;
    const off = hub.subscribe(() => sent++);
    off();
    hub.notify();
    await sleep(30);
    expect(sent).toBe(0);
    expect(hub.size).toBe(0);
});
