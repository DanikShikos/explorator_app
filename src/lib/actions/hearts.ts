"use server";

import {
  checkAndRegenHearts as checkAndRegen,
  decrementHeart as decrement,
  decrementHeartForMiss as decrementForMiss,
  earnHeartFromPractice as earn,
} from "@/lib/hearts-store";

export async function checkAndRegenHearts(userId: string) {
  return checkAndRegen(userId);
}

/** Unconditional −1. Prefer decrementHeartForMiss / applyLessonMiss for lesson misses. */
export async function decrementHeart(userId: string) {
  return decrement(userId);
}

/**
 * BE-005: miss→heart gate by card's node progress.
 * Returns HeartStatus fields + charged (true = heart spent).
 */
export async function decrementHeartForMiss(cardId: string) {
  return decrementForMiss(cardId);
}

/** Alias of decrementHeartForMiss (LessonRunner / FE-005). */
export async function decrementHeartOnLessonMiss(cardId: string) {
  return decrementForMiss(cardId);
}

export async function earnHeartFromPractice(userId: string) {
  return earn(userId);
}
