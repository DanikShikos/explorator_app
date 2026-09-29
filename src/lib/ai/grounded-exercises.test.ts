import { describe, expect, it } from "vitest";
import { filterGroundedExercises } from "./grounding";
import { buildGroundedExercisesFromTheory, theoryCanGroundPractice } from "./grounded-exercises";

const richTheory = [
  "Гипотеза проверяется коротким экспериментом на реальных данных команды.",
  "Метрика показывает прогресс обучения, а не только активность участников.",
  "Правило простое: сначала читаешь суть главы, потом решаешь упражнения.",
].join(" ");

describe("buildGroundedExercisesFromTheory", () => {
  it("returns [] for thin theory instead of inventing facts", () => {
    expect(theoryCanGroundPractice("Коротко.")).toBe(false);
    expect(buildGroundedExercisesFromTheory("Коротко.")).toEqual([]);
  });

  it("builds only exercises that pass filterGroundedExercises", () => {
    const exercises = buildGroundedExercisesFromTheory(richTheory);
    expect(exercises.length).toBeGreaterThanOrEqual(3);
    expect(filterGroundedExercises(exercises, richTheory)).toEqual(exercises);
  });
});
