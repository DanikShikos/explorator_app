import { readTimeMinutes, textFromMarkup, type ParsedBook, type ParsedChapter } from "./types";

function tagInner(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ?? null;
}

function extractTopLevelSections(body: string) {
  const sections: string[] = [];
  const marker = /<section\b[^>]*>|<\/section>/gi;
  let depth = 0;
  let start = -1;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(body))) {
    const closing = match[0].startsWith("</");
    if (closing) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        sections.push(body.slice(start, marker.lastIndex));
        start = -1;
      }
      continue;
    }
    if (depth === 0) {
      start = match.index;
    }
    depth += 1;
  }

  return sections;
}

function chapterFromSection(sectionXml: string, chapterIndex: number): ParsedChapter {
  const titleMarkup = sectionXml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const title = textFromMarkup(titleMarkup) || `Глава ${chapterIndex + 1}`;
  const withoutTitle = sectionXml.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "");
  const content = textFromMarkup(withoutTitle);
  return {
    chapterIndex,
    title,
    content,
    readTimeMinutes: readTimeMinutes(content),
  };
}

function coverDataUrl(xml: string) {
  const href =
    xml.match(/<coverpage\b[\s\S]*?<image\b[^>]*(?:l:href|xlink:href)="#([^"]+)"/i)?.[1] ?? null;
  if (!href) {
    return null;
  }
  const binary = xml.match(
    new RegExp(`<binary\\b[^>]*id="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</binary>`, "i"),
  );
  if (!binary) {
    return null;
  }
  const contentType = binary[0].match(/content-type="([^"]+)"/i)?.[1] ?? "image/jpeg";
  const payload = binary[1].replace(/\s+/g, "");
  return `data:${contentType};base64,${payload}`;
}

export function parseFb2(xml: string): ParsedBook {
  const titleInfo = tagInner(xml, "title-info") ?? "";
  const title = textFromMarkup(tagInner(titleInfo, "book-title") ?? "") || "Без названия";
  const authorBlock = tagInner(titleInfo, "author");
  const author = authorBlock
    ? [tagInner(authorBlock, "first-name"), tagInner(authorBlock, "middle-name"), tagInner(authorBlock, "last-name")]
        .filter(Boolean)
        .map((part) => textFromMarkup(part ?? ""))
        .filter(Boolean)
        .join(" ") || null
    : null;

  const bodies = [...xml.matchAll(/<body\b([^>]*)>([\s\S]*?)<\/body>/gi)];
  const mainBody = bodies.find((body) => !/name\s*=\s*["']notes["']/i.test(body[1]))?.[2] ?? bodies[0]?.[2] ?? "";
  const sections = extractTopLevelSections(mainBody);
  const chapters = (sections.length ? sections : [mainBody])
    .map((section, index) => chapterFromSection(section, index))
    .filter((chapter) => chapter.content.length > 0);

  return {
    title,
    author,
    format: "fb2",
    coverDataUrl: coverDataUrl(xml),
    rawText: chapters.map((chapter) => `${chapter.title}\n${chapter.content}`).join("\n\n"),
    chapters,
  };
}
