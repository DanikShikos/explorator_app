/**
 * FE-004 UI branches for theory-only chapters and empty practice cards.
 * Pure helpers so DoD copy/empty gates can be unit-tested without RTL.
 */

export type PathNodeLike = {
  chapterTitle: string;
  nodeType: string;
};

/** True when the chapter has any non-theory node (sprint / pairs / boss). */
export function chapterHasPracticeAhead(path: PathNodeLike[], chapterTitle: string) {
  return path.some(
    (node) => node.chapterTitle === chapterTitle && node.nodeType !== "summary_read",
  );
}

/** Final TheoryLesson copy after «Понятно» — theory-only must not promise practice. */
export function theoryCompleteCopy(hasPracticeAhead: boolean, xpReward: number) {
  if (hasPracticeAhead) {
    return {
      headline: "Отлично! Теория засчитана",
      body: `+${xpReward} очков. Дальше — практика на тропе.`,
    };
  }
  return {
    headline: "Готово",
    body: `+${xpReward} очков. Вернись на тропу.`,
  };
}

/** BE-003/FE-004: empty grounded practice → show notice, skip hearts gate / runner. */
export function shouldShowPracticeEmptyNotice(cardsLength: number) {
  return cardsLength === 0;
}

/** LearningPath renders Backend nodes 1:1 — no invented practice steps. */
export function learningPathStepCount(nodes: unknown[]) {
  return nodes.length;
}
