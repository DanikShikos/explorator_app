"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { notes } from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { recordNoteCreated } from "@/lib/gamification";
import { removeNullBytes } from "@/lib/utils";

export async function createNote(formData: FormData) {
  const title = removeNullBytes(String(formData.get("title") ?? "")).trim() || "Без названия";
  const content = removeNullBytes(String(formData.get("content") ?? ""));
  const userId = getCurrentUserId();

  const [note] = await getDb()
    .insert(notes)
    .values({ userId, title, content })
    .returning({ id: notes.id });
  await recordNoteCreated(userId);

  revalidatePath("/");
  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export async function updateNote(formData: FormData) {
  const id = removeNullBytes(String(formData.get("id") ?? ""));
  const title = removeNullBytes(String(formData.get("title") ?? "")).trim() || "Без названия";
  const content = removeNullBytes(String(formData.get("content") ?? ""));
  const userId = getCurrentUserId();

  await getDb()
    .update(notes)
    .set({ title, content, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));

  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
}

export async function deleteNote(formData: FormData) {
  const id = removeNullBytes(String(formData.get("id") ?? ""));
  const userId = getCurrentUserId();

  await getDb()
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));

  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath("/review");
  redirect("/notes");
}
