import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { isDatabaseConfigured, listNotes } from "@/lib/data";

export default async function NotesPage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const notes = await listNotes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Заметки</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ваши материалы</h1>
        </div>
        <Button asChild>
          <Link href="/notes/new">
            <Plus />
            Новая заметка
          </Link>
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Список пуст. Создайте заметку — она сохранится в Supabase.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="block rounded-lg border bg-card px-4 py-3 hover:bg-accent"
            >
              <p className="font-medium">{note.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {note.content || "Пустая заметка"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
