import { removeNullBytes } from "../utils";

/** Real prompt caps used before generateObject (chars). Oversized chapter text is clipped, not rejected. */
export const AI_PROMPT_CLIP = {
  bookSummaryChapter: 3500,
  pathChapter: 2500,
  maxChaptersInSourceBlock: 12,
} as const;

/** Truncate chapter/theory text for AI prompts — never throws on huge input. */
export function clipAiPromptText(text: string, max: number) {
  const clean = removeNullBytes(text).trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}
