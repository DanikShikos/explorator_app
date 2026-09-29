import Link from "next/link";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/notes/note-editor";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { countCardsForNote, getNote, isDatabaseConfigured } from "@/lib/data";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const { id } = await params;
  const note = await getNote(id);
  if (!note) {
    notFound();
  }
  const cardCount = await countCardsForNote(note.id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/notes" className="hover:underline">
          Заметки
        </Link>{" "}
        / {note.title}
      </p>
      <NoteEditor
        mode="edit"
        note={{
          id: note.id,
          title: note.title,
          content: note.content,
          sourceKind: note.sourceKind,
          reviewedAt: note.reviewedAt,
        }}
        cardCount={cardCount}
      />
    </div>
  );
}
