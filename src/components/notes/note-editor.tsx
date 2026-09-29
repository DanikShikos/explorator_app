"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createNote, deleteNote, updateNote } from "@/app/actions/notes";
import { clearNoteQuiz, generateQuestionsForNote } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NoteEditorProps = {
  mode: "create" | "edit";
  note?: {
    id: string;
    title: string;
    content: string;
    sourceKind?: string | null;
    reviewedAt?: Date | string | null;
  };
  cardCount?: number;
};

export function NoteEditor({ mode, note, cardCount = 0 }: NoteEditorProps) {
  const action = mode === "create" ? createNote : updateNote;
  const isTheoryMoment =
    note?.sourceKind === "theory_moment" || note?.sourceKind === "definition";
  const alreadyReviewed = Boolean(note?.reviewedAt);
  const [generateState, generateAction, generating] = useActionState(
    async (_prev: { message: string } | null, formData: FormData) => {
      const noteId = String(formData.get("noteId") ?? "");
      const result = await generateQuestionsForNote(noteId);
      if (!result.ok) {
        return { message: result.error };
      }
      return { message: `Добавлено вопросов: ${result.count}` };
    },
    null,
  );

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {note ? <input type="hidden" name="id" value={note.id} /> : null}
        <Input
          name="title"
          defaultValue={note?.title}
          placeholder="Заголовок"
          className="h-12 text-xl font-semibold"
          required
        />
        <Textarea
          name="content"
          defaultValue={note?.content}
          placeholder="Запишите материал: списки, заголовки, важные факты…"
          className="min-h-[420px] font-mono"
        />
        {mode === "edit" && isTheoryMoment && !alreadyReviewed ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="reviewed" value="1" className="size-4 rounded border" />
            Отметить: разобрался
          </label>
        ) : null}
        {mode === "edit" && isTheoryMoment && alreadyReviewed ? (
          <p className="text-sm text-muted-foreground">Уже отмечено: разобрался</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">{mode === "create" ? "Создать" : "Сохранить"}</Button>
          <Button variant="outline" asChild>
            <Link href="/notes">К списку</Link>
          </Button>
        </div>
      </form>

      {mode === "edit" && note ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Карточек для повторения по этой заметке: {cardCount}
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={generateAction}>
              <input type="hidden" name="noteId" value={note.id} />
              <Button type="submit" variant="secondary" disabled={generating}>
                {generating ? "Думаю…" : "Сгенерировать вопросы ИИ"}
              </Button>
            </form>
            {cardCount > 0 ? (
              <form action={clearNoteQuiz.bind(null, note.id)}>
                <Button type="submit" variant="outline">
                  Очистить тесты
                </Button>
              </form>
            ) : null}
          </div>
          {generateState?.message ? (
            <p className="text-sm text-muted-foreground">{generateState.message}</p>
          ) : null}
          <form action={deleteNote}>
            <input type="hidden" name="id" value={note.id} />
            <Button type="submit" variant="destructive">
              Удалить заметку
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
