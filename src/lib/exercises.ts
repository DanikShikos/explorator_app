import { z } from "zod";
import { answersMatch } from "./answers";

export const exerciseTypes = ["multiple_choice", "matching_pairs", "fill_blank", "sequence_order"] as const;

export const exerciseSchema = z
  .object({
    type: z.enum(exerciseTypes),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1).max(80)).length(4).nullable(),
    correctIndex: z.number().int().min(0).max(3).nullable(),
    pairs: z.array(z.object({ left: z.string().min(1).max(80), right: z.string().min(1).max(80) })).min(3).max(4).nullable(),
    sentence: z.string().min(1).nullable(),
    answer: z.string().min(1).max(40).nullable(),
    steps: z.array(z.string().min(1).max(80)).min(3).max(5).nullable(),
    explanation: z.string().min(1),
  })
  .superRefine((value, context) => {
    if (value.type === "multiple_choice" && (!value.options || value.correctIndex == null)) {
      context.addIssue({ code: "custom", message: "У вопроса с выбором нужны 4 варианта и верный индекс." });
    }
    if (value.type === "matching_pairs" && !value.pairs) {
      context.addIssue({ code: "custom", message: "Для пар нужны left и right." });
    }
    if (value.type === "fill_blank" && !value.answer) {
      context.addIssue({ code: "custom", message: "Для пропуска нужен короткий ответ." });
    }
    if (value.type === "sequence_order" && !value.steps) {
      context.addIssue({ code: "custom", message: "Для порядка нужен список шагов." });
    }
  });

export const exerciseListSchema = z.object({
  exercises: z.array(exerciseSchema).min(5).max(8),
});

export type Exercise = z.infer<typeof exerciseSchema>;

export type ExerciseAttempt =
  | { type: "multiple_choice"; index: number }
  | { type: "fill_blank"; text: string }
  | { type: "matching_pairs"; pairs: { left: string; right: string }[] }
  | { type: "sequence_order"; steps: string[] };

export function canonicalAnswer(exercise: Exercise) {
  if (exercise.type === "multiple_choice") {
    return exercise.options?.[exercise.correctIndex ?? 0] ?? "";
  }
  if (exercise.type === "fill_blank") {
    return exercise.answer ?? "";
  }
  if (exercise.type === "matching_pairs") {
    return (exercise.pairs ?? []).map((pair) => `${pair.left}=${pair.right}`).join(" | ");
  }
  return (exercise.steps ?? []).join(" → ");
}

export function isExerciseCorrect(exercise: Exercise, attempt: ExerciseAttempt) {
  if (exercise.type === "multiple_choice" && attempt.type === "multiple_choice") {
    return attempt.index === exercise.correctIndex;
  }
  if (exercise.type === "fill_blank" && attempt.type === "fill_blank") {
    return answersMatch(exercise.answer ?? "", attempt.text);
  }
  if (exercise.type === "matching_pairs" && attempt.type === "matching_pairs") {
    const expected = exercise.pairs ?? [];
    if (attempt.pairs.length !== expected.length) {
      return false;
    }
    return expected.every((pair) =>
      attempt.pairs.some((item) => item.left === pair.left && item.right === pair.right),
    );
  }
  if (exercise.type === "sequence_order" && attempt.type === "sequence_order") {
    const expected = exercise.steps ?? [];
    return attempt.steps.length === expected.length && attempt.steps.every((step, index) => step === expected[index]);
  }
  return false;
}

export function parseExercise(value: unknown): Exercise | null {
  const parsed = exerciseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
