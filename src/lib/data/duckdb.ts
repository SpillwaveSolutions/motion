import * as duckdb from "@duckdb/duckdb-wasm";
import { storage } from "../storage";
import {
    escapeSqlString,
    validateIdentifier,
    validateSelectSql,
} from "./sqlSafety";

export {
    MAX_QUERY_LIMIT,
    clampLimit,
    escapeSqlString,
    validateIdentifier,
    validateSelectSql,
} from "./sqlSafety";

// Local bundles instead of JSDelivr to avoid CORS issues with Workers
const LOCAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: "/duckdb/duckdb-mvp.wasm",
        mainWorker: "/duckdb/duckdb-browser-mvp.worker.js",
    },
    eh: {
        mainModule: "/duckdb/duckdb-eh.wasm",
        mainWorker: "/duckdb/duckdb-browser-eh.worker.js",
    },
};

let db: duckdb.AsyncDuckDB | null = null;
let logger = new duckdb.ConsoleLogger();

/**
 * Initialize DuckDB WASM
 */
export async function initDuckDB() {
    if (db) return db;

    // Select a bundle based on browser capability
    const bundle = await duckdb.selectBundle(LOCAL_BUNDLES);

    const worker = new Worker(bundle.mainWorker!);
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    return db;
}

/**
 * Register a local file (CSV/JSONL) as a DuckDB table
 */
export async function registerFile(filePath: string, tableName: string) {
    const database = await initDuckDB();
    const safeTable = validateIdentifier(tableName);
    const safePath = escapeSqlString(filePath);

    // Read the file content from local storage
    const content = await storage.readFile(filePath);

    // Register the file in DuckDB's virtual filesystem
    const encoder = new TextEncoder();
    const buffer = encoder.encode(content);

    await database.registerFileBuffer(filePath, buffer);

    // Connect and create a table from the file
    const conn = await database.connect();
    try {
        const isJson = filePath.endsWith(".json") || filePath.endsWith(".jsonl");
        const readFunction = isJson ? "read_json_auto" : "read_csv_auto";
        // table name is identifier-validated; path is single-quote-escaped
        await conn.query(
            `CREATE OR REPLACE TABLE "${safeTable}" AS SELECT * FROM ${readFunction}('${safePath}')`
        );
    } finally {
        await conn.close();
    }
}

/**
 * Execute a query and return results as an array of objects.
 * Connection is closed exactly once (including on retry).
 */
export async function executeQuery(sql: string, retryCount = 0): Promise<any[]> {
    const safeSql = validateSelectSql(sql);
    const database = await initDuckDB();
    const conn = await database.connect();

    let closed = false;
    const closeOnce = async () => {
        if (!closed) {
            closed = true;
            await conn.close();
        }
    };

    try {
        const result = await conn.query(safeSql);
        // Convert Apache Arrow table to standard JS objects
        return result.toArray().map((row) => row.toJSON());
    } catch (err) {
        // If table not found, and we haven't retried too many times, wait and try again
        // This handles the case where QueryExtension mounts before DatasetExtension has finished registerFile
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("does not exist") && retryCount < 3) {
            await closeOnce();
            await new Promise((resolve) => setTimeout(resolve, 500 * (retryCount + 1)));
            return executeQuery(sql, retryCount + 1);
        }
        throw err;
    } finally {
        await closeOnce();
    }
}
