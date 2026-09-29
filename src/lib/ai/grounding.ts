import { removeNullBytes } from "../utils";
import type { Exercise } from "../exercises";

/** Normalize theory / answer text the same way BE-003 grounding does. */
export function normalizeGrounding(value: string) {
  return removeNullBytes(value)
    .trim()
    .replace(/[«»"'„“”‘’.,!?;:()[\]{}…—–-]/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function phraseInTheory(theoryNorm: string, phrase: string) {
  const needle = normalizeGrounding(phrase);
  if (needle.length < 2) {
    return false;
  }
  return theoryNorm.includes(needle);
}

export function exerciseAnswerPhrases(exercise: Exercise): string[] {
  if (exercise.type === "multiple_choice") {
    return [exercise.options?.[exercise.correctIndex ?? 0] ?? ""];
  }
  if (exercise.type === "fill_blank") {
    return [exercise.answer ?? ""];
  }
  if (exercise.type === "matching_pairs") {
    return (exercise.pairs ?? []).flatMap((pair) => [pair.left, pair.right]);
  }
  return [...(exercise.steps ?? [])];
}

/**
 * Drop items whose correct answer / key phrases are absent from theory-text.
 * Spec/export of BE-003 filter (book-processor keeps a private twin; keep in sync).
 */
export function filterGroundedExercises(exercises: Exercise[], theoryText: string): Exercise[] {
  const theoryNorm = normalizeGrounding(theoryText);
  if (!theoryNorm) {
    return [];
  }
  return exercises.filter((exercise) => {
    const phrases = exerciseAnswerPhrases(exercise).map((part) => part.trim()).filter(Boolean);
    if (phrases.length === 0) {
      return false;
    }
    return phrases.every((phrase) => phraseInTheory(theoryNorm, phrase));
  });
}
