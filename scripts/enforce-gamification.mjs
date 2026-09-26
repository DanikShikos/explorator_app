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
const isMutation = /apply_patch|create_file|edit_file|write_file|multi_edit/i.test(toolName);
if (!isMutation) process.exit(0);

const targetsGamificationFlow = /src\/app\/actions\/[^"\\\s]*(?:notes?|quiz|auth|login|sign-in|sign-up)[^"\\\s]*\.[jt]sx?/i.test(flattened)
  || /src\/(?:app|components)\/(?:notes|review|auth|login|sign-in|sign-up)\//i.test(flattened)
  || /src\/lib\/(?:gamification|current-user)\.ts/i.test(flattened)
  || /src\/[^"\\\s]*(?:notes?|quiz|auth|login|gamification)[^"\\\s]*\.(?:test|spec)\.[jt]sx?/i.test(flattened);

if (!targetsGamificationFlow) process.exit(0);

process.stdout.write(`${JSON.stringify({
  systemMessage: "Gamification check: при создании или редактировании заметки, завершении теста/квиза и входе или регистрации пользователя подключай подходящую функцию из src/lib/gamification.ts для начисления XP и обновления streak. Сейчас доступны recordNoteCreated и recordQuizAttempt; если редактирование или вход еще не покрыты, добавь отдельную функцию в gamification.ts. Начисляй XP только после успешного действия, исключай повторное начисление и добавляй или обновляй тесты.",
})}\n`);