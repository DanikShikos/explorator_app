import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { scopeSqlClient } from "./rls-client";

type Database = ReturnType<typeof drizzle<typeof schema>>;
type SqlClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  __exploratorSql?: SqlClient;
  __exploratorDb?: Database;
  __exploratorScope?: number;
};

const SCOPE_VERSION = 4;

/**
 * Singleton across Next.js HMR. Without globalThis, each hot reload opens a new
 * postgres.js client and exhausts Supabase session pool (EMAXCONNSESSION / pool_size 15).
 * Queries run as `authenticated` for the signed-in user (see rls-client.ts).
 */
export function getDb() {
  if (globalForDb.__exploratorScope !== SCOPE_VERSION) {
    void globalForDb.__exploratorSql?.end({ timeout: 5 });
    globalForDb.__exploratorSql = undefined;
    globalForDb.__exploratorDb = undefined;
    globalForDb.__exploratorScope = SCOPE_VERSION;
  }

  if (globalForDb.__exploratorDb) {
    return globalForDb.__exploratorDb;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  const raw =
    postgres(connectionString, {
      max: 3,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      max_lifetime: 60 * 5,
    });
  const client = scopeSqlClient(raw);

  globalForDb.__exploratorSql = raw;
  globalForDb.__exploratorDb = drizzle(client, { schema });
  return globalForDb.__exploratorDb;
}
