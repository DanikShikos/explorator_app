import { describe, expect, it } from "vitest";
import { parseFb2 } from "./fb2";

const sample = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <book-title>Как учиться</book-title>
      <author><first-name>Анна</first-name><last-name>Иванова</last-name></author>
      <coverpage><image l:href="#cover.jpg"/></coverpage>
    </title-info>
  </description>
  <body>
    <section>
      <title><p>Глава 1</p></title>
      <p>Повторяйте идеи своими словами, а не заучивайте формулировки.</p>
    </section>
  </body>
  <binary id="cover.jpg" content-type="image/jpeg">aGVsbG8=</binary>
</FictionBook>`;

describe("parseFb2", () => {
  it("достаёт название, автора, главу и обложку", () => {
    const book = parseFb2(sample);
    expect(book.title).toBe("Как учиться");
    expect(book.author).toBe("Анна Иванова");
    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0]?.title).toBe("Глава 1");
    expect(book.chapters[0]?.content).toContain("своими словами");
    expect(book.coverDataUrl).toBe("data:image/jpeg;base64,aGVsbG8=");
  });
});
