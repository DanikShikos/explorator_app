import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { countDueCards, isDatabaseConfigured, listNotes } from "@/lib/data";

function formatWhen(date: Date) {
  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Панель</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Почти готово</h1>
        </div>
        <DatabaseSetupBanner />
      </div>
    );
  }

  const [dueToday, recentNotes] = await Promise.all([countDueCards(), listNotes()]);
  const notes = recentNotes.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Панель</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Сегодня</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>К повторению сегодня</CardDescription>
            <CardTitle className="text-4xl">{dueToday}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/review">
                Начать тест
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Заметки</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <NotebookPen className="size-5" />
              {recentNotes.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Записывайте материал, затем создавайте вопросы прямо в заметке.
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Последние заметки</h2>
          <Button variant="ghost" asChild>
            <Link href="/notes">Все заметки</Link>
          </Button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока пусто.{" "}
            <Link href="/notes/new" className="underline">
              Создайте первую заметку
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent"
              >
                <span className="font-medium">{note.title}</span>
                <Badge variant="secondary">{formatWhen(note.updatedAt)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
