import { describe, expect, it } from "vitest";
import { answersMatch } from "./answers";

describe("answersMatch", () => {
  it("принимает тот же короткий ответ без учёта регистра и точки", () => {
    expect(answersMatch("FSRS.", "fsrs")).toBe(true);
  });

  it("принимает начало длинного старого ответа", () => {
    expect(answersMatch("интервальное повторение материала", "интервальное")).toBe(true);
  });

  it("отклоняет другой термин", () => {
    expect(answersMatch("стабильность", "сложность")).toBe(false);
  });
});
