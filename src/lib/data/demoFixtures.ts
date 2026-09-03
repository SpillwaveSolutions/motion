/**
 * Bundled demo datasets for the welcome document.
 *
 * The welcome HTML hardcodes `source: sample-data.csv` and
 * `source: sample-events.jsonl`. In web E2E those files exist in the seeded
 * MOTION_WORKSPACE. In Tauri they only exist if the user opened a folder that
 * happens to contain them — so cold welcome (no folder) and any real project
 * folder showed "Failed to load dataset" forever while Playwright stayed green.
 *
 * Keep these in sync with public/demo/sample-*. When storage cannot read a
 * workspace path, registerFile falls back to this map by basename.
 */

/** Welcome / demo basenames → file body. Keys are exact filenames. */
export const DEMO_DATA_FIXTURES: Readonly<Record<string, string>> = {
    "sample-data.csv": [
        "id,name,role,experience",
        "1,Alice,Architect,12",
        "2,Bob,Author,5",
        "3,Charlie,Developer,8",
        "4,Diana,Designer,7",
        "5,Eve,Manager,10",
        "",
    ].join("\n"),
    "sample-events.jsonl": [
        '{"event":"login","user":"Alice","timestamp":"2024-03-20T10:00:00Z"}',
        '{"event":"view_page","user":"Bob","timestamp":"2024-03-20T10:05:00Z"}',
        '{"event":"click_btn","user":"Alice","timestamp":"2024-03-20T10:10:00Z"}',
        "",
    ].join("\n"),
};

export function basenameOf(path: string): string {
    return path.split(/[/\\]/).pop() ?? path;
}

/**
 * Content for a dataset path: workspace file first, then bundled demo fixtures.
 * Throws the original storage error if neither has the file.
 */
export async function readDatasetContent(
    path: string,
    readFile: (p: string) => Promise<string>
): Promise<{ content: string; fromFixture: boolean }> {
    try {
        const content = await readFile(path);
        return { content, fromFixture: false };
    } catch (storageErr) {
        const base = basenameOf(path);
        const fixture = DEMO_DATA_FIXTURES[base];
        if (fixture !== undefined) {
            return { content: fixture, fromFixture: true };
        }
        throw storageErr;
    }
}

/** Turn Tauri string throws and Error objects into a readable message. */
export function asErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === "string" && err.trim()) return err;
    if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message: unknown }).message;
        if (typeof m === "string" && m.trim()) return m;
    }
    return fallback;
}
