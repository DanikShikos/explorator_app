import { extractText, getDocumentProxy } from "unpdf";
import { cleanPdfMeta, titleFromPdfText } from "./pdf-title";
import { readTimeMinutes, type ParsedBook, type ParsedChapter } from "./types";

function chaptersFromPages(pages: string[]): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  let buffer: string[] = [];
  let title = "Начало";

  const flush = () => {
    const content = buffer.join("\n").replace(/\s+\n/g, "\n").trim();
    buffer = [];
    if (content.length < 80) return;
    chapters.push({
      chapterIndex: chapters.length,
      title,
      content,
      readTimeMinutes: readTimeMinutes(content),
    });
  };

  for (const page of pages) {
    const text = page.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const heading = text.match(/^(глава\s+\d+[^\n.]{0,80}|chapter\s+\d+[^\n.]{0,80})/i)?.[1];
    if (heading && buffer.length > 0) {
      flush();
      title = heading.trim();
    }
    buffer.push(text);
    if (!heading && buffer.length >= 8) {
      flush();
      title = `Часть ${chapters.length + 2}`;
    }
  }
  flush();

  if (chapters.length === 0 && pages.some((page) => page.trim())) {
    const content = pages.join("\n").trim();
    chapters.push({
      chapterIndex: 0,
      title: "Текст книги",
      content,
      readTimeMinutes: readTimeMinutes(content),
    });
  }

  return chapters;
}

export async function parsePdf(data: ArrayBuffer | Uint8Array): Promise<ParsedBook> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(extracted.text) ? extracted.text : [extracted.text]).map((page) => page ?? "");
  const chapters = chaptersFromPages(pages);
  const meta = await pdf.getMetadata().catch(() => null);
  const info = (meta?.info ?? {}) as { Title?: string; Author?: string };
  const fromText = titleFromPdfText(pages.slice(0, 4).join("\n"));
  const title =
    cleanPdfMeta(info.Title) ??
    fromText.title ??
    (extracted.totalPages ? `PDF, ${extracted.totalPages} стр.` : "PDF");
  const author = cleanPdfMeta(info.Author) ?? fromText.author;

  return {
    title,
    author,
    format: "pdf",
    coverDataUrl: null,
    rawText: chapters.map((chapter) => chapter.content).join("\n\n"),
    chapters,
  };
}
