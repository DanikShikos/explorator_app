import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PathNotice, PathRetryButton } from "@/components/book/PathNotice";
import { UploadBookForm } from "@/components/books/upload-book-form";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { isDatabaseConfigured, listBooks } from "@/lib/data";

export default async function BooksPage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  let library: Awaited<ReturnType<typeof listBooks>> = [];
  let libraryError = false;
  try {
    library = await listBooks();
  } catch {
    libraryError = true;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Библиотека</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-path-ink">Книги</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Загрузите книгу — она станет учебной тропой: теория из глав, потом закрепление.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{libraryError ? "—" : `${library.length} в библиотеке`}</p>
      </div>
      {libraryError ? (
        <PathNotice
          mood="wrong"
          tone="alert"
          caption="Полка закрыта"
          title="Не получилось загрузить книги"
          description="Это не пустая библиотека — запрос к полке не прошёл. Обнови страницу; если ошибка повторится, база ещё не отвечает."
        >
          <PathRetryButton>Обновить страницу</PathRetryButton>
        </PathNotice>
      ) : (
        <>
          <UploadBookForm />
          {library.length === 0 ? (
            <PathNotice
              mood="idle"
              caption="Полка пустая"
              title="Пока нет книг"
              description="Перетащи файл выше — книга появится здесь и станет тропой: теория, потом закрепление."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {library.map(({ book, mastery, chapters, minutes }) => (
                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className="group flex gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-path-soft"
                >
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-path-soft text-sm font-semibold uppercase text-path-ink">
                    {book.format}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 font-medium leading-snug text-path-ink">{book.title}</span>
                      <Badge variant={mastery > 0 || book.overallSummary ? "default" : "secondary"}>
                        {mastery > 0 ? "На тропе" : book.overallSummary ? "Разобрана" : "Новая"}
                      </Badge>
                    </span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">
                      {book.author || "Автор не указан"}
                    </span>
                    <span className="mt-3 block text-xs text-muted-foreground">
                      {chapters} глав · {minutes} мин · прогресс {mastery}%
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full bg-path" style={{ width: `${mastery}%` }} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
