import { parseEpub } from "./epub";
import { parseFb2 } from "./fb2";
import { parsePdf } from "./pdf";
import { parsePlainText } from "./text";
import { bookFormats, type BookFormat, type ParsedBook } from "./types";

export function formatFromFileName(fileName: string): BookFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return bookFormats.find((format) => format === extension) ?? null;
}

export async function parseBookFile(fileName: string, data: ArrayBuffer | Uint8Array): Promise<ParsedBook> {
  const format = formatFromFileName(fileName);
  if (!format) {
    throw new Error("Поддерживаются файлы FB2, EPUB, PDF и TXT");
  }

  if (format === "fb2") {
    const xml = new TextDecoder("utf-8").decode(data);
    return parseFb2(xml);
  }
  if (format === "epub") {
    return parseEpub(data);
  }
  if (format === "pdf") {
    return parsePdf(data);
  }
  return parsePlainText(new TextDecoder("utf-8").decode(data));
}

export type { ParsedBook, ParsedChapter, BookFormat } from "./types";
