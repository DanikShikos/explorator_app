import { describe, expect, it } from "vitest";
import { listDefinitionsInCard, segmentTheoryCard } from "./theory-definitions";

describe("FE-012 theory definition line rule", () => {
  it("splits em-dash definition lines from body text", () => {
    const segments = segmentTheoryCard(
      "Введение.\nФокус — внимание к одной цели.\nИ дальше текст.",
    );
    expect(segments).toEqual([
      { kind: "text", text: "Введение." },
      {
        kind: "definition",
        term: "Фокус",
        meaning: "внимание к одной цели.",
        line: "Фокус — внимание к одной цели.",
      },
      { kind: "text", text: "И дальше текст." },
    ]);
  });

  it("accepts en-dash separator", () => {
    const defs = listDefinitionsInCard("Термин – короткое значение");
    expect(defs).toEqual([
      {
        term: "Термин",
        meaning: "короткое значение",
        line: "Термин – короткое значение",
      },
    ]);
  });

  it("ignores lines without dash definition shape", () => {
    expect(listDefinitionsInCard("просто текст без определения")).toEqual([]);
    expect(listDefinitionsInCard("a - b")).toEqual([]); // hyphen, not em/en dash
  });
});
