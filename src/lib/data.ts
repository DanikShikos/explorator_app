import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { removeNullBytes } from "@/lib/utils";
import {
  achievements,
  bookChapters,
  books,
  flashcards,
  lessonNodes,
  notes,
  quizAttempts,
  quizQuestions,
  quizzes,
  reminders,
  userAchievements,
  userNodeProgress,
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
        text.includes("emaxconnsession") ||
        text.includes("max clients") ||
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
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
    const userId = await getCurrentUserId();
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
  const userId = await getCurrentUserId();
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

export async function listBooks() {
  const userId = await getCurrentUserId();
  const db = getDb();

  try {
    const rows = await db
      .select()
      .from(books)
      .where(eq(books.userId, userId))
      .orderBy(desc(books.updatedAt));

    if (rows.length === 0) {
      return [];
    }

    const bookIds = rows.map((book) => book.id);

    const [chapterStats, pathStats] = await Promise.all([
      db
        .select({
          bookId: bookChapters.bookId,
          chapters: sql<number>`count(*)::int`,
          minutes: sql<number>`coalesce(sum(${bookChapters.readTimeMinutes}), 0)::int`,
        })
        .from(bookChapters)
        .where(inArray(bookChapters.bookId, bookIds))
        .groupBy(bookChapters.bookId),
      db
        .select({
          bookId: bookChapters.bookId,
          total: sql<number>`count(${lessonNodes.id})::int`,
          done: sql<number>`count(*) filter (where ${userNodeProgress.status} in ('completed', 'mastered'))::int`,
        })
        .from(bookChapters)
        .innerJoin(lessonNodes, eq(lessonNodes.chapterId, bookChapters.id))
        .leftJoin(
          userNodeProgress,
          and(eq(userNodeProgress.nodeId, lessonNodes.id), eq(userNodeProgress.userId, userId)),
        )
        .where(inArray(bookChapters.bookId, bookIds))
        .groupBy(bookChapters.bookId),
    ]);

    return rows.map((book) => {
      const stats = chapterStats.find((row) => row.bookId === book.id);
      const path = pathStats.find((row) => row.bookId === book.id);
      const total = path?.total ?? 0;
      const done = path?.done ?? 0;
      // Share of this user's path nodes that are completed or mastered; no nodes → 0.
      const mastery = total === 0 ? 0 : Math.round((done / total) * 100);
      return {
        book,
        mastery,
        chapters: stats?.chapters ?? 0,
        minutes: stats?.minutes ?? 0,
      };
    });
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    const text = error instanceof Error ? error.message : String(error);
    if (
      text.includes("does not exist") ||
      text.includes("lesson_nodes") ||
      text.includes("user_node_progress")
    ) {
      return [];
    }
    throw error;
  }
}

export async function getBookStudy(bookId: string) {
  const userId = await getCurrentUserId();
  const cleanBookId = removeNullBytes(bookId);
  const db = getDb();
  try {
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, cleanBookId), eq(books.userId, userId)))
      .limit(1);
    if (!book) {
      return null;
    }

    const [chapters, cards, quizRows] = await Promise.all([
      db.select().from(bookChapters).where(eq(bookChapters.bookId, book.id)).orderBy(asc(bookChapters.chapterIndex)),
      db.select().from(flashcards).where(and(eq(flashcards.bookId, book.id), eq(flashcards.userId, userId))),
      db.select().from(quizzes).where(eq(quizzes.bookId, book.id)).orderBy(desc(quizzes.createdAt)),
    ]);

    const latest = quizRows[0];
    const questions = latest
      ? await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, latest.id)).orderBy(asc(quizQuestions.orderIndex))
      : [];

    return { book, chapters, cards, quiz: latest ?? null, questions };
  } catch (error) {
    if (isDbUnavailable(error)) {
      return null;
    }
    throw error;
  }
}

export async function getLearningPath(bookId: string) {
  const userId = await getCurrentUserId();
  try {
    const chapters = await getDb()
      .select({ id: bookChapters.id, title: bookChapters.title, chapterIndex: bookChapters.chapterIndex })
      .from(bookChapters)
      .innerJoin(books, eq(books.id, bookChapters.bookId))
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .orderBy(asc(bookChapters.chapterIndex));
    if (chapters.length === 0) {
      return [];
    }

    const nodes = await getDb()
      .select()
      .from(lessonNodes)
      .where(inArray(lessonNodes.chapterId, chapters.map((chapter) => chapter.id)))
      .orderBy(asc(lessonNodes.orderIndex));
    const progress = await getDb()
      .select()
      .from(userNodeProgress)
      .where(eq(userNodeProgress.userId, userId));

    return chapters.flatMap((chapter) =>
      nodes
        .filter((node) => node.chapterId === chapter.id)
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((node) => {
          const row = progress.find((item) => item.nodeId === node.id);
          return {
            id: node.id,
            chapterTitle: chapter.title,
            title: node.title,
            description: node.description,
            nodeType: node.nodeType,
            orderIndex: node.orderIndex,
            xpReward: node.xpReward,
            status: row?.status ?? "locked",
            score: row?.score ?? null,
          };
        }),
    );
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    const text = error instanceof Error ? error.message : String(error);
    if (text.includes("does not exist") || text.includes("lesson_nodes")) {
      return [];
    }
    throw error;
  }
}
