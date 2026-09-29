import { isThinChapter } from "./thin-chapter";
import { removeNullBytes } from "../utils";

/** RFC-004: short chapters stop after sprint; long keep pairs + boss. Thin stays BE-004. */
export type ChapterPathSize = "thin" | "short" | "long";

/**
 * Minutes at or below this (and not thin) → theory + sprint only.
 * Above → full four-node chain. Matches `readTimeMinutes` (≈180 wpm).
 */
export const SHORT_CHAPTER_MAX_MINUTES = 2;

/** When read_time is missing, derive minutes the same way as parsers (~180 wpm). */
export function estimateReadTimeMinutes(contentSummary: string, content: string) {
  const source = removeNullBytes(contentSummary || content).replace(/\s+/g, " ").trim();
  const words = source.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

/**
 * Classify how many lesson nodes a chapter should get on the path.
 * Thin (BE-004) wins over length. Short/long use read_time_minutes when provided.
 */
export function classifyChapterPathSize(
  contentSummary: string,
  content: string,
  readTimeMinutes?: number,
): ChapterPathSize {
  if (isThinChapter(contentSummary, content)) {
    return "thin";
  }
  const minutes =
    typeof readTimeMinutes === "number" && Number.isFinite(readTimeMinutes) && readTimeMinutes > 0
      ? Math.round(readTimeMinutes)
      : estimateReadTimeMinutes(contentSummary, content);
  return minutes <= SHORT_CHAPTER_MAX_MINUTES ? "short" : "long";
}

/** Expected node count for a size (thin = 1 theory). */
export function chapterPathNodeCount(size: ChapterPathSize) {
  if (size === "thin") {
    return 1;
  }
  if (size === "short") {
    return 2;
  }
  return 4;
}

type NodeProgressHint = {
  status: string;
  completedAt?: Date | string | null;
};

/**
 * Rebuild may keep a node if the reader already reached it (available) or finished it.
 * Locked scaffolding / missing rows are not progress — pairs/boss without it may be dropped.
 */
export function nodeHasLearningProgress(progress: NodeProgressHint | undefined | null) {
  if (!progress) {
    return false;
  }
  if (progress.completedAt != null) {
    return true;
  }
  return (
    progress.status === "available" ||
    progress.status === "completed" ||
    progress.status === "mastered"
  );
}

/** Excess nodes (orderIndex ≥ expected) safe to delete on short/thin rebuild. */
export function prunableExcessNodeIds(
  nodes: { id: string; orderIndex: number }[],
  progressByNodeId: ReadonlyMap<string, NodeProgressHint>,
  expectedCount: number,
) {
  return nodes
    .filter((node) => node.orderIndex >= expectedCount)
    .filter((node) => !nodeHasLearningProgress(progressByNodeId.get(node.id)))
    .map((node) => node.id);
}

/** Non-theory nodes safe to delete when chapter becomes thin. */
export function prunablePracticeNodeIds(
  nodes: { id: string; nodeType: string }[],
  progressByNodeId: ReadonlyMap<string, NodeProgressHint>,
) {
  return nodes
    .filter((node) => node.nodeType !== "summary_read")
    .filter((node) => !nodeHasLearningProgress(progressByNodeId.get(node.id)))
    .map((node) => node.id);
}
