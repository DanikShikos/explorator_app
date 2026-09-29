import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { quizCards, userNodeProgress, usersStats } from "@/db/schema";
import { ensureUserStats, getCurrentUserId } from "@/lib/current-user";
import { applyHeartRefill, heartStatus, shouldChargeHeartOnMiss, type HeartStatus } from "@/lib/hearts";
import { removeNullBytes } from "@/lib/utils";

/** BE-005: ok+charged flattened with HeartStatus so FE can setHearts(result). */
export type HeartChargeResult =
  | ({ ok: true; charged: boolean } & HeartStatus)
  | { ok: false; error: string };

async function ownUser(userId: string) {
  const current = await getCurrentUserId();
  if (current !== userId) {
    throw new Error("Чужой аккаунт");
  }
  return current;
}

async function readStats(userId: string) {
  await ensureUserStats(userId);
  const [stats] = await getDb().select().from(usersStats).where(eq(usersStats.userId, userId)).limit(1);
  if (!stats) {
    throw new Error("Не удалось прочитать жизни");
  }
  return stats;
}

/** Per-request dedupe: layout + lesson/book pages share one stats round-trip. */
export const checkAndRegenHearts = cache(async (userId: string): Promise<HeartStatus> => {
  const current = await ownUser(userId);
  const stats = await readStats(current);
  const now = new Date();
  const next = applyHeartRefill(stats.hearts, stats.maxHearts, stats.lastHeartRefillAt, now);
  const changed = next.hearts !== stats.hearts
    || next.lastHeartRefillAt.getTime() !== (stats.lastHeartRefillAt?.getTime() ?? 0);
  if (changed) {
    await getDb()
      .update(usersStats)
      .set({ hearts: next.hearts, lastHeartRefillAt: next.lastHeartRefillAt })
      .where(eq(usersStats.userId, current));
  }
  return heartStatus(next.hearts, stats.maxHearts, next.hearts >= stats.maxHearts ? null : next.lastHeartRefillAt);
});

export async function decrementHeart(userId: string): Promise<HeartStatus> {
  const current = await ownUser(userId);
  const stats = await readStats(current);
  const now = new Date();
  const refilled = applyHeartRefill(stats.hearts, stats.maxHearts, stats.lastHeartRefillAt, now);
  const hearts = Math.max(0, refilled.hearts - 1);
  const lastHeartRefillAt = refilled.hearts >= stats.maxHearts ? now : refilled.lastHeartRefillAt;
  await getDb()
    .update(usersStats)
    .set({ hearts, lastHeartRefillAt })
    .where(eq(usersStats.userId, current));
  return heartStatus(hearts, stats.maxHearts, hearts >= stats.maxHearts ? null : lastHeartRefillAt);
}

/**
 * BE-005 / RFC-003: conditional −1 heart for a miss on this quiz card.
 * Does not schedule FSRS — pair with recordLessonAnswer / applyLessonMiss.
 *
 * charged true  → first-pass node (has nodeId, status not completed/mastered)
 * charged false → no nodeId (due) or completed/mastered replay; hearts unchanged
 */
export async function decrementHeartForMiss(cardId: string): Promise<HeartChargeResult> {
  try {
    const userId = await getCurrentUserId();
    const cleanCardId = removeNullBytes(cardId);
    const [card] = await getDb()
      .select({ id: quizCards.id, nodeId: quizCards.nodeId })
      .from(quizCards)
      .where(and(eq(quizCards.id, cleanCardId), eq(quizCards.userId, userId)))
      .limit(1);

    if (!card) {
      return { ok: false, error: "Карточка не найдена" };
    }

    const status = await checkAndRegenHearts(userId);

    const [progress] = card.nodeId
      ? await getDb()
          .select({ status: userNodeProgress.status })
          .from(userNodeProgress)
          .where(
            and(eq(userNodeProgress.nodeId, card.nodeId), eq(userNodeProgress.userId, userId)),
          )
          .limit(1)
      : [];

    if (!shouldChargeHeartOnMiss(card.nodeId, progress?.status)) {
      return { ok: true, charged: false, ...status };
    }

    const next = await decrementHeart(userId);
    return { ok: true, charged: true, ...next };
  } catch {
    return { ok: false, error: "Не удалось обновить жизни" };
  }
}

/** Alias used by LessonRunner / FE-005. */
export const decrementHeartOnLessonMiss = decrementHeartForMiss;

export async function earnHeartFromPractice(userId: string): Promise<HeartStatus> {
  const current = await ownUser(userId);
  const stats = await readStats(current);
  const now = new Date();
  const refilled = applyHeartRefill(stats.hearts, stats.maxHearts, stats.lastHeartRefillAt, now);
  const hearts = Math.min(stats.maxHearts, refilled.hearts + 1);
  const lastHeartRefillAt = hearts >= stats.maxHearts ? now : refilled.lastHeartRefillAt;
  await getDb()
    .update(usersStats)
    .set({ hearts, lastHeartRefillAt })
    .where(eq(usersStats.userId, current));
  return heartStatus(hearts, stats.maxHearts, hearts >= stats.maxHearts ? null : lastHeartRefillAt);
}
