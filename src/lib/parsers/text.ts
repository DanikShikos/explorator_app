import { readTimeMinutes, type ParsedBook, type ParsedChapter } from "./types";

const heading = /^(?:#{1,3}\s+|(?:глава|chapter|часть)\s+[\dIVXLC]+[^\n]*)$/gim;

export function parsePlainText(source: string, format: "txt" | "fb2" = "txt"): ParsedBook {
  const text = source.replace(/^\uFEFF/, "").trim();
  const chapters: ParsedChapter[] = [];
  const parts = text.split(heading);
  const titles = text.match(heading) ?? [];

  if (titles.length === 0) {
    const chunks = text.split(/\n{2,}/).filter((chunk) => chunk.trim().length > 0);
    const size = 6;
    for (let index = 0; index < chunks.length; index += size) {
      const content = chunks.slice(index, index + size).join("\n\n").trim();
      chapters.push({
        chapterIndex: chapters.length,
        title: `Фрагмент ${chapters.length + 1}`,
        content,
        readTimeMinutes: readTimeMinutes(content),
      });
    }
  } else {
    const preface = parts[0]?.trim();
    if (preface) {
      chapters.push({
        chapterIndex: 0,
        title: "Вступление",
        content: preface,
        readTimeMinutes: readTimeMinutes(preface),
      });
    }
    titles.forEach((rawTitle, index) => {
      const content = parts[index + 1]?.trim() ?? "";
      if (!content) return;
      chapters.push({
        chapterIndex: chapters.length,
        title: rawTitle.replace(/^#+\s*/, "").trim(),
        content,
        readTimeMinutes: readTimeMinutes(content),
      });
    });
  }

  const firstLine = text.split("\n").find((line) => line.trim())?.trim() ?? "Текст";

  return {
    title: firstLine.slice(0, 180),
    author: null,
    format,
    coverDataUrl: null,
    rawText: text,
    chapters,
  };
}
