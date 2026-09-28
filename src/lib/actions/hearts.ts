"use server";

import {
  checkAndRegenHearts as checkAndRegen,
  decrementHeart as decrement,
  earnHeartFromPractice as earn,
} from "@/lib/hearts-store";

export async function checkAndRegenHearts(userId: string) {
  return checkAndRegen(userId);
}

export async function decrementHeart(userId: string) {
  return decrement(userId);
}

export async function earnHeartFromPractice(userId: string) {
  return earn(userId);
}
