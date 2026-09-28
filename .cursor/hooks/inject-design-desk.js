const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const designPath = path.join(root, "docs", "design-desk.md");
const backendPath = path.join(root, "docs", "backend-desk.md");

function readCapped(file, limit) {
  try {
    return fs.readFileSync(file, "utf8").slice(0, limit);
  } catch {
    return `(файл не найден: ${path.basename(file)})`;
  }
}

try {
  fs.readFileSync(0, "utf8");
} catch {
  /* hook stdin may be empty */
}

const design = readCapped(designPath, 2200);
const backend = readCapped(backendPath, 900);

const additional_context = [
  "LIVE канал агентов Explorator (подмешивается, пока идёт работа — не игнорировать).",
  "После своего шага обнови docs/backend-desk.md. Не ломай PathNode без записи в desk.",
  "",
  "--- docs/design-desk.md ---",
  design,
  "",
  "--- docs/backend-desk.md ---",
  backend,
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }));
