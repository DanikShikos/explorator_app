import { describe, expect, it } from "vitest";
import { theoryDescriptionFromSubstance, theorySubstanceSource } from "./theory-substance";

describe("theorySubstanceSource", () => {
  it("prefers long chapter body over a short abstract summary", () => {
    const summary = "Краткий обзор инноваций и параметров развития.";
    const content = [
      "Шумпетер описал волны инновационных циклов длиной около пятидесяти лет.",
      "Каждая волна приносит новые технологии и меняет структуру отраслей.",
      "Государственная стратегия должна поддерживать длинные циклы инвестиций.",
    ].join(" ");
    expect(theorySubstanceSource("Глава", summary, content)).toBe(content);
  });

  it("keeps summary when body cannot yield a richer extract", () => {
    const summary =
      "Введение в концепции и теории инновационного развития, включая установки и параметры для понимания инновационных процессов.";
    const content = "Коротко.";
    expect(theorySubstanceSource("Глава", summary, content)).toBe(summary);
  });
});

describe("theoryDescriptionFromSubstance", () => {
  it("builds multi-card theory from body sentences", () => {
    const content = [
      "Гипотеза проверяется коротким экспериментом на реальных данных.",
      "Метрика показывает прогресс команды, а не только активность.",
      "Правило простое: сначала суть, потом проверка упражнениями.",
    ].join(" ");
    const description = theoryDescriptionFromSubstance("Суть", "Абстракт короче тела главы.", content);
    expect(description.length).toBeGreaterThan(80);
    expect(description.includes("\n\n") || description.length > 100).toBe(true);
  });
});
