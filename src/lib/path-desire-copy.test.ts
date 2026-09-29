import { describe, expect, it } from "vitest";
import {
  PATH_DESIRE,
  PATH_DESIRE_COPY,
  PATH_DESIRE_ZERO_HEARTS_DETAIL,
  pathDesirePathLines,
  pathDesirePhrase,
} from "./path-desire-copy";

describe("path-desire-copy (FE-011)", () => {
  it("exposes one fixed set for promise / empty / current / zero hearts", () => {
    expect(pathDesirePhrase("promise")).toBe("Дочитай книгу короткими шагами.");
    expect(pathDesirePhrase("emptyPath")).toBe(
      "Кот ждёт первую главу. Собери тропу — и шаги появятся.",
    );
    expect(pathDesirePhrase("currentStep")).toBe("Ты здесь. Один шаг — и день засчитан.");
    expect(pathDesirePhrase("zeroHearts")).toBe("Жизни кончились — отдыхаем");
    expect(PATH_DESIRE_ZERO_HEARTS_DETAIL).toContain("Покупки нет");
  });

  it("PATH_DESIRE mirrors the same four formulations on UI surfaces", () => {
    expect(PATH_DESIRE.promise).toBe(PATH_DESIRE_COPY.promise);
    expect(PATH_DESIRE.emptyPath).toBe(PATH_DESIRE_COPY.emptyPath);
    expect(PATH_DESIRE.currentStep("Закрепление")).toBe(PATH_DESIRE_COPY.currentStep);
    expect(PATH_DESIRE.currentStep(null)).toBe(PATH_DESIRE_COPY.currentStep);
    expect(PATH_DESIRE.outOfHearts.title).toBe(PATH_DESIRE_COPY.zeroHearts);
    expect(PATH_DESIRE.outOfHearts.description).toBe(PATH_DESIRE_ZERO_HEARTS_DETAIL);
  });

  it("path lines include current-step only when a step is available", () => {
    expect(pathDesirePathLines(true)).toEqual({
      promise: PATH_DESIRE_COPY.promise,
      currentStep: PATH_DESIRE_COPY.currentStep,
    });
    expect(pathDesirePathLines(false)).toEqual({
      promise: PATH_DESIRE_COPY.promise,
      currentStep: null,
    });
  });

  it("keeps the four surface keys stable for landing reuse", () => {
    expect(Object.keys(PATH_DESIRE_COPY).sort()).toEqual(
      ["currentStep", "emptyPath", "promise", "zeroHearts"].sort(),
    );
  });
});
