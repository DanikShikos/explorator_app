import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AI_PROMPT_CLIP, clipAiPromptText } from "../../../../lib/ai/prompt-clip";

/**
 * Mirrors `requestSchema` in `src/app/api/quiz/generate/route.ts`.
 * Kept in sync for LLM edge tests — route does not export the schema.
 */
const quizGenerateRequestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(8).max(AI_PROMPT_CLIP.bookSummaryChapter),
});

describe("quiz generate requestSchema — context overflow", () => {
  it("rejects note content beyond bookSummaryChapter cap", () => {
    const huge = "a".repeat(200_000);
    const parsed = quizGenerateRequestSchema.safeParse({
      title: "Note",
      content: huge,
    });
    expect(parsed.success).toBe(false);
  });

  it("clips accepted content with the same helper as the book path", () => {
    const atCap = "b".repeat(AI_PROMPT_CLIP.bookSummaryChapter);
    const parsed = quizGenerateRequestSchema.safeParse({
      title: "Note",
      content: atCap,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const clipped = clipAiPromptText(parsed.data.content, AI_PROMPT_CLIP.bookSummaryChapter);
      expect(clipped.length).toBeLessThanOrEqual(AI_PROMPT_CLIP.bookSummaryChapter + 1);
    }
  });

  it("rejects too-short content without throwing", () => {
    expect(quizGenerateRequestSchema.safeParse({ title: "N", content: "short" }).success).toBe(false);
    expect(quizGenerateRequestSchema.safeParse({ title: "", content: "enough text here" }).success).toBe(
      false,
    );
  });
});

describe("quiz generate route — auth + rate limit (source contract)", () => {
  const src = readFileSync(join(process.cwd(), "src/app/api/quiz/generate/route.ts"), "utf8");

  it("rejects unauthenticated callers with 401 before AI", () => {
    expect(src).toContain("getOptionalUser");
    expect(src).toMatch(/if\s*\(\s*!user\s*\)/);
    expect(src).toMatch(/status:\s*401/);
    expect(src).toContain("Нужен вход");
    const post = src.slice(src.indexOf("export async function POST"));
    expect(post.indexOf("getOptionalUser")).toBeLessThan(post.indexOf("generateObjectWithCredits"));
  });

  it("enforces consumeRateLimit and returns 429 when over quota", () => {
    expect(src).toContain("consumeRateLimit");
    expect(src).toContain("QUIZ_GENERATION_LIMIT");
    expect(src).toMatch(/status:\s*limit\.status/);
    expect(src).toContain("Retry-After");
    const post = src.slice(src.indexOf("export async function POST"));
    expect(post.indexOf("consumeRateLimit")).toBeLessThan(post.indexOf("generateObjectWithCredits"));
  });

  it("keeps content cap and null-sanitize fail path", () => {
    expect(src).toContain("AI_PROMPT_CLIP.bookSummaryChapter");
    expect(src).toContain("clipAiPromptText");
    expect(src).toContain("sanitizeGeneratedQuiz");
    expect(src).toMatch(/if\s*\(\s*!cleanQuiz\s*\)/);
  });
});
