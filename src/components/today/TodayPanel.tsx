import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import { PathNotice } from "@/components/book/PathNotice";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import type { TodayPanel as TodayPanelData } from "@/lib/data";

const nodeTypeLabel: Record<string, string> = {
  summary_read: "Теория",
  quiz_sprint: "Спринт",
  flashcard_review: "Пары",
  boss_challenge: "Босс",
  practice_review: "Практика",
};

export function TodayPanel({ panel }: { panel: TodayPanelData }) {
  if (!panel.book) {
    return (
      <PathNotice
        mood="idle"
        caption="Сегодня"
        title="Пока нет активной книги"
        description="Собери или открой тропу в библиотеке — здесь появится следующий шаг и повторы."
      >
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          asChild
        >
          <Link href="/books" data-testid="continue-button">
            К книгам
            <ArrowRight />
          </Link>
        </Button>
      </PathNotice>
    );
  }

  const typeLabel = panel.nextNode
    ? (nodeTypeLabel[panel.nextNode.nodeType] ?? panel.nextNode.nodeType)
    : null;

  return (
    <section className="rounded-3xl border bg-path-soft p-6 sm:p-8" data-testid="today-panel">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-path-ink/70">Продолжить книгу</p>
          <h2 className="mt-1 text-2xl font-semibold text-path-ink">{panel.book.title}</h2>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {panel.nextNode ? (
              <p>
                Следующий шаг:{" "}
                <span className="font-medium text-path-ink">
                  {panel.nextNode.title}
                  {typeLabel ? ` · ${typeLabel}` : ""}
                </span>
              </p>
            ) : (
              <p>Нет открытого шага тропы — можно закрыть due-повторы.</p>
            )}
            <p>
              К повтору по книге:{" "}
              <span className="font-medium text-path-ink" data-testid="today-due-count">
                {panel.dueCount}
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="h-12 rounded-2xl bg-path px-6 text-path-foreground hover:bg-path/90"
            >
              <Link href="/today/session" data-testid="today-continue-cta">
                Продолжить
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="ghost" asChild className="h-12 rounded-2xl text-path-ink">
              <Link href="/notes">
                <NotebookPen className="size-4" />
                Заметки
              </Link>
            </Button>
          </div>
        </div>

        <BookCat mood="idle" size={112} caption="Готов" className="shrink-0 self-center sm:self-start" />
      </div>
    </section>
  );
}
