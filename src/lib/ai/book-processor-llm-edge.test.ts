import { describe, expect, it } from "vitest";
import { bookSummarySchema, recallQuizSchema } from "./book-ai-schemas";
import { AI_PROMPT_CLIP, clipAiPromptText } from "./prompt-clip";

const BROKEN_SUMMARY_FIXTURES = {
  empty: "",
  midObject: '{"executiveSummary":"Главная идея","practicalRules":["a","b","c"],"chapters":[{"chapterIndex":0',
  markdownFences: '```json\n{"executiveSummary":"x","practicalRules":["a","b","c"],"chapters":[]}\n```',
  trailingComma:
    '{"executiveSummary":"Идея","practicalRules":["a","b","c",],"chapters":[{"chapterIndex":0,"contentSummary":"Суть"},]}',
};

function tryParseFixture(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

describe("bookSummarySchema / recallQuizSchema — truncated JSON fixtures", () => {
  it("rejects broken summary JSON without throwing", () => {
    for (const raw of Object.values(BROKEN_SUMMARY_FIXTURES)) {
      const parsed = tryParseFixture(raw);
      if (!parsed.ok) {
        expect(bookSummarySchema.safeParse(null).success).toBe(false);
        continue;
      }
      expect(bookSummarySchema.safeParse(parsed.value).success).toBe(false);
    }
  });

  it("rejects empty / wrong-type recall quizzes without throwing", () => {
    expect(recallQuizSchema.safeParse({ title: "T", questions: [] }).success).toBe(false);
    expect(
      recallQuizSchema.safeParse({
        title: "T",
        questions: [
          {
            question: "Q?",
            options: ["a", "b", "c"],
            correctAnswerIndex: 0,
            explanation: "e",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      recallQuizSchema.safeParse({
        title: "T",
        questions: [
          {
            question: "Q?",
            options: ["a", "b", "c", "d"],
            correctAnswerIndex: 9,
            explanation: "e",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("strips extra hallucinated fields on a valid summary shape", () => {
    const raw = {
      executiveSummary: "Главная идея книги про эксперименты.",
      practicalRules: ["Правило один", "Правило два", "Правило три"],
      chapters: [{ chapterIndex: 0, contentSummary: "Суть главы про метрики.", bonus: "ignore me" }],
      narrator: "GPT",
    };
    const parsed = bookSummarySchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("narrator");
      expect(parsed.data.chapters[0]).not.toHaveProperty("bonus");
    }
  });
});

describe("clipAiPromptText — context overflow (real caps)", () => {
  it("truncates chapter text beyond bookSummaryChapter (3500) without throwing", () => {
    const huge = `${"Глава про инновации. ".repeat(500)}\0`;
    expect(huge.length).toBeGreaterThan(AI_PROMPT_CLIP.bookSummaryChapter);
    let clipped = "";
    expect(() => {
      clipped = clipAiPromptText(huge, AI_PROMPT_CLIP.bookSummaryChapter);
    }).not.toThrow();
    expect(clipped.endsWith("…")).toBe(true);
    expect(clipped.length).toBe(AI_PROMPT_CLIP.bookSummaryChapter + 1);
    expect(clipped.includes("\0")).toBe(false);
  });

  it("truncates path-generation context beyond pathChapter (2500) without throwing", () => {
    const huge = "x".repeat(AI_PROMPT_CLIP.pathChapter + 10_000);
    const clipped = clipAiPromptText(huge, AI_PROMPT_CLIP.pathChapter);
    expect(clipped.length).toBe(AI_PROMPT_CLIP.pathChapter + 1);
  });

  it("documents chapter count cap used by sourceBlock", () => {
    expect(AI_PROMPT_CLIP.maxChaptersInSourceBlock).toBe(12);
  });
});
