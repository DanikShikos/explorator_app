import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL ?? "";
if (!url || url.includes("YOUR_PROJECT") || url.includes("YOUR_PASSWORD")) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const BOOK = "7a317ea5-fdce-4073-bdf3-7879af08a604";
const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

function planText(rows) {
  return rows.map((row) => row["QUERY PLAN"]).join("\n");
}

try {
  const [owner] = await sql`select user_id from books where id = ${BOOK}`;
  if (!owner?.user_id) {
    throw new Error("book not found");
  }
  const userId = owner.user_id;
  await sql`select set_config('request.jwt.claim.sub', ${userId}, false)`;
  await sql`set role authenticated`;

  const indexes = await sql`
    select tablename, indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
      and tablename in ('lesson_nodes','user_node_progress','book_chapters','quiz_cards','books')
    order by tablename, indexname
  `;
  console.log("=== INDEXES ===");
  for (const row of indexes) {
    console.log(`${row.tablename} | ${row.indexname}`);
  }

  console.log("\n=== EXPLAIN getLearningPath nodes ===");
  console.log(
    planText(
      await sql.unsafe(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT n.*
        FROM lesson_nodes n
        WHERE n.chapter_id IN (
          SELECT id FROM book_chapters WHERE book_id = '${BOOK}'
        )
        ORDER BY n.order_index
      `),
    ),
  );

  console.log("\n=== EXPLAIN progress by user ===");
  console.log(
    planText(
      await sql.unsafe(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT * FROM user_node_progress WHERE user_id = '${userId}'
      `),
    ),
  );

  console.log("\n=== EXPLAIN advancePastEmptyAvailablePractice ===");
  console.log(
    planText(
      await sql.unsafe(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT n.id, n.chapter_id, n.order_index
        FROM lesson_nodes n
        INNER JOIN book_chapters c ON c.id = n.chapter_id
        INNER JOIN user_node_progress p
          ON p.node_id = n.id AND p.user_id = '${userId}' AND p.status = 'available'
        LEFT JOIN quiz_cards q
          ON q.node_id = n.id AND q.user_id = '${userId}'
        WHERE c.book_id = '${BOOK}'
          AND n.node_type <> 'summary_read'
          AND q.id IS NULL
        ORDER BY c.chapter_index, n.order_index
        LIMIT 1
      `),
    ),
  );

  console.log("\n=== EXPLAIN progress scoped to book ===");
  console.log(
    planText(
      await sql.unsafe(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT p.*
        FROM user_node_progress p
        INNER JOIN lesson_nodes n ON n.id = p.node_id
        INNER JOIN book_chapters c ON c.id = n.chapter_id
        WHERE p.user_id = '${userId}' AND c.book_id = '${BOOK}'
      `),
    ),
  );

  const [counts] = await sql.unsafe(`
    select
      (select count(*)::int from book_chapters where book_id = '${BOOK}') as chapters,
      (select count(*)::int
         from lesson_nodes n
         join book_chapters c on c.id = n.chapter_id
         where c.book_id = '${BOOK}') as nodes,
      (select count(*)::int from user_node_progress where user_id = '${userId}') as all_progress,
      (select count(*)::int
         from user_node_progress p
         join lesson_nodes n on n.id = p.node_id
         join book_chapters c on c.id = n.chapter_id
         where p.user_id = '${userId}' and c.book_id = '${BOOK}') as book_progress
  `);
  console.log("\n=== COUNTS ===");
  console.log(JSON.stringify(counts));
} finally {
  try {
    await sql`reset role`;
  } catch {
    // ignore
  }
  await sql.end();
}
