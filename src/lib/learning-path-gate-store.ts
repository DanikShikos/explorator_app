import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bookChapters, books, lessonNodes, quizCards } from "@/db/schema";
import { isThinChapter } from "@/lib/ai/thin-chapter";
import { getCurrentUserId } from "@/lib/current-user";
import { parseExercise, type Exercise } from "@/lib/exercises";
import {
  evaluateLearningPathGate,
  type BookPathStatus,
  type GateChapterInput,
} from "@/lib/learning-path-gate";

/**
 * Load stored nodes + quiz_cards for a book and run the deterministic gate.
 * No AI. Isolation: getCurrentUserId + books.userId.
 */
export async function validateLearningPathGate(
  bookId: string,
): Promise<{ ok: true } | { ok: false; reasons: string[] }> {
  const userId = await getCurrentUserId();
  const db = getDb();

  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  if (!book) {
    return { ok: false, reasons: ["Книга не найдена"] };
  }

  const chapters = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterIndex));

  if (chapters.length === 0) {
    return { ok: false, reasons: ["Нет глав для контроля тропы"] };
  }

  const chapterIds = chapters.map((chapter) => chapter.id);
  const nodes = await db
    .select()
    .from(lessonNodes)
    .where(inArray(lessonNodes.chapterId, chapterIds))
    .orderBy(asc(lessonNodes.orderIndex));

  const nodeIds = nodes.map((node) => node.id);
  const cards =
    nodeIds.length === 0
      ? []
      : await db
          .select()
          .from(quizCards)
          .where(and(eq(quizCards.userId, userId), inArray(quizCards.nodeId, nodeIds)));

  const exercisesByNodeId: Record<string, Exercise[]> = {};
  for (const card of cards) {
    if (!card.nodeId) continue;
    const exercise = parseExercise(card.contentData);
    if (!exercise) continue;
    if (!exercisesByNodeId[card.nodeId]) {
      exercisesByNodeId[card.nodeId] = [];
    }
    exercisesByNodeId[card.nodeId].push(exercise);
  }

  const input: GateChapterInput[] = chapters.map((chapter) => ({
    thin: isThinChapter(chapter.contentSummary, chapter.content),
    nodes: nodes
      .filter((node) => node.chapterId === chapter.id)
      .map((node) => ({
        id: node.id,
        nodeType: node.nodeType,
        orderIndex: node.orderIndex,
        description: node.description,
      })),
    exercisesByNodeId,
  }));

  return evaluateLearningPathGate(input);
}

/**
 * Persist gate outcome on books.path_status. No AI.
 * Pass → approved; fail → rejected. Isolation: getCurrentUserId + books.userId.
 */
export async function applyLearningPathGate(bookId: string): Promise<
  | { ok: true; status: "approved" }
  | { ok: true; status: "rejected"; reasons: string[] }
  | { ok: false; error: string }
> {
  const userId = await getCurrentUserId();
  const db = getDb();

  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  if (!book) {
    return { ok: false, error: "Книга не найдена" };
  }

  const gate = await validateLearningPathGate(bookId);
  const status: BookPathStatus = gate.ok ? "approved" : "rejected";
  await db
    .update(books)
    .set({ pathStatus: status, updatedAt: new Date() })
    .where(and(eq(books.id, bookId), eq(books.userId, userId)));

  if (gate.ok) {
    return { ok: true, status: "approved" };
  }
  return { ok: true, status: "rejected", reasons: gate.reasons };
}
