import { describe, expect, it } from "vitest";
import { isPathDone, isPathRecordId, summarizePath } from "./learning-path";

describe("isPathDone", () => {
  it("treats completed and mastered as done for unlock/progress", () => {
    expect(isPathDone("completed")).toBe(true);
    expect(isPathDone("mastered")).toBe(true);
    expect(isPathDone("available")).toBe(false);
    expect(isPathDone("locked")).toBe(false);
  });
});

describe("summarizePath", () => {
  it("counts done nodes and surfaces the first available next title", () => {
    const summary = summarizePath([
      { status: "completed", title: "Суть" },
      { status: "available", title: "Спринт" },
      { status: "locked", title: "Пары" },
    ]);
    expect(summary).toEqual({
      done: 1,
      total: 3,
      percent: 33,
      nextTitle: "Спринт",
    });
  });

  it("handles an empty path without dividing by zero", () => {
    expect(summarizePath([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
      nextTitle: null,
    });
  });

  it("counts a single thin-chapter theory node as 100% when completed", () => {
    expect(summarizePath([{ status: "completed", title: "Суть главы" }])).toEqual({
      done: 1,
      total: 1,
      percent: 100,
      nextTitle: null,
    });
  });
});

describe("isPathRecordId", () => {
  it("accepts UUID path ids and rejects junk", () => {
    expect(isPathRecordId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isPathRecordId("not-a-uuid")).toBe(false);
  });
});
