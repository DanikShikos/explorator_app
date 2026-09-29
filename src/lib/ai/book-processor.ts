import { z } from "zod";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookChapters,
  books,
  lessonNodes,
  quizCards,
  userNodeProgress,
  type LessonNode,
} from "@/db/schema";
import { generateObjectWithCredits, hasAiProvider } from "@/lib/ai";
import { getCurrentUserId } from "@/lib/current-user";
import { canonicalAnswer, exerciseListSchema, parseExercise, type Exercise } from "@/lib/exercises";
import {
  chapterPathNodeCount,
  classifyChapterPathSize,
  prunableExcessNodeIds,
  prunablePracticeNodeIds,
  type ChapterPathSize,
} from "@/lib/ai/chapter-path-size";
import { filterGroundedExercises } from "@/lib/ai/grounding";
import { buildGroundedExercisesFromTheory } from "@/lib/ai/grounded-exercises";
import { buildTheoryCards, thinInterestBlurb } from "@/lib/ai/thin-chapter";
import { theoryDescriptionFromSubstance } from "@/lib/ai/theory-substance";
import { newFsrsCard } from "@/lib/fsrs";
import { applyLearningPathGate } from "@/lib/learning-path-gate-store";
import { MIN_ESSENCE_CHARS, type BookPathStatus } from "@/lib/learning-path-gate";
import { removeNullBytes } from "@/lib/utils";
import {
  bookSummarySchema,
  recallQuizSchema,
  type BookSummary,
  type RecallQuiz,
} from "@/lib/ai/book-ai-schemas";
import { AI_PROMPT_CLIP, clipAiPromptText } from "@/lib/ai/prompt-clip";

export {
  bookSummarySchema,
  recallQuestionSchema,
  recallQuizSchema,
  type BookSummary,
  type RecallQuiz,
} from "@/lib/ai/book-ai-schemas";
export { AI_PROMPT_CLIP, clipAiPromptText } from "@/lib/ai/prompt-clip";

export type ChapterSource = {
  chapterIndex: number;
  title: string;
  content: string;
};

function sourceBlock(chapters: ChapterSource[]) {
  return chapters
    .slice(0, AI_PROMPT_CLIP.maxChaptersInSourceBlock)
    .map(
      (chapter) =>
        `Глава ${chapter.chapterIndex}. ${chapter.title}\n${clipAiPromptText(chapter.content, AI_PROMPT_CLIP.bookSummaryChapter)}`,
    )
    .join("\n\n");
}

function aiError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("credit") || message.includes("billing") || message.includes("quota")) {
    return "У Gemini, Groq и OpenRouter сейчас нет доступного лимита.";
  }
  return "Не удалось обработать книгу. Попробуйте ещё раз.";
}

export async function summarizeBook(title: string, chapters: ChapterSource[]) {
  if (!hasAiProvider()) {
    return { ok: false as const, error: "Нет ключа Gemini, Groq или OpenRouter в .env.local" };
  }

  try {
    const { object } = await generateObjectWithCredits({
      schema: bookSummarySchema,
      maxOutputTokens: 3500,
      prompt: [
        "Сделай практическое саммари книги на языке исходного текста.",
        "Главная идея — коротко, как для занятого человека.",
        "Правила — то, что можно применить, а не пересказ сюжета.",
        "Для каждой переданной главы верни chapterIndex из исходника и сжатую суть: ключевые правила и типичные ошибки.",
        `Книга: ${title}`,
        sourceBlock(chapters),
      ].join("\n\n"),
    });
    return { ok: true as const, summary: object };
  } catch (error) {
    return { ok: false as const, error: aiError(error) };
  }
}

export async function createRecallQuiz(title: string, summary: BookSummary) {
  if (!hasAiProvider()) {
    return { ok: false as const, error: "Нет ключа Gemini, Groq или OpenRouter в .env.local" };
  }

  try {
    const { object } = await generateObjectWithCredits({
      schema: recallQuizSchema,
      maxOutputTokens: 3500,
      prompt: [
        "Составь 5–10 вопросов на припоминание и применение идей, не на имена и даты.",
        "У каждого вопроса ровно 4 коротких варианта, не длиннее восьми слов. correctAnswerIndex — номер правильного, с нуля.",
        "В explanation объясни, какая идея книги делает ответ верным.",
        `Книга: ${title}`,
        `Главная идея: ${summary.executiveSummary}`,
        `Правила:\n${summary.practicalRules.map((rule) => `- ${rule}`).join("\n")}`,
        `Главы:\n${summary.chapters.map((chapter) => `${chapter.chapterIndex}. ${chapter.contentSummary}`).join("\n")}`,
      ].join("\n\n"),
    });
    return { ok: true as const, quiz: object };
  } catch (error) {
    return { ok: false as const, error: aiError(error) };
  }
}

export function formatOverallSummary(summary: BookSummary) {
  return [
    summary.executiveSummary.trim(),
    "",
    "Практические правила:",
    ...summary.practicalRules.map((rule) => `- ${rule.trim()}`),
  ].join("\n");
}

const pathNodeFields = z.object({
  nodeType: z.enum(["summary_read", "quiz_sprint", "flashcard_review", "boss_challenge"]),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(520),
});

const pathNodeSchemaLong = z.object({
  nodes: z.array(pathNodeFields).length(4),
});

const pathNodeSchemaShort = z.object({
  nodes: z.array(pathNodeFields).length(2),
});

const nodeBlueprints = [
  { nodeType: "summary_read" as const, title: "Суть главы", description: "Короткие карточки с главной мыслью.", xpReward: 15 },
  { nodeType: "quiz_sprint" as const, title: "Спринт", description: "Несколько быстрых вопросов по главе.", xpReward: 20 },
  { nodeType: "flashcard_review" as const, title: "Закрепление", description: "Пары, пропуски и порядок идей.", xpReward: 20 },
  { nodeType: "boss_challenge" as const, title: "Испытание", description: "Смешанные задания на применение.", xpReward: 40 },
];

/** RFC-004: thin=theory; short=theory+sprint; long=full four. */
function blueprintsForPathSize(size: ChapterPathSize) {
  if (size === "thin") {
    return nodeBlueprints.slice(0, 1);
  }
  if (size === "short") {
    return nodeBlueprints.slice(0, 2);
  }
  return nodeBlueprints;
}

function theoryDescriptionFromChapter(title: string, summary: string, content: string) {
  return theoryDescriptionFromSubstance(title, summary, content);
}

/** Theory string shown on summary_read — exclusive source for practice prompts (BE-003). */
async function theoryTextForChapter(
  chapterId: string,
  chapter: { title: string; contentSummary: string; content: string },
) {
  const [sibling] = await getDb()
    .select({ description: lessonNodes.description })
    .from(lessonNodes)
    .where(and(eq(lessonNodes.chapterId, chapterId), eq(lessonNodes.nodeType, "summary_read")))
    .orderBy(asc(lessonNodes.orderIndex))
    .limit(1);
  const fromSibling = sibling?.description?.trim() ?? "";
  if (fromSibling.length > 0) {
    return fromSibling;
  }
  return theoryDescriptionFromChapter(chapter.title, chapter.contentSummary, chapter.content);
}

async function chapterForUser(chapterId: string, userId: string) {
  const [row] = await getDb()
    .select({
      chapter: bookChapters,
      bookUserId: books.userId,
      bookTitle: books.title,
    })
    .from(bookChapters)
    .innerJoin(books, eq(books.id, bookChapters.bookId))
    .where(and(eq(bookChapters.id, chapterId), eq(books.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function previousChapterCleared(bookId: string, chapterIndex: number, userId: string) {
  if (chapterIndex <= 0) {
    return true;
  }
  const [previous] = await getDb()
    .select()
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, bookId), eq(bookChapters.chapterIndex, chapterIndex - 1)))
    .limit(1);
  if (!previous) {
    return true;
  }
  const nodes = await getDb().select().from(lessonNodes).where(eq(lessonNodes.chapterId, previous.id));
  if (nodes.length === 0) {
    return false;
  }
  const progress = await getDb()
    .select()
    .from(userNodeProgress)
    .where(eq(userNodeProgress.userId, userId));
  return nodes.every((node) => {
    const row = progress.find((item) => item.nodeId === node.id);
    return row?.status === "completed" || row?.status === "mastered";
  });
}

export async function generateLearningPathOnFly(chapterId: string, options?: { ai?: boolean }) {
  const userId = await getCurrentUserId();
  const owned = await chapterForUser(chapterId, userId);
  if (!owned) {
    return { ok: false as const, error: "Глава не найдена" };
  }

  const pathSize = classifyChapterPathSize(
    owned.chapter.contentSummary,
    owned.chapter.content,
    owned.chapter.readTimeMinutes,
  );
  const expectedCount = chapterPathNodeCount(pathSize);
  const existing = await getDb()
    .select()
    .from(lessonNodes)
    .where(eq(lessonNodes.chapterId, chapterId))
    .orderBy(asc(lessonNodes.orderIndex));
  if (existing.length > 0) {
    const progressRows = await getDb()
      .select({
        nodeId: userNodeProgress.nodeId,
        status: userNodeProgress.status,
        completedAt: userNodeProgress.completedAt,
      })
      .from(userNodeProgress)
      .where(
        and(
          eq(userNodeProgress.userId, userId),
          inArray(
            userNodeProgress.nodeId,
            existing.map((node) => node.id),
          ),
        ),
      );
    const progressByNodeId = new Map(
      progressRows.map((row) => [row.nodeId, { status: row.status, completedAt: row.completedAt }]),
    );

    if (pathSize === "thin") {
      const dropIds = prunablePracticeNodeIds(existing, progressByNodeId);
      if (dropIds.length > 0) {
        await getDb().delete(lessonNodes).where(inArray(lessonNodes.id, dropIds));
      }
      const blurb = thinInterestBlurb(owned.chapter.title, owned.chapter.contentSummary, owned.chapter.content);
      await getDb()
        .update(lessonNodes)
        .set({ description: blurb })
        .where(and(eq(lessonNodes.chapterId, chapterId), eq(lessonNodes.nodeType, "summary_read")));
    } else if (existing.length > expectedCount) {
      // RFC-004: drop locked pairs/boss only; keep nodes the reader already reached.
      const dropIds = prunableExcessNodeIds(existing, progressByNodeId, expectedCount);
      if (dropIds.length > 0) {
        await getDb().delete(lessonNodes).where(inArray(lessonNodes.id, dropIds));
      }
    }
    const kept = await getDb()
      .select()
      .from(lessonNodes)
      .where(eq(lessonNodes.chapterId, chapterId))
      .orderBy(asc(lessonNodes.orderIndex));
    await ensureChapterNodeProgress(
      kept,
      userId,
      owned.chapter.bookId,
      owned.chapter.chapterIndex,
    );
    return { ok: true as const, nodes: kept };
  }

  if (pathSize === "thin") {
    const unlocked = await previousChapterCleared(owned.chapter.bookId, owned.chapter.chapterIndex, userId);
    const blurb = thinInterestBlurb(owned.chapter.title, owned.chapter.contentSummary, owned.chapter.content);
    const inserted = await getDb()
      .insert(lessonNodes)
      .values({
        chapterId,
        title: "Суть главы",
        description: blurb,
        nodeType: "summary_read",
        orderIndex: 0,
        xpReward: 15,
        isGenerated: false,
      })
      .onConflictDoNothing({ target: [lessonNodes.chapterId, lessonNodes.orderIndex] })
      .returning();
    if (inserted.length > 0) {
      await getDb()
        .insert(userNodeProgress)
        .values({
          userId,
          nodeId: inserted[0].id,
          status: unlocked ? "available" : "locked",
        })
        .onConflictDoNothing();
    }
    const nodes = await getDb()
      .select()
      .from(lessonNodes)
      .where(eq(lessonNodes.chapterId, chapterId))
      .orderBy(asc(lessonNodes.orderIndex));
    await ensureChapterNodeProgress(nodes, userId, owned.chapter.bookId, owned.chapter.chapterIndex);
    return { ok: true as const, nodes };
  }

  const blueprints = blueprintsForPathSize(pathSize);
  const theoryText = theoryDescriptionFromChapter(
    owned.chapter.title,
    owned.chapter.contentSummary,
    owned.chapter.content,
  );
  let drafted = blueprints.map((node) => ({
    ...node,
    description: node.nodeType === "summary_read" ? theoryText : node.description,
    isGenerated: false,
  }));
  if (options?.ai !== false && hasAiProvider()) {
    try {
      const isShort = pathSize === "short";
      const typeOrder = blueprints.map((b) => b.nodeType).join(", ");
      const { object } = await generateObjectWithCredits({
        schema: isShort ? pathNodeSchemaShort : pathNodeSchemaLong,
        maxOutputTokens: isShort ? 900 : 1400,
        prompt: [
          `Собери ${blueprints.length} узла урока по главе, строго в таком порядке типов: ${typeOrder}.`,
          "Первый узел summary_read — теория: в description положи краткую выжимку главы (2–4 коротких предложения или 2–3 пункта через перевод строки), без вопросов и без спойлеров сюжета.",
          "Остальные узлы — практика: короткие названия и описания шагов на языке главы.",
          `Книга: ${owned.bookTitle}`,
          `Глава: ${owned.chapter.title}`,
          clipAiPromptText(owned.chapter.contentSummary || owned.chapter.content, AI_PROMPT_CLIP.pathChapter),
        ].join("\n\n"),
      });
      // Force stable chapter chain order; practice_review is never part of this list.
      drafted = blueprints.map((blueprint, index) => {
        const aiNode =
          object.nodes.find((node) => node.nodeType === blueprint.nodeType) ?? object.nodes[index];
        const rawDescription = aiNode?.description ?? blueprint.description;
        const description =
          blueprint.nodeType === "summary_read" && rawDescription.length < 40
            ? theoryText
            : rawDescription;
        return {
          nodeType: blueprint.nodeType,
          title: aiNode?.title ?? blueprint.title,
          description: description || theoryText,
          xpReward: blueprint.xpReward,
          isGenerated: true,
        };
      });
    } catch {
      drafted = blueprints.map((node) => ({
        ...node,
        description: node.nodeType === "summary_read" ? theoryText : node.description,
        isGenerated: false,
      }));
    }
  }

  const unlocked = await previousChapterCleared(owned.chapter.bookId, owned.chapter.chapterIndex, userId);
  const inserted = await getDb().insert(lessonNodes).values(drafted.map((node, orderIndex) => ({
    chapterId,
    title: node.title,
    description: node.description,
    nodeType: node.nodeType,
    orderIndex,
    xpReward: node.xpReward,
    isGenerated: node.isGenerated,
  }))).onConflictDoNothing({
    target: [lessonNodes.chapterId, lessonNodes.orderIndex],
  }).returning();

  const nodes = await getDb()
    .select()
    .from(lessonNodes)
    .where(eq(lessonNodes.chapterId, chapterId))
    .orderBy(asc(lessonNodes.orderIndex));

  if (inserted.length > 0) {
    await getDb().insert(userNodeProgress).values(inserted.map((node, index) => ({
      userId,
      nodeId: node.id,
      status: unlocked && index === 0 ? "available" as const : "locked" as const,
    }))).onConflictDoNothing();
  }

  await ensureChapterNodeProgress(nodes, userId, owned.chapter.bookId, owned.chapter.chapterIndex);
  return { ok: true as const, nodes };
}

async function setBookPathStatus(bookId: string, status: BookPathStatus) {
  await getDb()
    .update(books)
    .set({ pathStatus: status, updatedAt: new Date() })
    .where(eq(books.id, bookId));
}

/**
 * Fill / upgrade summary_read descriptions from best chapter substance (no AI).
 * Prefer richer body extract over a short abstract already stored above the gate floor.
 */
async function enrichShortTheoryDescriptions(
  chapters: Array<{
    id: string;
    title: string;
    contentSummary: string;
    content: string;
  }>,
) {
  const db = getDb();
  for (const chapter of chapters) {
    const [theory] = await db
      .select({ id: lessonNodes.id, description: lessonNodes.description })
      .from(lessonNodes)
      .where(and(eq(lessonNodes.chapterId, chapter.id), eq(lessonNodes.nodeType, "summary_read")))
      .orderBy(asc(lessonNodes.orderIndex))
      .limit(1);
    if (!theory) continue;
    const next = theoryDescriptionFromChapter(chapter.title, chapter.contentSummary, chapter.content);
    if (next.trim().length < MIN_ESSENCE_CHARS) continue;
    const current = theory.description.trim();
    // Upgrade when below gate floor, or when body yields a clearly richer essence.
    if (current.length >= MIN_ESSENCE_CHARS && next.trim().length < current.length * 1.5) {
      continue;
    }
    if (next.trim() === current) continue;
    await db.update(lessonNodes).set({ description: next }).where(eq(lessonNodes.id, theory.id));
  }
}

/**
 * Drop practice quiz_cards that fail BE-003 grounding against stored sibling theory.
 * Leaves lesson_nodes and user_node_progress untouched. Empty practice is gate-OK.
 */
async function dropUngroundedPracticeCards(bookId: string, userId: string) {
  const db = getDb();
  const chapters = await db
    .select({ id: bookChapters.id })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId));
  if (chapters.length === 0) return;

  const chapterIds = chapters.map((chapter) => chapter.id);
  const nodes = await db
    .select()
    .from(lessonNodes)
    .where(inArray(lessonNodes.chapterId, chapterIds));

  const dropIds: string[] = [];
  for (const chapterId of chapterIds) {
    const chapterNodes = nodes
      .filter((node) => node.chapterId === chapterId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const theory = chapterNodes.find((node) => node.nodeType === "summary_read");
    const essence = theory?.description.trim() ?? "";
    if (!essence) continue;

    for (const node of chapterNodes) {
      if (node.nodeType === "summary_read") continue;
      const cards = await db
        .select({ id: quizCards.id, contentData: quizCards.contentData })
        .from(quizCards)
        .where(and(eq(quizCards.nodeId, node.id), eq(quizCards.userId, userId)));
      for (const card of cards) {
        const exercise = parseExercise(card.contentData);
        if (!exercise) {
          dropIds.push(card.id);
          continue;
        }
        const grounded = filterGroundedExercises([exercise], essence);
        if (grounded.length === 0) {
          dropIds.push(card.id);
        }
      }
    }
  }

  if (dropIds.length > 0) {
    await db.delete(quizCards).where(inArray(quizCards.id, dropIds));
  }
}

/**
 * Pending/rejected book that already has lesson_nodes: no clear, no AI, no regen.
 * Enrich short theory → drop ungrounded cards → gate → path_status.
 */
export async function reconcileStoredLearningPathGate(bookId: string) {
  const userId = await getCurrentUserId();
  const db = getDb();

  const [book] = await db
    .select({ id: books.id, pathStatus: books.pathStatus })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  if (!book) {
    return { ok: false as const, error: "Книга не найдена" };
  }
  if (book.pathStatus === "approved") {
    // No AI / no regen. Deterministic honesty: empty available practice ≠ «следующий».
    const advanced = await advancePastEmptyAvailablePractice(bookId, userId);
    return {
      ok: true as const,
      status: "approved" as const,
      noop: advanced === 0,
      advanced,
    };
  }

  const chapterRows = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterIndex));
  if (chapterRows.length === 0) {
    return { ok: false as const, error: "В книге нет глав" };
  }

  const chapterIds = chapterRows.map((chapter) => chapter.id);
  const [anyNode] = await db
    .select({ id: lessonNodes.id })
    .from(lessonNodes)
    .where(inArray(lessonNodes.chapterId, chapterIds))
    .limit(1);
  if (!anyNode) {
    return { ok: true as const, status: "pending" as const, empty: true as const };
  }

  await enrichShortTheoryDescriptions(chapterRows);
  await dropUngroundedPracticeCards(bookId, userId);
  // Deterministic honesty only (no AI): empty available practice is not «следующий».
  await advancePastEmptyAvailablePractice(bookId, userId);

  // Progress rows only — do not call generateLearningPathOnFly (may prune nodes).
  for (const chapter of chapterRows) {
    const nodes = await db
      .select()
      .from(lessonNodes)
      .where(eq(lessonNodes.chapterId, chapter.id))
      .orderBy(asc(lessonNodes.orderIndex));
    await ensureChapterNodeProgress(nodes, userId, bookId, chapter.chapterIndex);
  }

  const applied = await applyLearningPathGate(bookId);
  if (!applied.ok) {
    return applied;
  }
  return {
    ok: true as const,
    chapters: chapterRows.length,
    status: applied.status,
    reasons: applied.status === "rejected" ? applied.reasons : undefined,
  };
}

/**
 * Write-once practice persist via deterministic grounded builder only.
 * No hand-written LLM prompt here — `.cursor/tasks/ai-prompts.md` has no practice-card
 * template id; inventing one is disallowed. Empty grounded set is OK (BE-003).
 * Does not touch hearts / progress / nodes.
 */
async function persistPracticeForNode(
  node: LessonNode,
  chapter: { title: string; contentSummary: string; content: string },
  userId: string,
) {
  if (node.nodeType === "summary_read") {
    return;
  }

  const existing = await getDb()
    .select({ id: quizCards.id })
    .from(quizCards)
    .where(and(eq(quizCards.nodeId, node.id), eq(quizCards.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const theoryText = await theoryTextForChapter(node.chapterId, chapter);
  const exercises = buildGroundedExercisesFromTheory(theoryText);

  if (exercises.length > 0) {
    await storeExercises(node.id, userId, exercises);
  }
}

/**
 * BE-006 hole-fix: enrich theory from chapter body, then persist grounded cards
 * for practice nodes that still have zero quiz_cards. Never wipes nodes/progress.
 * Deterministic only (no LLM — missing ai-prompts template for practice cards).
 */
export async function backfillMissingPracticeCards(bookId: string, userId: string) {
  const db = getDb();
  const chapterRows = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterIndex));
  if (chapterRows.length === 0) {
    return { wrote: false, chapters: 0, nodesAttempted: 0 };
  }

  await enrichShortTheoryDescriptions(chapterRows);

  let nodesAttempted = 0;
  let wrote = false;
  for (const chapter of chapterRows) {
    const nodes = await db
      .select()
      .from(lessonNodes)
      .where(eq(lessonNodes.chapterId, chapter.id))
      .orderBy(asc(lessonNodes.orderIndex));
    for (const node of nodes) {
      if (node.nodeType === "summary_read") continue;
      const existing = await db
        .select({ id: quizCards.id })
        .from(quizCards)
        .where(and(eq(quizCards.nodeId, node.id), eq(quizCards.userId, userId)))
        .limit(1);
      if (existing.length > 0) continue;
      nodesAttempted += 1;
      await persistPracticeForNode(node, chapter, userId);
      const after = await db
        .select({ id: quizCards.id })
        .from(quizCards)
        .where(and(eq(quizCards.nodeId, node.id), eq(quizCards.userId, userId)))
        .limit(1);
      if (after.length > 0) {
        wrote = true;
      }
    }
  }

  return { wrote, chapters: chapterRows.length, nodesAttempted };
}

async function unlockNextNodeAfter(userId: string, chapterId: string, orderIndex: number) {
  const db = getDb();
  const [nextInChapter] = await db
    .select()
    .from(lessonNodes)
    .where(and(eq(lessonNodes.chapterId, chapterId), eq(lessonNodes.orderIndex, orderIndex + 1)))
    .limit(1);
  let next = nextInChapter ?? null;
  if (!next) {
    const [chapter] = await db.select().from(bookChapters).where(eq(bookChapters.id, chapterId)).limit(1);
    if (chapter) {
      const [nextChapter] = await db
        .select()
        .from(bookChapters)
        .where(
          and(eq(bookChapters.bookId, chapter.bookId), eq(bookChapters.chapterIndex, chapter.chapterIndex + 1)),
        )
        .limit(1);
      if (nextChapter) {
        const [first] = await db
          .select()
          .from(lessonNodes)
          .where(and(eq(lessonNodes.chapterId, nextChapter.id), eq(lessonNodes.orderIndex, 0)))
          .limit(1);
        next = first ?? null;
      }
    }
  }
  if (!next) return;
  await db
    .update(userNodeProgress)
    .set({ status: "available" })
    .where(
      and(
        eq(userNodeProgress.userId, userId),
        eq(userNodeProgress.nodeId, next.id),
        eq(userNodeProgress.status, "locked"),
      ),
    );
}

/**
 * Available practice with zero grounded cards must not stay the playable «следующий».
 * Completes empty practice without XP and unlocks the next node (no new status enum).
 */
async function advancePastEmptyAvailablePractice(bookId: string, userId: string) {
  const db = getDb();
  let advanced = 0;
  for (let guard = 0; guard < 200; guard += 1) {
    const [target] = await db
      .select({
        id: lessonNodes.id,
        chapterId: lessonNodes.chapterId,
        orderIndex: lessonNodes.orderIndex,
      })
      .from(lessonNodes)
      .innerJoin(bookChapters, eq(bookChapters.id, lessonNodes.chapterId))
      .innerJoin(
        userNodeProgress,
        and(
          eq(userNodeProgress.nodeId, lessonNodes.id),
          eq(userNodeProgress.userId, userId),
          eq(userNodeProgress.status, "available"),
        ),
      )
      .leftJoin(
        quizCards,
        and(eq(quizCards.nodeId, lessonNodes.id), eq(quizCards.userId, userId)),
      )
      .where(and(eq(bookChapters.bookId, bookId), ne(lessonNodes.nodeType, "summary_read"), isNull(quizCards.id)))
      .orderBy(asc(bookChapters.chapterIndex), asc(lessonNodes.orderIndex))
      .limit(1);
    if (!target) break;

    await db
      .update(userNodeProgress)
      .set({ status: "completed", score: 0, completedAt: new Date() })
      .where(and(eq(userNodeProgress.userId, userId), eq(userNodeProgress.nodeId, target.id)));
    await unlockNextNodeAfter(userId, target.chapterId, target.orderIndex);
    advanced += 1;
  }
  return advanced;
}

/**
 * BE-006: write-once path build (nodes + theory description + practice quiz_cards).
 * Approved with complete practice → no-op. Approved/pending with missing practice cards
 * → backfill grounded cards (deterministic ± AI) without wiping nodes/progress.
 * Empty book → generate once + persist + gate. Failures stay not-approved.
 */
export async function ensureFullLearningPath(bookId: string) {
  const userId = await getCurrentUserId();
  const db = getDb();

  const [book] = await db
    .select({ id: books.id, pathStatus: books.pathStatus })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  if (!book) {
    return { ok: false as const, error: "Книга не найдена" };
  }

  const chapterRows = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterIndex));

  if (chapterRows.length === 0) {
    return { ok: false as const, error: "В книге нет глав" };
  }

  const chapterIds = chapterRows.map((chapter) => chapter.id);
  const [anyNode] = await db
    .select({ id: lessonNodes.id })
    .from(lessonNodes)
    .where(inArray(lessonNodes.chapterId, chapterIds))
    .limit(1);

  if (book.pathStatus === "approved" && anyNode) {
    const backfill = await backfillMissingPracticeCards(bookId, userId);
    const advanced = await advancePastEmptyAvailablePractice(bookId, userId);
    if (!backfill.wrote && backfill.nodesAttempted === 0 && advanced === 0) {
      return {
        ok: true as const,
        chapters: chapterRows.length,
        status: "approved" as const,
        noop: true,
      };
    }
    return {
      ok: true as const,
      chapters: chapterRows.length,
      status: "approved" as const,
      backfilled: backfill.wrote,
      nodesAttempted: backfill.nodesAttempted,
      advanced,
    };
  }

  // Already-built path stuck at pending/rejected: fill practice then gate — never wipe nodes.
  if (anyNode) {
    const backfill = await backfillMissingPracticeCards(bookId, userId);
    const reconciled = await reconcileStoredLearningPathGate(bookId);
    if (!reconciled.ok) {
      return reconciled;
    }
    return {
      ...reconciled,
      backfilled: backfill.wrote,
      nodesAttempted: backfill.nodesAttempted,
    };
  }

  await setBookPathStatus(bookId, "pending");

  try {
    for (const chapter of chapterRows) {
      const result = await generateLearningPathOnFly(chapter.id, { ai: true });
      if (!result.ok) {
        await setBookPathStatus(bookId, "pending");
        return result;
      }
      for (const node of result.nodes) {
        await persistPracticeForNode(node, chapter, userId);
      }
    }
  } catch {
    await setBookPathStatus(bookId, "pending");
    return { ok: false as const, error: "Не удалось собрать тропу. Попробуйте ещё раз." };
  }

  await advancePastEmptyAvailablePractice(bookId, userId);

  const applied = await applyLearningPathGate(bookId);
  if (!applied.ok) {
    await setBookPathStatus(bookId, "pending");
    return { ok: false as const, error: applied.error };
  }

  return {
    ok: true as const,
    chapters: chapterRows.length,
    status: applied.status,
    reasons: applied.status === "rejected" ? applied.reasons : undefined,
  };
}

/** Ensure progress rows exist; unlock first node when previous chapter is cleared. */
async function ensureChapterNodeProgress(
  nodes: LessonNode[],
  userId: string,
  bookId: string,
  chapterIndex: number,
) {
  if (nodes.length === 0) {
    return;
  }

  const db = getDb();
  const nodeIds = nodes.map((node) => node.id);
  const existingProgress = await db
    .select()
    .from(userNodeProgress)
    .where(and(eq(userNodeProgress.userId, userId), inArray(userNodeProgress.nodeId, nodeIds)));

  const unlocked = await previousChapterCleared(bookId, chapterIndex, userId);
  const ordered = [...nodes].sort((left, right) => left.orderIndex - right.orderIndex);
  const firstId = ordered[0]?.id;

  const missing = nodes.filter((node) => !existingProgress.some((row) => row.nodeId === node.id));
  if (missing.length > 0) {
    await db.insert(userNodeProgress).values(
      missing.map((node) => ({
        userId,
        nodeId: node.id,
        status: unlocked && node.id === firstId ? ("available" as const) : ("locked" as const),
      })),
    ).onConflictDoNothing();
  }

  if (unlocked && firstId) {
    await db
      .update(userNodeProgress)
      .set({ status: "available" })
      .where(and(
        eq(userNodeProgress.userId, userId),
        eq(userNodeProgress.nodeId, firstId),
        eq(userNodeProgress.status, "locked"),
      ));
  }
}

async function storeExercises(nodeId: string, userId: string, exercises: Exercise[]) {
  const empty = newFsrsCard();
  const rows = await getDb().insert(quizCards).values(exercises.map((exercise) => ({
    nodeId,
    userId,
    type: "multiple_choice" as const,
    exerciseType: exercise.type,
    contentData: exercise,
    question: exercise.prompt,
    options: exercise.type === "multiple_choice" ? exercise.options : null,
    answer: canonicalAnswer(exercise),
    explanation: exercise.explanation,
    due: empty.due,
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    lastReview: empty.last_review ?? null,
  }))).returning();
  return rows;
}

/**
 * BE-006: read-only lesson content (SELECT lesson_nodes + quiz_cards + progress).
 * Zero AI / generateObjectWithCredits on this path. Alias: getLessonContent.
 */
export async function generateLessonContentOnFly(nodeId: string) {
  return getLessonContent(nodeId);
}

/** Read-only lesson loader — same return shape as the former on-fly generator. */
export async function getLessonContent(nodeId: string) {
  const userId = await getCurrentUserId();
  // One JOIN: node + owned chapter + path_status + progress (was 4 sequential round-trips).
  const [row] = await getDb()
    .select({
      node: lessonNodes,
      chapter: bookChapters,
      pathStatus: books.pathStatus,
      progressStatus: userNodeProgress.status,
    })
    .from(lessonNodes)
    .innerJoin(bookChapters, eq(bookChapters.id, lessonNodes.chapterId))
    .innerJoin(books, eq(books.id, bookChapters.bookId))
    .leftJoin(
      userNodeProgress,
      and(eq(userNodeProgress.nodeId, lessonNodes.id), eq(userNodeProgress.userId, userId)),
    )
    .where(and(eq(lessonNodes.id, nodeId), eq(books.userId, userId)))
    .limit(1);

  if (!row) {
    return { ok: false as const, error: "Урок не найден" };
  }
  // BE-009: same playable rule as getLearningPath — only rejected blocks; pending + nodes OK.
  if (row.pathStatus === "rejected") {
    return { ok: false as const, error: "Тропа ещё не готова" };
  }
  if (row.progressStatus === "locked") {
    return { ok: false as const, error: "Урок ещё закрыт" };
  }

  // RFC-003: expose progress so the lesson page can set heartsCharged.
  const node = row.node;
  const nodeStatus = row.progressStatus ?? "available";
  const chapterTitle = row.chapter.title;

  if (node.nodeType === "summary_read") {
    const description = node.description?.trim() ?? "";
    const summary = row.chapter.contentSummary?.trim() ?? "";
    const content = row.chapter.content?.trim() ?? "";
    const descriptionLooksLikeExtract = description.includes("\n") || description.length > 80;
    const theorySource = descriptionLooksLikeExtract
      ? description
      : (summary || content || description || row.chapter.title);
    // Cheap EXISTS instead of getLearningPath (full 104-node JOIN) for hasPracticeAhead.
    const [practice] = await getDb()
      .select({ id: lessonNodes.id })
      .from(lessonNodes)
      .where(and(eq(lessonNodes.chapterId, node.chapterId), ne(lessonNodes.nodeType, "summary_read")))
      .limit(1);
    return {
      ok: true as const,
      node,
      nodeStatus,
      cards: [] as { id: string; exercise: Exercise }[],
      theoryCards: buildTheoryCards(theorySource),
      chapterTitle,
      hasPracticeAhead: Boolean(practice),
    };
  }

  const stored = await getDb()
    .select()
    .from(quizCards)
    .where(and(eq(quizCards.nodeId, nodeId), eq(quizCards.userId, userId)))
    .orderBy(asc(quizCards.createdAt));
  const ready = stored.flatMap((card) => {
    const exercise = parseExercise(card.contentData);
    return exercise ? [{ id: card.id, exercise }] : [];
  });

  return {
    ok: true as const,
    node,
    nodeStatus,
    cards: ready,
    theoryCards: [] as string[],
    chapterTitle,
    hasPracticeAhead: false,
  };
}

export async function generatePracticeLesson(userId: string) {
  const current = await getCurrentUserId();
  if (current !== userId) {
    return { ok: false as const, error: "Чужой аккаунт" };
  }

  const rows = await getDb()
    .select()
    .from(quizCards)
    .where(and(eq(quizCards.userId, userId), isNotNull(quizCards.nodeId)))
    .orderBy(desc(quizCards.lapses), desc(quizCards.createdAt))
    .limit(8);

  const cards = rows.flatMap((card) => {
    const exercise = parseExercise(card.contentData);
    return exercise ? [{ id: card.id, exercise }] : [];
  }).slice(0, 4);

  if (cards.length < 3) {
    return { ok: false as const, error: "Пока не из чего собрать практику. Сначала пройдите урок." };
  }
  return { ok: true as const, cards };
}

export type StoredLessonNode = LessonNode;
