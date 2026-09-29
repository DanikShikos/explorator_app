import JSZip from "jszip";

export type NoteExportRow = {
  title: string;
  content: string;
  bookTitle?: string | null;
  sourceKind?: "theory_moment" | "definition" | "freeform" | null;
  term?: string | null;
};

/** Short title for a theory card: first ~80 chars, single-line. */
export function theoryMomentTitle(cardText: string, fallback = "Теоретический момент"): string {
  const cleaned = cardText.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fallback;
  }
  if (cleaned.length <= 80) {
    return cleaned;
  }
  return `${cleaned.slice(0, 77).trimEnd()}…`;
}

/** Clamp definition term to ≤80 chars. */
export function definitionTerm(term: string): string {
  return term.replace(/\s+/g, " ").trim().slice(0, 80);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphXml(text: string, bold = false): string {
  const lines = text.length > 0 ? text.split(/\r?\n/) : [""];
  const runs = lines
    .map((line, index) => {
      const content = escapeXml(line);
      const rPr = bold ? "<w:rPr><w:b/></w:rPr>" : "";
      const textRun = `<w:r>${rPr}<w:t xml:space="preserve">${content}</w:t></w:r>`;
      if (index === 0) {
        return textRun;
      }
      return `<w:r><w:br/></w:r>${textRun}`;
    })
    .join("");
  return `<w:p>${runs}</w:p>`;
}

function theoryBody(row: NoteExportRow): string[] {
  const heading = row.bookTitle ? `${row.title} — ${row.bookTitle}` : row.title;
  return [paragraphXml(heading, true), paragraphXml(row.content || ""), paragraphXml("")];
}

function definitionBody(row: NoteExportRow): string[] {
  const term = (row.term ?? row.title).trim();
  const meaning = row.content.trim();
  const line = meaning ? `${term} — ${meaning}` : term;
  const withBook = row.bookTitle ? `${line} (${row.bookTitle})` : line;
  return [paragraphXml(withBook), paragraphXml("")];
}

/**
 * Minimal OOXML .docx. Sections: Теоретические моменты / Определения / Заметки.
 * Empty list → empty document, not an error.
 */
export async function buildNotesDocx(rows: NoteExportRow[]): Promise<Uint8Array> {
  const bodyParts: string[] = [];

  if (rows.length === 0) {
    bodyParts.push(paragraphXml(""));
  } else {
    const theory: NoteExportRow[] = [];
    const definitions: NoteExportRow[] = [];
    const freeform: NoteExportRow[] = [];
    for (const row of rows) {
      if (row.sourceKind === "definition") {
        definitions.push(row);
      } else if (row.sourceKind === "theory_moment") {
        theory.push(row);
      } else {
        freeform.push(row);
      }
    }

    if (theory.length > 0) {
      bodyParts.push(paragraphXml("Теоретические моменты", true));
      for (const row of theory) {
        bodyParts.push(...theoryBody(row));
      }
    }
    if (definitions.length > 0) {
      bodyParts.push(paragraphXml("Определения", true));
      for (const row of definitions) {
        bodyParts.push(...definitionBody(row));
      }
    }
    if (freeform.length > 0) {
      if (theory.length > 0 || definitions.length > 0) {
        bodyParts.push(paragraphXml("Заметки", true));
      }
      for (const row of freeform) {
        bodyParts.push(...theoryBody(row));
      }
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join("\n    ")}
    <w:sectPr/>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", rels);
  zip.folder("word")?.file("document.xml", documentXml);

  return zip.generateAsync({ type: "uint8array" });
}

export function notesExportFilename(bookTitle?: string | null): string {
  if (!bookTitle?.trim()) {
    return "notes.docx";
  }
  const safe = bookTitle
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return safe ? `notes-${safe}.docx` : "notes.docx";
}
