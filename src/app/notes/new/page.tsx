import Link from "next/link";
import { NoteEditor } from "@/components/notes/note-editor";

export default function NewNotePage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/notes" className="hover:underline">
          Заметки
        </Link>{" "}
        / новая
      </p>
      <NoteEditor mode="create" />
    </div>
  );
}
