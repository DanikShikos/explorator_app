import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | undefined;

export function getDb() {
  if (cached) {
    return cached;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: "require",
  });

  cached = drizzle(client, { schema });
  return cached;
}
