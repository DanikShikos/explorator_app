"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { bookChapters, books, flashcards, quizQuestions, quizzes } from "@/db/schema";
import { createRecallQuiz, formatOverallSummary, summarizeBook } from "@/lib/ai/book-processor";
import { getCurrentUserId } from "@/lib/current-user";
import { recordQuizAttempt } from "@/lib/gamification";
import { BOOK_AI_LIMIT, consumeRateLimit } from "@/lib/security/rate-limit";
import { removeNullBytes } from "@/lib/utils";

export async function generateBookMaterials(bookId: string) {
  const cleanBookId = removeNullBytes(bookId);
  const userId = await getCurrentUserId();
  const db = getDb();
  const [book] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, cleanBookId), eq(books.userId, userId)))
    .limit(1);

  if (!book) {
    return { ok: false as const, error: "Книга не найдена" };
  }

  const chapters = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, book.id))
    .orderBy(bookChapters.chapterIndex);

  if (chapters.length === 0) {
    return { ok: false as const, error: "В книге нет глав для разбора" };
  }

  const limit = await consumeRateLimit(
    "book-ai",
    userId,
    BOOK_AI_LIMIT.limit,
    BOOK_AI_LIMIT.windowSec,
  );
  if (!limit.ok) {
    return { ok: false as const, error: limit.error };
  }

  const summary = await summarizeBook(
    book.title,
    chapters.map((chapter) => ({
      chapterIndex: chapter.chapterIndex,
      title: chapter.title,
      content: chapter.content,
    })),
  );
  if (!summary.ok) {
    return summary;
  }

  const quiz = await createRecallQuiz(book.title, summary.summary);
  if (!quiz.ok) {
    return quiz;
  }

  await db
    .update(books)
    .set({ overallSummary: formatOverallSummary(summary.summary), updatedAt: new Date() })
    .where(eq(books.id, book.id));

  for (const chapter of chapters) {
    const match = summary.summary.chapters.find((item) => item.chapterIndex === chapter.chapterIndex);
    if (!match) continue;
    await db
      .update(bookChapters)
      .set({ contentSummary: match.contentSummary })
      .where(eq(bookChapters.id, chapter.id));
  }

  const [savedQuiz] = await db
    .insert(quizzes)
    .values({ bookId: book.id, title: quiz.quiz.title })
    .returning({ id: quizzes.id });

  await db.insert(quizQuestions).values(
    quiz.quiz.questions.map((question, orderIndex) => ({
      quizId: savedQuiz.id,
      bookId: book.id,
      question: question.question,
      options: question.options,
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
      orderIndex,
    })),
  );

  await db.insert(flashcards).values(
    summary.summary.practicalRules.map((rule) => ({
      bookId: book.id,
      userId,
      front: rule.length > 90 ? `${rule.slice(0, 87)}…` : rule,
      back: rule,
    })),
  );

  revalidatePath(`/books/${book.id}`);
  revalidatePath("/books");
  return { ok: true as const, quizId: savedQuiz.id, questions: quiz.quiz.questions.length };
}

export async function submitBookQuiz(quizId: string, answers: number[]) {
  const cleanQuizId = removeNullBytes(quizId);
  const userId = await getCurrentUserId();
  const db = getDb();
  const [quiz] = await db
    .select({ id: quizzes.id, bookId: quizzes.bookId })
    .from(quizzes)
    .innerJoin(books, eq(books.id, quizzes.bookId))
    .where(and(eq(quizzes.id, cleanQuizId), eq(books.userId, userId)))
    .limit(1);

  if (!quiz) {
    return { ok: false as const, error: "Тест не найден" };
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(quizQuestions.orderIndex);

  const correctAnswers = questions.filter((question, index) => answers[index] === question.correctAnswerIndex).length;
  const result = await recordQuizAttempt({
    userId,
    quizId: quiz.id,
    totalQuestions: questions.length,
    correctAnswers,
  });

  revalidatePath(`/books/${quiz.bookId}`);
  revalidatePath("/profile");
  revalidatePath("/books");
  return {
    ok: true as const,
    score: result.score,
    correctAnswers,
    totalQuestions: questions.length,
    xpEarned: result.xpEarned,
    streakCount: result.streakCount,
    explanations: questions.map((question) => ({
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
    })),
  };
}

export async function clearBookQuiz(bookId: string) {
  const cleanBookId = removeNullBytes(bookId);
  const userId = await getCurrentUserId();
  const [book] = await getDb()
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, cleanBookId), eq(books.userId, userId)))
    .limit(1);

  if (!book) {
    return { ok: false as const, error: "Книга не найдена" };
  }

  await getDb().delete(quizzes).where(eq(quizzes.bookId, book.id));
  revalidatePath(`/books/${book.id}`);
  revalidatePath("/books");
  return { ok: true as const };
}
