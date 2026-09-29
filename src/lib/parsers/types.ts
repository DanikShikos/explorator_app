export const bookFormats = ["fb2", "epub", "pdf", "txt"] as const;

export type BookFormat = (typeof bookFormats)[number];

export type ParsedChapter = {
  chapterIndex: number;
  title: string;
  content: string;
  readTimeMinutes: number;
};

export type ParsedBook = {
  title: string;
  author: string | null;
  format: BookFormat;
  coverDataUrl: string | null;
  rawText: string;
  chapters: ParsedChapter[];
};

export function readTimeMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export function textFromMarkup(markup: string) {
  return decodeXmlEntities(markup.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
