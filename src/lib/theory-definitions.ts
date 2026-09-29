/** FE-012 / BE-010: plain theory line → definition when `term — meaning` (em/en dash). */
export const DEFINITION_LINE_RE = /^(.{1,80}?)\s*[—–]\s+(.+)$/;

export type TheoryDefinitionMatch = {
  term: string;
  meaning: string;
  line: string;
};

export type TheoryCardSegment =
  | { kind: "text"; text: string }
  | { kind: "definition"; term: string; meaning: string; line: string };

/** Split a theory card into plain text + definition segments (one rule, no AI). */
export function segmentTheoryCard(cardText: string): TheoryCardSegment[] {
  const lines = cardText.split(/\r?\n/);
  const segments: TheoryCardSegment[] = [];
  let textBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length === 0) return;
    segments.push({ kind: "text", text: textBuf.join("\n") });
    textBuf = [];
  };

  for (const line of lines) {
    const match = line.match(DEFINITION_LINE_RE);
    if (match) {
      flushText();
      segments.push({
        kind: "definition",
        term: match[1].trim(),
        meaning: match[2].trim(),
        line,
      });
    } else {
      textBuf.push(line);
    }
  }
  flushText();
  return segments;
}

export function listDefinitionsInCard(cardText: string): TheoryDefinitionMatch[] {
  return segmentTheoryCard(cardText)
    .filter((s): s is Extract<TheoryCardSegment, { kind: "definition" }> => s.kind === "definition")
    .map((s) => ({ term: s.term, meaning: s.meaning, line: s.line }));
}
