import { PathNotice, PathRetryButton } from "@/components/book/PathNotice";
import { BookCard } from "@/components/books/book-card";
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
              {library.map(({ book, mastery, chapters }) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  format={book.format}
                  mastery={mastery}
                  chapters={chapters}
                  hasSummary={Boolean(book.overallSummary)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
