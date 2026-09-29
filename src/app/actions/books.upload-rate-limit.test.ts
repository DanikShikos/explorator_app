import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("createBookFromUpload — auth + rate limit (source contract)", () => {
  const src = readFileSync(join(process.cwd(), "src/app/actions/books.ts"), "utf8");
  const fn = src.slice(src.indexOf("export async function createBookFromUpload"));

  it("requires session before rate limit and parse", () => {
    expect(fn).toContain("getCurrentUserId");
    expect(fn.indexOf("getCurrentUserId")).toBeLessThan(fn.indexOf("consumeRateLimit"));
    expect(fn.indexOf("consumeRateLimit")).toBeLessThan(fn.indexOf("parseBookFile"));
  });

  it("enforces consumeRateLimit and surfaces 429 when over quota", () => {
    expect(fn).toContain("consumeRateLimit");
    expect(fn).toContain("BOOK_UPLOAD_LIMIT");
    expect(fn).toContain("book-upload");
    expect(fn).toContain("status: rate.status");
    expect(fn).toMatch(/ok:\s*false[\s\S]*?error:\s*rate\.error/);
  });
});
