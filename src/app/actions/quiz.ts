"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { generateObjectWithCredits, hasAiProvider } from "@/lib/ai";
import { notes, quizCards, reviewLogs } from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { newFsrsCard, ratingLabels, scheduleReview, toFsrsCard, type RatingKey } from "@/lib/fsrs";
import { generatedQuizSchema, sanitizeGeneratedQuiz } from "@/lib/quiz-schema";
import { recordQuizAttempt } from "@/lib/gamification";
import { removeNullBytes } from "@/lib/utils";

export async function generateQuestionsForNote(noteId: string) {
  const cleanNoteId = removeNullBytes(noteId);
  const userId = await getCurrentUserId();
  const [note] = await getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.id, cleanNoteId), eq(notes.userId, userId)))
    .limit(1);

  if (!note) {
    return { ok: false as const, error: "Заметка не найдена" };
  }

  if (note.content.trim().length < 8) {
    return { ok: false as const, error: "Сначала напишите чуть больше текста в заметке." };
  }

  if (!hasAiProvider()) {
    return { ok: false as const, error: "Нет ключа Gemini, Groq или OpenRouter в .env.local" };
  }

  let object;
  try {
    ({ object } = await generateObjectWithCredits({
      schema: generatedQuizSchema,
      maxOutputTokens: 3500,
      prompt: [
        "Сгенерируй вопросы викторины по заметке на языке заметки.",
        "Смешай вопросы с выбором варианта и короткие открытые.",
        "Открытый ответ — одно–три слова: термин, число или короткая формула, не предложение.",
        "Для multiple_choice варианты тоже короткие, до 8 слов. В answer укажи точный текст правильного варианта.",
        "Для open_ended укажи options: null; если объяснение не нужно, укажи explanation: null.",
        `Заголовок: ${note.title}`,
        `Содержание:\n${note.content}`,
      ].join("\n\n"),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("no credits") || message.includes("credits") || message.includes("billing") || message.includes("quota")) {
      return { ok: false as const, error: "У Gemini, Groq и OpenRouter сейчас нет доступного лимита." };
    }
    return { ok: false as const, error: "Не удалось сгенерировать вопросы. Попробуйте ещё раз." };
  }

  const cleanQuiz = sanitizeGeneratedQuiz(object);
  const empty = newFsrsCard();
  await getDb().insert(quizCards).values(
    cleanQuiz.questions.map((question) => ({
      noteId: note.id,
      userId,
      type: question.type,
      question: question.question,
      options: question.type === "multiple_choice" ? (question.options ?? []) : null,
      answer: question.answer,
      explanation: question.explanation,
      due: empty.due,
      stability: empty.stability,
      difficulty: empty.difficulty,
      elapsedDays: empty.elapsed_days,
      scheduledDays: empty.scheduled_days,
      reps: empty.reps,
      lapses: empty.lapses,
      state: empty.state,
      lastReview: empty.last_review ?? null,
    })),
  );

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath(`/notes/${cleanNoteId}`);
  return { ok: true as const, count: cleanQuiz.questions.length };
}

export async function rateCard(cardId: string, ratingKey: RatingKey) {
  const cleanCardId = removeNullBytes(cardId);
  const cleanRatingKey = removeNullBytes(ratingKey);
  if (!Object.prototype.hasOwnProperty.call(ratingLabels, cleanRatingKey)) {
    return { ok: false as const, error: "Оценка неизвестна" };
  }
  const rating = ratingLabels[cleanRatingKey as RatingKey];
  const userId = await getCurrentUserId();
  const [card] = await getDb()
    .select()
    .from(quizCards)
    .where(and(eq(quizCards.id, cleanCardId), eq(quizCards.userId, userId)))
    .limit(1);

  if (!card) {
    return { ok: false as const, error: "Карточка не найдена" };
  }

  const now = new Date();
  const result = scheduleReview(toFsrsCard(card), rating, now);
  const next = result.card;

  await getDb()
    .update(quizCards)
    .set({
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: next.elapsed_days,
      scheduledDays: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      lastReview: next.last_review ?? now,
    })
    .where(eq(quizCards.id, cleanCardId));

  await getDb().insert(reviewLogs).values({
    cardId: cleanCardId,
    userId,
    rating,
    state: next.state,
    reviewedAt: now,
  });

  revalidatePath("/");
  revalidatePath("/review");
  return { ok: true as const };
}

export async function completeQuizAttempt({
  noteId,
  totalQuestions,
  correctAnswers,
}: {
  noteId?: string;
  totalQuestions: number;
  correctAnswers: number;
}) {
  const cleanNoteId = noteId === undefined ? undefined : removeNullBytes(noteId);
  const userId = await getCurrentUserId();
  const result = await recordQuizAttempt({
    userId,
    noteId: cleanNoteId,
    totalQuestions,
    correctAnswers,
  });
  revalidatePath("/");
  revalidatePath("/review");
  return { ok: true as const, ...result };
}

export async function clearNoteQuiz(noteId: string) {
  const cleanNoteId = removeNullBytes(noteId);
  const userId = await getCurrentUserId();
  await getDb()
    .delete(quizCards)
    .where(and(eq(quizCards.noteId, cleanNoteId), eq(quizCards.userId, userId)));
  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath(`/notes/${cleanNoteId}`);
}

export async function clearReviewCards() {
  const userId = await getCurrentUserId();
  await getDb().delete(quizCards).where(eq(quizCards.userId, userId));
  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/notes");
}
