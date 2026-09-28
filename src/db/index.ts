import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;
type SqlClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  __exploratorSql?: SqlClient;
  __exploratorDb?: Database;
};

/**
 * Singleton across Next.js HMR. Without globalThis, each hot reload opens a new
 * postgres.js client and exhausts Supabase session pool (EMAXCONNSESSION / pool_size 15).
 */
export function getDb() {
  if (globalForDb.__exploratorDb) {
    return globalForDb.__exploratorDb;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  const client =
    globalForDb.__exploratorSql ??
    postgres(connectionString, {
      max: 1,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      max_lifetime: 60 * 5,
    });

  globalForDb.__exploratorSql = client;
  globalForDb.__exploratorDb = drizzle(client, { schema });
  return globalForDb.__exploratorDb;
}
