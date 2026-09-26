import { z } from "zod";
import { removeNullBytes } from "./utils";

export const quizQuestionSchema = z.object({
  type: z.enum(["multiple_choice", "open_ended"]),
  question: z.string().min(1),
  options: z.array(z.string()).min(2).max(6).nullable(),
  answer: z.string().min(1),
  explanation: z.string().nullable(),
});

export const generatedQuizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(12),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

export function sanitizeGeneratedQuiz(quiz: GeneratedQuiz): GeneratedQuiz {
  return generatedQuizSchema.parse({
    questions: quiz.questions.map((question) => ({
      ...question,
      question: removeNullBytes(question.question),
      options: question.options?.map(removeNullBytes) ?? null,
      answer: removeNullBytes(question.answer),
      explanation: question.explanation === null ? null : removeNullBytes(question.explanation),
    })),
  });
}
