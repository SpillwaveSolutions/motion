/**
 * Proof that the gate in fixtures.ts actually bites -- a hand-run probe, not a
 * suite member (the .capture.spec.ts name excludes it; BASELINE=1 opts in):
 *
 *     BASELINE=1 bunx playwright test e2e/guard.proof.capture.spec.ts
 *
 * CORRECT RESULT: 3 failed, 1 passed. The first three tests inject a defect and
 * MUST go red; the fourth proves allow() can scope a deliberate error path.
 * If all four pass, the guard has stopped working and every other spec in this
 * directory is theater.
 */
import { test, gotoApp } from "./fixtures";

test("PROOF: an unallowed console error must fail the test", async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => console.error("deliberate regression"));
});

test("PROOF: a missing api route must 404 and fail the test", async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => fetch("/api/does-not-exist"));
    await page.waitForTimeout(500);
});

test("PROOF: a missing asset must 404 and fail the test", async ({ page }) => {
    await gotoApp(page);
    await page.evaluate(() => fetch("/demo/no-such-note.md"));
    await page.waitForTimeout(500);
});

test("PROOF: allow() scopes an expected error so the test passes", async ({ page, guard }) => {
    guard.allow(/deliberate and expected/);
    await gotoApp(page);
    await page.evaluate(() => console.error("deliberate and expected"));
});
