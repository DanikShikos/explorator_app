import { describe, expect, it } from "vitest";
import type { Exercise } from "../exercises";
import { filterGroundedExercises } from "./grounding";

const theory =
  "Гипотеза проверяется коротким экспериментом. Метрика показывает прогресс, а не активность команды.";

function mc(prompt: string, options: [string, string, string, string], correctIndex: number): Exercise {
  return {
    type: "multiple_choice",
    prompt,
    options,
    correctIndex,
    pairs: null,
    sentence: null,
    answer: null,
    steps: null,
    explanation: "из теории",
  };
}

describe("filterGroundedExercises (BE-003 contract)", () => {
  it("keeps answers that appear in theory and drops invented facts", () => {
    const grounded = mc("Что проверяет гипотезу?", ["метрика", "коротким экспериментом", "бюджет", "бренд"], 1);
    const ungrounded = mc("Кто виноват?", ["менеджер", "директор", "аудитор", "клиент"], 0);
    expect(filterGroundedExercises([grounded, ungrounded], theory)).toEqual([grounded]);
  });

  it("returns [] when theory is empty — empty cards path, no throw", () => {
    const grounded = mc("Что?", ["метрика", "x", "y", "z"], 0);
    expect(filterGroundedExercises([grounded], "   ")).toEqual([]);
  });

  it("requires every matching-pair endpoint to sit in theory", () => {
    const ok: Exercise = {
      type: "matching_pairs",
      prompt: "Свяжи",
      options: null,
      correctIndex: null,
      pairs: [
        { left: "Гипотеза", right: "экспериментом" },
        { left: "Метрика", right: "прогресс" },
        { left: "активность", right: "команды" },
      ],
      sentence: null,
      answer: null,
      steps: null,
      explanation: "пары из теории",
    };
    const bad: Exercise = {
      ...ok,
      pairs: [
        { left: "Гипотеза", right: "экспериментом" },
        { left: "Метрика", right: "прогресс" },
        { left: "активность", right: "маркетинг" },
      ],
    };
    expect(filterGroundedExercises([ok, bad], theory)).toEqual([ok]);
  });
});
