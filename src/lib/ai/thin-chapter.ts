import { removeNullBytes } from "../utils";

/** Exact sentence `buildTheoryCards` returns when the source has no substance. */
export const THIN_THEORY_FALLBACK =
  "Пока нет краткой выжимки — вернись к книге и собери материалы ещё раз.";

function clip(text: string, max: number) {
  const clean = removeNullBytes(text).trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

/** Short friendly theory snippets for summary_read nodes (2–3 cards). */
export function buildTheoryCards(source: string): string[] {
  const clean = removeNullBytes(source).replace(/\s+/g, " ").trim();
  if (!clean) {
    return [THIN_THEORY_FALLBACK];
  }

  const bulletLines = removeNullBytes(source)
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length >= 18);

  if (bulletLines.length >= 2) {
    return bulletLines.slice(0, 3).map((line) => clip(line, 220));
  }

  const sentences = clean.match(/[^.!?…]+[.!?…]?/g)?.map((part) => part.trim()).filter((part) => part.length >= 24) ?? [];
  if (sentences.length >= 2) {
    return sentences.slice(0, 3).map((line) => clip(line, 220));
  }

  const chunk = clip(clean, 420);
  if (chunk.length <= 160) {
    return [chunk];
  }
  const mid = Math.floor(chunk.length / 2);
  const splitAt = chunk.indexOf(" ", mid);
  if (splitAt > 40) {
    return [chunk.slice(0, splitAt).trim(), chunk.slice(splitAt).trim()].filter(Boolean);
  }
  return [chunk];
}

/**
 * BE-004: substance is `contentSummary || content` only — a title alone is not content.
 * Thin when the normalized source is under 80 characters, or theory collapses to the empty fallback.
 */
export function isThinChapter(contentSummary: string, content: string) {
  const source = removeNullBytes(contentSummary || content).replace(/\s+/g, " ").trim();
  if (source.length < 80) {
    return true;
  }
  const cards = buildTheoryCards(source);
  return cards.length === 1 && cards[0] === THIN_THEORY_FALLBACK;
}

export function thinInterestBlurb(title: string, contentSummary: string, content: string) {
  const source = removeNullBytes(contentSummary || content).replace(/\s+/g, " ").trim();
  if (source.length >= 12) {
    return source.slice(0, 220);
  }
  const name = title.trim() || "Эта глава";
  return `${name}: пока мало текста для практики. Одна короткая мысль — и можно идти дальше.`;
}
