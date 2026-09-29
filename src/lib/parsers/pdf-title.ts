const PLACEHOLDER = /^PDF(?:,\s*\d+\s*стр\.)?$/i;

export function cleanPdfMeta(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.replace(/\0/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 2 || text.length > 240 || PLACEHOLDER.test(text)) {
    return null;
  }
  return text;
}

export function titleFromPdfText(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  const slash = flat.indexOf(" / ");
  if (slash < 0) {
    return { title: null as string | null, author: null as string | null };
  }

  const before = flat.slice(Math.max(0, slash - 220), slash);
  const title = before.match(/([А-ЯЁ][а-яё]+(?:\s+[а-яёА-ЯЁ-]{1,}){2,24})$/)?.[1]?.trim() ?? null;
  const author = flat
    .slice(slash + 3, slash + 160)
    .match(/^((?:[А-ЯЁ]\.\s*){1,3}[А-ЯЁ][а-яё]+)/)?.[1]
    ?.replace(/\s+/g, " ")
    .trim() ?? null;

  if (!title || title.length < 12) {
    return { title: null, author };
  }
  return { title: title.slice(0, 240), author };
}
