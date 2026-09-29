import { BookCat } from "@/components/mascot/BookCat";
import {
  pathPersonalCatLine,
  pathPersonalCatMood,
  pathPersonalDailyProgress,
  type PathPersonalStats,
} from "@/lib/path-personal-card";

export function PathPersonalCard({
  streakCount,
  todayXp,
  dailyGoalXp,
}: PathPersonalStats) {
  const stats = { streakCount, todayXp, dailyGoalXp };
  const mood = pathPersonalCatMood(stats);
  const line = pathPersonalCatLine(stats);
  const progress = pathPersonalDailyProgress(stats);
  const goal = Math.max(1, dailyGoalXp);

  return (
    <aside
      data-testid="path-personal-card"
      className="rounded-3xl border border-path/20 bg-path-soft p-4 text-path-ink sm:p-5"
      aria-label="Личный прогресс"
    >
      <p
        data-testid="path-personal-streak"
        className="text-2xl font-semibold tracking-tight"
      >
        {Math.max(0, streakCount)} дн.
      </p>
      <p className="mt-1 text-sm text-path-ink/70">серия</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-path-ink/80">XP сегодня</span>
          <span className="font-medium tabular-nums">
            {Math.max(0, todayXp)} / {goal}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background/70" aria-hidden>
          <div
            className="h-full rounded-full bg-path transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <BookCat mood={mood} size={64} />
        <p className="text-sm leading-snug text-path-ink/85">{line}</p>
      </div>
    </aside>
  );
}
