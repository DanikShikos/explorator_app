import { describe, expect, it } from "vitest";
import { isMissingDbObjectError } from "./db-errors";

describe("isMissingDbObjectError", () => {
  it("detects postgres missing-column messages", () => {
    expect(
      isMissingDbObjectError(
        new Error('column "path_status" of relation "books" does not exist'),
      ),
    ).toBe(true);
  });

  it("detects Failed query wrappers with a missing-column cause", () => {
    const cause = Object.assign(new Error('column "path_status" does not exist'), {
      code: "42703",
    });
    const wrapped = new Error('Failed query: select "path_status" from "books"');
    (wrapped as Error & { cause: unknown }).cause = cause;
    expect(isMissingDbObjectError(wrapped)).toBe(true);
  });

  it("ignores genuine empty-result / network-style failures", () => {
    expect(isMissingDbObjectError(new Error("ECONNREFUSED 127.0.0.1:5432"))).toBe(false);
    expect(isMissingDbObjectError(new Error("Failed query: select id from books"))).toBe(false);
    expect(isMissingDbObjectError(null)).toBe(false);
  });
});
