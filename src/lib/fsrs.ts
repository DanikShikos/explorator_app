import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";
import type { QuizCard } from "@/db/schema";

export const ratingLabels = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;

export type RatingKey = keyof typeof ratingLabels;

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export function newFsrsCard(now = new Date()) {
  return createEmptyCard(now);
}

export function toFsrsCard(row: QuizCard): Card {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.lastReview ?? undefined,
  };
}

export function scheduleReview(card: Card, grade: Grade, now = new Date()) {
  return scheduler.next(card, now, grade);
}

/** Lesson sprint/pairs/boss: correct → Good, wrong → Again (same ratings as note review). */
export function scheduleLessonAnswer(card: Card, correct: boolean, now = new Date()) {
  return scheduleReview(card, correct ? ratingLabels.good : ratingLabels.again, now);
}

export { Rating };
