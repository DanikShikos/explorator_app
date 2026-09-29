import { and, asc, desc, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { parseExercise, type Exercise } from "@/lib/exercises";
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
  type Book,
  type Note,
  type QuizCard,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { isMissingDbObjectError } from "@/lib/db-errors";
import { effectivePathAvailability, type BookPathStatus } from "@/lib/learning-path-gate";

/** Same shape as rows from `getLearningPath` — do not invent fields. */
export type PathNodeRow = {
  id: string;
  chapterTitle: string;
  title: string;
  description: string;
  nodeType: string;
  orderIndex: number;
  xpReward: number;
  status: "locked" | "available" | "completed" | "mastered";
  score: number | null;
};

export type { BookPathStatus };
export { effectivePathAvailability };

/** Availability DTO for FE-006 — playable nodes unless rejected / empty. */
export type BookPathAvailability = {
  status: BookPathStatus;
  nodes: PathNodeRow[];
};

/** RFC-001: active book + next available path node + due quiz_cards for that book. */
export type ContinueBookSession = {
  book: Book;
  nextNode: PathNodeRow | null;
  dueCount: number;
};

/** BE-001 panel contract for `/`. */
export type TodayPanel = {
  book: { id: string; title: string } | null;
  nextNode: {
    id: string;
    title: string;
    nodeType: string;
    status: "available";
  } | null;
  dueCount: number;
};

/** Due quiz_cards of a book, shaped for LessonRunner `LessonCard`. */
export type BookDueCard = {
  id: string;
  exercise: Exercise;
};

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 0 && !url.includes("YOUR_PROJECT") && !url.includes("YOUR_PASSWORD");
}

function isDbUnavailable(error: unknown): boolean {
  // Schema gaps must not be treated as "DB down" — callers decide whether to throw.
  if (isMissingDbObjectError(error)) {
    return false;
  }

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

/** Note row + optional book title for FE-012 list / Word export (BE-010). */
export type NoteListItem = Note & {
  bookTitle: string | null;
};

export async function listNotes(options?: {
  bookId?: string;
}): Promise<NoteListItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const userId = await getCurrentUserId();
    const bookId = options?.bookId ? removeNullBytes(options.bookId) : undefined;
    const rows = await getDb()
      .select({
        id: notes.id,
        userId: notes.userId,
        title: notes.title,
        content: notes.content,
        bookId: notes.bookId,
        nodeId: notes.nodeId,
        sourceKind: notes.sourceKind,
        term: notes.term,
        cardIndex: notes.cardIndex,
        reviewedAt: notes.reviewedAt,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        bookTitle: books.title,
      })
      .from(notes)
      .leftJoin(books, eq(books.id, notes.bookId))
      .where(
        bookId
          ? and(eq(notes.userId, userId), eq(notes.bookId, bookId))
          : eq(notes.userId, userId),
      )
      .orderBy(desc(notes.updatedAt));
    return rows.map((row) => ({
      ...row,
      bookTitle: row.bookTitle ?? null,
    }));
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

export async function getPathPersonalStats() {
  const userId = await getCurrentUserId();
  const db = getDb();
  try {
    const [statsRow, attemptSummary] = await Promise.all([
      db
        .select({
          streakCount: usersStats.streakCount,
          dailyGoalXp: usersStats.dailyGoalXp,
        })
        .from(usersStats)
        .where(eq(usersStats.userId, userId))
        .limit(1),
      db
        .select({
          todayXp: sql<number>`coalesce(sum(case when ${quizAttempts.createdAt} >= current_date then ${quizAttempts.xpEarned} else 0 end), 0)::int`,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId)),
    ]);
    return {
      streakCount: statsRow[0]?.streakCount ?? 0,
      dailyGoalXp: statsRow[0]?.dailyGoalXp ?? 50,
      todayXp: attemptSummary[0]?.todayXp ?? 0,
    };
  } catch (error) {
    if (isDbUnavailable(error) || isMissingDbObjectError(error)) {
      return { streakCount: 0, dailyGoalXp: 50, todayXp: 0 };
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
      // BE-009: same playable set as getLearningPath — rejected ⇒ hide path stats.
      const playable = book.pathStatus !== "rejected";
      const total = playable ? (path?.total ?? 0) : 0;
      const done = playable ? (path?.done ?? 0) : 0;
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
    // Missing column/table (e.g. path_status) must surface as libraryError, not empty shelf.
    if (isMissingDbObjectError(error)) {
      throw error;
    }
    if (isDbUnavailable(error)) {
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
    const [row] = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        format: books.format,
        pathStatus: books.pathStatus,
        chapterCount: sql<number>`(
          select count(*)::int from ${bookChapters}
          where ${bookChapters.bookId} = ${books.id}
        )`,
      })
      .from(books)
      .where(and(eq(books.id, cleanBookId), eq(books.userId, userId)))
      .limit(1);
    if (!row) {
      return null;
    }

    return {
      book: {
        id: row.id,
        title: row.title,
        author: row.author,
        format: row.format,
      },
      pathStatus: row.pathStatus as BookPathStatus,
      chapterCount: row.chapterCount ?? 0,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * One round-trip: chapters ⋈ lesson_nodes ⋈ progress for a playable book.
 * Same PathNodeRow order as the old 3-query path (chapterIndex, then orderIndex).
 */
async function loadLearningPathNodes(bookId: string, userId: string): Promise<PathNodeRow[]> {
  const rows = await getDb()
    .select({
      id: lessonNodes.id,
      chapterTitle: bookChapters.title,
      title: lessonNodes.title,
      description: lessonNodes.description,
      nodeType: lessonNodes.nodeType,
      orderIndex: lessonNodes.orderIndex,
      xpReward: lessonNodes.xpReward,
      status: userNodeProgress.status,
      score: userNodeProgress.score,
    })
    .from(bookChapters)
    .innerJoin(lessonNodes, eq(lessonNodes.chapterId, bookChapters.id))
    .leftJoin(
      userNodeProgress,
      and(eq(userNodeProgress.nodeId, lessonNodes.id), eq(userNodeProgress.userId, userId)),
    )
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterIndex), asc(lessonNodes.orderIndex));

  return rows.map((row) => ({
    id: row.id,
    chapterTitle: row.chapterTitle,
    title: row.title,
    description: row.description,
    nodeType: row.nodeType,
    orderIndex: row.orderIndex,
    xpReward: row.xpReward,
    status: (row.status ?? "locked") as PathNodeRow["status"],
    score: row.score ?? null,
  }));
}

export async function getLearningPath(bookId: string): Promise<PathNodeRow[]> {
  const userId = await getCurrentUserId();
  try {
    const [book] = await getDb()
      .select({ id: books.id, pathStatus: books.pathStatus })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);
    if (!book) {
      return [];
    }
    // BE-009: empty playable only when rejected (or no rows below). Pending keeps stored nodes.
    if (book.pathStatus === "rejected") {
      return [];
    }

    return await loadLearningPathNodes(bookId, userId);
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    const text = error instanceof Error ? error.message : String(error);
    if (
      text.includes("does not exist") ||
      text.includes("lesson_nodes") ||
      text.includes("path_status")
    ) {
      return [];
    }
    throw error;
  }
}

/**
 * BE-009 reader: path_status + playable nodes.
 * Empty playable only when rejected or no stored nodes; pending + rows → nodes + effective approved.
 * Isolation: getCurrentUserId + books.userId.
 * Books row is read once (no nested getLearningPath books lookup).
 * Pass knownPathStatus from getBookStudy to skip the books round-trip on the book page.
 */
export async function getBookPathAvailability(
  bookId: string,
  knownPathStatus?: BookPathStatus,
): Promise<BookPathAvailability> {
  const userId = await getCurrentUserId();
  try {
    let dbStatus = knownPathStatus;
    if (dbStatus === undefined) {
      const [book] = await getDb()
        .select({ id: books.id, pathStatus: books.pathStatus })
        .from(books)
        .where(and(eq(books.id, bookId), eq(books.userId, userId)))
        .limit(1);
      if (!book) {
        return { status: "pending", nodes: [] };
      }
      dbStatus = book.pathStatus as BookPathStatus;
    }
    if (dbStatus === "rejected") {
      return { status: "rejected", nodes: [] };
    }
    const nodes = await loadLearningPathNodes(bookId, userId);
    return effectivePathAvailability(dbStatus, nodes);
  } catch (error) {
    if (isDbUnavailable(error)) {
      return { status: "pending", nodes: [] };
    }
    const text = error instanceof Error ? error.message : String(error);
    if (text.includes("path_status") || text.includes("does not exist")) {
      return { status: "pending", nodes: [] };
    }
    throw error;
  }
}

type ActiveBookPick = {
  id: string;
  title: string;
  hasAvailable: boolean;
};

/**
 * Active book for «Сегодня»:
 * - prefer a book that has an `available` node;
 * - if several — freshest `completedAt` among any progress of that book (null = oldest);
 * - if no `available` anywhere — book with freshest `completedAt`, caller sets nextNode null;
 * - no path / no books → null.
 */
async function pickActiveBook(userId: string): Promise<ActiveBookPick | null> {
  const db = getDb();
  const ranked = await db
    .select({
      id: books.id,
      title: books.title,
      maxCompletedAt: sql<Date | null>`max(${userNodeProgress.completedAt})`,
      hasAvailable: sql<boolean>`bool_or(${userNodeProgress.status} = 'available')`,
    })
    .from(books)
    .innerJoin(bookChapters, eq(bookChapters.bookId, books.id))
    .innerJoin(lessonNodes, eq(lessonNodes.chapterId, bookChapters.id))
    .leftJoin(
      userNodeProgress,
      and(eq(userNodeProgress.nodeId, lessonNodes.id), eq(userNodeProgress.userId, userId)),
    )
    .where(eq(books.userId, userId))
    .groupBy(books.id, books.title)
    .orderBy(sql`max(${userNodeProgress.completedAt}) DESC NULLS LAST`);

  if (ranked.length === 0) {
    return null;
  }

  const withAvailable = ranked.find((row) => row.hasAvailable);
  const pick = withAvailable ?? ranked[0];
  if (!pick) {
    return null;
  }
  return {
    id: pick.id,
    title: pick.title,
    hasAvailable: Boolean(pick.hasAvailable),
  };
}

async function countBookDueCards(userId: string, bookId: string): Promise<number> {
  // Only cards already answered in a lesson (lastReview set). Fresh JIT cards have due=now
  // but reps=0 / lastReview null — they must not inflate «К повтору» before the first pass.
  const [dueRow] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(quizCards)
    .innerJoin(lessonNodes, eq(lessonNodes.id, quizCards.nodeId))
    .innerJoin(bookChapters, eq(bookChapters.id, lessonNodes.chapterId))
    .where(
      and(
        eq(quizCards.userId, userId),
        eq(bookChapters.bookId, bookId),
        isNotNull(quizCards.nodeId),
        isNotNull(quizCards.lastReview),
        lte(quizCards.due, new Date()),
      ),
    );
  return dueRow?.count ?? 0;
}

/**
 * First `available` node on a playable path — one indexed lookup, not the full 104-node join.
 * Same rejected rule as getLearningPath (rejected → no next step).
 */
async function findFirstAvailableNode(
  bookId: string,
  userId: string,
): Promise<{ id: string; title: string; nodeType: string } | null> {
  const [row] = await getDb()
    .select({
      id: lessonNodes.id,
      title: lessonNodes.title,
      nodeType: lessonNodes.nodeType,
    })
    .from(books)
    .innerJoin(bookChapters, eq(bookChapters.bookId, books.id))
    .innerJoin(lessonNodes, eq(lessonNodes.chapterId, bookChapters.id))
    .innerJoin(
      userNodeProgress,
      and(eq(userNodeProgress.nodeId, lessonNodes.id), eq(userNodeProgress.userId, userId)),
    )
    .where(
      and(
        eq(books.id, bookId),
        eq(books.userId, userId),
        ne(books.pathStatus, "rejected"),
        eq(userNodeProgress.status, "available"),
      ),
    )
    .orderBy(asc(bookChapters.chapterIndex), asc(lessonNodes.orderIndex))
    .limit(1);
  return row ?? null;
}

function emptyTodayPanel(): TodayPanel {
  return { book: null, nextNode: null, dueCount: 0 };
}

/**
 * BE-001: panel «Сегодня» — active book, first available node, due count for that book.
 * Failures fall back to empty panel so `/` does not 500.
 * Next-node + dueCount run in parallel; no full-path load (was books + 104-node JOIN).
 */
export async function getTodayPanel(): Promise<TodayPanel> {
  if (!isDatabaseConfigured()) {
    return emptyTodayPanel();
  }

  try {
    const userId = await getCurrentUserId();
    const active = await pickActiveBook(userId);
    if (!active) {
      return emptyTodayPanel();
    }

    const [available, dueCount] = await Promise.all([
      active.hasAvailable ? findFirstAvailableNode(active.id, userId) : Promise.resolve(null),
      countBookDueCards(userId, active.id),
    ]);

    const nextNode: TodayPanel["nextNode"] = available
      ? {
          id: available.id,
          title: available.title,
          nodeType: available.nodeType,
          status: "available",
        }
      : null;

    return {
      book: { id: active.id, title: active.title },
      nextNode,
      dueCount,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      return emptyTodayPanel();
    }
    const text = error instanceof Error ? error.message : String(error);
    if (
      text.includes("does not exist") ||
      text.includes("lesson_nodes") ||
      text.includes("quiz_cards") ||
      text.includes("user_node_progress")
    ) {
      return emptyTodayPanel();
    }
    return emptyTodayPanel();
  }
}

/**
 * BE-001: due quiz_cards of a book (`nodeId` of this book's nodes, `due <= now`,
 * already reviewed once via `lastReview`), ordered by `due ASC`, shaped for LessonCard.
 */
export async function listBookDueCards(bookId: string): Promise<BookDueCard[]> {
  const cleanBookId = removeNullBytes(bookId);
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const userId = await getCurrentUserId();
    const db = getDb();

    const [owned] = await db
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, cleanBookId), eq(books.userId, userId)))
      .limit(1);
    if (!owned) {
      return [];
    }

    const rows = await db
      .select({
        id: quizCards.id,
        contentData: quizCards.contentData,
      })
      .from(quizCards)
      .innerJoin(lessonNodes, eq(lessonNodes.id, quizCards.nodeId))
      .innerJoin(bookChapters, eq(bookChapters.id, lessonNodes.chapterId))
      .where(
        and(
          eq(quizCards.userId, userId),
          eq(bookChapters.bookId, cleanBookId),
          isNotNull(quizCards.nodeId),
          isNotNull(quizCards.lastReview),
          lte(quizCards.due, new Date()),
        ),
      )
      .orderBy(asc(quizCards.due));

    return rows.flatMap((row) => {
      const exercise = parseExercise(row.contentData);
      return exercise ? [{ id: row.id, exercise }] : [];
    });
  } catch (error) {
    if (isDbUnavailable(error)) {
      return [];
    }
    const text = error instanceof Error ? error.message : String(error);
    if (
      text.includes("does not exist") ||
      text.includes("lesson_nodes") ||
      text.includes("quiz_cards")
    ) {
      return [];
    }
    return [];
  }
}

/**
 * Legacy helper: same active-book rule as `getTodayPanel`, full Book + PathNodeRow.
 */
export async function getContinueBookSession(): Promise<ContinueBookSession | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const userId = await getCurrentUserId();
    const active = await pickActiveBook(userId);
    if (!active) {
      return null;
    }

    const [book] = await getDb()
      .select()
      .from(books)
      .where(and(eq(books.id, active.id), eq(books.userId, userId)))
      .limit(1);
    if (!book) {
      return null;
    }

    const path = await getLearningPath(book.id);
    const nextNode = active.hasAvailable
      ? (path.find((node) => node.status === "available") ?? null)
      : null;
    const dueCount = await countBookDueCards(userId, book.id);

    return { book, nextNode, dueCount };
  } catch (error) {
    if (isDbUnavailable(error)) {
      return null;
    }
    const text = error instanceof Error ? error.message : String(error);
    if (
      text.includes("does not exist") ||
      text.includes("lesson_nodes") ||
      text.includes("quiz_cards")
    ) {
      return null;
    }
    return null;
  }
}
