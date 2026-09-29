import { describe, expect, it } from "vitest";
import {
  pathPersonalCatLine,
  pathPersonalCatMood,
  pathPersonalDailyProgress,
} from "./path-personal-card";

describe("path-personal-card (FE-010)", () => {
  it("idle mood and start line when no streak and no XP", () => {
    const stats = { streakCount: 0, todayXp: 0, dailyGoalXp: 50 };
    expect(pathPersonalCatMood(stats)).toBe("idle");
    expect(pathPersonalCatLine(stats)).toBe("Начни сегодня в своём темпе.");
    expect(pathPersonalDailyProgress(stats)).toBe(0);
  });

  it("cheer + streak line when series is alive", () => {
    const stats = { streakCount: 3, todayXp: 10, dailyGoalXp: 50 };
    expect(pathPersonalCatMood(stats)).toBe("cheer");
    expect(pathPersonalCatLine(stats)).toBe("Серия жива — один спокойный шаг.");
    expect(pathPersonalDailyProgress(stats)).toBe(20);
  });

  it("cheer + goal-done line when daily XP met", () => {
    const stats = { streakCount: 1, todayXp: 50, dailyGoalXp: 50 };
    expect(pathPersonalCatMood(stats)).toBe("cheer");
    expect(pathPersonalCatLine(stats)).toBe("Цель дня закрыта — можно отдыхать.");
    expect(pathPersonalDailyProgress(stats)).toBe(100);
  });

  it("caps daily progress at 100", () => {
    expect(
      pathPersonalDailyProgress({ streakCount: 0, todayXp: 120, dailyGoalXp: 50 }),
    ).toBe(100);
  });
});
