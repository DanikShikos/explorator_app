import { z } from "zod";
import { removeNullBytes } from "./utils";

export const quizQuestionSchema = z.object({
  type: z.enum(["multiple_choice", "open_ended"]),
  question: z.string().min(1),
  options: z.array(z.string().max(80)).min(2).max(6).nullable(),
  answer: z.string().min(1).max(40),
  explanation: z.string().nullable(),
}).superRefine((question, context) => {
  if (question.type === "open_ended" && question.answer.trim().split(/\s+/).length > 4) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["answer"],
      message: "Открытый ответ должен быть не длиннее четырёх слов",
    });
  }
  if (question.type === "multiple_choice") {
    if (!question.options || !question.options.includes(question.answer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "Ответ multiple_choice должен совпадать с одним из options",
      });
    }
  }
});

export const generatedQuizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(12),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

/**
 * Strip null bytes and revalidate. Never throws — returns null when
 * cleaned text collapses to an empty/invalid quiz.
 */
export function sanitizeGeneratedQuiz(quiz: GeneratedQuiz): GeneratedQuiz | null {
  const cleaned = {
    questions: quiz.questions.map((question) => ({
      ...question,
      question: removeNullBytes(question.question),
      options: question.options?.map(removeNullBytes) ?? null,
      answer: removeNullBytes(question.answer),
      explanation: question.explanation === null ? null : removeNullBytes(question.explanation),
    })),
  };

  const validQuestions = cleaned.questions.filter(
    (question) => quizQuestionSchema.safeParse(question).success,
  );
  if (validQuestions.length === 0) {
    return null;
  }

  const parsed = generatedQuizSchema.safeParse({ questions: validQuestions });
  return parsed.success ? parsed.data : null;
}
