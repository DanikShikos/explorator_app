import { describe, expect, it } from "vitest";
import {
  evaluateLearningPathGate,
  MIN_ESSENCE_CHARS,
  type GateChapterInput,
} from "./learning-path-gate";
import type { Exercise } from "./exercises";

const longTheory = "A".repeat(MIN_ESSENCE_CHARS) + " Правило: учись каждый день понемногу.";

function chapter(partial: Partial<GateChapterInput> & { nodes: GateChapterInput["nodes"] }): GateChapterInput {
  return {
    thin: false,
    exercisesByNodeId: {},
    ...partial,
  };
}

function mcq(answer: string): Exercise {
  return {
    type: "multiple_choice",
    prompt: "Вопрос",
    options: [answer, "нет", "нет", "нет"],
    correctIndex: 0,
    pairs: null,
    answer: null,
    sentence: null,
    steps: null,
    explanation: "ок",
  };
}

describe("evaluateLearningPathGate (BE-007)", () => {
  it("passes substantive theory→practice with grounded cards", () => {
    const theoryId = "t1";
    const practiceId = "p1";
    const result = evaluateLearningPathGate([
      chapter({
        nodes: [
          { id: theoryId, nodeType: "summary_read", orderIndex: 0, description: longTheory },
          { id: practiceId, nodeType: "quiz_sprint", orderIndex: 1, description: "Спринт" },
        ],
        exercisesByNodeId: {
          [practiceId]: [mcq("учись каждый день")],
        },
      }),
    ]);
    expect(result).toEqual({ ok: true });
  });

  it("fails empty chapters list", () => {
    expect(evaluateLearningPathGate([])).toEqual({
      ok: false,
      reasons: ["Нет глав для контроля тропы"],
    });
  });

  it("fails substantive with empty / short theory", () => {
    const result = evaluateLearningPathGate([
      chapter({
        nodes: [
          { id: "t1", nodeType: "summary_read", orderIndex: 0, description: "коротко" },
          { id: "p1", nodeType: "quiz_sprint", orderIndex: 1, description: "Спринт" },
        ],
      }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => r.includes("теории") || r.includes("сути"))).toBe(true);
    }
  });

  it("fails practice before theory", () => {
    const result = evaluateLearningPathGate([
      chapter({
        nodes: [
          { id: "p1", nodeType: "quiz_sprint", orderIndex: 0, description: "Спринт" },
          { id: "t1", nodeType: "summary_read", orderIndex: 1, description: longTheory },
        ],
      }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => r.includes("практика раньше"))).toBe(true);
    }
  });

  it("fails thin chapter that still has practice nodes", () => {
    const result = evaluateLearningPathGate([
      chapter({
        thin: true,
        nodes: [
          { id: "t1", nodeType: "summary_read", orderIndex: 0, description: "Короткая мысль" },
          { id: "p1", nodeType: "quiz_sprint", orderIndex: 1, description: "Спринт" },
        ],
      }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => r.includes("тонкая"))).toBe(true);
    }
  });

  it("passes thin chapter with single theory blurb", () => {
    const result = evaluateLearningPathGate([
      chapter({
        thin: true,
        nodes: [{ id: "t1", nodeType: "summary_read", orderIndex: 0, description: "Короткая мысль" }],
      }),
    ]);
    expect(result).toEqual({ ok: true });
  });

  it("fails ungrounded practice cards", () => {
    const practiceId = "p1";
    const result = evaluateLearningPathGate([
      chapter({
        nodes: [
          { id: "t1", nodeType: "summary_read", orderIndex: 0, description: longTheory },
          { id: practiceId, nodeType: "quiz_sprint", orderIndex: 1, description: "Спринт" },
        ],
        exercisesByNodeId: {
          [practiceId]: [mcq("факт которого нет в теории вообще")],
        },
      }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => r.includes("заземлены"))).toBe(true);
    }
  });

  it("allows empty practice cards (BE-003 empty ok)", () => {
    const result = evaluateLearningPathGate([
      chapter({
        nodes: [
          { id: "t1", nodeType: "summary_read", orderIndex: 0, description: longTheory },
          { id: "p1", nodeType: "quiz_sprint", orderIndex: 1, description: "Спринт" },
        ],
        exercisesByNodeId: { p1: [] },
      }),
    ]);
    expect(result).toEqual({ ok: true });
  });
});
