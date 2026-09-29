import { filterGroundedExercises } from "./ai/grounding";
import type { Exercise } from "./exercises";

export type BookPathStatus = "pending" | "approved" | "rejected";

/**
 * BE-009 read policy (pure): empty playable only when rejected or no stored nodes.
 * Pending + stored nodes → effective approved so library and book page agree.
 * Does not mutate DB path_status.
 */
export function effectivePathAvailability<T>(
  dbStatus: BookPathStatus,
  nodes: T[],
): { status: BookPathStatus; nodes: T[] } {
  if (dbStatus === "rejected") {
    return { status: "rejected", nodes: [] };
  }
  if (nodes.length > 0) {
    return { status: "approved", nodes };
  }
  return { status: dbStatus, nodes: [] };
}

export type GateNodeInput = {
  id: string;
  nodeType: string;
  orderIndex: number;
  description: string;
};

export type GateChapterInput = {
  thin: boolean;
  nodes: GateNodeInput[];
  /** Parsed exercises keyed by practice node id (empty array allowed). */
  exercisesByNodeId: Record<string, Exercise[]>;
};

/** Substantive theory must be at least this long (matches path AI quality floor). */
export const MIN_ESSENCE_CHARS = 40;

const PRACTICE_TYPES = new Set([
  "quiz_sprint",
  "flashcard_review",
  "boss_challenge",
  "practice_review",
]);

function isTheory(nodeType: string) {
  return nodeType === "summary_read";
}

/**
 * Pure BE-007 control gate over already-stored path payloads.
 * Hearts are intentionally out of scope (generation/gate content only).
 */
export function evaluateLearningPathGate(
  chapters: GateChapterInput[],
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];

  if (chapters.length === 0) {
    return { ok: false, reasons: ["Нет глав для контроля тропы"] };
  }

  for (const [index, chapter] of chapters.entries()) {
    const label = `глава ${index + 1}`;
    const ordered = [...chapter.nodes].sort((a, b) => a.orderIndex - b.orderIndex);

    if (ordered.length === 0) {
      reasons.push(`${label}: нет узлов`);
      continue;
    }

    if (chapter.thin) {
      if (ordered.length !== 1 || !isTheory(ordered[0].nodeType)) {
        reasons.push(`${label}: тонкая глава должна иметь только theory-узел`);
      } else if (!ordered[0].description.trim()) {
        reasons.push(`${label}: пустая theory у тонкой главы`);
      }
      continue;
    }

    // Theory before practice: first node theory; no practice before any theory.
    const firstTheoryIdx = ordered.findIndex((node) => isTheory(node.nodeType));
    if (firstTheoryIdx < 0) {
      reasons.push(`${label}: нет theory-узла`);
      continue;
    }
    if (firstTheoryIdx !== 0) {
      reasons.push(`${label}: практика раньше теории`);
    }

    const theory = ordered[firstTheoryIdx];
    const essence = theory.description.trim();
    if (essence.length < MIN_ESSENCE_CHARS) {
      reasons.push(`${label}: theory слишком короткая для сути книги`);
    }

    const practiceNodes = ordered.filter((node) => PRACTICE_TYPES.has(node.nodeType));
    for (const node of practiceNodes) {
      const exercises = chapter.exercisesByNodeId[node.id] ?? [];
      if (exercises.length === 0) {
        continue;
      }
      const grounded = filterGroundedExercises(exercises, essence);
      if (grounded.length !== exercises.length) {
        reasons.push(`${label}: упражнения не заземлены в сохранённой теории`);
      }
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons: [...new Set(reasons)] };
  }
  return { ok: true };
}
