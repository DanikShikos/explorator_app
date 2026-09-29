import { describe, expect, it } from "vitest";
import {
  SHORT_CHAPTER_MAX_MINUTES,
  chapterPathNodeCount,
  classifyChapterPathSize,
  estimateReadTimeMinutes,
  nodeHasLearningProgress,
  prunableExcessNodeIds,
  prunablePracticeNodeIds,
} from "./chapter-path-size";

const SHORT_SUBSTANCE =
  "Инновация меняет способ работы предприятия. Нужны гипотеза, короткий эксперимент и метрика результата, иначе команда путает активность с прогрессом.";

/** ~4+ minutes at 180 wpm — long chapter. */
function longSubstance(minutes: number) {
  const wordsNeeded = minutes * 180;
  return Array.from({ length: wordsNeeded }, (_, i) => `слово${i}`).join(" ");
}

describe("classifyChapterPathSize", () => {
  it("keeps thin chapters as theory-only (BE-004)", () => {
    expect(classifyChapterPathSize("", "Мало текста.")).toBe("thin");
    expect(chapterPathNodeCount("thin")).toBe(1);
  });

  it("marks short substantive chapters as theory + sprint", () => {
    expect(SHORT_SUBSTANCE.replace(/\s+/g, " ").trim().length).toBeGreaterThanOrEqual(80);
    expect(classifyChapterPathSize(SHORT_SUBSTANCE, "")).toBe("short");
    expect(classifyChapterPathSize(SHORT_SUBSTANCE, "", SHORT_CHAPTER_MAX_MINUTES)).toBe("short");
    expect(chapterPathNodeCount("short")).toBe(2);
  });

  it("marks long chapters as four nodes", () => {
    const body = longSubstance(4);
    expect(classifyChapterPathSize("", body)).toBe("long");
    expect(classifyChapterPathSize("", body, 5)).toBe("long");
    expect(classifyChapterPathSize(SHORT_SUBSTANCE, "", 5)).toBe("long");
    expect(chapterPathNodeCount("long")).toBe(4);
  });

  it("prefers explicit readTimeMinutes over estimated length", () => {
    const body = longSubstance(5);
    expect(classifyChapterPathSize("", body, 1)).toBe("short");
    expect(classifyChapterPathSize(SHORT_SUBSTANCE, "", 10)).toBe("long");
  });
});

describe("estimateReadTimeMinutes", () => {
  it("mirrors parser ~180 wpm rounding", () => {
    expect(estimateReadTimeMinutes("", "one two three")).toBe(1);
    expect(estimateReadTimeMinutes("", longSubstance(3))).toBe(3);
  });
});

describe("progress-safe prune helpers", () => {
  const nodes = [
    { id: "t", orderIndex: 0, nodeType: "summary_read" },
    { id: "s", orderIndex: 1, nodeType: "quiz_sprint" },
    { id: "p", orderIndex: 2, nodeType: "flashcard_review" },
    { id: "b", orderIndex: 3, nodeType: "boss_challenge" },
  ];

  it("treats available/completed/mastered as progress", () => {
    expect(nodeHasLearningProgress(undefined)).toBe(false);
    expect(nodeHasLearningProgress({ status: "locked" })).toBe(false);
    expect(nodeHasLearningProgress({ status: "available" })).toBe(true);
    expect(nodeHasLearningProgress({ status: "completed" })).toBe(true);
    expect(nodeHasLearningProgress({ status: "mastered" })).toBe(true);
    expect(nodeHasLearningProgress({ status: "locked", completedAt: new Date() })).toBe(true);
  });

  it("drops locked excess pairs/boss but keeps nodes with progress", () => {
    const progress = new Map([
      ["t", { status: "completed" }],
      ["s", { status: "available" }],
      ["p", { status: "locked" }],
      ["b", { status: "locked" }],
    ]);
    expect(prunableExcessNodeIds(nodes, progress, 2)).toEqual(["p", "b"]);

    progress.set("p", { status: "completed" });
    expect(prunableExcessNodeIds(nodes, progress, 2)).toEqual(["b"]);
  });

  it("BUG-005: short rebuild never deletes pairs/boss the user already reached", () => {
    // Long path (4) rebuilt as short (expected 2): keep progressed excess; drop only locked.
    const progress = new Map([
      ["t", { status: "completed" }],
      ["s", { status: "completed" }],
      ["p", { status: "available" }],
      ["b", { status: "mastered" }],
    ]);
    expect(prunableExcessNodeIds(nodes, progress, 2)).toEqual([]);
    // Missing progress row = no progress → may prune.
    expect(prunableExcessNodeIds(nodes, new Map([["t", { status: "available" }]]), 2)).toEqual([
      "p",
      "b",
    ]);
  });

  it("drops practice without progress when chapter is thin", () => {
    const progress = new Map([
      ["t", { status: "available" }],
      ["s", { status: "locked" }],
      ["p", { status: "completed" }],
    ]);
    expect(prunablePracticeNodeIds(nodes, progress)).toEqual(["s", "b"]);
  });
});
