/**
 * Postgres / drizzle missing table or column (e.g. books.path_status not migrated).
 * Pure — safe to unit-test without a live DB.
 */
export function isMissingDbObjectError(error: unknown): boolean {
  const seen = new Set<unknown>();

  const visit = (value: unknown): boolean => {
    if (!value || seen.has(value)) {
      return false;
    }
    seen.add(value);

    if (typeof value === "string") {
      const text = value.toLowerCase();
      return (
        text.includes("does not exist") ||
        text.includes("undefined_column") ||
        text.includes("undefined_table") ||
        text.includes("42703") ||
        text.includes("42p01")
      );
    }

    if (value instanceof Error) {
      if (visit(value.message) || (value.cause != null && visit(value.cause))) {
        return true;
      }
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      // postgres.js / node-pg often put the SQLSTATE on `code`.
      if (typeof record.code === "string") {
        const code = record.code.toUpperCase();
        if (code === "42703" || code === "42P01") {
          return true;
        }
      }
      for (const item of Object.values(record)) {
        if (visit(item)) {
          return true;
        }
      }
    }

    return false;
  };

  return visit(error);
}
