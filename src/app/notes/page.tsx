import Link from "next/link";
import { FileDown, Plus } from "lucide-react";
import { PathNotice } from "@/components/book/PathNotice";
import { Button } from "@/components/ui/button";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { isDatabaseConfigured, listNotes } from "@/lib/data";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ bookId?: string }>;
}) {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const { bookId: rawBookId } = await searchParams;
  const bookId = rawBookId?.trim() || undefined;
  const notes = await listNotes(bookId ? { bookId } : undefined);
  const exportHref = bookId
    ? `/api/notes/export?bookId=${encodeURIComponent(bookId)}`
    : "/api/notes/export";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Заметки</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Сохранённые моменты</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Теория и определения с карточек урока — прочитай ещё раз или выгрузи в Word.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a href={exportHref} data-testid="notes-export-word">
              <FileDown />
              В Word
            </a>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/notes/new">
              <Plus />
              Новая заметка
            </Link>
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <PathNotice
          mood="idle"
          caption="Заметки"
          title="Пока пусто"
          description="Пока нет сохранённых моментов — сохрани карточку или определение на теории"
        />
      ) : (
        <ul className="space-y-2" data-testid="notes-list">
          {notes.map((note) => {
            const isDefinition = note.sourceKind === "definition";
            const isMoment = note.sourceKind === "theory_moment";
            const term = note.term?.trim() || "";
            const bookLabel =
              note.bookTitle?.trim() ||
              (isMoment || isDefinition ? "Книга" : null);
            return (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}`}
                  className="block rounded-lg border bg-card px-4 py-3 hover:bg-accent"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {bookLabel ? (
                      <p className="text-xs font-medium text-muted-foreground">{bookLabel}</p>
                    ) : null}
                    {isDefinition ? (
                      <span className="rounded-md bg-path-soft px-1.5 py-0.5 text-xs font-medium text-path-ink">
                        Определение
                      </span>
                    ) : isMoment ? (
                      <span className="text-xs font-medium text-muted-foreground">Момент</span>
                    ) : null}
                  </div>
                  {isDefinition ? (
                    <p className="mt-1 font-semibold text-path-ink">
                      {term || note.title}
                    </p>
                  ) : (
                    <p className="mt-0.5 font-medium">{note.title}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {note.content || "Пустая заметка"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-foreground/70">Разобраться →</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
