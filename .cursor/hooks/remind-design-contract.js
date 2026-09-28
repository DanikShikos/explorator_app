const fs = require("fs");

let raw = "";
try {
  raw = fs.readFileSync(0, "utf8");
} catch {
  raw = "";
}

let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  payload = {};
}

const blob = JSON.stringify(payload).toLowerCase();
const watched =
  /learningpath|pathnode|lessonrunner|book-study|book_study|buildlearningpath|getlearningpath|generatebookmaterials|generateLessoncontent/i.test(
    blob,
  ) ||
  /src[\\/]+(components[\\/]+(book|books|lesson)|app[\\/]+(books|actions[\\/]+lessons)|lib[\\/]+(data|ai|hearts))/i.test(
    blob,
  );

if (!watched) {
  process.stdout.write("{}");
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    additional_context:
      "Design live-check: ты трогаешь книгу/тропу/урок. Перечитай docs/design-desk.md. Не меняй PathNode/LessonRunner props без записи в docs/backend-desk.md. На /books/[id] порядок: шапка → LearningPath → BookStudy.",
  }),
);
