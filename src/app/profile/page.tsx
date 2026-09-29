import { Flame, LockKeyhole, NotebookPen, Sparkles, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut, updatePassword } from "@/app/actions/auth";
import { saveReminder } from "@/app/actions/gamification";
import { AuthForm } from "@/components/auth/auth-form";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayName, getCurrentUser } from "@/lib/current-user";
import { getProfileData, isDatabaseConfigured } from "@/lib/data";

export const dynamic = "force-dynamic";

const iconMap: Record<string, LucideIcon> = { NotebookPen, Trophy, Flame, Sparkles };
const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function progressForLevel(xp: number, level: number) {
  const currentFloor = Math.max(0, 50 * (level - 1) ** 2);
  const nextFloor = 50 * level ** 2;
  return Math.min(100, Math.round(((xp - currentFloor) / (nextFloor - currentFloor)) * 100));
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "E") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function ProfilePage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const user = await getCurrentUser();
  const name = displayName(user);
  const profile = await getProfileData();
  const { stats } = profile;
  const levelProgress = progressForLevel(stats.xp, stats.level);
  const dailyProgress = Math.min(100, Math.round((profile.attempts.todayXp / stats.dailyGoalXp) * 100));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Личный кабинет</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
          <CardDescription>{user.email}. Книги, заметки и очки хранятся только в этом кабинете.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-sm space-y-3">
            <p className="text-sm font-medium">Сменить пароль</p>
            <AuthForm
              action={updatePassword}
              submitLabel="Обновить пароль"
              fields={["password", "confirm"]}
              passwordAutocomplete="new-password"
              stay
            />
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline">Выйти</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {initials(name)}
              </div>
              <div>
                <CardDescription>{user.email}</CardDescription>
                <CardTitle className="mt-1 text-2xl">Уровень {stats.level}</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-semibold text-orange-700">
              <Flame className="size-4" /> {stats.streakCount} дн.
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stats.xp} очков</span>
              <span className="text-muted-foreground">До уровня {stats.level + 1}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-primary/15">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${levelProgress}%` }} />
            </div>
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span>Дневная цель</span>
                <span className="font-medium">{profile.attempts.todayXp} / {stats.dailyGoalXp} очков</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-orange-500 transition-all duration-700" style={{ width: `${dailyProgress}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Учебная активность</CardDescription>
            <CardTitle>Твоя статистика</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/60 p-3"><p className="text-2xl font-semibold">{profile.attempts.count}</p><p className="text-xs text-muted-foreground">тестов пройдено</p></div>
            <div className="rounded-lg bg-muted/60 p-3"><p className="text-2xl font-semibold">{profile.attempts.averageScore}%</p><p className="text-xs text-muted-foreground">средний результат</p></div>
            <div className="rounded-lg bg-muted/60 p-3"><p className="text-2xl font-semibold">{profile.noteCount}</p><p className="text-xs text-muted-foreground">заметок создано</p></div>
            <div className="rounded-lg bg-muted/60 p-3"><p className="text-2xl font-semibold">{profile.attempts.totalXp}</p><p className="text-xs text-muted-foreground">очков за тесты</p></div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Зал славы</h2>
          <p className="text-sm text-muted-foreground">Достижения открываются по мере учебы.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profile.achievements.map((achievement) => {
            const Icon = iconMap[achievement.icon] ?? Trophy;
            const unlocked = Boolean(achievement.unlockedAt);
            return (
              <Card key={achievement.id} className={unlocked ? "border-amber-300" : "opacity-60 grayscale"}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${unlocked ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                    {unlocked ? <Icon className="size-5" /> : <LockKeyhole className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{achievement.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>
                    <p className="mt-2 text-xs font-medium text-primary">+{achievement.xpReward} очков</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Напоминания</CardTitle>
          <CardDescription>Выбери дни и время, когда удобно заниматься.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveReminder} className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium">
              Время
              <input name="reminderTime" type="time" defaultValue={profile.reminder?.reminderTime ?? "20:00"} className="h-9 rounded-md border bg-background px-3" />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Дни недели</legend>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day, index) => (
                  <label key={day} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-2 text-sm transition-colors hover:bg-accent">
                    <input type="checkbox" name="daysOfWeek" value={index + 1} defaultChecked={profile.reminder?.daysOfWeek.includes(index + 1) ?? index < 5} />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Сохранить</button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
