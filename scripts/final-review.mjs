import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let event = {};
try {
  event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  // A Stop hook still runs the checks when its payload is unavailable.
}

const checks = [
  { label: "ESLint", command: "npm run lint" },
  { label: "TypeScript", command: "npx tsc --noEmit" },
  { label: "Tests", command: "npm test" },
  { label: "Worktree whitespace", command: "git diff --check" },
  { label: "Index whitespace", command: "git diff --cached --check" },
];

const results = checks.map(({ label, command }) => {
  const result = spawnSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 45000,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const passed = result.status === 0 && !result.error;
  const detail = passed ? "PASS" : output.slice(-1800) || result.error?.message || `exit ${result.status}`;

  return { label, passed, detail };
});

const resultsText = results.map(({ label, detail }) => `${label}: ${detail}`).join("\n");
const manualReview = "Ручная проверка перед ответом: (1) новые серверные функции очищают каждую входную строку от нулевых байтов (\\0) до валидации и сохранения; (2) каждый созданный компонент корректно экспортируется; (3) ESLint и TypeScript не сообщают о неиспользуемых импортах или синтаксических ошибках.";
const stopHookActive = event.stop_hook_active === true || event.stopHookActive === true;
const checksPassed = results.every(({ passed }) => passed);
const sessionId = String(event.session_id ?? event.sessionId ?? "");
const retryPath = sessionId
  ? join(tmpdir(), `copilot-final-review-${createHash("sha256").update(`${process.cwd()}:${sessionId}`).digest("hex")}.json`)
  : null;
let alreadyBlocked = false;

if (retryPath) {
  try {
    await readFile(retryPath, "utf8");
    alreadyBlocked = true;
  } catch {
    alreadyBlocked = false;
  }
}

const shouldBlock = !checksPassed && !stopHookActive && Boolean(retryPath) && !alreadyBlocked;

if (shouldBlock) {
  await writeFile(retryPath, JSON.stringify({ blockedAt: Date.now() }));
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "Stop",
      decision: "block",
      reason: `Автоматические проверки обнаружили ошибки; исправь их и выполни ручной чек-лист.\n${resultsText}\n${manualReview}`,
    },
  })}\n`);
} else {
  process.stdout.write(`${JSON.stringify({
    systemMessage: `${checksPassed ? "Автоматические проверки прошли." : "Финальные проверки завершились с ошибками; hook не блокирует повторно."}\n${resultsText}\n${manualReview}`,
  })}\n`);
}