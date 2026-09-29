import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("notes export route — auth + rate limit (source contract)", () => {
  const src = readFileSync(join(process.cwd(), "src/app/api/notes/export/route.ts"), "utf8");
  const get = src.slice(src.indexOf("export async function GET"));

  it("requires session before rate limit and export work", () => {
    expect(get).toContain("getCurrentUserId");
    expect(get).toMatch(/status:\s*401/);
    expect(get).toContain("Нужен вход");
    expect(get.indexOf("getCurrentUserId")).toBeLessThan(get.indexOf("consumeRateLimit"));
  });

  it("enforces consumeRateLimit and returns 429 when over quota", () => {
    expect(get).toContain("consumeRateLimit");
    expect(get).toContain("NOTES_EXPORT_LIMIT");
    expect(get).toContain("notes-export");
    expect(get).toMatch(/status:\s*limit\.status/);
    expect(get).toContain("Retry-After");
    expect(get.indexOf("consumeRateLimit")).toBeLessThan(get.indexOf("buildNotesDocx"));
  });

  it("keeps owner scope on notes and books", () => {
    expect(get).toContain("eq(books.userId, userId)");
    expect(get.match(/eq\(notes\.userId,\s*userId\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
