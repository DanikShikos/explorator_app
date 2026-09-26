import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { removeNullBytes } from "@/lib/utils";
import {
  achievements,
  notes,
  quizAttempts,
  reminders,
  userAchievements,
  usersStats,
  quizCards,
  type Note,
  type QuizCard,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 0 && !url.includes("YOUR_PROJECT") && !url.includes("YOUR_PASSWORD");
}

function isDbUnavailable(error: unknown): boolean {
  const seen = new Set<unknown>();

  const visit = (value: unknown): boolean => {
    if (!value || seen.has(value)) {
      return false;
    }
    seen.add(value);

    if (value instanceof Error) {
      const text = [value.message, value.cause ? String(value.cause) : ""]
        .join(" ")
        .toLowerCase();

      if (
        text.includes("getaddrinfo") ||
        text.includes("econnrefused") ||
        text.includes("enotfound") ||
        text.includes("ei_again") ||
        text.includes("failed query") ||
        text.includes("supabase.co")
      ) {
        return true;
      }

      if (value.cause) {
        return visit(value.cause);
      }
    }

    if (typeof value === "object") {
      for (const item of Object.values(value)) {
        if (visit(item)) {
          return true;
        }
      }
    }

    return false;
  };

  return visit(error);
}

export async function listNotes(): Promise<Note[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const userId = getCurrentUserId();
    return await getDb()
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt));
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    throw error;
  }
}

export async function getNote(id: string): Promise<Note | undefined> {
  const cleanId = removeNullBytes(id);
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  try {
    const userId = getCurrentUserId();
    const [note] = await getDb()
      .select()
      .from(notes)
      .where(and(eq(notes.id, cleanId), eq(notes.userId, userId)))
      .limit(1);
    return note;
  } catch (error) {
    if (isDbUnavailable(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function countDueCards() {
  if (!isDatabaseConfigured()) {
    return 0;
  }

  try {
    const userId = getCurrentUserId();
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(quizCards)
      .where(and(eq(quizCards.userId, userId), lte(quizCards.due, new Date())));
    return row?.count ?? 0;
  } catch (error) {
    if (isDbUnavailable(error)) {
      return 0;
    }
    throw error;
  }
}

export async function listDueCards(): Promise<QuizCard[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const userId = getCurrentUserId();
    return await getDb()
      .select()
      .from(quizCards)
      .where(and(eq(quizCards.userId, userId), lte(quizCards.due, new Date())))
      .orderBy(asc(quizCards.due));
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    throw error;
  }
}

export async function countCardsForNote(noteId: string) {
  const cleanNoteId = removeNullBytes(noteId);
  if (!isDatabaseConfigured()) {
    return 0;
  }

  try {
    const userId = getCurrentUserId();
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(quizCards)
      .where(and(eq(quizCards.noteId, cleanNoteId), eq(quizCards.userId, userId)));
    return row?.count ?? 0;
  } catch (error) {
    if (isDbUnavailable(error)) {
      return 0;
    }
    throw error;
  }
}

export async function getProfileData() {
  const userId = getCurrentUserId();
  const db = getDb();
  const fallback = {
    stats: {
      userId,
      xp: 0,
      level: 1,
      streakCount: 0,
      lastActiveAt: null,
      dailyGoalXp: 50,
    },
    achievements: [],
    reminder: null,
    attempts: { count: 0, averageScore: 0, totalXp: 0, todayXp: 0 },
    noteCount: 0,
  };

  try {
    const [statsRow, achievementRows, unlockedRows, reminderRows, attemptSummary, noteSummary] = await Promise.all([
    db.select().from(usersStats).where(eq(usersStats.userId, userId)).limit(1),
    db.select().from(achievements).orderBy(asc(achievements.id)),
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
    db.select().from(reminders).where(eq(reminders.userId, userId)).limit(1),
    db
      .select({
        count: sql<number>`count(*)::int`,
        averageScore: sql<number>`coalesce(round(avg(${quizAttempts.score})), 0)::int`,
        totalXp: sql<number>`coalesce(sum(${quizAttempts.xpEarned}), 0)::int`,
        todayXp: sql<number>`coalesce(sum(case when ${quizAttempts.createdAt} >= current_date then ${quizAttempts.xpEarned} else 0 end), 0)::int`,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notes)
      .where(eq(notes.userId, userId)),
    ]);

    return {
      stats: statsRow[0] ?? fallback.stats,
      achievements: achievementRows.map((achievement) => ({
        ...achievement,
        unlockedAt: unlockedRows.find((item) => item.achievementId === achievement.id)?.unlockedAt ?? null,
      })),
      reminder: reminderRows[0] ?? null,
      attempts: attemptSummary[0] ?? fallback.attempts,
      noteCount: noteSummary[0]?.count ?? 0,
    };
  } catch (error) {
    const missingTable = (value: unknown): boolean => {
      if (!value || typeof value !== "object") {
        return false;
      }
      const message = value instanceof Error ? value.message : "";
      const cause = "cause" in value ? value.cause : undefined;
      return message.includes("does not exist") || missingTable(cause);
    };
    if (missingTable(error)) {
      return fallback;
    }
    throw error;
  }
}
