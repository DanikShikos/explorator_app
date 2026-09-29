import { describe, expect, it } from "vitest";
import { isPathDone, isPathRecordId, pickNextPlayableNode, summarizePath } from "./learning-path";

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

  it("counts short-chapter theory+sprint by actual node total (RFC-004)", () => {
    expect(
      summarizePath([
        { status: "completed", title: "Суть главы" },
        { status: "available", title: "Спринт" },
      ]),
    ).toEqual({
      done: 1,
      total: 2,
      percent: 50,
      nextTitle: "Спринт",
    });
  });
});

describe("isPathRecordId", () => {
  it("accepts UUID path ids and rejects junk", () => {
    expect(isPathRecordId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isPathRecordId("not-a-uuid")).toBe(false);
  });
});

describe("pickNextPlayableNode", () => {
  it("skips available practice with zero grounded cards", () => {
    const nodes = [
      { id: "t", status: "completed", title: "Суть", nodeType: "summary_read" },
      { id: "p", status: "available", title: "Закрепление", nodeType: "flashcard_review" },
      { id: "n", status: "available", title: "Суть следующей", nodeType: "summary_read" },
    ];
    const next = pickNextPlayableNode(nodes, new Set(["p"]));
    expect(next?.title).toBe("Суть следующей");
  });

  it("keeps available practice when it has cards", () => {
    const nodes = [
      { id: "p", status: "available", title: "Спринт", nodeType: "quiz_sprint" },
    ];
    expect(pickNextPlayableNode(nodes, new Set())?.title).toBe("Спринт");
  });
});
