import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chapterHasPracticeAhead,
  learningPathStepCount,
  shouldShowPracticeEmptyNotice,
  theoryCompleteCopy,
} from "./theory-practice-ui";

describe("FE-004 theory-only / empty practice UI", () => {
  it("theory-only complete copy has no «дальше практика» CTA", () => {
    const copy = theoryCompleteCopy(false, 15);
    expect(copy.headline).toBe("Готово");
    expect(copy.body).toBe("+15 очков. Вернись на тропу.");
    expect(copy.body).not.toMatch(/практик/i);
    expect(copy.body).not.toMatch(/Дальше/i);
  });

  it("chapter with practice ahead keeps practice CTA copy", () => {
    const copy = theoryCompleteCopy(true, 15);
    expect(copy.headline).toBe("Отлично! Теория засчитана");
    expect(copy.body).toContain("Дальше — практика на тропе");
  });

  it("chapterHasPracticeAhead is false for thin chapter (only summary_read)", () => {
    const thin = [
      { chapterTitle: "Введение", nodeType: "summary_read" },
    ];
    expect(chapterHasPracticeAhead(thin, "Введение")).toBe(false);

    const full = [
      { chapterTitle: "Введение", nodeType: "summary_read" },
      { chapterTitle: "Введение", nodeType: "quiz_sprint" },
      { chapterTitle: "Введение", nodeType: "flashcard_review" },
      { chapterTitle: "Введение", nodeType: "boss_challenge" },
    ];
    expect(chapterHasPracticeAhead(full, "Введение")).toBe(true);
    expect(chapterHasPracticeAhead(full, "Другая глава")).toBe(false);
  });

  it("empty practice cards → show practice-empty-notice (skip hearts gate)", () => {
    expect(shouldShowPracticeEmptyNotice(0)).toBe(true);
    expect(shouldShowPracticeEmptyNotice(3)).toBe(false);
  });

  it("learning path step count equals Backend nodes (thin = 1, no padding)", () => {
    const thinNodes = [{ id: "n1", nodeType: "summary_read" }];
    expect(learningPathStepCount(thinNodes)).toBe(1);
    expect(learningPathStepCount([])).toBe(0);
    expect(learningPathStepCount([{}, {}, {}, {}])).toBe(4);
  });

  it("required FE-004 data-testid are present in source", () => {
    const root = join(process.cwd(), "src");
    const theoryLesson = readFileSync(join(root, "components/lesson/TheoryLesson.tsx"), "utf8");
    const lessonPage = readFileSync(
      join(root, "app/books/[id]/lesson/[nodeId]/page.tsx"),
      "utf8",
    );
    const lessonRunner = readFileSync(join(root, "components/lesson/LessonRunner.tsx"), "utf8");
    const learningPath = readFileSync(join(root, "components/book/LearningPath.tsx"), "utf8");
    const pathNotice = readFileSync(join(root, "components/book/PathNotice.tsx"), "utf8");

    expect(theoryLesson).toContain('data-testid="theory-complete-message"');
    expect(theoryLesson).toContain('data-testid="save-theory-button"');
    expect(theoryLesson).toContain('data-testid="definition-highlight"');
    expect(theoryLesson).toContain('data-testid="save-definition-button"');
    expect(theoryLesson).toContain("saveTheoryMoment");
    expect(theoryLesson).toContain("saveDefinition");
    expect(lessonPage).toContain('data-testid="practice-empty-notice"');
    expect(lessonRunner).toContain('data-testid="practice-empty-notice"');
    expect(learningPath).toContain('data-testid="learning-path"');
    expect(pathNotice).toContain('data-testid="path-notice"');
  });
});

describe("FE-012 notes list / Word export testids", () => {
  it("notes page has list, Word export, definition label, and empty PathNotice copy", () => {
    const notesPage = readFileSync(
      join(process.cwd(), "src/app/notes/page.tsx"),
      "utf8",
    );
    expect(notesPage).toContain('data-testid="notes-list"');
    expect(notesPage).toContain('data-testid="notes-export-word"');
    expect(notesPage).toContain("/api/notes/export");
    expect(notesPage).toContain("Определение");
    expect(notesPage).toContain(
      "Пока нет сохранённых моментов — сохрани карточку или определение на теории",
    );
  });
});
