"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { bookChapters, books, lessonNodes, quizCards, userNodeProgress, usersStats } from "@/db/schema";
import { ensureFullLearningPath } from "@/lib/ai/book-processor";
import { earnHeartFromPractice } from "@/lib/hearts-store";
import { getCurrentUserId } from "@/lib/current-user";
import { levelForXp } from "@/lib/gamification";

export async function buildLearningPath(bookId: string) {
  const result = await ensureFullLearningPath(bookId);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/books");
  return result;
}

export async function registerMiss(cardId: string) {
  const userId = await getCurrentUserId();
  await getDb()
    .update(quizCards)
    .set({ lapses: sql`${quizCards.lapses} + 1` })
    .where(and(eq(quizCards.id, cardId), eq(quizCards.userId, userId)));
  return { ok: true as const };
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
