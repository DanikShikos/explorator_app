import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { books, notes } from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { isDatabaseConfigured } from "@/lib/data";
import { buildNotesDocx, notesExportFilename } from "@/lib/notes-docx";
import { NOTES_EXPORT_LIMIT, consumeRateLimit } from "@/lib/security/rate-limit";
import { removeNullBytes } from "@/lib/utils";

/**
 * BE-010: export own notes to .docx.
 * ?bookId= → own theory_moment + definition for that book;
 * no bookId → all own notes (theory + definition + freeform).
 * Empty set → empty docx (not 500). Foreign book → empty without foreign rows.
 */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "База не настроена" }, { status: 503 });
  }

  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Нужен вход" }, { status: 401 });
  }

  const limit = await consumeRateLimit(
    "notes-export",
    userId,
    NOTES_EXPORT_LIMIT.limit,
    NOTES_EXPORT_LIMIT.windowSec,
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.error },
      {
        status: limit.status,
        headers: limit.status === 429 ? { "Retry-After": String(NOTES_EXPORT_LIMIT.windowSec) } : undefined,
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawBookId = searchParams.get("bookId");
  const bookId = rawBookId ? removeNullBytes(rawBookId) : undefined;

  const db = getDb();

  if (bookId) {
    const [owned] = await db
      .select({ id: books.id, title: books.title })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);
    if (!owned) {
      const empty = await buildNotesDocx([]);
      return new NextResponse(Buffer.from(empty), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${notesExportFilename()}"`,
        },
      });
    }

    const rows = await db
      .select({
        title: notes.title,
        content: notes.content,
        bookTitle: books.title,
        sourceKind: notes.sourceKind,
        term: notes.term,
      })
      .from(notes)
      .leftJoin(books, eq(books.id, notes.bookId))
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.bookId, bookId),
          inArray(notes.sourceKind, ["theory_moment", "definition"]),
        ),
      )
      .orderBy(desc(notes.updatedAt));

    const bytes = await buildNotesDocx(rows);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${notesExportFilename(owned.title)}"`,
      },
    });
  }

  const rows = await db
    .select({
      title: notes.title,
      content: notes.content,
      bookTitle: books.title,
      sourceKind: notes.sourceKind,
      term: notes.term,
    })
    .from(notes)
    .leftJoin(books, eq(books.id, notes.bookId))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt));

  const bytes = await buildNotesDocx(rows);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${notesExportFilename()}"`,
    },
  });
}
