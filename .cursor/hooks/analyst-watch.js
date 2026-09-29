const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

/** Analyst watch set — not docs/analyst-desk.md (avoid re-fire loops). */
const WATCHED = [
  "docs/developer-desk.md",
  ".cursor/tasks/backlog.md",
  "docs/design-desk.md",
  "docs/backend-desk.md",
  ".cursor/tasks/backend-tasks.md",
  ".cursor/tasks/frontend-tasks.md",
];

function failOpen() {
  process.stdout.write("{}");
  process.exit(0);
}

function normalizeRel(p) {
  if (!p || typeof p !== "string") return null;
  let rel = p;
  if (path.isAbsolute(p)) {
    rel = path.relative(root, p);
  }
  rel = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  return rel || null;
}

function extractPath(payload) {
  const candidates = [
    payload.file_path,
    payload.filePath,
    payload.path,
    payload.tool_input && payload.tool_input.path,
    payload.tool_input && payload.tool_input.file_path,
    payload.tool_input && payload.tool_input.filePath,
    payload.tool_input && payload.tool_input.target_file,
  ];
  for (const c of candidates) {
    const n = normalizeRel(c);
    if (n) return n;
  }
  return null;
}

let raw = "";
try {
  raw = fs.readFileSync(0, "utf8");
} catch {
  failOpen();
}

if (!raw || !raw.trim()) {
  failOpen();
}

let payload = {};
try {
  payload = JSON.parse(raw);
} catch {
  failOpen();
}

const rel = extractPath(payload);
if (!rel || !WATCHED.includes(rel)) {
  failOpen();
}

const abs = path.join(root, ...rel.split("/"));
if (!fs.existsSync(abs)) {
  failOpen();
}

const additional_context = [
  "Analyst live-watch (файл из watch set изменён агентом через инструмент).",
  `Изменился: ${rel}`,
  "Перечитай docs/developer-desk.md — секцию «Задача аналитику» — и .cursor/tasks/backlog.md.",
  "Обновляй docs/analyst-desk.md, .cursor/tasks/backend-tasks.md и .cursor/tasks/frontend-tasks.md только если изменился текст задачи.",
  "Не создавай карточки по черновикам RFC, пока их не скопировали в «Задача аналитику».",
  "Не правь developer-desk, design-desk, backend-desk и код продукта. Не меняй PathNode.",
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }));
