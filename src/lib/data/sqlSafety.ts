/** Max rows a LIMIT clause may request. */
export const MAX_QUERY_LIMIT = 10_000;

/** SQL identifiers: letters, digits, underscore; must start with letter or underscore. */
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Validate a SQL identifier (table/column name). Rejects injection via quotes or punctuation.
 */
export function validateIdentifier(name: string): string {
    if (typeof name !== "string" || !IDENTIFIER_RE.test(name)) {
        throw new Error(`Invalid SQL identifier: ${JSON.stringify(name)}`);
    }
    return name;
}

/**
 * Escape a string for use inside a single-quoted SQL literal.
 */
export function escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
}

/**
 * Coerce and clamp a LIMIT value to a safe positive integer.
 */
export function clampLimit(limit: unknown, defaultLimit = 5): number {
    const n =
        typeof limit === "number"
            ? limit
            : Number.parseInt(String(limit ?? ""), 10);
    if (!Number.isFinite(n) || n < 1) {
        return defaultLimit;
    }
    return Math.min(Math.floor(n), MAX_QUERY_LIMIT);
}

/**
 * Restrict document-supplied SQL to a single SELECT (or WITH … SELECT) statement.
 * Blocks multi-statement input and common non-SELECT verbs.
 */
export function validateSelectSql(sql: string): string {
    if (typeof sql !== "string") {
        throw new Error("SQL must be a string");
    }
    let trimmed = sql.trim();
    if (!trimmed) {
        throw new Error("Empty SQL");
    }

    // Disallow multi-statement (allow a single trailing semicolon).
    const withoutTrailingSemi = trimmed.replace(/;\s*$/, "");
    if (withoutTrailingSemi.includes(";")) {
        throw new Error("Multi-statement SQL is not allowed");
    }
    trimmed = withoutTrailingSemi.trim();

    const upper = trimmed.toUpperCase();
    if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
        throw new Error("Only SELECT queries are allowed");
    }

    // Block common non-SELECT verbs even if they appear later in the statement.
    // Word-boundary match avoids false positives on identifiers like "created_at".
    const forbidden =
        /\b(ATTACH|COPY|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|PRAGMA|INSTALL|LOAD|EXPORT|IMPORT|CALL|EXECUTE|GRANT|REVOKE)\b/i;
    if (forbidden.test(trimmed)) {
        throw new Error("SQL contains disallowed statements or keywords");
    }

    return trimmed;
}
