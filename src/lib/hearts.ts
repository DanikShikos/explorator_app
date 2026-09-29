import { isPathDone } from "./learning-path";

export const HEART_REFILL_MS = 4 * 60 * 60 * 1000;

export type HeartStatus = {
  hearts: number;
  maxHearts: number;
  nextHeartAt: string | null;
};

/**
 * BE-005 / RFC-003: whether a miss spends a heart.
 * No nodeId (due session) or completed/mastered progress → no charge.
 */
export function shouldChargeHeartOnMiss(
  nodeId: string | null | undefined,
  progressStatus: string | undefined,
): boolean {
  if (!nodeId) {
    return false;
  }
  if (progressStatus && isPathDone(progressStatus)) {
    return false;
  }
  return true;
}

export function applyHeartRefill(hearts: number, maxHearts: number, lastRefillAt: Date | null, now: Date) {
  const capped = Math.max(0, Math.min(maxHearts, hearts));
  if (capped >= maxHearts) {
    return { hearts: capped, lastHeartRefillAt: lastRefillAt ?? now, gained: 0 };
  }

  const last = lastRefillAt ?? now;
  const gained = Math.max(0, Math.floor((now.getTime() - last.getTime()) / HEART_REFILL_MS));
  if (gained === 0) {
    return { hearts: capped, lastHeartRefillAt: last, gained: 0 };
  }

  const nextHearts = Math.min(maxHearts, capped + gained);
  return {
    hearts: nextHearts,
    lastHeartRefillAt: nextHearts >= maxHearts ? now : new Date(last.getTime() + gained * HEART_REFILL_MS),
    gained,
  };
}

export function heartStatus(hearts: number, maxHearts: number, lastRefillAt: Date | null): HeartStatus {
  if (hearts >= maxHearts || !lastRefillAt) {
    return { hearts, maxHearts, nextHeartAt: null };
  }
  return {
    hearts,
    maxHearts,
    nextHeartAt: new Date(lastRefillAt.getTime() + HEART_REFILL_MS).toISOString(),
  };
}

export function formatRemaining(target: string | null, now: number) {
  if (!target) {
    return null;
  }
  const total = Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
