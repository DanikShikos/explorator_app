import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
if (!url || url.includes("YOUR_PROJECT")) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

async function counts(tx) {
  const [books] = await tx`select count(*)::int as n from books`;
  const [stats] = await tx`select count(*)::int as n from users_stats`;
  const [progress] = await tx`select count(*)::int as n from user_node_progress`;
  const [notes] = await tx`select count(*)::int as n from notes`;
  return { books: books.n, stats: stats.n, progress: progress.n, notes: notes.n };
}

try {
  const roleProbe = await sql.begin(async (tx) => {
    await tx`set local role anon`;
    const anon = await counts(tx);
    return { anon };
  });

  const stranger = await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000099', true)`;
    await tx`set local role authenticated`;
    return counts(tx);
  });

  const owner = await sql.begin(async (tx) => {
    const [row] = await tx`select user_id from books limit 1`;
    if (!row) return null;
    await tx`select set_config('request.jwt.claim.sub', ${row.user_id}, true)`;
    await tx`set local role authenticated`;
    return counts(tx);
  });

  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let dataApi = { status: 0, rows: null };
  if (apiUrl && anonKey && !apiUrl.includes("YOUR_PROJECT")) {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/rest/v1/books?select=id`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    const body = await response.json();
    dataApi = { status: response.status, rows: Array.isArray(body) ? body.length : null };
  }

  const anonClosed = Object.values(roleProbe.anon).every((n) => n === 0);
  const strangerClosed = Object.values(stranger).every((n) => n === 0);
  const ownerSeesBooks = owner === null || owner.books > 0;
  const apiClosed = dataApi.rows === 0 || dataApi.status === 401;

  console.log(JSON.stringify({
    anon: roleProbe.anon,
    stranger,
    ownerSeesOwnBooks: ownerSeesBooks,
    dataApi,
    pass: anonClosed && strangerClosed && ownerSeesBooks && apiClosed,
  }));
  if (!(anonClosed && strangerClosed && ownerSeesBooks && apiClosed)) {
    process.exit(1);
  }
} finally {
  await sql.end();
}
