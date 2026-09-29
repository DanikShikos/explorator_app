import { describe, expect, it } from "vitest";
import { createEmptyCard, State } from "ts-fsrs";
import { Rating, scheduleLessonAnswer, scheduleReview } from "./fsrs";

describe("scheduleLessonAnswer", () => {
  const now = new Date("2026-09-29T16:50:00.000Z");

  it("schedules a correct answer as Good (due moves forward, reps increase)", () => {
    const card = createEmptyCard(now);
    const next = scheduleLessonAnswer(card, true, now).card;

    expect(next.reps).toBe(card.reps + 1);
    expect(next.due.getTime()).toBeGreaterThan(now.getTime());
    expect(next.last_review?.getTime()).toBe(now.getTime());
  });

  it("schedules a wrong answer as Again (lapses on a review card)", () => {
    const start = createEmptyCard(now);
    // Graduate into Review so Again counts as a lapse.
    let card = scheduleReview(start, Rating.Good, now).card;
    card = scheduleReview(card, Rating.Good, new Date(now.getTime() + 86_400_000)).card;
    expect(card.state).toBe(State.Review);

    const later = new Date(card.due.getTime());
    const afterMiss = scheduleLessonAnswer(card, false, later).card;

    expect(afterMiss.lapses).toBeGreaterThan(card.lapses);
    expect(afterMiss.last_review?.getTime()).toBe(later.getTime());
  });
});
