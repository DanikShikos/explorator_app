import type { BookCatMood } from "@/components/mascot/BookCat";

export type PathPersonalStats = {
  streakCount: number;
  todayXp: number;
  dailyGoalXp: number;
};

/** Calm cat line for the personal path card (FE-010). */
export function pathPersonalCatLine(stats: PathPersonalStats): string {
  const goal = Math.max(1, stats.dailyGoalXp);
  if (stats.todayXp >= goal) {
    return "Цель дня закрыта — можно отдыхать.";
  }
  if (stats.streakCount > 0) {
    return "Серия жива — один спокойный шаг.";
  }
  return "Начни сегодня в своём темпе.";
}

/** idle until there is a streak or today’s XP; cheer when either is present. */
export function pathPersonalCatMood(stats: PathPersonalStats): Extract<BookCatMood, "idle" | "cheer"> {
  if (stats.streakCount > 0 || stats.todayXp > 0) {
    return "cheer";
  }
  return "idle";
}

export function pathPersonalDailyProgress(stats: PathPersonalStats): number {
  const goal = Math.max(1, stats.dailyGoalXp);
  return Math.min(100, Math.round((Math.max(0, stats.todayXp) / goal) * 100));
}
