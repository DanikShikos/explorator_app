import { z } from "zod";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
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
import { newFsrsCard } from "@/lib/fsrs";
import { removeNullBytes } from "@/lib/utils";

const chapterSummarySchema = z.object({
  chapterIndex: z.number().int().nonnegative(),
  contentSummary: z.string().min(1),
});

export const bookSummarySchema = z.object({
  executiveSummary: z.string().min(1),
  practicalRules: z.array(z.string().min(1)).min(3).max(8),
  chapters: z.array(chapterSummarySchema).min(1).max(20),
});

export const recallQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1).max(80)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const recallQuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(recallQuestionSchema).min(5).max(10),
});

export type BookSummary = z.infer<typeof bookSummarySchema>;
export type RecallQuiz = z.infer<typeof recallQuizSchema>;

export type ChapterSource = {
  chapterIndex: number;
  title: string;
  content: string;
};

function clip(text: string, max: number) {
  const clean = removeNullBytes(text).trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

function sourceBlock(chapters: ChapterSource[]) {
  return chapters
    .slice(0, 12)
    .map((chapter) => `Глава ${chapter.chapterIndex}. ${chapter.title}\n${clip(chapter.content, 3500)}`)
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

const pathNodeSchema = z.object({
  nodes: z.array(z.object({
    nodeType: z.enum(["summary_read", "quiz_sprint", "flashcard_review", "boss_challenge"]),
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(520),
  })).length(4),
});

const nodeBlueprints = [
  { nodeType: "summary_read" as const, title: "Суть главы", description: "Короткие карточки с главной мыслью.", xpReward: 15 },
  { nodeType: "quiz_sprint" as const, title: "Спринт", description: "Несколько быстрых вопросов по главе.", xpReward: 20 },
  { nodeType: "flashcard_review" as const, title: "Закрепление", description: "Пары, пропуски и порядок идей.", xpReward: 20 },
  { nodeType: "boss_challenge" as const, title: "Испытание", description: "Смешанные задания на применение.", xpReward: 40 },
];

/** Short friendly theory snippets for summary_read nodes (2–3 cards). */
export function buildTheoryCards(source: string): string[] {
  const clean = removeNullBytes(source).replace(/\s+/g, " ").trim();
  if (!clean) {
    return ["Пока нет краткой выжимки — вернись к книге и собери материалы ещё раз."];
  }

  const bulletLines = removeNullBytes(source)
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length >= 18);

  if (bulletLines.length >= 2) {
    return bulletLines.slice(0, 3).map((line) => clip(line, 220));
  }

  const sentences = clean.match(/[^.!?…]+[.!?…]?/g)?.map((part) => part.trim()).filter((part) => part.length >= 24) ?? [];
  if (sentences.length >= 2) {
    return sentences.slice(0, 3).map((line) => clip(line, 220));
  }

  const chunk = clip(clean, 420);
  if (chunk.length <= 160) {
    return [chunk];
  }
  const mid = Math.floor(chunk.length / 2);
  const splitAt = chunk.indexOf(" ", mid);
  if (splitAt > 40) {
    return [chunk.slice(0, splitAt).trim(), chunk.slice(splitAt).trim()].filter(Boolean);
  }
  return [chunk];
}

function theoryDescriptionFromChapter(title: string, summary: string, content: string) {
  const cards = buildTheoryCards(summary || content || title);
  return cards.join("\n\n");
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

function fallbackExercises(title: string): Exercise[] {
  return [
    {
      type: "multiple_choice",
      prompt: `О чём глава «${title}»?`,
      options: [title, "Случайная дата", "Имя автора", "Номер страницы"],
      correctIndex: 0,
      pairs: null,
      sentence: null,
      answer: null,
      steps: null,
      explanation: "Верный вариант называет тему главы.",
    },
    {
      type: "fill_blank",
      prompt: "Вставьте тему главы.",
      options: null,
      correctIndex: null,
      pairs: null,
      sentence: "Эта глава про ____.",
      answer: title.slice(0, 40),
      steps: null,
      explanation: `Нужно было указать: ${title}.`,
    },
    {
      type: "matching_pairs",
      prompt: "Соедините идею и главу.",
      options: null,
      correctIndex: null,
      pairs: [
        { left: "Тема", right: title.slice(0, 40) },
        { left: "Формат", right: "Короткий урок" },
        { left: "Цель", right: "Применить мысль" },
      ],
      sentence: null,
      answer: null,
      steps: null,
      explanation: "Каждая левая карточка совпадает с правой по смыслу урока.",
    },
    {
      type: "sequence_order",
      prompt: "В каком порядке идёт урок?",
      options: null,
      correctIndex: null,
      pairs: null,
      sentence: null,
      answer: null,
      steps: ["Прочитать суть", "Ответить", "Проверить себя"],
      explanation: "Сначала суть, потом ответ, затем проверка.",
    },
    {
      type: "multiple_choice",
      prompt: "Что делать с ошибкой в уроке?",
      options: ["Потерять сердце", "Купить сердце за очки", "Пропустить главу", "Закрыть книгу"],
      correctIndex: 0,
      pairs: null,
      sentence: null,
      answer: null,
      steps: null,
      explanation: "Ошибка снимает одну жизнь. Сердце возвращает практика или таймер.",
    },
  ];
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

  const existing = await getDb()
    .select()
    .from(lessonNodes)
    .where(eq(lessonNodes.chapterId, chapterId))
    .orderBy(asc(lessonNodes.orderIndex));
  if (existing.length > 0) {
    await ensureChapterNodeProgress(
      existing,
      userId,
      owned.chapter.bookId,
      owned.chapter.chapterIndex,
    );
    return { ok: true as const, nodes: existing };
  }

  const theoryText = theoryDescriptionFromChapter(
    owned.chapter.title,
    owned.chapter.contentSummary,
    owned.chapter.content,
  );
  let drafted = nodeBlueprints.map((node) => ({
    ...node,
    description: node.nodeType === "summary_read" ? theoryText : node.description,
    isGenerated: false,
  }));
  if (options?.ai !== false && hasAiProvider()) {
    try {
      const { object } = await generateObjectWithCredits({
        schema: pathNodeSchema,
        maxOutputTokens: 1400,
        prompt: [
          "Собери 4 узла урока по главе, строго в таком порядке типов: summary_read, quiz_sprint, flashcard_review, boss_challenge.",
          "Первый узел summary_read — теория: в description положи краткую выжимку главы (2–4 коротких предложения или 2–3 пункта через перевод строки), без вопросов и без спойлеров сюжета.",
          "Остальные узлы — практика: короткие названия и описания шагов на языке главы.",
          `Книга: ${owned.bookTitle}`,
          `Глава: ${owned.chapter.title}`,
          clip(owned.chapter.contentSummary || owned.chapter.content, 2500),
        ].join("\n\n"),
      });
      // Force stable chapter chain order; practice_review is never part of this list.
      drafted = nodeBlueprints.map((blueprint, index) => {
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
      drafted = nodeBlueprints.map((node) => ({
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
  }))).returning();

  await getDb().insert(userNodeProgress).values(inserted.map((node, index) => ({
    userId,
    nodeId: node.id,
    status: unlocked && index === 0 ? "available" as const : "locked" as const,
  }))).onConflictDoNothing();

  return { ok: true as const, nodes: inserted };
}

export async function ensureFullLearningPath(bookId: string) {
  const userId = await getCurrentUserId();
  const chapters = await getDb()
    .select({ id: bookChapters.id })
    .from(bookChapters)
    .innerJoin(books, eq(books.id, bookChapters.bookId))
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .orderBy(asc(bookChapters.chapterIndex));

  if (chapters.length === 0) {
    return { ok: false as const, error: "В книге нет глав" };
  }

  for (const chapter of chapters) {
    const result = await generateLearningPathOnFly(chapter.id, { ai: false });
    if (!result.ok) {
      return result;
    }
  }

  return { ok: true as const, chapters: chapters.length };
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

export async function generateLessonContentOnFly(nodeId: string) {
  const userId = await getCurrentUserId();
  const [node] = await getDb().select().from(lessonNodes).where(eq(lessonNodes.id, nodeId)).limit(1);
  if (!node) {
    return { ok: false as const, error: "Урок не найден" };
  }
  const owned = await chapterForUser(node.chapterId, userId);
  if (!owned) {
    return { ok: false as const, error: "Урок не найден" };
  }
  const [progress] = await getDb()
    .select()
    .from(userNodeProgress)
    .where(and(eq(userNodeProgress.nodeId, nodeId), eq(userNodeProgress.userId, userId)))
    .limit(1);
  if (progress?.status === "locked") {
    return { ok: false as const, error: "Урок ещё закрыт" };
  }

  if (node.nodeType === "summary_read") {
    const description = node.description?.trim() ?? "";
    const summary = owned.chapter.contentSummary?.trim() ?? "";
    const content = owned.chapter.content?.trim() ?? "";
    const descriptionLooksLikeExtract = description.includes("\n") || description.length > 80;
    const theorySource = descriptionLooksLikeExtract
      ? description
      : (summary || content || description || owned.chapter.title);
    return {
      ok: true as const,
      node,
      cards: [] as { id: string; exercise: Exercise }[],
      theoryCards: buildTheoryCards(theorySource),
      chapterTitle: owned.chapter.title,
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
  if (ready.length >= 5) {
    return { ok: true as const, node, cards: ready, theoryCards: [] as string[], chapterTitle: owned.chapter.title };
  }

  let exercises = fallbackExercises(owned.chapter.title);
  if (hasAiProvider()) {
    try {
      const { object } = await generateObjectWithCredits({
        schema: exerciseListSchema,
        maxOutputTokens: 3500,
        prompt: [
          "Собери 5–6 коротких упражнений по главе. Смешай типы: multiple_choice, matching_pairs, fill_blank, sequence_order.",
          "Для multiple_choice ровно 4 коротких options и correctIndex с нуля. Остальные поля этих типов — null.",
          "Для matching_pairs 3 пары left/right. Для fill_blank answer — одно-три слова, sentence содержит ____.",
          "Для sequence_order steps уже в правильном порядке. explanation — одна фраза, почему ответ верный.",
          `Урок: ${node.title}. Тип: ${node.nodeType}.`,
          `Глава: ${owned.chapter.title}`,
          clip(owned.chapter.contentSummary || owned.chapter.content, 3000),
        ].join("\n\n"),
      });
      exercises = object.exercises;
    } catch {
      exercises = fallbackExercises(owned.chapter.title);
    }
  }

  if (stored.length > 0) {
    await getDb().delete(quizCards).where(and(eq(quizCards.nodeId, nodeId), eq(quizCards.userId, userId)));
  }
  const rows = await storeExercises(nodeId, userId, exercises);
  return {
    ok: true as const,
    node,
    cards: rows.flatMap((card, index) => {
      const exercise = exercises[index];
      return exercise ? [{ id: card.id, exercise }] : [];
    }),
    theoryCards: [] as string[],
    chapterTitle: owned.chapter.title,
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
