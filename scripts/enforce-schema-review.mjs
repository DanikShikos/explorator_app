import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFile, stat, writeFile } from "node:fs/promises";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let event;
try {
  event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.exit(0);
}

const toolName = String(event.toolName ?? event.tool_name ?? "").toLowerCase();
const toolInput = event.toolInput ?? event.tool_input ?? event.input ?? {};
const flattened = JSON.stringify(toolInput).replaceAll("\\\\", "/");
const root = process.cwd();
const schemaPath = resolve(root, "src/db/schema.ts");
const statePath = join(tmpdir(), `copilot-schema-review-${createHash("sha256").update(root).digest("hex")}.json`);

function respond(output, exitCode = 0) {
  process.stdout.write(`${JSON.stringify(output)}\n`);
  process.exit(exitCode);
}

const readingSchema = /read_file|readfile|read_file|cat|open/i.test(toolName)
  && /src\/db\/schema\.ts/i.test(flattened);

if (readingSchema) {
  const schema = await stat(schemaPath).catch(() => null);
  if (schema) {
    await writeFile(statePath, JSON.stringify({ mtimeMs: schema.mtimeMs, reviewedAt: Date.now() }));
  }
  respond({ systemMessage: "Схема src/db/schema.ts проверена. Перед изменением структуры БД обязательно сгенерируй миграцию командой npx drizzle-kit generate." });
}

const isMutation = /apply_patch|create_file|edit_file|write_file|multi_edit/i.test(toolName);
if (!isMutation) process.exit(0);

const touchesSchema = /src\/db\/schema\.ts/i.test(flattened);
if (touchesSchema) {
  respond({ systemMessage: "После изменения src/db/schema.ts сгенерируй миграцию: npx drizzle-kit generate." });
}

const targetsUIComponent = /src\/(?:components|app)\/[^"\\\s]+\.(?:tsx|jsx)/i.test(flattened);
let uiGuidance = "";
if (targetsUIComponent) {
  const filePath = flattened.match(/(src\/(?:components|app)\/[^"\\\s]+\.(?:tsx|jsx))/i)?.[1];
  const patchInput = typeof toolInput.input === "string" ? toolInput.input : "";
  let content = typeof toolInput.content === "string"
    ? toolInput.content
    : typeof toolInput.newContent === "string"
      ? toolInput.newContent
      : "";
  if (!content && filePath) {
    content = await readFile(resolve(root, filePath), "utf8").catch(() => "");
  }
  if (!content && patchInput) {
    const addedFile = patchInput.match(/\*\*\* Add File: [^\r\n]*\r?\n((?:\+.*(?:\r?\n|$))*)/i);
    if (addedFile) content = addedFile[1].split(/\r?\n/).map((line) => line.startsWith("+") ? line.slice(1) : "").join("\n");
  }
  const clientBehavior = /\buseState\b|\buseEffect\b|framer-motion|\bonClick\s*=|\bonDoubleClick\s*=/i;
  const needsClient = clientBehavior.test(content) || clientBehavior.test(patchInput);
  const startsWithClientDirective = /^\uFEFF?["']use client["'];?(?:\r?\n|$)/.test(content)
    || /(?:^|\r?\n)\+\s*["']use client["'];?(?:\r?\n|$)/.test(patchInput);

  if (needsClient && !startsWithClientDirective) {
    respond({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "UI-компонент использует React-хуки, framer-motion или обработчик клика. Добавь директиву 'use client' первой строкой файла.",
      },
    });
  }

  uiGuidance = "Для иконок UI используй lucide-react, для разметки — Tailwind CSS. Если компонент использует useState, useEffect, framer-motion или обработчики кликов, директива 'use client' должна быть первой строкой файла.";
}

const targetsServerAction = /src\/app\/actions\/[^"\\\s]+\.(?:ts|tsx)/i.test(flattened);
const targetsComponentWithDbQuery = /src\/components\/[^"\\\s]+\.(?:ts|tsx)/i.test(flattened)
  && /getDb\s*\(|drizzle-orm|@\/db(?:\/|["'])|@\/app\/actions\/|from\s+["'][^"']*db\/schema|DATABASE_URL|fetch\s*\(/i.test(flattened);

if (!targetsServerAction && !targetsComponentWithDbQuery) {
  if (uiGuidance) respond({ systemMessage: uiGuidance });
  process.exit(0);
}

const schema = await stat(schemaPath).catch(() => null);
let review;
try {
  review = JSON.parse(await readFile(statePath, "utf8"));
} catch {
  review = null;
}

const recentlyReviewed = schema
  && review
  && review.mtimeMs === schema.mtimeMs
  && Date.now() - review.reviewedAt < 30 * 60 * 1000;

if (!recentlyReviewed) {
  respond({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Сначала прочитай src/db/schema.ts и проверь существующую структуру БД. Если меняешь схему, редактируй schema.ts и сгенерируй миграцию через npx drizzle-kit generate.${uiGuidance ? ` ${uiGuidance}` : ""}`,
    },
  });
}

respond({ systemMessage: `Проверка src/db/schema.ts выполнена перед изменением DB-кода.${uiGuidance ? ` ${uiGuidance}` : ""}` });
