import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { removeNullBytes } from "@/lib/utils";
import {
  achievements,
  notes,
  quizAttempts,
  userAchievements,
  usersStats,
} from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

function isMissingGamificationTable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const message = error instanceof Error ? error.message : "";
  const cause = "cause" in error ? error.cause : undefined;
  return message.includes("does not exist") || isMissingGamificationTable(cause);
}

export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

function dayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetween(from: Date, to: Date) {
  return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / DAY_MS);
}

async function ensureStats(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], userId: string) {
  await tx.insert(usersStats).values({ userId }).onConflictDoNothing({ target: usersStats.userId });
  const [stats] = await tx.select().from(usersStats).where(eq(usersStats.userId, userId)).limit(1);
  if (!stats) {
    throw new Error("Не удалось создать статистику пользователя");
  }
  return stats;
}

async function applyActivity(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  userId: string,
  baseXp: number,
  achievementCodes: string[],
) {
  const now = new Date();
  const stats = await ensureStats(tx, userId);
  const wasActiveToday = stats.lastActiveAt ? daysBetween(stats.lastActiveAt, now) === 0 : false;
  const continuesStreak = stats.lastActiveAt ? daysBetween(stats.lastActiveAt, now) === 1 : false;
  const streakCount = wasActiveToday ? stats.streakCount : continuesStreak ? stats.streakCount + 1 : 1;
  const streakBonus = !wasActiveToday ? 20 : 0;
  const activityXp = baseXp + streakBonus;
  const nextXp = stats.xp + activityXp;
  const nextLevel = levelForXp(nextXp);

  await tx
    .update(usersStats)
    .set({
      xp: nextXp,
      level: nextLevel,
      streakCount,
      lastActiveAt: now,
    })
    .where(eq(usersStats.userId, userId));

  const codes = [...new Set([
    ...achievementCodes,
    ...(streakCount >= 7 ? ["streak_7_days"] : []),
  ])];
  const unlocked = codes.length
    ? await tx
        .select()
        .from(achievements)
        .where(inArray(achievements.code, codes))
    : [];
  const existing = unlocked.length
    ? await tx
        .select({ achievementId: userAchievements.achievementId })
        .from(userAchievements)
        .where(
          and(
            eq(userAchievements.userId, userId),
            inArray(userAchievements.achievementId, unlocked.map((achievement) => achievement.id)),
          ),
        )
    : [];
  const existingIds = new Set(existing.map((item) => item.achievementId));
  const newAchievements = unlocked.filter((achievement) => !existingIds.has(achievement.id));
  const achievementXp = newAchievements.reduce((total, achievement) => total + achievement.xpReward, 0);

  if (newAchievements.length) {
    await tx.insert(userAchievements).values(
      newAchievements.map((achievement) => ({ userId, achievementId: achievement.id })),
    );
    await tx
      .update(usersStats)
      .set({ xp: nextXp + achievementXp, level: levelForXp(nextXp + achievementXp) })
      .where(eq(usersStats.userId, userId));
  }

  return {
    xpEarned: activityXp + achievementXp,
    level: levelForXp(nextXp + achievementXp),
    leveledUp: levelForXp(nextXp + achievementXp) > stats.level,
    streakCount,
    unlocked: newAchievements,
  };
}

export async function recordNoteCreated(userId: string) {
  const cleanUserId = removeNullBytes(userId);
  try {
    return await getDb().transaction(async (tx) => {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(notes)
        .where(eq(notes.userId, cleanUserId));
      const codes = count === 1 ? ["first_note"] : [];
      return applyActivity(tx, cleanUserId, 10, codes);
    });
  } catch (error) {
    if (isMissingGamificationTable(error)) {
      return { xpEarned: 0, level: 1, leveledUp: false, streakCount: 0, unlocked: [] };
    }
    throw error;
  }
}

export async function recordQuizAttempt({
  userId,
  noteId,
  totalQuestions,
  correctAnswers,
}: {
  userId: string;
  noteId?: string;
  totalQuestions: number;
  correctAnswers: number;
}) {
  const cleanUserId = removeNullBytes(userId);
  const cleanNoteId = noteId === undefined ? undefined : removeNullBytes(noteId);
  const total = Math.max(1, totalQuestions);
  const correct = Math.min(total, Math.max(0, correctAnswers));
  const score = Math.round((correct / total) * 100);
  const baseXp = 15 + Math.round((score / 100) * 35);

  try {
    return await getDb().transaction(async (tx) => {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, cleanUserId));
      const codes = [
        ...(count + 1 >= 5 ? ["quiz_master_5"] : []),
        ...(score === 100 ? ["perfect_quiz"] : []),
      ];
      const activity = await applyActivity(tx, cleanUserId, baseXp, codes);
      await tx.insert(quizAttempts).values({
        userId: cleanUserId,
        noteId: cleanNoteId,
        score,
        totalQuestions: total,
        correctAnswers: correct,
        xpEarned: activity.xpEarned,
      });

      return { ...activity, score, correctAnswers: correct };
    });
  } catch (error) {
    if (isMissingGamificationTable(error)) {
      return { xpEarned: 0, level: 1, leveledUp: false, streakCount: 0, unlocked: [], score, correctAnswers: correct };
    }
    throw error;
  }
}
