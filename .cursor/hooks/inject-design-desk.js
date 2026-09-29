const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const designPath = path.join(root, "docs", "design-desk.md");
const backendPath = path.join(root, "docs", "backend-desk.md");
const developerPath = path.join(root, "docs", "developer-desk.md");
const analystPath = path.join(root, "docs", "analyst-desk.md");
const backendTasksPath = path.join(root, ".cursor", "tasks", "backend-tasks.md");
const frontendTasksPath = path.join(root, ".cursor", "tasks", "frontend-tasks.md");

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
const developer = readCapped(developerPath, 1400);
const analyst = readCapped(analystPath, 1400);
const backendTasks = readCapped(backendTasksPath, 900);
const frontendTasks = readCapped(frontendTasksPath, 900);

const additional_context = [
  "LIVE канал агентов Explorator (подмешивается, пока идёт работа — не игнорировать).",
  "Developer ↔ аналитик: docs/developer-desk.md и docs/analyst-desk.md. Пиши только в свой стол.",
  "Задачи: .cursor/tasks/backend-tasks.md и .cursor/tasks/frontend-tasks.md. Карточки пишет аналитик.",
  "После своего шага обнови docs/backend-desk.md, если менял схему, actions, AI или статусы узлов. Не ломай PathNode без записи в desk.",
  "",
  "--- docs/developer-desk.md ---",
  developer,
  "",
  "--- docs/analyst-desk.md ---",
  analyst,
  "",
  "--- .cursor/tasks/backend-tasks.md ---",
  backendTasks,
  "",
  "--- .cursor/tasks/frontend-tasks.md ---",
  frontendTasks,
  "",
  "--- docs/design-desk.md ---",
  design,
  "",
  "--- docs/backend-desk.md ---",
  backend,
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }));
