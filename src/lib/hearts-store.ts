import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usersStats } from "@/db/schema";
import { ensureUserStats, getCurrentUserId } from "@/lib/current-user";
import { applyHeartRefill, heartStatus, type HeartStatus } from "@/lib/hearts";

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

export async function checkAndRegenHearts(userId: string): Promise<HeartStatus> {
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
}

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
