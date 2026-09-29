import type { Exercise } from "../exercises";
import { filterGroundedExercises, normalizeGrounding } from "./grounding";
import { removeNullBytes } from "../utils";

/** Enough unique tokens in theory to build a few grounded prompts. */
export function theoryCanGroundPractice(theoryText: string) {
  const clean = removeNullBytes(theoryText).replace(/\s+/g, " ").trim();
  if (clean.length < 80) {
    return false;
  }
  const tokens = normalizeGrounding(clean)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
  return new Set(tokens).size >= 10;
}

function sentencesFromTheory(theoryText: string): string[] {
  const clean = removeNullBytes(theoryText).replace(/\s+/g, " ").trim();
  const parts =
    clean.match(/[^.!?…]+[.!?…]?/g)?.map((part) => part.trim()).filter((part) => part.length >= 28) ?? [];
  if (parts.length >= 2) {
    return parts.slice(0, 8);
  }
  if (clean.length < 28) {
    return [];
  }
  const mid = Math.floor(clean.length / 2);
  const splitAt = clean.indexOf(" ", mid);
  if (splitAt > 20) {
    return [clean.slice(0, splitAt).trim(), clean.slice(splitAt).trim()].filter((part) => part.length >= 20);
  }
  return [clean];
}

function contentWords(theoryText: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of removeNullBytes(theoryText).split(/[^\p{L}\p{N}-]+/u)) {
    const word = raw.trim();
    if (word.length < 4) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
    if (words.length >= 24) break;
  }
  return words;
}

function distractors(words: string[], avoid: string, need: number): string[] {
  const avoidKey = avoid.toLocaleLowerCase();
  const pool = words.filter((word) => word.toLocaleLowerCase() !== avoidKey);
  const picks: string[] = [];
  for (const word of pool) {
    if (picks.length >= need) break;
    picks.push(word.slice(0, 80));
  }
  let n = 1;
  while (picks.length < need) {
    picks.push(`вариант ${n}`);
    n += 1;
  }
  return picks.slice(0, need);
}

/**
 * Deterministic practice cards whose answers are substrings of theory (BE-003).
 * Returns [] when theory is too thin — never invents ungrounded facts.
 */
export function buildGroundedExercisesFromTheory(theoryText: string): Exercise[] {
  if (!theoryCanGroundPractice(theoryText)) {
    return [];
  }

  const sentences = sentencesFromTheory(theoryText);
  const words = contentWords(theoryText);
  if (sentences.length === 0 || words.length < 4) {
    return [];
  }

  const drafted: Exercise[] = [];
  const w0 = words[0]!;
  const w1 = words[1] ?? words[0]!;
  const w2 = words[2] ?? words[0]!;
  const w3 = words[3] ?? words[1]!;

  const mcOptions = [w0, ...distractors(words, w0, 3)].slice(0, 4) as [string, string, string, string];
  drafted.push({
    type: "multiple_choice",
    prompt: "Какое слово или понятие встречается в тексте теории?",
    options: mcOptions,
    correctIndex: 0,
    pairs: null,
    sentence: null,
    answer: null,
    steps: null,
    explanation: "Ответ взят из текста теории.",
  });

  const blankWord = words.find((word) => word.length >= 5) ?? w0;
  const host =
    sentences.find((sentence) => sentence.toLocaleLowerCase().includes(blankWord.toLocaleLowerCase())) ??
    sentences[0]!;
  const blanked = host.replace(new RegExp(blankWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "____");
  if (blanked.includes("____")) {
    drafted.push({
      type: "fill_blank",
      prompt: "Вставь пропущенное слово из теории.",
      options: null,
      correctIndex: null,
      pairs: null,
      sentence: blanked.slice(0, 220),
      answer: blankWord.slice(0, 40),
      steps: null,
      explanation: "Слово есть в тексте теории.",
    });
  }

  drafted.push({
    type: "matching_pairs",
    prompt: "Соедини фрагменты, которые есть в теории.",
    options: null,
    correctIndex: null,
    pairs: [
      { left: w0.slice(0, 80), right: w1.slice(0, 80) },
      { left: w1.slice(0, 80), right: w2.slice(0, 80) },
      { left: w2.slice(0, 80), right: w3.slice(0, 80) },
    ],
    sentence: null,
    answer: null,
    steps: null,
    explanation: "Оба конца пары взяты из теории.",
  });

  const stepSource = [...sentences, ...words.map((word) => word.slice(0, 80))];
  const steps = stepSource.slice(0, 3).map((step) => step.slice(0, 80));
  if (steps.length === 3) {
    drafted.push({
      type: "sequence_order",
      prompt: "Расставь фрагменты теории в том же порядке, что в тексте.",
      options: null,
      correctIndex: null,
      pairs: null,
      sentence: null,
      answer: null,
      steps,
      explanation: "Порядок совпадает с порядком в теории.",
    });
  }

  const mc2Options = [w2, ...distractors(words, w2, 3)].slice(0, 4) as [string, string, string, string];
  drafted.push({
    type: "multiple_choice",
    prompt: "Что ещё явно есть в тексте теории?",
    options: mc2Options,
    correctIndex: 0,
    pairs: null,
    sentence: null,
    answer: null,
    steps: null,
    explanation: "Ответ взят из текста теории.",
  });

  const grounded = filterGroundedExercises(drafted, theoryText);
  return grounded.slice(0, 6);
}
