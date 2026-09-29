import Link from "next/link";
import { redirect } from "next/navigation";
import { PathNotice } from "@/components/book/PathNotice";
import { LessonRunner } from "@/components/lesson/LessonRunner";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { getCurrentUserId } from "@/lib/current-user";
import { checkAndRegenHearts } from "@/lib/hearts-store";
import { getTodayPanel, isDatabaseConfigured, listBookDueCards } from "@/lib/data";

export default async function TodaySessionPage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const panel = await getTodayPanel();
  if (!panel.book) {
    return (
      <PathNotice
        mood="idle"
        caption="Сессия"
        title="Нечего продолжать"
        description="Сначала открой книгу с тропой — короткая сессия соберётся сама."
      >
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          asChild
        >
          <Link href="/books">К книгам</Link>
        </Button>
      </PathNotice>
    );
  }

  const bookId = panel.book.id;
  const dueCards = await listBookDueCards(bookId);

  if (dueCards.length === 0) {
    if (panel.nextNode) {
      redirect(`/books/${bookId}/lesson/${panel.nextNode.id}`);
    }
    return (
      <PathNotice
        mood="cheer"
        caption="Сессия"
        title="Тропа на паузе"
        description="Due-карточек нет, и открытого шага тоже. Загляни на тропу книги — там видно, что уже пройдено."
      >
        <Button
          className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
          asChild
        >
          <Link href={`/books/${bookId}`}>К тропе книги</Link>
        </Button>
      </PathNotice>
    );
  }

  const userId = await getCurrentUserId();
  const hearts = await checkAndRegenHearts(userId);

  // After review cheer, "Дальше" opens the next available node when one exists.
  // LessonRunner builds returnHref as `/books/${bookId}` — encode the lesson path when needed.
  // No nodeId → isDueReview: FSRS via recordLessonAnswer, hearts not spent.
  const runnerBookId = panel.nextNode
    ? `${bookId}/lesson/${panel.nextNode.id}`
    : bookId;

  return (
    <div className="mx-auto max-w-lg space-y-4" data-testid="today-session">
      <div
        className="flex items-center gap-3 rounded-3xl border bg-path-soft px-4 py-3"
        data-testid="today-session-banner"
      >
        <BookCat mood="idle" size={64} />
        <div>
          <p className="text-sm font-medium text-path-ink">Короткий повтор</p>
          <p className="text-sm text-muted-foreground">
            {panel.book.title} · {dueCards.length}{" "}
            {dueCards.length === 1 ? "карточка" : "карточек"}
            {panel.nextNode ? " → затем новый шаг" : ""}
          </p>
        </div>
      </div>

      <LessonRunner
        title="Повтор по книге"
        description="Сначала due этой книги (без сердец), затем следующий открытый шаг тропы."
        cards={dueCards}
        heartStatus={hearts}
        userId={userId}
        mode="lesson"
        bookId={runnerBookId}
      />
    </div>
  );
}
