"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { bookChapters, books } from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { recordBookUpload } from "@/lib/gamification";
import { parseBookFile } from "@/lib/parsers";
import { BOOK_UPLOAD_LIMIT, consumeRateLimit } from "@/lib/security/rate-limit";

const maxBytes = 30 * 1024 * 1024;

export async function createBookFromUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, error: "Выберите файл книги" };
  }
  if (file.size > maxBytes) {
    return { ok: false as const, error: "Файл больше 30 МБ" };
  }

  const userId = await getCurrentUserId();
  const rate = await consumeRateLimit(
    "book-upload",
    userId,
    BOOK_UPLOAD_LIMIT.limit,
    BOOK_UPLOAD_LIMIT.windowSec,
  );
  if (!rate.ok) {
    return { ok: false as const, error: rate.error, status: rate.status };
  }

  const parsed = await parseBookFile(file.name, await file.arrayBuffer());
  if (parsed.chapters.length === 0) {
    return { ok: false as const, error: "В файле не нашлось текста" };
  }

  const db = getDb();
  const [book] = await db
    .insert(books)
    .values({
      userId,
      title: parsed.title.slice(0, 500),
      author: parsed.author?.slice(0, 300) ?? null,
      format: parsed.format,
      coverUrl: parsed.coverDataUrl,
      rawText: parsed.rawText,
    })
    .returning({ id: books.id });

  await db.insert(bookChapters).values(
    parsed.chapters.map((chapter) => ({
      bookId: book.id,
      chapterIndex: chapter.chapterIndex,
      title: chapter.title,
      content: chapter.content,
      readTimeMinutes: chapter.readTimeMinutes,
    })),
  );

  await recordBookUpload(userId, parsed.format);
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/profile");
  return { ok: true as const, bookId: book.id, title: parsed.title, chapters: parsed.chapters.length };
}
