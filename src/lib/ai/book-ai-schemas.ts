import { z } from "zod";

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
