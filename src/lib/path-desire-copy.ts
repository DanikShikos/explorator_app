/**
 * FE-011 — one desire-copy set for book path surfaces.
 * Same strings on path / empty / zero-hearts so landing can reuse later.
 * Draft source: `.cursor/tasks/marketing-growth.md` «Набор фраз желания».
 */
export const PATH_DESIRE_COPY = {
  /** Product promise on the path. */
  promise: "Дочитай книгу короткими шагами.",
  /** Empty or not-ready path (no nodes yet). */
  emptyPath: "Кот ждёт первую главу. Собери тропу — и шаги появятся.",
  /** Cue for the current / next step. */
  currentStep: "Ты здесь. Один шаг — и день засчитан.",
  /** Out-of-hearts title (book context). */
  zeroHearts: "Жизни кончились — отдыхаем",
} as const;

/** Supporting detail for the zero-hearts slot (same set, not a fifth surface). */
export const PATH_DESIRE_ZERO_HEARTS_DETAIL =
  "Практика вернёт одну — или подожди около 4 часов. Покупки нет.";

export type PathDesireSurface = keyof typeof PATH_DESIRE_COPY;

export function pathDesirePhrase(surface: PathDesireSurface): string {
  return PATH_DESIRE_COPY[surface];
}

/**
 * Convenience API for UI surfaces — always the same four formulations.
 * `currentStep(nextTitle)` ignores the title so wording stays one set.
 */
export const PATH_DESIRE = {
  promise: PATH_DESIRE_COPY.promise,
  emptyPath: PATH_DESIRE_COPY.emptyPath,
  currentStep: (_nextTitle?: string | null) => PATH_DESIRE_COPY.currentStep,
  outOfHearts: {
    title: PATH_DESIRE_COPY.zeroHearts,
    description: PATH_DESIRE_ZERO_HEARTS_DETAIL,
  },
} as const;

/** Path header: promise always; current-step line when a step is in play. */
export function pathDesirePathLines(hasCurrentStep: boolean): {
  promise: string;
  currentStep: string | null;
} {
  return {
    promise: PATH_DESIRE_COPY.promise,
    currentStep: hasCurrentStep ? PATH_DESIRE_COPY.currentStep : null,
  };
}
