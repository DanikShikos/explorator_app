import { describe, expect, it } from "vitest";
import { exerciseListSchema, exerciseSchema, parseExercise } from "./exercises";

const validMc = {
  type: "multiple_choice" as const,
  prompt: "Что проверяет гипотезу?",
  options: ["бюджет", "короткий эксперимент", "бренд", "слух"],
  correctIndex: 1,
  pairs: null,
  sentence: null,
  answer: null,
  steps: null,
  explanation: "Из теории главы.",
};

/** Fixture strings that mimic raw LLM text (no live API). */
const BROKEN_JSON_FIXTURES = {
  empty: "",
  midObject:
    '{"exercises":[{"type":"multiple_choice","prompt":"Что?","options":["a","b","c","d"],"correctIndex":0',
  markdownFences: '```json\n{"exercises":[]}\n```',
  trailingComma: '{"exercises":[{"type":"fill_blank","prompt":"x","answer":"y",}],}',
};

function tryParseFixture(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

describe("exerciseListSchema / parseExercise — LLM edge fixtures", () => {
  it("rejects truncated / broken JSON strings without throwing (safeParse path)", () => {
    for (const raw of Object.values(BROKEN_JSON_FIXTURES)) {
      const parsed = tryParseFixture(raw);
      if (!parsed.ok) {
        expect(() => tryParseFixture(raw)).not.toThrow();
        expect(exerciseListSchema.safeParse(undefined).success).toBe(false);
        continue;
      }
      expect(exerciseListSchema.safeParse(parsed.value).success).toBe(false);
    }
  });

  it("rejects empty exercises and wrong types without throwing", () => {
    expect(exerciseListSchema.safeParse({ exercises: [] }).success).toBe(false);
    expect(exerciseListSchema.safeParse({ exercises: [validMc] }).success).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...validMc, type: "true_false", correctIndex: 0 }).success,
    ).toBe(false);
    expect(exerciseSchema.safeParse({ ...validMc, correctIndex: "1" }).success).toBe(false);
    expect(parseExercise({ ...validMc, options: null })).toBeNull();
  });

  it("strips extra hallucinated fields and keeps a valid exercise", () => {
    const withExtras = {
      ...validMc,
      difficulty: "hard",
      sourceChapter: "Глава 99",
      inventedFact: true,
    };
    const parsed = exerciseSchema.safeParse(withExtras);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("difficulty");
      expect(parsed.data).not.toHaveProperty("inventedFact");
    }
  });

  it("rejects MC correctIndex outside 0–3 (answer not in allowed set)", () => {
    expect(exerciseSchema.safeParse({ ...validMc, correctIndex: 4 }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...validMc, correctIndex: -1 }).success).toBe(false);
  });

  it("rejects generic placeholder prompts that omit required type fields", () => {
    const placeholder = {
      type: "fill_blank" as const,
      prompt: "Вставь пропущенное слово",
      options: null,
      correctIndex: null,
      pairs: null,
      sentence: "____ is important",
      answer: null,
      steps: null,
      explanation: "TODO",
    };
    expect(exerciseSchema.safeParse(placeholder).success).toBe(false);
  });
});
