import { buildTheoryCards } from "./thin-chapter";
import { removeNullBytes } from "../utils";

/**
 * Pick chapter text used for summary_read.description / practice grounding.
 * Prefer body when it yields a richer extract than a short abstract summary —
 * otherwise `summary || content` permanently blocks long chapter text (BE-006 hole).
 */
export function theorySubstanceSource(title: string, summary: string, content: string): string {
  const cleanTitle = removeNullBytes(title).trim();
  const cleanSummary = removeNullBytes(summary).trim();
  const cleanContent = removeNullBytes(content).trim();

  if (!cleanSummary && !cleanContent) {
    return cleanTitle;
  }
  if (!cleanContent) {
    return cleanSummary || cleanTitle;
  }
  if (!cleanSummary) {
    return cleanContent;
  }

  const fromSummary = buildTheoryCards(cleanSummary).join("\n\n").trim();
  const fromBody = buildTheoryCards(cleanContent).join("\n\n").trim();

  if (fromBody.length >= 120 && fromBody.length >= Math.floor(fromSummary.length * 1.5)) {
    return cleanContent;
  }
  return cleanSummary;
}

/** Build the stored theory description string from the best chapter substance. */
export function theoryDescriptionFromSubstance(title: string, summary: string, content: string) {
  const source = theorySubstanceSource(title, summary, content);
  return buildTheoryCards(source).join("\n\n");
}
