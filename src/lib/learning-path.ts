export type PathStatus = "locked" | "available" | "completed" | "mastered";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPathRecordId(value: string) {
  return UUID.test(value);
}

export function isPathDone(status: PathStatus | string) {
  return status === "completed" || status === "mastered";
}

export function summarizePath(nodes: { status: string; title: string }[]) {
  const done = nodes.filter((node) => isPathDone(node.status)).length;
  const next = nodes.find((node) => node.status === "available");
  return {
    done,
    total: nodes.length,
    percent: nodes.length === 0 ? 0 : Math.round((done / nodes.length) * 100),
    nextTitle: next?.title ?? null,
  };
}

/**
 * BE-003/BE-006 honesty: available practice with zero grounded cards is not a
 * playable «следующий» step — skip to the next available theory (or practice with cards).
 * Does not invent a status enum; callers pass emptyPracticeIds from quiz_cards COUNT.
 */
export function pickNextPlayableNode<
  T extends { id: string; status: string; title: string; nodeType: string },
>(nodes: T[], emptyPracticeIds: ReadonlySet<string>): T | undefined {
  return nodes.find((node) => {
    if (node.status !== "available") {
      return false;
    }
    if (node.nodeType === "summary_read") {
      return true;
    }
    return !emptyPracticeIds.has(node.id);
  });
}
