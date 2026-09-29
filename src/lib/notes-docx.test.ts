import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  buildNotesDocx,
  definitionTerm,
  notesExportFilename,
  theoryMomentTitle,
} from "./notes-docx";

describe("theoryMomentTitle", () => {
  it("keeps short text", () => {
    expect(theoryMomentTitle("Короткий момент")).toBe("Короткий момент");
  });

  it("truncates long text to ~80 chars", () => {
    const long = "а".repeat(100);
    const title = theoryMomentTitle(long);
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.endsWith("…")).toBe(true);
  });

  it("uses fallback for empty", () => {
    expect(theoryMomentTitle("   ", "Теория")).toBe("Теория");
  });
});

describe("definitionTerm", () => {
  it("trims and clamps to 80", () => {
    expect(definitionTerm("  term  ")).toBe("term");
    expect(definitionTerm("x".repeat(100)).length).toBe(80);
  });
});

describe("notesExportFilename", () => {
  it("defaults to notes.docx", () => {
    expect(notesExportFilename()).toBe("notes.docx");
    expect(notesExportFilename(null)).toBe("notes.docx");
  });

  it("sanitizes book title", () => {
    expect(notesExportFilename("Туккель / путь")).toBe("notes-Туккель-путь.docx");
  });
});

describe("buildNotesDocx", () => {
  it("builds sections for theory and definitions", async () => {
    const bytes = await buildNotesDocx([
      {
        title: "Момент",
        content: "Текст карточки",
        bookTitle: "Книга",
        sourceKind: "theory_moment",
      },
      {
        title: "Термин",
        content: "значение",
        term: "Термин",
        sourceKind: "definition",
      },
    ]);
    expect(bytes.byteLength).toBeGreaterThan(100);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Теоретические моменты");
    expect(xml).toContain("Определения");
    expect(xml).toContain("Термин — значение");
    expect(xml).toContain("Текст карточки");
  });

  it("empty list yields empty docx without throwing (BE-010)", async () => {
    const bytes = await buildNotesDocx([]);
    expect(bytes.byteLength).toBeGreaterThan(50);
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file("word/document.xml")).toBeTruthy();
  });

  it("puts freeform under Заметки when theory/definitions exist", async () => {
    const bytes = await buildNotesDocx([
      {
        title: "Момент",
        content: "карточка",
        sourceKind: "theory_moment",
      },
      {
        title: "Своя",
        content: "freeform body",
        sourceKind: "freeform",
      },
    ]);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Теоретические моменты");
    expect(xml).toContain("Заметки");
    expect(xml).toContain("freeform body");
  });
});

