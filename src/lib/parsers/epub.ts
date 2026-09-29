import JSZip from "jszip";
import { readTimeMinutes, textFromMarkup, type ParsedBook, type ParsedChapter } from "./types";

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}="([^"]+)"`, "i"))?.[1] ?? null;
}

function joinPath(base: string, relative: string) {
  const stack = base.split("/").slice(0, -1);
  for (const part of relative.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

export async function parseEpub(data: ArrayBuffer | Uint8Array): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(data);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) {
    throw new Error("EPUB повреждён: нет META-INF/container.xml");
  }

  const rootPath = container.match(/full-path="([^"]+)"/i)?.[1];
  if (!rootPath) {
    throw new Error("EPUB повреждён: не найден корневой OPF");
  }

  const opf = await zip.file(rootPath)?.async("string");
  if (!opf) {
    throw new Error("EPUB повреждён: OPF не прочитан");
  }

  const title = textFromMarkup(opf.match(/<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1] ?? "") || "Без названия";
  const author = textFromMarkup(opf.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1] ?? "") || null;

  const manifest = new Map<string, { href: string; mediaType: string }>();
  for (const item of opf.match(/<item\b[^>]*>/gi) ?? []) {
    const id = attr(item, "id");
    const href = attr(item, "href");
    if (!id || !href) continue;
    manifest.set(id, { href, mediaType: attr(item, "media-type") ?? "" });
  }

  const coverId = opf.match(/<meta\b[^>]*name="cover"[^>]*content="([^"]+)"/i)?.[1] ?? null;
  const coverItem = coverId ? manifest.get(coverId) : [...manifest.values()].find((item) => item.mediaType.startsWith("image/"));
  let coverDataUrl: string | null = null;
  if (coverItem) {
    const file = zip.file(joinPath(rootPath, coverItem.href));
    if (file) {
      const base64 = await file.async("base64");
      coverDataUrl = `data:${coverItem.mediaType || "image/jpeg"};base64,${base64}`;
    }
  }

  const spineIds = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/gi)].map((match) => match[1]);
  const chapters: ParsedChapter[] = [];

  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item || !/html|xml/i.test(item.mediaType)) continue;
    const file = zip.file(joinPath(rootPath, item.href));
    if (!file) continue;
    const html = await file.async("string");
    const heading = textFromMarkup(html.match(/<h[1-2]\b[^>]*>([\s\S]*?)<\/h[1-2]>/i)?.[1] ?? "");
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
    const content = textFromMarkup(body);
    if (content.length < 40) continue;
    chapters.push({
      chapterIndex: chapters.length,
      title: heading || `Глава ${chapters.length + 1}`,
      content,
      readTimeMinutes: readTimeMinutes(content),
    });
  }

  return {
    title,
    author,
    format: "epub",
    coverDataUrl,
    rawText: chapters.map((chapter) => `${chapter.title}\n${chapter.content}`).join("\n\n"),
    chapters,
  };
}
