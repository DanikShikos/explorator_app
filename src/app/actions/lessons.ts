"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { bookChapters, books, lessonNodes, quizCards, reviewLogs, userNodeProgress, usersStats } from "@/db/schema";
import { ensureFullLearningPath } from "@/lib/ai/book-processor";
import { decrementHeartForMiss, earnHeartFromPractice, type HeartChargeResult } from "@/lib/hearts-store";
import { getCurrentUserId } from "@/lib/current-user";
import { ratingLabels, scheduleReview, toFsrsCard } from "@/lib/fsrs";
import { levelForXp } from "@/lib/gamification";
import { BOOK_AI_LIMIT, consumeRateLimit } from "@/lib/security/rate-limit";
import { removeNullBytes } from "@/lib/utils";

export async function buildLearningPath(bookId: string) {
  const userId = await getCurrentUserId();
  const limit = await consumeRateLimit(
    "book-ai",
    userId,
    BOOK_AI_LIMIT.limit,
    BOOK_AI_LIMIT.windowSec,
  );
  if (!limit.ok) {
    return { ok: false as const, error: limit.error };
  }

  const result = await ensureFullLearningPath(bookId);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/books");
  return result;
}

/**
 * BE-002: schedule a lesson quiz_card after an answer.
 * correct true → Rating.Good; false → Rating.Again (same as rateCard / scheduleReview).
 * Does not touch user_node_progress / completeLessonNode unlock.
 */
export async function recordLessonAnswer(
  cardId: string,
  correct: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanCardId = removeNullBytes(cardId);
  try {
    const userId = await getCurrentUserId();
    const [card] = await getDb()
      .select()
      .from(quizCards)
      .where(and(eq(quizCards.id, cleanCardId), eq(quizCards.userId, userId)))
      .limit(1);

    if (!card) {
      return { ok: false, error: "Карточка не найдена" };
    }

    const now = new Date();
    const rating = correct ? ratingLabels.good : ratingLabels.again;
    const result = scheduleReview(toFsrsCard(card), rating, now);
    const next = result.card;

    await getDb()
      .update(quizCards)
      .set({
        due: next.due,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsed_days,
        scheduledDays: next.scheduled_days,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        lastReview: next.last_review ?? now,
      })
      .where(eq(quizCards.id, cleanCardId));

    await getDb().insert(reviewLogs).values({
      cardId: cleanCardId,
      userId,
      rating,
      state: next.state,
      reviewedAt: now,
    });

    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось сохранить ответ" };
  }
}

/** Thin wrapper → recordLessonAnswer(id, false). Hearts unchanged. */
export async function registerMiss(cardId: string) {
  return recordLessonAnswer(cardId, false);
}

/** Thin wrapper → recordLessonAnswer(id, true). */
export async function registerCorrect(cardId: string) {
  return recordLessonAnswer(cardId, true);
}

export type ApplyLessonMissResult = HeartChargeResult;

/**
 * BE-005 / RFC-003: lesson miss in one call.
 * Always writes FSRS Again; spends a heart only on first-pass nodes.
 *
 * charged true  — heart was decremented (−1)
 * charged false — due (no nodeId) or completed/mastered replay; only due/FSRS moved
 */
export async function applyLessonMiss(cardId: string): Promise<ApplyLessonMissResult> {
  const scheduled = await recordLessonAnswer(cardId, false);
  if (!scheduled.ok) {
    return scheduled;
  }
  return decrementHeartForMiss(cardId);
}

export async function completeLessonNode(nodeId: string, score: number) {
  const userId = await getCurrentUserId();
  const db = getDb();
  const [node] = await db.select().from(lessonNodes).where(eq(lessonNodes.id, nodeId)).limit(1);
  if (!node) {
    return { ok: false as const, error: "Урок не найден" };
  }

  const [owned] = await db
    .select({ bookId: books.id })
    .from(bookChapters)
    .innerJoin(books, eq(books.id, bookChapters.bookId))
    .where(and(eq(bookChapters.id, node.chapterId), eq(books.userId, userId)))
    .limit(1);
  if (!owned) {
    return { ok: false as const, error: "Урок не найден" };
  }

  const [progress] = await db
    .select()
    .from(userNodeProgress)
    .where(and(eq(userNodeProgress.nodeId, nodeId), eq(userNodeProgress.userId, userId)))
    .limit(1);
  if (!progress || progress.status === "locked") {
    return { ok: false as const, error: "Этот урок ещё закрыт" };
  }

  const status =
    score >= 100 || progress.status === "mastered" ? ("mastered" as const) : ("completed" as const);
  const alreadyDone = progress.status === "completed" || progress.status === "mastered";
  await db
    .update(userNodeProgress)
    .set({ status, score, completedAt: new Date() })
    .where(eq(userNodeProgress.id, progress.id));

  if (!alreadyDone) {
    const [stats] = await db.select().from(usersStats).where(eq(usersStats.userId, userId)).limit(1);
    if (stats) {
      const xp = stats.xp + node.xpReward;
      await db.update(usersStats).set({ xp, level: levelForXp(xp) }).where(eq(usersStats.userId, userId));
    }
    await unlockNextNode(userId, node.chapterId, node.orderIndex);
  }

  revalidatePath(`/books/${owned.bookId}`);
  return { ok: true as const, xpReward: alreadyDone ? 0 : node.xpReward };
}

async function unlockNextNode(userId: string, chapterId: string, orderIndex: number) {
  const db = getDb();
  const [nextInChapter] = await db
    .select()
    .from(lessonNodes)
    .where(and(eq(lessonNodes.chapterId, chapterId), eq(lessonNodes.orderIndex, orderIndex + 1)))
    .limit(1);
  const next = nextInChapter ?? await firstNodeOfNextChapter(chapterId);
  if (!next) {
    return;
  }
  await db
    .update(userNodeProgress)
    .set({ status: "available" })
    .where(and(
      eq(userNodeProgress.userId, userId),
      eq(userNodeProgress.nodeId, next.id),
      eq(userNodeProgress.status, "locked"),
    ));
}

async function firstNodeOfNextChapter(chapterId: string) {
  const db = getDb();
  const [chapter] = await db.select().from(bookChapters).where(eq(bookChapters.id, chapterId)).limit(1);
  if (!chapter) {
    return null;
  }
  const [nextChapter] = await db
    .select()
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, chapter.bookId), eq(bookChapters.chapterIndex, chapter.chapterIndex + 1)))
    .limit(1);
  if (!nextChapter) {
    return null;
  }
  const [first] = await db
    .select()
    .from(lessonNodes)
    .where(and(eq(lessonNodes.chapterId, nextChapter.id), eq(lessonNodes.orderIndex, 0)))
    .limit(1);
  return first ?? null;
}

export async function finishPractice() {
  const userId = await getCurrentUserId();
  const hearts = await earnHeartFromPractice(userId);
  revalidatePath("/");
  return { ok: true as const, hearts };
}
