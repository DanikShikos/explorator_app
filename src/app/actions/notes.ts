"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { bookChapters, books, lessonNodes, notes } from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { recordNoteCreated } from "@/lib/gamification";
import { theoryMomentTitle } from "@/lib/notes-docx";
import { removeNullBytes } from "@/lib/utils";

export async function createNote(formData: FormData) {
  const title = removeNullBytes(String(formData.get("title") ?? "")).trim() || "Без названия";
  const content = removeNullBytes(String(formData.get("content") ?? ""));
  const userId = await getCurrentUserId();

  const [note] = await getDb()
    .insert(notes)
    .values({ userId, title, content, sourceKind: "freeform", term: null })
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
  const markReviewed = String(formData.get("reviewed") ?? "") === "1";
  const userId = await getCurrentUserId();

  await getDb()
    .update(notes)
    .set({
      title,
      content,
      updatedAt: new Date(),
      ...(markReviewed ? { reviewedAt: new Date() } : {}),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));

  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
}

export async function deleteNote(formData: FormData) {
  const id = removeNullBytes(String(formData.get("id") ?? ""));
  const userId = await getCurrentUserId();

  await getDb()
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));

  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath("/review");
  redirect("/notes");
}

export type SaveTheoryMomentInput = {
  bookId: string;
  nodeId: string;
  cardText: string;
  cardIndex?: number;
};

export type SaveDefinitionInput = {
  bookId: string;
  nodeId: string;
  term: string;
  meaning: string;
  cardIndex?: number;
};

type OwnedTheoryNode = {
  id: string;
  title: string;
};

async function requireOwnedTheoryNode(
  userId: string,
  bookId: string,
  nodeId: string,
): Promise<
  | { ok: true; bookTitle: string; node: OwnedTheoryNode }
  | { ok: false; error: string }
> {
  const db = getDb();
  const [ownedBook] = await db
    .select({ id: books.id, title: books.title })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  if (!ownedBook) {
    return { ok: false, error: "Книга не найдена" };
  }

  const [theoryNode] = await db
    .select({
      id: lessonNodes.id,
      title: lessonNodes.title,
      nodeType: lessonNodes.nodeType,
    })
    .from(lessonNodes)
    .innerJoin(bookChapters, eq(bookChapters.id, lessonNodes.chapterId))
    .where(and(eq(lessonNodes.id, nodeId), eq(bookChapters.bookId, bookId)))
    .limit(1);

  if (!theoryNode) {
    return { ok: false, error: "Узел не найден" };
  }
  if (theoryNode.nodeType !== "summary_read") {
    return { ok: false, error: "Сохранять можно только теорию" };
  }

  return {
    ok: true,
    bookTitle: ownedBook.title,
    node: { id: theoryNode.id, title: theoryNode.title },
  };
}

function parseCardIndex(value: number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return undefined;
}

/**
 * BE-010: persist a theory card snippet as a note (not chapter raw / not exercise).
 */
export async function saveTheoryMoment(
  input: SaveTheoryMomentInput,
): Promise<{ ok: true; noteId: string } | { ok: false; error: string }> {
  const bookId = removeNullBytes(input.bookId);
  const nodeId = removeNullBytes(input.nodeId);
  const cardText = removeNullBytes(input.cardText).trim();
  const cardIndex = parseCardIndex(input.cardIndex);

  if (!bookId || !nodeId) {
    return { ok: false, error: "Нужны книга и узел теории" };
  }
  if (!cardText) {
    return { ok: false, error: "Пустая карточка теории" };
  }

  const userId = await getCurrentUserId();
  const owned = await requireOwnedTheoryNode(userId, bookId, nodeId);
  if (!owned.ok) {
    return owned;
  }

  const db = getDb();

  if (cardIndex !== undefined) {
    const [existingByIndex] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.nodeId, nodeId),
          eq(notes.cardIndex, cardIndex),
          eq(notes.sourceKind, "theory_moment"),
        ),
      )
      .limit(1);
    if (existingByIndex) {
      await db
        .update(notes)
        .set({
          content: cardText,
          title: theoryMomentTitle(cardText, owned.node.title),
          bookId,
          term: null,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, existingByIndex.id));
      revalidatePath("/notes");
      revalidatePath(`/books/${bookId}`);
      return { ok: true, noteId: existingByIndex.id };
    }
  } else {
    const [existingByContent] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.nodeId, nodeId),
          eq(notes.content, cardText),
          eq(notes.sourceKind, "theory_moment"),
        ),
      )
      .limit(1);
    if (existingByContent) {
      revalidatePath("/notes");
      return { ok: true, noteId: existingByContent.id };
    }
  }

  const title = theoryMomentTitle(cardText, owned.node.title);
  const [note] = await db
    .insert(notes)
    .values({
      userId,
      title,
      content: cardText,
      bookId,
      nodeId,
      sourceKind: "theory_moment",
      term: null,
      cardIndex: cardIndex ?? null,
    })
    .returning({ id: notes.id });

  await recordNoteCreated(userId);
  revalidatePath("/notes");
  revalidatePath(`/books/${bookId}`);
  return { ok: true, noteId: note.id };
}

/**
 * BE-010: persist a key definition (term + meaning) from a theory card.
 * Backend does not parse chapter text — FE sends already-split term/meaning.
 */
export async function saveDefinition(
  input: SaveDefinitionInput,
): Promise<{ ok: true; noteId: string } | { ok: false; error: string }> {
  const bookId = removeNullBytes(input.bookId);
  const nodeId = removeNullBytes(input.nodeId);
  const term = removeNullBytes(input.term).replace(/\s+/g, " ").trim();
  const meaning = removeNullBytes(input.meaning).trim();
  const cardIndex = parseCardIndex(input.cardIndex);

  if (!bookId || !nodeId) {
    return { ok: false, error: "Нужны книга и узел теории" };
  }
  if (!term || term.length > 80) {
    return { ok: false, error: "Термин обязателен (до 80 символов)" };
  }
  if (!meaning) {
    return { ok: false, error: "Пустое значение определения" };
  }

  const userId = await getCurrentUserId();
  const owned = await requireOwnedTheoryNode(userId, bookId, nodeId);
  if (!owned.ok) {
    return owned;
  }

  const db = getDb();
  const title = term;

  if (cardIndex !== undefined) {
    const [existingByIndex] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.nodeId, nodeId),
          eq(notes.cardIndex, cardIndex),
          eq(notes.sourceKind, "definition"),
          eq(notes.term, term),
        ),
      )
      .limit(1);
    if (existingByIndex) {
      await db
        .update(notes)
        .set({
          content: meaning,
          title,
          bookId,
          term,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, existingByIndex.id));
      revalidatePath("/notes");
      revalidatePath(`/books/${bookId}`);
      return { ok: true, noteId: existingByIndex.id };
    }
  } else {
    const [existing] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.nodeId, nodeId),
          eq(notes.sourceKind, "definition"),
          eq(notes.term, term),
          eq(notes.content, meaning),
        ),
      )
      .limit(1);
    if (existing) {
      revalidatePath("/notes");
      return { ok: true, noteId: existing.id };
    }
  }

  const [note] = await db
    .insert(notes)
    .values({
      userId,
      title,
      content: meaning,
      bookId,
      nodeId,
      sourceKind: "definition",
      term,
      cardIndex: cardIndex ?? null,
    })
    .returning({ id: notes.id });

  await recordNoteCreated(userId);
  revalidatePath("/notes");
  revalidatePath(`/books/${bookId}`);
  return { ok: true, noteId: note.id };
}
