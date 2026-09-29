# QA — LLM edge cases (book / quiz generation)

**Lane:** QA × AI Prompt Engineer  
**Scope:** Truncated JSON, hallucinated output, context overflow  
**Live LLM:** not called — fixture strings + Zod / clip parsers only  
**Overall goal:** not marked complete

## Cases covered

| # | Case | Result |
|---|------|--------|
| 1 | Truncated / broken JSON (mid-object, markdown fences, trailing commas, empty) | **Safe** — `safeParse` rejects; broken strings fail `JSON.parse` in fixtures without crashing product parsers |
| 2 | Hallucinated output (extra fields, wrong types, empty exercises, placeholders) | **Safe** — **BUG-L01 Fixed** — MC `answer` must be in `options` |
| 3 | Context overflow beyond processor caps | **Safe** — book path + quiz/note LLM use `clipAiPromptText` / `AI_PROMPT_CLIP.bookSummaryChapter`; **BUG-L02 Fixed**, **BUG-L03 Fixed** |

## Tests added / extended (all passing)

| File | Tests |
|------|------:|
| `src/lib/quiz-schema.test.ts` | 11 |
| `src/lib/exercises.test.ts` | 5 (new) |
| `src/lib/ai/book-processor-llm-edge.test.ts` | 6 (new) |
| `src/lib/ai/grounding.test.ts` | 4 |
| `src/app/api/quiz/generate/route.test.ts` | 3 |

**Vitest run (touched files):** 5 files, **29 passed**, 0 failed.

```
npx vitest run src/lib/quiz-schema.test.ts src/lib/exercises.test.ts \
  src/lib/ai/book-processor-llm-edge.test.ts src/lib/ai/grounding.test.ts \
  src/app/api/quiz/generate/route.test.ts
```

## Real caps (book processor)

- `AI_PROMPT_CLIP.bookSummaryChapter` = **3500** chars (`sourceBlock` / `summarizeBook`); also used for quiz generate / note→quiz prompts
- `AI_PROMPT_CLIP.pathChapter` = **2500** chars (learning-path AI prompt)
- `AI_PROMPT_CLIP.maxChaptersInSourceBlock` = **12**
- Implemented in `src/lib/ai/prompt-clip.ts`; used from `book-processor.ts`, quiz generate route, `generateQuestionsForNote`

## Confirmed defects

### **[BUG-L01] Quiz schema accepts multiple_choice answer not in options** — **Fixed** (2026-09-29)

- **Назначен на:** Backend
- **Исправление:** `quizQuestionSchema.superRefine` requires `answer ∈ options` for `multiple_choice`; sanitize drops items that fail after null-byte strip.
- **Файлы:** `src/lib/quiz-schema.ts`, `src/lib/quiz-schema.test.ts`

### **[BUG-L02] Quiz generate request sends unbounded note content to the LLM** — **Fixed** (2026-09-29)

- **Назначен на:** Backend
- **Исправление:** request `content` max = `AI_PROMPT_CLIP.bookSummaryChapter` (3500); prompt uses `clipAiPromptText` in route and `generateQuestionsForNote` (replaces `slice(0, 24_000)`).
- **Файлы:** `src/app/api/quiz/generate/route.ts`, `src/app/actions/quiz.ts`, `src/app/api/quiz/generate/route.test.ts`

### **[BUG-L03] sanitizeGeneratedQuiz throws when null-byte-only text collapses to empty** — **Fixed** (2026-09-29)

- **Назначен на:** Backend
- **Исправление:** `sanitizeGeneratedQuiz` uses `safeParse`, returns `null` (never throws); note action keeps sanitize inside try/catch and handles `null`.
- **Файлы:** `src/lib/quiz-schema.ts`, `src/app/actions/quiz.ts`, `src/app/api/quiz/generate/route.ts`

## Safe behaviors documented (no bug)

- Broken JSON fixtures → product schemas use `safeParse` / structured `generateObject`; no raw `JSON.parse` in product LLM path.
- Empty exercise lists, wrong types, out-of-range `correctIndex` → rejected by `exerciseListSchema` / `exerciseSchema`.
- Extra hallucinated fields → stripped by Zod.
- Placeholder answers ignoring chapter → dropped by `filterGroundedExercises`.
- Oversized chapter text on book summarize / path AI → truncated by `clipAiPromptText`, does not throw.

## Code touch for testability (not a redesign)

- Extracted `clipAiPromptText` + `AI_PROMPT_CLIP` → `src/lib/ai/prompt-clip.ts`
- Extracted `bookSummarySchema` / `recallQuizSchema` → `src/lib/ai/book-ai-schemas.ts`
- Re-exported from `book-processor.ts` (call sites unchanged)
- `exercises.ts`: `@/lib/answers` → `./answers` so Vitest can load the module
