const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const designPath = path.join(root, "docs", "design-desk.md");
const backendPath = path.join(root, "docs", "backend-desk.md");
const developerPath = path.join(root, "docs", "developer-desk.md");
const marketerPath = path.join(root, "docs", "marketer-desk.md");
const analystPath = path.join(root, "docs", "analyst-desk.md");
const backendTasksPath = path.join(root, ".cursor", "tasks", "backend-tasks.md");
const frontendTasksPath = path.join(root, ".cursor", "tasks", "frontend-tasks.md");
const aiPromptsPath = path.join(root, ".cursor", "tasks", "ai-prompts.md");
const devopsSecurityPath = path.join(root, ".cursor", "tasks", "devops-security.md");

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
const marketer = readCapped(marketerPath, 1200);
const analyst = readCapped(analystPath, 1400);
const backendTasks = readCapped(backendTasksPath, 900);
const frontendTasks = readCapped(frontendTasksPath, 900);
const aiPrompts = readCapped(aiPromptsPath, 800);
const devopsSecurity = readCapped(devopsSecurityPath, 800);

const additional_context = [
  "LIVE канал агентов Explorator (подмешивается, пока идёт работа — не игнорировать).",
  "Developer ↔ аналитик: docs/developer-desk.md и docs/analyst-desk.md. Пиши только в свой стол.",
  "Маркетинговые задачи читаются из docs/marketer-desk.md; аналитик раскладывает их на BE/FE-карточки.",
  "Задачи: backend-tasks, frontend-tasks, ai-prompts, devops-security. Карточки пишет аналитик.",
  "AI Prompt Engineer → ai-prompts.md; DevOpsSec → devops-security.md; Design/Backend — только свои доски.",
  "После своего шага обнови docs/backend-desk.md, если менял схему, actions, AI или статусы узлов. Не ломай PathNode без записи в desk.",
  "",
  "--- docs/developer-desk.md ---",
  developer,
  "",
  "--- docs/marketer-desk.md ---",
  marketer,
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
  "--- .cursor/tasks/ai-prompts.md ---",
  aiPrompts,
  "",
  "--- .cursor/tasks/devops-security.md ---",
  devopsSecurity,
  "",
  "--- docs/design-desk.md ---",
  design,
  "",
  "--- docs/backend-desk.md ---",
  backend,
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }));
