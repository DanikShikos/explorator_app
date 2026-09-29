import { readFile } from "node:fs/promises";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL ?? "";
if (!url || url.includes("YOUR_PROJECT") || url.includes("YOUR_PASSWORD")) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const DEMO_UUID = "00000000-0000-4000-8000-000000000001";

const raw = await readFile(new URL("./rls-owner-policies.sql", import.meta.url), "utf8");
if (raw.includes(DEMO_UUID)) {
  console.error("rls-owner-policies.sql still contains the demo UUID; aborting.");
  process.exit(1);
}

const statements = raw
  .split(/^-- statement\s*$/m)
  .map((part) => part.trim())
  .filter(
    (part) =>
      part &&
      !part.startsWith("-- Owner") &&
      !part.startsWith("-- Applied") &&
      !part.startsWith("-- No DROP") &&
      !part.startsWith("-- Statements"),
  );

/** Drop named policies so a prior demo-UUID OR cannot survive a re-apply. */
const policyDrops = [
  ["achievements", "achievements_read"],
  ["achievements", "achievements_seed_insert"],
  ["books", "books_owner"],
  ["book_chapters", "book_chapters_owner"],
  ["flashcards", "flashcards_owner"],
  ["lesson_nodes", "lesson_nodes_owner"],
  ["notes", "notes_owner"],
  ["quiz_attempts", "quiz_attempts_owner"],
  ["quiz_cards", "quiz_cards_owner"],
  ["quiz_questions", "quiz_questions_owner"],
  ["quizzes", "quizzes_owner"],
  ["reminders", "reminders_owner"],
  ["review_logs", "review_logs_owner"],
  ["user_achievements", "user_achievements_owner"],
  ["user_node_progress", "user_node_progress_owner"],
  ["users_stats", "users_stats_owner"],
];

const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

try {
  const counts = await sql.begin(async (tx) => {
    for (const [table, policy] of policyDrops) {
      await tx.unsafe(`drop policy if exists "${policy}" on "${table}"`);
    }
    for (const statement of statements) {
      await tx.unsafe(statement);
    }

    // Owner lookup stays inside the txn; never log the id.
    const [ownerRow] = await tx`select user_id from books limit 1`;
    if (!ownerRow?.user_id) {
      throw new Error("ROLLBACK: no book owner for probe");
    }
    await tx`select set_config('request.jwt.claim.sub', ${ownerRow.user_id}, true)`;
    await tx`set local role authenticated`;

    const [books] = await tx`select count(*)::int as n from books`;
    const [nodes] = await tx`
      select count(*)::int as n
      from lesson_nodes n
      join book_chapters c on c.id = n.chapter_id
      join books b on b.id = c.book_id
    `;

    const booksCount = books?.n ?? 0;
    const nodesCount = nodes?.n ?? 0;
    if (booksCount === 0 || nodesCount === 0) {
      throw new Error(
        `ROLLBACK: authenticated owner probe books=${booksCount} lesson_nodes=${nodesCount}`,
      );
    }
    return { books: booksCount, lesson_nodes: nodesCount };
  });

  console.log(JSON.stringify({ committed: true, ...counts }));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({ committed: false, reason: message }));
  process.exit(1);
} finally {
  await sql.end();
}
