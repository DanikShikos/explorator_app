import fs from "node:fs";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("NO_URL");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });
const script = fs.readFileSync("scripts/align-book-schema.sql", "utf8");

try {
  await sql.unsafe(script);
  const columns = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'books' and column_name = 'format')
        or (table_name = 'book_chapters' and column_name in ('chapter_index', 'read_time_minutes'))
        or (table_name = 'quizzes' and column_name = 'chapter_id')
        or (table_name = 'quiz_questions' and column_name = 'correct_answer_index')
        or (table_name = 'flashcards' and column_name = 'front')
      )
    order by table_name, column_name
  `;
  console.log(JSON.stringify(columns));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
