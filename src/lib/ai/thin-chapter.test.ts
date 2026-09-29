import { describe, expect, it } from "vitest";
import {
  THIN_THEORY_FALLBACK,
  buildTheoryCards,
  isThinChapter,
  thinInterestBlurb,
} from "./thin-chapter";

describe("isThinChapter", () => {
  it("считает короткое содержание тонкой главой и не подставляет заголовок", () => {
    expect(isThinChapter("", "Мало текста.")).toBe(true);
    expect(isThinChapter("", "")).toBe(true);
  });

  it("не считает длинную выжимку тонкой", () => {
    const summary =
      "Инновация меняет способ работы предприятия. Нужны гипотеза, короткий эксперимент и метрика результата, иначе команда путает активность с прогрессом.";
    expect(summary.replace(/\s+/g, " ").trim().length).toBeGreaterThanOrEqual(80);
    expect(isThinChapter(summary, "")).toBe(false);
  });

  it("игнорирует заголовок: substance = contentSummary || content", () => {
    expect(isThinChapter("", "")).toBe(true);
    expect(
      isThinChapter(
        "",
        "Краткий абзац короче порога в восемьдесят символов.",
      ),
    ).toBe(true);
  });

  it("узнаёт пустой fallback теории", () => {
    expect(THIN_THEORY_FALLBACK.startsWith("Пока нет краткой выжимки")).toBe(true);
    expect(buildTheoryCards("")).toEqual([THIN_THEORY_FALLBACK]);
  });
});

describe("thinInterestBlurb", () => {
  it("берёт короткий кусок substance, иначе шаблон с названием главы", () => {
    expect(thinInterestBlurb("Глава 1", "", "Достаточно текста для блиба.")).toContain("Достаточно текста");
    expect(thinInterestBlurb("Введение", "", "x")).toContain("Введение");
  });
});
